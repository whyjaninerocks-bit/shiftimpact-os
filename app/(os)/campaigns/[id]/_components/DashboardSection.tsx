import { createDashboardEntry } from "@/lib/actions";
import { Badge, Card, SectionTitle, buttonClass, inputClass, labelClass, ragTone } from "@/app/_components/ui";
import type { CampaignDashboard } from "@/lib/types";

export function DashboardSection({ campaignId, dashboards }: { campaignId: string; dashboards: CampaignDashboard[] }) {
  const createAction = createDashboardEntry.bind(null, campaignId);

  return (
    <Card>
      <SectionTitle id="dashboard">Weekly Campaign Dashboard</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">
        One entry per week. Capture your key decision, funnel health, business numbers, and campaign signals.
        The Idea Integrity note is your strategy lead's call — not AI.
      </p>

      <div className="space-y-3">
        {dashboards.map((d) => (
          <div key={d.id} className="border border-neutral-200 rounded-md p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Week of {d.week_of}</span>
              <div className="flex gap-1">
                <Badge tone={ragTone(d.funnel_health_demand)}>Demand: {d.funnel_health_demand}</Badge>
                <Badge tone={ragTone(d.funnel_health_conversion)}>Conversion: {d.funnel_health_conversion}</Badge>
                <Badge tone={ragTone(d.funnel_health_retention)}>Retention: {d.funnel_health_retention}</Badge>
              </div>
            </div>
            <p><span className="text-neutral-400">Key decision:</span> {d.decision_snapshot || "—"}</p>
            <p><span className="text-neutral-400">Business result:</span> {d.business_impact_actual ?? "—"} / {d.business_impact_target ?? "—"} target</p>
            <p><span className="text-neutral-400">Big Idea check:</span> {d.ssic || "—"}</p>
            <p><span className="text-neutral-400">Triggers:</span> {d.triggers || "—"}</p>
            <p><span className="text-neutral-400">Strategy lead's read:</span> {d.idea_integrity_observation || "—"}</p>
          </div>
        ))}
        {dashboards.length === 0 && <p className="text-sm text-neutral-500">No weekly entries yet.</p>}
      </div>

      <form action={createAction} className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
        <p className="text-xs font-medium text-neutral-500">New Week Entry</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="week_of">Week Of</label>
            <input className={inputClass} type="date" id="week_of" name="week_of" required />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="decision_snapshot">Key Decision This Week</label>
          <textarea className={inputClass} id="decision_snapshot" name="decision_snapshot" rows={2} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass} htmlFor="funnel_health_demand">Demand Health</label>
            <select className={inputClass} id="funnel_health_demand" name="funnel_health_demand" defaultValue="Green">
              <option value="Green">Green</option>
              <option value="Amber">Amber</option>
              <option value="Red">Red</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="funnel_health_conversion">Conversion Health</label>
            <select className={inputClass} id="funnel_health_conversion" name="funnel_health_conversion" defaultValue="Green">
              <option value="Green">Green</option>
              <option value="Amber">Amber</option>
              <option value="Red">Red</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="funnel_health_retention">Retention Health</label>
            <select className={inputClass} id="funnel_health_retention" name="funnel_health_retention" defaultValue="Green">
              <option value="Green">Green</option>
              <option value="Amber">Amber</option>
              <option value="Red">Red</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass} htmlFor="business_impact_actual">Business Result — Actual</label>
            <input className={inputClass} type="number" step="0.01" id="business_impact_actual" name="business_impact_actual" />
          </div>
          <div>
            <label className={labelClass} htmlFor="business_impact_target">Business Result — Target</label>
            <input className={inputClass} type="number" step="0.01" id="business_impact_target" name="business_impact_target" />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="ssic">Is the Big Idea still holding?</label>
          <textarea className={inputClass} id="ssic" name="ssic" rows={2} />
        </div>
        <div>
          <label className={labelClass} htmlFor="triggers">What triggered this week?</label>
          <textarea className={inputClass} id="triggers" name="triggers" rows={2} />
        </div>
        <div>
          <label className={labelClass} htmlFor="idea_integrity_observation">Strategy Lead's Idea Read</label>
          <textarea className={inputClass} id="idea_integrity_observation" name="idea_integrity_observation" rows={2} />
        </div>
        <button type="submit" className={buttonClass}>Save Weekly Entry</button>
      </form>
    </Card>
  );
}
