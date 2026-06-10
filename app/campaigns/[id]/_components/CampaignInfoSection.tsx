import { updateCampaign } from "@/lib/actions";
import { Card, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";
import type { CampaignOverview, TeamMember } from "@/lib/types";

export function CampaignInfoSection({
  campaign,
  teamMembers,
}: {
  campaign: CampaignOverview;
  teamMembers: TeamMember[];
}) {
  const action = updateCampaign.bind(null, campaign.id);

  return (
    <Card>
      <SectionTitle id="info">Campaign</SectionTitle>
      <form action={action} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="name">Campaign Name</label>
          <input className={inputClass} id="name" name="name" defaultValue={campaign.name} required />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelClass} htmlFor="current_phase">Current Phase</label>
            <select className={inputClass} id="current_phase" name="current_phase" defaultValue={campaign.current_phase}>
              <option value="Demand">Demand</option>
              <option value="Conversion">Conversion</option>
              <option value="Retention">Retention</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="confidence_score">Confidence Score</label>
            <input className={inputClass} type="number" min="0" max="100" step="0.1" id="confidence_score" name="confidence_score" defaultValue={campaign.confidence_score} />
          </div>
          <div>
            <label className={labelClass} htmlFor="gate_signal_status">Gate Signal Status</label>
            <select className={inputClass} id="gate_signal_status" name="gate_signal_status" defaultValue={campaign.gate_signal_status}>
              <option value="Pending">Pending</option>
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="status">Status</label>
            <select className={inputClass} id="status" name="status" defaultValue={campaign.status}>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="team_member_id">Owner</label>
            <select className={inputClass} id="team_member_id" name="team_member_id" defaultValue={campaign.team_member_id ?? ""}>
              <option value="">Unassigned</option>
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.id}>{tm.name} — {tm.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="last_review_date">Last Review Date</label>
            <input className={inputClass} type="date" id="last_review_date" name="last_review_date" defaultValue={campaign.last_review_date ?? ""} />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="operating_notes">
            Operating Notes <span className="text-neutral-400">(Claude-updated weekly)</span>
          </label>
          <textarea className={inputClass} id="operating_notes" name="operating_notes" rows={3} defaultValue={campaign.operating_notes} />
        </div>

        <div>
          <p className={labelClass}>Business Outcome Layer</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelClass} htmlFor="business_outcome_target">{campaign.business_outcome_label} — Target</label>
              <input className={inputClass} type="number" step="0.01" id="business_outcome_target" name="business_outcome_target" defaultValue={campaign.business_outcome_target ?? ""} />
            </div>
            <div>
              <label className={labelClass} htmlFor="business_outcome_actual">{campaign.business_outcome_label} — Actual</label>
              <input className={inputClass} type="number" step="0.01" id="business_outcome_actual" name="business_outcome_actual" defaultValue={campaign.business_outcome_actual ?? ""} />
            </div>
            <div>
              <label className={labelClass} htmlFor="retention_metric_target">{campaign.retention_metric_label} — Target</label>
              <input className={inputClass} type="number" step="0.01" id="retention_metric_target" name="retention_metric_target" defaultValue={campaign.retention_metric_target ?? ""} />
            </div>
            <div>
              <label className={labelClass} htmlFor="retention_metric_actual">{campaign.retention_metric_label} — Actual</label>
              <input className={inputClass} type="number" step="0.01" id="retention_metric_actual" name="retention_metric_actual" defaultValue={campaign.retention_metric_actual ?? ""} />
            </div>
          </div>
        </div>

        <button type="submit" className={buttonClass}>Save Campaign</button>
      </form>
    </Card>
  );
}
