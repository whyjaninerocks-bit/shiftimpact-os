import { createKillSwitch, deleteKillSwitch, updateKillSwitch } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import type { KillSwitch } from "@/lib/types";

const PRIORITY_TONE = { High: "red", Medium: "amber", Low: "neutral" } as const;
const STATUS_TONE = { Inactive: "neutral", Monitoring: "amber", Triggered: "red" } as const;

export function KillSwitchesSection({
  campaignId,
  frameBriefId,
  killSwitches,
}: {
  campaignId: string;
  frameBriefId: string;
  killSwitches: KillSwitch[];
}) {
  const createAction = createKillSwitch.bind(null, campaignId, frameBriefId);

  return (
    <Card>
      <SectionTitle id="kill-switches">Kill Switches</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">
        Active throughout the campaign — not a pre-launch checklist. If any switch fires, the OS Rule
        &ldquo;Kill Switch Cascade&rdquo; holds downstream STAGE Briefs and Phase Gate decisions for review.
      </p>

      <div className="space-y-3">
        {killSwitches.map((ks) => {
          const updateAction = updateKillSwitch.bind(null, campaignId, ks.id);
          const deleteAction = deleteKillSwitch.bind(null, campaignId, ks.id);
          return (
            <form key={ks.id} action={updateAction} className="border border-neutral-200 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={PRIORITY_TONE[ks.priority]}>{ks.priority} priority</Badge>
                <Badge tone={STATUS_TONE[ks.trigger_status]}>{ks.trigger_status}</Badge>
              </div>
              <textarea className={inputClass} name="condition" rows={2} defaultValue={ks.condition} />
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className={labelClass} htmlFor={`priority-${ks.id}`}>Priority</label>
                  <select className={inputClass} id={`priority-${ks.id}`} name="priority" defaultValue={ks.priority}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor={`status-${ks.id}`}>Trigger Status</label>
                  <select className={inputClass} id={`status-${ks.id}`} name="trigger_status" defaultValue={ks.trigger_status}>
                    <option value="Inactive">Inactive</option>
                    <option value="Monitoring">Monitoring</option>
                    <option value="Triggered">Triggered</option>
                  </select>
                </div>
                <button type="submit" className={buttonSecondaryClass}>Save</button>
              </div>
              <FormActionButton formAction={deleteAction} />
            </form>
          );
        })}
        {killSwitches.length === 0 && <p className="text-sm text-neutral-500">No kill switches yet.</p>}
      </div>

      <form action={createAction} className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
        <div>
          <label className={labelClass} htmlFor="new-condition">New Kill Switch — Condition</label>
          <textarea className={inputClass} id="new-condition" name="condition" rows={2} required placeholder="e.g. Confidence Score declines 2+ points over 2 weeks" />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className={labelClass} htmlFor="new-priority">Priority</label>
            <select className={inputClass} id="new-priority" name="priority" defaultValue="Medium">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="new-status">Trigger Status</label>
            <select className={inputClass} id="new-status" name="trigger_status" defaultValue="Inactive">
              <option value="Inactive">Inactive</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Triggered">Triggered</option>
            </select>
          </div>
          <button type="submit" className={buttonClass}>Add Kill Switch</button>
        </div>
      </form>
    </Card>
  );
}

function FormActionButton({ formAction }: { formAction: (formData: FormData) => void }) {
  return (
    <button type="submit" formAction={formAction} className="text-xs text-red-600 hover:underline">
      Delete
    </button>
  );
}
