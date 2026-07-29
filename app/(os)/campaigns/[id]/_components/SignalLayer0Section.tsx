"use client";
// SignalLayer0Section.tsx
// Signal Layer 0 — Media Delivery Health (MDH) + F25 Attention Quality Score
//
// MDH = Red → Signal 1-3 quarantined.
// MDH = Amber → Signals directional only.
// MDH = Green → Standard Signal 1-3 interpretation applies.
//
// F25 AQS: Attention Quality Score derived from video view rates.
// AQS score + band are INTERNAL ONLY — never in client export.
// Attention Gap Flag + named action shown to strategy lead when flag fires.

import { useState } from "react";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type MdhStatus = "Green" | "Amber" | "Red";
type AqsBand   = "Attention Strong" | "Attention Adequate" | "Attention Weak" | "Attention Gap";

interface MediaDeliveryRecord {
  id: string;
  campaign_id: string;
  week_number: number;
  reach_unique: number | null;
  impressions: number | null;
  avg_frequency: number | null;
  mdh_status: MdhStatus | null;
  frequency_label: string;
  quarantine_active: boolean;
  strategy_notes: string;
  // F25 AQS
  view_rate_3s_pct: number | null;
  view_rate_10s_pct: number | null;
  completion_rate_pct: number | null;
  aqs_score: number | null;
  aqs_band: AqsBand | null;
  attention_gap_flag: boolean;
  attention_gap_action: string;
  aqs_benchmark_delta: number | null;
  aqs_prev_week_delta: number | null;
  created_at: string;
}

interface SignalLayer0SectionProps {
  campaignId: string;
  records: MediaDeliveryRecord[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mdhTone(status: MdhStatus | null): "green" | "amber" | "red" | "neutral" {
  if (status === "Green") return "green";
  if (status === "Amber") return "amber";
  if (status === "Red")   return "red";
  return "neutral";
}

function mdhDot(status: MdhStatus | null): string {
  if (status === "Green") return "🟢";
  if (status === "Amber") return "🟡";
  if (status === "Red")   return "🔴";
  return "⚪";
}

function aqsBandColor(band: AqsBand | null): string {
  if (band === "Attention Strong")   return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (band === "Attention Adequate") return "text-blue-700 bg-blue-50 border-blue-200";
  if (band === "Attention Weak")     return "text-amber-700 bg-amber-50 border-amber-200";
  if (band === "Attention Gap")      return "text-red-700 bg-red-50 border-red-200";
  return "text-neutral-500 bg-neutral-50 border-neutral-200";
}

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function deltaBadge(delta: number | null): string {
  if (delta === null) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SignalLayer0Section({ campaignId, records }: SignalLayer0SectionProps) {
  const [localRecords, setLocalRecords] = useState<MediaDeliveryRecord[]>(records);

  // MDH inputs
  const [weekNumber,   setWeekNumber]   = useState("");
  const [reach,        setReach]        = useState("");
  const [impressions,  setImpressions]  = useState("");
  const [freqOverride, setFreqOverride] = useState("");
  const [notes,        setNotes]        = useState("");

  // AQS inputs
  const [rate3s,     setRate3s]     = useState("");
  const [rate10s,    setRate10s]    = useState("");
  const [completion, setCompletion] = useState("");
  const [showAqs,    setShowAqs]    = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const latest = localRecords[0] ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mdh-report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id:         campaignId,
          week_number:         parseInt(weekNumber, 10),
          reach_unique:        reach        ? parseInt(reach, 10)       : null,
          impressions:         impressions  ? parseInt(impressions, 10) : null,
          avg_frequency:       freqOverride ? parseFloat(freqOverride)  : null,
          strategy_notes:      notes,
          view_rate_3s_pct:    rate3s      ? parseFloat(rate3s)      : null,
          view_rate_10s_pct:   rate10s     ? parseFloat(rate10s)     : null,
          completion_rate_pct: completion  ? parseFloat(completion)  : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      setLocalRecords(prev => {
        const filtered = prev.filter(r => r.week_number !== data.week_number);
        return [data as MediaDeliveryRecord, ...filtered].sort(
          (a, b) => b.week_number - a.week_number
        );
      });

      setWeekNumber(""); setReach(""); setImpressions(""); setFreqOverride(""); setNotes("");
      setRate3s(""); setRate10s(""); setCompletion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // Cross-campaign AQS trend
  const aqsRows = localRecords.filter(r => r.aqs_score !== null).slice(0, 6);
  const showAqsTrend = aqsRows.length >= 2;
  const aqsAvg = showAqsTrend
    ? aqsRows.reduce((a, b) => a + (b.aqs_score as number), 0) / aqsRows.length
    : null;
  const aqsTrendLabel = showAqsTrend
    ? (aqsRows[0].aqs_score as number) > (aqsRows[aqsRows.length - 1].aqs_score as number)
      ? "▲ Improving"
      : (aqsRows[0].aqs_score as number) < (aqsRows[aqsRows.length - 1].aqs_score as number)
        ? "▼ Declining"
        : "→ Stable"
    : null;

  return (
    <section id="signal-layer-0">
      <Card>
        <div className="flex items-center justify-between mb-1">
          <SectionTitle>Signal Layer 0 — Media Delivery Health</SectionTitle>
          <span className="text-xs font-mono text-neutral-400">PREREQUISITE</span>
        </div>
        <p className="text-xs text-neutral-500 mb-4">
          Prerequisite check before Signal 1–3 are interpreted.{" "}
          <span className="font-medium text-neutral-700">Reach → Frequency → S2 → S1 → S3</span>
        </p>

        {/* Quarantine alert */}
        {latest?.quarantine_active && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">
              ⛔ Signal 1–3 Quarantined — Week {latest.week_number}
            </p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              {latest.frequency_label}{" "}
              Signal Intelligence readings are suppressed until delivery health is restored.
            </p>
          </div>
        )}

        {/* Attention Gap Flag — INTERNAL */}
        {latest?.attention_gap_flag && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              ⚠️ Attention Gap Detected — Week {latest.week_number}
            </p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              <span className="font-medium">Action required:</span> {latest.attention_gap_action}
            </p>
            {latest.aqs_benchmark_delta !== null && (
              <p className="text-[10px] text-amber-600 mt-1">
                AQS {latest.aqs_benchmark_delta.toFixed(1)} vs category benchmark — INTERNAL
              </p>
            )}
          </div>
        )}

        {/* Latest MDH + AQS status */}
        {latest && !latest.quarantine_active && latest.mdh_status && (
          <div className={`mb-4 rounded-lg px-4 py-3 border ${
            latest.mdh_status === "Green"
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-sm font-semibold text-neutral-800">
                {mdhDot(latest.mdh_status)} Week {latest.week_number} — {latest.mdh_status}
              </p>
              <Badge tone={mdhTone(latest.mdh_status)}>{latest.mdh_status}</Badge>
              {latest.aqs_band && (
                <span className={`px-2 py-0.5 rounded border text-xs font-medium ${aqsBandColor(latest.aqs_band)}`}>
                  {latest.aqs_band}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">{latest.frequency_label}</p>
            {latest.aqs_score !== null && (
              <div className="mt-2 flex gap-4 text-xs text-neutral-500">
                <span>AQS: <span className="font-medium text-neutral-700">{latest.aqs_score}</span></span>
                {latest.aqs_benchmark_delta !== null && (
                  <span>vs benchmark:{" "}
                    <span className={`font-medium ${latest.aqs_benchmark_delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {deltaBadge(latest.aqs_benchmark_delta)}
                    </span>
                  </span>
                )}
                {latest.aqs_prev_week_delta !== null && (
                  <span>vs last week:{" "}
                    <span className={`font-medium ${latest.aqs_prev_week_delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {deltaBadge(latest.aqs_prev_week_delta)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Entry form */}
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-2">Enter Weekly Delivery Data</p>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Week No. *</label>
                  <input
                    type="number" min="0" required
                    value={weekNumber}
                    onChange={e => setWeekNumber(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Freq. Override</label>
                  <input
                    type="number" min="0" step="0.1"
                    value={freqOverride}
                    onChange={e => setFreqOverride(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    placeholder="auto"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Unique Reach</label>
                  <input
                    type="number" min="0"
                    value={reach}
                    onChange={e => setReach(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    placeholder="e.g. 1200000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Impressions</label>
                  <input
                    type="number" min="0"
                    value={impressions}
                    onChange={e => setImpressions(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    placeholder="e.g. 5000000"
                  />
                </div>
              </div>

              {/* AQS accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAqs(v => !v)}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  <span className="font-medium">{showAqs ? "▾" : "▸"} Attention Quality (video ads)</span>
                  <span className="text-neutral-400">— optional</span>
                </button>
                {showAqs && (
                  <div className="mt-2 space-y-2 rounded-md bg-neutral-50 border border-neutral-200 p-3">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Video View Rates — INTERNAL ONLY
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">3-sec view %</label>
                        <input
                          type="number" min="0" max="100" step="0.1"
                          value={rate3s}
                          onChange={e => setRate3s(e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                          placeholder="e.g. 45"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">10-sec view %</label>
                        <input
                          type="number" min="0" max="100" step="0.1"
                          value={rate10s}
                          onChange={e => setRate10s(e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                          placeholder="e.g. 22"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Completion %</label>
                        <input
                          type="number" min="0" max="100" step="0.1"
                          value={completion}
                          onChange={e => setCompletion(e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                          placeholder="e.g. 18"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Pull from Meta Ads Manager or TikTok Ads. Score: 3s(20%) + 10s(30%) + completion(50%).
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Strategy Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none"
                  placeholder="Any context on delivery source or audience overlap…"
                />
              </div>
              {error && (
                <p className="text-xs text-red-700 bg-red-50 rounded px-2 py-1">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !weekNumber}
                className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save & Compute MDH"}
              </button>
            </form>

            {/* Frequency guide */}
            <div className="mt-4 rounded-md bg-neutral-50 border border-neutral-200 p-3">
              <p className="text-xs font-medium text-neutral-500 mb-1.5">Frequency thresholds</p>
              <div className="space-y-0.5 text-xs text-neutral-500">
                <p>🔴 &lt;1.5x — Under-exposed (quarantine)</p>
                <p>🟡 1.5–3.0x — Light exposure (directional only)</p>
                <p>🟢 3.0–7.0x — Effective range</p>
                <p>🟡 7.0–10.0x — High (check Creative Fatigue)</p>
                <p>🔴 &gt;10.0x — Over-frequency (quarantine)</p>
              </div>
            </div>
          </div>

          {/* History + AQS trend */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-2">Weekly History</p>
              {localRecords.length === 0 ? (
                <p className="text-sm text-neutral-400">No delivery data recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-left text-neutral-400 border-b border-neutral-100">
                        <th className="py-1 pr-2">Wk</th>
                        <th className="py-1 pr-2">Reach</th>
                        <th className="py-1 pr-2">Freq</th>
                        <th className="py-1 pr-2">MDH</th>
                        <th className="py-1 pr-2">AQS</th>
                        <th className="py-1">Band</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localRecords.map(r => (
                        <tr key={r.id} className="border-b border-neutral-50">
                          <td className="py-1 pr-2 font-medium">{r.week_number}</td>
                          <td className="py-1 pr-2">{formatNumber(r.reach_unique)}</td>
                          <td className="py-1 pr-2">
                            {r.avg_frequency !== null ? `${r.avg_frequency.toFixed(1)}x` : "—"}
                          </td>
                          <td className="py-1 pr-2">
                            {r.mdh_status
                              ? <Badge tone={mdhTone(r.mdh_status)}>{r.mdh_status}</Badge>
                              : <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="py-1 pr-2">
                            {r.aqs_score !== null
                              ? <span className={r.attention_gap_flag ? "text-red-700 font-semibold" : ""}>{r.aqs_score}</span>
                              : <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="py-1">
                            {r.aqs_band
                              ? <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${aqsBandColor(r.aqs_band)}`}>
                                  {r.aqs_band.replace("Attention ", "")}
                                </span>
                              : <span className="text-neutral-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AQS cross-campaign trend — shows once ≥2 readings */}
            {showAqsTrend && (
              <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  AQS Trend — INTERNAL ONLY
                </p>
                <div className="flex gap-4 text-xs text-neutral-600 mb-2">
                  <span>Campaign avg: <span className="font-medium text-neutral-800">{aqsAvg!.toFixed(1)}</span></span>
                  <span className="font-medium">{aqsTrendLabel}</span>
                </div>
                <div className="flex items-end gap-1 h-8">
                  {[...aqsRows].reverse().map(r => {
                    const h = Math.max(8, Math.round(((r.aqs_score as number) / 100) * 32));
                    return (
                      <div
                        key={r.week_number}
                        title={`Wk ${r.week_number}: AQS ${r.aqs_score}`}
                        className={`flex-1 rounded-sm ${r.attention_gap_flag ? "bg-red-400" : "bg-neutral-400"}`}
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Red bars = attention gap detected</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
