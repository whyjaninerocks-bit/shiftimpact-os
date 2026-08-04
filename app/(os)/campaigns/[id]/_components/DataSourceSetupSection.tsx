"use client";
// DataSourceSetupSection.tsx
// Proxy Mode — Data Source Configuration
// Sprint 31 · 20 July 2026

import { useState } from "react";
import { Card, SectionTitle } from "@/app/_components/ui";
import type { DataPreferences, DataMode } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataSourceSetupSectionProps {
  campaignId: string;
  initialPrefs: DataPreferences | null;
}

type Direction = "Higher" | "Same" | "Lower";

interface SignalDef {
  key: keyof DataPreferences;
  label: string;
  shortLabel: string;
  description: string;
  allowProxied: boolean;
  allowIndexed: boolean;
  proxySource?: string;
  directionKey?: keyof DataPreferences;
  pctKey?: keyof DataPreferences;
}

// ─── Signal definitions ───────────────────────────────────────────────────────

const SIGNALS: SignalDef[] = [
  {
    key: "mode_sov",
    label: "Signal 1 — Share of Voice",
    shortLabel: "S1 Share of Voice",
    description: "Brand's share of category conversation vs competitors across paid + organic.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Meta Ad Library + social listening estimate",
    directionKey: "indexed_sov_direction",
    pctKey: "indexed_sov_pct",
  },
  {
    key: "mode_save_rate",
    label: "Signal 2 — Save Rate",
    shortLabel: "S2 Save Rate",
    description: "Content save rate on Instagram and TikTok — measures intent-to-return.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Category benchmark (Meta Business Benchmark Report)",
    directionKey: "indexed_save_rate_direction",
  },
  {
    key: "mode_share_rate",
    label: "Signal 2B — Share Rate",
    shortLabel: "S2B Share Rate",
    description: "Content share rate — measures social amplification beyond the original audience.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Category benchmark (TikTok for Business SEA Report)",
    directionKey: "indexed_share_rate_direction",
  },
  {
    key: "mode_branded_search",
    label: "Signal 3 — Branded Search Lift",
    shortLabel: "S3 Branded Search",
    description: "Change in branded keyword search volume — measures campaign-driven intent.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Google Trends index for brand keyword",
    directionKey: "indexed_branded_search_direction",
    pctKey: "indexed_branded_search_pct",
  },
  {
    key: "mode_vcr",
    label: "Signal 3B — Video Completion Rate",
    shortLabel: "S3B Video Completion",
    description: "Percentage of video ads watched to completion — measures creative resonance.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Published VCR benchmark for category (TikTok/Meta)",
    directionKey: "indexed_vcr_direction",
  },
  {
    key: "mode_retention",
    label: "Signal 4 — App Retention",
    shortLabel: "S4 App Retention",
    description: "D7/D30 user retention in app — measures campaign-to-habit conversion.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Published app retention benchmark for category",
    directionKey: "indexed_retention_direction",
  },
  {
    key: "mode_attribution",
    label: "Attribution / Conversions",
    shortLabel: "Attribution",
    description: "Campaign-attributed conversions (downloads, purchases, sign-ups).",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Baseline delta method — pre/post campaign comparison",
    directionKey: "indexed_attribution_direction",
  },
  {
    key: "mode_media_spend",
    label: "Media Spend",
    shortLabel: "Media Spend",
    description: "Total campaign media investment — used for efficiency calculations.",
    allowProxied: false,
    allowIndexed: true,
  },
];

const AUTO_SIGNALS = [
  {
    label: "Review Platform — Google Reviews + TripAdvisor",
    description: "Public review data. Sourced directly from Google Maps and TripAdvisor.",
  },
  {
    label: "AI Brand Visibility (F23)",
    description: "AI tool mentions are public signals. Monitored across ChatGPT, Gemini, Perplexity.",
  },
  {
    label: "Social Currency Index (F20)",
    description: "Public post metrics (saves, shares, comments). No client data required.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modeColor(mode: DataMode): string {
  if (mode === "confirmed")      return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (mode === "indexed")        return "text-amber-700 bg-amber-50 border-amber-200";
  if (mode === "stable_default") return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

function modeLabel(mode: DataMode): string {
  if (mode === "confirmed")      return "✓ Confirmed";
  if (mode === "indexed")        return "↕ Indexed";
  if (mode === "stable_default") return "◉ Stable Default";
  return "◎ Proxied";
}

function confidenceLabel(mode: DataMode): string {
  if (mode === "confirmed")      return "100%";
  if (mode === "indexed")        return "85%";
  if (mode === "stable_default") return "80%";
  return "70%";
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
    // Attribution defaults to Proxied — only upgrade to Confirmed once real
    // attribution data (pixel, CRM export, or promo code tracking) is wired up.
    mode_attribution: "proxied",
    mode_media_spend: "confirmed",
  };

  const [prefs, setPrefs] = useState<Partial<DataPreferences>>(
    initialPrefs ?? defaultPrefs
  );
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

  const selectClass =
    "border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-300 cursor-pointer";
  const inputClass =
    "border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 w-20";
  const fieldLabelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  return (
    <Card id="data-configuration">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionTitle>Data Source Configuration</SectionTitle>
          <p className="text-xs text-neutral-500 mt-0.5">
            Set how each signal will be sourced. Modules adapt based on the mode chosen here.
          </p>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="shrink-0 text-xs text-neutral-400 hover:text-neutral-700 underline"
        >
          {isExpanded ? "Collapse" : saved ? "Edit" : "Set up"}
        </button>
      </div>

      {/* Summary badges when collapsed */}
      {!isExpanded && saved && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SIGNALS.map((sig) => {
            const mode = (prefs[sig.key] as DataMode) ?? "confirmed";
            return (
              <span
                key={sig.key}
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${modeColor(mode)}`}
              >
                {sig.shortLabel} · {confidenceLabel(mode)}
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded form */}
      {isExpanded && (
        <div className="mt-4 space-y-4">

          {/* Signal rows — single container, divider-separated */}
          <div className="border border-neutral-100 rounded-xl overflow-hidden bg-white">
            {SIGNALS.map((sig, i) => {
              const mode = (prefs[sig.key] as DataMode) ?? "confirmed";
              const dir = sig.directionKey
                ? (prefs[sig.directionKey as keyof DataPreferences] as Direction | undefined)
                : undefined;
              const pct = sig.pctKey
                ? (prefs[sig.pctKey as keyof DataPreferences] as number | undefined)
                : undefined;
              const isLast = i === SIGNALS.length - 1;

              return (
                <div key={sig.key} className={isLast ? "" : "border-b border-neutral-100"}>
                  {/* Main row */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 leading-tight">{sig.label}</p>
                      <p className="text-xs text-neutral-400 mt-0.5 leading-snug hidden sm:block">{sig.description}</p>
                    </div>
                    {/* Confidence badge */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 hidden sm:inline-flex ${modeColor(mode)}`}>
                      {confidenceLabel(mode)} conf
                    </span>
                    {/* Mode select */}
                    <select
                      value={mode}
                      onChange={(e) => setMode(sig.key, e.target.value as DataMode)}
                      className={selectClass}
                    >
                      <option value="confirmed">✓ Confirmed</option>
                      {sig.allowIndexed && (
                        <option value="indexed">↕ Indexed</option>
                      )}
                      {sig.allowIndexed && (
                        <option value="stable_default">◉ Stable Default</option>
                      )}
                      {sig.allowProxied && (
                        <option value="proxied">◎ Proxied</option>
                      )}
                    </select>
                  </div>

                  {/* Sub-panel — confirmed: nothing shown */}

                  {/* Sub-panel — indexed */}
                  {mode === "indexed" && (
                    <div className="mx-3 mb-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100 space-y-2">
                      <p className="text-xs text-amber-800 font-medium">
                        Client confirms trend direction each week — no exact figures required.
                      </p>
                      {sig.directionKey && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <label className={fieldLabelClass}>{sig.shortLabel} vs prior week</label>
                            <select
                              value={dir ?? ""}
                              onChange={(e) =>
                                setField(sig.directionKey as keyof DataPreferences, e.target.value || null)
                              }
                              className={selectClass}
                            >
                              <option value="">Select direction…</option>
                              <option value="Higher">↑ Higher than last week</option>
                              <option value="Same">→ About the same</option>
                              <option value="Lower">↓ Lower than last week</option>
                            </select>
                          </div>
                          {sig.pctKey && (
                            <div>
                              <label className={fieldLabelClass}>Approx % change (optional)</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={200}
                                  placeholder="e.g. 15"
                                  value={pct ?? ""}
                                  onChange={(e) =>
                                    setField(
                                      sig.pctKey as keyof DataPreferences,
                                      e.target.value ? parseInt(e.target.value) : null
                                    )
                                  }
                                  className={inputClass}
                                />
                                <span className="text-xs text-neutral-400">%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-panel — stable default */}
                  {mode === "stable_default" && (
                    <div className="mx-3 mb-2.5 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-xs text-blue-800">
                        Baseline set once at campaign start. OS assumes stable week-on-week unless you flag a change.
                        80% confidence — labelled Stable Default in all outputs.
                      </p>
                    </div>
                  )}

                  {/* Sub-panel — proxied */}
                  {mode === "proxied" && sig.proxySource && (
                    <div className="mx-3 mb-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Public source:</span> {sig.proxySource}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        70% confidence — labelled Proxied in all outputs.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Always-public signals */}
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
              Always public — no client data required
            </p>
            <div className="border border-neutral-100 rounded-xl overflow-hidden bg-white">
              {AUTO_SIGNALS.map((s, i) => (
                <div key={s.label} className={`flex items-center gap-3 px-3 py-2.5 ${i < AUTO_SIGNALS.length - 1 ? "border-b border-neutral-100" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-700">{s.label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5 hidden sm:block">{s.description}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-slate-600 bg-slate-50 border-slate-200 shrink-0">
                    ◎ Public
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Setup notes */}
          <div>
            <label className={fieldLabelClass}>Setup notes (optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Client approved indexed mode for SOV and branded search. Attribution to use baseline delta (Scenario C)."
              value={(prefs.setup_notes as string) ?? ""}
              onChange={(e) => setField("setup_notes", e.target.value)}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving…" : "Save Data Source Configuration"}
          </button>
        </div>
      )}
    </Card>
  );
}
