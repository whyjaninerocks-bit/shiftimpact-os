"use client";

// app/campaigns/[id]/_components/MarketContextSection.tsx
// Feature 16C — AI Market Variable Layer (Sprint 4)
//
// Lets the strategy lead enter external market variable context each week.
// These 6 signal types distinguish campaign problems from market-wide conditions.
// Saved to signal_market_contexts → loaded by /api/signal-report → injected into AI prompt.
//
// INTERNAL ONLY. Enriches the Signal Intelligence AI report — not a client-facing section.

import { useState, useTransition } from "react";
import { saveSignalMarketContext } from "@/lib/actions";
import type { SignalMarketContext } from "@/lib/types";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendOpt   = "Up" | "Flat" | "Down" | "";
type SovOpt     = "Positive" | "Neutral" | "Negative" | "";

// ─── Context display (read-only view of a saved context record) ───────────────

function ContextRow({ label, value, note }: { label: string; value?: string | null; note?: string }) {
  if (!value && !note) return null;
  return (
    <div className="flex gap-2 text-xs py-1 border-b border-neutral-100 last:border-0">
      <span className="text-neutral-500 w-44 shrink-0">{label}</span>
      <span className="text-neutral-800 font-medium">{value || "—"}</span>
      {note && <span className="text-neutral-500 ml-1">— {note}</span>}
    </div>
  );
}

function ContextFlagRow({ label, flagged, note }: { label: string; flagged: boolean; note?: string }) {
  if (!flagged) return null;
  return (
    <div className="flex gap-2 text-xs py-1 border-b border-neutral-100 last:border-0">
      <span className="text-neutral-500 w-44 shrink-0">{label}</span>
      <Badge tone="amber">Flagged</Badge>
      {note && <span className="text-neutral-500 ml-2">{note}</span>}
    </div>
  );
}

function SavedContextCard({ ctx }: { ctx: SignalMarketContext }) {
  const hasContent =
    ctx.category_search_trend ||
    ctx.competitive_sov_change ||
    ctx.cultural_moment_flag ||
    ctx.platform_algorithm_flag ||
    ctx.macro_context_note ||
    ctx.weather_seasonality_note;

  if (!hasContent) {
    return (
      <Card>
        <p className="text-xs text-neutral-400">No market context saved for Week {ctx.week_number}.</p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-xs font-medium text-neutral-500 mb-2">Week {ctx.week_number} context</p>
      <ContextRow label="Category search" value={ctx.category_search_trend} note={ctx.category_search_note} />
      <ContextRow label="Competitive SOV" value={ctx.competitive_sov_change} note={ctx.competitive_sov_note} />
      <ContextFlagRow label="Cultural moment" flagged={ctx.cultural_moment_flag} note={ctx.cultural_moment_note} />
      <ContextFlagRow label="Platform algorithm" flagged={ctx.platform_algorithm_flag} note={ctx.platform_algorithm_note} />
      {ctx.macro_context_note && (
        <ContextRow label="Macro context" note={ctx.macro_context_note} />
      )}
      {ctx.weather_seasonality_note && (
        <ContextRow label="Weather / seasonality" note={ctx.weather_seasonality_note} />
      )}
    </Card>
  );
}

// ─── Market context entry form ────────────────────────────────────────────────

interface MarketContextFormProps {
  campaignId: string;
  weekNumber: number;
  existing: SignalMarketContext | null;
  onSaved: () => void;
}

function MarketContextForm({ campaignId, weekNumber, existing, onSaved }: MarketContextFormProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(!existing);

  const [categoryTrend, setCategoryTrend] = useState<TrendOpt>((existing?.category_search_trend as TrendOpt) ?? "");
  const [categoryNote, setCategoryNote] = useState(existing?.category_search_note ?? "");
  const [sovChange, setSovChange] = useState<SovOpt>((existing?.competitive_sov_change as SovOpt) ?? "");
  const [sovNote, setSovNote] = useState(existing?.competitive_sov_note ?? "");
  const [culturalFlag, setCulturalFlag] = useState(existing?.cultural_moment_flag ?? false);
  const [culturalNote, setCulturalNote] = useState(existing?.cultural_moment_note ?? "");
  const [platformFlag, setPlatformFlag] = useState(existing?.platform_algorithm_flag ?? false);
  const [platformNote, setPlatformNote] = useState(existing?.platform_algorithm_note ?? "");
  const [macroNote, setMacroNote] = useState(existing?.macro_context_note ?? "");
  const [weatherNote, setWeatherNote] = useState(existing?.weather_seasonality_note ?? "");

  const handleSave = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("category_search_trend",   categoryTrend);
      fd.append("category_search_note",    categoryNote);
      fd.append("competitive_sov_change",  sovChange);
      fd.append("competitive_sov_note",    sovNote);
      fd.append("cultural_moment_flag",    String(culturalFlag));
      fd.append("cultural_moment_note",    culturalNote);
      fd.append("platform_algorithm_flag", String(platformFlag));
      fd.append("platform_algorithm_note", platformNote);
      fd.append("macro_context_note",      macroNote);
      fd.append("weather_seasonality_note", weatherNote);
      await saveSignalMarketContext(campaignId, weekNumber, fd);
      setOpen(false);
      onSaved();
    });
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={buttonSecondaryClass + " text-xs mt-2"}>
        {existing ? "Edit market context" : "Add market context"}
      </button>
    );
  }

  const selectCls = inputClass + " mt-1";
  const noteClass = inputClass + " mt-1 resize-none";

  return (
    <Card className="mt-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-neutral-600">Week {weekNumber} — Market Context</p>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-700">Cancel</button>
      </div>

      <div className="space-y-4">
        {/* 1. Category search */}
        <div>
          <label className={labelClass}>Category search volume trend</label>
          <select value={categoryTrend} onChange={e => setCategoryTrend(e.target.value as TrendOpt)} className={selectCls}>
            <option value="">Not assessed</option>
            <option value="Up">Up</option>
            <option value="Flat">Flat</option>
            <option value="Down">Down</option>
          </select>
          <textarea value={categoryNote} onChange={e => setCategoryNote(e.target.value)}
            placeholder="e.g. category search down 25% this week — not campaign-specific"
            rows={2} className={noteClass} />
        </div>

        {/* 2. Competitive SOV */}
        <div>
          <label className={labelClass}>Competitive SOV change</label>
          <select value={sovChange} onChange={e => setSovChange(e.target.value as SovOpt)} className={selectCls}>
            <option value="">Not assessed</option>
            <option value="Positive">Positive (we gained SOV)</option>
            <option value="Neutral">Neutral</option>
            <option value="Negative">Negative (competitor gained SOV)</option>
          </select>
          <textarea value={sovNote} onChange={e => setSovNote(e.target.value)}
            placeholder="e.g. Competitor X launched TV burst this week"
            rows={2} className={noteClass} />
        </div>

        {/* 3. Cultural moment */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <input type="checkbox" id="cultural_moment_flag" checked={culturalFlag}
              onChange={e => setCulturalFlag(e.target.checked)} className="rounded" />
            <label htmlFor="cultural_moment_flag" className="text-xs font-medium text-neutral-600">
              Cultural moment active this week
            </label>
          </div>
          {culturalFlag && (
            <textarea value={culturalNote} onChange={e => setCulturalNote(e.target.value)}
              placeholder="e.g. Final week of Ramadan — humour-forward content may see suppressed saves"
              rows={2} className={noteClass} />
          )}
        </div>

        {/* 4. Platform algorithm */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <input type="checkbox" id="platform_algorithm_flag" checked={platformFlag}
              onChange={e => setPlatformFlag(e.target.checked)} className="rounded" />
            <label htmlFor="platform_algorithm_flag" className="text-xs font-medium text-neutral-600">
              Platform algorithm / policy change
            </label>
          </div>
          {platformFlag && (
            <textarea value={platformNote} onChange={e => setPlatformNote(e.target.value)}
              placeholder="e.g. TikTok reach algorithm updated — engagement rates not directly comparable to W3"
              rows={2} className={noteClass} />
          )}
        </div>

        {/* 5. Macro context */}
        <div>
          <label className={labelClass}>Macro-economic context (optional)</label>
          <textarea value={macroNote} onChange={e => setMacroNote(e.target.value)}
            placeholder="e.g. Consumer confidence index at 12-month low — Conversion suppression likely market-wide"
            rows={2} className={noteClass} />
        </div>

        {/* 6. Weather / seasonality */}
        <div>
          <label className={labelClass}>Weather / seasonality note (optional)</label>
          <textarea value={weatherNote} onChange={e => setWeatherNote(e.target.value)}
            placeholder="e.g. School holidays driving FMCG category spike — do not attribute to campaign performance"
            rows={2} className={noteClass} />
        </div>

        <button onClick={handleSave} disabled={isPending} className={buttonClass}>
          {isPending ? "Saving…" : "Save Market Context"}
        </button>
      </div>
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface MarketContextSectionProps {
  campaignId: string;
  marketContexts: SignalMarketContext[];
  latestSignalWeek: number | null;   // from signal_weekly_reports — current active week
}

export function MarketContextSection({
  campaignId,
  marketContexts,
  latestSignalWeek,
}: MarketContextSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Default to the most recent signal week, or 1
  const activeWeek = latestSignalWeek ?? 1;
  const existingForWeek = marketContexts.find(c => c.week_number === activeWeek) ?? null;

  // Historical contexts sorted newest → oldest (excluding the active week)
  const history = marketContexts.filter(c => c.week_number !== activeWeek)
    .sort((a, b) => b.week_number - a.week_number);

  return (
    <section id="market-context">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle id="market-context">Market Variable Context</SectionTitle>
        <Badge tone="neutral">F16C ⚿</Badge>
      </div>

      <p className="text-xs text-neutral-500 mb-4">
        External market signals entered weekly. Injected into the Signal Intelligence AI report to
        distinguish campaign problems from market-wide conditions.
        All 6 variables are optional — leave blank if not assessed this week.
      </p>

      {/* Current week */}
      <div className="space-y-2">
        {existingForWeek && <SavedContextCard ctx={existingForWeek} />}
        <MarketContextForm
          key={`${activeWeek}-${refreshKey}`}
          campaignId={campaignId}
          weekNumber={activeWeek}
          existing={existingForWeek}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      </div>

      {/* Historical contexts */}
      {history.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Prior weeks
          </p>
          <div className="space-y-2">
            {history.slice(0, 4).map(ctx => (
              <SavedContextCard key={ctx.id} ctx={ctx} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
