"use client";

import { Badge } from "@/app/_components/ui";
import type { DecisionOutcome } from "@/lib/growth-sprint/types";

const TONE: Record<DecisionOutcome, "green" | "amber" | "red" | "blue" | "purple"> = {
  Scale: "green",
  Shift: "blue",
  Hold: "amber",
  Retest: "purple",
  Stop: "red",
};

export function DecisionOutcomeBadge({ outcome }: { outcome: DecisionOutcome | null }) {
  if (!outcome) return <Badge tone="neutral">Not yet decided</Badge>;
  return <Badge tone={TONE[outcome]}>{outcome}</Badge>;
}
