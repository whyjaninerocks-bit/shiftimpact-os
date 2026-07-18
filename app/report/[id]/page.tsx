// app/report/[id]/page.tsx
// PUBLIC — client-facing campaign intelligence report.
// Shows: Campaign Progress (renamed traffic lights + week-by-week timeline),
//        Big Idea, AI health read, recommended actions, CIR findings.
//
// GOVERNANCE — never exposes:
//   Gate status / gate_status field, threshold numbers, budget amounts,
//   signal methodology names (S1/S2/S3), gate hold duration in days,
//   UGC Authenticity Ratio, CIR confidence ratings,
//   components_used, scopes_resolved, pipeline risk label, or any internal methodology.
//
// Client-facing signal label mapping:
//   Demand     → Audience Build
//   Nurture    → Content Engagement
//   Conversion → Purchase Intent

import { notFound } from "next/navigation";
import {
  getCampaign,
  getFrameBrief,
  getBigIdeaPlatform,
  getSignalWeeklyReports,
  getLatestCampaignReport,
} from "@/lib/data";
import type { SignalHealth } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthLabel(h: SignalHealth): string {
  if (h === "Green") return "On Track";
  if (h === "Amber") return "Building";
  return "Needs Attention";
}

function healthColor(h: SignalHealth): string {
  if (h === "Green") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (h === "Amber") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function healthDot(h: SignalHealth): string {
  if (h === "Green") return "bg-emerald-500";
  if (h === "Amber") return "bg-amber-400";
  return "bg-red-500";
}

// Strip internal "Gate Status: ..." first line from AI narrative before showing clients.
// The narrative is saved as `${gateStatusLabel}\n\n${narrative}` — the first line is internal.
function stripGateStatusLabel(narrative: string): string {
  const lines = narrative.split("\n");
  // Gate status label always starts with "Gate Status:"
  if (lines[0]?.startsWith("Gate Status:")) {
    return lines.slice(1).join("\n").trimStart();
  }
  return narrative;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientReportPage({
  params,
}: {
  params: { id: string };
}) {
  const [campaign, , bip, signalReports, cir] = await Promise.all([
    getCampaign(params.id),
    getFrameBrief(params.id),
    getBigIdeaPlatform(params.id),
    getSignalWeeklyReports(params.id),
    getLatestCampaignReport(params.id),
  ]);

  if (!campaign) notFound();

  const latestSignal = signalReports[0] ?? null;

  // Weekly recommended actions — used only when no CIR findings exist
  let weeklyActions: string[] = [];
  if (latestSignal?.ai_recommended_actions && !cir?.findings.length) {
    try {
      weeklyActions = JSON.parse(latestSignal.ai_recommended_actions);
    } catch {
      weeklyActions = [latestSignal.ai_recommended_actions];
    }
  }

  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-bold tracking-tight text-lg">
            ShiftImpact <span className="text-neutral-400 font-normal">OS</span>
          </span>
          <span className="text-xs text-neutral-400">{reportDate}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">

        {/* ── Campaign header ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-1">
                Campaign Intelligence Report
              </p>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                {campaign.name}
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5">{campaign.client_name}</p>
            </div>
            <span className="shrink-0 ml-4 mt-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-900 text-white">
              {campaign.phase ?? "Active"}
            </span>
          </div>
        </div>

        {/* ── Big Idea — only shown when BIP topline_idea is set ──────── */}
        {bip?.topline_idea && (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-3">
              Campaign Idea
            </p>
            <blockquote className="text-base font-semibold text-neutral-900 leading-snug border-l-4 border-neutral-900 pl-4 mb-3">
              {bip.topline_idea}
            </blockquote>
            {bip?.brand_role && (
              <p className="text-xs text-neutral-400 mt-2">
                <span className="font-medium text-neutral-500">Brand role:</span> {bip.brand_role}
              </p>
            )}
          </div>
        )}

        {/* ── Campaign Progress ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">
              Campaign Progress
            </p>
            {latestSignal && (
              <span className="text-xs text-neutral-400">
                Week {latestSignal.week_number}
              </span>
            )}
          </div>

          {!latestSignal ? (
            <p className="text-sm text-neutral-400">No campaign data recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {/* Current week traffic lights — client-safe labels */}
              <div className="space-y-3">
                {[
                  {
                    label: "Audience Build",
                    health: latestSignal.demand_health as SignalHealth,
                    sub: "Is the campaign reaching and building the right audience?",
                  },
                  {
                    label: "Content Engagement",
                    health: latestSignal.nurture_health as SignalHealth,
                    sub: "Is the content resonating and building genuine interest?",
                  },
                  {
                    label: "Purchase Intent",
                    health: latestSignal.conversion_health as SignalHealth,
                    sub: "Are people moving toward a purchase decision?",
                  },
                ].map(({ label, health, sub }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthDot(health)}`} />
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">{label}</p>
                        <p className="text-xs text-neutral-400">{sub}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ml-3 ${healthColor(health)}`}
                    >
                      {healthLabel(health)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Week-by-week timeline dots */}
              {signalReports.length > 1 && (
                <div className="pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-400 mb-2.5">Weekly progress</p>
                  <div className="flex items-end gap-3 flex-wrap">
                    {[...signalReports]
                      .sort((a, b) => a.week_number - b.week_number)
                      .map((r) => {
                        // Derive an overall health for the week:
                        // Any Red = Red, any Amber = Amber, all Green = Green
                        const healths = [
                          r.demand_health as SignalHealth,
                          r.nurture_health as SignalHealth,
                          r.conversion_health as SignalHealth,
                        ].filter(Boolean);
                        const overall: SignalHealth = healths.includes("Red")
                          ? "Red"
                          : healths.includes("Amber")
                          ? "Amber"
                          : "Green";
                        const isLatest = r.week_number === latestSignal.week_number;
                        return (
                          <div key={r.id} className="flex flex-col items-center gap-1">
                            <span
                              className={`rounded-full border-2 transition-all ${
                                isLatest ? "w-4 h-4 border-neutral-700" : "w-3 h-3 border-transparent"
                              } ${
                                r.flags_suppressed
                                  ? "bg-neutral-200"
                                  : healthDot(overall)
                              }`}
                              title={`Week ${r.week_number}${r.flags_suppressed ? " (establishing baseline)" : ` — ${healthLabel(overall)}`}`}
                            />
                            <span className={`text-xs font-mono ${isLatest ? "text-neutral-700 font-bold" : "text-neutral-300"}`}>
                              W{r.week_number}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    {signalReports.length} week{signalReports.length !== 1 ? "s" : ""} tracked
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Campaign Intelligence Report — Executive Summary ─────────── */}
        {cir?.executive_summary && (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">
                Intelligence Summary
              </p>
              {cir.report_week > 0 && (
                <span className="text-xs text-neutral-400">Week {cir.report_week}</span>
              )}
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
              {cir.executive_summary}
            </p>
          </div>
        )}

        {/* If no CIR yet — fall back to latest weekly AI narrative (gate label stripped) */}
        {!cir?.executive_summary && latestSignal?.ai_narrative && (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">
                Campaign Health Read
              </p>
              {latestSignal.week_number && (
                <span className="text-xs text-neutral-400">Week {latestSignal.week_number}</span>
              )}
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {stripGateStatusLabel(latestSignal.ai_narrative)}
            </p>
            {latestSignal.ai_phase_context && (
              <p className="text-xs text-neutral-400 mt-2 italic">
                {latestSignal.ai_phase_context}
              </p>
            )}
          </div>
        )}

        {/* ── Intelligence Findings (CIR — client-safe) ────────────────── */}
        {cir && cir.findings.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-4">
              Intelligence Findings
            </p>
            <div className="space-y-5">
              {cir.findings.map((f, i) => (
                <div key={f.query_id || i} className="space-y-1.5 pb-5 border-b border-neutral-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm font-semibold text-neutral-900">{f.headline}</p>
                  </div>
                  {f.context && (
                    <p className="text-sm text-neutral-700 leading-relaxed">{f.context}</p>
                  )}
                  {f.implication && (
                    <p className="text-sm text-neutral-500 italic leading-relaxed">{f.implication}</p>
                  )}
                  {f.recommendation && (
                    <p className="text-sm text-neutral-800 leading-relaxed">
                      <span className="font-medium">Recommendation:</span> {f.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* If no CIR findings — fall back to weekly recommended actions */}
        {weeklyActions.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-3">
              Recommended Actions
            </p>
            <ol className="space-y-2">
              {weeklyActions.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm text-neutral-700">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-neutral-400 pb-4">
          Powered by ShiftImpact OS · Signal-led campaign intelligence · Confidential
        </p>

      </div>
    </div>
  );
}
