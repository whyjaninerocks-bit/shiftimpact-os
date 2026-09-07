// lib/prediction-verdict.ts
// Single source of truth for scoring a prediction against an actual result.
//
// Previously this logic was duplicated in two places with two DIFFERENT formulas:
//   - /api/prediction-reconcile computed a ratio (actual / predicted), Accurate if >= 1.0
//   - /api/prediction-accuracy/[id] computed a deviation % (|actual - predicted| / predicted),
//     Accurate if deviation <= 10%
// These disagree on borderline cases (e.g. actual 20% above predicted: ratio-based says
// "Accurate", deviation-based says "Off"). Since prediction accuracy is the credibility
// asset the OS leads with, having two different answers to "was this accurate?" depending
// on which route touched the row is the kind of inconsistency a client (or a skeptical CFO)
// could catch. Both routes now import this.
//
// Rule: Accurate if actual result met or exceeded the prediction (ratio >= 1.0).
// Close if within 15% short of the prediction. Off otherwise.
// This treats "reach or exceed X" as the prediction shape, which matches how
// prediction-snapshot phrases every auto-generated prediction ("will reach or exceed...").

export type Verdict = "Accurate" | "Close" | "Off";

export function computeVerdict(
  predicted: number,
  actual: number
): { verdict: Verdict; accuracy_pct: number } {
  if (predicted === 0) {
    return { verdict: actual > 0 ? "Accurate" : "Off", accuracy_pct: 100 };
  }
  const ratio = actual / predicted;
  const accuracy_pct = Math.round(Math.min(ratio, 2) * 100); // cap display at 200%
  if (ratio >= 1.0) return { verdict: "Accurate", accuracy_pct };
  if (ratio >= 0.85) return { verdict: "Close", accuracy_pct };
  return { verdict: "Off", accuracy_pct };
}
