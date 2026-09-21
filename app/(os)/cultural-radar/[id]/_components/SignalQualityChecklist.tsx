// app/(os)/cultural-radar/[id]/_components/SignalQualityChecklist.tsx
// Cultural Signal Quality Lens — Layer 2 v0.1.
// Read-only, non-blocking. Renders the 8-item checklist from
// lib/cultural-signal-picker.ts (computeSignalQualityChecklist) exactly as
// computed — never softens a gap into something that looks captured. No
// server action, no form, nothing here writes to the database.

import { Card, Badge } from "@/app/_components/ui";
import {
  computeSignalQualityChecklist,
  type SignalQualityInput,
  type SignalQualityStatus,
} from "@/lib/cultural-signal-picker";

function statusTone(status: SignalQualityStatus): "green" | "amber" | "neutral" {
  if (status === "captured") return "green";
  if (status === "needs_judgement") return "amber";
  return "neutral";
}

function statusLabel(status: SignalQualityStatus): string {
  if (status === "captured") return "Captured";
  if (status === "needs_judgement") return "Needs strategist judgement";
  return "Not yet captured";
}

export function SignalQualityChecklist({ signal }: { signal: SignalQualityInput }) {
  const checklist = computeSignalQualityChecklist(signal);
  const capturedCount = checklist.filter((c) => c.status === "captured").length;

  return (
    <Card>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">
            Cultural signal quality lens
          </p>
          <p className="text-xs text-neutral-400">
            {capturedCount} of {checklist.length} items fully captured. Guidance only — nothing here blocks saving,
            editing, or citing this signal.
          </p>
        </div>

        <div className="divide-y divide-neutral-100">
          {checklist.map((item) => (
            <div key={item.key} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-800">{item.label}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{item.note}</p>
              </div>
              <Badge tone={statusTone(item.status)} className="shrink-0">
                {statusLabel(item.status)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
