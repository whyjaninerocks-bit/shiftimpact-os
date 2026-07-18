// app/api/signal-report/route.ts
// Feature 12 — Signal Intelligence Reporting Module (Sprint 2)
// Sprint 24 — Signal 2B (Share Rate) + Gate Signal Convergence Module
<<<<<<< HEAD
=======
// Sprint 25 — Signal 3B (VCR) + Signal 4 (Retention) + market_code context
>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
// INTERNAL ONLY — never called from or exposed to Client Interface (/portal/*).
//
// POST /api/signal-report
// Reads signal inputs from signal_weekly_reports, applies threshold rules,
// computes campaign-proportional phase, computes Gate Status (Amber/Green/Red),
// runs Claude Haiku for AI narrative, saves traffic lights + Gate + narrative
// back to signal_weekly_reports.
//
// Gate Signal Logic (Signal Gap Framework v2):
//   Amber = 1 behaviour signal above threshold (watch, no budget release)
//   Green = 2+ independent behaviour signals converging (Gate open, budget release eligible)
//   Red   = no behaviour signals above threshold
//   "Fires AND holds" — prior-week check confirms signal is not a one-week spike.
//
// Auth: service role (Supabase JWT) — strategy lead and Janine only.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai-model";

// ─── Supabase admin client ───────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Types ───────────────────────────────────────────────────────────────────

type SignalHealth = "Green" | "Amber" | "Red";
type CampaignPhase = 1 | 2 | 3 | 4;
type GateStatus = "Green" | "Amber" | "Red";

interface SignalReportRequest {
  campaign_id: string;
  week_number: number;
}

interface ThresholdRecord {
  id: string;
  campaign_id: string;
  campaign_duration_weeks: number;
  signal_1_label: string;
  signal_1_threshold_pct: number;
  signal_1_amber_pct: number;
  signal_1_red_pct: number;
  signal_2_label: string;
  signal_2_threshold_pct: number;
  signal_2_amber_pct: number;
  signal_2_red_pct: number;
  signal_2b_label: string;
  signal_2b_target_pct: number;
  signal_2b_amber_pct: number;
  signal_2b_red_pct: number;
  signal_3_label: string;
  signal_3_threshold_count: number;
  signal_3_amber_count: number;
  signal_3_red_count: number;
  // Signal 3B (VCR) — Sprint 25
  signal_3b_label: string;
  signal_3b_target_pct: number;
  signal_3b_amber_pct: number;
  signal_3b_red_pct: number;
  // Signal 4 (Retention) — Sprint 25
  signal_4_label: string;
  signal_4_target_pct: number;
  signal_4_amber_pct: number;
  signal_4_red_pct: number;
  // Market code — Sprint 25
  market_code: string | null;
  locked: boolean;
}

interface WeeklyRecord {
  id: string;
  signal_1_actual_pct: number | null;
  signal_2_actual_pct: number | null;
  signal_2b_actual_pct: number | null;
  signal_2b_label: string | null;
  signal_3_actual_count: number | null;
  signal_3b_actual_pct: number | null;  // VCR — Sprint 25
  signal_4_actual_pct: number | null;   // Retention — Sprint 25
  campaign_phase: number;
  flags_suppressed: boolean;
}

// ─── Phase helper ────────────────────────────────────────────────────────────

function computePhase(weekNumber: number, durationWeeks: number): CampaignPhase {
  const pct = weekNumber / durationWeeks;
  if (pct <= 0.25) return 1;
  if (pct <= 0.60) return 2;
  if (pct <= 0.80) return 3;
  return 4;
}

function phaseLabel(phase: CampaignPhase, durationWeeks: number, weekNumber: number): string {
  const weeksLeft = durationWeeks - weekNumber;
  switch (phase) {
    case 1: return `Phase 1 — Baseline Establishment (${weeksLeft} weeks remaining). No flags generated in this phase. Signal baselines are being set.`;
    case 2: return `Phase 2 — Signal Emergence (${weeksLeft} weeks remaining). Amber flags require 2 consecutive readings to confirm before escalating.`;
    case 3: return `Phase 3 — Diagnostic Window (${weeksLeft} weeks remaining). CRITICAL phase — flags trigger on single readings. Last viable window for meaningful course-correction.`;
    case 4: return `Phase 4 — Optimisation Sprint (${weeksLeft} weeks remaining). Conversion focus only. All Demand and Nurture recommendations are tagged 'Apply to next campaign.'`;
  }
}

// ─── Traffic light logic ──────────────────────────────────────────────────────

function computeNumericHealth(
  actual: number | null,
  greenThreshold: number,
  amberThreshold: number,
  _redThreshold: number,
  phase: CampaignPhase,
  higherIsBetter = true
): SignalHealth {
  if (phase === 1) return "Green";
  if (actual === null) return "Green"; // no data = no flag

  if (higherIsBetter) {
    if (actual >= greenThreshold) return "Green";
    if (actual >= amberThreshold) return "Amber";
    return "Red";
  } else {
    if (actual <= greenThreshold) return "Green";
    if (actual <= amberThreshold) return "Amber";
    return "Red";
  }
}

// ─── Gate Signal Convergence ──────────────────────────────────────────────────
// Signal Gap Framework v2 — Gate logic:
//   Green Gate: 2+ independent behaviour signals BOTH above target AND holding
//   Amber Gate: 1 signal above target (progress reportable, no budget release)
//   Red Gate:   0 signals above target
//
// "Holds": signal was at the same level or better the prior week.
// A one-week spike does not open the Gate.

interface SignalForGate {
  name: string;
  health: SignalHealth;
  hasData: boolean;
  priorHealth: SignalHealth | null;
}

function computeGateStatus(
  signals: SignalForGate[],
  phase: CampaignPhase
): { gate_status: GateStatus; gate_signals_converging: number; gate_note: string } {
  // Phase 1 — baseline, no gate assessment
  if (phase === 1) {
    return {
      gate_status: "Red",
      gate_signals_converging: 0,
      gate_note:
        "Gate inactive — campaign is in baseline phase. Signal targets are being established. Gate assessment begins in Phase 2.",
    };
  }

  // Only count signals with data entered this week
  const active = signals.filter((s) => s.hasData);
  if (active.length === 0) {
    return {
      gate_status: "Red",
      gate_signals_converging: 0,
      gate_note: "Gate closed — no signal data entered this week.",
    };
  }

  const greenSignals = active.filter((s) => s.health === "Green");
  const amberSignals = active.filter((s) => s.health === "Amber");
  const greenCount = greenSignals.length;

  // "Holds" check — signal was at Green or Amber in the prior week too
  const holdingGreen = greenSignals.filter(
    (s) => s.priorHealth === "Green" || s.priorHealth === "Amber"
  );
  const isHolding = holdingGreen.length >= 2;
  const holdingNote = isHolding
    ? " and holding"
    : greenCount >= 2
    ? " (confirm holding next week)"
    : "";

  if (greenCount >= 2) {
    const names = greenSignals.map((s) => s.name).join(" + ");
    return {
      gate_status: "Green",
      gate_signals_converging: greenCount,
      gate_note: `Gate open — ${names} both above target${holdingNote}. Budget release criteria met per Signal Gap Framework v2.`,
    };
  }

  if (greenCount === 1) {
    return {
      gate_status: "Amber",
      gate_signals_converging: 1,
      gate_note: `Gate watch — ${greenSignals[0].name} is above target. Watching for one more independent signal to converge before Gate opens. Budget hold maintained.`,
    };
  }

  if (amberSignals.length >= 1) {
    const names = amberSignals.map((s) => s.name).join(", ");
    return {
      gate_status: "Amber",
      gate_signals_converging: 0,
      gate_note: `Gate watch — ${names} ${amberSignals.length > 1 ? "are" : "is"} approaching target but below Green threshold. No signals at Green yet. Budget hold maintained.`,
    };
  }

  return {
    gate_status: "Red",
    gate_signals_converging: 0,
    gate_note:
      "Gate closed — no behaviour signals above target threshold this week. Review campaign creative and targeting.",
  };
}

<<<<<<< HEAD
=======
// ─── Market signal priority context ──────────────────────────────────────────
// Each market has a different rank order for which signals carry the most weight.
// Used to contextualise AI recommendations — e.g. "TikTok Save+Share is the
// primary lead signal in Malaysia; SoS leads in Singapore."

const MARKET_SIGNAL_PRIORITY: Record<string, string> = {
  MY: "Malaysia (MY): TikTok Save Rate + Share Rate are the primary lead signals. WhatsApp dark social (referral traffic spike) is the strongest advocacy proxy. Shopee Wishlist Adds are a high-value commerce signal. SoS strengthens in consideration-stage. Prioritise S2 + S2B convergence for Gate assessment.",
  SG: "Singapore (SG): Share of Search (SoS / S1) is the strongest signal — most search-mature market in SEA. Save Rate (S2) and Instagram Story Reply Rate follow. LinkedIn Saves relevant for B2B. Gate should weight S1 + S2 convergence.",
  PH: "Philippines (PH): Facebook Group Mentions are the #1 organic signal — FB is effectively the internet in PH. TikTok UGC volume and Share Rate follow. Shopee Live Commerce engagement is a high-value commerce signal.",
  TH: "Thailand (TH): TikTok Sound Adoption Rate is the #1 signal for trend-led categories. LINE OA Open Rate and Forward Rate are strong CRM signals. Save + Share Rate on TikTok follow. UGC Volume signals community traction.",
  ID: "Indonesia (ID): TikTok UGC Volume is the #1 signal — highest organic TikTok content output in SEA. Tokopedia + Shopee Wishlist Adds are high-value commerce signals. WhatsApp dark social proxy (referral traffic spike) is a strong advocacy indicator. YouTube Completion Rate for long-form.",
};

function buildMarketSignalContext(marketCode: string | null): string {
  const code = (marketCode ?? "MY").toUpperCase();
  const ctx = MARKET_SIGNAL_PRIORITY[code] ?? MARKET_SIGNAL_PRIORITY["MY"];
  return `\nMARKET SIGNAL PRIORITY CONTEXT (${code}):\n${ctx}`;
}

>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
// ─── Tool schema ─────────────────────────────────────────────────────────────

const SIGNAL_REPORT_TOOL = {
  name: "submit_signal_report",
  description: "Submit the weekly signal intelligence report narrative and recommended actions.",
  input_schema: {
    type: "object" as const,
    properties: {
      gate_status_label: {
        type: "string",
        description:
          "One sentence only. Open with 'Gate Status: [Open / Watch / Closed] —'. State what the Gate Status means for budget release this week. No more than 25 words.",
      },
      narrative: {
        type: "string",
        description:
          "1–2 paragraphs. Plain language. What the signal combination means for this campaign right now. Start with the most critical diagnostic — do not lead with good news if there is a risk to address.",
      },
      recommended_actions: {
        type: "array",
        items: { type: "string" },
        description:
          "Numbered, specific actions actionable within 48 hours. 2–4 items. Phase 4: tag Demand/Nurture actions as [NEXT CAMPAIGN].",
      },
      phase_context: {
        type: "string",
        description: "One sentence on what this phase means for decision-making.",
      },
    },
    required: ["gate_status_label", "narrative", "recommended_actions", "phase_context"],
  },
} as const;

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the ShiftImpact OS Signal Intelligence engine — an internal AI tool for strategy leads and Janine.

You analyse weekly campaign signal data across four concurrent behaviour signals:
- Demand: measures category interest and brand awareness (Signal 3 — UGC volume)
- Nurture — Save Rate: measures active consideration (Signal 2 — content save rate)
- Nurture — Share Rate: measures social advocacy (Signal 2B — content share rate)
- Conversion: measures purchase intent (Signal 1 — branded search lift / Share of Search)

GATE SIGNAL LOGIC (Signal Gap Framework v2):
Gate Status determines whether budget release criteria have been met this week.
- Gate: Closed (Red) = no behaviour signals above target. No budget release. Diagnose cause.
- Gate: Watch (Amber) = 1 signal above target. Progress reportable to client. Budget hold maintained.
- Gate: Open (Green) = 2+ independent behaviour signals both above target. Budget release criteria met.
The budget does not move until the Gate opens. This is the contractual commitment, not a recommendation.

CRITICAL RULES:
1. Write for strategy leads who understand the ShiftImpact OS methodology. Be direct, specific, strategic.
2. Never use motivational language ("great work", "keep it up", etc.)
3. Phase 1 reports always say: "Campaign in baseline phase — signal baselines are being established. Gate inactive. No flags generated this week."
4. In Phase 4, all Demand and Nurture recommended actions must be tagged [NEXT CAMPAIGN].
5. Always check the cross-stage pattern. Pipeline Risk: Conversion Green + Demand Red/Amber + Nurture Red/Amber = sales cliff in 8-12 weeks post-campaign. Flag it explicitly.
6. When Gate is Open (Green): state clearly that budget release criteria are met. Name which signals triggered it.
7. When Gate is Watch (Amber): state which signal is above target and what is still missing for Gate to open.
8. When Gate is Closed (Red): diagnose why. Do not soften this.
9. Recommended actions must be numbered, specific, and actionable within 48 hours.`;
}

function buildUserPrompt(
  weekNumber: number,
  durationWeeks: number,
  phase: CampaignPhase,
  threshold: ThresholdRecord,
  weekly: WeeklyRecord,
  demandHealth: SignalHealth,
  nurtureHealth: SignalHealth,
  nurtureShareHealth: SignalHealth,
  conversionHealth: SignalHealth,
<<<<<<< HEAD
=======
  vcrHealth: SignalHealth | null,
  retentionHealth: SignalHealth | null,
>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
  gateStatus: GateStatus,
  gateSignalsConverging: number,
  gateNote: string,
  pipelineRisk: boolean,
  campaignName: string,
  channelHealthContext: string,
<<<<<<< HEAD
  marketContextSection: string
=======
  marketContextSection: string,
  marketSignalContext: string
>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
): string {
  const phaseCtx = phaseLabel(phase, durationWeeks, weekNumber);
  const phasePct = Math.round((weekNumber / durationWeeks) * 100);
  const signal2bLabel = weekly.signal_2b_label ?? threshold.signal_2b_label ?? "TikTok share rate";

  const gateEmoji = gateStatus === "Green" ? "⚡" : gateStatus === "Amber" ? "⏸" : "🔴";

  return `CAMPAIGN: ${campaignName}
WEEK: ${weekNumber} of ${durationWeeks} (${phasePct}% through campaign)
${phaseCtx}

${gateEmoji} GATE SIGNAL STATUS (Signal Gap Framework v2):
Gate Status: ${gateStatus === "Green" ? "OPEN" : gateStatus === "Amber" ? "WATCH" : "CLOSED"}
${gateNote}
Signals at Green this week: ${gateSignalsConverging}
${gateStatus === "Green" ? "BUDGET RELEASE CRITERIA MET. State this clearly in gate_status_label and narrative." : ""}
${gateStatus === "Amber" ? "BUDGET HOLD MAINTAINED. Progress reportable. State which signal is above target and what is still needed." : ""}
${gateStatus === "Red" && phase >= 2 ? "GATE CLOSED. Diagnose the cause. Do not soften." : ""}

SIGNAL HEALTH SUMMARY:
- Demand (Signal 3 — ${threshold.signal_3_label}): ${demandHealth}
  Actual: ${weekly.signal_3_actual_count ?? "Not reported"} posts/mentions | Green ≥${threshold.signal_3_threshold_count} | Amber ≥${threshold.signal_3_amber_count} | Red <${threshold.signal_3_amber_count}
- Nurture — Save Rate (Signal 2 — ${threshold.signal_2_label}): ${nurtureHealth}
  Actual: ${weekly.signal_2_actual_pct !== null ? `${weekly.signal_2_actual_pct}%` : "Not reported"} | Green ≥${threshold.signal_2_threshold_pct}% | Amber ≥${threshold.signal_2_amber_pct}% | Red <${threshold.signal_2_amber_pct}%
- Nurture — Share Rate (Signal 2B — ${signal2bLabel}): ${nurtureShareHealth}
  Actual: ${weekly.signal_2b_actual_pct !== null ? `${weekly.signal_2b_actual_pct}%` : "Not reported"} | Green ≥${threshold.signal_2b_target_pct}% | Amber ≥${threshold.signal_2b_amber_pct}% | Red <${threshold.signal_2b_amber_pct}%
- Conversion (Signal 1 — ${threshold.signal_1_label}): ${conversionHealth}
  Actual: ${weekly.signal_1_actual_pct !== null ? `${weekly.signal_1_actual_pct}%` : "Not reported"} search lift | Green ≥${threshold.signal_1_threshold_pct}% | Amber ≥${threshold.signal_1_amber_pct}% | Red <${threshold.signal_1_amber_pct}%
${vcrHealth ? `- Demand — VCR (Signal 3B — ${weekly.signal_3b_actual_pct !== null ? threshold.signal_3b_label ?? "Video completion rate" : "not entered"}): ${vcrHealth}
  Actual: ${weekly.signal_3b_actual_pct !== null ? `${weekly.signal_3b_actual_pct}%` : "Not reported"} | Green ≥${threshold.signal_3b_target_pct ?? 70}% | Amber ≥${threshold.signal_3b_amber_pct ?? 50}%
  Note: VCR is a supplementary Demand-stage signal. Not a primary Gate signal.` : "- Signal 3B (VCR): Not entered this week."}
${retentionHealth ? `- Retention (Signal 4 — ${weekly.signal_4_actual_pct !== null ? threshold.signal_4_label ?? "Retention / repeat visit rate" : "not entered"}): ${retentionHealth}
  Actual: ${weekly.signal_4_actual_pct !== null ? `${weekly.signal_4_actual_pct}%` : "Not reported"} | Green ≥${threshold.signal_4_target_pct ?? 15}% | Amber ≥${threshold.signal_4_amber_pct ?? 8}%
  Note: Signal 4 is a LAG signal — it confirms what happened, not what's coming. Use for diagnosis, not prediction.` : "- Signal 4 (Retention): Not entered this week."}

${pipelineRisk ? "⚠️ PIPELINE RISK PATTERN DETECTED: Conversion is Green but Demand and/or Nurture are not. This means current conversion activity is drawing down an audience that is not being replenished. Expect a post-campaign sales cliff in 8-12 weeks if not addressed now." : ""}
${weekly.flags_suppressed ? "Note: Flags are suppressed in Phase 1. Baseline only." : ""}
<<<<<<< HEAD
=======
${marketSignalContext}
>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
${marketContextSection}
${channelHealthContext}
Generate the signal intelligence report for this week.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: SignalReportRequest = await req.json();
    const { campaign_id, week_number } = body;

    if (!campaign_id || !week_number) {
      return NextResponse.json(
        { error: "campaign_id and week_number are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Load threshold record
    const { data: threshold, error: tErr } = await supabase
      .from("signal_thresholds")
      .select("*")
      .eq("campaign_id", campaign_id)
      .single();

    if (tErr || !threshold) {
      return NextResponse.json(
        { error: "No locked signal thresholds found for this campaign." },
        { status: 404 }
      );
    }

    if (!threshold.locked) {
      return NextResponse.json(
        { error: "Signal thresholds must be locked before running signal reports." },
        { status: 400 }
      );
    }

    // 2. Load weekly signal inputs for THIS week
    const { data: weekly, error: wErr } = await supabase
      .from("signal_weekly_reports")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number)
      .single();

    if (wErr || !weekly) {
      return NextResponse.json(
        { error: "Weekly signal inputs not found. Save signal inputs first." },
        { status: 404 }
      );
    }

    // 2b. Load PRIOR week for "holds" check (Gate fires AND holds)
    const { data: priorWeekly } = await supabase
      .from("signal_weekly_reports")
      .select("demand_health, nurture_health, signal_2b_health, conversion_health")
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number - 1)
      .maybeSingle();

    // 3. Load campaign name
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name")
      .eq("id", campaign_id)
      .single();
    const campaignName = campaign?.name ?? "Campaign";

    // 3.5. F16C — Market variable context
    const { data: marketCtx } = await supabase
      .from("signal_market_contexts")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number)
      .maybeSingle();

    let marketContextSection = "";
    if (marketCtx) {
      const ctxLines: string[] = [];
      if ((marketCtx as any).category_search_trend) {
        ctxLines.push(`  Category search: ${(marketCtx as any).category_search_trend}${(marketCtx as any).category_search_note ? ` — ${(marketCtx as any).category_search_note}` : ""}`);
      }
      if ((marketCtx as any).competitive_sov_change) {
        ctxLines.push(`  Competitive SOV: ${(marketCtx as any).competitive_sov_change}${(marketCtx as any).competitive_sov_note ? ` — ${(marketCtx as any).competitive_sov_note}` : ""}`);
      }
      if ((marketCtx as any).cultural_moment_flag) {
        ctxLines.push(`  Cultural moment: YES${(marketCtx as any).cultural_moment_note ? ` — ${(marketCtx as any).cultural_moment_note}` : ""}`);
      }
      if ((marketCtx as any).platform_algorithm_flag) {
        ctxLines.push(`  Platform algorithm change: YES${(marketCtx as any).platform_algorithm_note ? ` — ${(marketCtx as any).platform_algorithm_note}` : ""}`);
      }
      if ((marketCtx as any).macro_context_note) {
        ctxLines.push(`  Macro context: ${(marketCtx as any).macro_context_note}`);
      }
      if ((marketCtx as any).weather_seasonality_note) {
        ctxLines.push(`  Weather / seasonality: ${(marketCtx as any).weather_seasonality_note}`);
      }
      if (ctxLines.length > 0) {
        marketContextSection = `\nMARKET VARIABLE CONTEXT (F16C — external signals this week):\n${ctxLines.join("\n")}\nNote: Use this to distinguish campaign problems from market-wide conditions before diagnosing signals.`;
      }
    }

    // 3.6. F16B — Cross-channel health from F13 hub
    const { data: channelMetrics } = await supabase
      .from("channel_weekly_metrics")
      .select(`
        channel_health,
        campaign_channels (
          channel_role,
          channel_profiles ( channel_name )
        )
      `)
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number);

    let channelHealthContext = "";
    if (channelMetrics && channelMetrics.length > 0) {
      const ROLES = ["Demand", "Nurture", "Conversion", "Retention"] as const;
      type RoleKey = typeof ROLES[number];
      const roleHealth: Record<RoleKey, { G: number; A: number; R: number; names: string[] }> = {
        Demand:     { G: 0, A: 0, R: 0, names: [] },
        Nurture:    { G: 0, A: 0, R: 0, names: [] },
        Conversion: { G: 0, A: 0, R: 0, names: [] },
        Retention:  { G: 0, A: 0, R: 0, names: [] },
      };
      for (const m of channelMetrics) {
        const cc = (m as any).campaign_channels;
        const role = cc?.channel_role as RoleKey;
        const name = cc?.channel_profiles?.channel_name ?? "?";
        const health = m.channel_health as SignalHealth;
        if (role && roleHealth[role]) {
          if (health === "Green") roleHealth[role].G++;
          else if (health === "Amber") roleHealth[role].A++;
          else roleHealth[role].R++;
          roleHealth[role].names.push(`${name}(${health[0]})`);
        }
      }
      const lines = ROLES
        .filter((r) => roleHealth[r].names.length > 0)
        .map((r) => {
          const v = roleHealth[r];
          return `  ${r}: ${v.G}G/${v.A}A/${v.R}R — ${v.names.join(", ")}`;
        });
      if (lines.length > 0) {
        channelHealthContext = `\nCROSS-CHANNEL HEALTH (per-channel data from F13 hub this week):\n${lines.join("\n")}\nNote: Cross-channel data is supplementary context. Gate Status and the four primary signal health indicators are the primary diagnostic.`;
      }
    }

    // 4. Compute phase
    const phase = computePhase(week_number, threshold.campaign_duration_weeks);

    // 5. Compute traffic lights
    const demandHealth = computeNumericHealth(
      weekly.signal_3_actual_count,
      threshold.signal_3_threshold_count,
      threshold.signal_3_amber_count,
      threshold.signal_3_red_count,
      phase
    );
    const nurtureHealth = computeNumericHealth(
      weekly.signal_2_actual_pct,
      threshold.signal_2_threshold_pct,
      threshold.signal_2_amber_pct,
      threshold.signal_2_red_pct,
      phase
    );
    const nurtureShareHealth = computeNumericHealth(
      weekly.signal_2b_actual_pct,
      threshold.signal_2b_target_pct ?? 5,
      threshold.signal_2b_amber_pct ?? 3,
      threshold.signal_2b_red_pct ?? 1,
      phase
    );
    const conversionHealth = computeNumericHealth(
      weekly.signal_1_actual_pct,
      threshold.signal_1_threshold_pct,
      threshold.signal_1_amber_pct,
      threshold.signal_1_red_pct,
      phase
    );

<<<<<<< HEAD
=======
    // 5b. Signal 3B (VCR) health — optional, only if data entered
    const vcrHealth: SignalHealth | null =
      weekly.signal_3b_actual_pct !== null
        ? computeNumericHealth(
            weekly.signal_3b_actual_pct,
            threshold.signal_3b_target_pct ?? 70,
            threshold.signal_3b_amber_pct ?? 50,
            threshold.signal_3b_red_pct ?? 30,
            phase
          )
        : null;

    // 5c. Signal 4 (Retention) health — LAG signal, only if data entered
    const retentionHealth: SignalHealth | null =
      weekly.signal_4_actual_pct !== null
        ? computeNumericHealth(
            weekly.signal_4_actual_pct,
            threshold.signal_4_target_pct ?? 15,
            threshold.signal_4_amber_pct ?? 8,
            threshold.signal_4_red_pct ?? 3,
            phase
          )
        : null;

    // Market signal priority context (Sprint 25)
    const marketSignalContext = buildMarketSignalContext(threshold.market_code ?? "MY");

>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
    // 6. Gate Signal Convergence
    // Signal 2B (Share Rate) and Signal 2 (Save Rate) are both Nurture-stage but measured from
    // different audience actions — treated as independent for Gate convergence purposes.
    const gateSignals: SignalForGate[] = [
      {
        name: weekly.signal_2b_label ?? threshold.signal_2b_label ?? "Share Rate",
        health: nurtureShareHealth,
        hasData: weekly.signal_2b_actual_pct !== null,
        priorHealth: (priorWeekly?.signal_2b_health as SignalHealth | null) ?? null,
      },
      {
        name: threshold.signal_2_label ?? "Save Rate",
        health: nurtureHealth,
        hasData: weekly.signal_2_actual_pct !== null,
        priorHealth: (priorWeekly?.nurture_health as SignalHealth | null) ?? null,
      },
      {
        name: threshold.signal_3_label ?? "UGC Volume",
        health: demandHealth,
        hasData: weekly.signal_3_actual_count !== null,
        priorHealth: (priorWeekly?.demand_health as SignalHealth | null) ?? null,
      },
      {
        name: threshold.signal_1_label ?? "Branded Search Lift",
        health: conversionHealth,
        hasData: weekly.signal_1_actual_pct !== null,
        priorHealth: (priorWeekly?.conversion_health as SignalHealth | null) ?? null,
      },
    ];

    const { gate_status, gate_signals_converging, gate_note } = computeGateStatus(
      gateSignals,
      phase
    );

    // 7. Pipeline Risk detection
    const pipelineRisk =
      conversionHealth === "Green" &&
      (demandHealth !== "Green" || nurtureHealth !== "Green") &&
      phase >= 2;

    // 8. Call AI for narrative
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const signalModel = await getModel("model_signal_report", "claude-haiku-4-5-20251001");
    const aiResponse = await anthropic.messages.create({
      model: signalModel,
      max_tokens: 900,
      system: buildSystemPrompt(),
      tools: [SIGNAL_REPORT_TOOL],
      tool_choice: { type: "tool", name: "submit_signal_report" },
      messages: [
        {
          role: "user",
          content: buildUserPrompt(
            week_number,
            threshold.campaign_duration_weeks,
            phase,
            threshold,
            weekly,
            demandHealth,
            nurtureHealth,
            nurtureShareHealth,
            conversionHealth,
<<<<<<< HEAD
=======
            vcrHealth,
            retentionHealth,
>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
            gate_status,
            gate_signals_converging,
            gate_note,
            pipelineRisk,
            campaignName,
            channelHealthContext,
<<<<<<< HEAD
            marketContextSection
=======
            marketContextSection,
            marketSignalContext
>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
          ),
        },
      ],
    });

    // 9. Extract tool use result
    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("AI did not return a tool_use block");
    }
    const result = toolBlock.input as {
      gate_status_label: string;
      narrative: string;
      recommended_actions: string[];
      phase_context: string;
    };
    const gateStatusLabel    = result.gate_status_label   ?? "";
    const narrative          = result.narrative            ?? "";
    const recommendedActions = Array.isArray(result.recommended_actions) ? result.recommended_actions : [];
    const phaseContext       = result.phase_context        ?? "";

    // 10. Save traffic lights + Gate + AI outputs back to signal_weekly_reports
    // ai_narrative prefixed with gate_status_label so it surfaces at the top of the report card
    const { error: updateErr } = await supabase
      .from("signal_weekly_reports")
      .update({
        campaign_phase: phase,
        flags_suppressed: phase === 1,
        demand_health: demandHealth,
        nurture_health: nurtureHealth,
        signal_2b_health: nurtureShareHealth,
        conversion_health: conversionHealth,
<<<<<<< HEAD
=======
        signal_3b_health: vcrHealth,
        signal_4_health: retentionHealth,
>>>>>>> b9b444c (Sprint 25 — SignalIntelligenceSection + client report Campaign Progress)
        gate_status,
        gate_signals_converging,
        gate_note,
        ai_narrative: gateStatusLabel ? `${gateStatusLabel}\n\n${narrative}` : narrative,
        ai_recommended_actions: JSON.stringify(recommendedActions),
        ai_phase_context: phaseContext,
        pipeline_risk_detected: pipelineRisk,
      })
      .eq("id", weekly.id);

    if (updateErr) {
      console.error("Failed to save signal report:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 11. Return full report
    return NextResponse.json({
      week_number,
      campaign_phase: phase,
      flags_suppressed: phase === 1,
      demand_health: demandHealth,
      nurture_health: nurtureHealth,
      nurture_share_health: nurtureShareHealth,
      conversion_health: conversionHealth,
      gate_status,
      gate_signals_converging,
      gate_note,
      pipeline_risk_detected: pipelineRisk,
      ai_gate_status_label: gateStatusLabel,
      ai_narrative: narrative,
      ai_recommended_actions: recommendedActions,
      ai_phase_context: phaseContext,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/signal-report error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
