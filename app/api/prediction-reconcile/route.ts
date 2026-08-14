// app/api/prediction-reconcile/route.ts
// Sprint 9 — Auto-reconcile Pending predictions against actual signal data
// INTERNAL ONLY
//
// POST /api/prediction-reconcile
// Body: { campaign_id: string }
//
// For each Pending prediction:
//   - Signal predictions: compare predicted_value to latest actual signal value
//   - Outcome predictions: compare to business_outcomes (actual value if set)
//   - Gate predictions: check gate_decision = "Open" or "Passed"
//   - Behaviour predictions: check kill switch breach_status
//
// Verdict rules:
//   Accurate: actual >= predicted (for Signal/Outcome) or target achieved (for Gate/Behaviour)
//   Close: actual is within 15% of predicted
//   Off: actual < predicted by >15%
//   Pending: no actual data yet
//
// Returns: { reconciled: number, verdicts: { Accurate, Close, Off } }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function computeVerdict(predicted: number, actual: number): { verdict: "Accurate" | "Close" | "Off"; accuracy_pct: number } {
  if (predicted === 0) {
    return { verdict: actual > 0 ? "Accurate" : "Off", accuracy_pct: 100 };
  }
  const ratio = actual / predicted;
  const accuracy_pct = Math.round(Math.min(ratio, 2) * 100); // cap at 200%
  if (ratio >= 1.0) return { verdict: "Accurate", accuracy_pct };
  if (ratio >= 0.85) return { verdict: "Close", accuracy_pct };
  return { verdict: "Off", accuracy_pct };
}

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get all Pending predictions for this campaign
    const { data: pending } = await supabase
      .from("prediction_accuracy_log")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("verdict", "Pending");

    if (!pending?.length) {
      return NextResponse.json({ reconciled: 0, message: "No pending predictions" });
    }

    // ─── Fetch all relevant actual data in parallel ──────────────────────────

    const [signalReports, signalThresholds, outcomes, phaseGates, killSwitches, frame] = await Promise.all([
      supabase.from("signal_weekly_reports")
        .select("week_number, signal_1_actual_pct, signal_2_actual_pct, signal_3_actual_count")
        .eq("campaign_id", campaign_id)
        .order("week_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("signal_thresholds")
        .select("signal_1_label, signal_2_label, signal_3_label")
        .eq("campaign_id", campaign_id)
        .maybeSingle(),
      supabase.from("business_outcomes")
        .select("outcome_type, target_value, actual_value, unit")
        .eq("campaign_id", campaign_id),
      supabase.from("phase_gates")
        .select("gate_name, gate_type, gate_outcome, gate_decision")
        .eq("campaign_id", campaign_id),
      supabase.from("kill_switches")
        .select("kill_switch_name, breach_status")
        .eq("campaign_id", campaign_id),  // note: needs frame_brief_id but campaign_id on kills not available — approximation
      supabase.from("frame_briefs")
        .select("id")
        .eq("campaign_id", campaign_id)
        .maybeSingle(),
    ]);

    // Get kill switches via frame_brief_id
    let killSwitchData: Array<{ kill_switch_name: string; breach_status: string }> = [];
    if (frame.data?.id) {
      const { data: ks } = await supabase
        .from("kill_switches")
        .select("kill_switch_name, breach_status")
        .eq("frame_brief_id", frame.data.id);
      killSwitchData = (ks ?? []) as typeof killSwitchData;
    }

    const latestReport = signalReports.data;
    const thresholdLabels = signalThresholds.data;
    const outcomesData = (outcomes.data ?? []) as Array<{ outcome_type: string; target_value: number | null; actual_value: number | null; unit: string | null }>;
    const gatesData = (phaseGates.data ?? []) as Array<{ gate_name: string; gate_outcome: string; gate_decision: string }>;

    const updates: Array<{ id: string; verdict: string; accuracy_pct: number | null; actual_value: number | null; outcome_week: number | null; outcome_note: string }> = [];

    for (const p of pending) {
      let update: typeof updates[0] | null = null;

      // ─── Signal category ──────────────────────────────────────────────────

      if (p.category === "Signal" && latestReport) {
        const week = latestReport.week_number;
        let actual: number | null = null;

        if (thresholdLabels?.signal_1_label && p.prediction_text.includes(thresholdLabels.signal_1_label)) {
          actual = latestReport.signal_1_actual_pct;
        } else if (thresholdLabels?.signal_2_label && p.prediction_text.includes(thresholdLabels.signal_2_label)) {
          actual = latestReport.signal_2_actual_pct;
        } else if (thresholdLabels?.signal_3_label && p.prediction_text.includes(thresholdLabels.signal_3_label)) {
          actual = latestReport.signal_3_actual_count;
        }

        if (actual !== null && p.predicted_value !== null) {
          const { verdict, accuracy_pct } = computeVerdict(p.predicted_value, actual);
          update = {
            id: p.id,
            verdict,
            accuracy_pct,
            actual_value: actual,
            outcome_week: week,
            outcome_note: `Auto-reconciled from week ${week} signal report`,
          };
        }
      }

      // ─── Outcome category ─────────────────────────────────────────────────

      if (p.category === "Outcome") {
        const matchedOutcome = outcomesData.find(o =>
          p.prediction_text.toLowerCase().includes(o.outcome_type.toLowerCase())
        );
        if (matchedOutcome?.actual_value !== null && matchedOutcome?.actual_value !== undefined && matchedOutcome.target_value) {
          const { verdict, accuracy_pct } = computeVerdict(matchedOutcome.target_value, matchedOutcome.actual_value!);
          update = {
            id: p.id,
            verdict,
            accuracy_pct,
            actual_value: matchedOutcome.actual_value,
            outcome_week: null,
            outcome_note: `Auto-reconciled from business outcome actual value`,
          };
        }
      }

      // ─── Gate category ────────────────────────────────────────────────────

      if (p.category === "Gate") {
        const matchedGate = gatesData.find(g =>
          p.prediction_text.toLowerCase().includes(g.gate_name.toLowerCase())
        );
        if (matchedGate) {
          const passed = matchedGate.gate_outcome === "Passed" || matchedGate.gate_decision === "Open";
          if (passed) {
            update = {
              id: p.id,
              verdict: "Accurate",
              accuracy_pct: 100,
              actual_value: 1,
              outcome_week: null,
              outcome_note: `Gate ${matchedGate.gate_name} achieved Open decision`,
            };
          }
        }
      }

      // ─── Behaviour category (kill switches) ───────────────────────────────

      if (p.category === "Behaviour") {
        const matchedKs = killSwitchData.find(k =>
          p.prediction_text.toLowerCase().includes(k.kill_switch_name.toLowerCase())
        );
        if (matchedKs) {
          const held = matchedKs.breach_status !== "Breached";
          update = {
            id: p.id,
            verdict: held ? "Accurate" : "Off",
            accuracy_pct: held ? 100 : 0,
            actual_value: held ? 1 : 0,
            outcome_week: null,
            outcome_note: held ? `Kill switch held (not breached)` : `Kill switch breached`,
          };
        }
      }

      if (update) {
        updates.push(update);
      }
    }

    // Apply all updates
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

    return NextResponse.json({
      reconciled,
      total_pending: pending.length,
      no_data: pending.length - updates.length,
      verdicts: verdictCounts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/prediction-reconcile error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
