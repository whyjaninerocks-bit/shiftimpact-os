"use client";
// DbaCorrelationPanel.tsx
// F29 — DBA Performance Correlation
// Sprint 6 · 30 July 2026
//
// GOVERNANCE: ALL OUTPUT INTERNAL ONLY — Janine/strategy lead only.
// Never shown to client. Janine decides if and how to surface insights.
//
// Correlation dimensions:
//   Signal 1 (SoS / branded search): does DBA consistency drive search share?
//   AQS (Attention Quality):          does AQS improve when DBAs are deployed?
//   CSTR (State Transition Rate):     does DBA consistency correlate with faster state movement?
//
// Erosion Alert: fires when Established asset + declining signal health co-occur.

import { useState } from "react";
import { Badge } from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type CorrelationRating = "Positive" | "Neutral" | "Negative" | "Insufficient Data";

interface CorrelationResult {
  id?: string;
  campaign_id?: string;
  signal1_health: string | null;
  aqs_score: number | null;
  aqs_band: string | null;
  cstr_status: string | null;
  correlation_signal1: CorrelationRating;
  correlation_aqs: CorrelationRating;
  correlation_cstr: CorrelationRating;
  erosion_alert: boolean;
  erosion_asset_names: string;
  erosion_inference: string;
  correlation_summary: string;
  created_at?: string;
}

interface DbaCorrelationPanelProps {
  campaignId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function correlationConfig(rating: CorrelationRating): {
  label: string;
  dot: string;
  bg: string;
  border: string;
  text: string;
} {
  switch (rating) {
    case "Positive":
      return { label: "Positive", dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800" };
    case "Negative":
      return { label: "Negative", dot: "bg-red-500",     bg: "bg-red-50",     border: "border-red-200",     text: "text-red-800" };
    case "Neutral":
      return { label: "Neutral",  dot: "bg-amber-400",   bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800" };
    default:
      return { label: "No Data",  dot: "bg-neutral-300", bg: "bg-neutral-50", border: "border-neutral-200", text: "text-neutral-500" };
  }
}

function CorrelationPill({ label, rating }: { label: string; rating: CorrelationRating }) {
  const cfg = correlationConfig(rating);
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${cfg.bg} ${cfg.border}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0 mt-1`} />
      <div>
        <p className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">{label}</p>
        <p className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function DbaCorrelationPanel({ campaignId }: DbaCorrelationPanelProps) {
  const [result, setResult]       = useState<CorrelationResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [notes, setNotes]         = useState("");
  const [showPanel, setShowPanel] = useState(false);

  async function runCorrelation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dba-correlation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, strategy_notes: notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Correlation failed");
      setResult(json as CorrelationResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-neutral-100 pt-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
            DBA Performance Correlation
          </p>
          <Badge tone="neutral">F29 ⚿</Badge>
          <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">INTERNAL</span>
        </div>
        <button
          onClick={() => setShowPanel(v => !v)}
          className="text-xs text-neutral-400 hover:text-neutral-700 underline underline-offset-2"
        >
          {showPanel ? "Close" : "Run correlation"}
        </button>
      </div>

      {!showPanel && !result && (
        <p className="text-xs text-neutral-400 italic">
          Correlates DBA deployment against Signal 1, AQS, and CSTR. Flags erosion on Established assets.
        </p>
      )}

      {showPanel && (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Pulls deployed assets, latest signal health, AQS, and CSTR for this campaign. AI assesses directional correlation and erosion risk.
          </p>
          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Strategy notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Context on recent campaign changes, asset usage, or media mix…"
              className="w-full rounded border border-neutral-200 px-3 py-2 text-xs text-neutral-800 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={runCorrelation}
            disabled={loading}
            className="rounded bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run DBA Correlation"}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3 mt-2">
          {/* Erosion Alert */}
          {result.erosion_alert && (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 flex items-start gap-3">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-1" />
              <div>
                <p className="text-xs font-bold text-red-800 mb-1">
                  DBA Erosion Alert
                  <span className="ml-2 text-[10px] font-semibold text-red-600 rounded px-1 py-0.5 bg-red-100">
                    INTERNAL ONLY
                  </span>
                </p>
                {result.erosion_asset_names && (
                  <p className="text-xs text-red-700 mb-1">
                    Assets at risk: <span className="font-semibold">{result.erosion_asset_names}</span>
                  </p>
                )}
                {result.erosion_inference && (
                  <p className="text-xs text-red-700 leading-relaxed italic">{result.erosion_inference}</p>
                )}
              </div>
            </div>
          )}

          {/* Correlation Grid */}
          <div className="grid grid-cols-3 gap-2">
            <CorrelationPill label="Signal 1 ↔ DBA"  rating={result.correlation_signal1} />
            <CorrelationPill label="AQS ↔ DBA"        rating={result.correlation_aqs} />
            <CorrelationPill label="CSTR ↔ DBA"       rating={result.correlation_cstr} />
          </div>

          {/* Context snapshot */}
          <div className="rounded bg-neutral-50 border border-neutral-100 px-3 py-2 grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Signal 1</p>
              <p className="font-medium text-neutral-700">{result.signal1_health ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wide">AQS</p>
              <p className="font-medium text-neutral-700">
                {result.aqs_score != null ? `${result.aqs_score} · ${result.aqs_band}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 uppercase tracking-wide">CSTR</p>
              <p className="font-medium text-neutral-700">{result.cstr_status ?? "—"}</p>
            </div>
          </div>

          {/* Correlation summary (INTERNAL) */}
          {result.correlation_summary && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Strategic Read <span className="font-normal normal-case text-slate-400">(INTERNAL — strategy lead only)</span>
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">{result.correlation_summary}</p>
            </div>
          )}

          {result.created_at && (
            <p className="text-[10px] text-neutral-400 text-right">
              Run: {new Date(result.created_at).toLocaleString("en-MY", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}

          <button
            onClick={() => setShowPanel(true)}
            className="text-xs text-neutral-400 hover:text-neutral-700 underline"
          >
            Re-run
          </button>
        </div>
      )}
    </div>
  );
}
