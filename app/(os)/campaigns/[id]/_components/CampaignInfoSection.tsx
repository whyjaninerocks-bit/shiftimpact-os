"use client";

// app/campaigns/[id]/_components/CampaignInfoSection.tsx
// Campaign overview + editable operating fields.
// INTERNAL ONLY — not shown in Client Interface.

import { useTransition } from "react";
import { updateCampaign } from "@/lib/actions";
import type { CampaignOverview, TeamMember } from "@/lib/types";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
  phaseTone,
  gateSignalTone,
} from "@/app/_components/ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface CampaignInfoSectionProps {
  campaign: CampaignOverview;
  teamMembers: TeamMember[];
}

export function CampaignInfoSection({ campaign, teamMembers }: CampaignInfoSectionProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startTransition(async () => {
      await updateCampaign(campaign.id, new FormData(form));
    });
  }

  return (
    <section id="info">
      <SectionTitle>Campaign</SectionTitle>

      {/* Read-only overview row */}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-neutral-500 mb-1">Phase</p>
          <Badge tone={phaseTone(campaign.current_phase)}>{campaign.current_phase}</Badge>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500 mb-1">Gate Signal</p>
          <Badge tone={gateSignalTone(campaign.gate_signal_status)}>{campaign.gate_signal_status}</Badge>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500 mb-1">Confidence</p>
          <p className="text-sm font-semibold">{campaign.confidence_score ?? "—"} / 10</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500 mb-1">Last Review</p>
          <p className="text-sm">{fmtDate(campaign.last_review_date)}</p>
        </Card>
      </div>

      {/* Editable form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden passthrough fields for fields we don't show in this form */}
          <input type="hidden" name="name" value={campaign.name} />
          <input type="hidden" name="status" value={campaign.status} />
          <input type="hidden" name="confidence_score" value={campaign.confidence_score ?? 0} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phase</label>
              <select name="current_phase" defaultValue={campaign.current_phase} className={inputClass}>
                <option value="Demand">Demand</option>
                <option value="Conversion">Conversion</option>
                <option value="Retention">Retention</option>
                <option value="Complete">Complete</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Gate Signal Status</label>
              <select name="gate_signal_status" defaultValue={campaign.gate_signal_status} className={inputClass}>
                <option value="Pending">Pending</option>
                <option value="On Track">On Track</option>
                <option value="At Risk">At Risk</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Owner</label>
              <select name="team_member_id" defaultValue={campaign.team_member_id ?? ""} className={inputClass}>
                <option value="">— Unassigned —</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Last Review Date</label>
              <input
                type="date"
                name="last_review_date"
                defaultValue={campaign.last_review_date ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{campaign.business_outcome_label} — Target</label>
              <input
                type="number"
                name="business_outcome_target"
                defaultValue={campaign.business_outcome_target ?? ""}
                step="any"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{campaign.business_outcome_label} — Actual</label>
              <input
                type="number"
                name="business_outcome_actual"
                defaultValue={campaign.business_outcome_actual ?? ""}
                step="any"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{campaign.retention_metric_label} — Target</label>
              <input
                type="number"
                name="retention_metric_target"
                defaultValue={campaign.retention_metric_target ?? ""}
                step="any"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{campaign.retention_metric_label} — Actual</label>
              <input
                type="number"
                name="retention_metric_actual"
                defaultValue={campaign.retention_metric_actual ?? ""}
                step="any"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Operating Notes</label>
            <textarea
              name="operating_notes"
              defaultValue={campaign.operating_notes}
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className={buttonClass}>
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Card>
    </section>
  );
}
