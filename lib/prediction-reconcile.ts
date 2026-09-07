// lib/prediction-reconcile.ts
// Shared reconciliation logic — used by both /api/prediction-reconcile (manual
// "Auto-Reconcile" button in the internal campaign view) and the weekly
// prediction-reconcile-weekly cron. Previously this logic lived only inside
// the manual route, which meant predictions only ever got checked against
// real results if a strategist remembered to click the button. Extracting it
// here lets the cron call the exact same code, not a re-implementation.
//
// Reconciliation now prefers matching a prediction to its source record by
// ID (source_table + source_id + source_signal_key, set at snapshot time —
// see migration 0081) rather than by matching label text, which was fragile:
// a prediction whose text happened to contain another signal's label could
// silently reconcile against the wrong value. Predictions created before
// migration 0081, or added manually, have no source_id — those still fall
// back to label-matching so nothing already in flight breaks.

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeVerdict, type Verdict } from "@/lib/prediction-verdict";

type PendingPrediction = {
  id: string;
  category: "Signal" | "Outcome" | "Gate" | "Behaviour";
  prediction_text: string;
  predicted_value: number | null;
  source_table: string | null;
  source_id: string | null;
  source_signal_key: string | null;
};

export type ReconcileResult = {
  reconciled: number;
  total_pending: number;
  no_data: number;
  verdicts: Record<string, number>;
};

export async function reconcileCampaignPredictions(
  supabase: SupabaseClient,
  campaignId: string
): Promise<ReconcileResult> {
  const { data: pending } = await supabase
    .from("prediction_accuracy_log")
    .select("id, category, prediction_text, predicted_value, source_table, source_id, source_signal_key")
    .eq("campaign_id", campaignId)
    .eq("verdict", "Pending");

  const pendingRows = (pending ?? []) as PendingPrediction[];
  if (pendingRows.length === 0) {
    return { reconciled: 0, total_pending: 0, no_data: 0, verdicts: {} };
  }

  const [signalReports, signalThresholds, outcomes, phaseGates, frame] = await Promise.all([
    supabase.from("signal_weekly_reports")
      .select("id, week_number, signal_1_actual_pct, signal_2_actual_pct, signal_3_actual_count")
      .eq("campaign_id", campaignId)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("signal_thresholds")
      .select("id, signal_1_label, signal_2_label, signal_3_label")
      .eq("campaign_id", campaignId)
      .maybeSingle(),
    supabase.from("business_outcomes")
      .select("id, outcome_type, target_value, actual_value, unit")
      .eq("campaign_id", campaignId),
    supabase.from("phase_gates")
      .select("id, gate_name, gate_type, gate_outcome, gate_decision")
      .eq("campaign_id", campaignId),
    supabase.from("frame_briefs")
      .select("id")
      .eq("campaign_id", campaignId)
      .maybeSingle(),
  ]);

  // NOTE: kill_switches has no kill_switch_name/breach_status columns (see
  // migration 0069) — condition + trigger_status are the real fields.
  let killSwitchData: Array<{ id: string; condition: string; trigger_status: string }> = [];
  if (frame.data?.id) {
    const { data: ks } = await supabase
      .from("kill_switches")
      .select("id, condition, trigger_status")
      .eq("frame_brief_id", frame.data.id);
    killSwitchData = (ks ?? []) as typeof killSwitchData;
  }

  const latestReport = signalReports.data;
  const thresholdLabels = signalThresholds.data;
  const outcomesData = (outcomes.data ?? []) as Array<{ id: string; outcome_type: string; target_value: number | null; actual_value: number | null; unit: string | null }>;
  const gatesData = (phaseGates.data ?? []) as Array<{ id: string; gate_name: string; gate_outcome: string; gate_decision: string }>;

  const SIGNAL_FIELD: Record<string, keyof NonNullable<typeof latestReport>> = {
    signal_1: "signal_1_actual_pct",
    signal_2: "signal_2_actual_pct",
    signal_3: "signal_3_actual_count",
  };

  type Update = { id: string; verdict: Verdict; accuracy_pct: number | null; actual_value: number | null; outcome_week: number | null; outcome_note: string };
  const updates: Update[] = [];

  for (const p of pendingRows) {
    let update: Update | null = null;

    // ─── Signal category — prefer source_id match, fall back to label match ──
    if (p.category === "Signal" && latestReport) {
      const week = latestReport.week_number;
      let actual: number | null = null;

      if (p.source_table === "signal_thresholds" && p.source_signal_key && p.source_signal_key in SIGNAL_FIELD) {
        actual = (latestReport[SIGNAL_FIELD[p.source_signal_key]] as number | null) ?? null;
      } else if (thresholdLabels?.signal_1_label && p.prediction_text.includes(thresholdLabels.signal_1_label)) {
        actual = latestReport.signal_1_actual_pct;
      } else if (thresholdLabels?.signal_2_label && p.prediction_text.includes(thresholdLabels.signal_2_label)) {
        actual = latestReport.signal_2_actual_pct;
      } else if (thresholdLabels?.signal_3_label && p.prediction_text.includes(thresholdLabels.signal_3_label)) {
        actual = latestReport.signal_3_actual_count;
      }

      if (actual !== null && p.predicted_value !== null) {
        const { verdict, accuracy_pct } = computeVerdict(p.predicted_value, actual);
        update = { id: p.id, verdict, accuracy_pct, actual_value: actual, outcome_week: week, outcome_note: `Auto-reconciled from week ${week} signal report` };
      }
    }

    // ─── Outcome category ──────────────────────────────────────────────────
    if (p.category === "Outcome") {
      const matched = p.source_table === "business_outcomes" && p.source_id
        ? outcomesData.find(o => o.id === p.source_id)
        : outcomesData.find(o => p.prediction_text.toLowerCase().includes(o.outcome_type.toLowerCase()));

      if (matched?.actual_value !== null && matched?.actual_value !== undefined && matched.target_value) {
        const { verdict, accuracy_pct } = computeVerdict(matched.target_value, matched.actual_value);
        update = { id: p.id, verdict, accuracy_pct, actual_value: matched.actual_value, outcome_week: null, outcome_note: `Auto-reconciled from business outcome actual value` };
      }
    }

    // ─── Gate category ─────────────────────────────────────────────────────
    if (p.category === "Gate") {
      const matched = p.source_table === "phase_gates" && p.source_id
        ? gatesData.find(g => g.id === p.source_id)
        : gatesData.find(g => p.prediction_text.toLowerCase().includes(g.gate_name.toLowerCase()));

      if (matched) {
        const passed = matched.gate_outcome === "Passed" || matched.gate_decision === "Open";
        if (passed) {
          update = { id: p.id, verdict: "Accurate", accuracy_pct: 100, actual_value: 1, outcome_week: null, outcome_note: `Gate ${matched.gate_name} achieved Open decision` };
        }
      }
    }

    // ─── Behaviour category (kill switches) ────────────────────────────────
    if (p.category === "Behaviour") {
      const matched = p.source_table === "kill_switches" && p.source_id
        ? killSwitchData.find(k => k.id === p.source_id)
        : killSwitchData.find(k => p.prediction_text.toLowerCase().includes(k.condition.toLowerCase()));

      if (matched) {
        const held = matched.trigger_status !== "Triggered";
        update = { id: p.id, verdict: held ? "Accurate" : "Off", accuracy_pct: held ? 100 : 0, actual_value: held ? 1 : 0, outcome_week: null, outcome_note: held ? `Guardrail held (not triggered)` : `Guardrail triggered` };
      }
    }

    if (update) updates.push(update);
  }

  let reconciled = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("prediction_accuracy_log")
      .update({
        verdict: u.verdict,
        accuracy_pct: u.accuracy_pct,
        actual_value: u.actual_value,
        outcome_week: u.outcome_week,
        outcome_note: u.outcome_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", u.id);
    if (!error) reconciled++;
  }

  const verdictCounts = updates.reduce<Record<string, number>>((acc, u) => {
    acc[u.verdict] = (acc[u.verdict] ?? 0) + 1;
    return acc;
  }, {});

  return {
    reconciled,
    total_pending: pendingRows.length,
    no_data: pendingRows.length - updates.length,
    verdicts: verdictCounts,
  };
}
