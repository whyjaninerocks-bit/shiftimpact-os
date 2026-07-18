// app/report/[id]/page.tsx — Sprint 26 Full Redesign
// PUBLIC — client-facing campaign intelligence report.
//
// Data sources used:
//   getCampaign          — name, client_name, phase
//   getFrameBrief        — force (campaign objective), primary_kpi, campaign_pathway
//   getBigIdeaPlatform   — topline_idea, brand_role
//   getSignalThreshold   — signal targets + labels (for actual vs target display)
//   getSignalWeeklyReports — all weekly data, actual signal values, health, phase
//   getLatestCampaignReport — CIR executive summary + findings
//
// GOVERNANCE — never exposes:
//   Gate status / gate_status field, gate threshold numbers, budget amounts,
//   signal methodology names (S1/S2/S3), gate hold duration in days,
//   UGC Authenticity Ratio, CIR confidence ratings,
//   components_used, scopes_resolved, pipeline risk label, or any internal methodology.
//
// Client-facing label mapping:
//   Demand     → Audience Build     (driven by Signal 3: UGC volume)
//   Nurture    → Content Engagement (driven by Signal 2: Save Rate)
//   Conversion → Purchase Intent    (driven by Signal 1: Search Lift)
//   Amber      → Building

import { notFound } from "next/navigation";
import {
  getCampaign,
  getFrameBrief,
  getBigIdeaPlatform,
  getSignalThreshold,
  getSignalWeeklyReports,
  getLatestCampaignReport,
} from "@/lib/data";
import type { SignalHealth, SignalThreshold } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function overallHealth(
  healths: (SignalHealth | null | undefined)[]
): SignalHealth {
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
  if (h === "Green")
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
  if (h === "Amber")
    return "bg-amber-400/15 border-amber-400/30 text-amber-300";
  return "bg-red-500/15 border-red-500/30 text-red-300";
}

// Strip internal "Gate Status: ..." first line from AI narrative before showing clients.
function stripGateStatusLabel(narrative: string): string {
  const lines = narrative.split("\n");
  if (lines[0]?.startsWith("Gate Status:")) {
    return lines.slice(1).join("\n").trimStart();
  }
  return narrative;
}

// Split text into clean paragraphs — no whitespace-pre-line rendering issues
function toParas(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

// Strip leading number prefix "1. " from action strings — badge already shows number
function stripActionNumber(action: string): string {
  return action.replace(/^\d+\.\s*/, "");
}

// Format % value for display — null returns "—"
function fmt(val: number | null | undefined, suffix = "%"): string {
  if (val === null || val === undefined) return "—";
  return `${val}${suffix}`;
}

// Format a target for display
function fmtTarget(val: number | null | undefined, suffix = "%"): string {
  if (val === null || val === undefined) return "";
  return `Target: ${val}${suffix}`;
}

// Format week_of ISO date to readable
function formatWeekOf(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  try {
    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientReportPage({
  params,
}: {
  params: { id: string };
}) {
  const [campaign, frame, bip, threshold, signalReports, cir] =
    await Promise.all([
      getCampaign(params.id),
      getFrameBrief(params.id),
      getBigIdeaPlatform(params.id),
      getSignalThreshold(params.id),
      getSignalWeeklyReports(params.id),
      getLatestCampaignReport(params.id),
    ]);

  if (!campaign) notFound();

  const latestSignal = signalReports[0] ?? null;

  // Weekly recommended actions — fallback when no CIR findings
  let weeklyActions: string[] = [];
  if (latestSignal?.ai_recommended_actions && !cir?.findings.length) {
    try {
      weeklyActions = JSON.parse(latestSignal.ai_recommended_actions);
    } catch {
      weeklyActions = [latestSignal.ai_recommended_actions];
    }
  }

  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const overall = latestSignal
    ? overallHealth([
        latestSignal.demand_health,
        latestSignal.nurture_health,
        latestSignal.conversion_health,
      ])
    : null;

  // Clean narrative paragraphs
  const cleanNarrative = latestSignal?.ai_narrative
    ? toParas(stripGateStatusLabel(latestSignal.ai_narrative))
    : [];

  const cleanExecSummary = cir?.executive_summary
    ? toParas(cir.executive_summary)
    : [];

  // ── Signal cards — primary 3 ─────────────────────────────────────────────
  //
  // Each card shows: client label, actual value, target, health badge
  //   Audience Build     → Signal 3 (UGC volume, count)
  //   Content Engagement → Signal 2 (Save rate, %)
  //   Purchase Intent    → Signal 1 (Branded search lift, %)

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
    },
    {
      label: "Content Engagement",
      sub: threshold?.signal_2_label ?? "Content save rate",
      health: latestSignal?.nurture_health as SignalHealth,
      actual: fmt(latestSignal?.signal_2_actual_pct),
      target: fmtTarget(threshold?.signal_2_threshold_pct),
    },
    {
      label: "Purchase Intent",
      sub: threshold?.signal_1_label ?? "Branded search lift",
      health: latestSignal?.conversion_health as SignalHealth,
      actual: fmt(latestSignal?.signal_1_actual_pct),
      target: fmtTarget(threshold?.signal_1_threshold_pct),
    },
  ];

  // ── Supplementary signals — shown only when data entered ─────────────────
  //
  // Signal 2B (Share Rate), Signal 3B (VCR), Signal 4 (Retention)
  // Each is optional — only rendered when actual value exists

  const supplementarySignals = [
    latestSignal?.signal_2b_actual_pct !== null &&
    latestSignal?.signal_2b_actual_pct !== undefined
      ? {
          label: latestSignal.signal_2b_label ?? "Content Share Rate",
          actual: fmt(latestSignal.signal_2b_actual_pct),
          target: fmtTarget(threshold?.signal_2b_target_pct),
          health: latestSignal.signal_2b_health as SignalHealth,
          note: "Content amplification signal",
        }
      : null,
    latestSignal?.signal_3b_actual_pct !== null &&
    latestSignal?.signal_3b_actual_pct !== undefined
      ? {
          label: latestSignal.signal_3b_label ?? "Video Completion Rate",
          actual: fmt(latestSignal.signal_3b_actual_pct),
          target: fmtTarget(threshold?.signal_3b_target_pct),
          health: latestSignal.signal_3b_health as SignalHealth,
          note: "Demand signal — supplementary",
        }
      : null,
    latestSignal?.signal_4_actual_pct !== null &&
    latestSignal?.signal_4_actual_pct !== undefined
      ? {
          label: latestSignal.signal_4_label ?? "Return Visits",
          actual: fmt(latestSignal.signal_4_actual_pct),
          target: fmtTarget(threshold?.signal_4_target_pct),
          health: latestSignal.signal_4_health as SignalHealth,
          note: "Retention — lags campaign activity",
        }
      : null,
  ].filter(Boolean) as {
    label: string;
    actual: string;
    target: string;
    health: SignalHealth;
    note: string;
  }[];

  const weekDate = formatWeekOf(latestSignal?.week_of);
  const campPhase = latestSignal?.campaign_phase;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Dark header ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-6">

          {/* Wordmark + report label */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm tracking-tight">
                ShiftImpact{" "}
                <span className="text-slate-400 font-normal">OS</span>
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
                  Week {latestSignal.week_number}
                  {weekDate ? ` · ${weekDate}` : ""}
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

          {/* Overall health banner */}
          {overall && (
            <div
              className={`mt-5 flex items-center gap-3 px-4 py-3 rounded-lg border ${overallBanner(overall)}`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthDotBg(overall)}`}
              />
              <span className="text-sm font-semibold">
                Campaign is {healthLabel(overall)}
              </span>
              {latestSignal?.pipeline_risk_detected && (
                <span className="ml-1 text-xs font-medium text-amber-300">
                  · Risk factors flagged
                </span>
              )}
              <span className="text-slate-600 text-xs ml-auto">
                {signalReports.length} week
                {signalReports.length !== 1 ? "s" : ""} tracked
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-7 space-y-5">

        {/* ── Campaign Objective (FRAME brief) ─────────────────────────── */}
        {frame?.force && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">
              Campaign Objective
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {frame.force}
            </p>
            {frame.primary_kpi && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                  Primary KPI
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  {frame.primary_kpi}
                </span>
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
                <span className="font-medium text-slate-500">Brand role: </span>
                {bip.brand_role}
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
                Week {latestSignal.week_number}
                {weekDate ? ` · ${weekDate}` : ""}
              </span>
            )}
          </div>

          {!latestSignal ? (
            <div className="px-6 py-5">
              <p className="text-sm text-slate-400">
                No campaign data recorded yet.
              </p>
            </div>
          ) : (
            <>
              {/* Primary signal rows */}
              <div className="divide-y divide-slate-100">
                {primarySignals.map(({ label, sub, health, actual, target }) => (
                  <div
                    key={label}
                    className="px-6 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icon tile */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${healthIconBg(health)}`}
                      >
                        <span
                          className={`w-3 h-3 rounded-full ${healthDotBg(health)}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                      </div>
                    </div>
                    {/* Actual + target + badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      {actual && actual !== "—" && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800">
                            {actual}
                          </p>
                          {target && (
                            <p className="text-xs text-slate-400">{target}</p>
                          )}
                        </div>
                      )}
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${healthBadge(health)}`}
                      >
                        {healthLabel(health)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Supplementary signals — only when data entered */}
              {supplementarySignals.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wide">
                    Additional Signals
                  </p>
                  <div className="space-y-2.5">
                    {supplementarySignals.map((s) => (
                      <div
                        key={s.label}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full ${healthDotBg(s.health)}`}
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-700">
                              {s.label}
                            </span>
                            <span className="text-xs text-slate-400 ml-1.5">
                              · {s.note}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-bold text-slate-700">
                            {s.actual}
                          </span>
                          {s.target && (
                            <span className="text-xs text-slate-400">
                              {s.target}
                            </span>
                          )}
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${healthBadge(s.health)}`}
                          >
                            {healthLabel(s.health)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Week-by-week timeline — only when 2+ weeks */}
              {signalReports.length > 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-3">
                    Weekly timeline
                  </p>
                  <div className="flex items-end gap-3 flex-wrap">
                    {[...signalReports]
                      .sort((a, b) => a.week_number - b.week_number)
                      .map((r) => {
                        const healths = [
                          r.demand_health as SignalHealth,
                          r.nurture_health as SignalHealth,
                          r.conversion_health as SignalHealth,
                        ].filter(Boolean);
                        const weekOverall: SignalHealth = healths.includes("Red")
                          ? "Red"
                          : healths.includes("Amber")
                          ? "Amber"
                          : "Green";
                        const isLatest =
                          r.week_number === latestSignal.week_number;
                        return (
                          <div
                            key={r.id}
                            className="flex flex-col items-center gap-1"
                          >
                            <span
                              className={`rounded-full transition-all ${
                                isLatest
                                  ? "w-4 h-4 ring-2 ring-slate-400 ring-offset-2 ring-offset-slate-50"
                                  : "w-3 h-3"
                              } ${
                                r.flags_suppressed
                                  ? "bg-slate-200"
                                  : healthDotBg(weekOverall)
                              }`}
                              title={`Week ${r.week_number}${
                                r.flags_suppressed
                                  ? " (baseline)"
                                  : ` — ${healthLabel(weekOverall)}`
                              }`}
                            />
                            <span
                              className={`text-xs font-mono ${
                                isLatest
                                  ? "text-slate-700 font-bold"
                                  : "text-slate-300"
                              }`}
                            >
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

        {/* ── CIR Executive Summary ─────────────────────────────────────── */}
        {cleanExecSummary.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Intelligence Summary
              </p>
              {cir && cir.report_week > 0 && (
                <span className="text-xs text-slate-400">
                  Week {cir.report_week}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {cleanExecSummary.map((para, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: weekly AI narrative (gate label stripped) */}
        {!cir?.executive_summary && cleanNarrative.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Campaign Health Read
              </p>
              {latestSignal?.week_number && (
                <span className="text-xs text-slate-400">
                  Week {latestSignal.week_number}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {cleanNarrative.map((para, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed">
                  {para}
                </p>
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
                      <p className="text-sm font-semibold text-slate-900">
                        {f.headline}
                      </p>
                      {f.context && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {f.context}
                        </p>
                      )}
                      {f.implication && (
                        <p className="text-sm text-slate-500 italic leading-relaxed">
                          {f.implication}
                        </p>
                      )}
                      {f.recommendation && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                          <p className="text-sm text-slate-800 leading-relaxed">
                            <span className="font-semibold">
                              Recommendation:{" "}
                            </span>
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
            Powered by{" "}
            <span className="font-medium text-slate-500">ShiftImpact OS</span>
          </span>
          <span className="text-xs text-slate-400">
            Confidential · Signal-led campaign intelligence
          </span>
        </div>

      </div>
    </div>
  );
}
