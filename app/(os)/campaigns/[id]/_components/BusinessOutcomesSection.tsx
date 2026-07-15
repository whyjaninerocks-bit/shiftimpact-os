"use client";

// app/campaigns/[id]/_components/BusinessOutcomesSection.tsx
// Weekly business outcome entries — actual vs target tracking.
// INTERNAL ONLY — not shown in Client Interface.

import { useState, useTransition } from "react";
import { createBusinessOutcome } from "@/lib/actions";
import type { BusinessOutcome, CampaignOverview } from "@/lib/types";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function variance(target: number | null, actual: number | null): { label: string; tone: "green" | "amber" | "red" | "neutral" } | null {
  if (target === null || actual === null) return null;
  const pct = ((actual - target) / target) * 100;
  const label = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  const tone = pct >= 0 ? "green" : pct >= -10 ? "amber" : "red";
  return { label, tone };
}

const TONE_CLASSES = {
  green:   "text-emerald-700",
  amber:   "text-amber-700",
  red:     "text-red-700",
  neutral: "text-neutral-500",
};

// ─── Add form ─────────────────────────────────────────────────────────────────

interface AddFormProps {
  campaignId: string;
  primaryLabel: string;
  retentionLabel: string;
}

function AddForm({ campaignId, primaryLabel, retentionLabel }: AddFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={buttonSecondaryClass}>
        + Add Outcome Entry
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createBusinessOutcome(campaignId, fd);
      setOpen(false);
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Week Of</label>
            <input type="date" name="week_of" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Metric</label>
            <select name="metric_label" className={inputClass}>
              <option value={primaryLabel}>{primaryLabel}</option>
              <option value={retentionLabel}>{retentionLabel}</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Target</label>
            <input type="number" name="target_value" step="any" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Actual</label>
            <input type="number" name="actual_value" step="any" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea name="notes" rows={2} className={inputClass} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className={buttonClass}>
            {isPending ? "Saving…" : "Add"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={buttonSecondaryClass}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface BusinessOutcomesSectionProps {
  campaignId: string;
  campaign: CampaignOverview;
  outcomes: BusinessOutcome[];
}

export function BusinessOutcomesSection({ campaignId, campaign, outcomes }: BusinessOutcomesSectionProps) {
  const sorted = [...outcomes].sort((a, b) => new Date(b.week_of).getTime() - new Date(a.week_of).getTime());

  return (
    <section id="business-outcomes">
      <SectionTitle>Business Outcomes</SectionTitle>

      {/* Campaign-level targets */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <p className="text-xs text-neutral-400 mb-1">{campaign.business_outcome_label} — Target</p>
          <p className="text-sm font-semibold">{campaign.business_outcome_target?.toLocaleString() ?? "—"}</p>
          {campaign.business_outcome_actual != null && (
            <p className="text-xs text-neutral-500 mt-0.5">Actual: {campaign.business_outcome_actual.toLocaleString()}</p>
          )}
        </Card>
        <Card>
          <p className="text-xs text-neutral-400 mb-1">{campaign.retention_metric_label} — Target</p>
          <p className="text-sm font-semibold">{campaign.retention_metric_target?.toLocaleString() ?? "—"}</p>
          {campaign.retention_metric_actual != null && (
            <p className="text-xs text-neutral-500 mt-0.5">Actual: {campaign.retention_metric_actual.toLocaleString()}</p>
          )}
        </Card>
      </div>

      {/* Weekly entries */}
      {sorted.length > 0 ? (
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-neutral-400 px-3">
            <span>Week</span>
            <span>Metric</span>
            <span className="text-right">Target / Actual</span>
            <span className="text-right">Variance</span>
          </div>
          {sorted.map((outcome) => {
            const v = variance(outcome.target_value, outcome.actual_value);
            return (
              <Card key={outcome.id}>
                <div className="grid grid-cols-4 gap-2 text-sm items-start">
                  <span className="text-xs text-neutral-500">{fmtDate(outcome.week_of)}</span>
                  <span className="text-xs text-neutral-700">{outcome.metric_label}</span>
                  <span className="text-xs text-right text-neutral-700">
                    {outcome.target_value?.toLocaleString() ?? "—"} / {outcome.actual_value?.toLocaleString() ?? "—"}
                  </span>
                  <span className={`text-xs text-right font-medium ${v ? TONE_CLASSES[v.tone] : "text-neutral-300"}`}>
                    {v?.label ?? "—"}
                  </span>
                </div>
                {outcome.notes && (
                  <p className="text-xs text-neutral-400 mt-1 col-span-4">{outcome.notes}</p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-400 italic mb-3">No outcome entries yet.</p>
      )}

      <AddForm
        campaignId={campaignId}
        primaryLabel={campaign.business_outcome_label}
        retentionLabel={campaign.retention_metric_label}
      />
    </section>
  );
}
