"use client";
// SignalLayer0Section.tsx
// Signal Layer 0 — Media Delivery Health (MDH)
//
// Prerequisite check before Signal 1-3 interpretation.
// The chain: Reach → Frequency → S2 (Save Rate) → S1 (Search Lift) → S3 (UGC)
// Flat S1 means nothing if reach is below the minimum viable threshold.
//
// MDH = Red → Signal 1-3 quarantined (reads suppressed, not interpreted).
// MDH = Amber → Signals directional only.
// MDH = Green → Standard Signal 1-3 interpretation applies.

import { useState } from "react";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type MdhStatus = "Green" | "Amber" | "Red";

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
  if (status === "Red") return "red";
  return "neutral";
}

function mdhDot(status: MdhStatus | null): string {
  if (status === "Green") return "🟢";
  if (status === "Amber") return "🟡";
  if (status === "Red") return "🔴";
  return "⚪";
}

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SignalLayer0Section({ campaignId, records }: SignalLayer0SectionProps) {
  const [localRecords, setLocalRecords] = useState<MediaDeliveryRecord[]>(records);
  const [weekNumber, setWeekNumber] = useState("");
  const [reach, setReach] = useState("");
  const [impressions, setImpressions] = useState("");
  const [freqOverride, setFreqOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = localRecords[0] ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mdh-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          week_number: parseInt(weekNumber, 10),
          reach_unique: reach ? parseInt(reach, 10) : null,
          impressions: impressions ? parseInt(impressions, 10) : null,
          avg_frequency: freqOverride ? parseFloat(freqOverride) : null,
          strategy_notes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      // Merge into records list (upsert by week_number)
      setLocalRecords((prev) => {
        const filtered = prev.filter((r) => r.week_number !== data.week_number);
        return [data as MediaDeliveryRecord, ...filtered].sort(
          (a, b) => b.week_number - a.week_number
        );
      });

      // Reset form
      setWeekNumber("");
      setReach("");
      setImpressions("");
      setFreqOverride("");
      setNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="signal-layer-0">
      <Card>
        <div className="flex items-center justify-between mb-1">
          <SectionTitle>Signal Layer 0 — Media Delivery Health</SectionTitle>
          <span className="text-xs font-mono text-neutral-400">PREREQUISITE</span>
        </div>
        <p className="text-xs text-neutral-500 mb-4">
          Prerequisite check before Signal 1–3 are interpreted. Flat branded search means nothing if reach is below threshold.
          The chain: <span className="font-medium text-neutral-700">Reach → Frequency → S2 → S1 → S3</span>
        </p>

        {/* Quarantine alert */}
        {latest?.quarantine_active && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">⛔ Signal 1–3 Quarantined — Week {latest.week_number}</p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              {latest.frequency_label}
              {" "}Signal Intelligence readings are suppressed until delivery health is restored.
            </p>
          </div>
        )}

        {/* Latest MDH status */}
        {latest && !latest.quarantine_active && latest.mdh_status && (
          <div className={`mb-4 rounded-lg px-4 py-3 border ${
            latest.mdh_status === "Green"
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-neutral-800">
                {mdhDot(latest.mdh_status)} Week {latest.week_number} — {latest.mdh_status}
              </p>
              <Badge tone={mdhTone(latest.mdh_status)}>{latest.mdh_status}</Badge>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">{latest.frequency_label}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Entry form */}
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-2">Enter Weekly Delivery Data</p>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Week No.</label>
                  <input
                    type="number" min="0"
                    required
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Freq. Override</label>
                  <input
                    type="number" min="0" step="0.1"
                    value={freqOverride}
                    onChange={(e) => setFreqOverride(e.target.value)}
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
                    onChange={(e) => setReach(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    placeholder="e.g. 1200000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Impressions</label>
                  <input
                    type="number" min="0"
                    value={impressions}
                    onChange={(e) => setImpressions(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    placeholder="e.g. 5000000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Strategy Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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

          {/* History table */}
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-2">Weekly History</p>
            {localRecords.length === 0 ? (
              <p className="text-sm text-neutral-400">No delivery data recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left text-neutral-400 border-b border-neutral-100">
                      <th className="py-1 pr-3">Wk</th>
                      <th className="py-1 pr-3">Reach</th>
                      <th className="py-1 pr-3">Impr</th>
                      <th className="py-1 pr-3">Freq</th>
                      <th className="py-1">MDH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localRecords.map((r) => (
                      <tr key={r.id} className="border-b border-neutral-50">
                        <td className="py-1 pr-3 font-medium">{r.week_number}</td>
                        <td className="py-1 pr-3">{formatNumber(r.reach_unique)}</td>
                        <td className="py-1 pr-3">{formatNumber(r.impressions)}</td>
                        <td className="py-1 pr-3">
                          {r.avg_frequency !== null ? `${r.avg_frequency.toFixed(1)}x` : "—"}
                        </td>
                        <td className="py-1">
                          {r.mdh_status ? (
                            <Badge tone={mdhTone(r.mdh_status)}>{r.mdh_status}</Badge>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
