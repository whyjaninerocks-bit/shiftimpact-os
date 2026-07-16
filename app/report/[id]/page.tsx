// app/report/[id]/page.tsx
// PUBLIC — client-facing campaign intelligence report.
// Shows: signal traffic lights, Big Idea, CIR executive summary + findings,
//        latest signal note, gate status.
//
// GOVERNANCE — never exposes:
//   threshold numbers, budget amounts, gate hold duration in days,
//   UGC Authenticity Ratio, CIR confidence ratings,
//   components_used, scopes_resolved, or any internal methodology.

import { notFound } from "next/navigation";
import {
  getCampaign,
  getFrameBrief,
  getBigIdeaPlatform,
  getSignalWeeklyReports,
  getPhaseGates,
  getLatestCampaignReport,
} from "@/lib/data";
import type { SignalHealth, GateDecision } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthLabel(h: SignalHealth): string {
  if (h === "Green") return "On Track";
  if (h === "Amber") return "Watch";
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

function gateColor(d: GateDecision): string {
  if (d === "Open")  return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (d === "Hold")  return "text-amber-700 bg-amber-50 border-amber-200";
  if (d === "Stop")  return "text-red-700 bg-red-50 border-red-200";
  return "text-neutral-500 bg-neutral-50 border-neutral-200";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientReportPage({
  params,
}: {
  params: { id: string };
}) {
  const [campaign, frame, bip, signalReports, gates, cir] = await Promise.all([
    getCampaign(params.id),
    getFrameBrief(params.id),
    getBigIdeaPlatform(params.id),
    getSignalWeeklyReports(params.id),
    getPhaseGates(params.id),
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

        {/* ── Signal Traffic Lights ────────────────────────────────────── */}
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-4">
            Campaign Signals
          </p>

          {!latestSignal ? (
            <p className="text-sm text-neutral-400">No signal data recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Demand",     health: latestSignal.demand_health,     sub: "Awareness & reach momentum" },
                { label: "Nurture",    health: latestSignal.nurture_health,    sub: "Engagement & content resonance" },
                { label: "Conversion", health: latestSignal.conversion_health, sub: "Intent & purchase signal" },
              ].map(({ label, health, sub }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${healthDot(health)}`} />
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{label}</p>
                      <p className="text-xs text-neutral-400">{sub}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${healthColor(health)}`}>
                    {healthLabel(health)}
                  </span>
                </div>
              ))}

              {latestSignal.pipeline_risk_detected && (
                <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Pipeline risk pattern detected — demand signals weakening while conversion holds.
                  Review reach and nurture investment.
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

        {/* If no CIR yet — fall back to latest weekly AI narrative */}
        {!cir?.executive_summary && latestSignal?.ai_narrative && (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-3">
              Intelligence Summary
            </p>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {latestSignal.ai_narrative}
            </p>
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

        {/* ── Gate Status ──────────────────────────────────────────────── */}
        {gates.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-4">
              Campaign Gates
            </p>
            <div className="space-y-2">
              {gates.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <p className="text-sm font-medium text-neutral-700">{g.gate_type}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${gateColor(g.gate_decision)}`}>
                    {g.gate_decision}
                  </span>
                </div>
              ))}
            </div>
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
