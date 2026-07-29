// app/api/mdh-report/route.ts
// Signal Layer 0 — Media Delivery Health (MDH) + F25 Attention Quality Score
//
// POST /api/mdh-report
// Body: {
//   campaign_id, week_number,
//   reach_unique?, impressions?, avg_frequency?, strategy_notes?,
//   view_rate_3s_pct?, view_rate_10s_pct?, completion_rate_pct?   ← F25 AQS inputs
// }
//
// MDH Frequency Thresholds:
//   < 1.5         → Red   (under-exposed — quarantine Signal 1-3)
//   1.5 – 3.0    → Amber (light exposure — signals directional only)
//   3.0 – 7.0    → Green (effective range — standard interpretation)
//   7.0 – 10.0   → Amber (high — check Creative Fatigue Index)
//   > 10.0        → Red   (over-frequency — quarantine, creative refresh required)
//
// AQS (F25) — INTERNAL ONLY:
//   score = (3s_rate × 0.20) + (10s_rate × 0.30) + (completion_rate × 0.50)
//   Band: ≥60 Attention Strong / 40–59 Attention Adequate / 20–39 Attention Weak / <20 Attention Gap
//   Attention Gap Flag fires when AQS < category benchmark − 10
//   Named action is specific to the weakest dimension — never generic

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Category AQS benchmarks ──────────────────────────────────────────────────
// Seeded from FMCG / consumer brand norms. Calibrates against actual data over time.

const CATEGORY_AQS_BENCHMARKS: Record<string, number> = {
  FMCG:            28,
  DTC:             34,
  "D2C":           34,
  QSR:             30,
  Beauty:          36,
  Fashion:         33,
  "Personal Care": 30,
  Default:         30,
};

function categoryBenchmark(industryProfile: string | null | undefined): number {
  if (!industryProfile) return CATEGORY_AQS_BENCHMARKS.Default;
  const key = Object.keys(CATEGORY_AQS_BENCHMARKS).find(
    k => industryProfile.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CATEGORY_AQS_BENCHMARKS[key] : CATEGORY_AQS_BENCHMARKS.Default;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MdhStatus = "Green" | "Amber" | "Red";
type AqsBand   = "Attention Strong" | "Attention Adequate" | "Attention Weak" | "Attention Gap";

interface MdhReportRequest {
  campaign_id:           string;
  week_number:           number;
  reach_unique?:         number | null;
  impressions?:          number | null;
  avg_frequency?:        number | null;
  strategy_notes?:       string;
  // F25 AQS inputs
  view_rate_3s_pct?:     number | null;
  view_rate_10s_pct?:    number | null;
  completion_rate_pct?:  number | null;
}

// ─── MDH helpers ─────────────────────────────────────────────────────────────

function computeFrequency(
  reach: number | null | undefined,
  impressions: number | null | undefined,
  manualFreq: number | null | undefined
): number | null {
  if (manualFreq != null && manualFreq > 0) return manualFreq;
  if (reach && impressions && reach > 0) return impressions / reach;
  return null;
}

function computeMdhStatus(frequency: number | null): MdhStatus | null {
  if (frequency === null) return null;
  if (frequency < 1.5) return "Red";
  if (frequency < 3.0) return "Amber";
  if (frequency <= 7.0) return "Green";
  if (frequency <= 10.0) return "Amber";
  return "Red";
}

function frequencyLabel(frequency: number | null, status: MdhStatus | null): string {
  if (frequency === null || status === null)
    return "Frequency not available — enter reach and impressions";
  const f = frequency.toFixed(1);
  if (frequency < 1.5) return `${f}x — Under-exposed. Scale reach before adjusting creative. Signal 1–3 quarantined.`;
  if (frequency < 3.0) return `${f}x — Light exposure. Signals directional only — confirm trend over 2+ weeks.`;
  if (frequency <= 7.0) return `${f}x — Effective range. Standard Signal 1–3 interpretation applies.`;
  if (frequency <= 10.0) return `${f}x — High frequency. Cross-check Creative Fatigue Index. S2 decline at this level may be fatigue, not rejection.`;
  return `${f}x — Over-frequency. Recommend creative refresh or audience rotation. Signal 1–3 quarantined.`;
}

// ─── AQS helpers (F25 — INTERNAL ONLY) ───────────────────────────────────────

function computeAqs(
  rate3s:     number | null | undefined,
  rate10s:    number | null | undefined,
  completion: number | null | undefined
): number | null {
  if (rate3s == null && rate10s == null && completion == null) return null;
  const w3s  = (rate3s    ?? 0) * 0.20;
  const w10s = (rate10s   ?? 0) * 0.30;
  const wCom = (completion ?? 0) * 0.50;
  return Math.round((w3s + w10s + wCom) * 10) / 10;
}

function aqsBand(score: number | null): AqsBand | null {
  if (score === null) return null;
  if (score >= 60) return "Attention Strong";
  if (score >= 40) return "Attention Adequate";
  if (score >= 20) return "Attention Weak";
  return "Attention Gap";
}

function aqsAction(
  rate3s:     number | null | undefined,
  rate10s:    number | null | undefined,
  completion: number | null | undefined
): string {
  const v3  = rate3s     ?? 0;
  const v10 = rate10s    ?? 0;
  const vc  = completion ?? 0;

  // Diagnose the weakest dimension first
  if (vc < 15) {
    return "Audience is disengaging before the end. Compress the key message to fit within 15 seconds, or add a pattern interrupt at the 50% mark to recapture attention before the CTA.";
  }
  if (v10 < 20) {
    return "Creative is capturing initial interest but losing the audience within 10 seconds. Tighten the value statement — deliver the brand hook within the first 8 seconds.";
  }
  if (v3 < 35) {
    return "First-frame is not stopping the scroll. Rework the opening 3 seconds: test a high-contrast visual, an unexpected motion cue, or a direct text overlay with the core tension.";
  }
  return "Attention rates are below category norms across all stages. Audit the full creative for hook, hold, and close — consider A/B testing a shorter (6–8 second) cut alongside the full video.";
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: MdhReportRequest = await req.json();
    const {
      campaign_id, week_number,
      reach_unique, impressions, avg_frequency: manualFreq,
      strategy_notes = "",
      view_rate_3s_pct, view_rate_10s_pct, completion_rate_pct,
    } = body;

    if (!campaign_id || week_number == null) {
      return NextResponse.json(
        { error: "campaign_id and week_number are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ── MDH ──────────────────────────────────────────────────────────────────
    const freq           = computeFrequency(reach_unique, impressions, manualFreq);
    const mdh_status     = computeMdhStatus(freq);
    const quarantine_active = mdh_status === "Red";
    const label          = frequencyLabel(freq, mdh_status);

    // ── AQS (F25 — INTERNAL) ─────────────────────────────────────────────────
    const aqsScore = computeAqs(view_rate_3s_pct, view_rate_10s_pct, completion_rate_pct);
    const band     = aqsBand(aqsScore);

    // Fetch campaign industry for benchmark
    const { data: campaignRow } = await supabase
      .from("campaigns")
      .select("client_id, clients(industry_profile)")
      .eq("id", campaign_id)
      .single();
    const industryProfile = (campaignRow?.clients as { industry_profile?: string } | null)?.industry_profile;
    const benchmark = categoryBenchmark(industryProfile);

    const aqs_benchmark_delta = aqsScore !== null
      ? Math.round((aqsScore - benchmark) * 10) / 10
      : null;

    const attention_gap_flag = aqsScore !== null && aqs_benchmark_delta !== null
      ? aqs_benchmark_delta <= -10
      : false;

    const attention_gap_action = attention_gap_flag
      ? aqsAction(view_rate_3s_pct, view_rate_10s_pct, completion_rate_pct)
      : "";

    // Fetch previous week AQS for trend delta
    const { data: prevRow } = await supabase
      .from("signal_media_delivery")
      .select("aqs_score")
      .eq("campaign_id", campaign_id)
      .lt("week_number", week_number)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const aqs_prev_week_delta = aqsScore !== null && prevRow?.aqs_score != null
      ? Math.round((aqsScore - (prevRow.aqs_score as number)) * 10) / 10
      : null;

    // ── Upsert ───────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("signal_media_delivery")
      .upsert(
        {
          campaign_id,
          week_number,
          reach_unique:         reach_unique       ?? null,
          impressions:          impressions        ?? null,
          avg_frequency:        freq !== null ? parseFloat(freq.toFixed(2)) : null,
          mdh_status,
          frequency_label:      label,
          quarantine_active,
          strategy_notes,
          view_rate_3s_pct:     view_rate_3s_pct   ?? null,
          view_rate_10s_pct:    view_rate_10s_pct  ?? null,
          completion_rate_pct:  completion_rate_pct ?? null,
          aqs_score:            aqsScore,
          aqs_band:             band,
          attention_gap_flag,
          attention_gap_action,
          aqs_benchmark_delta,
          aqs_prev_week_delta,
          updated_at:           new Date().toISOString(),
        },
        { onConflict: "campaign_id,week_number" }
      )
      .select("id, created_at")
      .single();

    if (error) {
      console.error("/api/mdh-report save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id:                   data?.id,
      campaign_id,
      week_number,
      reach_unique:         reach_unique ?? null,
      impressions:          impressions  ?? null,
      avg_frequency:        freq !== null ? parseFloat(freq.toFixed(2)) : null,
      mdh_status,
      frequency_label:      label,
      quarantine_active,
      // AQS — INTERNAL: strategy lead only, never in client export
      aqs_score:            aqsScore,
      aqs_band:             band,
      attention_gap_flag,
      attention_gap_action,
      aqs_benchmark_delta,
      aqs_prev_week_delta,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/mdh-report error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
