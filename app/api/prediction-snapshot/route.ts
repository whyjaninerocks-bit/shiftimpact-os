// app/api/prediction-snapshot/route.ts
// Sprint 9 — Auto-snapshot predictions on FRAME lock
// INTERNAL ONLY
//
// POST /api/prediction-snapshot
// Body: { campaign_id: string, frame_brief_id: string }
//
// Called non-blocking when FRAME brief is locked.
// Reads signal thresholds, business outcomes, and kill switch thresholds,
// then generates prediction records in prediction_accuracy_log.
//
// Only creates predictions that don't already exist (idempotent).
// Returns: { created: number, skipped: number }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface PredictionRow {
  campaign_id: string;
  category: "Signal" | "Outcome" | "Gate" | "Behaviour";
  prediction_text: string;
  predicted_value: number | null;
  unit: string | null;
  prediction_week: number | null;
  verdict: "Pending";
}

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, frame_brief_id } = await req.json();
    if (!campaign_id || !frame_brief_id) {
      return NextResponse.json({ error: "campaign_id and frame_brief_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check if we already have auto-snapshots for this campaign (idempotent)
    const { count: existing } = await supabase
      .from("prediction_accuracy_log")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("verdict", "Pending");

    // Don't re-snapshot if predictions already exist (manual or prior snapshot)
    if ((existing ?? 0) >= 3) {
      return NextResponse.json({ created: 0, skipped: existing, message: "Predictions already exist" });
    }

    const predictions: PredictionRow[] = [];

    // ─── S1: Signal thresholds → Signal predictions ──────────────────────────

    const { data: thresholds } = await supabase
      .from("signal_thresholds")
      .select("signal_1_label, signal_1_threshold_pct, signal_2_label, signal_2_threshold_pct, signal_3_label, signal_3_threshold_count, campaign_duration_weeks")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    if (thresholds) {
      const targetWeek = thresholds.campaign_duration_weeks ?? 8;

      if (thresholds.signal_1_threshold_pct && thresholds.signal_1_label) {
        predictions.push({
          campaign_id,
          category: "Signal",
          prediction_text: `${thresholds.signal_1_label} will reach or exceed ${thresholds.signal_1_threshold_pct}% by week ${targetWeek}`,
          predicted_value: thresholds.signal_1_threshold_pct,
          unit: "%",
          prediction_week: 1,
          verdict: "Pending",
        });
      }

      if (thresholds.signal_2_threshold_pct && thresholds.signal_2_label) {
        predictions.push({
          campaign_id,
          category: "Signal",
          prediction_text: `${thresholds.signal_2_label} will reach or exceed ${thresholds.signal_2_threshold_pct}% by week ${targetWeek}`,
          predicted_value: thresholds.signal_2_threshold_pct,
          unit: "%",
          prediction_week: 1,
          verdict: "Pending",
        });
      }

      if (thresholds.signal_3_threshold_count && thresholds.signal_3_label) {
        predictions.push({
          campaign_id,
          category: "Signal",
          prediction_text: `${thresholds.signal_3_label} will reach ${thresholds.signal_3_threshold_count} or more per week by week ${targetWeek}`,
          predicted_value: thresholds.signal_3_threshold_count,
          unit: "per week",
          prediction_week: 1,
          verdict: "Pending",
        });
      }
    }

    // ─── S2: Business outcomes → Outcome predictions ─────────────────────────

    const { data: outcomes } = await supabase
      .from("business_outcomes")
      .select("outcome_type, target_value, unit, timeframe")
      .eq("campaign_id", campaign_id)
      .limit(5);

    for (const o of (outcomes ?? [])) {
      if (!o.target_value) continue;
      predictions.push({
        campaign_id,
        category: "Outcome",
        prediction_text: `${o.outcome_type} will reach ${o.target_value} ${o.unit ?? ""} by ${o.timeframe ?? "campaign end"}`,
        predicted_value: o.target_value,
        unit: o.unit ?? null,
        prediction_week: null,
        verdict: "Pending",
      });
    }

    // ─── S3: Phase gates → Gate predictions ──────────────────────────────────

    const { data: phaseGates } = await supabase
      .from("phase_gates")
      .select("gate_name, gate_type")
      .eq("campaign_id", campaign_id)
      .neq("gate_outcome", "Passed")
      .limit(3);

    for (const g of (phaseGates ?? [])) {
      predictions.push({
        campaign_id,
        category: "Gate",
        prediction_text: `${g.gate_name} will be passed (gate decision: Open) before campaign close`,
        predicted_value: null,
        unit: null,
        prediction_week: null,
        verdict: "Pending",
      });
    }

    // ─── S4: Kill switches → Behaviour predictions ───────────────────────────

    const { data: killSwitches } = await supabase
      .from("kill_switches")
      .select("kill_switch_name, threshold_value, unit")
      .eq("frame_brief_id", frame_brief_id)
      .neq("breach_status", "Breached")
      .limit(3);

    for (const k of (killSwitches ?? [])) {
      predictions.push({
        campaign_id,
        category: "Behaviour",
        prediction_text: `${k.kill_switch_name} will remain within threshold (${k.threshold_value} ${k.unit ?? ""}) throughout the campaign`,
        predicted_value: k.threshold_value ?? null,
        unit: k.unit ?? null,
        prediction_week: null,
        verdict: "Pending",
      });
    }

    if (predictions.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, message: "No signal thresholds or outcomes found to snapshot" });
    }

    // Insert all predictions
    const { data: inserted, error: insertErr } = await supabase
      .from("prediction_accuracy_log")
      .insert(predictions)
      .select("id");

    if (insertErr) {
      console.error("/api/prediction-snapshot insert error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      created: inserted?.length ?? 0,
      skipped: existing ?? 0,
      categories: {
        signal: predictions.filter(p => p.category === "Signal").length,
        outcome: predictions.filter(p => p.category === "Outcome").length,
        gate: predictions.filter(p => p.category === "Gate").length,
        behaviour: predictions.filter(p => p.category === "Behaviour").length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/prediction-snapshot error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
