// lib/confidence.ts
// Confidence scoring for ShiftImpact OS recommendations.
//
// Every AI or computed recommendation is annotated with a confidence band
// so strategy leads know how much weight to place on the output.
//
// Confidence band dimensions:
//   data_weeks    — how many weeks of real data back the recommendation
//   signal_count  — distinct signal inputs (S0/S1/S2/S3) contributing
//   agreement     — whether signals align or contradict each other
//
// Band definitions:
//   High        — ≥4 weeks, ≥2 signals, all agree
//   Medium      — 2-3 weeks, OR signals partially agree
//   Low         — 1 week of data only
//   Speculative — no data, or signals directly contradict
//
// Usage:
//   import { computeConfidenceBand, confidenceLabel } from "@/lib/confidence";
//   const band = computeConfidenceBand({ dataWeeks: 3, signalCount: 2, agreement: "partial" });

export type ConfidenceBand = "High" | "Medium" | "Low" | "Speculative";

export interface ConfidenceInput {
  dataWeeks: number;     // actual weeks of data available
  signalCount: number;   // number of distinct signals contributing (0–4)
  agreement?: "full" | "partial" | "contradiction" | "none";  // default "full"
}

export function computeConfidenceBand({
  dataWeeks,
  signalCount,
  agreement = "full",
}: ConfidenceInput): ConfidenceBand {
  if (signalCount === 0 || dataWeeks === 0) return "Speculative";
  if (agreement === "contradiction")         return "Speculative";
  if (dataWeeks === 1)                       return "Low";
  if (agreement === "none")                  return "Low";

  if (dataWeeks >= 4 && signalCount >= 2 && agreement === "full") return "High";
  if (dataWeeks >= 2)                        return "Medium";
  return "Low";
}

// Confidence badge colours (traffic light — no sky-blue per copy rules)
export function confidenceTone(
  band: ConfidenceBand
): "green" | "amber" | "red" | "neutral" {
  if (band === "High")        return "green";
  if (band === "Medium")      return "amber";
  if (band === "Low")         return "red";
  return "neutral"; // Speculative
}

// Short label for inline display
export function confidenceLabel(band: ConfidenceBand): string {
  return `${band} Confidence`;
}

// Tooltip / explainer shown on hover or in sidebar
export function confidenceExplainer(
  band: ConfidenceBand,
  dataWeeks: number,
  signalCount: number
): string {
  const weeks = `${dataWeeks} week${dataWeeks !== 1 ? "s" : ""} of data`;
  const sigs  = `${signalCount} signal${signalCount !== 1 ? "s" : ""} contributing`;

  switch (band) {
    case "High":
      return `${weeks}, ${sigs}, signals in agreement. Recommendation is well-supported — act with confidence.`;
    case "Medium":
      return `${weeks}, ${sigs}. Directional — trend is clear but sample is limited. Confirm over the next 1-2 weeks.`;
    case "Low":
      return `${weeks} available. Treat as early signal only. Do not make budget decisions on this alone.`;
    case "Speculative":
      return "No data available. This recommendation is based on category norms only — enter data to increase confidence.";
  }
}
