"use client";
// CstrSection.tsx
// F27 — Consumer State Transition Rate Engine
// Sprint 21 built · Sprint 23 redesign · 18 July 2026
//
// SPRINT 23 CHANGE: Removed manual state distribution input.
// CSTR now auto-populates from the Consumer Behaviour State diagnostic.
// When the strategy lead runs the Behaviour State for a week, the state
// distribution is inferred from diagnosed_state + signal health and
// written directly to consumer_state_readings.
// This section is read-only. No data entry required.
//
// VELOCITY BANDS (Sprint 23 — passive minimums):
//   > +1.0  → Strong
//   +0.3 to +1.0 → On Track
//   -0.3 to +0.3 → Flat — Watch
//   < -0.3  → Regression
//
// STALL THRESHOLD: < 0.3pp (lowered from 0.5pp)
//
// ACCESS RULES:
//   state_distribution, dominant_state, cstr_vs_prior, velocity_score: INTERNAL ONLY
//   state_stall_flag, state_stall_note: INTERNAL ONLY
//   ai_narrative: client-shareable (blue box)

import { useState } from "react";
import { Card, SectionTitle } from "@/app/_components/ui";
import type { ConsumerStateReading } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CstrSectionProps {
  campaignId: string;
  lastReading: ConsumerStateReading | null;
  currentWeek?: number;
}

// ─── State labels — INTERNAL ONLY ────────────────────────────────────────────

const STATE_LABELS: Record<number, { short: string; desc: string }> = {
  1: { short: "Unaware",             desc: "No brand recognition" },
  2: { short: "Aware — Passive",     desc: "Recognises brand, no engagement" },
  3: { short: "Aware — Unconvinced", desc: "No positive associations yet" },
  4: { short: "In Consideration",    desc: "Evaluating vs alternatives" },
  5: { short: "Intent-Active",       desc: "Search, cart, store visits" },
  6: { short: "Post-Purchase",       desc: "Converted — loyalty at stake" },
};

// ─── Velocity helpers (Sprint 23 passive minimum bands) ──────────────────────

function velocityLabel(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1.0)  return "Strong";
  if (v > 0.3)   return "On Track";
  if (v >= -0.3) return "Flat — Watch";
  return "Regression";
}

function velocityTone(v: number | null): string {
  if (v === null)  return "text-neutral-400";
  if (v >= 1.0)   return "text-emerald-600";
  if (v > 0.3)    return "text-emerald-500";
  if (v >= -0.3)  return "text-amber-500";
  return "text-red-500";
}

function velocityBg(v: number | null): string {
  if (v === null)  return "bg-neutral-50";
  if (v > 0.3)    return "bg-emerald-50";
  if (v >= -0.3)  return "bg-amber-50";
  return "bg-red-50";
}

function cstrDeltaStyle(delta: number): string {
  if (delta > 0.3)  return "text-emerald-600 font-medium";
  if (delta < -0.3) return "text-red-500 font-medium";
  return "text-neutral-400";
}

function cstrSignalLabel(delta: number): JSX.Element {
  if (delta > 0.3)  return <span className="text-emerald-500">↑ Forward</span>;
  if (delta < -0.3) return <span className="text-red-400">↓ Regressing</span>;
  return <span className="text-neutral-300">— Flat</span>;
}

// ─── CSTR pair labels ─────────────────────────────────────────────────────────

const CSTR_PAIR_LABELS: Record<string, string> = {
  "1_to_2": "Unaware → Aware",
  "2_to_3": "Aware → Unconvinced",
  "3_to_4": "Unconvinced → Consideration",
  "4_to_5": "Consideration → Intent",
  "5_to_6": "Intent → Post-Purchase",
};

// ─── Reading source badge ─────────────────────────────────────────────────────

function SourceBadge({ source }: { source?: string | null }) {
  if (!source) return null;
  const isAuto = source === "behaviour-state-auto";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
      isAuto
        ? "bg-blue-50 text-blue-400 border border-blue-100"
        : "bg-neutral-50 text-neutral-400 border border-neutral-200"
    }`}>
      {isAuto ? "⟳ Auto" : "✎ Manual"}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CstrSection({
  campaignId,
  lastReading,
  currentWeek = 1,
}: CstrSectionProps) {
  const [showCstrDetail, setShowCstrDetail] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);

  return (
    <section id="consumer-state-transition">
      <SectionTitle>Consumer State Transition Rate (F27) ⚿</SectionTitle>

      <div className="space-y-4">

        {/* Context note */}
        <div className="text-xs text-neutral-400 bg-neutral-50 rounded px-3 py-2 border border-neutral-100">
          <span className="font-medium text-neutral-500">INTERNAL ONLY</span>{" "}
          Auto-populated when the Consumer Behaviour State diagnostic runs each week.
          Requires 2+ weeks of data before transition rates are computed.
          State names and numbers are never shown to clients.
        </div>

        {/* No reading yet */}
        {!lastReading && (
          <Card>
            <div className="py-6 text-center">
              <p className="text-sm text-neutral-500 font-medium">No CSTR data yet</p>
              <p className="text-xs text-neutral-400 mt-1">
                Run the <span className="font-medium text-neutral-500">Consumer Behaviour State</span> diagnostic
                for Week {currentWeek} to auto-populate this section.
              </p>
              <p className="text-xs text-neutral-300 mt-2">
                State distribution is inferred from signal health — no manual input required.
              </p>
            </div>
          </Card>
        )}

        {/* Reading exists */}
        {lastReading && (
          <Card>
            <div className="space-y-4">

              {/* Header row — week + source */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-neutral-500">
                    Week {lastReading.week_number}
                    {lastReading.week_of && (
                      <span className="text-neutral-300 font-normal ml-1">
                        ({lastReading.week_of})
                      </span>
                    )}
                  </p>
                  <SourceBadge source={(lastReading as any).reading_source} />
                </div>
                <p className="text-xs text-neutral-300">
                  Auto-computed from Behaviour State diagnostic
                </p>
              </div>

              {/* Velocity score */}
              <div className={`rounded-lg p-4 ${velocityBg(lastReading.velocity_score)} border border-neutral-100`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      Campaign Velocity Score
                    </p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <p className={`text-2xl font-bold ${velocityTone(lastReading.velocity_score)}`}>
                        {lastReading.velocity_score === null
                          ? "—"
                          : (lastReading.velocity_score > 0 ? "+" : "") + lastReading.velocity_score}
                      </p>
                      <p className={`text-sm font-medium ${velocityTone(lastReading.velocity_score)}`}>
                        {velocityLabel(lastReading.velocity_score)}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {lastReading.velocity_score === null
                        ? "First reading — CSTR rates available from Week 2"
                        : lastReading.velocity_score > 0.3
                        ? "Audience is advancing toward purchase"
                        : lastReading.velocity_score >= -0.3
                        ? "Audience movement is minimal — review signal context"
                        : "Audience is regressing — intervention required"}
                    </p>
                    <p className="text-xs text-neutral-300 mt-1 italic">
                      Benchmarks: passive minimums · recalibrate after 3 campaigns per category
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-neutral-400">Dominant Stage</p>
                    <p className="text-sm font-medium text-neutral-700 mt-0.5">
                      {lastReading.dominant_state
                        ? STATE_LABELS[lastReading.dominant_state]?.short ?? "—"
                        : "—"}
                    </p>
                    <p className="text-xs text-neutral-400">[INTERNAL]</p>
                  </div>
                </div>
              </div>

              {/* Stall warning */}
              {lastReading.state_stall_flag && (
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-700">⚠ Stall Detected [INTERNAL]</p>
                  <p className="text-xs text-amber-600 mt-0.5">{lastReading.state_stall_note}</p>
                  <p className="text-xs text-amber-500 mt-1">
                    4 or more transitions are flat (&lt;0.3pp movement). Strategic intervention required to unlock momentum.
                  </p>
                </div>
              )}

              {/* CSTR breakdown — collapsible, internal */}
              {lastReading.cstr_vs_prior && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCstrDetail(!showCstrDetail)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
                  >
                    {showCstrDetail ? "▾" : "▸"} Transition Rate Breakdown [INTERNAL]
                  </button>

                  {showCstrDetail && (
                    <div className="mt-2 border border-neutral-200 rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200">
                            <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500">
                              Transition Pair
                            </th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-neutral-500">
                              Delta (pp)
                            </th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-neutral-500">
                              Signal
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(lastReading.cstr_vs_prior as Record<string, number>)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([key, delta]) => (
                              <tr key={key} className="border-b border-neutral-100 last:border-0">
                                <td className="px-3 py-2 text-xs text-neutral-600">
                                  {CSTR_PAIR_LABELS[key] ?? key}
                                </td>
                                <td className={`px-3 py-2 text-xs text-right font-mono ${cstrDeltaStyle(delta)}`}>
                                  {delta > 0 ? "+" : ""}{delta}pp
                                </td>
                                <td className="px-3 py-2 text-xs text-right">
                                  {cstrSignalLabel(delta)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-neutral-300 px-3 py-1.5 border-t border-neutral-100">
                        Thresholds: Green ≥ +0.3pp · Flat &lt;±0.3pp · Red ≤ −0.3pp
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Inferred distribution — collapsible, internal */}
              {lastReading.state_distribution && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowDistribution(!showDistribution)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
                  >
                    {showDistribution ? "▾" : "▸"} Inferred State Distribution [INTERNAL]
                  </button>

                  {showDistribution && (
                    <div className="mt-2 border border-neutral-200 rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200">
                            <th className="text-left px-3 py-2 text-xs font-medium text-neutral-400 w-6">#</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500">State</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-neutral-500 w-20">% Audience</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3, 4, 5, 6].map((s) => {
                            const dist = lastReading.state_distribution as Record<string, number>;
                            const pct = dist[String(s)] ?? 0;
                            const isDominant = lastReading.dominant_state === s;
                            return (
                              <tr key={s} className="border-b border-neutral-100 last:border-0">
                                <td className="px-3 py-2 text-xs text-neutral-400">{s}</td>
                                <td className={`px-3 py-2 text-xs ${isDominant ? "font-semibold text-neutral-700" : "text-neutral-500"}`}>
                                  {STATE_LABELS[s].short}
                                  {isDominant && <span className="ml-1.5 text-neutral-300 font-normal">← modal</span>}
                                </td>
                                <td className="px-3 py-2 text-xs text-right font-mono text-neutral-600">
                                  {pct.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="text-xs text-neutral-300 px-3 py-1.5 border-t border-neutral-100">
                        Auto-inferred from diagnosed state + signal health. Not a survey-derived figure.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Narrative — client-shareable */}
              {lastReading.ai_narrative && (
                <div className="bg-blue-50 border border-blue-100 rounded px-4 py-3">
                  <p className="text-xs font-medium text-blue-400 mb-1.5">
                    Audience Progression Narrative
                    <span className="ml-2 font-normal text-blue-300">Client-shareable</span>
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    {lastReading.ai_narrative}
                  </p>
                </div>
              )}

            </div>
          </Card>
        )}

        {/* Prior reading context — show if lastReading is for a prior week */}
        {lastReading && lastReading.week_number < currentWeek && (
          <div className="text-xs text-amber-500 bg-amber-50 border border-amber-100 rounded px-3 py-2">
            Showing Week {lastReading.week_number} reading. Run Consumer Behaviour State for{" "}
            <span className="font-medium">Week {currentWeek}</span> to update CSTR.
          </div>
        )}

      </div>
    </section>
  );
}
