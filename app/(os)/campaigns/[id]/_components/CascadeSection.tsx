"use client";
// CascadeSection.tsx
// F28 — Social Proof Cascade Detection (Phase 1)
// Sprint 5 · 30 July 2026
//
// GOVERNANCE:
//   CASCADE ACTIVE / CASCADE PEAK → in-app alert for Janine only — no client notification
//   amplification_window: INTERNAL — never in client export
//   Client-safe: cascade_status label is directional; amplification copy is internal
//
// Logic (mirrors /api/cascade-detection):
//   velocity_acceleration = ugc_this / ugc_last (WoW ratio)
//   comment_to_post_ratio  = comments / posts
//   NO CASCADE    — velocity < 1.5  AND  ratio < 5
//   EARLY SIGNAL  — velocity ≥ 1.5  OR   ratio ≥ 5
//   CASCADE ACTIVE — velocity ≥ 2.0  AND  ratio ≥ 5
//   CASCADE PEAK  — velocity ≥ 3.0  AND  ratio ≥ 10

import { useState } from "react";
import { SectionTitle, Badge } from "@/app/_components/ui";
import type { CascadeRecord } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CascadeSectionProps {
  campaignId: string;
  records: CascadeRecord[];
  currentWeek?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status: string): {
  label: string;
  dot: string;
  bg: string;
  border: string;
  text: string;
} {
  switch (status) {
    case "CASCADE PEAK":
      return {
        label: "Cascade Peak",
        dot: "bg-purple-500",
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-800",
      };
    case "CASCADE ACTIVE":
      return {
        label: "Cascade Active",
        dot: "bg-emerald-500 animate-pulse",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-800",
      };
    case "EARLY SIGNAL":
      return {
        label: "Early Signal",
        dot: "bg-amber-400",
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-800",
      };
    default:
      return {
        label: "No Cascade",
        dot: "bg-neutral-300",
        bg: "bg-neutral-50",
        border: "border-neutral-200",
        text: "text-neutral-500",
      };
  }
}

function AlertBanner({ status, action }: { status: string; action: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  if (status !== "CASCADE ACTIVE" && status !== "CASCADE PEAK") return null;

  const isPeak = status === "CASCADE PEAK";
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${isPeak ? "bg-purple-50 border-purple-200" : "bg-emerald-50 border-emerald-200"}`}>
      <span className="text-lg mt-0.5">{isPeak ? "🌊" : "⚡"}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isPeak ? "text-purple-700" : "text-emerald-700"}`}>
          {isPeak ? "Cascade at Peak — Capture Mode" : "Cascade Active — Amplification Window Open"}
        </p>
        <p className="text-xs text-neutral-700 leading-relaxed">{action}</p>
        <p className={`text-[10px] mt-1 font-medium ${isPeak ? "text-purple-600" : "text-emerald-600"}`}>
          INTERNAL — strategy lead only · no client notification
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-neutral-400 hover:text-neutral-600 text-base leading-none mt-0.5 shrink-0"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────────────

function CascadeEntryForm({
  campaignId,
  currentWeek,
  onSaved,
}: {
  campaignId: string;
  currentWeek: number;
  onSaved: (rec: CascadeRecord) => void;
}) {
  const [week, setWeek]               = useState(currentWeek);
  const [ugcThis, setUgcThis]         = useState<string>("");
  const [ugcLast, setUgcLast]         = useState<string>("");
  const [comments, setComments]       = useState<string>("");
  const [posts, setPosts]             = useState<string>("");
  const [notes, setNotes]             = useState<string>("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cascade-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id:          campaignId,
          week_number:          week,
          ugc_volume_this_week: ugcThis   !== "" ? Number(ugcThis)   : null,
          ugc_volume_last_week: ugcLast   !== "" ? Number(ugcLast)   : null,
          comment_count:        comments  !== "" ? Number(comments)  : null,
          post_count:           posts     !== "" ? Number(posts)     : null,
          strategy_notes:       notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      onSaved(json as CascadeRecord);
      setUgcThis(""); setUgcLast(""); setComments(""); setPosts(""); setNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4 space-y-4 shadow-sm">
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Log UGC Signals</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Week
          </label>
          <input
            type="number"
            min={0}
            value={week}
            onChange={e => setWeek(Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            UGC Posts This Week
          </label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 84"
            value={ugcThis}
            onChange={e => setUgcThis(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            UGC Posts Last Week
          </label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 40"
            value={ugcLast}
            onChange={e => setUgcLast(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Total Comments on Brand Content
          </label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 320"
            value={comments}
            onChange={e => setComments(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Brand Posts (for ratio)
          </label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 14"
            value={posts}
            onChange={e => setPosts(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
          Notes (optional)
        </label>
        <textarea
          rows={2}
          placeholder="Context on the UGC source, platform, or signal quality…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save Reading"}
      </button>
    </div>
  );
}

// ─── Status Card ──────────────────────────────────────────────────────────────

function StatusCard({ record }: { record: CascadeRecord }) {
  const cfg = statusConfig(record.cascade_status);

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3 space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0`} />
          <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
          <span className="text-[10px] text-neutral-400">Week {record.week_number}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {record.velocity_acceleration != null && (
          <div className="space-y-0.5">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wide">WoW Velocity</p>
            <p className="font-semibold text-neutral-800">{record.velocity_acceleration}×</p>
          </div>
        )}
        {record.comment_to_post_ratio != null && (
          <div className="space-y-0.5">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Comment Ratio</p>
            <p className="font-semibold text-neutral-800">{record.comment_to_post_ratio} / post</p>
          </div>
        )}
        {record.ugc_volume_this_week != null && (
          <div className="space-y-0.5">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wide">UGC This Week</p>
            <p className="font-semibold text-neutral-800">{record.ugc_volume_this_week.toLocaleString()}</p>
          </div>
        )}
        {record.ugc_volume_last_week != null && (
          <div className="space-y-0.5">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wide">UGC Last Week</p>
            <p className="font-semibold text-neutral-800">{record.ugc_volume_last_week.toLocaleString()}</p>
          </div>
        )}
      </div>

      {record.amplification_window && (
        <div className="pt-1 border-t border-neutral-200">
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Amplification Window <span className="normal-case font-normal text-neutral-400">(internal)</span>
          </p>
          <p className="text-xs text-neutral-700 leading-relaxed">{record.amplification_window}</p>
        </div>
      )}

      {record.strategy_notes && (
        <div className="pt-1 border-t border-neutral-200">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-0.5">Notes</p>
          <p className="text-xs text-neutral-600">{record.strategy_notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── History Table ────────────────────────────────────────────────────────────

function HistoryTable({ records }: { records: CascadeRecord[] }) {
  if (records.length === 0) return null;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <p className="px-4 pt-3 pb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
        History
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-t border-neutral-100 bg-neutral-50">
              {["Wk", "Status", "Velocity", "Comment Ratio", "UGC Vol"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {records.map(r => {
              const cfg = statusConfig(r.cascade_status);
              return (
                <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-3 py-2 font-medium text-neutral-700">{r.week_number}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {r.velocity_acceleration != null ? `${r.velocity_acceleration}×` : "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {r.comment_to_post_ratio != null ? `${r.comment_to_post_ratio}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {r.ugc_volume_this_week != null ? r.ugc_volume_this_week.toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function CascadeSection({ campaignId, records: initialRecords, currentWeek = 1 }: CascadeSectionProps) {
  const [records, setRecords] = useState<CascadeRecord[]>(initialRecords);
  const [showForm, setShowForm] = useState(false);

  const latestRecord = records[0] ?? null;
  const hasAlert = latestRecord &&
    (latestRecord.cascade_status === "CASCADE ACTIVE" || latestRecord.cascade_status === "CASCADE PEAK");

  function handleSaved(rec: CascadeRecord) {
    setRecords(prev => {
      const filtered = prev.filter(r => r.week_number !== rec.week_number);
      return [rec, ...filtered].sort((a, b) => b.week_number - a.week_number);
    });
    setShowForm(false);
  }

  return (
    <div id="social-proof-cascade" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Social Proof Cascade</SectionTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-mono">INTERNAL</span>
          <Badge tone="neutral">F28 ⚿</Badge>
        </div>
      </div>
      <p className="text-xs text-neutral-500 -mt-2">
        UGC velocity acceleration and comment density detection. Weekly signal. CASCADE ACTIVE triggers an in-app alert for strategy lead only.
      </p>

      {/* Alert Banner — Janine only */}
      {hasAlert && latestRecord && (
        <AlertBanner
          status={latestRecord.cascade_status}
          action={latestRecord.amplification_window}
        />
      )}

      {/* Latest status */}
      {latestRecord ? (
        <StatusCard record={latestRecord} />
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-6 text-center">
          <p className="text-sm text-neutral-500">No cascade readings yet.</p>
          <p className="text-xs text-neutral-400 mt-1">Log UGC volume and comment data each week to detect cascade patterns.</p>
        </div>
      )}

      {/* Add / toggle form */}
      <button
        onClick={() => setShowForm(v => !v)}
        className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors"
      >
        {showForm ? "Cancel" : (latestRecord ? "Log this week" : "Log first reading")}
      </button>

      {showForm && (
        <CascadeEntryForm
          campaignId={campaignId}
          currentWeek={currentWeek}
          onSaved={handleSaved}
        />
      )}

      {/* History */}
      {records.length > 1 && <HistoryTable records={records} />}
    </div>
  );
}
