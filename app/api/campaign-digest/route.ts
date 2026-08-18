// app/api/campaign-digest/route.ts
// Campaign OS Digest — Cross-Signal Intelligence Engine (Sprint 7)
// INTERNAL ONLY — Janine-operated. Never exposed to clients.
//
// POST /api/campaign-digest
// Body: { campaign_id: string }
//
// Reads all active signal layers for a campaign simultaneously:
//   S0  — Media Delivery Health (MDH) + AQS
//   S1  — Signal Intelligence (weekly reports, demand/nurture/conversion health)
//   S2  — Kill Switch status (breached / at-risk)
//   S3  — Stage Briefs (what messages are live at each funnel stage)
//   S4  — Market Context (external events in flight)
//   S5  — Audience Replenishment (pipeline horizon)
//   S6  — Campaign Learning Record (what worked before)
//   S7  — FRAME Brief (strategic anchor + kill switch thresholds)
//   S8  — Creative Fatigue analysis (computed from MDH)
//   S9  — Brand Momentum Score
//
// Generates:
//   overall_health      — Green / Amber / Red
//   narrative           — 3–4 paragraph cross-signal story
//   top_action          — single most important next step (≤25 words)
//   contradictions      — detected conflicts between signals
//   blindspots          — gaps in data or strategy
//   recommendations     — ranked actions with confidence + rationale
//
// Saves to campaign_os_digests. Returns the full digest.

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

// ─── Static system prompt (cached — never changes between calls) ──────────────

const DIGEST_SYSTEM_PROMPT = `You are the ShiftImpact OS Campaign Intelligence Engine. Your job is to synthesise all signal data for this campaign into a strategic narrative that tells the strategy lead what is actually happening, where signals conflict, what is being missed, and what to do next.

STRICT OUTPUT RULES:
- No dashes or hyphens in copy
- No "CMO" anywhere
- Traffic light colours only: Green, Amber, Red (no "sky-blue")
- Write as a sharp analyst, not a consultant — no padding
- Be specific: name which signals, which weeks, which numbers
- Surface contradictions explicitly — do not smooth them over
- If data is missing, name it as a blindspot
- If PREDICTION TRACK RECORD is provided, reference it when assessing your own confidence calibration

Respond with valid JSON matching exactly this structure:
{
  "overall_health": "Green" | "Amber" | "Red",
  "narrative": "3-4 paragraph synthesis. Para 1: media delivery and reach efficiency. Para 2: consumer signal performance vs targets. Para 3: strategic risks and contradictions. Para 4: what this means for the next 2 weeks.",
  "top_action": "Single highest-priority action in 25 words or fewer. Imperative. Specific.",
  "contradictions": [
    {
      "signal_a": "name of first signal",
      "signal_b": "name of second signal",
      "description": "what the contradiction is and why it matters",
      "severity": "High" | "Medium" | "Low"
    }
  ],
  "blindspots": [
    {
      "area": "name of gap area",
      "description": "what is not being tracked and why it matters",
      "recommended_fix": "what to do to close this gap"
    }
  ],
  "recommendations": [
    {
      "action": "specific action to take",
      "rationale": "why, grounded in the signal data",
      "confidence": "High" | "Medium" | "Low" | "Speculative",
      "urgency": "Immediate" | "This week" | "Next sprint",
      "signal_source": "which signal layer drives this recommendation"
    }
  ]
}

Return ONLY the JSON. No preamble or explanation.`;

// ─── Signal context assembly ───────────────────────────────────────────────────

async function assembleSignalContext(campaign_id: string) {
  const supabase = getSupabase();
  const ctx: Record<string, unknown> = {};
  let signalCount = 0;
  let maxWeeks = 0;

  // Campaign + FRAME brief basics
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("name, current_phase, gate_signal_status, industry_profile, client_id, clients(name, industry_profile)")
    .eq("id", campaign_id)
    .single();

  ctx.campaign = campaign;

  const { data: frame } = await supabase
    .from("frame_briefs")
    .select("anchor, mood, clarity_statement, lock_status, demand_investment_pct, active_channels, industry_category")
    .eq("campaign_id", campaign_id)
    .maybeSingle();

  ctx.frame = frame;

  // S0 — MDH (last 4 weeks)
  const { data: mdhRows } = await supabase
    .from("signal_media_delivery")
    .select("week_number, mdh_status, avg_frequency, quarantine_active, aqs_score, aqs_band, attention_gap_flag, completion_rate_pct")
    .eq("campaign_id", campaign_id)
    .not("mdh_status", "is", null)
    .order("week_number", { ascending: false })
    .limit(4);

  if (mdhRows?.length) {
    ctx.mdh = mdhRows;
    signalCount++;
    maxWeeks = Math.max(maxWeeks, mdhRows.length);
  }

  // S1 — Signal weekly reports (last 4 weeks)
  const { data: signalReports } = await supabase
    .from("signal_weekly_reports")
    .select("week_number, demand_health, nurture_health, conversion_health, gate_status, signal_1_actual_pct, signal_2_actual_pct, signal_3_actual_count, ai_narrative, pipeline_risk_detected")
    .eq("campaign_id", campaign_id)
    .order("week_number", { ascending: false })
    .limit(4);

  if (signalReports?.length) {
    ctx.signal_reports = signalReports;
    signalCount++;
    maxWeeks = Math.max(maxWeeks, signalReports.length);
  }

  // Signal thresholds (targets)
  const { data: thresholds } = await supabase
    .from("signal_thresholds")
    .select("signal_1_label, signal_1_threshold_pct, signal_2_label, signal_2_threshold_pct, signal_3_label, signal_3_threshold_count, campaign_duration_weeks, locked")
    .eq("campaign_id", campaign_id)
    .maybeSingle();

  ctx.thresholds = thresholds;

  // S2 — Kill switches (breached or at-risk)
  const { data: killSwitches } = await supabase
    .from("kill_switches")
    .select("kill_switch_name, threshold_value, unit, breach_status, triggered_at")
    .eq("frame_brief_id", frame?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("breach_status", { ascending: false })
    .limit(10);

  if (killSwitches?.length) {
    ctx.kill_switches = killSwitches;
    signalCount++;
  }

  // S3 — Stage briefs (live/approved)
  const { data: stageBriefs } = await supabase
    .from("stage_briefs")
    .select("stage_name, stage_objective, channel, status, idea_led")
    .eq("campaign_id", campaign_id)
    .in("status", ["Live", "Approved", "Draft"])
    .limit(6);

  if (stageBriefs?.length) {
    ctx.stage_briefs = stageBriefs;
    signalCount++;
  }

  // S4 — Market contexts (recent, last 4)
  const { data: marketContexts } = await supabase
    .from("signal_market_contexts")
    .select("context_label, context_type, impact_direction, impact_notes, week_number")
    .eq("campaign_id", campaign_id)
    .order("week_number", { ascending: false })
    .limit(4);

  if (marketContexts?.length) {
    ctx.market_contexts = marketContexts;
    signalCount++;
  }

  // S5 — Audience replenishment (latest week)
  const { data: replenishment } = await supabase
    .from("audience_replenishment")
    .select("week_number, estimated_nurture_pool, weekly_conversion_count, demand_new_audience")
    .eq("campaign_id", campaign_id)
    .order("week_number", { ascending: false })
    .limit(2);

  if (replenishment?.length) {
    ctx.audience_replenishment = replenishment;
    signalCount++;
  }

  // S6 — Campaign learning record
  const { data: learning } = await supabase
    .from("campaign_learning_records")
    .select("what_worked, what_to_change, signal_insights, anchor_recommendation, sov_pct, som_pct")
    .eq("campaign_id", campaign_id)
    .maybeSingle();

  if (learning) {
    ctx.campaign_learning = learning;
    signalCount++;
  }

  // S7 — SoV:SoM from learning (for brand battery context)
  const { data: brandMomentum } = await supabase
    .from("brand_momentum_scores")
    .select("period_label, bms_direction, bms_velocity, bms_confidence, dimension_conflict_flag, ai_read")
    .eq("client_id", (campaign as { client_id?: string } | null)?.client_id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (brandMomentum) {
    ctx.brand_momentum = brandMomentum;
    signalCount++;
  }

  // S8 — Phase gates (what's been passed / blocked)
  const { data: phaseGates } = await supabase
    .from("phase_gates")
    .select("gate_name, gate_outcome, gate_met_at")
    .eq("campaign_id", campaign_id)
    .order("created_at", { ascending: false })
    .limit(4);

  if (phaseGates?.length) ctx.phase_gates = phaseGates;

  // S9 — Signal logs (recent breach signals)
  const { data: signalLogs } = await supabase
    .from("gate_signal_log")
    .select("signal_label, actual_value, threshold_value, unit, pass, week_number")
    .eq("campaign_id", campaign_id)
    .eq("pass", false)
    .order("week_number", { ascending: false })
    .limit(5);

  if (signalLogs?.length) {
    ctx.failing_signal_logs = signalLogs;
    signalCount++;
  }

  // S10 — OIE Competitive Intelligence (when client has oie_company_id)
  const clientId = (campaign as { client_id?: string } | null)?.client_id ?? "";
  if (clientId) {
    const { data: clientOie } = await supabase
      .from("clients")
      .select("oie_company_id")
      .eq("id", clientId)
      .maybeSingle();

    const oieCompanyId = (clientOie as { oie_company_id?: string | null } | null)?.oie_company_id;

    if (oieCompanyId) {
      const [companyRes, signalsRes] = await Promise.all([
        supabase.from("companies").select("name").eq("id", oieCompanyId).maybeSingle(),
        supabase
          .from("business_signals")
          .select("signal_type, signal_text, detected_at")
          .eq("company_id", oieCompanyId)
          .eq("signal_category", "Competitive")
          .order("detected_at", { ascending: false })
          .limit(5),
      ]);

      const oieCompanyName = (companyRes.data as { name?: string } | null)?.name ?? null;
      const competitiveSignals = signalsRes.data ?? [];

      if (competitiveSignals.length) {
        ctx.competitive_intel = { company_name: oieCompanyName, signals: competitiveSignals };
        signalCount++;
      }
    }
  }

  // ── Prediction Track Record — closed predictions for this campaign ──────────
  // These are past system recommendations where a verdict has been entered.
  // Feeds the learning loop: the system sees what it predicted and whether it was right.
  const { data: predictionHistory } = await supabase
    .from("prediction_accuracy_log")
    .select("category, prediction_text, predicted_value, unit, prediction_week, verdict, actual_value")
    .eq("campaign_id", campaign_id)
    .neq("verdict", "Pending")
    .order("prediction_week", { ascending: false })
    .limit(8);

  if (predictionHistory?.length) {
    ctx.prediction_history = predictionHistory;
    const correct = predictionHistory.filter((p: Record<string, unknown>) => p.verdict === "Correct").length;
    ctx.prediction_accuracy_rate = `${correct}/${predictionHistory.length} verified predictions correct`;
  }

  // ── Past Campaign Memory — previous digests from same client ─────────────────
  // Gives the system cross-campaign pattern recognition without vector infrastructure.
  const pastClientId = (ctx.campaign as Record<string, unknown> | null)?.client_id as string | null;
  if (pastClientId) {
    const { data: siblingCampaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("client_id", pastClientId)
      .neq("id", campaign_id);

    if (siblingCampaigns?.length) {
      const siblingIds = siblingCampaigns.map((c: Record<string, unknown>) => c.id as string);
      const { data: pastDigests } = await supabase
        .from("campaign_os_digests")
        .select("overall_health, top_action, narrative, generated_at")
        .in("campaign_id", siblingIds)
        .order("generated_at", { ascending: false })
        .limit(2);

      if (pastDigests?.length) {
        ctx.past_campaign_memory = pastDigests.map((d: Record<string, unknown>) => ({
          health:     d.overall_health,
          top_action: d.top_action,
          // First 400 chars of narrative — enough for pattern context without bloating the prompt
          summary:    typeof d.narrative === "string" ? d.narrative.slice(0, 400) : "",
          date:       d.generated_at,
        }));
        signalCount++;
      }
    }
  }

  return { ctx, signalCount, maxWeeks };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildDigestPrompt(ctx: Record<string, unknown>): string {
  const campaign = ctx.campaign as Record<string, unknown> | null;
  const frame = ctx.frame as Record<string, unknown> | null;

  const contextLines: string[] = [];

  if (campaign) {
    contextLines.push(`CAMPAIGN: ${campaign.name ?? "Unknown"}`);
    contextLines.push(`Phase: ${campaign.current_phase ?? "Unknown"} | Gate Signal: ${campaign.gate_signal_status ?? "Unknown"}`);
    contextLines.push(`Industry: ${campaign.industry_profile ?? "Unknown"}`);
  }

  if (frame) {
    contextLines.push(`\nFRAME BRIEF:`);
    contextLines.push(`  Anchor: ${frame.anchor ?? "Not set"}`);
    contextLines.push(`  Mood: ${frame.mood ?? "Not set"}`);
    contextLines.push(`  Clarity: ${frame.clarity_statement ?? "Not set"}`);
    contextLines.push(`  Lock status: ${frame.lock_status ?? "Unlocked"}`);
    contextLines.push(`  Demand investment: ${frame.demand_investment_pct ?? "Not set"}%`);
    contextLines.push(`  Active channels: ${JSON.stringify(frame.active_channels ?? [])}`);
  }

  if (ctx.thresholds) {
    const t = ctx.thresholds as Record<string, unknown>;
    contextLines.push(`\nSIGNAL TARGETS:`);
    contextLines.push(`  S1 ${t.signal_1_label}: target ${t.signal_1_threshold_pct}%`);
    contextLines.push(`  S2 ${t.signal_2_label}: target ${t.signal_2_threshold_pct}%`);
    contextLines.push(`  S3 ${t.signal_3_label}: target ${t.signal_3_threshold_count}/wk`);
    contextLines.push(`  Campaign duration: ${t.campaign_duration_weeks} weeks`);
  }

  if (ctx.mdh) {
    const rows = ctx.mdh as Array<Record<string, unknown>>;
    contextLines.push(`\nS0 — MEDIA DELIVERY HEALTH (${rows.length} weeks):`);
    rows.forEach(r => {
      contextLines.push(`  Wk${r.week_number}: ${r.mdh_status ?? "No status"}, freq ${r.avg_frequency ?? "?"}x, AQS ${r.aqs_score ?? "?"} (${r.aqs_band ?? "?"})${r.quarantine_active ? " QUARANTINE ACTIVE" : ""}${r.attention_gap_flag ? " ATTENTION GAP" : ""}`);
    });
  }

  if (ctx.signal_reports) {
    const rows = ctx.signal_reports as Array<Record<string, unknown>>;
    contextLines.push(`\nS1-3 — SIGNAL INTELLIGENCE (${rows.length} weeks):`);
    rows.forEach(r => {
      contextLines.push(`  Wk${r.week_number}: Demand=${r.demand_health} Nurture=${r.nurture_health} Conversion=${r.conversion_health} Gate=${r.gate_status}`);
      contextLines.push(`    S1=${r.signal_1_actual_pct ?? "?"}% S2=${r.signal_2_actual_pct ?? "?"}% S3=${r.signal_3_actual_count ?? "?"}/wk`);
      if (r.pipeline_risk_detected) contextLines.push(`    ⚠ PIPELINE RISK DETECTED`);
      if (r.ai_narrative) contextLines.push(`    AI: ${String(r.ai_narrative).slice(0, 200)}`);
    });
  }

  if (ctx.kill_switches) {
    const ks = ctx.kill_switches as Array<Record<string, unknown>>;
    const breached = ks.filter(k => k.breach_status === "Breached");
    const atRisk = ks.filter(k => k.breach_status === "At Risk");
    if (breached.length || atRisk.length) {
      contextLines.push(`\nKILL SWITCHES:`);
      breached.forEach(k => contextLines.push(`  BREACHED: ${k.kill_switch_name} (triggered ${k.triggered_at ?? "?"})`));
      atRisk.forEach(k => contextLines.push(`  AT RISK: ${k.kill_switch_name}`));
    }
  }

  if (ctx.stage_briefs) {
    const sb = ctx.stage_briefs as Array<Record<string, unknown>>;
    contextLines.push(`\nSTAGE BRIEFS:`);
    sb.forEach(b => {
      contextLines.push(`  ${b.stage_name} [${b.status}] via ${b.channel ?? "?"}  — ${String(b.stage_objective ?? "").slice(0, 100)}`);
    });
  }

  if (ctx.market_contexts) {
    const mc = ctx.market_contexts as Array<Record<string, unknown>>;
    contextLines.push(`\nMARKET CONTEXT (F16C):`);
    mc.forEach(m => {
      contextLines.push(`  Wk${m.week_number}: [${m.context_type}] ${m.context_label} — impact ${m.impact_direction}${m.impact_notes ? `: ${String(m.impact_notes).slice(0, 100)}` : ""}`);
    });
  }

  if (ctx.audience_replenishment) {
    const ar = ctx.audience_replenishment as Array<Record<string, unknown>>;
    const latest = ar[0];
    if (latest) {
      const pool = Number(latest.estimated_nurture_pool ?? 0);
      const conv = Number(latest.weekly_conversion_count ?? 0);
      const horizon = conv > 0 ? Math.round(pool / conv) : null;
      contextLines.push(`\nAUDIENCE REPLENISHMENT:`);
      contextLines.push(`  Wk${latest.week_number}: Pool ${pool.toLocaleString()}, ${conv} conversions/wk`);
      if (horizon !== null) {
        contextLines.push(`  Pipeline horizon: ${horizon} weeks${horizon < 8 ? " — RED FLAG" : horizon < 12 ? " — watch" : " — healthy"}`);
      }
    }
  }

  if (ctx.campaign_learning) {
    const cl = ctx.campaign_learning as Record<string, unknown>;
    contextLines.push(`\nCAMPAIGN LEARNING:`);
    if (cl.what_worked)   contextLines.push(`  What worked: ${String(cl.what_worked).slice(0, 200)}`);
    if (cl.what_to_change) contextLines.push(`  What to change: ${String(cl.what_to_change).slice(0, 200)}`);
    if (cl.sov_pct !== null && cl.som_pct !== null) {
      contextLines.push(`  SoV ${cl.sov_pct}% vs SoM ${cl.som_pct}% — ratio ${Number(cl.sov_pct) > 0 ? (Number(cl.som_pct) / Number(cl.sov_pct)).toFixed(2) : "?"}`);
    }
  }

  if (ctx.brand_momentum) {
    const bm = ctx.brand_momentum as Record<string, unknown>;
    contextLines.push(`\nBRAND MOMENTUM:`);
    contextLines.push(`  ${bm.period_label}: ${bm.bms_direction} (velocity ${bm.bms_velocity}, confidence ${bm.bms_confidence})`);
    if (bm.dimension_conflict_flag) contextLines.push(`  ⚠ Dimension conflict detected`);
  }

  if (ctx.failing_signal_logs) {
    const fl = ctx.failing_signal_logs as Array<Record<string, unknown>>;
    contextLines.push(`\nFAILING SIGNALS (${fl.length}):`);
    fl.forEach(l => {
      contextLines.push(`  Wk${l.week_number}: ${l.signal_label} — actual ${l.actual_value} vs threshold ${l.threshold_value} ${l.unit ?? ""}`);
    });
  }

  if (ctx.competitive_intel) {
    const ci = ctx.competitive_intel as { company_name: string | null; signals: Array<Record<string, unknown>> };
    contextLines.push(`\nS10 — COMPETITIVE INTELLIGENCE (OIE — ${ci.company_name ?? "Linked Competitor"}):`);
    ci.signals.forEach(s => {
      const detected = s.detected_at ? new Date(s.detected_at as string).toLocaleDateString("en-MY", { day: "numeric", month: "short" }) : "?";
      contextLines.push(`  [${s.signal_type ?? "Signal"}] ${String(s.signal_text ?? "").slice(0, 200)} (${detected})`);
    });
    contextLines.push(`  INSTRUCTION: If any competitor signals overlap with this campaign's channels, category, or spend window, name the competitive pressure explicitly in the narrative and recommendations.`);
  }

  // ── Prediction Track Record ───────────────────────────────────────────────────
  if (ctx.prediction_history) {
    const preds = ctx.prediction_history as Array<Record<string, unknown>>;
    contextLines.push(`\nPREDICTION TRACK RECORD (${ctx.prediction_accuracy_rate ?? "no resolved predictions yet"}):`);
    preds.forEach(p => {
      const week = p.prediction_week ? `Wk${p.prediction_week}` : "?";
      const actual = p.actual_value ? ` | Actual: ${p.actual_value}${p.unit ? " " + p.unit : ""}` : "";
      contextLines.push(`  ${week} [${p.category ?? "General"}] ${p.prediction_text} → ${p.verdict}${actual}`);
    });
    contextLines.push(`  Use this track record to calibrate your confidence levels. If prior predictions were Incorrect, assign lower confidence to similar recommendation types.`);
  }

  // ── Past Campaign Memory ──────────────────────────────────────────────────────
  if (ctx.past_campaign_memory) {
    const past = ctx.past_campaign_memory as Array<Record<string, unknown>>;
    contextLines.push(`\nPAST CAMPAIGN MEMORY (same client, ${past.length} previous campaign${past.length > 1 ? "s" : ""}):`);
    past.forEach((d, i) => {
      const date = d.date ? new Date(d.date as string).toLocaleDateString("en-MY", { month: "short", year: "numeric" }) : "?";
      contextLines.push(`  Campaign ${i + 1} (${date}) — Health: ${d.health} | Top action was: ${d.top_action}`);
      if (d.summary) contextLines.push(`  Summary: ${d.summary}`);
    });
    contextLines.push(`  Use this memory to detect recurring patterns, unresolved issues, or improvements since prior campaigns.`);
  }

  // Return only the dynamic data block — static rules live in DIGEST_SYSTEM_PROMPT
  return `CAMPAIGN DATA:\n${contextLines.join("\n")}`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    // Assemble signal context
    const { ctx, signalCount, maxWeeks } = await assembleSignalContext(campaign_id);

    // Get campaign phase for metadata
    const campaignPhase = (ctx.campaign as Record<string, unknown> | null)?.current_phase as string ?? "";

    // Get latest signal week for context
    const signalReports = ctx.signal_reports as Array<Record<string, unknown>> | undefined;
    const weekNumber = signalReports?.[0]?.week_number as number | undefined;

    // Build and call Claude
    // Static methodology lives in DIGEST_SYSTEM_PROMPT (cached — same every call)
    // Dynamic campaign data is the user message (changes per campaign)
    const dynamicData = buildDigestPrompt(ctx);
    const model = await getModel("model_campaign_digest", "claude-sonnet-4-6");

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      system: [
        {
          type:          "text",
          text:          DIGEST_SYSTEM_PROMPT,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cache_control: { type: "ephemeral" } as any,
        },
      ],
      messages: [{ role: "user", content: dynamicData }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text ?? "";

    // Parse JSON response
    let parsed: Record<string, unknown>;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      parsed = {};
    }

    const overall_health = (parsed.overall_health as string) ?? "Amber";
    const narrative      = (parsed.narrative as string) ?? "";
    const top_action     = (parsed.top_action as string) ?? "";
    const contradictions = (parsed.contradictions as unknown[]) ?? [];
    const blindspots     = (parsed.blindspots as unknown[]) ?? [];
    const recommendations = (parsed.recommendations as unknown[]) ?? [];

    // Save to database
    const { data: saved, error: saveErr } = await supabase
      .from("campaign_os_digests")
      .insert({
        campaign_id,
        week_number:         weekNumber ?? null,
        campaign_phase:      campaignPhase,
        signal_context_json: ctx,
        overall_health,
        narrative,
        top_action,
        contradictions_json:   contradictions,
        blindspots_json:       blindspots,
        recommendations_json:  recommendations,
        model_used:            model,
        signal_count:          signalCount,
        data_weeks_available:  maxWeeks,
      })
      .select("id, generated_at")
      .single();

    if (saveErr) {
      console.error("/api/campaign-digest save error:", saveErr);
      // Return the result anyway even if save failed
    }

    return NextResponse.json({
      id:               saved?.id ?? null,
      campaign_id,
      week_number:      weekNumber ?? null,
      overall_health,
      narrative,
      top_action,
      contradictions,
      blindspots,
      recommendations,
      signal_count:     signalCount,
      data_weeks:       maxWeeks,
      model_used:       model,
      generated_at:     saved?.generated_at ?? new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/campaign-digest error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET — fetch latest saved digest ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaign_id = searchParams.get("campaign_id");
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data } = await supabase
      .from("campaign_os_digests")
      .select("*")
      .eq("campaign_id", campaign_id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(data ?? null);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
