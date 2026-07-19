// app/report/[id]/page.tsx — Sprint 27
// PUBLIC — client-facing campaign intelligence report.
//
// Sprint 27 additions over Sprint 26C:
//   - Campaign week progress bar in header (Week N of Total, weeks remaining)
//   - Phase Context callout from ai_phase_context (what to expect this phase)
//   - Per-signal progress bars showing actual vs target as visual fill
//   - Gap-to-close statements ("Need 20 more posts", "1.0% away from target")
//   - Signal convergence summary ("2 of 3 signals on track")
//   - Business goal framing per signal with on-track / gap language
//   - Supplementary signals also get gap statements
//
// GOVERNANCE — never exposes:
//   Gate status / gate_status, gate threshold numbers, gate_signals_converging,
//   signal names (S1/S2/S3), state_distribution, velocity_score, stall_note,
//   cstr_vs_prior, eligibility_score, trust_gap_*, priority_action,
//   build_action, SCI dimension scores, signal_pattern_read, confidence_level,
//   CIR confidence ratings, components_used, scopes_resolved, pipeline_risk_label,
//   amber/red threshold values.

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

// ── Colour / label helpers ────────────────────────────────────────────────────

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

// ── Progress helpers ──────────────────────────────────────────────────────────

/** Returns 0–100 capped fill percentage for progress bar. */
function progressPct(actual: number | null | undefined, target: number | null | undefined): number {
  if (actual === null || actual === undefined || !target) return 0;
  return Math.min(Math.round((actual / target) * 100), 100);
}

/** "20 posts to target" or "Exceeding target by 3 posts" */
function gapCount(actual: number | null | undefined, target: number | null | undefined, unit = "posts"): string {
  if (actual === null || actual === undefined || !target) return "";
  if (actual >= target) {
    const over = actual - target;
    return `Exceeding target by ${over} ${unit}`;
  }
  return `${target - actual} ${unit} to target`;
}

/** "1.0% to target" or "Exceeding target by 0.7%" */
function gapPct(actual: number | null | undefined, target: number | null | undefined, suffix = "%"): string {
  if (actual === null || actual === undefined || !target) return "";
  if (actual >= target) {
    const over = (actual - target).toFixed(1);
    return `Exceeding target by ${over}${suffix}`;
  }
  const gap = (target - actual).toFixed(1);
  return `${gap}${suffix} to target`;
}

function progressBarColor(h: SignalHealth | null | undefined, pct: number): string {
  if (pct >= 100) return "bg-emerald-400";
  if (h === "Red") return "bg-red-400";
  if (h === "Amber") return "bg-amber-400";
  return "bg-emerald-400";
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

function formatWeekOf(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  try {
    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return ""; }
}

function sciTrendBg(trend: string | null | undefined): string {
  if (trend === "Improving") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (trend === "Declining") return "bg-red-50 border-red-200 text-red-700";
  return "bg-amber-50 border-amber-200 text-amber-700";
}

/**
 * Returns true only if activation_direction is safe for client eyes.
 * Suppresses text that contains internal operational instructions,
 * tool references, or data-collection language.
 */
function isClientSafeDirection(text: string | null | undefined): boolean {
  if (!text || text.trim().length < 10) return false;
  const blocked = [
    "signal intelligence",
    "module",
    "data point",
    "metrics for week",
    "apify",
    "capture",
    "run the",
    "without these",
    "no actionable strategy",
    "cannot be determined",
    "immediately to identify",
    "measurement gap",
  ];
  const lower = text.toLowerCase();
  return !blocked.some((term) => lower.includes(term));
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
  if (latestSignal?.ai_recommended_actions) {
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

  // ── Campaign duration / progress ─────────────────────────────────────────
  const totalWeeks = threshold?.campaign_duration_weeks ?? null;
  const currentWeek = latestSignal?.week_number ?? 0;
  const weeksRemaining = totalWeeks ? totalWeeks - currentWeek : null;
  const campaignPct = totalWeeks && currentWeek
    ? Math.round((currentWeek / totalWeeks) * 100)
    : null;

  // ── Signal convergence summary (client-safe — count only, no gate label) ─
  const primaryHealths = latestSignal
    ? [latestSignal.demand_health, latestSignal.nurture_health, latestSignal.conversion_health]
    : [];
  const signalsOnTrack = primaryHealths.filter((h) => h === "Green").length;
  const totalPrimarySignals = primaryHealths.filter(Boolean).length;

  // ── Primary signal rows ─────────────────────────────────────────────────
  const s1Actual = latestSignal?.signal_1_actual_pct;
  const s1Target = threshold?.signal_1_threshold_pct;
  const s2Actual = latestSignal?.signal_2_actual_pct;
  const s2Target = threshold?.signal_2_threshold_pct;
  const s3Actual = latestSignal?.signal_3_actual_count;
  const s3Target = threshold?.signal_3_threshold_count;

  const primarySignals = [
    {
      label: "Audience Build",
      sub: "Organic brand content created by consumers this week",
      health: latestSignal?.demand_health as SignalHealth,
      actual: s3Actual !== null && s3Actual !== undefined ? `${s3Actual} posts` : null,
      target: s3Target !== undefined ? `${s3Target} posts` : null,
      pct: progressPct(s3Actual, s3Target),
      gap: gapCount(s3Actual, s3Target, "posts"),
      businessNote: "Consumer-created content is the most credible form of brand reach — it grows your audience without additional media spend and signals genuine product affinity.",
      goalContext: s3Target
        ? `Weekly target: ${s3Target} pieces of organic brand content`
        : null,
    },
    {
      label: "Content Engagement",
      sub: "Audience intent — how many people saved your content to return to",
      health: latestSignal?.nurture_health as SignalHealth,
      actual: fmt(s2Actual),
      target: s2Target !== undefined ? `${s2Target}%` : null,
      pct: progressPct(s2Actual, s2Target),
      gap: gapPct(s2Actual, s2Target),
      businessNote: "Save rate separates passive viewers from active buyers — people who bookmark content to come back later convert at 3–4× the rate of casual engagers.",
      goalContext: s2Target
        ? `Weekly target: ${s2Target}% of viewers save the content`
        : null,
    },
    {
      label: "Purchase Intent",
      sub: "Consumers actively seeking the brand — your share of search",
      health: latestSignal?.conversion_health as SignalHealth,
      actual: fmt(s1Actual),
      target: s1Target !== undefined ? `${s1Target}%` : null,
      pct: progressPct(s1Actual, s1Target),
      gap: gapPct(s1Actual, s1Target),
      businessNote: "When consumers search for your brand by name, they are one step from purchase. This signal also tracks Share of Voice — brands that grow SOV above their market share consistently win revenue over 6–12 months.",
      goalContext: s1Target
        ? `Weekly target: ${s1Target}% lift in branded searches vs campaign baseline`
        : null,
    },
  ];

  // ── Supplementary signals ─────────────────────────────────────────────────
  const s2bActual = latestSignal?.signal_2b_actual_pct;
  const s2bTarget = threshold?.signal_2b_target_pct;
  const s3bActual = latestSignal?.signal_3b_actual_pct;
  const s3bTarget = threshold?.signal_3b_target_pct;
  const s4Actual = latestSignal?.signal_4_actual_pct;
  const s4Target = threshold?.signal_4_target_pct;

  const supplementarySignals = [
    s2bActual !== null && s2bActual !== undefined
      ? {
          label: latestSignal!.signal_2b_label ?? "Content Share Rate",
          actual: fmt(s2bActual),
          target: s2bTarget !== undefined ? `Target: ${s2bTarget}%` : null,
          gap: gapPct(s2bActual, s2bTarget),
          pct: progressPct(s2bActual, s2bTarget),
          health: latestSignal!.signal_2b_health as SignalHealth,
          note: "Content amplification — how far your content travels beyond initial audience",
        }
      : null,
    s3bActual !== null && s3bActual !== undefined
      ? {
          label: latestSignal!.signal_3b_label ?? "Video Completion Rate",
          actual: fmt(s3bActual),
          target: s3bTarget !== undefined ? `Target: ${s3bTarget}%` : null,
          gap: gapPct(s3bActual, s3bTarget),
          pct: progressPct(s3bActual, s3bTarget),
          health: latestSignal!.signal_3b_health as SignalHealth,
          note: "Audience attention quality — are they watching or scrolling past?",
        }
      : null,
    s4Actual !== null && s4Actual !== undefined
      ? {
          label: latestSignal!.signal_4_label ?? "Return Visits",
          actual: fmt(s4Actual),
          target: s4Target !== undefined ? `Target: ${s4Target}%` : null,
          gap: gapPct(s4Actual, s4Target),
          pct: progressPct(s4Actual, s4Target),
          health: latestSignal!.signal_4_health as SignalHealth,
          note: "Retention — lags campaign activity by 2–4 weeks",
        }
      : null,
  ].filter(Boolean) as {
    label: string; actual: string; target: string | null; gap: string; pct: number;
    health: SignalHealth; note: string;
  }[];

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
                {latestSignal?.campaign_phase && (
                  <span className="text-xs text-slate-400 font-medium">
                    {phaseLabel(latestSignal.campaign_phase)}
                  </span>
                )}
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                  {campaign.phase ?? "Active"}
                </span>
              </div>
            </div>
          </div>

          {/* Overall health banner */}
          {overall && (
            <div className={`mt-5 flex items-center gap-3 px-4 py-3 rounded-lg border ${overallBanner(overall)}`}>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthDotBg(overall)}`} />
              <span className="text-sm font-semibold">Campaign is {healthLabel(overall)}</span>
              {totalPrimarySignals > 0 && (
                <span className="text-xs font-medium opacity-75">
                  · {signalsOnTrack} of {totalPrimarySignals} signals on track
                </span>
              )}
            </div>
          )}

          {/* Campaign week progress bar */}
          {campaignPct !== null && totalWeeks && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Campaign Progress</span>
                <span>
                  Week {currentWeek} of {totalWeeks}
                  {weeksRemaining !== null && weeksRemaining > 0 && (
                    <span className="text-slate-500"> · {weeksRemaining} week{weeksRemaining !== 1 ? "s" : ""} remaining</span>
                  )}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/50 rounded-full transition-all"
                  style={{ width: `${campaignPct}%` }}
                />
              </div>
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
                <span className="text-xs text-slate-700 font-semibold">{frame.primary_kpi}</span>
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
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                This Week's Performance
              </p>
              {totalPrimarySignals > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {signalsOnTrack} of {totalPrimarySignals} key signals on track
                  {signalsOnTrack < totalPrimarySignals && ` · ${totalPrimarySignals - signalsOnTrack} need${totalPrimarySignals - signalsOnTrack === 1 ? "s" : ""} attention`}
                </p>
              )}
            </div>
            {latestSignal && (
              <span className="text-xs text-slate-400 shrink-0">
                Week {latestSignal.week_number}{weekDate ? ` · ${weekDate}` : ""}
              </span>
            )}
          </div>

          {/* Phase context callout */}
          {latestSignal?.ai_phase_context && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-start gap-3">
              <span className="shrink-0 text-slate-400 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  {phaseLabel(latestSignal.campaign_phase)}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">{latestSignal.ai_phase_context}</p>
              </div>
            </div>
          )}

          {!latestSignal ? (
            <div className="px-6 py-5">
              <p className="text-sm text-slate-400">No campaign data recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {primarySignals.map(({ label, sub, health, actual, target, pct, gap, businessNote, goalContext }) => (
                  <div key={label} className="px-6 py-5">
                    {/* Signal header row */}
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${healthIconBg(health)}`}>
                          <span className={`w-3 h-3 rounded-full ${healthDotBg(health)}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 ${healthBadge(health)}`}>
                        {healthLabel(health)}
                      </span>
                    </div>

                    {/* Goal context line */}
                    {goalContext && (
                      <p className="text-xs text-slate-400 ml-[52px] mb-2">{goalContext}</p>
                    )}

                    {/* Progress bar + numbers */}
                    {actual && actual !== "—" && (
                      <div className="ml-[52px]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-slate-900 leading-none">{actual}</span>
                            {target && <span className="text-xs text-slate-400">/ {target} target</span>}
                          </div>
                          {pct > 0 && (
                            <span className={`text-xs font-semibold ${pct >= 100 ? "text-emerald-600" : health === "Red" ? "text-red-600" : "text-amber-600"}`}>
                              {pct}%
                            </span>
                          )}
                        </div>
                        {target && (
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div
                              className={`h-full rounded-full transition-all ${progressBarColor(health, pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                        {gap && (
                          <p className={`text-xs font-medium ${pct >= 100 ? "text-emerald-600" : "text-slate-500"}`}>
                            {gap}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Business context */}
                    <p className="text-xs text-slate-400 mt-3 ml-[52px] leading-relaxed border-l-2 border-slate-100 pl-3">
                      {businessNote}
                    </p>
                  </div>
                ))}
              </div>

              {/* Supplementary signals */}
              {supplementarySignals.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-wide">
                    Additional Signals
                  </p>
                  <div className="space-y-4">
                    {supplementarySignals.map((s) => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${healthDotBg(s.health)}`} />
                            <span className="text-xs font-semibold text-slate-700">{s.label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-slate-800">{s.actual}</span>
                            {s.target && <span className="text-xs text-slate-400">{s.target}</span>}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${healthBadge(s.health)}`}>
                              {healthLabel(s.health)}
                            </span>
                          </div>
                        </div>
                        {s.target && (
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
                            <div
                              className={`h-full rounded-full ${progressBarColor(s.health, s.pct)}`}
                              style={{ width: `${s.pct}%` }}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-400">{s.note}</p>
                          {s.gap && (
                            <p className={`text-xs font-medium ${s.pct >= 100 ? "text-emerald-600" : "text-slate-500"}`}>
                              {s.gap}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly timeline */}
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
              {/* Funnel visual */}
              <div className="flex items-stretch gap-1 mb-5">
                {FUNNEL_STAGES.map((stage, idx) => (
                  <div key={stage.num} className="flex items-center flex-1 min-w-0">
                    <div className={`flex-1 px-1.5 py-2 rounded-lg border text-center transition-all ${stagePill(stage.num, currentStageNum)}`}>
                      <p className="text-xs font-semibold leading-tight truncate">{stage.label}</p>
                    </div>
                    {idx < FUNNEL_STAGES.length - 1 && (
                      <span className={`text-xs mx-0.5 shrink-0 ${currentStageNum !== null && idx + 1 < currentStageNum ? "text-emerald-400" : "text-slate-300"}`}>
                        ›
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {latestBehaviour && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                    <p className="text-sm font-bold text-slate-900">
                      Current Stage: {latestBehaviour.state_name}
                    </p>
                  </div>
                  {currentStageNum && FUNNEL_STAGES[currentStageNum - 1] && (
                    <p className="text-xs text-slate-500 ml-4">{FUNNEL_STAGES[currentStageNum - 1].desc}</p>
                  )}
                </div>
              )}

              {hasStallAlert && (
                <div className="mb-4 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-amber-500 text-sm shrink-0 mt-0.5">⚠</span>
                  <p className="text-xs text-amber-700 font-medium">
                    Audience momentum has plateaued — the brand is not advancing through the purchase funnel at the expected rate. Focus this week should shift to re-engagement and conversion activation.
                  </p>
                </div>
              )}

              {consumerNarrative.length > 0 && (
                <div className="space-y-2.5 mb-4">
                  {consumerNarrative.map((para, i) => (
                    <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
                  ))}
                </div>
              )}

              {/* Only show strategic direction — suppress internal operational instructions */}
              {isClientSafeDirection(latestBehaviour?.activation_direction) && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">
                    Strategic Priority to Advance
                  </p>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {latestBehaviour!.activation_direction}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Brand Intelligence ────────────────────────────────────────── */}
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
              {/* SOV → SOM */}
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    SOV
                  </span>
                  <p className="text-sm font-semibold text-slate-800">Share of Voice → Share of Market</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed ml-8">
                  Branded search lift tracks how often consumers seek your brand by name — this is your digital share of voice. Research consistently shows brands that grow SOV above their current market share win revenue within 6–12 months. This week's Purchase Intent signal is a leading indicator of where your market share is heading.
                </p>
                {s1Actual !== null && s1Actual !== undefined && (
                  <div className="mt-3 ml-8">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-slate-900">{s1Actual}%</span>
                        {s1Target && <span className="text-xs text-slate-400">/ {s1Target}% target</span>}
                      </div>
                      {s1Target && (
                        <span className={`text-xs font-semibold ${progressPct(s1Actual, s1Target) >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                          {progressPct(s1Actual, s1Target)}% of target
                        </span>
                      )}
                    </div>
                    {s1Target && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${progressBarColor(latestSignal?.conversion_health as SignalHealth, progressPct(s1Actual, s1Target))}`}
                          style={{ width: `${progressPct(s1Actual, s1Target)}%` }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${healthBadge(latestSignal?.conversion_health as SignalHealth)}`}>
                        {healthLabel(latestSignal?.conversion_health as SignalHealth)}
                      </span>
                      {s1Target && (
                        <span className={`text-xs font-medium ${progressPct(s1Actual, s1Target) >= 100 ? "text-emerald-600" : "text-slate-500"}`}>
                          {gapPct(s1Actual, s1Target)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Brand Visibility */}
              {aiVisibility && (
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0 leading-none">AI</span>
                      <p className="text-sm font-semibold text-slate-800">AI Brand Visibility</p>
                    </div>
                    {aiVisibility.information_consistency_score !== null && (
                      <span className="text-xs font-bold text-slate-700">
                        {aiVisibility.information_consistency_score}% brand consistency
                      </span>
                    )}
                  </div>
                  {aiVisibility.information_consistency_score !== null && (
                    <div className="ml-8 mb-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-600"
                          style={{ width: `${aiVisibility.information_consistency_score}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        How consistently AI tools describe your brand across discovery queries
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 ml-8 mb-2 italic">
                    AI tools like ChatGPT and Perplexity now influence purchase discovery. Brands with higher AI visibility capture share of voice before a consumer even searches.
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
                      <span className="w-6 h-6 rounded-full bg-slate-500 text-white text-xs font-bold flex items-center justify-center shrink-0">SCI</span>
                      <p className="text-sm font-semibold text-slate-800">Social Currency Index</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {socialCurrency.sci_score !== null && (
                        <span className="text-lg font-bold text-slate-800">
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
                  {socialCurrency.sci_score !== null && (
                    <div className="ml-8 mb-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-500"
                          style={{ width: `${socialCurrency.sci_score}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        How much your content earns organic sharing and word-of-mouth — amplifies paid media at no extra cost
                      </p>
                    </div>
                  )}
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

        {/* ── Intelligence Summary ──────────────────────────────────────── */}
        {(cleanExecSummary.length > 0 || cleanNarrative.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Intelligence Summary
              </p>
              {cir?.report_week && cir.report_week > 0 && (
                <span className="text-xs text-slate-400">Week {cir.report_week}</span>
              )}
            </div>
            <div className="space-y-3">
              {(cleanExecSummary.length > 0 ? cleanExecSummary : cleanNarrative).map((para, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
              ))}
            </div>
            {!cleanExecSummary.length && latestSignal?.ai_phase_context && (
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
                      {f.context && <p className="text-sm text-slate-600 leading-relaxed">{f.context}</p>}
                      {f.implication && <p className="text-sm text-slate-500 italic leading-relaxed">{f.implication}</p>}
                      {f.recommendation && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                          <p className="text-sm text-slate-800 leading-relaxed">
                            <span className="font-semibold">Recommendation: </span>{f.recommendation}
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

        {/* ── Recommended Actions — capped at 3 for CMO clarity ───────── */}
        {weeklyActions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Strategic Priorities This Week
              </p>
              <p className="text-xs text-slate-400 mt-1">Highest-leverage actions to move the campaign forward</p>
            </div>
            <div className="divide-y divide-slate-100">
              {weeklyActions.slice(0, 3).map((a, i) => (
                <div key={i} className="px-6 py-4 flex gap-3.5">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">{stripActionNumber(a)}</p>
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
          <span className="text-xs text-slate-400">Confidential · Signal-led campaign intelligence</span>
        </div>

      </div>
    </div>
  );
}
