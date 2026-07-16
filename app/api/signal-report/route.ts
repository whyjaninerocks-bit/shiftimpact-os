// app/api/signal-report/route.ts
// Feature 12 — Signal Intelligence Reporting Module (Sprint 2)
// INTERNAL ONLY — never called from or exposed to Client Interface (/portal/*).
//
// POST /api/signal-report
// Reads signal inputs from signal_weekly_reports, applies threshold rules,
// computes campaign-proportional phase, runs Claude Haiku for AI narrative,
// saves traffic lights + narrative back to signal_weekly_reports.
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
  signal_3_label: string;
  signal_3_threshold_count: number;
  signal_3_amber_count: number;
  signal_3_red_count: number;
  locked: boolean;
}

interface WeeklyRecord {
  id: string;
  signal_1_actual_pct: number | null;
  signal_2_actual_pct: number | null;
  signal_3_actual_count: number | null;
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

// Phase name and context for AI prompt
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
  // Phase 1: no flags
  if (phase === 1) return "Green";
  if (actual === null) return "Green"; // no data = no flag

  if (higherIsBetter) {
    if (actual >= greenThreshold) return "Green";
    if (actual >= amberThreshold) return "Amber";
    return "Red";
  } else {
    // Lower is better (not used currently but available)
    if (actual <= greenThreshold) return "Green";
    if (actual <= amberThreshold) return "Amber";
    return "Red";
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the ShiftImpact OS Signal Intelligence engine — an internal AI tool for strategy leads and Janine.

You analyse weekly campaign signal data across three concurrent funnel stages:
- Demand: measures how well the campaign is building category interest and brand awareness (Signal 3 — UGC volume)
- Nurture: measures how well the campaign is moving people from awareness to active consideration (Signal 2 — content save rate)
- Conversion: measures whether people are moving to active purchase intent (Signal 1 — branded search lift)

CRITICAL RULES:
1. You write for strategy leads who understand the ShiftImpact OS methodology. Be direct, specific, and strategic.
2. Never use motivational language ("great work", "keep it up", etc.)
3. Phase 1 reports always say: "Campaign in baseline phase — signal baselines are being established. No flags generated this week."
4. In Phase 4, all Demand and Nurture recommended actions must be tagged [NEXT CAMPAIGN] — they will not have sufficient time to impact this flight.
5. Always check the cross-stage pattern. The most important diagnostic is Pipeline Risk: Conversion Green + Demand Red/Amber + Nurture Red/Amber = sales cliff in 8-12 weeks post-campaign. Flag it explicitly when detected.
6. Recommended actions must be numbered, specific, and actionable within 48 hours.

OUTPUT FORMAT (JSON):
{
  "narrative": "1-2 paragraphs. Plain language, not code. What the signal combination means for this campaign right now.",
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "phase_context": "One sentence on what this phase means for decision-making."
}`;
}

function buildUserPrompt(
  weekNumber: number,
  durationWeeks: number,
  phase: CampaignPhase,
  threshold: ThresholdRecord,
  weekly: WeeklyRecord,
  demandHealth: SignalHealth,
  nurtureHealth: SignalHealth,
  conversionHealth: SignalHealth,
  pipelineRisk: boolean,
  campaignName: string,
  channelHealthContext: string,   // F16B: cross-channel health from F13 hub
  marketContextSection: string    // F16C: external market variable context
): string {
  const phaseCtx = phaseLabel(phase, durationWeeks, weekNumber);
  const phasePct = Math.round((weekNumber / durationWeeks) * 100);

  return `CAMPAIGN: ${campaignName}
WEEK: ${weekNumber} of ${durationWeeks} (${phasePct}% through campaign)
${phaseCtx}

SIGNAL HEALTH SUMMARY:
- Demand (Signal 3 — ${threshold.signal_3_label}): ${demandHealth}
  Actual: ${weekly.signal_3_actual_count ?? "Not reported"} posts/mentions | Green ≥${threshold.signal_3_threshold_count} | Amber ≥${threshold.signal_3_amber_count} | Red <${threshold.signal_3_amber_count}
- Nurture (Signal 2 — ${threshold.signal_2_label}): ${nurtureHealth}
  Actual: ${weekly.signal_2_actual_pct !== null ? `${weekly.signal_2_actual_pct}%` : "Not reported"} save rate | Green ≥${threshold.signal_2_threshold_pct}% | Amber ≥${threshold.signal_2_amber_pct}% | Red <${threshold.signal_2_amber_pct}%
- Conversion (Signal 1 — ${threshold.signal_1_label}): ${conversionHealth}
  Actual: ${weekly.signal_1_actual_pct !== null ? `${weekly.signal_1_actual_pct}%` : "Not reported"} search lift | Green ≥${threshold.signal_1_threshold_pct}% | Amber ≥${threshold.signal_1_amber_pct}% | Red <${threshold.signal_1_amber_pct}%

${pipelineRisk ? "⚠️ PIPELINE RISK PATTERN DETECTED: Conversion is Green but Demand and/or Nurture are not. This means current conversion activity is drawing down an audience that is not being replenished. Expect a post-campaign sales cliff in 8-12 weeks if not addressed now." : ""}
${weekly.flags_suppressed ? "Note: Flags are suppressed in Phase 1. Baseline only." : ""}
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

    // 2. Load weekly signal inputs
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

    // 3. Load campaign name for context
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name")
      .eq("id", campaign_id)
      .single();
    const campaignName = campaign?.name ?? "Campaign";

    // 3.5. F16C — Load market variable context for this week (optional enrichment)
    // All 6 fields optional — if not saved, marketContextSection is empty and prompt is unchanged.
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

    // 3.6. F16B — Load F13 cross-channel health for this week (optional enrichment)
    // If no channels are set up yet, channelHealthContext is empty and the prompt is unchanged.
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
        .filter(r => roleHealth[r].names.length > 0)
        .map(r => {
          const v = roleHealth[r];
          return `  ${r}: ${v.G}G/${v.A}A/${v.R}R — ${v.names.join(", ")}`;
        });
      if (lines.length > 0) {
        channelHealthContext = `\nCROSS-CHANNEL HEALTH (per-channel data from F13 hub this week):\n${lines.join("\n")}\nNote: Cross-channel data is supplementary context. The three primary signal health indicators above remain the primary diagnostic.`;
      }
    }

    // 4. Compute phase
    const phase = computePhase(week_number, threshold.campaign_duration_weeks);

    // 5. Compute traffic lights
    // Signal 3 (UGC count) → Demand health
    const demandHealth = computeNumericHealth(
      weekly.signal_3_actual_count,
      threshold.signal_3_threshold_count,
      threshold.signal_3_amber_count,
      threshold.signal_3_red_count,
      phase
    );
    // Signal 2 (save rate %) → Nurture health
    const nurtureHealth = computeNumericHealth(
      weekly.signal_2_actual_pct,
      threshold.signal_2_threshold_pct,
      threshold.signal_2_amber_pct,
      threshold.signal_2_red_pct,
      phase
    );
    // Signal 1 (search lift %) → Conversion health
    const conversionHealth = computeNumericHealth(
      weekly.signal_1_actual_pct,
      threshold.signal_1_threshold_pct,
      threshold.signal_1_amber_pct,
      threshold.signal_1_red_pct,
      phase
    );

    // 6. Pipeline Risk detection
    // Conversion Green + (Demand Red/Amber OR Nurture Red/Amber)
    const pipelineRisk =
      conversionHealth === "Green" &&
      (demandHealth !== "Green" || nurtureHealth !== "Green") &&
      phase >= 2;

    // 7. Call AI for narrative (model read from os_settings — change via /settings UI)
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const signalModel = await getModel("model_signal_report", "claude-haiku-4-5-20251001");
    const aiResponse = await anthropic.messages.create({
      model: signalModel,
      max_tokens: 800,
      system: buildSystemPrompt(),
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
            conversionHealth,
            pipelineRisk,
            campaignName,
            channelHealthContext,
            marketContextSection
          ),
        },
      ],
    });

    const rawContent = aiResponse.content[0];
    if (rawContent.type !== "text") {
      throw new Error("Unexpected AI response type");
    }

    // 8. Parse AI JSON output
    let narrative = "";
    let recommendedActions: string[] = [];
    let phaseContext = "";

    try {
      // Strip markdown fences if present
      const cleaned = rawContent.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      narrative = parsed.narrative ?? "";
      recommendedActions = Array.isArray(parsed.recommended_actions)
        ? parsed.recommended_actions
        : [];
      phaseContext = parsed.phase_context ?? "";
    } catch {
      // If JSON parse fails, use raw text as narrative
      narrative = rawContent.text;
      recommendedActions = [];
      phaseContext = "";
    }

    // 9. Save traffic lights + AI outputs back to signal_weekly_reports
    const { error: updateErr } = await supabase
      .from("signal_weekly_reports")
      .update({
        campaign_phase: phase,
        flags_suppressed: phase === 1,
        demand_health: demandHealth,
        nurture_health: nurtureHealth,
        conversion_health: conversionHealth,
        ai_narrative: narrative,
        ai_recommended_actions: JSON.stringify(recommendedActions),
        ai_phase_context: phaseContext,
        pipeline_risk_detected: pipelineRisk,
      })
      .eq("id", weekly.id);

    if (updateErr) {
      console.error("Failed to save signal report:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 10. Return the full report
    return NextResponse.json({
      week_number,
      campaign_phase: phase,
      flags_suppressed: phase === 1,
      demand_health: demandHealth,
      nurture_health: nurtureHealth,
      conversion_health: conversionHealth,
      pipeline_risk_detected: pipelineRisk,
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
