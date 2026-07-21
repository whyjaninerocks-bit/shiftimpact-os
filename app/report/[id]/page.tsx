// app/report/[id]/page.tsx — Sprint 29
// PUBLIC — client-facing campaign intelligence report.
//
// Sprint 29 additions:
//   1. Brand Health Indicator (header strip) — BrandMomentumScore bms_direction + bms_velocity
//      Suppressed when bms_confidence < 5. Labelled "Brand Health" not internal BMS name.
//   2. Market Context block (inside signals card) — SignalMarketContext cultural_moment_flag,
//      platform_algorithm_flag, competitive_sov_change, category_search_trend, macro_context_note.
//      Renders conditionally; each sub-field suppressed if empty.
//   3. Business Performance card — BusinessOutcome metric_label, actual_value, target_value, notes.
//      Only rows with actual_value populated. Attribution framing note in subtitle.
//   4. Cross-Channel Intelligence card — CrossChannelReport ai_narrative (filtered) +
//      dominant_funnel_gap. idea_integrity_score EXCLUDED (methodology not client-defensible).
//
// GOVERNANCE — never exposes:
//   Gate status / gate_status, gate threshold numbers, gate_signals_converging,
//   signal names (S1/S2/S3), state_distribution, velocity_score, stall_note,
//   cstr_vs_prior, eligibility_score, trust_gap_*, priority_action,
//   build_action, SCI dimension scores, signal_pattern_read, confidence_level,
//   CIR confidence ratings, components_used, scopes_resolved, pipeline_risk_label,
//   amber/red threshold values, bms_confidence, bms ai_read, all BMS dimension fields,
//   idea_integrity_score, idea_integrity_note, CrossChannelReport budget_* fields.
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
  getBusinessOutcomes,
  getCrossChannelReports,
  getSignalMarketContexts,
  getBrandMomentumScores,
} from "@/lib/data";
import type { SignalHealth } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Health / colour helpers ───────────────────────────────────────────────────

function healthLabel(h: SignalHealth | null | undefined): string {
  if (h === "Green") return "On Track";
  if (h === "Amber") return "Building";
  if (h === "Red") return "Needs Attention";
  return "—";
}

function phaseLabel(phase: number | null | undefined): string {
  if (phase === 1) return "Phase 1: Launch";
  if (phase === 2) return "Phase 2: Build";
  if (phase === 3) return "Phase 3: Peak";
  if (phase === 4) return "Phase 4: Close";
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

// ── Campaign Health Score ─────────────────────────────────────────────────────
// Weighted composite: Purchase Intent 40% · Content Engagement 35% · Audience Build 25%

function campaignHealthScore(
  s1A: number | null | undefined, s1T: number | null | undefined,
  s2A: number | null | undefined, s2T: number | null | undefined,
  s3A: number | null | undefined, s3T: number | null | undefined,
): number | null {
  const entries: { score: number; weight: number }[] = [];
  if (s1A !== null && s1A !== undefined && s1T)
    entries.push({ score: Math.min((s1A / s1T) * 100, 100), weight: 40 });
  if (s2A !== null && s2A !== undefined && s2T)
    entries.push({ score: Math.min((s2A / s2T) * 100, 100), weight: 35 });
  if (s3A !== null && s3A !== undefined && s3T)
    entries.push({ score: Math.min((s3A / s3T) * 100, 100), weight: 25 });
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const weighted = entries.reduce((sum, e) => sum + e.score * e.weight, 0);
  return Math.round(weighted / totalWeight);
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "On Track";
  if (score >= 50) return "Building";
  return "Needs Focus";
}

function scoreRingColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-amber-300";
  return "text-red-400";
}

function scoreDeltaColor(delta: number | null): string {
  if (delta === null) return "text-slate-400";
  if (delta > 0) return "text-emerald-400";
  if (delta < 0) return "text-red-400";
  return "text-slate-400";
}

// ── Week-on-week trend helpers ────────────────────────────────────────────────

function wowDelta(
  current: number | null | undefined,
  prev: number | null | undefined,
  decimals = 1
): number | null {
  if (current === null || current === undefined || prev === null || prev === undefined) return null;
  const d = current - prev;
  return Math.round(d * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function wowArrow(delta: number | null): string {
  if (delta === null) return "";
  if (delta > 0) return "↑";
  if (delta < 0) return "↓";
  return "→";
}

function wowColor(delta: number | null, higherIsBetter = true): string {
  if (delta === null || delta === 0) return "text-slate-400";
  const good = higherIsBetter ? delta > 0 : delta < 0;
  return good ? "text-emerald-600" : "text-red-600";
}

// ── Forward projection ────────────────────────────────────────────────────────

function projectToTarget(
  current: number | null | undefined,
  prev: number | null | undefined,
  target: number | null | undefined,
  currentWeek: number,
  totalWeeks: number | null | undefined,
  isCount = false
): string | null {
  if (current === null || current === undefined) return null;
  if (prev === null || prev === undefined) return null;
  if (!target || !totalWeeks) return null;
  const weeksLeft = totalWeeks - currentWeek;
  if (weeksLeft <= 0) return null;
  if (current >= target) return null; // already exceeded — no projection needed

  const weeklyChange = current - prev;
  const unit = isCount ? " posts" : "%";

  if (weeklyChange <= 0) {
    // Flat or declining
    const projectedFinal = Math.max(0, current + weeklyChange * weeksLeft);
    const shortfall = target - projectedFinal;
    return isCount
      ? `At this pace, projected to reach ~${Math.round(projectedFinal)} posts by campaign close — ${Math.round(shortfall)} short of target`
      : `At this pace, projected to reach ~${projectedFinal.toFixed(1)}% by campaign close — ${shortfall.toFixed(1)}% short of target`;
  }

  const weeksNeeded = Math.ceil((target - current) / weeklyChange);
  const projectedWeek = currentWeek + weeksNeeded;

  if (projectedWeek <= totalWeeks) {
    const buffer = totalWeeks - projectedWeek;
    return buffer > 0
      ? `On track to reach target by Week ${projectedWeek} — ${buffer} week${buffer !== 1 ? "s" : ""} before campaign close`
      : `On track to reach target by final campaign week`;
  }

  const projectedFinal = current + weeklyChange * weeksLeft;
  const shortfall = target - projectedFinal;
  return isCount
    ? `Projected to reach ~${Math.round(projectedFinal)} posts by campaign close — ${Math.round(shortfall)} short`
    : `Projected to reach ~${projectedFinal.toFixed(1)}% by campaign close — ${shortfall.toFixed(1)}% short`;
}

function projectionColor(text: string | null): string {
  if (!text) return "text-slate-400";
  if (text.startsWith("On track")) return "text-emerald-600";
  return "text-amber-600";
}

// ── Progress helpers ──────────────────────────────────────────────────────────

function progressPct(actual: number | null | undefined, target: number | null | undefined): number {
  if (actual === null || actual === undefined || !target) return 0;
  return Math.min(Math.round((actual / target) * 100), 100);
}

function gapCount(actual: number | null | undefined, target: number | null | undefined, unit = "posts"): string {
  if (actual === null || actual === undefined || !target) return "";
  if (actual >= target) return `Exceeding target by ${actual - target} ${unit}`;
  return `${target - actual} ${unit} to target`;
}

function gapPct(actual: number | null | undefined, target: number | null | undefined, suffix = "%"): string {
  if (actual === null || actual === undefined || !target) return "";
  if (actual >= target) return `Exceeding target by ${(actual - target).toFixed(1)}${suffix}`;
  return `${(target - actual).toFixed(1)}${suffix} to target`;
}

function progressBarColor(h: SignalHealth | null | undefined, pct: number): string {
  if (pct >= 100) return "bg-emerald-400";
  if (h === "Red") return "bg-red-400";
  if (h === "Amber") return "bg-amber-400";
  return "bg-emerald-400";
}

// ── Client safety filter ──────────────────────────────────────────────────────

// For activation_direction (short, single-purpose field)
function isClientSafeDirection(text: string | null | undefined): boolean {
  if (!text || text.trim().length < 10) return false;
  const blocked = [
    "signal intelligence", "module", "data point", "metrics for week",
    "apify", "capture", "run the", "without these", "no actionable strategy",
    "cannot be determined", "immediately to identify", "measurement gap",
  ];
  const lower = text.toLowerCase();
  return !blocked.some((term) => lower.includes(term));
}

// Sentence-level filter for AI narrative prose.
// Strips individual sentences containing internal operational language while
// preserving the rest of the paragraph. Uses a tighter term list than
// isClientSafeDirection to avoid false positives on legitimate business prose
// (e.g. "signal capture" should NOT be blocked, "Signal Intelligence" should).
const NARRATIVE_BLOCKED_TERMS = [
  "signal intelligence",
  "diagnostics immediately",
  "immediately to identify",
  "measurement gap",
  "no actionable strategy",
  "cannot be determined",
  "data point",
  "metrics for week",
  "apify",
  "without these data",
];

function filterNarrativeSentences(text: string): string {
  // Split on sentence-ending punctuation followed by whitespace
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences
    .filter((s) => {
      const lower = s.toLowerCase();
      return !NARRATIVE_BLOCKED_TERMS.some((term) => lower.includes(term));
    })
    .join(" ")
    .trim();
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
  if (stageNum === current) return "bg-slate-900 text-white border-slate-900 font-bold";
  if (current !== null && stageNum < current) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-400 border-slate-200";
}

// ── Text / format helpers ─────────────────────────────────────────────────────

function toParas(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
}

function stripGateStatusLabel(narrative: string): string {
  const lines = narrative.split("\n");
  if (lines[0]?.startsWith("Gate Status:")) return lines.slice(1).join("\n").trimStart();
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientReportPage({
  params,
}: {
  params: { id: string };
}) {
  // Phase 1 — campaign needed for client_id → BrandMomentumScores
  const campaign = await getCampaign(params.id);
  if (!campaign) notFound();

  // Phase 2 — all remaining data in parallel
  const [
    frame, bip, threshold,
    signalReports, cir,
    behaviourStates, consumerReading,
    aiVisibility, socialCurrency,
    businessOutcomes, crossChannelReports, marketContexts, brandMomentumScores,
  ] = await Promise.all([
    getFrameBrief(params.id),
    getBigIdeaPlatform(params.id),
    getSignalThreshold(params.id),
    getSignalWeeklyReports(params.id),
    getLatestCampaignReport(params.id),
    getConsumerBehaviourStates(params.id),
    getLatestConsumerStateReading(params.id),
    getAiBrandVisibilityScore(params.id),
    getSocialCurrencyScore(params.id),
    getBusinessOutcomes(params.id),
    getCrossChannelReports(params.id),
    getSignalMarketContexts(params.id),
    getBrandMomentumScores(campaign.client_id),
  ]);

  // Latest and previous week data
  const latestSignal = signalReports[0] ?? null;
  const prevSignal   = signalReports[1] ?? null;

  let weeklyActions: string[] = [];
  if (latestSignal?.ai_recommended_actions) {
    try { weeklyActions = JSON.parse(latestSignal.ai_recommended_actions); }
    catch { weeklyActions = [latestSignal.ai_recommended_actions]; }
  }

  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const overall = latestSignal
    ? overallHealth([latestSignal.demand_health, latestSignal.nurture_health, latestSignal.conversion_health])
    : null;

  const cleanNarrative = latestSignal?.ai_narrative
    ? toParas(filterNarrativeSentences(stripGateStatusLabel(latestSignal.ai_narrative)))
    : [];
  const cleanExecSummary = cir?.executive_summary
    ? toParas(filterNarrativeSentences(cir.executive_summary))
    : [];

  // ── Campaign duration + progress ─────────────────────────────────────────
  const totalWeeks   = threshold?.campaign_duration_weeks ?? null;
  const currentWeek  = latestSignal?.week_number ?? 0;
  const weeksRemaining = totalWeeks ? totalWeeks - currentWeek : null;
  const campaignPct  = totalWeeks && currentWeek ? Math.round((currentWeek / totalWeeks) * 100) : null;

  // ── Signal values — current and previous ─────────────────────────────────
  const s1A = latestSignal?.signal_1_actual_pct;
  const s1T = threshold?.signal_1_threshold_pct;
  const s2A = latestSignal?.signal_2_actual_pct;
  const s2T = threshold?.signal_2_threshold_pct;
  const s3A = latestSignal?.signal_3_actual_count;
  const s3T = threshold?.signal_3_threshold_count;

  const prev_s1A = prevSignal?.signal_1_actual_pct;
  const prev_s2A = prevSignal?.signal_2_actual_pct;
  const prev_s3A = prevSignal?.signal_3_actual_count;

  // ── Campaign Health Score ─────────────────────────────────────────────────
  const healthScore     = campaignHealthScore(s1A, s1T, s2A, s2T, s3A, s3T);
  const prevHealthScore = campaignHealthScore(prev_s1A, s1T, prev_s2A, s2T, prev_s3A, s3T);
  const scoreDelta      = healthScore !== null && prevHealthScore !== null
    ? healthScore - prevHealthScore : null;

  // ── Signal convergence ────────────────────────────────────────────────────
  const primaryHealths    = latestSignal
    ? [latestSignal.demand_health, latestSignal.nurture_health, latestSignal.conversion_health]
    : [];
  const signalsOnTrack    = primaryHealths.filter((h) => h === "Green").length;
  const totalPrimarySignals = primaryHealths.filter(Boolean).length;

  // ── WoW deltas ───────────────────────────────────────────────────────────
  const d_s1 = wowDelta(s1A, prev_s1A);
  const d_s2 = wowDelta(s2A, prev_s2A);
  const d_s3 = wowDelta(s3A, prev_s3A, 0); // count, no decimals

  // ── Forward projections ───────────────────────────────────────────────────
  const proj_s1 = projectToTarget(s1A, prev_s1A, s1T, currentWeek, totalWeeks);
  const proj_s2 = projectToTarget(s2A, prev_s2A, s2T, currentWeek, totalWeeks);
  const proj_s3 = projectToTarget(s3A, prev_s3A, s3T, currentWeek, totalWeeks, true);

  // ── Primary signal rows ───────────────────────────────────────────────────
  const primarySignals = [
    {
      label: "Audience Build",
      sub: "Organic brand content created by consumers this week",
      health: latestSignal?.demand_health as SignalHealth,
      actual: s3A !== null && s3A !== undefined ? `${s3A} posts` : null,
      target: s3T !== undefined ? `${s3T} posts` : null,
      pct: progressPct(s3A, s3T),
      gap: gapCount(s3A, s3T, "posts"),
      delta: d_s3,
      deltaUnit: "posts",
      projection: proj_s3,
      businessNote: "Consumer-created content is the most credible form of brand reach — it expands organic audience without additional media spend and signals genuine product affinity.",
      goalContext: s3T ? `Weekly target: ${s3T} pieces of organic brand content` : null,
    },
    {
      label: "Content Engagement",
      sub: "Audience intent — how many people saved your content to return to",
      health: latestSignal?.nurture_health as SignalHealth,
      actual: fmt(s2A),
      target: s2T !== undefined ? `${s2T}%` : null,
      pct: progressPct(s2A, s2T),
      gap: gapPct(s2A, s2T),
      delta: d_s2,
      deltaUnit: "%",
      projection: proj_s2,
      businessNote: "Save rate separates passive viewers from active buyers — people who bookmark content to return later convert at 3–4× the rate of casual engagers.",
      goalContext: s2T ? `Weekly target: ${s2T}% of viewers save the content` : null,
    },
    {
      label: "Purchase Intent",
      sub: "Consumers actively seeking the brand — your share of search",
      health: latestSignal?.conversion_health as SignalHealth,
      actual: fmt(s1A),
      target: s1T !== undefined ? `${s1T}%` : null,
      pct: progressPct(s1A, s1T),
      gap: gapPct(s1A, s1T),
      delta: d_s1,
      deltaUnit: "%",
      projection: proj_s1,
      businessNote: "When consumers search for your brand by name, they are one step from purchase. This also tracks Share of Voice — brands that grow SOV above their market share consistently win revenue over 6–12 months.",
      goalContext: s1T ? `Weekly target: ${s1T}% lift in branded searches vs campaign baseline` : null,
    },
  ];

  // ── Supplementary signals ─────────────────────────────────────────────────
  const s2bA  = latestSignal?.signal_2b_actual_pct;
  const s2bT  = threshold?.signal_2b_target_pct;
  const s3bA  = latestSignal?.signal_3b_actual_pct;
  const s3bT  = threshold?.signal_3b_target_pct;
  const s4A   = latestSignal?.signal_4_actual_pct;
  const s4T   = threshold?.signal_4_target_pct;
  const p_s2b = wowDelta(s2bA, prevSignal?.signal_2b_actual_pct);
  const p_s3b = wowDelta(s3bA, prevSignal?.signal_3b_actual_pct);
  const p_s4  = wowDelta(s4A, prevSignal?.signal_4_actual_pct);

  const supplementarySignals = [
    s2bA !== null && s2bA !== undefined ? {
      label: latestSignal!.signal_2b_label ?? "Content Share Rate",
      actual: fmt(s2bA), target: s2bT !== undefined ? `Target: ${s2bT}%` : null,
      gap: gapPct(s2bA, s2bT), pct: progressPct(s2bA, s2bT),
      health: latestSignal!.signal_2b_health as SignalHealth,
      note: "Content amplification — how far your content travels beyond initial audience",
      delta: p_s2b, deltaUnit: "%",
    } : null,
    s3bA !== null && s3bA !== undefined ? {
      label: latestSignal!.signal_3b_label ?? "Video Completion Rate",
      actual: fmt(s3bA), target: s3bT !== undefined ? `Target: ${s3bT}%` : null,
      gap: gapPct(s3bA, s3bT), pct: progressPct(s3bA, s3bT),
      health: latestSignal!.signal_3b_health as SignalHealth,
      note: "Audience attention quality — are they watching or scrolling past?",
      delta: p_s3b, deltaUnit: "%",
    } : null,
    s4A !== null && s4A !== undefined ? {
      label: latestSignal!.signal_4_label ?? "Return Visits",
      actual: fmt(s4A), target: s4T !== undefined ? `Target: ${s4T}%` : null,
      gap: gapPct(s4A, s4T), pct: progressPct(s4A, s4T),
      health: latestSignal!.signal_4_health as SignalHealth,
      note: "Retention — lags campaign activity by 2–4 weeks",
      delta: p_s4, deltaUnit: "%",
    } : null,
  ].filter(Boolean) as {
    label: string; actual: string; target: string | null; gap: string; pct: number;
    health: SignalHealth; note: string; delta: number | null; deltaUnit: string;
  }[];

  // ── Consumer journey ──────────────────────────────────────────────────────
  const latestBehaviour  = behaviourStates[0] ?? null;
  const currentStageNum  = latestBehaviour?.diagnosed_state ?? null;
  const consumerNarrative = consumerReading?.ai_narrative
    ? toParas(filterNarrativeSentences(consumerReading.ai_narrative)) : [];
  const hasStallAlert    = consumerReading?.state_stall_flag ?? false;

  // ── AI + Social Currency ──────────────────────────────────────────────────
  const aiVisNarrative = aiVisibility?.ai_narrative
    ? toParas(filterNarrativeSentences(aiVisibility.ai_narrative)) : [];
  const sciNarrative = socialCurrency?.ai_narrative
    ? toParas(filterNarrativeSentences(socialCurrency.ai_narrative)) : [];

  const weekDate = formatWeekOf(latestSignal?.week_of);

  // ── Sprint 29 derived values ─────────────────────────────────────────────
  // Brand Momentum — only expose direction + velocity when confidence >= 5
  const latestBms = brandMomentumScores[0] ?? null;
  const bms = latestBms && (latestBms.bms_confidence === null || latestBms.bms_confidence >= 5)
    ? latestBms : null;

  // Market Context — most recent week, suppress if all fields empty
  const marketCtx = marketContexts[0] ?? null;
  const hasMarketCtx = marketCtx && (
    marketCtx.cultural_moment_flag ||
    marketCtx.platform_algorithm_flag ||
    (marketCtx.competitive_sov_change !== null && marketCtx.competitive_sov_note?.trim()) ||
    (marketCtx.category_search_trend !== null && marketCtx.category_search_note?.trim()) ||
    marketCtx.macro_context_note?.trim()
  );

  // Business Outcomes — only rows where actual has been entered
  const populatedOutcomes = businessOutcomes.filter((o) => o.actual_value !== null);

  // Cross-Channel — latest week, filter ai_narrative through client safety check
  const crossChannel = crossChannelReports[0] ?? null;
  const crossChannelNarrative = crossChannel?.ai_narrative
    ? toParas(crossChannel.ai_narrative).filter((p) => isClientSafeDirection(p))
    : [];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-6">

          {/* Top bar */}
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

          {/* Campaign name + meta */}
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

          {/* Campaign Health Score + overall health */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {/* Health Score card */}
            {healthScore !== null && (
              <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-white/8 border border-white/12">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle
                      cx="28" cy="28" r="22" fill="none"
                      stroke={healthScore >= 85 ? "#34d399" : healthScore >= 70 ? "#fbbf24" : "#f87171"}
                      strokeWidth="5"
                      strokeDasharray={`${(healthScore / 100) * 138.2} 138.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-bold ${scoreRingColor(healthScore)}`}>
                      {healthScore}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Campaign Health</p>
                  <p className={`text-base font-bold ${scoreRingColor(healthScore)}`}>
                    {scoreLabel(healthScore)}
                  </p>
                  {scoreDelta !== null && (
                    <p className={`text-xs font-semibold mt-0.5 ${scoreDeltaColor(scoreDelta)}`}>
                      {scoreDelta > 0 ? "↑" : scoreDelta < 0 ? "↓" : "→"}{" "}
                      {Math.abs(scoreDelta)} pts vs last week
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Signal status + progress bar */}
            <div className="flex flex-col justify-between px-4 py-3 rounded-lg bg-white/8 border border-white/12">
              <div>
                {overall && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${healthDotBg(overall)}`} />
                    <span className="text-sm font-semibold text-white">{healthLabel(overall)}</span>
                  </div>
                )}
                {totalPrimarySignals > 0 && (
                  <p className="text-xs text-slate-400">
                    {signalsOnTrack} of {totalPrimarySignals} signals on track
                  </p>
                )}
              </div>
              {campaignPct !== null && totalWeeks && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>Campaign progress</span>
                    <span>
                      Wk {currentWeek}/{totalWeeks}
                      {weeksRemaining !== null && weeksRemaining > 0 && ` · ${weeksRemaining}w left`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/50 rounded-full" style={{ width: `${campaignPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Brand Health Indicator — bms_direction + bms_velocity only; confidence gate applied above */}
          {bms && bms.bms_direction && (
            <div className="mt-3 flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/6 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Brand Health</span>
                <span className="text-slate-700 text-xs">·</span>
                <span className="text-xs text-slate-500">Brand-level view across all active signals</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {bms.bms_velocity && (
                  <span className={`text-xs font-medium ${
                    bms.bms_velocity === "Accelerating" ? "text-emerald-400" :
                    bms.bms_velocity === "Decelerating" ? "text-red-400" :
                    "text-slate-400"
                  }`}>{bms.bms_velocity}</span>
                )}
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  bms.bms_direction === "Positive" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
                  bms.bms_direction === "Negative" ? "bg-red-500/20 border-red-500/30 text-red-300" :
                  "bg-white/10 border-white/20 text-slate-300"
                }`}>{bms.bms_direction}</span>
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
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Campaign Objective</p>
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
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Campaign Idea</p>
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
                  {signalsOnTrack} of {totalPrimarySignals} signals on track
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

          {/* Baseline suppression notice — shown when flags_suppressed = true (short campaign / pre-Phase 2) */}
          {latestSignal?.flags_suppressed && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-start gap-3">
              <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Baseline Period</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Signals are being calibrated against pre-campaign baseline. Health status will activate from next reporting period. Readings shown below are reference only.
                </p>
              </div>
            </div>
          )}

          {/* Phase context */}
          {latestSignal?.ai_phase_context && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-start gap-3">
              <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  {phaseLabel(latestSignal.campaign_phase)}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">{latestSignal.ai_phase_context}</p>
              </div>
            </div>
          )}

          {/* Market Context — environmental factors that explain signal movement this week */}
          {hasMarketCtx && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Market Context This Week</p>
              <div className="space-y-2">
                {marketCtx!.cultural_moment_flag && marketCtx!.cultural_moment_note?.trim() && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs text-slate-400 shrink-0 mt-px">📅</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{marketCtx!.cultural_moment_note}</p>
                  </div>
                )}
                {marketCtx!.competitive_sov_change !== null && marketCtx!.competitive_sov_note?.trim() && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs text-slate-400 shrink-0 mt-px">⚡</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-medium">Competitor Activity: </span>{marketCtx!.competitive_sov_note}
                    </p>
                  </div>
                )}
                {marketCtx!.category_search_trend !== null && marketCtx!.category_search_note?.trim() && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs text-slate-400 shrink-0 mt-px">📈</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-medium">Category Trend: </span>{marketCtx!.category_search_note}
                    </p>
                  </div>
                )}
                {marketCtx!.platform_algorithm_flag && marketCtx!.platform_algorithm_note?.trim() && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs text-slate-400 shrink-0 mt-px">🔔</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-medium">Platform Update: </span>{marketCtx!.platform_algorithm_note}
                    </p>
                  </div>
                )}
                {marketCtx!.macro_context_note?.trim() && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs text-slate-400 shrink-0 mt-px">🌐</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{marketCtx!.macro_context_note}</p>
                  </div>
                )}
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
                {primarySignals.map(({ label, sub, health, actual, target, pct, gap, delta, deltaUnit, projection, businessNote, goalContext }) => {
                  // During baseline suppression period, mute health status display
                  const displayHealth: SignalHealth = latestSignal?.flags_suppressed ? null as unknown as SignalHealth : health;
                  return (
                  <div key={label} className="px-6 py-5">

                    {/* Signal header */}
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${latestSignal?.flags_suppressed ? "bg-slate-50" : healthIconBg(health)}`}>
                          <span className={`w-3 h-3 rounded-full ${latestSignal?.flags_suppressed ? "bg-slate-200" : healthDotBg(health)}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                        </div>
                      </div>
                      {latestSignal?.flags_suppressed ? (
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 bg-slate-50 border-slate-200 text-slate-400">
                          Calibrating
                        </span>
                      ) : (
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 ${healthBadge(displayHealth)}`}>
                          {healthLabel(displayHealth)}
                        </span>
                      )}
                    </div>

                    {/* Goal line */}
                    {goalContext && (
                      <p className="text-xs text-slate-400 ml-[52px] mb-2">{goalContext}</p>
                    )}

                    {/* Metric + WoW + progress bar */}
                    {actual && actual !== "—" && (
                      <div className="ml-[52px]">
                        <div className="flex items-end justify-between mb-1.5">
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-xl font-bold text-slate-900 leading-none">{actual}</span>
                            {target && <span className="text-xs text-slate-400">/ {target} target</span>}
                            {/* WoW delta */}
                            {delta !== null && (
                              <span className={`text-xs font-semibold ${wowColor(delta)}`}>
                                {wowArrow(delta)} {delta > 0 ? "+" : ""}{delta}{deltaUnit} vs last week
                              </span>
                            )}
                          </div>
                          {target && pct > 0 && (
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

                        {/* Gap + projection */}
                        <div className="flex items-center justify-between">
                          {gap && (
                            <p className={`text-xs font-medium ${pct >= 100 ? "text-emerald-600" : "text-slate-500"}`}>
                              {gap}
                            </p>
                          )}
                          {projection && (
                            <p className={`text-xs font-medium ml-auto ${projectionColor(projection)}`}>
                              {projection}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Business context */}
                    <p className="text-xs text-slate-400 mt-3 ml-[52px] leading-relaxed border-l-2 border-slate-100 pl-3">
                      {businessNote}
                    </p>
                  </div>
                  );
                })}
              </div>

              {/* Supplementary signals */}
              {supplementarySignals.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-wide">Additional Signals</p>
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
                            {s.delta !== null && (
                              <span className={`text-xs font-semibold ${wowColor(s.delta)}`}>
                                {wowArrow(s.delta)}{s.delta > 0 ? "+" : ""}{s.delta}{s.deltaUnit}
                              </span>
                            )}
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
                        const hs = [r.demand_health, r.nurture_health, r.conversion_health].filter(Boolean) as SignalHealth[];
                        const wk: SignalHealth = hs.includes("Red") ? "Red" : hs.includes("Amber") ? "Amber" : "Green";
                        const isLatest = r.week_number === latestSignal.week_number;
                        return (
                          <div key={r.id} className="flex flex-col items-center gap-1">
                            <span
                              className={`rounded-full ${isLatest ? "w-4 h-4 ring-2 ring-slate-400 ring-offset-2 ring-offset-slate-50" : "w-3 h-3"} ${r.flags_suppressed ? "bg-slate-200" : healthDotBg(wk)}`}
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

        {/* ── Signal Convergence Tracker ──────────────────────────────── */}
        {latestSignal && totalPrimarySignals > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Phase Gate Progress</p>
              <p className="text-xs text-slate-400 mt-1">
                Signal convergence toward {latestSignal.campaign_phase ? phaseLabel(latestSignal.campaign_phase) : "campaign"} completion criteria
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-800">
                  {signalsOnTrack} of {totalPrimarySignals} signals on track for phase gate
                </p>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 ${
                  signalsOnTrack === totalPrimarySignals
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : signalsOnTrack >= Math.ceil(totalPrimarySignals * 0.6)
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  {signalsOnTrack === totalPrimarySignals
                    ? "Gate Ready"
                    : signalsOnTrack >= Math.ceil(totalPrimarySignals * 0.6)
                    ? "Building"
                    : "Needs Focus"}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all ${
                    signalsOnTrack === totalPrimarySignals
                      ? "bg-emerald-500"
                      : signalsOnTrack >= Math.ceil(totalPrimarySignals * 0.6)
                      ? "bg-amber-400"
                      : "bg-red-400"
                  }`}
                  style={{ width: `${totalPrimarySignals > 0 ? (signalsOnTrack / totalPrimarySignals) * 100 : 0}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {primarySignals.map(({ label, health }) => (
                  <div key={label} className={`rounded-lg px-3 py-2.5 border text-center ${
                    health === "Green"
                      ? "bg-emerald-50 border-emerald-100"
                      : health === "Amber"
                      ? "bg-amber-50 border-amber-100"
                      : health === "Red"
                      ? "bg-red-50 border-red-100"
                      : "bg-slate-50 border-slate-100"
                  }`}>
                    <span className={`w-2 h-2 rounded-full inline-block mb-1 ${healthDotBg(health as SignalHealth)}`} />
                    <p className="text-xs font-semibold text-slate-700 leading-tight">{label}</p>
                    <p className={`text-[10px] font-medium mt-0.5 ${
                      health === "Green" ? "text-emerald-600"
                      : health === "Amber" ? "text-amber-600"
                      : health === "Red" ? "text-red-600"
                      : "text-slate-400"
                    }`}>{healthLabel(health as SignalHealth)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Consumer Journey ──────────────────────────────────────────── */}
        {(latestBehaviour || consumerNarrative.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Consumer Journey</p>
              <p className="text-xs text-slate-400 mt-1">Where your audience sits in the path to purchase</p>
            </div>
            <div className="px-6 py-5">
              {/* Funnel */}
              <div className="flex items-stretch gap-1 mb-5">
                {FUNNEL_STAGES.map((stage, idx) => (
                  <div key={stage.num} className="flex items-center flex-1 min-w-0">
                    <div className={`flex-1 px-1.5 py-2 rounded-lg border text-center transition-all ${stagePill(stage.num, currentStageNum)}`}>
                      <p className="text-xs font-semibold leading-tight truncate">{stage.label}</p>
                    </div>
                    {idx < FUNNEL_STAGES.length - 1 && (
                      <span className={`text-xs mx-0.5 shrink-0 ${currentStageNum !== null && idx + 1 < currentStageNum ? "text-emerald-400" : "text-slate-300"}`}>›</span>
                    )}
                  </div>
                ))}
              </div>

              {latestBehaviour && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                    <p className="text-sm font-bold text-slate-900">Current Stage: {latestBehaviour.state_name}</p>
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

              {isClientSafeDirection(latestBehaviour?.activation_direction) && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Strategic Priority to Advance</p>
                  <p className="text-sm text-slate-800 leading-relaxed">{latestBehaviour!.activation_direction}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Brand Intelligence ────────────────────────────────────────── */}
        {(aiVisibility || socialCurrency) && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Brand Intelligence</p>
              <p className="text-xs text-slate-400 mt-1">Share of voice, AI visibility, and social currency: the pillars of long-term market share</p>
            </div>
            <div className="divide-y divide-slate-100">

              {/* SOV → SOM */}
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">SOV</span>
                  <p className="text-sm font-semibold text-slate-800">Share of Voice → Share of Market</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed ml-8">
                  Branded search lift tracks how often consumers seek your brand by name — your digital share of voice. Research consistently shows brands that grow SOV above their current market share win revenue within 6–12 months. This week's Purchase Intent signal is a leading indicator of where your market share is heading.
                </p>
                {s1A !== null && s1A !== undefined && (
                  <div className="mt-3 ml-8">
                    <div className="flex items-end justify-between mb-1.5">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-lg font-bold text-slate-900">{s1A}%</span>
                        {s1T && <span className="text-xs text-slate-400">/ {s1T}% target</span>}
                        {d_s1 !== null && (
                          <span className={`text-xs font-semibold ${wowColor(d_s1)}`}>
                            {wowArrow(d_s1)} {d_s1 > 0 ? "+" : ""}{d_s1}% vs last week
                          </span>
                        )}
                      </div>
                      {s1T && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${healthBadge(latestSignal?.conversion_health as SignalHealth)}`}>
                          {healthLabel(latestSignal?.conversion_health as SignalHealth)}
                        </span>
                      )}
                    </div>
                    {s1T && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${progressBarColor(latestSignal?.conversion_health as SignalHealth, progressPct(s1A, s1T))}`}
                          style={{ width: `${progressPct(s1A, s1T)}%` }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {s1T && <p className={`text-xs font-medium ${progressPct(s1A, s1T) >= 100 ? "text-emerald-600" : "text-slate-500"}`}>{gapPct(s1A, s1T)}</p>}
                      {proj_s1 && <p className={`text-xs font-medium ml-auto ${projectionColor(proj_s1)}`}>{proj_s1}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Brand Visibility */}
              {aiVisibility && (
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0 leading-none">AI</span>
                      <p className="text-sm font-semibold text-slate-800">AI Brand Visibility</p>
                    </div>
                    {aiVisibility.information_consistency_score !== null && (
                      <span className="text-xs font-bold text-slate-700">{aiVisibility.information_consistency_score}% brand consistency</span>
                    )}
                  </div>

                  {/* Reframed for modern Malaysian CMO */}
                  <div className="ml-8 mb-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      In 2026, Malaysian consumers increasingly ask AI assistants — ChatGPT, Perplexity, Google AI Overviews — for brand recommendations before they search. When someone asks <em>"what's a good Malaysian sauce brand to cook with?"</em>, is your brand part of that answer? AI visibility is the new share of voice.
                    </p>
                  </div>

                  {aiVisibility.information_consistency_score !== null && (
                    <div className="ml-8 mb-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full rounded-full bg-slate-600"
                          style={{ width: `${aiVisibility.information_consistency_score}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">How consistently AI tools describe your brand across discovery queries</p>
                    </div>
                  )}

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
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full bg-slate-500" style={{ width: `${socialCurrency.sci_score}%` }} />
                      </div>
                      <p className="text-xs text-slate-400">How much your content earns organic sharing — amplifies paid media reach at no extra cost</p>
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

        {/* ── Business Performance ─────────────────────────────────────── */}
        {populatedOutcomes.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Business Performance</p>
              <p className="text-xs text-slate-400 mt-1">Business results for this period — campaign activity is one of several contributing factors</p>
            </div>
            <div className="divide-y divide-slate-100">
              {populatedOutcomes.slice(0, 6).map((o) => {
                const boPct = o.target_value && o.target_value > 0
                  ? Math.min(Math.round((o.actual_value! / o.target_value) * 100), 100)
                  : null;
                const boStatus = boPct === null ? null : boPct >= 100 ? "met" : boPct >= 75 ? "near" : "below";
                return (
                  <div key={o.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-800">{o.metric_label}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-bold text-slate-900">
                          {o.actual_value!.toLocaleString("en-MY", { maximumFractionDigits: 2 })}
                        </span>
                        {o.target_value !== null && (
                          <span className="text-xs text-slate-400">
                            / {o.target_value.toLocaleString("en-MY", { maximumFractionDigits: 2 })} target
                          </span>
                        )}
                        {boStatus && (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            boStatus === "met" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            boStatus === "near" ? "bg-amber-50 border-amber-200 text-amber-700" :
                            "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {boStatus === "met" ? "On Target" : boStatus === "near" ? "Building" : "Below Target"}
                          </span>
                        )}
                      </div>
                    </div>
                    {o.target_value !== null && boPct !== null && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${
                            boStatus === "met" ? "bg-emerald-400" :
                            boStatus === "near" ? "bg-amber-400" :
                            "bg-red-400"
                          }`}
                          style={{ width: `${boPct}%` }}
                        />
                      </div>
                    )}
                    {o.notes?.trim() && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{o.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Cross-Channel Intelligence ────────────────────────────────── */}
        {crossChannel && (crossChannelNarrative.length > 0 || (crossChannel.dominant_funnel_gap && crossChannel.dominant_funnel_gap !== "None")) && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Cross-Channel Intelligence</p>
              <p className="text-xs text-slate-400 mt-1">How your campaign is performing across all active channels this week</p>
            </div>
            <div className="px-6 py-5">
              {crossChannel.dominant_funnel_gap && crossChannel.dominant_funnel_gap !== "None" && (
                <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                  <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Priority Focus This Week</p>
                    <p className="text-sm text-amber-800">Biggest gap across channels: <span className="font-semibold">{crossChannel.dominant_funnel_gap}</span></p>
                  </div>
                </div>
              )}
              {crossChannelNarrative.length > 0 && (
                <div className="space-y-2.5">
                  {crossChannelNarrative.map((para, i) => (
                    <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Intelligence Summary ──────────────────────────────────────── */}
        {(cleanExecSummary.length > 0 || cleanNarrative.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Intelligence Summary</p>
              {cir?.report_week && cir.report_week > 0 && (
                <span className="text-xs text-slate-400">Week {cir.report_week}</span>
              )}
            </div>
            <div className="space-y-3">
              {(cleanExecSummary.length > 0 ? cleanExecSummary : cleanNarrative).map((para, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed">{para}</p>
              ))}
            </div>
          </div>
        )}

        {/* ── Intelligence Findings ─────────────────────────────────────── */}
        {cir && cir.findings.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Intelligence Findings</p>
            </div>
            <div className="divide-y divide-slate-100">
              {cir.findings.map((f, i) => (
                <div key={f.query_id || i} className="px-6 py-5 flex items-start gap-3.5">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
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
              ))}
            </div>
          </div>
        )}

        {/* ── Data Quality Panel ──────────────────────────────────────── */}
        {latestSignal && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Data Quality This Period</p>
              <p className="text-xs text-slate-400 mt-1">Confirmed data inputs used in this report</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              {([
                {
                  label: "Signal readings",
                  confirmed: latestSignal.signal_1_actual_pct !== null || latestSignal.signal_2_actual_pct !== null || latestSignal.signal_3_actual_count !== null,
                  note: "Weekly platform analytics confirmed",
                },
                {
                  label: "Phase context",
                  confirmed: !!latestSignal.ai_phase_context,
                  note: "Campaign phase diagnostic applied",
                },
                {
                  label: "Consumer journey",
                  confirmed: !!latestBehaviour,
                  note: "Audience state diagnosis completed",
                },
                {
                  label: "AI brand visibility",
                  confirmed: !!aiVisibility,
                  note: "AI assistant discovery audit completed",
                },
                {
                  label: "Social currency",
                  confirmed: !!socialCurrency,
                  note: "Content sharing momentum tracked",
                },
                {
                  label: "Business outcomes",
                  confirmed: populatedOutcomes.length > 0,
                  note: "Client confirmed results received",
                },
                {
                  label: "Channel intelligence",
                  confirmed: !!crossChannel,
                  note: "Multichannel performance read applied",
                },
              ] as { label: string; confirmed: boolean; note: string }[]).map(({ label, confirmed, note }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${confirmed ? "bg-emerald-500" : "bg-slate-200"}`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{label}</p>
                      <p className="text-[10px] text-slate-400">{note}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                    confirmed
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}>
                    {confirmed ? "Confirmed" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Strategic Priorities (capped at 3) ───────────────────────── */}
        {weeklyActions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Strategic Priorities This Week</p>
              <p className="text-xs text-slate-400 mt-1">Highest-leverage actions to move the campaign forward</p>
            </div>
            <div className="divide-y divide-slate-100">
              {weeklyActions.slice(0, 3).map((a, i) => (
                <div key={i} className="px-6 py-4 flex gap-3.5">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{stripActionNumber(a)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 pb-6 border-t border-slate-200">
          <span className="text-xs text-slate-400">Powered by <span className="font-medium text-slate-500">ShiftImpact OS</span></span>
          <span className="text-xs text-slate-400">Confidential · Signal-led campaign intelligence</span>
        </div>

      </div>
    </div>
  );
}
