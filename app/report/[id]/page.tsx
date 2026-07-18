// app/report/[id]/page.tsx — Sprint 26C
// PUBLIC — client-facing campaign intelligence report.
//
// Data sources:
//   getCampaign                   — name, client_name, phase
//   getFrameBrief                 — force (objective), primary_kpi
//   getBigIdeaPlatform            — topline_idea, brand_role
//   getSignalThreshold            — targets + labels for actual vs target display
//   getSignalWeeklyReports        — weekly actuals, health, phase, timeline
//   getLatestCampaignReport       — CIR executive summary + findings
//   getConsumerBehaviourStates    — current audience stage + activation direction
//   getLatestConsumerStateReading — consumer journey narrative
//   getAiBrandVisibilityScore     — AI visibility narrative
//   getSocialCurrencyScore        — SCI score + trend + narrative
//
// GOVERNANCE — never exposes:
//   Gate status / gate_status, gate threshold numbers, budget amounts,
//   signal names (S1/S2/S3), state_distribution, velocity_score, stall_note,
//   cstr_vs_prior, eligibility_score, trust_gap_*, priority_action,
//   build_action, SCI dimension scores, signal_pattern_read, confidence_level,
//   CIR confidence ratings, components_used, scopes_resolved.
//
// Client-facing label mapping:
//   Demand → Audience Build | Nurture → Content Engagement | Conversion → Purchase Intent
//   Amber → Building

import { notFound } from "next/navigation";
import {
  getCampaign,
  getFrameBrief,
  getBigIdeaPlatform,
  getSignalThreshold,
  getSignalWeeklyReports,
  getLatestCampaignReport,
  getConsumerBehaviourStates,
  getLatestConsumerStateReading,
  getAiBrandVisibilityScore,
  getSocialCurrencyScore,
} from "@/lib/data";
import type { SignalHealth } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Colour helpers ────────────────────────────────────────────────────────────

function healthLabel(h: SignalHealth | null | undefined): string {
  if (h === "Green") return "On Track";
  if (h === "Amber") return "Building";
  if (h === "Red") return "Needs Attention";
  return "—";
}

function phaseLabel(phase: number | null | undefined): string {
  if (phase === 1) return "Phase 1 — Launch";
  if (phase === 2) return "Phase 2 — Build";
  if (phase === 3) return "Phase 3 — Peak";
  if (phase === 4) return "Phase 4 — Close";
  return "Active";
}

function overallHealth(healths: (SignalHealth | null | undefined)[]): SignalHealth {
  const valid = healths.filter(Boolean) as SignalHealth[];
  if (valid.includes("Red")) return "Red";
  if (valid.includes("Amber")) return "Amber";
  return "Green";
}

function healthDotBg(h: SignalHealth | null | undefined): string {
  if (h === "Green") return "bg-emerald-500";
  if (h === "Amber") return "bg-amber-400";
  if (h === "Red") return "bg-red-500";
  return "bg-slate-300";
}

function healthIconBg(h: SignalHealth | null | undefined): string {
  if (h === "Green") return "bg-emerald-50";
  if (h === "Amber") return "bg-amber-50";
  if (h === "Red") return "bg-red-50";
  return "bg-slate-50";
}

function healthBadge(h: SignalHealth | null | undefined): string {
  if (h === "Green") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (h === "Amber") return "bg-amber-50 border-amber-200 text-amber-700";
  if (h === "Red") return "bg-red-50 border-red-200 text-red-700";
  return "bg-slate-50 border-slate-200 text-slate-500";
}

function overallBanner(h: SignalHealth): string {
  if (h === "Green") return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  if (h === "Amber") return "bg-amber-400/15 border-amber-400/30 text-amber-300";
  return "bg-red-500/15 border-red-500/30 text-red-300";
}

// ── Consumer journey funnel ───────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { num: 1, label: "Unaware",     desc: "Not yet reached by the brand" },
  { num: 2, label: "Aware",       desc: "Brand is on their radar" },
  { num: 3, label: "Interested",  desc: "Actively exploring the brand" },
  { num: 4, label: "Considering", desc: "Weighing a purchase decision" },
  { num: 5, label: "Purchasing",  desc: "Converting to first buy" },
  { num: 6, label: "Loyal",       desc: "Repeat engagement secured" },
];

function stagePill(stageNum: number, current: number | null): string {
  if (stageNum === current)
    return "bg-slate-900 text-white border-slate-900 font-bold";
  if (current !== null && stageNum < current)
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-400 border-slate-200";
}

// ── Text / format helpers ─────────────────────────────────────────────────────

function toParas(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

function stripGateStatusLabel(narrative: string): string {
  const lines = narrative.split("\n");
  if (lines[0]?.startsWith("Gate Status:")) {
    return lines.slice(1).join("\n").trimStart();
  }
  return narrative;
}

function stripActionNumber(action: string): string {
  return action.replace(/^\d+\.\s*/, "");
}

function fmt(val: number | null | undefined, suffix = "%"): string {
  if (val === null || val === undefined) return "—";
  return `${val}${suffix}`;
}

function fmtTarget(val: number | null | undefined, suffix = "%"): string {
  if (val === null || val === undefined) return "";
  return `Target: ${val}${suffix}`;
}

function formatWeekOf(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  try {
    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return ""; }
}

// SCI trend colour
function sciTrendColor(trend: string | null | undefined): string {
  if (trend === "Improving") return "text-emerald-600";
  if (trend === "Declining") return "text-red-600";
  return "text-amber-600";
}

function sciTrendBg(trend: string | null | undefined): string {
  if (trend === "Improving") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (trend === "Declining") return "bg-red-50 border-red-200 text-red-700";
  return "bg-amber-50 border-amber-200 text-amber-700";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientReportPage({
  params,
}: {
  params: { id: string };
}) {
  const [
    campaign, frame, bip, threshold,
    signalReports, cir,
    behaviourStates, consumerReading,
    aiVisibility, socialCurrency,
  ] = await Promise.all([
    getCampaign(params.id),
    getFrameBrief(params.id),
    getBigIdeaPlatform(params.id),
    getSignalThreshold(params.id),
    getSignalWeeklyReports(params.id),
    getLatestCampaignReport(params.id),
    getConsumerBehaviourStates(params.id),
    getLatestConsumerStateReading(params.id),
    getAiBrandVisibilityScore(params.id),
    getSocialCurrencyScore(params.id),
  ]);

  if (!campaign) notFound();

  const latestSignal = signalReports[0] ?? null;

  let weeklyActions: string[] = [];
  if (latestSignal?.ai_recommended_actions && !cir?.findings.length) {
    try { weeklyActions = JSON.parse(latestSignal.ai_recommended_actions); }
    catch { weeklyActions = [latestSignal.ai_recommended_actions]; }
  }

  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const overall = latestSignal
    ? overallHealth([
        latestSignal.demand_health,
        latestSignal.nurture_health,
        latestSignal.conversion_health,
      ])
    : null;

  const cleanNarrative = latestSignal?.ai_narrative
    ? toParas(stripGateStatusLabel(latestSignal.ai_narrative))
    : [];
  const cleanExecSummary = cir?.executive_summary ? toParas(cir.executive_summary) : [];

  // ── Primary signal rows ───────────────────────────────────────────────────
  const primarySignals = [
    {
      label: "Audience Build",
      sub: threshold?.signal_3_label ?? "Content volume & audience reach",
      health: latestSignal?.demand_health as SignalHealth,
      actual:
        latestSignal?.signal_3_actual_count !== null &&
        latestSignal?.signal_3_actual_count !== undefined
          ? `${latestSignal.signal_3_actual_count} posts`
          : null,
      target:
        threshold?.signal_3_threshold_count !== undefined
          ? `Target: ${threshold.signal_3_threshold_count} posts`
          : null,
      businessNote: "UGC volume is a direct proxy for word-of-mouth reach.",
    },
    {
      label: "Content Engagement",
      sub: threshold?.signal_2_label ?? "Content save rate",
      health: latestSignal?.nurture_health as SignalHealth,
      actual: fmt(latestSignal?.signal_2_actual_pct),
      target: fmtTarget(threshold?.signal_2_threshold_pct),
      businessNote: "Save rate signals intent to return — a strong indicator of future conversion.",
    },
    {
      label: "Purchase Intent",
      sub: threshold?.signal_1_label ?? "Branded search lift",
      health: latestSignal?.conversion_health as SignalHealth,
      actual: fmt(latestSignal?.signal_1_actual_pct),
      target: fmtTarget(threshold?.signal_1_threshold_pct),
      businessNote: "Branded search lift is your Share of Voice proxy. Research shows SOV ≈ SOM over time.",
    },
  ];

  // ── Supplementary signals ─────────────────────────────────────────────────
  const supplementarySignals = [
    latestSignal?.signal_2b_actual_pct !== null && latestSignal?.signal_2b_actual_pct !== undefined
      ? {
          label: latestSignal.signal_2b_label ?? "Content Share Rate",
          actual: fmt(latestSignal.signal_2b_actual_pct),
          target: fmtTarget(threshold?.signal_2b_target_pct),
          health: latestSignal.signal_2b_health as SignalHealth,
          note: "Content amplification",
        }
      : null,
    latestSignal?.signal_3b_actual_pct !== null && latestSignal?.signal_3b_actual_pct !== undefined
      ? {
          label: latestSignal.signal_3b_label ?? "Video Completion Rate",
          actual: fmt(latestSignal.signal_3b_actual_pct),
          target: fmtTarget(threshold?.signal_3b_target_pct),
          health: latestSignal.signal_3b_health as SignalHealth,
          note: "Demand signal",
        }
      : null,
    latestSignal?.signal_4_actual_pct !== null && latestSignal?.signal_4_actual_pct !== undefined
      ? {
          label: latestSignal.signal_4_label ?? "Return Visits",
          actual: fmt(latestSignal.signal_4_actual_pct),
          target: fmtTarget(threshold?.signal_4_target_pct),
          health: latestSignal.signal_4_health as SignalHealth,
          note: "Retention — lags campaign",
        }
      : null,
  ].filter(Boolean) as { label: string; actual: string; target: string; health: SignalHealth; note: string }[];

  // ── Consumer journey ──────────────────────────────────────────────────────
  const latestBehaviour = behaviourStates[0] ?? null;
  const currentStageNum = latestBehaviour?.diagnosed_state ?? null;
  const consumerNarrative = consumerReading?.ai_narrative
    ? toParas(consumerReading.ai_narrative)
    : [];
  const hasStallAlert = consumerReading?.state_stall_flag ?? false;

  // ── AI Visibility + Social Currency ──────────────────────────────────────
  const aiVisNarrative = aiVisibility?.ai_narrative ? toParas(aiVisibility.ai_narrative) : [];
  const sciNarrative = socialCurrency?.ai_narrative ? toParas(socialCurrency.ai_narrative) : [];

  const weekDate = formatWeekOf(latestSignal?.week_of);
  const campPhase = latestSignal?.campaign_phase;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Dark header ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm tracking-tight">
                ShiftImpact <span className="text-slate-400 font-normal">OS</span>
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Campaign Intelligence Report
              </span>
            </div>
            <span className="text-xs text-slate-500">{reportDate}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight mb-1">
                {campaign.name}
              </h1>
              <p className="text-slate-400 text-sm">{campaign.client_name}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
              {latestSignal && (
                <span className="text-xs text-slate-400 font-medium">
                  Week {latestSignal.week_number}{weekDate ? ` · ${weekDate}` : ""}
                </span>
              )}
              <div className="flex items-center gap-2">
                {campPhase && (
                  <span className="text-xs text-slate-400 font-medium">
                    {phaseLabel(campPhase)}
                  </span>
                )}
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                  {campaign.phase ?? "Active"}
                </span>
              </div>
            </div>
          </div>

          {overall && (
            <div className={`mt-5 flex items-center gap-3 px-4 py-3 rounded-lg border ${overallBanner(overall)}`}>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthDotBg(overall)}`} />
              <span className="text-sm font-semibold">Campaign is {healthLabel(overall)}</span>
              {latestSignal?.pipeline_risk_detected && (
                <span className="ml-1 text-xs font-medium text-amber-300">· Risk factors flagged</span>
              )}
              <span className="text-slate-600 text-xs ml-auto">
                {signalReports.length} week{signalReports.length !== 1 ? "s" : ""} tracked
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-7 space-y-5">

        {/* ── Campaign Objective ────────────────────────────────────────── */}
        {frame?.force && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">
              Campaign Objective
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{frame.force}</p>
            {frame.primary_kpi && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Primary KPI</span>
                <span className="text-xs text-slate-600 font-semibold">{frame.primary_kpi}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Campaign Idea ─────────────────────────────────────────────── */}
        {bip?.topline_idea && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">
              Campaign Idea
            </p>
            <blockquote className="text-base font-semibold text-slate-900 leading-snug border-l-[3px] border-slate-900 pl-4">
              {bip.topline_idea}
            </blockquote>
            {bip?.brand_role && (
              <p className="text-xs text-slate-400 mt-3">
                <span className="font-medium text-slate-500">Brand role: </span>{bip.brand_role}
              </p>
            )}
          </div>
        )}

        {/* ── This Week's Performance ───────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              This Week's Performance
            </p>
            {latestSignal && (
              <span className="text-xs text-slate-400">
                Week {latestSignal.week_number}{weekDate ? ` · ${weekDate}` : ""}
              </span>
            )}
          </div>

          {!latestSignal ? (
            <div className="px-6 py-5">
              <p className="text-sm text-slate-400">No campaign data recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {primarySignals.map(({ label, sub, health, actual, target, businessNote }) => (
                  <div key={label} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${healthIconBg(health)}`}>
                          <span className={`w-3 h-3 rounded-full ${healthDotBg(health)}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {actual && actual !== "—" && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">{actual}</p>
                            {target && <p className="text-xs text-slate-400">{target}</p>}
                          </div>
                        )}
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${healthBadge(health)}`}>
                          {healthLabel(health)}
                        </span>
                      </div>
                    </div>
                    {/* Business implication note */}
                    <p className="text-xs text-slate-400 mt-2 ml-[52px] italic">{businessNote}</p>
                  </div>
                ))}
              </div>

              {supplementarySignals.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wide">
                    Additional Signals
                  </p>
                  <div className="space-y-2.5">
                    {supplementarySignals.map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${healthDotBg(s.health)}`} />
                          <span className="text-xs font-semibold text-slate-700">{s.label}</span>
                          <span className="text-xs text-slate-400">· {s.note}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-bold text-slate-700">{s.actual}</span>
                          {s.target && <span className="text-xs text-slate-400">{s.target}</span>}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${healthBadge(s.health)}`}>
                            {healthLabel(s.health)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {signalReports.length > 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-3">Weekly timeline</p>
                  <div className="flex items-end gap-3 flex-wrap">
                    {[...signalReports]
                      .sort((a, b) => a.week_number - b.week_number)
                      .map((r) => {
                        const healths = [
                          r.demand_health as SignalHealth,
                          r.nurture_health as SignalHealth,
                          r.conversion_health as SignalHealth,
                        ].filter(Boolean);
                        const wk: SignalHealth = healths.includes("Red") ? "Red"
                          : healths.includes("Amber") ? "Amber" : "Green";
                        const isLatest = r.week_number === latestSignal.week_number;
                        return (
                          <div key={r.id} className="flex flex-col items-center gap-1">
                            <span
                              className={`rounded-full transition-all ${
                                isLatest ? "w-4 h-4 ring-2 ring-slate-400 ring-offset-2 ring-offset-slate-50" : "w-3 h-3"
                              } ${r.flags_suppressed ? "bg-slate-200" : healthDotBg(wk)}`}
                              title={`Week ${r.week_number}${r.flags_suppressed ? " (baseline)" : ` — ${healthLabel(wk)}`}`}
                            />
                            <span className={`text-xs font-mono ${isLatest ? "text-slate-700 font-bold" : "text-slate-300"}`}>
                              W{r.week_number}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Consumer Journey Stage Gate ───────────────────────────────── */}
        {(latestBehaviour || consumerNarrative.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Consumer Journey
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Where your audience sits in the path to purchase
              </p>
            </div>

            <div className="px-6 py-5">
              {/* Funnel stage visual */}
              <div className="flex items-stretch gap-1 mb-5">
                {FUNNEL_STAGES.map((stage, idx) => (
                  <div key={stage.num} className="flex items-center flex-1 min-w-0">
                    <div className={`flex-1 px-1.5 py-2 rounded-lg border text-center transition-all ${stagePill(stage.num, currentStageNum)}`}>
                      <p className="text-xs font-semibold leading-tight truncate">
                        {stage.label}
                      </p>
                    </div>
                    {idx < FUNNEL_STAGES.length - 1 && (
                      <span className={`text-xs mx-0.5 shrink-0 ${
                        currentStageNum !== null && idx + 1 < currentStageNum
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}>›</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Current stage detail */}
              {latestBehaviour && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                    <p className="text-sm font-bold text-slate-900">
                      Current Stage: {latestBehaviour.state_name}
                    </p>
                    {latestBehaviour.week_number && (
                      <span className="text-xs text-slate-400 ml-auto">
                        Week {latestBehaviour.week_number}
                      </span>
                    )}
                  </div>
                  {currentStageNum && FUNNEL_STAGES[currentStageNum - 1] && (
                    <p className="text-xs text-slate-500 ml-4">
                      {FUNNEL_STAGES[currentStageNum - 1].desc}
                    </p>
                  )}
                </div>
              )}

              {/* Stall alert */}
              {hasStallAlert && (
                <div className="mb-4 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-amber-500 text-sm shrink-0 mt-0.5">⚠</span>
                  <p className="text-xs text-amber-700 font-medium">
                    Momentum Alert: Audience progression has slowed. Review activation strategy to re-accelerate movement through the funnel.
                  </p>
                </div>
              )}

              {/* Consumer narrative */}
              {consumerNarrative.length > 0 && (
                <div className="space-y-2.5 mb-4">
                  {consumerNarrative.map((para, i) => (
                    <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
                  ))}
                </div>
              )}

              {/* Activation direction — what's needed to advance */}
              {latestBehaviour?.activation_direction && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">
                    What's Needed to Advance
                  </p>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {latestBehaviour.activation_direction}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Brand Intelligence: SOV × AI Visibility × Social Currency ── */}
        {(aiVisibility || socialCurrency) && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Brand Intelligence
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Share of voice, AI visibility, and social currency — the pillars of long-term market share
              </p>
            </div>

            <div className="divide-y divide-slate-100">

              {/* SOV = SOM context — always shown, tied to Signal 1 */}
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    SOV
                  </span>
                  <p className="text-sm font-semibold text-slate-800">Share of Voice → Share of Market</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed ml-8">
                  Branded search lift tracks how often consumers seek your brand specifically — this is your digital share of voice. Research shows brands that grow their SOV above their current market share consistently win revenue over a 6–12 month horizon. This week's branded search performance is a leading indicator of where your market share is heading.
                </p>
                {latestSignal?.signal_1_actual_pct !== null &&
                  latestSignal?.signal_1_actual_pct !== undefined && (
                  <div className="mt-2 ml-8 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Branded search lift this week:</span>
                    <span className={`text-xs font-bold ${
                      (latestSignal?.conversion_health as SignalHealth) === "Green" ? "text-emerald-600" :
                      (latestSignal?.conversion_health as SignalHealth) === "Amber" ? "text-amber-600" :
                      "text-red-600"
                    }`}>{latestSignal.signal_1_actual_pct}%</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${healthBadge(latestSignal?.conversion_health as SignalHealth)}`}>
                      {healthLabel(latestSignal?.conversion_health as SignalHealth)}
                    </span>
                  </div>
                )}
              </div>

              {/* AI Visibility */}
              {aiVisibility && (
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0 leading-none">
                        AI
                      </span>
                      <p className="text-sm font-semibold text-slate-800">AI Brand Visibility</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {aiVisibility.cep_count > 0 && (
                        <span className="text-xs text-slate-500">
                          {aiVisibility.cep_count} consumer entry {aiVisibility.cep_count === 1 ? "point" : "points"}
                        </span>
                      )}
                      {aiVisibility.information_consistency_score !== null && (
                        <span className="text-xs font-bold text-slate-700 ml-1">
                          {aiVisibility.information_consistency_score}% consistent
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 ml-8 mb-2 italic">
                    AI tools like ChatGPT and Perplexity now influence discovery. Brands with higher AI visibility win a new form of share of voice — before a consumer even searches.
                  </p>
                  {aiVisNarrative.length > 0 && (
                    <div className="ml-8 space-y-2">
                      {aiVisNarrative.map((para, i) => (
                        <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Social Currency */}
              {socialCurrency && (
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        SCI
                      </span>
                      <p className="text-sm font-semibold text-slate-800">Social Currency Index</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {socialCurrency.sci_score !== null && (
                        <span className="text-sm font-bold text-slate-800">
                          {socialCurrency.sci_score}<span className="text-xs font-normal text-slate-400">/100</span>
                        </span>
                      )}
                      {socialCurrency.trend_direction && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sciTrendBg(socialCurrency.trend_direction)}`}>
                          {socialCurrency.trend_direction}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 ml-8 mb-2 italic">
                    How much your content earns genuine sharing and conversation — a direct driver of organic reach and word-of-mouth that multiplies paid media efficiency.
                  </p>
                  {sciNarrative.length > 0 && (
                    <div className="ml-8 space-y-2">
                      {sciNarrative.map((para, i) => (
                        <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CIR Executive Summary ─────────────────────────────────────── */}
        {cleanExecSummary.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Intelligence Summary
              </p>
              {cir && cir.report_week > 0 && (
                <span className="text-xs text-slate-400">Week {cir.report_week}</span>
              )}
            </div>
            <div className="space-y-3">
              {cleanExecSummary.map((para, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: weekly AI narrative */}
        {!cir?.executive_summary && cleanNarrative.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Campaign Health Read
              </p>
              {latestSignal?.week_number && (
                <span className="text-xs text-slate-400">Week {latestSignal.week_number}</span>
              )}
            </div>
            <div className="space-y-3">
              {cleanNarrative.map((para, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
              ))}
            </div>
            {latestSignal?.ai_phase_context && (
              <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100 italic">
                {latestSignal.ai_phase_context}
              </p>
            )}
          </div>
        )}

        {/* ── Intelligence Findings (CIR) ───────────────────────────────── */}
        {cir && cir.findings.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Intelligence Findings
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {cir.findings.map((f, i) => (
                <div key={f.query_id || i} className="px-6 py-5">
                  <div className="flex items-start gap-3.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{f.headline}</p>
                      {f.context && (
                        <p className="text-sm text-slate-600 leading-relaxed">{f.context}</p>
                      )}
                      {f.implication && (
                        <p className="text-sm text-slate-500 italic leading-relaxed">{f.implication}</p>
                      )}
                      {f.recommendation && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                          <p className="text-sm text-slate-800 leading-relaxed">
                            <span className="font-semibold">Recommendation: </span>
                            {f.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: weekly recommended actions */}
        {weeklyActions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Recommended Actions
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {weeklyActions.map((a, i) => (
                <div key={i} className="px-6 py-4 flex gap-3.5">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {stripActionNumber(a)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 pb-6 border-t border-slate-200">
          <span className="text-xs text-slate-400">
            Powered by <span className="font-medium text-slate-500">ShiftImpact OS</span>
          </span>
          <span className="text-xs text-slate-400">
            Confidential · Signal-led campaign intelligence
          </span>
        </div>

      </div>
    </div>
  );
}
