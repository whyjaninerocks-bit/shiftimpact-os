// lib/signal-targets.ts
// Extract pre-campaign signal display targets from a threshold record.
// Centralising this keeps DB field names out of client component render layers.

export interface SignalDisplayTargets {
  tgt1: number;
  tgt2: number;
  tgt3: number;
}

interface ThresholdLike {
  signal_1_threshold_pct?: number | null;
  signal_2_threshold_pct?: number | null;
  signal_3_threshold_count?: number | null;
}

export function extractSignalTargets(
  threshold: ThresholdLike | null | undefined,
): SignalDisplayTargets {
  return {
    tgt1: threshold?.signal_1_threshold_pct ?? 20,
    tgt2: threshold?.signal_2_threshold_pct ?? 8,
    tgt3: threshold?.signal_3_threshold_count ?? 100,
  };
}
