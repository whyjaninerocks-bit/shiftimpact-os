"use client";

// app/campaigns/[id]/_components/PhaseGatesSection.tsx
// Phase gate decisions — structured review points that control budget release.
// INTERNAL ONLY — not shown in Client Interface.

import { useState, useTransition } from "react";
import { updatePhaseGate } from "@/lib/actions";
import type { PhaseGate, GateDecision } from "@/lib/types";
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

const DECISION_TONE: Record<GateDecision, "neutral" | "green" | "amber" | "red"> = {
  Pending: "neutral",
  Open:    "green",
  Hold:    "amber",
  Stop:    "red",
};

// ─── Gate card ────────────────────────────────────────────────────────────────

interface GateCardProps {
  gate: PhaseGate;
  campaignId: string;
  index: number;
}

function GateCard({ gate, campaignId, index }: GateCardProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updatePhaseGate(campaignId, gate.id, fd);
      setEditing(false);
    });
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs text-neutral-400 mb-0.5">Gate {index + 1}</p>
          <p className="text-sm font-semibold text-neutral-800">{gate.gate_type}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={DECISION_TONE[gate.gate_decision]}>{gate.gate_decision}</Badge>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 text-xs mb-3">
        <div>
          <span className="text-neutral-400 block mb-0.5">Required Signal</span>
          <span className="text-neutral-700">{gate.required_signal || "—"}</span>
        </div>
        {gate.actual_signal_data && (
          <div>
            <span className="text-neutral-400 block mb-0.5">Actual Signal</span>
            <span className="text-neutral-700">{gate.actual_signal_data}</span>
          </div>
        )}
        {gate.pre_mortem && (
          <div>
            <span className="text-neutral-400 block mb-0.5">Pre-Mortem</span>
            <span className="text-neutral-700">{gate.pre_mortem}</span>
          </div>
        )}
        {gate.decided_at && (
          <div>
            <span className="text-neutral-400">Decided: </span>
            <span className="text-neutral-600">{new Date(gate.decided_at).toLocaleDateString("en-MY")}</span>
          </div>
        )}
      </div>

      {editing && (
        <form onSubmit={handleUpdate} className="border-t border-neutral-100 pt-3 space-y-3">
          {/* Passthrough fields */}
          <input type="hidden" name="required_signal" value={gate.required_signal} />

          <div>
            <label className={labelClass}>Gate Decision</label>
            <select name="gate_decision" defaultValue={gate.gate_decision} className={inputClass}>
              <option value="Pending">Pending</option>
              <option value="Open">Open</option>
              <option value="Hold">Hold</option>
              <option value="Stop">Stop</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Actual Signal Data</label>
            <textarea
              name="actual_signal_data"
              defaultValue={gate.actual_signal_data}
              rows={2}
              placeholder="What signal data supports this decision?"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Pre-Mortem Notes</label>
            <textarea
              name="pre_mortem"
              defaultValue={gate.pre_mortem}
              rows={2}
              placeholder="What could go wrong? What are we watching for?"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Idea Led / Spend Led</label>
            <select name="idea_led_vs_spend_led" defaultValue={gate.idea_led_vs_spend_led ?? ""} className={inputClass}>
              <option value="">— Unset —</option>
              <option value="Idea-Led">Idea-Led</option>
              <option value="Spend-Led">Spend-Led</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className={buttonClass}>
              {isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={buttonSecondaryClass}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface PhaseGatesSectionProps {
  campaignId: string;
  phaseGates: PhaseGate[];
}

export function PhaseGatesSection({ campaignId, phaseGates }: PhaseGatesSectionProps) {
  const sorted = [...phaseGates].sort((a, b) => a.sequence_order - b.sequence_order);

  return (
    <section id="phase-gates">
      <SectionTitle>Phase Gates</SectionTitle>

      {sorted.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-400 italic">No phase gates configured. Phase gates are created from gate templates — contact admin to set up.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="flex gap-1 mb-2">
            {sorted.map((gate, i) => (
              <div
                key={gate.id}
                className={`flex-1 h-2 rounded ${
                  gate.gate_decision === "Open" ? "bg-emerald-500" :
                  gate.gate_decision === "Hold" ? "bg-amber-400" :
                  gate.gate_decision === "Stop" ? "bg-red-400" :
                  "bg-neutral-200"
                }`}
                title={`${gate.gate_type}: ${gate.gate_decision}`}
              />
            ))}
          </div>

          {sorted.map((gate, i) => (
            <GateCard key={gate.id} gate={gate} campaignId={campaignId} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
