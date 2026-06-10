import { createBusinessOutcome } from "@/lib/actions";
import { Card, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";
import type { BusinessOutcome, CampaignOverview } from "@/lib/types";

export function BusinessOutcomesSection({
  campaignId,
  campaign,
  outcomes,
}: {
  campaignId: string;
  campaign: CampaignOverview;
  outcomes: BusinessOutcome[];
}) {
  const createAction = createBusinessOutcome.bind(null, campaignId);

  return (
    <Card>
      <SectionTitle id="business-outcomes">Business Outcomes Log</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">Rolling weekly record of actual results vs. targets — audit trail.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-400 border-b border-neutral-200">
              <th className="py-1.5 pr-2">Week Of</th>
              <th className="py-1.5 pr-2">Metric</th>
              <th className="py-1.5 pr-2">Target</th>
              <th className="py-1.5 pr-2">Actual</th>
              <th className="py-1.5 pr-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o) => (
              <tr key={o.id} className="border-b border-neutral-100">
                <td className="py-1.5 pr-2 whitespace-nowrap">{o.week_of}</td>
                <td className="py-1.5 pr-2">{o.metric_label}</td>
                <td className="py-1.5 pr-2">{o.target_value ?? "—"}</td>
                <td className="py-1.5 pr-2">{o.actual_value ?? "—"}</td>
                <td className="py-1.5 pr-2 text-neutral-500">{o.notes || "—"}</td>
              </tr>
            ))}
            {outcomes.length === 0 && (
              <tr><td colSpan={5} className="py-2 text-neutral-500">No business outcomes logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={createAction} className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
        <p className="text-xs font-medium text-neutral-500">New Weekly Outcome</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="bo-week_of">Week Of</label>
            <input className={inputClass} type="date" id="bo-week_of" name="week_of" required />
          </div>
          <div>
            <label className={labelClass} htmlFor="metric_label">Metric Label</label>
            <select className={inputClass} id="metric_label" name="metric_label" defaultValue={campaign.business_outcome_label}>
              <option value={campaign.business_outcome_label}>{campaign.business_outcome_label}</option>
              <option value={campaign.retention_metric_label}>{campaign.retention_metric_label}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="target_value">Target</label>
            <input className={inputClass} type="number" step="0.01" id="target_value" name="target_value" />
          </div>
          <div>
            <label className={labelClass} htmlFor="actual_value">Actual</label>
            <input className={inputClass} type="number" step="0.01" id="actual_value" name="actual_value" />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="notes">Notes</label>
          <textarea className={inputClass} id="notes" name="notes" rows={2} />
        </div>
        <button type="submit" className={buttonClass}>Add Outcome</button>
      </form>
    </Card>
  );
}
