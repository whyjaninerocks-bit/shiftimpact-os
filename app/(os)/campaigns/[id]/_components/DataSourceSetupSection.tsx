"use client";
// DataSourceSetupSection.tsx
// Proxy Mode — Data Source Configuration
// Sprint 31 · 20 July 2026
//
// Sits immediately after CampaignInfoSection in the campaign page.
// Strategy lead + client configure how each signal's data will be sourced.
//
// Three modes per signal:
//   confirmed — client provides actual data (100% confidence)
//   indexed   — client provides directional signals (85% confidence)
//   proxied   — OS derives from public sources (70% confidence)
//
// Review Platform, AI Brand Visibility, Social Currency are always public —
// they show as auto-confirmed/proxied and cannot be changed.

import { useState } from "react";
import { Card, SectionTitle } from "@/app/_components/ui";
import type { DataPreferences, DataMode } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataSourceSetupSectionProps {
  campaignId: string;
  initialPrefs: DataPreferences | null;
}

type Direction = "Higher" | "Same" | "Lower";

// ─── Signal definitions ───────────────────────────────────────────────────────

interface SignalDef {
  key: keyof DataPreferences;
  label: string;
  description: string;
  allowProxied: boolean;
  allowIndexed: boolean;
  allowSpend?: boolean; // spend has no proxied option
  proxySource?: string;
  directionKey?: keyof DataPreferences;
  pctKey?: keyof DataPreferences;
  autoMode?: DataMode; // fixed — cannot be changed by user
  autoLabel?: string;
}

const SIGNALS: SignalDef[] = [
  {
    key: "mode_sov",
    label: "Signal 1 — Share of Voice",
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
    description: "Content save rate on Instagram and TikTok — measures intent-to-return.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Category benchmark (Meta Business Benchmark Report)",
    directionKey: "indexed_save_rate_direction",
  },
  {
    key: "mode_share_rate",
    label: "Signal 2B — Share Rate",
    description: "Content share rate — measures social amplification beyond the original audience.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Category benchmark (TikTok for Business SEA Report)",
    directionKey: "indexed_share_rate_direction",
  },
  {
    key: "mode_branded_search",
    label: "Signal 3 — Branded Search Lift",
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
    description: "Percentage of video ads watched to completion — measures creative resonance.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Published VCR benchmark for category (TikTok/Meta)",
    directionKey: "indexed_vcr_direction",
  },
  {
    key: "mode_retention",
    label: "Signal 4 — App Retention",
    description: "D7/D30 user retention in app — measures campaign-to-habit conversion.",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Published app retention benchmark for category",
    directionKey: "indexed_retention_direction",
  },
  {
    key: "mode_attribution",
    label: "Attribution / Conversions",
    description: "Campaign-attributed conversions (downloads, purchases, sign-ups).",
    allowProxied: true,
    allowIndexed: true,
    proxySource: "Baseline delta method — pre/post campaign comparison",
    directionKey: "indexed_attribution_direction",
  },
  {
    key: "mode_media_spend",
    label: "Media Spend",
    description: "Total campaign media investment — used for efficiency calculations.",
    allowProxied: false,
    allowIndexed: true,
    allowSpend: true,
  },
];

const AUTO_SIGNALS = [
  {
    label: "Review Platform — Google Reviews + TripAdvisor",
    description: "Public review data. Sourced directly from Google Maps and TripAdvisor.",
    badge: "◎ Public — always available",
  },
  {
    label: "AI Brand Visibility (F23)",
    description: "AI tool mentions are public signals. Monitored across ChatGPT, Gemini, Perplexity.",
    badge: "◎ Public — always available",
  },
  {
    label: "Social Currency Index (F20)",
    description: "Public post metrics (saves, shares, comments). No client data required.",
    badge: "◎ Public — always available",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modeColor(mode: DataMode): string {
  if (mode === "confirmed") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (mode === "indexed")   return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

function modeLabel(mode: DataMode): string {
  if (mode === "confirmed") return "✓ Confirmed";
  if (mode === "indexed")   return "↕ Indexed";
  return "◎ Proxied";
}

function confidenceLabel(mode: DataMode): string {
  if (mode === "confirmed") return "100% confidence";
  if (mode === "indexed")   return "85% confidence";
  return "70% confidence";
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
    "border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-300 cursor-pointer";
  const inputClass =
    "border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 w-24";
  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  return (
    <Card id="data-configuration">
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionTitle>Data Source Configuration</SectionTitle>
          <p className="text-xs text-neutral-500 mt-0.5">
            Set how each signal will be sourced for this campaign.
            Modules adapt their inputs based on the mode you choose here.
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
        <div className="mt-4 flex flex-wrap gap-2">
          {SIGNALS.map((sig) => {
            const mode = (prefs[sig.key] as DataMode) ?? "confirmed";
            return (
              <span
                key={sig.key}
                className={`text-xs font-medium px-2 py-1 rounded-full border ${modeColor(mode)}`}
              >
                {sig.label.split("—")[0].trim()} · {modeLabel(mode)}
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded form */}
      {isExpanded && (
        <div className="mt-5 space-y-4">

          {/* Configurable signals */}
          {SIGNALS.map((sig) => {
            const mode = (prefs[sig.key] as DataMode) ?? "confirmed";
            const dir = prefs[sig.directionKey as keyof DataPreferences] as Direction | undefined;
            const pct = sig.pctKey ? prefs[sig.pctKey as keyof DataPreferences] as number | undefined : undefined;

            return (
              <div
                key={sig.key}
                className="border border-neutral-100 rounded-xl p-4 bg-neutral-50"
              >
                {/* Row: label + mode selector */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800">{sig.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{sig.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${modeColor(mode)}`}>
                      {confidenceLabel(mode)}
                    </span>
                    <select
                      value={mode}
                      onChange={(e) => setMode(sig.key, e.target.value as DataMode)}
                      className={selectClass}
                    >
                      <option value="confirmed">✓ Confirmed — I will provide actual data</option>
                      {sig.allowIndexed && (
                        <option value="indexed">↕ Indexed — Directional signals only</option>
                      )}
                      {sig.allowProxied && (
                        <option value="proxied">◎ Proxied — Use public source</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Sub-panel: Confirmed */}
                {mode === "confirmed" && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <p className="text-xs text-emerald-700">
                      Client will provide actual data in the {sig.label.split("—")[1]?.trim() ?? sig.label} module each week.
                      No additional setup needed here.
                    </p>
                  </div>
                )}

                {/* Sub-panel: Indexed */}
                {mode === "indexed" && (
                  <div className="mt-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100 space-y-3">
                    <p className="text-xs text-amber-800 font-medium">
                      Directional input — client confirms trend direction each week without sharing exact figures.
                    </p>
                    {sig.directionKey && (
                      <div>
                        <label className={labelClass}>
                          {sig.label.split("—")[0].trim()} vs prior week
                        </label>
                        <select
                          value={dir ?? ""}
                          onChange={(e) =>
                            setField(
                              sig.directionKey as keyof DataPreferences,
                              e.target.value || null
                            )
                          }
                          className={selectClass}
                        >
                          <option value="">Select direction…</option>
                          <option value="Higher">↑ Higher than last week</option>
                          <option value="Same">→ About the same</option>
                          <option value="Lower">↓ Lower than last week</option>
                        </select>
                      </div>
                    )}
                    {sig.pctKey && (
                      <div>
                        <label className={labelClass}>Approximate % change (optional)</label>
                        <div className="flex items-center gap-2">
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

                {/* Sub-panel: Proxied */}
                {mode === "proxied" && sig.proxySource && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold">Public source:</span> {sig.proxySource}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Score will carry 70% confidence weighting. Labelled as Proxied in all outputs.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Auto-public signals (read-only) */}
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
              Always public — no client data required
            </p>
            <div className="space-y-2">
              {AUTO_SIGNALS.map((s) => (
                <div
                  key={s.label}
                  className="border border-neutral-100 rounded-xl p-3 bg-white flex items-start gap-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-700">{s.label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{s.description}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full border text-slate-600 bg-slate-50 border-slate-200 shrink-0">
                    {s.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Setup notes */}
          <div>
            <label className={labelClass}>Setup notes (optional)</label>
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
