"use client";

// app/clients/[id]/_components/BrandMomentumSection.tsx
// Feature 19 — Brand Momentum Score (F19) — Sprint 4
//
// Client-level composite score across 6 brand signal dimensions.
// Computed by Claude Haiku via /api/brand-momentum.
//
// ACCESS RULES:
//   - This entire section: INTERNAL ONLY (Janine / Strategy Lead)
//   - Client sees: bms_direction + bms_velocity + bms_confidence headline ONLY
//   - ai_read + dimension_conflict_flag: NEVER shown to client — visible here only
//   - Do NOT surface dimension inputs, conflict flags, or ai_read in Client Interface

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBrandMomentumInputs } from "@/lib/actions";
import type { BrandMomentumScore, BmsDirection, BmsVelocity } from "@/lib/types";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";

// ─── Display helpers ──────────────────────────────────────────────────────────

type ToneKey = "green" | "amber" | "red" | "neutral" | "blue" | "purple";

function directionTone(d: BmsDirection | null): ToneKey {
  if (d === "Positive") return "green";
  if (d === "Negative") return "red";
  return "neutral";
}

function velocityTone(v: BmsVelocity | null): ToneKey {
  if (v === "Accelerating") return "green";
  if (v === "Decelerating") return "amber";
  return "neutral";
}

function confidenceBar(score: number | null) {
  if (score == null) return null;
  const pct = (score / 10) * 100;
  const col = score >= 7 ? "bg-emerald-500" : score >= 4 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-neutral-600">{score}/10</span>
    </div>
  );
}

// ─── BMS result card (in-session + historical) ────────────────────────────────

interface BmsResult {
  bms_direction: BmsDirection | null;
  bms_velocity: BmsVelocity | null;
  bms_confidence: number | null;
  dimension_conflict_flag: boolean;
  ai_read: string;
}

function BmsResultCard({ result, period_label }: { result: BmsResult; period_label: string }) {
  const hasResult = result.bms_direction != null;
  if (!hasResult) return null;

  return (
    <Card className="border-neutral-300">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-600">{period_label}</p>
        {result.dimension_conflict_flag && (
          <Badge tone="amber">⚠ Dimension conflict</Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge tone={directionTone(result.bms_direction)}>
          {result.bms_direction ?? "—"}
        </Badge>
        <Badge tone={velocityTone(result.bms_velocity)}>
          {result.bms_velocity ?? "—"}
        </Badge>
      </div>
      {confidenceBar(result.bms_confidence)}
      {result.ai_read && (
        <p className="text-xs text-neutral-500 mt-3 border-t border-neutral-100 pt-2">
          {result.ai_read}
        </p>
      )}
    </Card>
  );
}

// ─── Input form ───────────────────────────────────────────────────────────────

interface BmsFormProps {
  clientId: string;
  onResult: (result: BmsResult, periodLabel: string) => void;
}

const TREND_OPTS  = [["", "Not assessed"], ["Up", "Up"], ["Flat", "Flat"], ["Down", "Down"]] as const;
const SOV_OPTS    = [["", "Not assessed"], ["Positive", "Positive (we gained SOV)"], ["Neutral", "Neutral"], ["Negative", "Negative (competitor gained)"]] as const;
const CEP_OPTS    = [["", "Not assessed"], ["Expanding", "Expanding"], ["Stable", "Stable"], ["Narrowing", "Narrowing"]] as const;
const COMP_OPTS   = [["", "Not assessed"], ["Gaining", "Gaining vs competitors"], ["Holding", "Holding position"], ["Losing", "Losing ground"]] as const;
const MAG_OPTS    = [["", "Not assessed"], ["Strong", "Strong"], ["Moderate", "Moderate"], ["Weak", "Weak"]] as const;

function selectOpts(opts: readonly (readonly [string, string])[]) {
  return opts.map(([v, l]) => <option key={v} value={v}>{l}</option>);
}

function BmsForm({ clientId, onResult }: BmsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [periodLabel,    setPeriodLabel]    = useState("Q" + Math.ceil((new Date().getMonth() + 1) / 3) + " " + new Date().getFullYear());
  const [periodStart,    setPeriodStart]    = useState(todayStr);
  const [periodEnd,      setPeriodEnd]      = useState("");
  const [sosTraj,        setSosTraj]        = useState("");
  const [sosMag,         setSosMag]         = useState("");
  const [sosNote,        setSosNote]        = useState("");
  const [saveRateTrend,  setSaveRateTrend]  = useState("");
  const [saveRateNote,   setSaveRateNote]   = useState("");
  const [ugcTrend,       setUgcTrend]       = useState("");
  const [ugcNote,        setUgcNote]        = useState("");
  const [sovSomRatio,    setSovSomRatio]    = useState("");
  const [sovSomNote,     setSovSomNote]     = useState("");
  const [cepCoverage,    setCepCoverage]    = useState("");
  const [cepNote,        setCepNote]        = useState("");
  const [compCtx,        setCompCtx]        = useState("");
  const [compNote,       setCompNote]       = useState("");

  const handleSave = () => {
    if (!periodStart) {
      setError("Period start date is required.");
      return;
    }
    setError(null);
    const capturedPeriodStart = periodStart;
    const capturedPeriodLabel = periodLabel;

    startTransition(async () => {
      // 1. Save inputs via server action (no redirect — revalidatePath only)
      const fd = new FormData();
      fd.append("period_label",        capturedPeriodLabel);
      fd.append("period_start",        capturedPeriodStart);
      fd.append("period_end",          periodEnd);
      fd.append("sos_trajectory",      sosTraj);
      fd.append("sos_magnitude",       sosMag);
      fd.append("sos_note",            sosNote);
      fd.append("save_rate_trend",     saveRateTrend);
      fd.append("save_rate_note",      saveRateNote);
      fd.append("ugc_trend",           ugcTrend);
      fd.append("ugc_note",            ugcNote);
      fd.append("sov_som_ratio",       sovSomRatio);
      fd.append("sov_som_note",        sovSomNote);
      fd.append("cep_coverage",        cepCoverage);
      fd.append("cep_note",            cepNote);
      fd.append("competitive_context", compCtx);
      fd.append("competitive_note",    compNote);

      await saveBrandMomentumInputs(clientId, fd);

      // 2. Call AI inference route
      const res = await fetch("/api/brand-momentum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, period_start: capturedPeriodStart }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "AI inference failed" }));
        setError(errData.error ?? "AI inference failed");
        return;
      }

      const result = await res.json();

      // 3. Show in-session result
      onResult(
        {
          bms_direction:          result.bms_direction,
          bms_velocity:           result.bms_velocity,
          bms_confidence:         result.bms_confidence,
          dimension_conflict_flag: result.dimension_conflict_flag,
          ai_read:                result.ai_read,
        },
        capturedPeriodLabel
      );

      // 4. Sync server state
      router.refresh();
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={buttonClass}>
        + New BMS Period
      </button>
    );
  }

  const selectCls = inputClass + " mt-1";
  const noteCls   = inputClass + " mt-1 resize-none";

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-neutral-700">New Brand Momentum Period</p>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-700">Cancel</button>
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <div className="space-y-4">
        {/* Period meta */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className={labelClass}>Period label</label>
            <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="e.g. Q3 2026" className={inputClass + " mt-1"} />
          </div>
          <div>
            <label className={labelClass}>Period start *</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputClass + " mt-1"} />
          </div>
          <div>
            <label className={labelClass}>Period end</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={inputClass + " mt-1"} />
          </div>
        </div>

        {/* D1 — SOV trajectory */}
        <fieldset className="border border-neutral-200 rounded p-3 space-y-2">
          <legend className="text-xs font-semibold text-neutral-600 px-1">D1 — Share of Voice Trajectory</legend>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>SOV direction</label>
              <select value={sosTraj} onChange={e => setSosTraj(e.target.value)} className={selectCls}>{selectOpts(TREND_OPTS)}</select>
            </div>
            <div>
              <label className={labelClass}>SOV magnitude</label>
              <select value={sosMag} onChange={e => setSosMag(e.target.value)} className={selectCls}>{selectOpts(MAG_OPTS)}</select>
            </div>
          </div>
          <textarea value={sosNote} onChange={e => setSosNote(e.target.value)} placeholder="Context note (optional)" rows={2} className={noteCls} />
        </fieldset>

        {/* D2 — Save rate trend */}
        <fieldset className="border border-neutral-200 rounded p-3 space-y-2">
          <legend className="text-xs font-semibold text-neutral-600 px-1">D2 — Content Save Rate Trend</legend>
          <select value={saveRateTrend} onChange={e => setSaveRateTrend(e.target.value)} className={selectCls}>{selectOpts(TREND_OPTS)}</select>
          <textarea value={saveRateNote} onChange={e => setSaveRateNote(e.target.value)} placeholder="Context note (optional)" rows={2} className={noteCls} />
        </fieldset>

        {/* D3 — UGC volume */}
        <fieldset className="border border-neutral-200 rounded p-3 space-y-2">
          <legend className="text-xs font-semibold text-neutral-600 px-1">D3 — UGC Volume Trend</legend>
          <select value={ugcTrend} onChange={e => setUgcTrend(e.target.value)} className={selectCls}>{selectOpts(TREND_OPTS)}</select>
          <textarea value={ugcNote} onChange={e => setUgcNote(e.target.value)} placeholder="Context note (optional)" rows={2} className={noteCls} />
        </fieldset>

        {/* D4 — SOV:SOM ratio */}
        <fieldset className="border border-neutral-200 rounded p-3 space-y-2">
          <legend className="text-xs font-semibold text-neutral-600 px-1">D4 — SOV:SOM Ratio Signal</legend>
          <select value={sovSomRatio} onChange={e => setSovSomRatio(e.target.value)} className={selectCls}>{selectOpts(SOV_OPTS)}</select>
          <textarea value={sovSomNote} onChange={e => setSovSomNote(e.target.value)} placeholder="e.g. SOV exceeding SOM by 8pp — over-indexed" rows={2} className={noteCls} />
        </fieldset>

        {/* D5 — CEP coverage */}
        <fieldset className="border border-neutral-200 rounded p-3 space-y-2">
          <legend className="text-xs font-semibold text-neutral-600 px-1">D5 — Category Entry Point Coverage</legend>
          <select value={cepCoverage} onChange={e => setCepCoverage(e.target.value)} className={selectCls}>{selectOpts(CEP_OPTS)}</select>
          <textarea value={cepNote} onChange={e => setCepNote(e.target.value)} placeholder="Context note (optional)" rows={2} className={noteCls} />
        </fieldset>

        {/* D6 — Competitive context */}
        <fieldset className="border border-neutral-200 rounded p-3 space-y-2">
          <legend className="text-xs font-semibold text-neutral-600 px-1">D6 — Competitive Context</legend>
          <select value={compCtx} onChange={e => setCompCtx(e.target.value)} className={selectCls}>{selectOpts(COMP_OPTS)}</select>
          <textarea value={compNote} onChange={e => setCompNote(e.target.value)} placeholder="Context note (optional)" rows={2} className={noteCls} />
        </fieldset>

        <button onClick={handleSave} disabled={isPending} className={buttonClass}>
          {isPending ? "Computing BMS…" : "Save & Compute BMS"}
        </button>
      </div>
    </Card>
  );
}

// ─── Historical BMS records ───────────────────────────────────────────────────

function HistoryCard({ score }: { score: BrandMomentumScore }) {
  const scored = score.bms_direction != null;
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-600">{score.period_label || score.period_start}</p>
        {score.dimension_conflict_flag && <Badge tone="amber">⚠ Conflict</Badge>}
      </div>
      {scored ? (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge tone={directionTone(score.bms_direction)}>{score.bms_direction}</Badge>
            <Badge tone={velocityTone(score.bms_velocity)}>{score.bms_velocity}</Badge>
          </div>
          {confidenceBar(score.bms_confidence)}
          {score.ai_read && (
            <p className="text-xs text-neutral-500 mt-2 border-t border-neutral-100 pt-2">{score.ai_read}</p>
          )}
        </>
      ) : (
        <p className="text-xs text-neutral-400">Inputs saved — BMS not yet computed.</p>
      )}
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BrandMomentumSectionProps {
  clientId: string;
  scores: BrandMomentumScore[];
}

export function BrandMomentumSection({ clientId, scores }: BrandMomentumSectionProps) {
  const [inSessionResult, setInSessionResult] = useState<BmsResult | null>(null);
  const [inSessionLabel, setInSessionLabel] = useState<string>("");

  const handleResult = (result: BmsResult, label: string) => {
    setInSessionResult(result);
    setInSessionLabel(label);
  };

  return (
    <section id="brand-momentum">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle id="brand-momentum">Brand Momentum Score</SectionTitle>
        <Badge tone="neutral">F19 ⚿</Badge>
      </div>

      <p className="text-xs text-neutral-500 mb-4">
        Client-level composite across 6 brand signal dimensions. Computed by AI per period.
        Headline (Direction / Velocity / Confidence) may be shared with client — ai_read and conflict flag are internal only.
      </p>

      {/* In-session result */}
      {inSessionResult && (
        <div className="mb-4">
          <BmsResultCard result={inSessionResult} period_label={inSessionLabel} />
        </div>
      )}

      <BmsForm clientId={clientId} onResult={handleResult} />

      {/* Historical */}
      {scores.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Prior periods</p>
          {scores.map(s => <HistoryCard key={s.id} score={s} />)}
        </div>
      )}
    </section>
  );
}
