import { updatePhaseGate } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonSecondaryClass,
  gateDecisionTone,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import type { PhaseGate } from "@/lib/types";

export function PhaseGatesSection({ campaignId, phaseGates }: { campaignId: string; phaseGates: PhaseGate[] }) {
  return (
    <Card>
      <SectionTitle id="phase-gates">Phase Gates</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">
        A gate is a business decision, not a review meeting. It opens only when the idea has
        demonstrated enough strength to justify the next investment.
      </p>

      <div className="space-y-3">
        {phaseGates.map((gate) => {
          const updateAction = updatePhaseGate.bind(null, campaignId, gate.id);
          return (
            <form key={gate.id} action={updateAction} className="border border-neutral-200 rounded-md p-3 space-y-2">
              <input type="hidden" name="_prev_decision" value={gate.gate_decision} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{gate.gate_type}</span>
                <Badge tone={gateDecisionTone(gate.gate_decision)}>{gate.gate_decision}</Badge>
              </div>
              <div>
                <label className={labelClass}>Required Signal</label>
                <textarea className={inputClass} name="required_signal" rows={2} defaultValue={gate.required_signal} />
              </div>
              <div>
                <label className={labelClass}>Actual Signal Data</label>
                <textarea className={inputClass} name="actual_signal_data" rows={2} defaultValue={gate.actual_signal_data} />
              </div>
              <div>
                <label className={labelClass}>Pre-mortem</label>
                <textarea className={inputClass} name="pre_mortem" rows={2} defaultValue={gate.pre_mortem} placeholder="If this gate fails to open, what's the most likely reason — and what would we do about it now?" />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className={labelClass}>Idea-Led vs Spend-Led Diagnostic</label>
                  <select className={inputClass} name="idea_led_vs_spend_led" defaultValue={gate.idea_led_vs_spend_led ?? ""}>
                    <option value="">—</option>
                    <option value="Idea-Led">Idea-Led</option>
                    <option value="Spend-Led">Spend-Led</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Gate Decision</label>
                  <select className={inputClass} name="gate_decision" defaultValue={gate.gate_decision}>
                    <option value="Pending">Pending</option>
                    <option value="Open">Open</option>
                    <option value="Hold">Hold</option>
                    <option value="Stop">Stop</option>
                  </select>
                </div>
                <button type="submit" className={buttonSecondaryClass}>Save</button>
              </div>
              {gate.decided_at && (
                <p className="text-xs text-neutral-400">Decided {new Date(gate.decided_at).toLocaleDateString()}</p>
              )}
            </form>
          );
        })}
        {phaseGates.length === 0 && <p className="text-sm text-neutral-500">No phase gates yet.</p>}
      </div>
    </Card>
  );
}
