// app/api/campaign-report-generate/route.ts
// F31 — Campaign Intelligence Report (Sprint 7)
// INTERNAL ONLY — strategy lead and Janine only.
//
// POST /api/campaign-report-generate
//
// Two actions:
//
//   action: "generate" (default)
//     Pulls all stored intelligence components for a campaign.
//     Synthesises a structured internal snapshot (report_data) +
//     a client-safe executive summary.
//     Writes to campaign_reports. Returns the report record.
//
//   action: "append_finding"
//     Appends a F33 IntelligenceQueryResult to findings[]
//     in the most recent draft/ready campaign_reports record.
//     Creates a new report record if none exists.
//     Called by IntelligenceQuerySection.tsx "Save to CIR".
//
// Auth: service role only.
// BOUNDARY: report_data, findings[].confidence, findings[].components_used
//           are INTERNAL ONLY. Client export contains executive_summary +
//           finding text only.

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  campaign_id: string;
  action?: "generate" | "append_finding";
  finding?: {
    query_id: string;
    headline: string;
    context: string;
    implication: string;
    recommendation: string;
    confidence: string;        // INTERNAL
    components_used: string[]; // INTERNAL
    scopes_resolved: string[]; // INTERNAL
    generated_at: string;
  };
}

interface AqsSnapshot {
  aqs_band: string | null;
  attention_gap_flag: boolean;
  attention_gap_action: string;
  aqs_benchmark_delta: number | null;
  week_number: number;
}

interface ComponentSnapshot {
  signal_reports: unknown[];
  consumer_state_readings: unknown[];
  brand_momentum_scores: unknown[];
  attribution_records: unknown[];
  activation_playbook: unknown[];
  orchestration_chain_summary: string | null;
  report_week: number;
  campaign_name: string;
  client_name: string;
  aqs: AqsSnapshot | null;
}

// ─── Data collection ──────────────────────────────────────────────────────────

async function collectCampaignData(
  campaign_id: string,
  supabase: ReturnType<typeof getSupabase>
): Promise<ComponentSnapshot> {

  // Campaign + client info
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("name, client_id, clients(name)")
    .eq("id", campaign_id)
    .single();

  const campaignName = campaign?.name ?? "Campaign";
  const clientName = (campaign?.clients as { name?: string } | null)?.name ?? "Client";

  // Signal reports (last 6 weeks)
  const { data: signal_reports } = await supabase
    .from("signal_weekly_reports")
    .select("week_number, week_of, demand_health, nurture_health, conversion_health, ai_narrative, ai_recommended_actions, pipeline_risk_detected, created_at")
    .eq("campaign_id", campaign_id)
    .order("week_number", { ascending: false })
    .limit(6);

  // Consumer state readings (last 6 weeks)
  const { data: consumer_state_readings } = await supabase
    .from("consumer_state_readings")
    .select("week_number, week_of, dominant_state, velocity_score, state_stall_flag, state_stall_note, ai_narrative, created_at")
    .eq("campaign_id", campaign_id)
    .order("week_number", { ascending: false })
    .limit(6);

  // Brand momentum (last 3 periods)
  const { data: bms_data } = await supabase
    .from("campaigns")
    .select("client_id")
    .eq("id", campaign_id)
    .single();

  let brand_momentum_scores: unknown[] = [];
  if (bms_data?.client_id) {
    const { data: bms } = await supabase
      .from("brand_momentum_scores")
      .select("period_label, bms_direction, bms_velocity, bms_confidence, dimension_conflict_flag, ai_read, created_at")
      .eq("client_id", bms_data.client_id)
      .order("created_at", { ascending: false })
      .limit(3);
    brand_momentum_scores = bms ?? [];
  }

  // Attribution (last 8 weeks)
  const { data: attribution_records } = await supabase
    .from("attribution_records")
    .select("week_number, channel_name, spend_rm, sales_rm, incremental_lift_pct, test_type, notes, created_at")
    .eq("campaign_id", campaign_id)
    .order("week_number", { ascending: false })
    .limit(8);

  // Activation playbook entries (most recent) — table may not exist yet, swallow error
  let activation_playbook: unknown[] = [];
  try {
    const { data: apData } = await supabase
      .from("activation_playbook_entries")
      .select("*")
      .eq("campaign_id", campaign_id)
      .order("created_at", { ascending: false })
      .limit(5);
    activation_playbook = apData ?? [];
  } catch {
    activation_playbook = [];
  }

  // Latest orchestration chain summary
  const { data: latestRun } = await supabase
    .from("orchestration_runs")
    .select("chain_summary, completed_at")
    .eq("campaign_id", campaign_id)
    .eq("status", "COMPLETE")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Latest AQS reading (F25 — INTERNAL)
  let aqs: AqsSnapshot | null = null;
  try {
    const { data: aqsRow } = await supabase
      .from("signal_media_delivery")
      .select("week_number, aqs_band, attention_gap_flag, attention_gap_action, aqs_benchmark_delta")
      .eq("campaign_id", campaign_id)
      .not("aqs_score", "is", null)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aqsRow) {
      aqs = {
        aqs_band:            (aqsRow.aqs_band as string | null) ?? null,
        attention_gap_flag:  (aqsRow.attention_gap_flag as boolean) ?? false,
        attention_gap_action:(aqsRow.attention_gap_action as string) ?? "",
        aqs_benchmark_delta: (aqsRow.aqs_benchmark_delta as number | null) ?? null,
        week_number:         aqsRow.week_number as number,
      };
    }
  } catch {
    // AQS columns may not exist on older instances; non-blocking
  }

  // Determine latest report week
  const latestWeek = (signal_reports ?? [])[0]?.week_number ?? 0;

  return {
    signal_reports: signal_reports ?? [],
    consumer_state_readings: consumer_state_readings ?? [],
    brand_momentum_scores,
    attribution_records: attribution_records ?? [],
    activation_playbook,
    orchestration_chain_summary: latestRun?.chain_summary ?? null,
    report_week: latestWeek,
    campaign_name: campaignName,
    client_name: clientName,
    aqs,
  };
}

// ─── Report synthesis ─────────────────────────────────────────────────────────

async function synthesiseReport(
  data: ComponentSnapshot,
  anthropic: Anthropic
): Promise<{ risk_posture: string | null; report_data: Record<string, unknown>; executive_summary: string }> {

  // Build AQS context note for synthesis (INTERNAL — directional language only in output)
  let aqsContext: Record<string, unknown> | null = null;
  if (data.aqs) {
    aqsContext = {
      attention_status:       data.aqs.aqs_band,         // e.g. "Attention Weak"
      attention_gap_flag:     data.aqs.attention_gap_flag,
      attention_gap_action:   data.aqs.attention_gap_action,
      vs_category_benchmark:  data.aqs.aqs_benchmark_delta,
      as_of_week:             data.aqs.week_number,
    };
  }

  const dataStr = JSON.stringify({
    campaign_name: data.campaign_name,
    report_week: data.report_week,
    signal_reports: data.signal_reports.slice(0, 4),
    consumer_state_readings: data.consumer_state_readings.slice(0, 3),
    brand_momentum_scores: data.brand_momentum_scores.slice(0, 2),
    attribution_records: data.attribution_records.slice(0, 4),
    orchestration_chain_summary: data.orchestration_chain_summary,
    // INTERNAL — for signal_summary only; do NOT surface band label or score in client copy
    attention_quality: aqsContext,
  }, null, 2);

  const REPORT_TOOL = {
    name: "submit_campaign_report",
    description: "Submit the synthesised Campaign Intelligence Report.",
    input_schema: {
      type: "object" as const,
      properties: {
        signal_summary:         { type: "string", description: "2–3 sentences on delivery health trend." },
        consumer_state_summary: { type: "string", description: "2–3 sentences on audience behaviour and velocity. No state codes." },
        bms_summary:            { type: "string", description: "2 sentences on brand momentum direction." },
        risk_posture: {
          type: "string",
          enum: ["Gaining", "Plateauing", "Under Threat", "Fragile", "Eroding Slowly"],
          description: [
            "The headline Risk Posture for this brand at this moment.",
            "Gaining: BMS Positive + Accelerating or Stable. Brand winning ground, signals compounding.",
            "Plateauing: BMS Neutral + Stable. Holding but not growing — risk of Eroding if demand signals weaken.",
            "Under Threat: BMS Negative + competitive pressure evident in SOV or consumer behaviour. External threat driving decline.",
            "Fragile: BMS Negative + Decelerating + low confidence. Multiple signals deteriorating simultaneously. Structural weakness.",
            "Eroding Slowly: BMS Negative + Stable velocity. Gradual consistent decline — less acute than Fragile but cumulative risk is high.",
            "Choose the posture that best fits the combined signal picture. When in doubt, Fragile > Under Threat > Eroding Slowly.",
          ].join(" "),
        },
        risk_posture_rationale: {
          type: "string",
          description: "2–3 sentences (INTERNAL). Explain which specific signals drove the posture classification. Name the dominant evidence pattern. No state codes.",
        },
        risk_adjusted_playbook: {
          type: "string",
          description: [
            "3–5 sentences (INTERNAL). Prescribed strategy modification based on this specific Risk Posture × Consumer State combination.",
            "Be directive: 'The priority shift is X. Reduce/increase Y. The next 4 weeks should focus on Z.'",
            "Do NOT give generic advice. Reference the actual posture and dominant consumer state in plain language.",
          ].join(" "),
        },
        activation_summary:     { type: "string", description: "2 sentences on priority actions." },
        attribution_summary:    { type: "string", description: "2 sentences on what attribution data shows." },
        executive_summary:      { type: "string", description: "2 paragraphs — CLIENT SAFE. What is happening, what it means, what happens next. No state codes, no internal names, no metric numbers unless from attribution." },
      },
      required: [
        "signal_summary", "consumer_state_summary", "bms_summary",
        "risk_posture", "risk_posture_rationale", "risk_adjusted_playbook",
        "activation_summary", "attribution_summary", "executive_summary",
      ],
    },
  } as const;

  const systemPrompt = `You are synthesising a Campaign Intelligence Report for a strategy lead.

BOUNDARY RULES — STRICT:
1. No state codes (1-6) — describe consumer behaviour in plain language only.
2. No competitor names — directional language only.
3. No internal system names (MDH, CSTR, BMS, ICS, FRAME, BIP, orchestration_runs, etc.)
4. The executive_summary is CLIENT SAFE — write it as if presenting to the brand team.
5. The section summaries are INTERNAL — can use more technical framing.
6. ATTENTION QUALITY (if present in data): incorporate into signal_summary using directional language only.
   NEVER expose the band label ("Attention Weak", "Attention Gap", etc.) or any numeric score.
   Use phrasing like: "Creative is reaching the target audience but losing active attention mid-video."
   or "Video attention is holding above category norms — sustained viewing is supporting brand message delivery."
   If attention_gap_flag is true, reference the gap_action directionally in risk_adjusted_playbook.
   Do NOT mention "AQS", "attention score", or any internal system name.`;

  const reportModel = await getModel("model_campaign_report", "claude-sonnet-4-6");
  const msg = await anthropic.messages.create({
    model: reportModel,
    max_tokens: 1200,
    system: systemPrompt,
    tools: [REPORT_TOOL],
    tool_choice: { type: "tool", name: "submit_campaign_report" },
    messages: [{ role: "user", content: `Campaign data:\n${dataStr}\n\nSynthesise the Campaign Intelligence Report.` }],
  });

  const toolBlock = msg.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    return {
      risk_posture: null,
      report_data: {
        error: "Synthesis failed — AI did not return structured output",
      },
      executive_summary: data.orchestration_chain_summary ?? "",
    };
  }
  const r = toolBlock.input as {
    signal_summary?: string;
    consumer_state_summary?: string;
    bms_summary?: string;
    risk_posture?: string;
    risk_posture_rationale?: string;
    risk_adjusted_playbook?: string;
    activation_summary?: string;
    attribution_summary?: string;
    executive_summary?: string;
  };

  return {
    risk_posture: r.risk_posture ?? null,
    report_data: {
      signal_summary:         r.signal_summary         ?? "",
      consumer_state_summary: r.consumer_state_summary ?? "",
      bms_summary:            r.bms_summary            ?? "",
      risk_posture:           r.risk_posture           ?? "",
      risk_posture_rationale: r.risk_posture_rationale ?? "",
      risk_adjusted_playbook: r.risk_adjusted_playbook ?? "",
      activation_summary:     r.activation_summary     ?? "",
      attribution_summary:    r.attribution_summary    ?? "",
      generated_components: {
        signal_weeks:          data.signal_reports.length,
        consumer_state_weeks:  data.consumer_state_readings.length,
        bms_periods:           data.brand_momentum_scores.length,
        attribution_records:   data.attribution_records.length,
      },
    },
    executive_summary: r.executive_summary ?? "",
  };
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function getOrCreateReport(
  campaign_id: string,
  supabase: ReturnType<typeof getSupabase>
): Promise<string> {
  // Find most recent draft or ready report
  const { data: existing } = await supabase
    .from("campaign_reports")
    .select("id")
    .eq("campaign_id", campaign_id)
    .in("status", ["draft", "ready"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from("campaign_reports")
    .insert({
      campaign_id,
      status: "draft",
      report_label: "Campaign Intelligence Report",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const anthropic = getAnthropic();

  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { campaign_id, action = "generate", finding } = body;

  if (!campaign_id) {
    return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
  }

  // ── Action: append_finding ─────────────────────────────────────────────────
  if (action === "append_finding") {
    if (!finding) {
      return NextResponse.json({ error: "finding is required for append_finding" }, { status: 400 });
    }

    try {
      const reportId = await getOrCreateReport(campaign_id, supabase);

      // Pull current findings array
      const { data: report } = await supabase
        .from("campaign_reports")
        .select("findings")
        .eq("id", reportId)
        .single();

      const currentFindings = (report?.findings as unknown[]) ?? [];
      const updatedFindings = [...currentFindings, finding];

      await supabase
        .from("campaign_reports")
        .update({ findings: updatedFindings, status: "ready" })
        .eq("id", reportId);

      return NextResponse.json({
        report_id: reportId,
        action: "appended",
        findings_count: updatedFindings.length,
      });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  // ── Action: generate ───────────────────────────────────────────────────────
  try {
    // Collect data from all stored components
    const data = await collectCampaignData(campaign_id, supabase);

    // Synthesise report
    const { risk_posture, report_data, executive_summary } = await synthesiseReport(data, anthropic);

    // Upsert report record (create new for each generation — full history)
    const reportLabel = data.report_week > 0
      ? `Week ${data.report_week} — Campaign Intelligence Report`
      : "Campaign Intelligence Report";

    const { data: report, error } = await supabase
      .from("campaign_reports")
      .insert({
        campaign_id,
        report_week: data.report_week,
        report_label: reportLabel,
        report_data,
        executive_summary,
        risk_posture,
        status: "ready",
      })
      .select("id, report_label, executive_summary, risk_posture, status, created_at")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      report_id: report.id,
      report_label: report.report_label,
      executive_summary: report.executive_summary,
      risk_posture: report.risk_posture,
      status: report.status,
      report_data,           // INTERNAL — consumer in strategy lead UI only
      data_coverage: {
        signal_weeks: data.signal_reports.length,
        consumer_state_weeks: data.consumer_state_readings.length,
        bms_periods: data.brand_momentum_scores.length,
        attribution_records: data.attribution_records.length,
      },
      created_at: report.created_at,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── GET: retrieve most recent report for a campaign ────────────────────────
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const campaign_id = searchParams.get("campaign_id");

  if (!campaign_id) {
    return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("campaign_reports")
    .select("id, report_label, executive_summary, report_data, findings, risk_posture, status, report_week, created_at, updated_at, exported_at")
    .eq("campaign_id", campaign_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ report: null });
  }

  return NextResponse.json({ report: data });
}
