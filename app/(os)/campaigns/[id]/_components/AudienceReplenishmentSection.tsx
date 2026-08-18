"use client";
// AudienceReplenishmentSection.tsx
// Expert Architecture Addition — Audience Replenishment Rate (ARR)
//
// SPEC (PRD Addendum v2.3):
//   Tracks pipeline horizon: estimated weeks before Conversion funnel empties.
//   Formula: Estimated nurture pool ÷ weekly conversion count = weeks of pipeline remaining.
//   Red Flag trigger: horizon < 8 weeks.
//
//   Client-facing language: "At your current media mix, you have approximately N weeks
//   before Conversion volume starts to decline."
//
// ACCESS: Metric shown to client as plain language only. Raw inputs are INTERNAL.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAudienceReplenishment } from "@/lib/actions";
import { Badge, Card, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReplenishmentRecord {
  id: string;
  week_number: number;
  estimated_nurture_pool: number | null;
  weekly_conversion_count: number | null;
  demand_new_audience: number | null;
  notes: string;
  created_at: string;
}

interface Props {
  campaignId: string;
  records: ReplenishmentRecord[];
  latestSignalWeek: number;
}

// ─── Computation ─────────────────────────────────────────────────────────────

function computeHorizon(pool: number | null, conversions: number | null): number | null {
  if (!pool || !conversions || conversions <= 0) return null;
  return Math.round((pool / conversions) * 10) / 10;
}

function horizonStatus(weeks: number | null): "Red Flag" | "Watch" | "Healthy" | "Unknown" {
  if (weeks === null) return "Unknown";
  if (weeks < 8)  return "Red Flag";
  if (weeks < 12) return "Watch";
  return "Healthy";
}

function horizonTone(s: ReturnType<typeof horizonStatus>): "red" | "amber" | "green" | "neutral" {
  if (s === "Red Flag") return "red";
  if (s === "Watch")    return "amber";
  if (s === "Healthy")  return "green";
  return "neutral";
}

function horizonMessage(weeks: number | null, newAudience: number | null): string {
  if (weeks === null) return "Enter nurture pool size and weekly conversions to compute pipeline horizon.";
  const status = horizonStatus(weeks);
  if (status === "Red Flag") {
    return `Pipeline horizon: approximately ${weeks} weeks. RED FLAG — below 8-week threshold. ` +
      "Immediate Demand investment required to prevent Conversion volume decline.";
  }
  if (status === "Watch") {
    return `Pipeline horizon: approximately ${weeks} weeks. Begin increasing Demand allocation ` +
      "now to maintain Conversion momentum.";
  }
  if (newAudience && newAudience > 0) {
    return `Pipeline horizon: approximately ${weeks} weeks. ${newAudience.toLocaleString()} new audience members ` +
      "entering Demand stage this week — replenishment is healthy.";
  }
  return `Pipeline horizon: approximately ${weeks} weeks. Conversion funnel is well-supplied at current Demand investment.`;
}

// ─── Input form ───────────────────────────────────────────────────────────────

interface FormProps {
  campaignId: string;
  defaultWeek: number;
  onSaved: () => void;
}

function ReplenishmentForm({ campaignId, defaultWeek, onSaved }: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [week,      setWeek]      = useState(String(defaultWeek));
  const [pool,      setPool]      = useState("");
  const [conv,      setConv]      = useState("");
  const [newAud,    setNewAud]    = useState("");
  const [notes,     setNotes]     = useState("");

  function handleSave() {
    if (!week) { setError("Week number required."); return; }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("week_number",           week);
      fd.append("estimated_nurture_pool", pool);
      fd.append("weekly_conversion_count", conv);
      fd.append("demand_new_audience",    newAud);
      fd.append("notes",                  notes);
      await saveAudienceReplenishment(campaignId, fd);
      setOpen(false);
      setPool(""); setConv(""); setNewAud(""); setNotes("");
      router.refresh();
      onSaved();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={buttonClass}>
        + Log Week
      </button>
    );
  }

  // Live preview
  const horizonPreview = computeHorizon(
    pool ? parseInt(pool, 10) : null,
    conv ? parseInt(conv, 10) : null
  );

  return (
    <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-700">Log Weekly Replenishment Data</p>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-700">Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Week Number</label>
          <input type="number" value={week} onChange={(e) => setWeek(e.target.value)}
            min={0} className={inputClass + " mt-1"} />
        </div>
        <div>
          <label className={labelClass}>Estimated Nurture Pool</label>
          <input type="number" value={pool} onChange={(e) => setPool(e.target.value)}
            placeholder="e.g. 45000" className={inputClass + " mt-1"} />
        </div>
        <div>
          <label className={labelClass}>Weekly Conversion Count</label>
          <input type="number" value={conv} onChange={(e) => setConv(e.target.value)}
            placeholder="e.g. 3500" className={inputClass + " mt-1"} />
        </div>
        <div>
          <label className={labelClass}>New Demand Audience This Week</label>
          <input type="number" value={newAud} onChange={(e) => setNewAud(e.target.value)}
            placeholder="e.g. 8000" className={inputClass + " mt-1"} />
        </div>
      </div>

      {/* Live preview */}
      {horizonPreview !== null && (
        <div className={`rounded border px-3 py-2 text-xs ${
          horizonStatus(horizonPreview) === "Red Flag" ? "bg-red-50 border-red-200 text-red-700" :
          horizonStatus(horizonPreview) === "Watch"    ? "bg-amber-50 border-amber-200 text-amber-700" :
                                                          "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          Preview: <strong>{horizonPreview} weeks</strong> pipeline horizon —{" "}
          {horizonStatus(horizonPreview)}
        </div>
      )}

      <div>
        <label className={labelClass}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2} className={inputClass + " mt-1 resize-none"} placeholder="Context, data source, caveats…" />
      </div>

      <button onClick={handleSave} disabled={isPending} className={buttonClass}>
        {isPending ? "Saving…" : "Save Week"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AudienceReplenishmentSection({ campaignId, records, latestSignalWeek }: Props) {
  const [refreshed, setRefreshed] = useState(false);

  const sorted = [...records].sort((a, b) => b.week_number - a.week_number);
  const latest = sorted[0] ?? null;
  const horizon = computeHorizon(latest?.estimated_nurture_pool ?? null, latest?.weekly_conversion_count ?? null);
  const status  = horizonStatus(horizon);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <SectionTitle id="audience-replenishment">Audience Replenishment Rate</SectionTitle>
        <Badge tone="neutral">Expert Arch ⚿</Badge>
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        Pipeline horizon: estimated weeks before Conversion funnel runs short. Red Flag below 8 weeks.
        Identifies the demand depletion problem before it shows in sales data.
      </p>

      {/* Latest horizon headline */}
      {latest ? (
        <div className={`rounded-lg border px-4 py-3 mb-4 ${
          status === "Red Flag" ? "bg-red-50 border-red-300" :
          status === "Watch"    ? "bg-amber-50 border-amber-200" :
                                   "bg-emerald-50 border-emerald-200"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <Badge tone={horizonTone(status)}>{status}</Badge>
            {horizon !== null && (
              <span className={`text-sm font-bold ${
                status === "Red Flag" ? "text-red-700" :
                status === "Watch"    ? "text-amber-700" :
                                        "text-emerald-700"
              }`}>
                {horizon} week{horizon !== 1 ? "s" : ""} remaining
              </span>
            )}
          </div>
          <p className={`text-xs ${
            status === "Red Flag" ? "text-red-600" :
            status === "Watch"    ? "text-amber-600" :
                                     "text-emerald-600"
          }`}>
            {horizonMessage(horizon, latest.demand_new_audience)}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-3 mb-4">
          <p className="text-xs text-neutral-400">
            No data logged yet. Enter nurture pool and conversion data below to compute pipeline horizon.
          </p>
        </div>
      )}

      {/* Input form */}
      <ReplenishmentForm
        campaignId={campaignId}
        defaultWeek={latestSignalWeek + 1}
        onSaved={() => setRefreshed(true)}
      />

      {/* History */}
      {sorted.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">History</p>
          {sorted.map((rec) => {
            const h   = computeHorizon(rec.estimated_nurture_pool, rec.weekly_conversion_count);
            const s   = horizonStatus(h);
            return (
              <div key={rec.id} className="border border-neutral-100 rounded p-3 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-600">Week {rec.week_number}</span>
                  <Badge tone={horizonTone(s)}>{h !== null ? `${h}w` : "—"}</Badge>
                  {s === "Red Flag" && <Badge tone="red">Red Flag</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-neutral-500">
                  <span>Nurture pool: {rec.estimated_nurture_pool?.toLocaleString() ?? "—"}</span>
                  <span>Conversions/wk: {rec.weekly_conversion_count?.toLocaleString() ?? "—"}</span>
                  {rec.demand_new_audience !== null && (
                    <span>New Demand: +{rec.demand_new_audience.toLocaleString()}</span>
                  )}
                </div>
                {rec.notes && <p className="text-neutral-400">{rec.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
