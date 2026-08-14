// app/api/dsem/route.ts
// F30 — Dark Social Estimation Model (DSEM)
// Sprint 6 · 30 July 2026
//
// Three signals → multiplier → adjusted S3 → client narrative
//
// Signal A — Direct Traffic Anomaly (DTA)
//   Trigger: GA4 direct sessions >20% above 4-week baseline + no paid media active
//
// Signal B — Branded Search Without Media (BSWM)
//   Trigger: branded search volume >15% above baseline + no paid search active
//
// Signal C — Geographic UGC Clustering (GUCL)
//   Trigger: ≥3 Tier 1 posts from same city/district within 5-day window + no brand activation event
//
// Multiplier (INTERNAL ONLY — never in client output):
//   0 signals → no multiplier
//   1 signal  → +20–30% (midpoint 1.25)
//   2 signals → +40–60% (midpoint 1.50)
//   3 signals → +70–90% (midpoint 1.80)
//
// Malaysia category calibration:
//   QSR/F&B:              GUCL weighted higher (food photo culture)
//   FMCG:                 DTA weighted higher (habitual repurchase, low search)
//   Financial Services:   BSWM weighted higher (high-consideration, research-heavy)
//
// GOVERNANCE:
//   multiplier_value, signals_fired, trigger_log → INTERNAL ONLY
//   dark_social_narrative → CLIENT SAFE (plain language, "inferred" framing only)
//   Adjusted Signal 3 → INTERNAL diagnostic only, never in client view

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DsemRequest {
  campaign_id:             string;
  week_number:             number;
  // Signal A
  dta_direct_sessions?:   number | null;
  dta_baseline_sessions?: number | null;
  dta_paid_active?:       boolean;
  // Signal B
  bswm_search_volume?:    number | null;
  bswm_baseline_volume?:  number | null;
  bswm_paid_search_active?: boolean;
  // Signal C
  gucl_tier1_post_count?: number | null;
  gucl_location_available?: boolean;
  gucl_activation_event?: boolean;
  // Context
  signal3_raw_score?:     number | null;
  strategy_notes?:        string;
}

// ─── Signal computation ───────────────────────────────────────────────────────

function computeDta(
  direct: number | null | undefined,
  baseline: number | null | undefined,
  paidActive: boolean
): { pct: number | null; triggered: boolean } {
  if (direct == null || baseline == null || baseline === 0) return { pct: null, triggered: false };
  const pct = Math.round(((direct - baseline) / baseline) * 10000) / 100;
  return { pct, triggered: pct > 20 && !paidActive };
}

function computeBswm(
  volume: number | null | undefined,
  baseline: number | null | undefined,
  paidSearchActive: boolean
): { pct: number | null; triggered: boolean } {
  if (volume == null || baseline == null || baseline === 0) return { pct: null, triggered: false };
  const pct = Math.round(((volume - baseline) / baseline) * 10000) / 100;
  return { pct, triggered: pct > 15 && !paidSearchActive };
}

function computeGucl(
  postCount: number | null | undefined,
  locationAvailable: boolean,
  activationEvent: boolean
): { triggered: boolean } {
  if (postCount == null || !locationAvailable) return { triggered: false };
  return { triggered: postCount >= 3 && !activationEvent };
}

function computeMultiplier(signalsFired: number): {
  min: number | null;
  max: number | null;
  midpoint: number;
  label: string | null;
} {
  if (signalsFired === 0) return { min: null, max: null, midpoint: 1.0, label: null };
  if (signalsFired === 1) return { min: 1.20, max: 1.30, midpoint: 1.25, label: "1 signal" };
  if (signalsFired === 2) return { min: 1.40, max: 1.60, midpoint: 1.50, label: "2 signals" };
  return                         { min: 1.70, max: 1.90, midpoint: 1.80, label: "3 signals" };
}

// ─── Malaysia category calibration ───────────────────────────────────────────

function categoryCalibration(industryProfile: string | null | undefined): string {
  if (!industryProfile) return "Default";
  const p = industryProfile.toLowerCase();
  if (p.includes("qsr") || p.includes("f&b") || p.includes("food")) return "QSR/F&B";
  if (p.includes("fmcg") || p.includes("consumer goods")) return "FMCG";
  if (p.includes("financial") || p.includes("banking") || p.includes("insurance")) return "Financial Services";
  return "Default";
}

// ─── Narrative generation ─────────────────────────────────────────────────────

async function generateNarrative(
  signalsFired: number,
  dtaTriggered: boolean,
  bswmTriggered: boolean,
  guclTriggered: boolean,
  multiplierLabel: string | null,
  categoryCalib: string,
  anthropic: Anthropic
): Promise<string> {
  if (signalsFired === 0) return "";

  const signalDescriptions: string[] = [];
  if (dtaTriggered) signalDescriptions.push("a spike in direct website traffic without paid media running");
  if (bswmTriggered) signalDescriptions.push("an increase in branded search volume without active paid search");
  if (guclTriggered) signalDescriptions.push("concentrated UGC activity from the same geographic area");

  const prompt = `You are writing a plain-language dark social observation for a brand strategy report.

Context:
- ${signalsFired} of 3 dark social signal(s) fired this week
- Signals detected: ${signalDescriptions.join("; ")}
- Category: ${categoryCalib}
- Multiplier: ${multiplierLabel ?? "none"} (DO NOT mention this number)

Write 2–3 sentences for a CLIENT-FACING report section. Rules:
1. Use "inferred" language — never "confirmed", "tracked", or "measured"
2. Never mention multiplier numbers, percentages, or the DSEM methodology
3. Never use signal names (DTA, BSWM, GUCL)
4. Frame as momentum building organically, not as a system detection
5. End with a strategic implication (what the brand should be ready for)
6. Plain language — no jargon, no system names

Example tone: "There are signs this week that the brand is generating conversation beyond what paid media can account for. Word-of-mouth appears to be building organically, with search interest and direct engagement both rising without active paid support. The brand should be ready to amplify — the organic window may be short."`;

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: DsemRequest = await req.json();
    const {
      campaign_id, week_number,
      dta_direct_sessions, dta_baseline_sessions, dta_paid_active = false,
      bswm_search_volume, bswm_baseline_volume, bswm_paid_search_active = false,
      gucl_tier1_post_count, gucl_location_available = true, gucl_activation_event = false,
      signal3_raw_score = null,
      strategy_notes = "",
    } = body;

    if (!campaign_id || week_number == null) {
      return NextResponse.json({ error: "campaign_id and week_number are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const anthropic = new Anthropic();

    // Fetch campaign industry for calibration
    const { data: campaignRow } = await supabase
      .from("campaigns")
      .select("client_id, clients(industry_profile)")
      .eq("id", campaign_id)
      .single();
    const industryProfile = (campaignRow?.clients as { industry_profile?: string } | null)?.industry_profile;
    const categoryCalib = categoryCalibration(industryProfile);

    // Compute signals
    const dta  = computeDta(dta_direct_sessions, dta_baseline_sessions, dta_paid_active);
    const bswm = computeBswm(bswm_search_volume, bswm_baseline_volume, bswm_paid_search_active);
    const gucl = computeGucl(gucl_tier1_post_count, gucl_location_available, gucl_activation_event);

    const signalsFired = [dta.triggered, bswm.triggered, gucl.triggered].filter(Boolean).length;
    const multiplier   = computeMultiplier(signalsFired);

    // Adjusted S3 (INTERNAL ONLY)
    const signal3_adjusted = signal3_raw_score != null && signalsFired > 0
      ? Math.round(signal3_raw_score * multiplier.midpoint * 10) / 10
      : null;

    // Generate client narrative
    const dark_social_narrative = signalsFired > 0
      ? await generateNarrative(
          signalsFired, dta.triggered, bswm.triggered, gucl.triggered,
          multiplier.label, categoryCalib, anthropic
        )
      : "";

    // Upsert
    const { data, error } = await supabase
      .from("dark_social_readings")
      .upsert({
        campaign_id,
        week_number,
        // Signal A
        dta_direct_sessions:     dta_direct_sessions    ?? null,
        dta_baseline_sessions:   dta_baseline_sessions  ?? null,
        dta_pct_above_baseline:  dta.pct,
        dta_paid_active,
        dta_triggered:           dta.triggered,
        // Signal B
        bswm_search_volume:      bswm_search_volume     ?? null,
        bswm_baseline_volume:    bswm_baseline_volume   ?? null,
        bswm_pct_above_baseline: bswm.pct,
        bswm_paid_search_active,
        bswm_triggered:          bswm.triggered,
        // Signal C
        gucl_tier1_post_count:   gucl_tier1_post_count  ?? null,
        gucl_location_available,
        gucl_activation_event,
        gucl_triggered:          gucl.triggered,
        // Multiplier (INTERNAL)
        signals_fired:           signalsFired,
        multiplier_min:          multiplier.min,
        multiplier_max:          multiplier.max,
        multiplier_label:        multiplier.label,
        // Adjusted S3 (INTERNAL)
        signal3_raw_score:       signal3_raw_score,
        signal3_adjusted_score:  signal3_adjusted,
        // Client output
        dark_social_narrative,
        category_calibration:    categoryCalib,
        strategy_notes,
        updated_at:              new Date().toISOString(),
      }, { onConflict: "campaign_id,week_number" })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("/api/dsem error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id:                    data?.id,
      campaign_id,
      week_number,
      signals_fired:         signalsFired,       // INTERNAL
      dta_triggered:         dta.triggered,       // INTERNAL
      bswm_triggered:        bswm.triggered,      // INTERNAL
      gucl_triggered:        gucl.triggered,      // INTERNAL
      multiplier_label:      multiplier.label,    // INTERNAL
      multiplier_min:        multiplier.min,      // INTERNAL
      multiplier_max:        multiplier.max,      // INTERNAL
      signal3_adjusted,                           // INTERNAL
      dark_social_narrative,                      // CLIENT SAFE
      category_calibration:  categoryCalib,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/dsem error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaign_id = searchParams.get("campaign_id");
  if (!campaign_id) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dark_social_readings")
    .select("*")
    .eq("campaign_id", campaign_id)
    .order("week_number", { ascending: false })
    .limit(12);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data ?? [] });
}
