"use client";

import type { EvidenceConfidence } from "@/lib/growth-sprint/types";

const OPTIONS: EvidenceConfidence[] = ["Confirmed", "Observed", "Directional", "Inferred", "Missing"];

const TONE: Record<EvidenceConfidence, string> = {
  Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Observed: "bg-blue-100 text-blue-800 border-blue-200",
  Directional: "bg-amber-100 text-amber-800 border-amber-200",
  Inferred: "bg-purple-100 text-purple-800 border-purple-200",
  Missing: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

export function EvidenceConfidenceChip({
  value,
  onChange,
}: {
  value: EvidenceConfidence | undefined;
  onChange: (v: EvidenceConfidence) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            value === opt ? TONE[opt] : "bg-white text-neutral-400 border-neutral-200 hover:border-neutral-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
