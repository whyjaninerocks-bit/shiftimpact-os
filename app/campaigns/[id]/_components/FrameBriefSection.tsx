import { setFrameLockStatus, updateFrameBrief } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  icsThresholdTone,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import type { FrameBrief } from "@/lib/types";

const ICS_DIMENSIONS: { key: keyof FrameBrief; label: string; weight: string }[] = [
  { key: "ics_cultural_fit", label: "Cultural Fit", weight: "20%" },
  { key: "ics_business_alignment", label: "Business Alignment", weight: "20%" },
  { key: "ics_audience_tension", label: "Audience Tension", weight: "20%" },
  { key: "ics_executional_coherence", label: "Executional Coherence", weight: "15%" },
  { key: "ics_measurability", label: "Measurability", weight: "15%" },
  { key: "ics_scalability", label: "Scalability", weight: "10%" },
];

export function FrameBriefSection({ campaignId, frame }: { campaignId: string; frame: FrameBrief }) {
  const updateAction = updateFrameBrief.bind(null, campaignId, frame.id);
  const lockAction = setFrameLockStatus.bind(null, campaignId, frame.id, true);
  const unlockAction = setFrameLockStatus.bind(null, campaignId, frame.id, false);
  const isLocked = frame.lock_status === "Locked";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle id="frame">FRAME Brief</SectionTitle>
        <div className="flex items-center gap-2">
          {isLocked ? <Badge tone="green">Locked</Badge> : <Badge tone="neutral">Draft</Badge>}
          <Badge tone={icsThresholdTone(frame.ics_threshold)}>
            ICS {frame.ics_weighted_total} · {frame.ics_threshold}
          </Badge>
        </div>
      </div>

      {frame.ics_any_dimension_blocker && (
        <p className="mb-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          Blocker: at least one ICS dimension scored 1 — this FRAME is forced to Stop regardless of weighted total.
        </p>
      )}

      <p className="text-xs text-neutral-400 mb-3">
        ICS Threshold: ≥85 Advance · 70–84 Fix · 55–69 Rework · &lt;55 Stop. Lock the FRAME before issuing STAGE Briefs —
        every STAGE Brief inherits the Anchor and Mood below.
      </p>

      <fieldset disabled={isLocked} className={isLocked ? "opacity-60" : ""}>
        <form action={updateAction} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="force">Force</label>
              <textarea className={inputClass} id="force" name="force" rows={2} defaultValue={frame.force} />
            </div>
            <div>
              <label className={labelClass} htmlFor="role">Role</label>
              <textarea className={inputClass} id="role" name="role" rows={2} defaultValue={frame.role} />
            </div>
            <div>
              <label className={labelClass} htmlFor="anchor">Anchor</label>
              <input className={inputClass} id="anchor" name="anchor" defaultValue={frame.anchor} />
            </div>
            <div>
              <label className={labelClass} htmlFor="mood">Mood</label>
              <input className={inputClass} id="mood" name="mood" defaultValue={frame.mood} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="expression">Expression</label>
            <textarea className={inputClass} id="expression" name="expression" rows={2} defaultValue={frame.expression} />
          </div>

          <div>
            <label className={labelClass} htmlFor="clarity_statement">Clarity Statement</label>
            <textarea className={inputClass} id="clarity_statement" name="clarity_statement" rows={2} defaultValue={frame.clarity_statement} />
          </div>

          <div>
            <p className={labelClass}>ICS Scoring (1–5 per dimension)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ICS_DIMENSIONS.map((dim) => (
                <div key={dim.key}>
                  <label className={labelClass} htmlFor={dim.key}>{dim.label} <span className="text-neutral-400">({dim.weight})</span></label>
                  <select className={inputClass} id={dim.key} name={dim.key} defaultValue={frame[dim.key] as number}>
                    {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {!isLocked && <button type="submit" className={buttonClass}>Save FRAME Brief</button>}
        </form>
      </fieldset>

      <div className="mt-4 pt-4 border-t border-neutral-100">
        {isLocked ? (
          <form action={unlockAction}>
            <button type="submit" className={buttonSecondaryClass}>Unlock FRAME Brief</button>
          </form>
        ) : (
          <form action={lockAction}>
            <button type="submit" className={buttonClass}>Lock FRAME Brief</button>
          </form>
        )}
      </div>
    </Card>
  );
}
