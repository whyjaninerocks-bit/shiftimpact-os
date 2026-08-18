"use client";
// DsemSection.tsx
// F30 — Dark Social Estimation Model (DSEM)
// Sprint 6 · 30 July 2026
//
// GOVERNANCE:
//   signals_fired, multiplier, trigger_log, signal3_adjusted → INTERNAL ONLY (never rendered to client)
//   dark_social_narrative → CLIENT SAFE (shown with "inferred" framing)
//   Category calibration label shown internally for strategy context

import { useState } from "react";
import { SectionTitle, Badge } from "@/app/_components/ui";
import type { DsemRecord } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DsemSectionProps {
  campaignId: string;
  records: DsemRecord[];
  currentWeek?: number;
}

interface DsemFormState {
  week_number: number;
  // Signal A
  dta_direct_sessions: string;
  dta_baseline_sessions: string;
  dta_paid_active: boolean;
  // Signal B
  bswm_search_volume: string;
  bswm_baseline_volume: string;
  bswm_paid_search_active: boolean;
  // Signal C
  gucl_tier1_post_count: string;
  gucl_location_available: boolean;
  gucl_activation_event: boolean;
  // Context
  signal3_raw_score: string;
  strategy_notes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signalFiredCount(r: DsemRecord): number {
  return [r.dta_triggered, r.bswm_triggered, r.gucl_triggered].filter(Boolean).length;
}

function signalBadgeConfig(count: number): { label: string; tone: "success" | "warning" | "info" | "neutral" } {
  if (count === 3) return { label: "3 Signals", tone: "success" };
  if (count === 2) return { label: "2 Signals", tone: "warning" };
  if (count === 1) return { label: "1 Signal", tone: "info" };
  return { label: "No Signal", tone: "neutral" };
}

function multiplierDisplay(r: DsemRecord): string {
  if (!r.multiplier_min || !r.multiplier_max) return "—";
  const minPct = Math.round((r.multiplier_min - 1) * 100);
  const maxPct = Math.round((r.multiplier_max - 1) * 100);
  return `+${minPct}–${maxPct}%`;
}

function numOr(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

// ─── Alert Banner (when signals fire) ────────────────────────────────────────

function AlertBanner({ count, week }: { count: number; week: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (count === 0 || dismissed) return null;

  const isHigh = count >= 2;
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 mb-4 ${
        isHigh
          ? "bg-emerald-50 border-emerald-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
            isHigh ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
          }`}
        />
        <div>
          <p className={`text-sm font-semibold ${isHigh ? "text-emerald-800" : "text-amber-800"}`}>
            Dark Social: {count} signal{count > 1 ? "s" : ""} fired · Week {week}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            INTERNAL — strategy lead only · organic momentum may be underreported
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-slate-600 text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────────────

function DsemEntryForm({
  campaignId,
  currentWeek,
  onSaved,
}: {
  campaignId: string;
  currentWeek: number;
  onSaved: (record: DsemRecord) => void;
}) {
  const [form, setForm] = useState<DsemFormState>({
    week_number: currentWeek,
    dta_direct_sessions: "",
    dta_baseline_sessions: "",
    dta_paid_active: false,
    bswm_search_volume: "",
    bswm_baseline_volume: "",
    bswm_paid_search_active: false,
    gucl_tier1_post_count: "",
    gucl_location_available: true,
    gucl_activation_event: false,
    signal3_raw_score: "",
    strategy_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (key: keyof DsemFormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const toggle = (key: keyof DsemFormState) => ({
    checked: form[key] as boolean,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.checked })),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dsem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          week_number: form.week_number,
          dta_direct_sessions: numOr(form.dta_direct_sessions),
          dta_baseline_sessions: numOr(form.dta_baseline_sessions),
          dta_paid_active: form.dta_paid_active,
          bswm_search_volume: numOr(form.bswm_search_volume),
          bswm_baseline_volume: numOr(form.bswm_baseline_volume),
          bswm_paid_search_active: form.bswm_paid_search_active,
          gucl_tier1_post_count: numOr(form.gucl_tier1_post_count),
          gucl_location_available: form.gucl_location_available,
          gucl_activation_event: form.gucl_activation_event,
          signal3_raw_score: numOr(form.signal3_raw_score),
          strategy_notes: form.strategy_notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      const result = await res.json();
      onSaved(result as DsemRecord);
      // Reset form (keep week)
      setForm((prev) => ({
        ...prev,
        dta_direct_sessions: "",
        dta_baseline_sessions: "",
        dta_paid_active: false,
        bswm_search_volume: "",
        bswm_baseline_volume: "",
        bswm_paid_search_active: false,
        gucl_tier1_post_count: "",
        gucl_location_available: true,
        gucl_activation_event: false,
        signal3_raw_score: "",
        strategy_notes: "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300";

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-5">
      {/* Week */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <label className="block text-xs font-medium text-slate-600 mb-1">Week</label>
          <input
            type="number"
            min={1}
            className={`${inputClass} w-20`}
            value={form.week_number}
            onChange={(e) => setForm((p) => ({ ...p, week_number: parseInt(e.target.value) || 1 }))}
          />
        </div>
        <p className="text-xs text-slate-500 pt-4">
          Enter available signals. Any field left blank is treated as no signal.
        </p>
      </div>

      {/* Signal A — DTA */}
      <fieldset className="rounded border border-slate-200 bg-white p-3 space-y-2">
        <legend className="text-xs font-semibold text-slate-700 px-1">
          Signal A — Direct Traffic Anomaly
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Direct sessions this week</label>
            <input type="number" min={0} placeholder="e.g. 12400" className={inputClass} {...field("dta_direct_sessions")} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">4-week baseline (sessions)</label>
            <input type="number" min={0} placeholder="e.g. 9800" className={inputClass} {...field("dta_baseline_sessions")} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" className="rounded" {...toggle("dta_paid_active")} />
          Paid media was running this week (disables trigger)
        </label>
      </fieldset>

      {/* Signal B — BSWM */}
      <fieldset className="rounded border border-slate-200 bg-white p-3 space-y-2">
        <legend className="text-xs font-semibold text-slate-700 px-1">
          Signal B — Branded Search Without Media
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Branded search volume this week</label>
            <input type="number" min={0} placeholder="e.g. 5400" className={inputClass} {...field("bswm_search_volume")} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">4-week baseline (searches)</label>
            <input type="number" min={0} placeholder="e.g. 4500" className={inputClass} {...field("bswm_baseline_volume")} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" className="rounded" {...toggle("bswm_paid_search_active")} />
          Paid search was running this week (disables trigger)
        </label>
      </fieldset>

      {/* Signal C — GUCL */}
      <fieldset className="rounded border border-slate-200 bg-white p-3 space-y-2">
        <legend className="text-xs font-semibold text-slate-700 px-1">
          Signal C — Geographic UGC Clustering
        </legend>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tier 1 posts from same city/district (5-day window)</label>
          <input type="number" min={0} placeholder="e.g. 5" className={inputClass} {...field("gucl_tier1_post_count")} />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" className="rounded" {...toggle("gucl_location_available")} />
            Location data available (Instagram/X)
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" className="rounded" {...toggle("gucl_activation_event")} />
            Brand activation event in area (disables trigger)
          </label>
        </div>
      </fieldset>

      {/* Signal 3 raw score */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Signal 3 raw score (UGC index, optional)
          <span className="ml-2 text-slate-400 font-normal">INTERNAL — used to compute adjusted S3</span>
        </label>
        <input type="number" min={0} step={0.1} placeholder="e.g. 42.5" className={`${inputClass} w-40`} {...field("signal3_raw_score")} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Strategy notes (internal)</label>
        <textarea
          rows={2}
          placeholder="Context, qualitative observations, analyst notes…"
          className={inputClass}
          {...field("strategy_notes")}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Run DSEM"}
      </button>
    </form>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function DsemResultCard({ record }: { record: DsemRecord }) {
  const fired = signalFiredCount(record);
  const badge = signalBadgeConfig(fired);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Week {record.week_number}</span>
          <Badge tone={badge.tone}>{badge.label}</Badge>
          {record.category_calibration && (
            <Badge tone="neutral">{record.category_calibration}</Badge>
          )}
        </div>
        {/* INTERNAL: multiplier */}
        {fired > 0 && (
          <span className="text-xs text-slate-400 font-mono">
            ⚿ Multiplier {multiplierDisplay(record)}
          </span>
        )}
      </div>

      {/* Signal status (INTERNAL) */}
      <div className="flex gap-3 flex-wrap">
        <SignalPip label="DTA" triggered={record.dta_triggered} />
        <SignalPip label="BSWM" triggered={record.bswm_triggered} />
        <SignalPip label="GUCL" triggered={record.gucl_triggered} />
      </div>

      {/* Adjusted S3 (INTERNAL) */}
      {record.signal3_adjusted_score != null && (
        <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2">
          <p className="text-xs font-semibold text-slate-600">
            Adjusted S3 (internal diagnostic)
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Raw: {record.signal3_raw_score?.toFixed(1)} → Adjusted:{" "}
            <span className="font-semibold text-slate-700">
              {record.signal3_adjusted_score?.toFixed(1)}
            </span>
            {" "}(×{record.multiplier_label})
          </p>
        </div>
      )}

      {/* Client narrative */}
      {record.dark_social_narrative && (
        <div className="rounded bg-indigo-50 border border-indigo-100 px-3 py-2">
          <p className="text-xs font-semibold text-indigo-700 mb-1">Dark Social Signal (client-safe)</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {record.dark_social_narrative}
          </p>
        </div>
      )}

      {fired === 0 && (
        <p className="text-xs text-slate-400 italic">
          No dark social signals detected this week. No multiplier applied.
        </p>
      )}

      {record.strategy_notes && (
        <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">
          <span className="font-medium">Notes:</span> {record.strategy_notes}
        </p>
      )}
    </div>
  );
}

function SignalPip({ label, triggered }: { label: string; triggered: boolean }) {
  return (
    <span
      className={`flex items-center gap-1.5 text-xs font-medium rounded px-2 py-1 ${
        triggered
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-50 text-slate-400 border border-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${triggered ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      {label}
    </span>
  );
}

// ─── History Table ────────────────────────────────────────────────────────────

function HistoryTable({ records }: { records: DsemRecord[] }) {
  if (records.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-slate-600">Week</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">Signals</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">DTA</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">BSWM</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">GUCL</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">Multiplier ⚿</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">S3 Adj ⚿</th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">Narrative</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((r) => {
            const fired = signalFiredCount(r);
            return (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700">W{r.week_number}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                      fired >= 2
                        ? "bg-emerald-100 text-emerald-700"
                        : fired === 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {fired}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {r.dta_triggered ? (
                    <span className="text-emerald-600 font-medium">✓</span>
                  ) : (
                    <span className="text-slate-300">–</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.bswm_triggered ? (
                    <span className="text-emerald-600 font-medium">✓</span>
                  ) : (
                    <span className="text-slate-300">–</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.gucl_triggered ? (
                    <span className="text-emerald-600 font-medium">✓</span>
                  ) : (
                    <span className="text-slate-300">–</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-slate-500">{multiplierDisplay(r)}</td>
                <td className="px-3 py-2 font-mono text-slate-500">
                  {r.signal3_adjusted_score != null
                    ? r.signal3_adjusted_score.toFixed(1)
                    : "—"}
                </td>
                <td className="px-3 py-2 max-w-xs">
                  {r.dark_social_narrative ? (
                    <span className="text-slate-600 line-clamp-2">{r.dark_social_narrative}</span>
                  ) : (
                    <span className="text-slate-300 italic">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-100">
        ⚿ = INTERNAL — strategy lead only · not for client distribution
      </p>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function DsemSection({ campaignId, records: initialRecords, currentWeek = 1 }: DsemSectionProps) {
  const [records, setRecords] = useState<DsemRecord[]>(initialRecords);
  const [showForm, setShowForm] = useState(false);

  const latestFired = records.length > 0 ? signalFiredCount(records[0]) : 0;

  function handleSaved(result: DsemRecord) {
    setRecords((prev) => {
      const idx = prev.findIndex(
        (r) => r.campaign_id === result.campaign_id && r.week_number === result.week_number
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = result;
        return next;
      }
      return [result, ...prev];
    });
    setShowForm(false);
  }

  return (
    <div id="dark-social-dsem" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SectionTitle>Dark Social Estimation</SectionTitle>
          <Badge tone="neutral">F30 ⚿</Badge>
          <Badge tone="neutral">INTERNAL</Badge>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {showForm ? "Cancel" : "+ Log week"}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Estimates dark social momentum from three proxy signals (direct traffic anomaly, branded search without media, geographic UGC clustering). Multiplier and signal log are internal diagnostic only — client sees plain-language narrative with "inferred" framing.
      </p>

      {latestFired > 0 && records.length > 0 && (
        <AlertBanner count={latestFired} week={records[0].week_number} />
      )}

      {showForm && (
        <DsemEntryForm
          campaignId={campaignId}
          currentWeek={currentWeek}
          onSaved={handleSaved}
        />
      )}

      {records.length > 0 && (
        <div className="space-y-3">
          {/* Latest reading as card */}
          <DsemResultCard record={records[0]} />
          {/* History table */}
          {records.length > 1 && <HistoryTable records={records} />}
        </div>
      )}

      {records.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
          <p className="text-sm text-slate-400">No dark social readings yet.</p>
          <p className="text-xs text-slate-400 mt-1">Log the first week to run the estimation model.</p>
        </div>
      )}
    </div>
  );
}
