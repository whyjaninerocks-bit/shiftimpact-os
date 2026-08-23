"use client";

// Agency portal view — /portal/[id]?view=agency
// Full intelligence dashboard for the agency before they release to brand client.
// Visual language matches /portal/demo: dark sidebar + light main.
// Agency priorities: signals → gate → intelligence findings → write note → release.

import { useState, useCallback } from "react";
import type { CampaignOverview, SignalWeeklyReport, PhaseGate, SignalHealth, FrameBrief } from "@/lib/types";
import type { CampaignReportClientView, CampaignReportClientFinding } from "@/lib/data";

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({
  values,
  gate,
  color = "#34d399",
  height = 56,
}: {
  values: number[];
  gate?: number;
  color?: string;
  height?: number;
}) {
  if (values.length < 2) return null;
  const allVals = [...values, ...(gate !== undefined ? [gate] : [])];
  const min = Math.min(...allVals) * 0.92;
  const max = Math.max(...allVals) * 1.08;
  const range = max - min || 1;
  const W = 200,
    H = height,
    px = 6,
    py = height > 80 ? 14 : 8;
  const x = (i: number) => px + (i / (values.length - 1)) * (W - px * 2);
  const y = (v: number) => H - py - ((v - min) / range) * (H - py * 2);
  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(values.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`;
  const gateY = gate !== undefined ? y(gate) : null;
  const gradId = `ag-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      {gateY !== null && (
        <line
          x1={px}
          y1={gateY}
          x2={W - px}
          y2={gateY}
          stroke="#f87171"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          strokeOpacity="0.9"
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === values.length - 1 ? 4.5 : 3}
          fill={i === values.length - 1 ? color : "white"}
          stroke={color}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthColor(h: SignalHealth) {
  return h === "Green" ? "#10b981" : h === "Amber" ? "#f59e0b" : "#ef4444";
}

function healthBg(h: SignalHealth) {
  return h === "Green"
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : h === "Amber"
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-red-50 text-red-800 border-red-200";
}

function postureColor(p: string | null) {
  if (!p) return "text-neutral-400";
  return p === "Gaining"
    ? "text-emerald-400"
    : p === "Plateauing"
    ? "text-amber-300"
    : "text-red-400";
}

function SectionQ({
  q,
  label,
  children,
}: {
  q: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="bg-neutral-900 rounded-2xl px-5 py-4 mb-6 flex items-center gap-4">
        <span className="text-3xl sm:text-4xl font-black text-white/15 leading-none shrink-0">
          {q}
        </span>
        <div className="w-px h-8 bg-white/15 shrink-0" />
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function FindingCard({
  index,
  finding,
}: {
  index: number;
  finding: CampaignReportClientFinding;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-4">
          <span className="w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </span>
          <div className="flex-1">
            <p className="text-base font-bold text-neutral-900 leading-snug">{finding.headline}</p>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{finding.implication}</p>
          </div>
        </div>
      </div>
      {finding.recommendation && (
        <div className="px-6 pb-5">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {open ? "Hide recommendation" : "See recommendation →"}
          </button>
          {open && (
            <div className="mt-3 rounded-xl bg-neutral-900 px-5 py-4">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
                → Recommended action
              </p>
              <p className="text-sm text-neutral-200 leading-relaxed">{finding.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AgencyPortalViewProps {
  campaign: CampaignOverview;
  report: CampaignReportClientView | null;
  signalReports: SignalWeeklyReport[];
  phaseGates: PhaseGate[];
  frame: FrameBrief | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgencyPortalView({
  campaign,
  report,
  signalReports,
  phaseGates,
  frame,
}: AgencyPortalViewProps) {
  // signalReports comes in desc order (newest first) — reverse for sparkline
  const signalAsc = [...signalReports].reverse();
  const latest = signalReports[0] ?? null;

  // Sparkline series
  const saveValues = signalAsc
    .map((r) => r.signal_2_actual_pct)
    .filter((v): v is number => v !== null);
  const searchValues = signalAsc
    .map((r) => r.signal_1_actual_pct)
    .filter((v): v is number => v !== null);

  // Health score — use confidence_score as the composite proxy
  const healthScore = Math.round(campaign.confidence_score ?? 0);

  // Posture from report, fallback to gate_status derived
  const posture = report?.risk_posture ?? (latest?.gate_status === "Green" ? "Gaining" : latest?.gate_status === "Amber" ? "Plateauing" : null);

  const hasAgencyPreview = !!report?.agency_preview_at;
  const isReleased = !!report?.client_released_at;

  // Gate info
  const completedGates = phaseGates.filter((g) => g.gate_decision === "Open");
  const nextGate = phaseGates.find((g) => g.gate_decision !== "Open");

  // ─── Agency note editor state ─────────────────────────────────────────────
  const [agencyNote, setAgencyNote] = useState(report?.agency_note ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteStatus, setNoteStatus] = useState<"idle" | "saved" | "error">("idle");

  const saveNote = useCallback(async () => {
    if (!report) return;
    setNoteSaving(true);
    setNoteStatus("idle");
    try {
      const res = await fetch(`/api/campaign-report/${report.id}/save-agency-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: agencyNote }),
      });
      setNoteStatus(res.ok ? "saved" : "error");
    } catch {
      setNoteStatus("error");
    } finally {
      setNoteSaving(false);
    }
  }, [report, agencyNote]);

  // ─── Release state ────────────────────────────────────────────────────────
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(isReleased);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const doRelease = useCallback(async () => {
    if (!report) return;
    setReleasing(true);
    setReleaseError(null);
    try {
      const res = await fetch(`/api/campaign-report/${report.id}/release-to-client`, {
        method: "POST",
      });
      if (res.ok) {
        setReleased(true);
        setConfirmRelease(false);
      } else {
        const body = await res.json().catch(() => ({}));
        setReleaseError(body?.error ?? "Release failed — try again.");
      }
    } catch {
      setReleaseError("Network error — try again.");
    } finally {
      setReleasing(false);
    }
  }, [report]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex">

      {/* ════════════════════════ SIDEBAR ═══════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[360px] xl:w-[420px] shrink-0 fixed top-0 left-0 h-screen bg-neutral-900 text-white overflow-y-auto z-20">

        {/* Logo + context */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
            Agency view
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">ShiftImpact OS · Intelligence Report</p>
        </div>

        {/* Campaign identity */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-medium text-neutral-400 mb-1">{campaign.client_name} · {campaign.industry_profile}</p>
          <p className="text-lg font-bold leading-tight text-white">{campaign.name}</p>
          <p className="text-sm text-neutral-400 mt-1.5">
            {campaign.current_phase} phase
          </p>
        </div>

        {/* Health ring */}
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-5">
          <div className="relative w-[88px] h-[88px] shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke={healthScore >= 70 ? "#34d399" : healthScore >= 55 ? "#f59e0b" : "#f87171"}
                strokeWidth="6"
                strokeDasharray={`${(healthScore / 100) * (2 * Math.PI * 32)} ${2 * Math.PI * 32}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-black ${healthScore >= 70 ? "text-emerald-400" : healthScore >= 55 ? "text-amber-400" : "text-red-400"}`}>
                {healthScore}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">
              Signal confidence
            </p>
            {posture && (
              <p className={`text-2xl font-black ${postureColor(posture)}`}>{posture}</p>
            )}
            {latest && (
              <p className="text-xs text-neutral-400 mt-1">Week {latest.week_number} · {new Date(latest.week_of).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</p>
            )}
          </div>
        </div>

        {/* Week timeline */}
        {signalReports.length > 0 && (
          <div className="px-4 py-4 border-b border-white/10">
            <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold px-1 mb-2">
              Week history
            </p>
            <div className="space-y-0.5">
              {signalReports.map((w) => {
                const dotColor =
                  w.gate_status === "Green"
                    ? "bg-emerald-500"
                    : w.gate_status === "Amber"
                    ? "bg-amber-500"
                    : "bg-red-500";
                const isCurrent = w === signalReports[0];
                return (
                  <div
                    key={w.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${isCurrent ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                    <span className="text-xs font-semibold text-white">
                      Wk {w.week_number}
                    </span>
                    <span className="text-xs text-neutral-400 flex-1">
                      {new Date(w.week_of).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                    </span>
                    <span className={`text-xs font-semibold ${
                      w.gate_status === "Green" ? "text-emerald-400" : w.gate_status === "Amber" ? "text-amber-400" : "text-red-400"
                    }`}>
                      {w.gate_status}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 ml-1">
                        now
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Signal mini-cards */}
        <div className="px-4 py-4 space-y-3">
          {saveValues.length >= 2 && (
            <div className="bg-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                  Save Rate
                </p>
                <div className="text-right">
                  <span className="text-xl font-black text-amber-400">
                    {saveValues[saveValues.length - 1].toFixed(1)}%
                  </span>
                  {saveValues.length >= 2 && (
                    <span className="text-xs text-neutral-500 ml-1">
                      {(saveValues[saveValues.length - 1] - saveValues[saveValues.length - 2]) >= 0 ? "+" : ""}
                      {(saveValues[saveValues.length - 1] - saveValues[saveValues.length - 2]).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <Sparkline values={saveValues} gate={8} color="#f59e0b" height={56} />
              <p className="text-[10px] text-neutral-500 mt-1">Gate ≥8%</p>
            </div>
          )}

          {searchValues.length >= 2 && (
            <div className="bg-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                  Brand Search
                </p>
                <div className="text-right">
                  <span className="text-xl font-black text-indigo-400">
                    {searchValues[searchValues.length - 1].toFixed(1)}%
                  </span>
                  {searchValues.length >= 2 && (
                    <span className="text-xs text-neutral-500 ml-1">
                      {(searchValues[searchValues.length - 1] - searchValues[searchValues.length - 2]) >= 0 ? "+" : ""}
                      {(searchValues[searchValues.length - 1] - searchValues[searchValues.length - 2]).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <Sparkline values={searchValues} color="#818cf8" height={56} />
            </div>
          )}

          {/* Gate convergence */}
          {latest && (
            <div className="bg-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                  Gate signals
                </p>
                <span className={`text-xl font-black ${
                  latest.gate_status === "Green" ? "text-emerald-400" : latest.gate_status === "Amber" ? "text-amber-400" : "text-red-400"
                }`}>
                  {latest.gate_signals_converging} / 3
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed line-clamp-2">
                {latest.gate_note || "Gate status pending signal data."}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ════════════════════════ MAIN ══════════════════════════════════════ */}
      <main className="w-full lg:pl-[360px] xl:pl-[420px]">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10">

          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold tracking-tight">
              ShiftImpact <span className="text-neutral-400 font-normal text-sm">OS</span>
            </span>
            <span className="text-xs text-neutral-400">{campaign.client_name} · Agency</span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <p className="text-xs text-neutral-400 mb-0.5">{campaign.client_name}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="text-sm text-neutral-500 mt-1">{campaign.current_phase} phase · Agency intelligence view</p>
          </div>

          {/* Agency status banner */}
          {!hasAgencyPreview ? (
            <div className="mb-8 rounded-xl bg-neutral-100 border border-neutral-200 px-4 py-3 flex items-start gap-2.5">
              <span className="text-neutral-400 text-sm shrink-0 mt-0.5">○</span>
              <div>
                <p className="text-xs font-semibold text-neutral-700">Not yet sent for agency preview</p>
                <p className="text-xs text-neutral-500 mt-0.5">Send from the OS to give this agency access to the intelligence report.</p>
              </div>
            </div>
          ) : released ? (
            <div className="mb-8 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-2.5">
              <span className="text-emerald-500 text-sm shrink-0 mt-0.5">✓</span>
              <div>
                <p className="text-xs font-semibold text-emerald-800">Released to brand client</p>
                <p className="text-xs text-emerald-700 mt-0.5">The brand client now has access to this report and your narrative note.</p>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-2.5">
              <span className="text-blue-500 text-sm shrink-0 mt-0.5">⏳</span>
              <div>
                <p className="text-xs font-semibold text-blue-800">Agency preview — not yet released to brand client</p>
                <p className="text-xs text-blue-700 mt-0.5">Review the intelligence below. Add your narrative note, then release when ready.</p>
              </div>
            </div>
          )}

          {/* ── Q1: What do the signals say? ── */}
          {latest && (
            <SectionQ q="01" label="What do the signals say?">
              <div className="space-y-4">
                {/* Gate status topline */}
                <div className="rounded-2xl border bg-white shadow-sm px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold mb-1">
                        Gate signal status
                      </p>
                      <p className={`text-2xl font-black ${
                        latest.gate_status === "Green" ? "text-emerald-600" : latest.gate_status === "Amber" ? "text-amber-600" : "text-red-600"
                      }`}>
                        {latest.gate_status === "Green" ? "Gate open" : latest.gate_status === "Amber" ? "Gate approaching" : "Gate closed"}
                      </p>
                      {latest.gate_note && (
                        <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{latest.gate_note}</p>
                      )}
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${healthBg(latest.gate_status)}`}>
                      {latest.gate_signals_converging} / 3 signals
                    </span>
                  </div>

                  {/* Signal health row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Demand", value: latest.demand_health },
                      { label: "Nurture", value: latest.nurture_health },
                      { label: "Conversion", value: latest.conversion_health },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-neutral-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-2">{label}</p>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: healthColor(value) }} />
                          <span className={`text-sm font-bold ${
                            value === "Green" ? "text-emerald-700" : value === "Amber" ? "text-amber-700" : "text-red-700"
                          }`}>
                            {value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signal readings */}
                {(latest.signal_1_actual_pct !== null || latest.signal_2_actual_pct !== null || latest.signal_3_actual_count !== null) && (
                  <div className="rounded-2xl border bg-white shadow-sm px-6 py-5">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">Signal readings — week {latest.week_number}</p>
                    <div className="space-y-3">
                      {latest.signal_1_actual_pct !== null && (
                        <div className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                          <div>
                            <p className="text-sm font-semibold text-neutral-800">Brand Search Share (S1)</p>
                            <p className="text-xs text-neutral-400">Share of search — demand creation signal</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-neutral-900">{latest.signal_1_actual_pct.toFixed(1)}%</p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              latest.conversion_health === "Green" ? "text-emerald-600" : latest.conversion_health === "Amber" ? "text-amber-600" : "text-red-600"
                            }`}>{latest.conversion_health}</span>
                          </div>
                        </div>
                      )}
                      {latest.signal_2_actual_pct !== null && (
                        <div className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                          <div>
                            <p className="text-sm font-semibold text-neutral-800">Content Save Rate (S2)</p>
                            <p className="text-xs text-neutral-400">Purchase intent proxy — nurture signal</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-neutral-900">{latest.signal_2_actual_pct.toFixed(1)}%</p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              latest.nurture_health === "Green" ? "text-emerald-600" : latest.nurture_health === "Amber" ? "text-amber-600" : "text-red-600"
                            }`}>{latest.nurture_health}</span>
                          </div>
                        </div>
                      )}
                      {latest.signal_3_actual_count !== null && (
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-semibold text-neutral-800">UGC Volume (S3)</p>
                            <p className="text-xs text-neutral-400">Organic amplification — demand signal</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-neutral-900">{latest.signal_3_actual_count} pcs</p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              latest.demand_health === "Green" ? "text-emerald-600" : latest.demand_health === "Amber" ? "text-amber-600" : "text-red-600"
                            }`}>{latest.demand_health}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* WA echo event */}
                {latest.wa_echo_event && (
                  <div className="rounded-2xl bg-violet-50 border border-violet-200 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-violet-600 font-bold">◈</span>
                      <p className="text-sm font-semibold text-violet-900">WA Echo Event detected this week</p>
                    </div>
                    <p className="text-xs text-violet-700 mt-1 leading-relaxed">
                      S2 and S3 converged — content is being saved and shared, indicating WA channel amplification. Direct traffic sessions: {latest.direct_traffic_sessions ?? "not tracked"}.
                    </p>
                  </div>
                )}
              </div>
            </SectionQ>
          )}

          {/* ── Q2: What actions are needed? ── */}
          {report && report.findings.length > 0 && (
            <SectionQ q="02" label="What actions are needed?">
              {report.executive_summary && (
                <div className="bg-neutral-900 rounded-2xl px-5 py-4 mb-5">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Strategic summary</p>
                  <p className="text-sm text-neutral-200 leading-relaxed">{report.executive_summary}</p>
                  {report.risk_posture && (
                    <span className={`mt-3 inline-block text-xs font-semibold px-3 py-1 rounded-full border ${
                      report.risk_posture === "Gaining"
                        ? "bg-emerald-900/50 text-emerald-300 border-emerald-700"
                        : report.risk_posture === "Plateauing"
                        ? "bg-amber-900/50 text-amber-300 border-amber-700"
                        : "bg-red-900/50 text-red-300 border-red-700"
                    }`}>
                      Brand posture: {report.risk_posture}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-4">
                {report.findings.map((f, i) => (
                  <FindingCard key={f.query_id || i} index={i} finding={f} />
                ))}
              </div>
            </SectionQ>
          )}

          {/* ── Q3: Where is the gate? ── */}
          {phaseGates.length > 0 && (
            <SectionQ q="03" label="Where is the gate?">
              <div className="space-y-3">
                {nextGate && (
                  <div className="rounded-2xl border bg-white shadow-sm px-6 py-5">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-amber-600 text-sm font-bold">→</span>
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Next gate</p>
                        <p className="text-base font-bold text-neutral-900">{nextGate.gate_type}</p>
                        {nextGate.required_signal && (
                          <p className="text-xs text-neutral-500 mt-1">{nextGate.required_signal}</p>
                        )}
                        {nextGate.pre_mortem && (
                          <p className="text-xs text-amber-700 mt-2 leading-relaxed border-t border-neutral-100 pt-2">{nextGate.pre_mortem}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {completedGates.length > 0 && (
                  <div className="rounded-2xl border bg-white shadow-sm divide-y divide-neutral-100">
                    <div className="px-6 py-3">
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Completed gates</p>
                    </div>
                    {completedGates.map((g) => (
                      <div key={g.id} className="px-6 py-3 flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="text-emerald-600 text-xs font-bold">✓</span>
                        </span>
                        <span className="text-sm text-neutral-700 font-medium">{g.gate_type}</span>
                        {g.decided_at && (
                          <span className="text-xs text-neutral-400 ml-auto">
                            {new Date(g.decided_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* AI narrative for agency */}
                {latest?.ai_phase_context && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/40 px-6 py-5">
                    <p className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-2">Phase intelligence</p>
                    <p className="text-sm text-violet-900 leading-relaxed">{latest.ai_phase_context}</p>
                  </div>
                )}
              </div>
            </SectionQ>
          )}

          {/* ── Agency note editor ── */}
          {hasAgencyPreview && !released && report && (
            <SectionQ q="04" label="Add your narrative note">
              <div className="rounded-2xl border bg-white shadow-sm px-6 py-5">
                <p className="text-xs text-neutral-500 leading-relaxed mb-4">
                  Write a note to accompany this report for the brand client. This appears as a highlighted callout at the top of their portal view.
                </p>
                <textarea
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none leading-relaxed transition"
                  rows={5}
                  placeholder="E.g. Save rate is building toward the gate — expect Phase 2 unlock within 2 weeks if this week's creative brief is actioned. No cause for concern from our side."
                  value={agencyNote}
                  onChange={(e) => {
                    setAgencyNote(e.target.value);
                    setNoteStatus("idle");
                  }}
                />
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs font-medium transition ${
                    noteStatus === "saved" ? "text-emerald-600" : noteStatus === "error" ? "text-red-600" : "text-transparent"
                  }`}>
                    {noteStatus === "saved" ? "✓ Note saved" : noteStatus === "error" ? "Save failed — try again" : "·"}
                  </span>
                  <button
                    onClick={saveNote}
                    disabled={noteSaving}
                    className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-700 disabled:opacity-50 transition"
                  >
                    {noteSaving ? "Saving…" : "Save note"}
                  </button>
                </div>
              </div>
            </SectionQ>
          )}

          {/* Show saved note (read-only) if already released */}
          {released && report?.agency_note && (
            <div className="mb-10">
              <div className="rounded-2xl bg-blue-50 border border-blue-200 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">Your narrative note (sent to brand client)</p>
                <p className="text-sm text-blue-900 leading-relaxed">{agencyNote || report.agency_note}</p>
              </div>
            </div>
          )}

          {/* ── Release to brand client ── */}
          {hasAgencyPreview && !released && report && (
            <div className="mb-10 rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-6 text-center">
              {!confirmRelease ? (
                <>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Ready to release to brand client?</p>
                  <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                    The brand client will receive email access to this report along with your narrative note.
                  </p>
                  <button
                    onClick={() => setConfirmRelease(true)}
                    className="px-6 py-3 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition"
                  >
                    Release to brand client →
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-neutral-800 mb-1">Confirm release</p>
                  <p className="text-xs text-neutral-500 mb-4">
                    This will email the brand client and give them portal access. You cannot un-release.
                  </p>
                  {releaseError && (
                    <p className="text-xs text-red-600 mb-3">{releaseError}</p>
                  )}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setConfirmRelease(false)}
                      className="px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={doRelease}
                      disabled={releasing}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {releasing ? "Releasing…" : "Yes, release now"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Active channels */}
          {frame?.active_channels && frame.active_channels.length > 0 && (
            <div className="mb-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Active channels</p>
              <div className="flex flex-wrap gap-2">
                {frame.active_channels.map((ch) => (
                  <span key={ch} className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium">
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mobile signal summary */}
          {latest && (
            <div className="lg:hidden mb-10 rounded-2xl bg-neutral-900 text-white px-5 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Signal confidence</p>
                  <p className={`text-3xl font-black mt-0.5 ${healthScore >= 70 ? "text-emerald-400" : healthScore >= 55 ? "text-amber-400" : "text-red-400"}`}>
                    {healthScore}
                  </p>
                </div>
                {posture && (
                  <p className={`text-xl font-black ${postureColor(posture)}`}>{posture}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                {[
                  { label: "Demand", value: latest.demand_health },
                  { label: "Nurture", value: latest.nurture_health },
                  { label: "Conversion", value: latest.conversion_health },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] text-neutral-400 mb-1">{label}</p>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: healthColor(value) }} />
                    <p className={`text-xs font-bold mt-0.5 ${
                      value === "Green" ? "text-emerald-400" : value === "Amber" ? "text-amber-400" : "text-red-400"
                    }`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-neutral-200 text-xs text-neutral-400">
            ShiftImpact OS · Agency view · {campaign.client_name}
          </div>
        </div>
      </main>
    </div>
  );
}
