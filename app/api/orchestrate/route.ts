// app/api/orchestrate/route.ts
// F32 — Intelligence Orchestration Layer (Sprint 7)
// INTERNAL ONLY — never called from or exposed to Client Interface (/portal/*).
//
// POST /api/orchestrate
// Input-triggered prompt chain. Fires when data changes, not on a schedule.
// Runs downstream intelligence components in sequence, passing each step's
// output as context into the next Claude call.
//
// Trigger types:
//   SIGNAL_ENTERED    → MDH(0) → Signal 1-3(1) → Consumer State(2) → BMS(3) → Risk(4) → Activation(5)
//   BRIEF_SUBMITTED   → IQ Evaluate(1) → Media Mix(2) → BIP Enrichment(3, if ICS < 70)
//   MARKET_UPDATED    → Signal context re-evaluation → BMS update → Risk re-check
//   ATTRIBUTION_ENTERED → Attribution chain → BMS update
//
// MDH guard: if MDH = RED at Step 0, chain halts. Run logged as MDH_QUARANTINE.
// Partial failure: logs failed step, continues where possible.
//
// Auth: service role only.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai-model";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// ─── Types ───────────────────────────────────────────────────────────────────

type TriggerType =
  | "BRIEF_SUBMITTED"
  | "SIGNAL_ENTERED"
  | "MARKET_UPDATED"
  | "ATTRIBUTION_ENTERED";

type OrchestratorStatus = "RUNNING" | "COMPLETE" | "FAILED" | "MDH_QUARANTINE";

interface OrchestrateRequest {
  campaign_id: string;
  trigger_type: TriggerType;
  trigger_data: Record<string, unknown>;
}

interface ChainContext {
  campaign_id: string;
  trigger_type: TriggerType;
  trigger_data: Record<string, unknown>;
  run_id: string;
  // Accumulated step outputs — each step adds to this
  step_outputs: Record<string, unknown>;
}

interface StepResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  skip?: boolean;
  skip_reason?: string;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function createRun(
  supabase: ReturnType<typeof getSupabase>,
  campaign_id: string,
  trigger_type: TriggerType,
  trigger_data: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase
    .from("orchestration_runs")
    .insert({ campaign_id, trigger_type, trigger_data, status: "RUNNING" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create orchestration run: ${error.message}`);
  return data.id;
}

async function updateRun(
  supabase: ReturnType<typeof getSupabase>,
  run_id: string,
  updates: {
    status?: OrchestratorStatus;
    steps_completed?: string[];
    steps_failed?: string[];
    error_log?: Record<string, string>;
    chain_summary?: string;
    completed_at?: string;
  }
) {
  await supabase.from("orchestration_runs").update(updates).eq("id", run_id);
}

// ─── Chain helpers ────────────────────────────────────────────────────────────

async function callInternalApi(
  endpoint: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-chain": process.env.INTERNAL_CHAIN_SECRET ?? "",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${endpoint} returned ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Step 0: MDH Guard ────────────────────────────────────────────────────────
// Checks reach / impressions / frequency against minimum delivery health thresholds.
// RED = quarantine; chain halts. GREEN / AMBER = proceed.

async function stepMDH(ctx: ChainContext, supabase: ReturnType<typeof getSupabase>): Promise<StepResult> {
  const { campaign_id, trigger_data } = ctx;
  const week_number = trigger_data.week_number as number | undefined;

  if (!week_number) {
    return { success: true, output: { mdh_status: "GREEN", mdh_note: "No week number — MDH skipped" } };
  }

  // Pull the latest signal weekly report for this week to check MDH inputs
  const { data: report } = await supabase
    .from("signal_weekly_reports")
    .select("signal_1_actual_pct, signal_2_actual_pct, signal_3_actual_count, demand_health, nurture_health, conversion_health")
    .eq("campaign_id", campaign_id)
    .eq("week_number", week_number)
    .single();

  if (!report) {
    return { success: true, output: { mdh_status: "GREEN", mdh_note: "No signal report found — MDH skipped" } };
  }

  // MDH: RED if all three signals are null or all three healths are Red
  const allNull = report.signal_1_actual_pct === null &&
                  report.signal_2_actual_pct === null &&
                  report.signal_3_actual_count === null;

  const allRed = report.demand_health === "Red" &&
                 report.nurture_health === "Red" &&
                 report.conversion_health === "Red";

  const mdh_status = (allNull || allRed) ? "RED" : "GREEN";

  return {
    success: true,
    output: {
      mdh_status,
      mdh_note: allRed
        ? "All three delivery signals are Red — intelligence chain quarantined."
        : allNull
        ? "No signal data entered — chain proceeds without delivery context."
        : "Delivery health within acceptable range.",
    },
  };
}

// ─── Step 1 (SIGNAL chain): Signal Intelligence ───────────────────────────────

async function stepSignalIntelligence(ctx: ChainContext): Promise<StepResult> {
  const { campaign_id, trigger_data } = ctx;
  const week_number = trigger_data.week_number as number | undefined;
  if (!week_number) return { success: true, skip: true, skip_reason: "No week_number in trigger" };

  try {
    const result = await callInternalApi("/api/signal-report", { campaign_id, week_number });
    return { success: true, output: { signal_report: result } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Step 2 (SIGNAL chain): Consumer Behaviour State ─────────────────────────

async function stepConsumerState(ctx: ChainContext): Promise<StepResult> {
  const { campaign_id, trigger_data } = ctx;
  const week_number = trigger_data.week_number as number | undefined;
  if (!week_number) return { success: true, skip: true, skip_reason: "No week_number in trigger" };

  try {
    const result = await callInternalApi("/api/behaviour-state", {
      campaign_id,
      week_number,
      // Pass signal intelligence output as context
      signal_context: ctx.step_outputs["signal_intelligence"],
    });
    return { success: true, output: { consumer_state: result } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Step 3 (SIGNAL chain): Brand Momentum Score ─────────────────────────────

async function stepBrandMomentum(ctx: ChainContext): Promise<StepResult> {
  const { campaign_id, trigger_data } = ctx;
  const week_number = trigger_data.week_number as number | undefined;

  try {
    const result = await callInternalApi("/api/brand-momentum", {
      campaign_id,
      week_number,
      signal_context: ctx.step_outputs["signal_intelligence"],
      consumer_state_context: ctx.step_outputs["consumer_state"],
    });
    return { success: true, output: { brand_momentum: result } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Step 4 (SIGNAL chain): Risk Posture ──────────────────────────────────────

async function stepRiskPosture(ctx: ChainContext): Promise<StepResult> {
  const { campaign_id } = ctx;

  try {
    const result = await callInternalApi("/api/brand-momentum", {
      campaign_id,
      mode: "risk",
      brand_momentum_context: ctx.step_outputs["brand_momentum"],
      consumer_state_context: ctx.step_outputs["consumer_state"],
      signal_context: ctx.step_outputs["signal_intelligence"],
    });
    return { success: true, output: { risk_posture: result } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Step 5 (SIGNAL chain): Activation Playbook ──────────────────────────────

async function stepActivationPlaybook(ctx: ChainContext): Promise<StepResult> {
  const { campaign_id, trigger_data } = ctx;
  const week_number = trigger_data.week_number as number | undefined;

  try {
    const result = await callInternalApi("/api/behaviour-state", {
      campaign_id,
      week_number,
      mode: "activation",
      risk_context: ctx.step_outputs["risk_posture"],
      consumer_state_context: ctx.step_outputs["consumer_state"],
      brand_momentum_context: ctx.step_outputs["brand_momentum"],
    });
    return { success: true, output: { activation_playbook: result } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Step 1 (BRIEF chain): IQ Evaluate ────────────────────────────────────────

async function stepIqEvaluate(ctx: ChainContext): Promise<StepResult> {
  const { campaign_id } = ctx;

  try {
    const result = await callInternalApi("/api/iq-evaluate", { campaign_id });
    return { success: true, output: { iq_evaluate: result } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Step 2 (BRIEF chain): Media Mix ──────────────────────────────────────────

async function stepMediaMix(ctx: ChainContext): Promise<StepResult> {
  const { campaign_id } = ctx;

  try {
    const result = await callInternalApi("/api/media-mix", {
      campaign_id,
      iq_context: ctx.step_outputs["iq_evaluate"],
    });
    return { success: true, output: { media_mix: result } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Step 3 (BRIEF chain): BIP Enrichment (ICS < 70 only) ───────────────────

async function stepBipEnrichment(ctx: ChainContext): Promise<StepResult> {
  const iq = ctx.step_outputs["iq_evaluate"] as { ics_weighted_total?: number } | undefined;
  const ics = iq?.ics_weighted_total ?? 100;

  if (ics >= 70) {
    return { success: true, skip: true, skip_reason: `ICS ${ics} >= 70 — BIP enrichment not required` };
  }

  const { campaign_id } = ctx;
  try {
    const result = await callInternalApi("/api/bip-enrich", {
      campaign_id,
      iq_context: ctx.step_outputs["iq_evaluate"],
      media_mix_context: ctx.step_outputs["media_mix"],
    });
    return { success: true, output: { bip_enrichment: result } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Chain summary generation ─────────────────────────────────────────────────

async function generateChainSummary(
  ctx: ChainContext,
  steps_completed: string[],
  steps_failed: string[],
  anthropic: Anthropic
): Promise<string> {
  if (steps_completed.length === 0) {
    return "Intelligence chain did not complete — no steps ran successfully.";
  }

  const prompt = `You are writing a single internal status sentence for a campaign intelligence chain run.
Chain trigger: ${ctx.trigger_type}
Steps completed: ${steps_completed.join(", ")}
${steps_failed.length > 0 ? `Steps failed: ${steps_failed.join(", ")}` : "All steps completed."}

Write ONE sentence (under 25 words) that summarises what ran and the outcome.
Client-safe language only. No internal step names. No state codes. No metric numbers.
Examples:
- "Signal intelligence, consumer state, and activation playbook updated successfully for this week."
- "Brand intelligence refreshed — risk posture and activation playbook updated."
- "Brief intelligence evaluated and media mix updated."`;

  const orchModel = await getModel("model_orchestration", "claude-haiku-4-5-20251001");
  const msg = await anthropic.messages.create({
    model: orchModel,
    max_tokens: 80,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return text || "Intelligence chain completed.";
}

// ─── Chain runners ────────────────────────────────────────────────────────────

async function runSignalChain(
  ctx: ChainContext,
  supabase: ReturnType<typeof getSupabase>
): Promise<{ steps_completed: string[]; steps_failed: string[]; error_log: Record<string, string>; quarantine: boolean }> {
  const steps_completed: string[] = [];
  const steps_failed: string[] = [];
  const error_log: Record<string, string> = {};

  // Step 0: MDH Guard
  const mdhResult = await stepMDH(ctx, supabase);
  if (!mdhResult.success) {
    steps_failed.push("mdh_layer_0");
    error_log["mdh_layer_0"] = mdhResult.error ?? "MDH check failed";
    return { steps_completed, steps_failed, error_log, quarantine: false };
  }

  const mdhStatus = (mdhResult.output?.mdh_status as string) ?? "GREEN";
  if (mdhStatus === "RED") {
    return { steps_completed, steps_failed, error_log, quarantine: true };
  }

  steps_completed.push("mdh_layer_0");
  ctx.step_outputs["mdh"] = mdhResult.output ?? {};

  // Step 1: Signal Intelligence
  const sigResult = await stepSignalIntelligence(ctx);
  if (sigResult.skip) {
    // Not a failure — just no data
  } else if (!sigResult.success) {
    steps_failed.push("signal_intelligence");
    error_log["signal_intelligence"] = sigResult.error ?? "Signal intelligence failed";
  } else {
    steps_completed.push("signal_intelligence");
    ctx.step_outputs["signal_intelligence"] = sigResult.output ?? {};
  }

  // Step 2: Consumer State (depends on signal intelligence but can run without it)
  const csResult = await stepConsumerState(ctx);
  if (csResult.skip) {
    // skip
  } else if (!csResult.success) {
    steps_failed.push("consumer_state");
    error_log["consumer_state"] = csResult.error ?? "Consumer state failed";
  } else {
    steps_completed.push("consumer_state");
    ctx.step_outputs["consumer_state"] = csResult.output ?? {};
  }

  // Step 3: Brand Momentum Score
  const bmsResult = await stepBrandMomentum(ctx);
  if (!bmsResult.success) {
    steps_failed.push("brand_momentum");
    error_log["brand_momentum"] = bmsResult.error ?? "Brand momentum failed";
  } else {
    steps_completed.push("brand_momentum");
    ctx.step_outputs["brand_momentum"] = bmsResult.output ?? {};
  }

  // Step 4: Risk Posture (depends on BMS — skip if BMS failed)
  if (steps_completed.includes("brand_momentum")) {
    const riskResult = await stepRiskPosture(ctx);
    if (!riskResult.success) {
      steps_failed.push("risk_posture");
      error_log["risk_posture"] = riskResult.error ?? "Risk posture failed";
    } else {
      steps_completed.push("risk_posture");
      ctx.step_outputs["risk_posture"] = riskResult.output ?? {};
    }
  } else {
    steps_failed.push("risk_posture");
    error_log["risk_posture"] = "Skipped — brand_momentum step failed";
  }

  // Step 5: Activation Playbook
  const actResult = await stepActivationPlaybook(ctx);
  if (!actResult.success) {
    steps_failed.push("activation_playbook");
    error_log["activation_playbook"] = actResult.error ?? "Activation playbook failed";
  } else {
    steps_completed.push("activation_playbook");
    ctx.step_outputs["activation_playbook"] = actResult.output ?? {};
  }

  return { steps_completed, steps_failed, error_log, quarantine: false };
}

async function runBriefChain(
  ctx: ChainContext
): Promise<{ steps_completed: string[]; steps_failed: string[]; error_log: Record<string, string> }> {
  const steps_completed: string[] = [];
  const steps_failed: string[] = [];
  const error_log: Record<string, string> = {};

  // Step 1: IQ Evaluate
  const iqResult = await stepIqEvaluate(ctx);
  if (!iqResult.success) {
    steps_failed.push("iq_evaluate");
    error_log["iq_evaluate"] = iqResult.error ?? "IQ Evaluate failed";
  } else {
    steps_completed.push("iq_evaluate");
    ctx.step_outputs["iq_evaluate"] = iqResult.output ?? {};
  }

  // Step 2: Media Mix (runs even if IQ failed — uses what's available)
  const mmResult = await stepMediaMix(ctx);
  if (!mmResult.success) {
    steps_failed.push("media_mix");
    error_log["media_mix"] = mmResult.error ?? "Media Mix failed";
  } else {
    steps_completed.push("media_mix");
    ctx.step_outputs["media_mix"] = mmResult.output ?? {};
  }

  // Step 3: BIP Enrichment (conditional — only if ICS < 70)
  if (steps_completed.includes("iq_evaluate")) {
    const bipResult = await stepBipEnrichment(ctx);
    if (bipResult.skip) {
      // Not counted as completed or failed — conditional skip is expected
    } else if (!bipResult.success) {
      steps_failed.push("bip_enrichment");
      error_log["bip_enrichment"] = bipResult.error ?? "BIP Enrichment failed";
    } else {
      steps_completed.push("bip_enrichment");
      ctx.step_outputs["bip_enrichment"] = bipResult.output ?? {};
    }
  }

  return { steps_completed, steps_failed, error_log };
}

async function runMarketUpdateChain(
  ctx: ChainContext,
  supabase: ReturnType<typeof getSupabase>
): Promise<{ steps_completed: string[]; steps_failed: string[]; error_log: Record<string, string> }> {
  // Market update: re-evaluate signal context, BMS, risk
  // Re-uses signal + BMS + risk steps from signal chain
  const partial: ChainContext = { ...ctx, step_outputs: { ...ctx.step_outputs } };

  const steps_completed: string[] = [];
  const steps_failed: string[] = [];
  const error_log: Record<string, string> = {};

  const bmsResult = await stepBrandMomentum(partial);
  if (!bmsResult.success) {
    steps_failed.push("brand_momentum");
    error_log["brand_momentum"] = bmsResult.error ?? "";
  } else {
    steps_completed.push("brand_momentum");
    partial.step_outputs["brand_momentum"] = bmsResult.output ?? {};
  }

  if (steps_completed.includes("brand_momentum")) {
    const riskResult = await stepRiskPosture(partial);
    if (!riskResult.success) {
      steps_failed.push("risk_posture");
      error_log["risk_posture"] = riskResult.error ?? "";
    } else {
      steps_completed.push("risk_posture");
    }
  }

  return { steps_completed, steps_failed, error_log };
}

async function runAttributionChain(
  ctx: ChainContext
): Promise<{ steps_completed: string[]; steps_failed: string[]; error_log: Record<string, string> }> {
  const steps_completed: string[] = [];
  const steps_failed: string[] = [];
  const error_log: Record<string, string> = {};

  // Attribution: BMS update (attribution dimension)
  const bmsResult = await stepBrandMomentum(ctx);
  if (!bmsResult.success) {
    steps_failed.push("brand_momentum");
    error_log["brand_momentum"] = bmsResult.error ?? "";
  } else {
    steps_completed.push("brand_momentum");
    ctx.step_outputs["brand_momentum"] = bmsResult.output ?? {};
  }

  return { steps_completed, steps_failed, error_log };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const anthropic = getAnthropic();

  let body: OrchestrateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { campaign_id, trigger_type, trigger_data } = body;
  if (!campaign_id || !trigger_type) {
    return NextResponse.json({ error: "campaign_id and trigger_type are required" }, { status: 400 });
  }

  // Create the run record
  let run_id: string;
  try {
    run_id = await createRun(supabase, campaign_id, trigger_type, trigger_data ?? {});
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  const ctx: ChainContext = {
    campaign_id,
    trigger_type,
    trigger_data: trigger_data ?? {},
    run_id,
    step_outputs: {},
  };

  let steps_completed: string[] = [];
  let steps_failed: string[] = [];
  let error_log: Record<string, string> = {};
  let quarantine = false;

  try {
    if (trigger_type === "SIGNAL_ENTERED") {
      ({ steps_completed, steps_failed, error_log, quarantine } =
        await runSignalChain(ctx, supabase));
    } else if (trigger_type === "BRIEF_SUBMITTED") {
      ({ steps_completed, steps_failed, error_log } =
        await runBriefChain(ctx));
    } else if (trigger_type === "MARKET_UPDATED") {
      ({ steps_completed, steps_failed, error_log } =
        await runMarketUpdateChain(ctx, supabase));
    } else if (trigger_type === "ATTRIBUTION_ENTERED") {
      ({ steps_completed, steps_failed, error_log } =
        await runAttributionChain(ctx));
    }
  } catch (e) {
    // Unexpected top-level failure — mark whole run as FAILED
    await updateRun(supabase, run_id, {
      status: "FAILED",
      steps_completed,
      steps_failed: [...steps_failed, "chain_runner"],
      error_log: { ...error_log, chain_runner: String(e) },
      completed_at: new Date().toISOString(),
    });
    return NextResponse.json({
      run_id,
      status: "FAILED",
      steps_completed,
      steps_failed,
      chain_summary: "Intelligence chain encountered an unexpected error.",
    });
  }

  if (quarantine) {
    await updateRun(supabase, run_id, {
      status: "MDH_QUARANTINE",
      steps_completed: [],
      steps_failed: [],
      error_log: {},
      chain_summary: "Delivery health is below minimum threshold — intelligence chain paused.",
      completed_at: new Date().toISOString(),
    });
    return NextResponse.json({
      run_id,
      status: "MDH_QUARANTINE",
      steps_completed: [],
      steps_failed: [],
      chain_summary: "Delivery health is below minimum threshold — intelligence chain paused.",
    });
  }

  const status: OrchestratorStatus =
    steps_failed.length === 0 ? "COMPLETE" : steps_completed.length > 0 ? "COMPLETE" : "FAILED";

  const chain_summary = await generateChainSummary(
    ctx,
    steps_completed,
    steps_failed,
    anthropic
  ).catch(() => "Intelligence chain completed.");

  await updateRun(supabase, run_id, {
    status,
    steps_completed,
    steps_failed,
    error_log,
    chain_summary,
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    run_id,
    status,
    steps_completed,
    steps_failed,
    chain_summary,
  });
}
