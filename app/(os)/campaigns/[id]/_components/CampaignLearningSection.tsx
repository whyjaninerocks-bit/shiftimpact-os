"use client";
// CampaignLearningSection.tsx
// Expert Architecture Addition — Campaign Learning Transfer (F18C)
//
// SPEC (PRD Addendum v2.3):
//   At end-of-campaign: captures what worked, what to change, signal insights.
//   Auto-generates pre-populated recommendations for next campaign brief:
//     anchor direction, kill switch thresholds, channel mix, budget split.
//   SOV:SOM point-in-time snapshot captured here.
//   Learning Record links to Benchmark Library for category calibration (GA5).
//
// ACCESS: INTERNAL ONLY. Output pre-populates next FRAME Brief (future sprint).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCampaignLearning } from "@/lib/actions";
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

interface LearningRecord {
  id: string;
  campaign_id: string;
  what_worked: string;
  what_to_change: string;
  signal_insights: string;
  anchor_recommendation: string;
  kill_switch_recommendation: string;
  channel_recommendation: string;
  budget_split_recommendation: string;
  sov_pct: number | null;
  som_pct: number | null;
  transferred_at: string | null;
  created_at: string;
}

interface Props {
  campaignId: string;
  campaignName: string;
  existingRecord: LearningRecord | null;
}

// ─── SOV:SOM indicator ────────────────────────────────────────────────────────

function SovSomIndicator({ sov, som }: { sov: number | null; som: number | null }) {
  if (sov === null || som === null) return null;
  const growing = sov > som;
  const ratio = som > 0 ? (sov / som).toFixed(2) : "∞";
  return (
    <div className={`rounded border px-3 py-2.5 ${growing ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-neutral-700">SOV:SOM Ratio</span>
        <Badge tone={growing ? "green" : "red"}>{growing ? "Growing" : "Declining"}</Badge>
      </div>
      <div className="flex gap-4 text-xs text-neutral-600">
        <span>SOV: <strong>{sov.toFixed(1)}%</strong></span>
        <span>SOM: <strong>{som.toFixed(1)}%</strong></span>
        <span>Ratio: <strong>{ratio}</strong></span>
      </div>
      <p className={`text-xs mt-1.5 ${growing ? "text-emerald-600" : "text-red-600"}`}>
        {growing
          ? "SOV exceeds SOM — brand is on a growth trajectory for coming quarters."
          : "SOV below SOM — brand is in gradual decline. Current sales may look healthy but a correction is coming 2–3 quarters out."}
      </p>
    </div>
  );
}

// ─── View card ────────────────────────────────────────────────────────────────

function LearningDisplay({ record }: { record: LearningRecord }) {
  return (
    <div className="space-y-4">
      <SovSomIndicator sov={record.sov_pct} som={record.som_pct} />

      <div className="grid gap-3">
        {[
          { label: "What worked", value: record.what_worked },
          { label: "What to change", value: record.what_to_change },
          { label: "Signal insights", value: record.signal_insights },
        ].map(({ label, value }) => (
          value ? (
            <div key={label}>
              <p className="text-xs font-semibold text-neutral-500 mb-1">{label}</p>
              <p className="text-xs text-neutral-700 whitespace-pre-wrap">{value}</p>
            </div>
          ) : null
        ))}
      </div>

      {(record.anchor_recommendation || record.kill_switch_recommendation ||
        record.channel_recommendation || record.budget_split_recommendation) && (
        <div className="border-t border-neutral-100 pt-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Pre-populated for next brief
          </p>
          <div className="space-y-2">
            {record.anchor_recommendation && (
              <div className="rounded bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-[10px] text-blue-500 font-semibold uppercase mb-0.5">Anchor direction</p>
                <p className="text-xs text-blue-800">{record.anchor_recommendation}</p>
              </div>
            )}
            {record.kill_switch_recommendation && (
              <div className="rounded bg-amber-50 border border-amber-100 px-3 py-2">
                <p className="text-[10px] text-amber-500 font-semibold uppercase mb-0.5">Kill switch thresholds</p>
                <p className="text-xs text-amber-800">{record.kill_switch_recommendation}</p>
              </div>
            )}
            {record.channel_recommendation && (
              <div className="rounded bg-neutral-50 border border-neutral-200 px-3 py-2">
                <p className="text-[10px] text-neutral-400 font-semibold uppercase mb-0.5">Channel mix</p>
                <p className="text-xs text-neutral-700">{record.channel_recommendation}</p>
              </div>
            )}
            {record.budget_split_recommendation && (
              <div className="rounded bg-neutral-50 border border-neutral-200 px-3 py-2">
                <p className="text-[10px] text-neutral-400 font-semibold uppercase mb-0.5">Budget split</p>
                <p className="text-xs text-neutral-700">{record.budget_split_recommendation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {record.transferred_at && (
        <p className="text-[11px] text-emerald-600 border-t border-neutral-100 pt-2">
          Transferred to next brief on {new Date(record.transferred_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// ─── Capture form ─────────────────────────────────────────────────────────────

interface FormProps {
  campaignId: string;
  existing: LearningRecord | null;
  onClose: () => void;
}

function LearningForm({ campaignId, existing, onClose }: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [whatWorked,    setWhatWorked]    = useState(existing?.what_worked ?? "");
  const [whatToChange,  setWhatToChange]  = useState(existing?.what_to_change ?? "");
  const [signalInsights, setSignalInsights] = useState(existing?.signal_insights ?? "");
  const [anchor,        setAnchor]        = useState(existing?.anchor_recommendation ?? "");
  const [killSwitch,    setKillSwitch]    = useState(existing?.kill_switch_recommendation ?? "");
  const [channel,       setChannel]       = useState(existing?.channel_recommendation ?? "");
  const [budget,        setBudget]        = useState(existing?.budget_split_recommendation ?? "");
  const [sov,           setSov]           = useState(existing?.sov_pct?.toString() ?? "");
  const [som,           setSom]           = useState(existing?.som_pct?.toString() ?? "");

  function handleSave() {
    if (!whatWorked.trim()) {
      setError("'What worked' is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("what_worked",                 whatWorked);
      fd.append("what_to_change",              whatToChange);
      fd.append("signal_insights",             signalInsights);
      fd.append("anchor_recommendation",       anchor);
      fd.append("kill_switch_recommendation",  killSwitch);
      fd.append("channel_recommendation",      channel);
      fd.append("budget_split_recommendation", budget);
      fd.append("sov_pct",                     sov);
      fd.append("som_pct",                     som);
      await saveCampaignLearning(campaignId, fd);
      router.refresh();
      onClose();
    });
  }

  const ta = inputClass + " mt-1 resize-none";

  return (
    <div className="border border-blue-200 bg-blue-50/20 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-700">Campaign Learning Record</p>
        <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-700">Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Core learnings */}
      <fieldset className="border border-neutral-200 rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-neutral-600 px-1">Core Learnings</legend>
        <div>
          <label className={labelClass}>What worked *</label>
          <textarea value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)}
            rows={3} placeholder="Channels, messages, timing, signals that performed…" className={ta} />
        </div>
        <div>
          <label className={labelClass}>What to change</label>
          <textarea value={whatToChange} onChange={(e) => setWhatToChange(e.target.value)}
            rows={3} placeholder="What would you do differently…" className={ta} />
        </div>
        <div>
          <label className={labelClass}>Signal insights</label>
          <textarea value={signalInsights} onChange={(e) => setSignalInsights(e.target.value)}
            rows={2} placeholder="Which signals proved most predictive, which were noise…" className={ta} />
        </div>
      </fieldset>

      {/* SOV:SOM snapshot */}
      <fieldset className="border border-neutral-200 rounded p-3 space-y-2">
        <legend className="text-xs font-semibold text-neutral-600 px-1">SOV:SOM Snapshot (end of campaign)</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Share of Voice %</label>
            <input type="number" step="0.1" value={sov} onChange={(e) => setSov(e.target.value)}
              placeholder="e.g. 34.5" className={inputClass + " mt-1"} />
          </div>
          <div>
            <label className={labelClass}>Share of Market %</label>
            <input type="number" step="0.1" value={som} onChange={(e) => setSom(e.target.value)}
              placeholder="e.g. 28.2" className={inputClass + " mt-1"} />
          </div>
        </div>
        {sov && som && (
          <SovSomIndicator sov={parseFloat(sov)} som={parseFloat(som)} />
        )}
      </fieldset>

      {/* Pre-populated recommendations */}
      <fieldset className="border border-neutral-200 rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-neutral-600 px-1">Recommendations for Next Brief</legend>
        <div>
          <label className={labelClass}>Anchor direction</label>
          <textarea value={anchor} onChange={(e) => setAnchor(e.target.value)}
            rows={2} placeholder="Recommended FRAME anchor direction for next campaign…" className={ta} />
        </div>
        <div>
          <label className={labelClass}>Kill switch thresholds</label>
          <textarea value={killSwitch} onChange={(e) => setKillSwitch(e.target.value)}
            rows={2} placeholder="Signal thresholds that should carry forward…" className={ta} />
        </div>
        <div>
          <label className={labelClass}>Channel mix recommendation</label>
          <textarea value={channel} onChange={(e) => setChannel(e.target.value)}
            rows={2} placeholder="Channel allocation recommendation…" className={ta} />
        </div>
        <div>
          <label className={labelClass}>Budget split recommendation</label>
          <textarea value={budget} onChange={(e) => setBudget(e.target.value)}
            rows={2} placeholder="Demand vs Activation recommended split…" className={ta} />
        </div>
      </fieldset>

      <button onClick={handleSave} disabled={isPending} className={buttonClass}>
        {isPending ? "Saving…" : "Save Learning Record"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CampaignLearningSection({ campaignId, campaignName, existingRecord }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <SectionTitle id="campaign-learning">Campaign Learning Transfer</SectionTitle>
        <Badge tone="neutral">F18C ⚿</Badge>
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        End-of-campaign capture: what worked, signal insights, and pre-populated recommendations
        for the next brief. SOV:SOM snapshot feeds brand trajectory tracking.
      </p>

      {editing ? (
        <LearningForm
          campaignId={campaignId}
          existing={existingRecord}
          onClose={() => setEditing(false)}
        />
      ) : existingRecord ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Last updated {new Date(existingRecord.created_at).toLocaleDateString()}
            </p>
            <button onClick={() => setEditing(true)} className={buttonSecondaryClass}>
              Edit
            </button>
          </div>
          <LearningDisplay record={existingRecord} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 px-4 py-6 text-center">
            <p className="text-sm text-neutral-500 font-medium mb-1">No learning record yet</p>
            <p className="text-xs text-neutral-400 mb-3">
              Complete at end-of-flight. Captures what worked, signal accuracy, and pre-populates
              the next campaign brief.
            </p>
            <button onClick={() => setEditing(true)} className={buttonClass}>
              Create Learning Record
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
