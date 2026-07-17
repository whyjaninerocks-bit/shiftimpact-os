// app/api/mdh-report/route.ts
// Signal Layer 0 — Media Delivery Health (MDH)
//
// Prerequisite check that runs BEFORE Signal Intelligence (Signals 1–3) is interpreted.
// Solves the client question: "We hit 5M impressions — why isn't branded search moving?"
//
// POST /api/mdh-report
// Body: { campaign_id, week_number, reach_unique?, impressions?, avg_frequency?, strategy_notes? }
//
// MDH Frequency Thresholds:
//   < 1.5         → Red   (under-exposed — quarantine Signal 1-3)
//   1.5 – 3.0    → Amber (light exposure — signals directional only)
//   3.0 – 7.0    → Green (effective range — standard interpretation)
//   7.0 – 10.0   → Amber (high — check Creative Fatigue Index)
//   > 10.0        → Red   (over-frequency — quarantine, creative refresh required)
//
// The chain: Reach → Frequency → Save Rate/S2 → Branded Search/S1 → UGC/S3
// Flat S1 means nothing if reach is below threshold.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MdhStatus = "Green" | "Amber" | "Red";

interface MdhReportRequest {
  campaign_id: string;
  week_number: number;
  reach_unique?: number | null;
  impressions?: number | null;
  avg_frequency?: number | null; // manual override; auto-computed if reach + impressions provided
  strategy_notes?: string;
}

// ─── MDH Computation ─────────────────────────────────────────────────────────

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
  if (frequency === null || status === null) return "Frequency not available — enter reach and impressions";
  const f = frequency.toFixed(1);
  if (frequency < 1.5) return `${f}x — Under-exposed. Scale reach before adjusting creative. Signal 1–3 quarantined.`;
  if (frequency < 3.0) return `${f}x — Light exposure. Signals directional only — confirm trend over 2+ weeks.`;
  if (frequency <= 7.0) return `${f}x — Effective range. Standard Signal 1–3 interpretation applies.`;
  if (frequency <= 10.0) return `${f}x — High frequency. Cross-check Creative Fatigue Index. S2 decline at this level may be fatigue, not rejection.`;
  return `${f}x — Over-frequency. Recommend creative refresh or audience rotation. Signal 1–3 quarantined.`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: MdhReportRequest = await req.json();
    const { campaign_id, week_number, reach_unique, impressions, avg_frequency: manualFreq, strategy_notes = "" } = body;

    if (!campaign_id || week_number == null) {
      return NextResponse.json(
        { error: "campaign_id and week_number are required" },
        { status: 400 }
      );
    }

    // 1. Compute MDH
    const freq = computeFrequency(reach_unique, impressions, manualFreq);
    const mdh_status = computeMdhStatus(freq);
    const quarantine_active = mdh_status === "Red";
    const label = frequencyLabel(freq, mdh_status);

    // 2. Upsert to signal_media_delivery
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("signal_media_delivery")
      .upsert(
        {
          campaign_id,
          week_number,
          reach_unique: reach_unique ?? null,
          impressions: impressions ?? null,
          avg_frequency: freq !== null ? parseFloat(freq.toFixed(2)) : null,
          mdh_status,
          frequency_label: label,
          quarantine_active,
          strategy_notes,
          updated_at: new Date().toISOString(),
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
      id: data?.id,
      campaign_id,
      week_number,
      reach_unique: reach_unique ?? null,
      impressions: impressions ?? null,
      avg_frequency: freq !== null ? parseFloat(freq.toFixed(2)) : null,
      mdh_status,
      frequency_label: label,
      quarantine_active,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/mdh-report error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
