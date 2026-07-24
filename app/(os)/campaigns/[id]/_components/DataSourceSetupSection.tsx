"use client";
// DataSourceSetupSection.tsx — compact table redesign
// Sprint 31 · 20 July 2026

import { useState } from "react";
import { Card, SectionTitle } from "@/app/_components/ui";
import type { DataPreferences, DataMode } from "@/lib/types";

interface DataSourceSetupSectionProps {
  campaignId: string;
  initialPrefs: DataPreferences | null;
}

type Direction = "Higher" | "Same" | "Lower";

interface SignalDef {
  key: keyof DataPreferences;
  label: string;
  short: string;         // compact label for table
  allowProxied: boolean;
  allowIndexed: boolean;
  proxySource?: string;
  directionKey?: keyof DataPreferences;
  pctKey?: keyof DataPreferences;
}

const SIGNALS: SignalDef[] = [
  {
    key: "mode_sov",
    label: "Signal 1 — Share of Voice",
    short: "Share of Voice",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Meta Ad Library + social listening estimate",
    directionKey: "indexed_sov_direction",
    pctKey: "indexed_sov_pct",
  },
  {
    key: "mode_save_rate",
    label: "Signal 2 — Save Rate",
    short: "Save Rate",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Category benchmark (Meta Business Benchmark Report)",
    directionKey: "indexed_save_rate_direction",
  },
  {
    key: "mode_share_rate",
    label: "Signal 2B — Share Rate",
    short: "Share Rate",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Category benchmark (TikTok for Business SEA Report)",
    directionKey: "indexed_share_rate_direction",
  },
  {
    key: "mode_branded_search",
    label: "Signal 3 — Branded Search Lift",
    short: "Branded Search",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Google Trends index for brand keyword",
    directionKey: "indexed_branded_search_direction",
    pctKey: "indexed_branded_search_pct",
  },
  {
    key: "mode_vcr",
    label: "Signal 3B — Video Completion Rate",
    short: "VCR",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Published VCR benchmark for category (TikTok/Meta)",
    directionKey: "indexed_vcr_direction",
  },
  {
    key: "mode_retention",
    label: "Signal 4 — App Retention",
    short: "App Retention",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Published app retention benchmark for category",
    directionKey: "indexed_retention_direction",
  },
  {
    key: "mode_attribution",
    label: "Attribution / Conversions",
    short: "Attribution",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Baseline delta method — pre/post campaign comparison",
    directionKey: "indexed_attribution_direction",
  },
  {
    key: "mode_media_spend",
    label: "Media Spend",
    short: "Media Spend",
    allowProxied: false,
    allowIndexed: true,
  },
];

const AUTO_SIGNALS = [
  { short: "Review Platform",   badge: "Public" },
  { short: "AI Brand Visibility (F23)", badge: "Public" },
  { short: "Social Currency (F20)",     badge: "Public" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modeMeta(mode: DataMode) {
  const map: Record<DataMode, { label: string; conf: string; cls: string }> = {
    confirmed:      { label: "Confirmed",      conf: "100%", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    indexed:        { label: "Indexed",         conf: "85%",  cls: "text-amber-700 bg-amber-50 border-amber-200" },
    stable_default: { label: "Stable Default",  conf: "80%",  cls: "text-blue-700 bg-blue-50 border-blue-200" },
    proxied:        { label: "Proxied",          conf: "70%",  cls: "text-slate-600 bg-slate-50 border-slate-200" },
  };
  return map[mode] ?? map.proxied;
}

// ─── Sub-detail row (shown inline below a signal row when mode needs input) ───

function SignalDetail({
  sig,
  mode,
  prefs,
  setField,
}: {
  sig: SignalDef;
  mode: DataMode;
  prefs: Partial<DataPreferences>;
  setField: (k: keyof DataPreferences, v: string | number | null) => void;
}) {
  const dir = prefs[sig.directionKey as keyof DataPreferences] as Direction | undefined;
  const pct = sig.pctKey ? prefs[sig.pctKey as keyof DataPreferences] as number | undefined : undefined;

  if (mode === "confirmed") {
    return (
      <p className="text-[11px] text-emerald-700 mt-1">
        Client provides actual data each week in the signal module.
      </p>
    );
  }
  if (mode === "proxied" && sig.proxySource) {
    return (
      <p className="text-[11px] text-slate-500 mt-1">
        Source: {sig.proxySource}
      </p>
    );
  }
  if (mode === "stable_default") {
    return (
      <p className="text-[11px] text-blue-600 mt-1">
        Baseline set once — flag manually if it shifts mid-campaign.
      </p>
    );
  }
  if (mode === "indexed") {
    return (
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {sig.directionKey && (
          <select
            value={dir ?? ""}
            onChange={(e) => setField(sig.directionKey as keyof DataPreferences, e.target.value || null)}
            className="text-xs border border-amber-200 rounded-lg px-2 py-1 bg-amber-50 text-amber-800 focus:outline-none"
          >
            <option value="">Direction vs prior week…</option>
            <option value="Higher">↑ Higher</option>
            <option value="Same">→ Same</option>
            <option value="Lower">↓ Lower</option>
          </select>
        )}
        {sig.pctKey && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={200}
              placeholder="% change"
              value={pct ?? ""}
              onChange={(e) => setField(sig.pctKey as keyof DataPreferences, e.target.value ? parseInt(e.target.value) : null)}
              className="text-xs border border-amber-200 rounded-lg px-2 py-1 bg-amber-50 text-amber-800 w-24 focus:outline-none"
            />
            <span className="text-[11px] text-amber-600">% (optional)</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DataSourceSetupSection({
  campaignId,
  initialPrefs,
}: DataSourceSetupSectionProps) {
  const defaultPrefs: Partial<DataPreferences> = {
    mode_sov: "confirmed",
    mode_save_rate: "confirmed",
    mode_share_rate: "confirmed",
    mode_branded_search: "confirmed",
    mode_vcr: "confirmed",
    mode_retention: "confirmed",
    mode_attribution: "confirmed",
    mode_media_spend: "confirmed",
  };

  const [prefs, setPrefs] = useState<Partial<DataPreferences>>(initialPrefs ?? defaultPrefs);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialPrefs);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!initialPrefs);

  function setMode(key: keyof DataPreferences, value: DataMode) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }
  function setField(key: keyof DataPreferences, value: string | number | null) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/data-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, ...prefs }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }
      setSaved(true);
      setIsExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card id="data-configuration">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <SectionTitle>Data Config</SectionTitle>
          <p className="text-xs text-neutral-500 mt-0.5">Signal sourcing mode for this campaign.</p>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:border-neutral-400 transition-colors"
        >
          {isExpanded ? "Collapse" : saved ? "Edit" : "Set up"}
        </button>
      </div>

      {/* Collapsed summary — compact badge row */}
      {!isExpanded && saved && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SIGNALS.map((sig) => {
            const mode = (prefs[sig.key] as DataMode) ?? "confirmed";
            const meta = modeMeta(mode);
            return (
              <span key={sig.key} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.cls}`}>
                {sig.short} · {meta.conf}
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded — compact table */}
      {isExpanded && (
        <div className="mt-4 space-y-4">

          {/* Signal table */}
          <div className="rounded-xl border border-neutral-100 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 bg-neutral-50 border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              <span>Signal</span>
              <span className="text-right">Confidence</span>
              <span className="text-right">Mode</span>
            </div>

            {/* Signal rows */}
            {SIGNALS.map((sig, i) => {
              const mode = (prefs[sig.key] as DataMode) ?? "confirmed";
              const meta = modeMeta(mode);
              const isLast = i === SIGNALS.length - 1;

              return (
                <div
                  key={sig.key}
                  className={`px-4 py-3 ${isLast ? "" : "border-b border-neutral-50"} bg-white`}
                >
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                    <p className="text-sm font-medium text-neutral-800">{sig.short}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      {meta.conf}
                    </span>
                    <select
                      value={mode}
                      onChange={(e) => setMode(sig.key, e.target.value as DataMode)}
                      className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 cursor-pointer"
                    >
                      <option value="confirmed">✓ Confirmed</option>
                      {sig.allowIndexed && <option value="indexed">↕ Indexed</option>}
                      {sig.allowIndexed && <option value="stable_default">◉ Stable</option>}
                      {sig.allowProxied && <option value="proxied">◎ Proxied</option>}
                    </select>
                  </div>
                  {/* Inline detail below row */}
                  <SignalDetail sig={sig} mode={mode} prefs={prefs} setField={setField} />
                </div>
              );
            })}

            {/* Auto-public rows */}
            <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              Always public
            </div>
            {AUTO_SIGNALS.map((s, i) => (
              <div key={s.short} className={`px-4 py-3 bg-white ${i < AUTO_SIGNALS.length - 1 ? "border-b border-neutral-50" : ""}`}>
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                  <p className="text-sm font-medium text-neutral-500">{s.short}</p>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border text-slate-500 bg-slate-50 border-slate-200">
                    Public
                  </span>
                  <span className="text-xs text-neutral-300 pr-1">auto</span>
                </div>
              </div>
            ))}
          </div>

          {/* Setup notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
              Setup notes (optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Client approved indexed mode for SOV and branded search."
              value={(prefs.setup_notes as string) ?? ""}
              onChange={(e) => setField("setup_notes", e.target.value)}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving…" : "Save Data Config"}
          </button>
        </div>
      )}
    </Card>
  );
}
