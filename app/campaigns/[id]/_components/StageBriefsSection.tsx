import { createStageBrief, updateStageBrief } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import type { StageBrief } from "@/lib/types";

const STAGE_TONE = { Demand: "blue", Conversion: "purple", Retention: "green" } as const;
const STATUS_TONE = {
  Draft: "neutral",
  Ready: "blue",
  Live: "green",
  Paused: "amber",
  Complete: "neutral",
} as const;

export function StageBriefsSection({
  campaignId,
  frameLocked,
  frameAnchor,
  moodRegister,
  stageBriefs,
}: {
  campaignId: string;
  frameLocked: boolean;
  frameAnchor: string;
  moodRegister: string;
  stageBriefs: StageBrief[];
}) {
  const createAction = createStageBrief.bind(null, campaignId);

  return (
    <Card>
      <SectionTitle id="stage-briefs">STAGE Briefs</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">
        Inherits FRAME DNA via lookup — drift is visible before it becomes a problem. A STAGE Brief
        cannot be set to Live until its prerequisite Phase Gate is Open.
      </p>

      {!frameLocked && (
        <p className="mb-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Lock the FRAME Brief before issuing STAGE Briefs.
        </p>
      )}

      <div className="space-y-3">
        {stageBriefs.map((sb) => {
          const updateAction = updateStageBrief.bind(null, campaignId, sb.id);
          return (
            <form key={sb.id} action={updateAction} className="border border-neutral-200 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={STAGE_TONE[sb.stage]}>{sb.stage}</Badge>
                  <span className="text-sm font-medium">{sb.channel}</span>
                </div>
                <Badge tone={STATUS_TONE[sb.status]}>{sb.status}</Badge>
              </div>
              <p className="text-xs text-neutral-400">
                Anchor: <span className="italic">{sb.frame_anchor || "—"}</span> · Mood: <span className="italic">{sb.mood_register || "—"}</span>
              </p>
              <div>
                <label className={labelClass}>Channel</label>
                <input className={inputClass} name="channel" defaultValue={sb.channel} />
              </div>
              <div>
                <label className={labelClass}>Brief Body</label>
                <textarea className={inputClass} name="brief_body" rows={2} defaultValue={sb.brief_body} />
              </div>
              <div>
                <label className={labelClass}>Propagation Mechanism — what does the idea do HERE to earn movement to the next stage?</label>
                <textarea className={inputClass} name="propagation_mechanism" rows={2} defaultValue={sb.propagation_mechanism} />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className={labelClass}>Idea-Led vs Spend-Led</label>
                  <select className={inputClass} name="idea_led_vs_spend_led" defaultValue={sb.idea_led_vs_spend_led ?? ""}>
                    <option value="">—</option>
                    <option value="Idea-Led">Idea-Led</option>
                    <option value="Spend-Led">Spend-Led</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} name="status" defaultValue={sb.status}>
                    <option value="Draft">Draft</option>
                    <option value="Ready">Ready</option>
                    <option value="Live">Live</option>
                    <option value="Paused">Paused</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
                <button type="submit" className={buttonSecondaryClass}>Save</button>
              </div>
            </form>
          );
        })}
        {stageBriefs.length === 0 && <p className="text-sm text-neutral-500">No STAGE Briefs yet.</p>}
      </div>

      {frameLocked && (
        <form action={createAction} className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
          <p className="text-xs text-neutral-400">
            New STAGE Brief inherits Anchor &ldquo;{frameAnchor}&rdquo; and Mood &ldquo;{moodRegister}&rdquo; from the locked FRAME.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className={labelClass} htmlFor="new-stage">Stage</label>
              <select className={inputClass} id="new-stage" name="stage" defaultValue="Demand" required>
                <option value="Demand">Demand</option>
                <option value="Conversion">Conversion</option>
                <option value="Retention">Retention</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="new-channel">Channel</label>
              <input className={inputClass} id="new-channel" name="channel" required />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="new-brief-body">Brief Body</label>
            <textarea className={inputClass} id="new-brief-body" name="brief_body" rows={2} />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-propagation">Propagation Mechanism</label>
            <textarea className={inputClass} id="new-propagation" name="propagation_mechanism" rows={2} />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className={labelClass} htmlFor="new-idea-spend">Idea-Led vs Spend-Led</label>
              <select className={inputClass} id="new-idea-spend" name="idea_led_vs_spend_led" defaultValue="Idea-Led">
                <option value="Idea-Led">Idea-Led</option>
                <option value="Spend-Led">Spend-Led</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="new-status">Status</label>
              <select className={inputClass} id="new-status" name="status" defaultValue="Draft">
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Live">Live</option>
              </select>
            </div>
            <button type="submit" className={buttonClass}>Add STAGE Brief</button>
          </div>
        </form>
      )}
    </Card>
  );
}
