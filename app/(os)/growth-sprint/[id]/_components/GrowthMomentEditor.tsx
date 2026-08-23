"use client";

import { useState } from "react";
import type { GrowthMoment } from "@/lib/growth-sprint/types";

const EMPTY: Omit<GrowthMoment, "id"> = {
  customer: "",
  situation: "",
  trigger: "",
  need: "",
  behaviour: "",
  commercial_response: "",
};

const FIELDS: { key: keyof typeof EMPTY; label: string; placeholder: string; example: string }[] = [
  { key: "customer", label: "Customer", placeholder: "Who experiences this moment", example: "e.g. \"regular food/supply buyers\"" },
  { key: "situation", label: "Situation", placeholder: "What is happening — the everyday context, not the problem itself", example: "e.g. \"comes in monthly to restock food\"" },
  { key: "trigger", label: "Trigger", placeholder: "The specific thing that makes the need active right now", example: "e.g. \"asks staff a health question at checkout\" — this is the moment, not the context" },
  { key: "need", label: "Need", placeholder: "The problem or aspiration the trigger surfaces", example: "e.g. \"reassurance the pet is okay\"" },
  { key: "behaviour", label: "Behaviour", placeholder: "What the customer actually does (or fails to do) today", example: "e.g. \"leaves without booking grooming, despite asking\"" },
  { key: "commercial_response", label: "Commercial response", placeholder: "What the business can credibly offer in that moment", example: "e.g. \"staff currently has no structured way to offer grooming here\"" },
];

// All six fields carry equal weight for now — this may evolve into a
// distinction between "critical" and "supporting" fields later, but a
// Growth Moment missing any of the six is materially harder for the AI
// to reason about (see lib/growth-sprint/diagnose.ts prompt), so for v1
// completeness = all six present.
export function momentCompleteness(m: Omit<GrowthMoment, "id">): { filled: number; missing: string[] } {
  const missing = FIELDS.filter((f) => !m[f.key]?.trim()).map((f) => f.label);
  return { filled: FIELDS.length - missing.length, missing };
}

function CompletenessBadge({ filled }: { filled: number }) {
  const total = FIELDS.length;
  const tone =
    filled === total
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : filled >= total - 2
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tone}`}>
      {filled}/{total} fields
    </span>
  );
}

export function GrowthMomentEditor({
  moments,
  onChange,
}: {
  moments: GrowthMoment[];
  onChange: (moments: GrowthMoment[]) => void;
}) {
  const [draft, setDraft] = useState<typeof EMPTY>(EMPTY);

  function addMoment() {
    if (!draft.customer.trim() || !draft.situation.trim()) return;
    const newMoment: GrowthMoment = { id: crypto.randomUUID(), ...draft };
    onChange([...moments, newMoment]);
    setDraft(EMPTY);
  }

  function removeMoment(id: string) {
    onChange(moments.filter((m) => m.id !== id));
  }

  const draftCompleteness = momentCompleteness(draft);

  return (
    <div className="space-y-4">
      {moments.map((m) => {
        const { filled, missing } = momentCompleteness(m);
        return (
          <div key={m.id} className="rounded-lg border border-neutral-100 bg-white p-4 relative">
            <button
              type="button"
              onClick={() => removeMoment(m.id)}
              className="absolute top-3 right-3 text-xs text-neutral-400 hover:text-red-600"
            >
              Remove
            </button>
            <div className="flex items-center gap-2 pr-16">
              <p className="text-sm font-semibold text-neutral-900">{m.customer} — {m.situation}</p>
              <CompletenessBadge filled={filled} />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Trigger: {m.trigger || "—"} · Need: {m.need || "—"}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Behaviour: {m.behaviour || "—"} · Response: {m.commercial_response || "—"}
            </p>
            {missing.length > 0 && (
              <p className="text-xs text-amber-700 mt-1.5">
                Missing: {missing.join(", ")} — the AI will treat these as blank, which weakens the diagnosis for this moment.
              </p>
            )}
          </div>
        );
      })}

      <div className="rounded-lg border border-dashed border-neutral-300 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Add a Growth Moment</p>
          <CompletenessBadge filled={draftCompleteness.filled} />
        </div>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <input
              value={draft[f.key]}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full text-sm border border-neutral-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            <p className="text-[11px] text-neutral-400 mt-0.5 pl-0.5">{f.example}</p>
          </div>
        ))}
        <button
          type="button"
          onClick={addMoment}
          className="text-xs font-semibold text-neutral-900 hover:underline"
        >
          + Add moment {draftCompleteness.filled < FIELDS.length && draft.customer.trim() && draft.situation.trim() ? "(incomplete — you can fill in the rest after)" : ""}
        </button>
      </div>
    </div>
  );
}
