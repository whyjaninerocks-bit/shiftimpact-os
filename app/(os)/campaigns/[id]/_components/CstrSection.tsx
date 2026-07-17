"use client";
// CstrSection.tsx
// F27 — Consumer State Transition Rate Engine
// Sprint 21 · 18 July 2026
//
// Allows the strategy lead to enter weekly audience state distribution (%)
// and computes Consumer State Transition Rates vs the prior week.
//
// ACCESS RULES:
//   state_distribution, dominant_state, cstr_vs_prior, velocity_score: INTERNAL ONLY
//   state_stall_flag, state_stall_note: INTERNAL ONLY
//   ai_narrative: client-shareable (blue box)
//
// State names and numbers are NEVER shown in client-facing output.
// This section is for strategy leads only.

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
// These labels are shown to the strategy lead (Janine) only.
// They must NEVER appear in client-facing output.

const STATE_LABELS: Record<number, { short: string; desc: string }> = {
  1: { short: "Unaware",             desc: "No brand recognition" },
  2: { short: "Aware — Passive",     desc: "Recognises brand, no engagement" },
  3: { short: "Aware — Unconvinced", desc: "No positive associations yet" },
  4: { short: "In Consideration",    desc: "Evaluating vs alternatives" },
  5: { short: "Intent-Active",       desc: "Search, cart, store visits" },
  6: { short: "Post-Purchase",       desc: "Converted — loyalty at stake" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function velocityTone(v: number | null): string {
  if (v === null) return "text-neutral-400";
  if (v > 1)   return "text-emerald-600";
  if (v > 0)   return "text-emerald-500";
  if (v === 0) return "text-neutral-500";
  if (v >= -1) return "text-amber-500";
  return "text-red-500";
}

function velocityBg(v: number | null): string {
  if (v === null) return "bg-neutral-50";
  if (v > 0)  return "bg-emerald-50";
  if (v < 0)  return "bg-red-50";
  return "bg-neutral-50";
}

function cstrDeltaStyle(delta: number): string {
  if (delta > 0.5) return "text-emerald-600 font-medium";
  if (delta < -0.5) return "text-red-500 font-medium";
  return "text-neutral-400";
}

function pctSum(dist: Record<string, string>): number {
  return Object.values(dist).reduce((a, b) => a + (parseFloat(b) || 0), 0);
}

// ─── CSTR pair labels ─────────────────────────────────────────────────────────

const CSTR_PAIR_LABELS: Record<string, string> = {
  "1_to_2": "Unaware → Aware",
  "2_to_3": "Aware → Unconvinced",
  "3_to_4": "Unconvinced → Consideration",
  "4_to_5": "Consideration → Intent",
  "5_to_6": "Intent → Post-Purchase",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function CstrSection({
  campaignId,
  lastReading,
  currentWeek = 1,
}: CstrSectionProps) {
  // Form state
  const [weekNumber, setWeekNumber] = useState(String(currentWeek));
  const [weekOf, setWeekOf] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday of current week
    return d.toISOString().slice(0, 10);
  });
  const [stateDist, setStateDist] = useState<Record<string, string>>({
    "1": "", "2": "", "3": "", "4": "", "5": "", "6": "",
  });

  // Result state
  const [result, setResult] = useState<{
    velocity_score: number | null;
    state_stall_flag: boolean;
    state_stall_note: string;
    cstr_vs_prior: Record<string, number> | null;
    dominant_state: number | null;
    ai_narrative: string;
  } | null>(lastReading ? {
    velocity_score: lastReading.velocity_score,
    state_stall_flag: lastReading.state_stall_flag,
    state_stall_note: lastReading.state_stall_note,
    cstr_vs_prior: lastReading.cstr_vs_prior,
    dominant_state: lastReading.dominant_state,
    ai_narrative: lastReading.ai_narrative,
  } : null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCstrDetail, setShowCstrDetail] = useState(false);

  const totalPct = pctSum(stateDist);
  const pctOk = Math.abs(totalPct - 100) <= 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Convert string inputs to numbers
    const distribution: Record<string, number> = {};
    for (const [k, v] of Object.entries(stateDist)) {
      distribution[k] = parseFloat(v) || 0;
    }

    try {
      const res = await fetch("/api/consumer-state-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          week_number: parseInt(weekNumber, 10),
          week_of: weekOf,
          state_distribution: distribution,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to compute CSTR");
        return;
      }

      setResult({
        velocity_score: json.velocity_score,
        state_stall_flag: json.state_stall_flag,
        state_stall_note: json.state_stall_note,
        cstr_vs_prior: json.cstr_vs_prior,
        dominant_state: json.dominant_state,
        ai_narrative: json.ai_narrative,
      });
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="consumer-state-transition">
      <SectionTitle>Consumer State Transition Rate (F27) ⚿</SectionTitle>

      <div className="space-y-4">
        {/* Context note */}
        <div className="text-xs text-neutral-400 bg-neutral-50 rounded px-3 py-2 border border-neutral-100">
          <span className="font-medium text-neutral-500">INTERNAL ONLY</span> — State names and numbers are never shown to clients.
          Enter weekly alongside the Consumer Behaviour State diagnostic.
          Requires 2+ weeks of data before CSTR rates are computed.
        </div>

        {/* Prior week context */}
        {lastReading && (
          <div className="text-xs text-neutral-400 bg-white border border-neutral-100 rounded px-3 py-2">
            Last reading: <span className="font-medium text-neutral-600">Week {lastReading.week_number}</span>
            {lastReading.velocity_score !== null && (
              <span className={`ml-2 ${velocityTone(lastReading.velocity_score)}`}>
                Velocity {lastReading.velocity_score > 0 ? "+" : ""}{lastReading.velocity_score}
              </span>
            )}
            {lastReading.state_stall_flag && (
              <span className="ml-2 text-amber-500 font-medium">⚠ Stall flagged</span>
            )}
          </div>
        )}

        {/* Input form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-neutral-500 mb-1">Week Number</label>
                <input
                  type="number"
                  min="1"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-neutral-500 mb-1">Week Of (Monday)</label>
                <input
                  type="date"
                  value={weekOf}
                  onChange={(e) => setWeekOf(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  required
                />
              </div>
            </div>

            {/* State distribution table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-neutral-500">
                  Audience State Distribution (%) <span className="text-neutral-400 font-normal">— must sum to 100</span>
                </label>
                <span className={`text-xs font-mono ${pctOk ? "text-emerald-600" : totalPct > 0 ? "text-amber-500" : "text-neutral-300"}`}>
                  Total: {totalPct.toFixed(1)}%
                </span>
              </div>

              <div className="border border-neutral-200 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-400 w-6">#</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500">State [INTERNAL]</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-400 hidden sm:table-cell">Description</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-neutral-500 w-24">% of Audience</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <tr key={s} className="border-b border-neutral-100 last:border-0">
                        <td className="px-3 py-2 text-xs text-neutral-400">{s}</td>
                        <td className="px-3 py-2 text-xs font-medium text-neutral-600">{STATE_LABELS[s].short}</td>
                        <td className="px-3 py-2 text-xs text-neutral-400 hidden sm:table-cell">{STATE_LABELS[s].desc}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="0.0"
                            value={stateDist[String(s)]}
                            onChange={(e) =>
                              setStateDist((prev) => ({ ...prev, [String(s)]: e.target.value }))
                            }
                            className="w-full text-right text-sm border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !pctOk}
              className="w-full py-2 px-4 rounded text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Computing CSTR…" : "Compute Transition Rates"}
            </button>

            {!pctOk && totalPct > 0 && (
              <p className="text-xs text-amber-500 text-center">
                Distribution must sum to 100% (currently {totalPct.toFixed(1)}%)
              </p>
            )}
          </form>
        </Card>

        {/* Result display */}
        {result && (
          <Card>
            <div className="space-y-4">
              {/* Velocity score header */}
              <div className={`rounded-lg p-4 ${velocityBg(result.velocity_score)} border border-neutral-100`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Campaign Velocity Score</p>
                    <p className={`text-2xl font-bold mt-0.5 ${velocityTone(result.velocity_score)}`}>
                      {result.velocity_score === null
                        ? "—"
                        : (result.velocity_score > 0 ? "+" : "") + result.velocity_score}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {result.velocity_score === null
                        ? "First reading — CSTR available from week 2"
                        : result.velocity_score > 0
                        ? "Audience is advancing"
                        : result.velocity_score < 0
                        ? "Audience is regressing"
                        : "No net movement this week"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">Dominant Stage</p>
                    <p className="text-sm font-medium text-neutral-700 mt-0.5">
                      {result.dominant_state ? STATE_LABELS[result.dominant_state]?.short ?? "—" : "—"}
                    </p>
                    <p className="text-xs text-neutral-400">[INTERNAL]</p>
                  </div>
                </div>
              </div>

              {/* Stall warning */}
              {result.state_stall_flag && (
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-700">⚠ Stall Detected [INTERNAL]</p>
                  <p className="text-xs text-amber-600 mt-0.5">{result.state_stall_note}</p>
                  <p className="text-xs text-amber-500 mt-1">4 or more transitions are flat (&lt;0.5pp movement). Strategic intervention required to unlock momentum.</p>
                </div>
              )}

              {/* CSTR breakdown — collapsible, internal */}
              {result.cstr_vs_prior && (
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
                            <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500">Transition Pair</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-neutral-500">Delta (pp)</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-neutral-500">Signal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(result.cstr_vs_prior)
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
                                  {delta > 0.5
                                    ? <span className="text-emerald-500">↑ Forward</span>
                                    : delta < -0.5
                                    ? <span className="text-red-400">↓ Regressing</span>
                                    : <span className="text-neutral-300">— Flat</span>
                                  }
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* AI Narrative — client-shareable */}
              {result.ai_narrative && (
                <div className="bg-blue-50 border border-blue-100 rounded px-4 py-3">
                  <p className="text-xs font-medium text-blue-400 mb-1.5">
                    Audience Progression Narrative
                    <span className="ml-2 font-normal text-blue-300">Client-shareable</span>
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">{result.ai_narrative}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
