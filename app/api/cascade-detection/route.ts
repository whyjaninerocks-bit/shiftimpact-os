// app/api/cascade-detection/route.ts
// F28 — Social Proof Cascade Detection (Phase 1 + Phase 2)
//
// POST /api/cascade-detection
// Body: {
//   campaign_id, week_number,
//   ugc_volume_this_week?, ugc_volume_last_week?,
//   comment_count?, post_count?,
//   strategy_notes?,
//   -- Phase 2 (dark cascade inference) --
//   dark_cascade_direct_traffic_spike?,   // DTA co-fired alongside cascade
//   dark_cascade_search_spike?,           // BSWM co-fired alongside cascade
//   dark_cascade_geo_clustering?,         // GUCL co-fired alongside cascade
//   -- Phase 2 (cross-platform) --
//   cross_platform_detected?,             // UGC appearing across ≥2 platforms
//   cross_platform_platforms?,            // comma-separated platform list (INTERNAL)
//   cross_platform_theme?,                // AI-observed theme (INTERNAL)
// }
//
// Cascade Status Logic:
//   velocity_acceleration = ugc_this / ugc_last  (WoW growth ratio; null if last week = 0)
//   comment_to_post_ratio  = comments / posts    (null if posts = 0)
//
//   NO CASCADE    — velocity_acceleration < 1.5  AND  comment_to_post_ratio < 5
//   EARLY SIGNAL  — velocity_acceleration ≥ 1.5  OR   comment_to_post_ratio ≥ 5
//   CASCADE ACTIVE — velocity_acceleration ≥ 2.0  AND  comment_to_post_ratio ≥ 5
//   CASCADE PEAK  — velocity_acceleration ≥ 3.0  AND  comment_to_post_ratio ≥ 10
//
// Dark Cascade Flag:
//   dark_cascade_flag = true when cascade_status ≠ NO CASCADE AND any DSEM signal co-fired
//   dark_cascade_inference_note = INTERNAL summary (never client-facing)
//
// CASCADE ACTIVE and CASCADE PEAK trigger an in-app alert for Janine only.
// No automated client notification — ever.
// Dark cascade inference = INTERNAL ONLY, always stated as inferred.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type CascadeStatus = "NO CASCADE" | "EARLY SIGNAL" | "CASCADE ACTIVE" | "CASCADE PEAK";

interface CascadeRequest {
  campaign_id:           string;
  week_number:           number;
  ugc_volume_this_week?: number | null;
  ugc_volume_last_week?: number | null;
  comment_count?:        number | null;
  post_count?:           number | null;
  strategy_notes?:       string;
  // Phase 2 — Dark Cascade Inference
  dark_cascade_direct_traffic_spike?: boolean;
  dark_cascade_search_spike?:         boolean;
  dark_cascade_geo_clustering?:       boolean;
  // Phase 2 — Cross-Platform Propagation
  cross_platform_detected?:           boolean;
  cross_platform_platforms?:          string | null;
  cross_platform_theme?:              string | null;
}

// ─── Computation ─────────────────────────────────────────────────────────────

function computeVelocityAcceleration(
  thisWeek: number | null | undefined,
  lastWeek: number | null | undefined
): number | null {
  if (thisWeek == null || lastWeek == null) return null;
  if (lastWeek === 0) return null; // avoid division by zero
  return Math.round((thisWeek / lastWeek) * 1000) / 1000;
}

function computeCommentRatio(
  comments: number | null | undefined,
  posts: number | null | undefined
): number | null {
  if (comments == null || posts == null) return null;
  if (posts === 0) return null;
  return Math.round((comments / posts) * 100) / 100;
}

function computeCascadeStatus(
  velocity: number | null,
  commentRatio: number | null
): CascadeStatus {
  const v = velocity ?? 0;
  const c = commentRatio ?? 0;

  // CASCADE PEAK: very high velocity AND very high engagement
  if (v >= 3.0 && c >= 10) return "CASCADE PEAK";
  // CASCADE ACTIVE: sustained velocity AND engagement threshold
  if (v >= 2.0 && c >= 5) return "CASCADE ACTIVE";
  // EARLY SIGNAL: one dimension elevated
  if (v >= 1.5 || c >= 5) return "EARLY SIGNAL";
  return "NO CASCADE";
}

function buildDarkCascadeInferenceNote(
  cascadeStatus: CascadeStatus,
  dtaFired: boolean,
  bswmFired: boolean,
  guclFired: boolean,
  crossPlatformDetected: boolean,
  crossPlatformPlatforms: string | null,
  crossPlatformTheme: string | null
): { flag: boolean; note: string } {
  const hasSignal = cascadeStatus !== "NO CASCADE";
  const darkSignals = [dtaFired, bswmFired, guclFired].filter(Boolean);
  const flag = hasSignal && darkSignals.length > 0;

  if (!flag && !crossPlatformDetected) return { flag: false, note: "" };

  const parts: string[] = [];

  if (flag) {
    const signalNames: string[] = [];
    if (dtaFired) signalNames.push("direct traffic anomaly");
    if (bswmFired) signalNames.push("branded search spike");
    if (guclFired) signalNames.push("geographic UGC clustering");

    parts.push(
      `Dark cascade inferred: ${signalNames.join(", ")} co-occurred with ${cascadeStatus.toLowerCase().replace("cascade ", "")} cascade signal. This suggests organic conversation is spilling into dark channels. All dark cascade observations are inferred — not confirmed.`
    );
  }

  if (crossPlatformDetected) {
    const platStr = crossPlatformPlatforms ? ` across ${crossPlatformPlatforms}` : "";
    const themeStr = crossPlatformTheme ? ` Theme observed: "${crossPlatformTheme}".` : "";
    parts.push(
      `Cross-platform propagation inferred${platStr}.${themeStr} INTERNAL — not for client distribution.`
    );
  }

  return { flag, note: parts.join(" ") };
}

function buildAmplificationWindow(
  status: CascadeStatus,
  velocity: number | null,
  commentRatio: number | null
): string {
  if (status === "NO CASCADE") {
    return "";
  }
  if (status === "EARLY SIGNAL") {
    return "Monitor over the next 7 days. If UGC velocity holds above 1.5× and comment ratio remains elevated, move to amplification preparation — brief creator outreach list and content brief ready to activate.";
  }
  if (status === "CASCADE ACTIVE") {
    const vStr = velocity != null ? `${velocity}× WoW acceleration` : "elevated WoW acceleration";
    const cStr = commentRatio != null ? `${commentRatio} comments per post` : "elevated comment density";
    return `Cascade is active (${vStr}, ${cStr}). Amplification window is open now — prioritise paid UGC seeding, creator amplification, and community reply engagement. Move budget allocation toward the organic signal within 48–72 hours. Do not over-produce; let the organic volume carry the signal.`;
  }
  // CASCADE PEAK
  return "Cascade is at peak. Organic amplification is self-sustaining — shift to capture mode: brand replies, story reposts, and community validation. Avoid heavy paid push at this stage as it can read as manufactured. Prepare harvest content (case study, milestone post) for post-peak.";
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: CascadeRequest = await req.json();
    const {
      campaign_id, week_number,
      ugc_volume_this_week, ugc_volume_last_week,
      comment_count, post_count,
      strategy_notes = "",
      // Phase 2
      dark_cascade_direct_traffic_spike = false,
      dark_cascade_search_spike         = false,
      dark_cascade_geo_clustering       = false,
      cross_platform_detected           = false,
      cross_platform_platforms          = null,
      cross_platform_theme              = null,
    } = body;

    if (!campaign_id || week_number == null) {
      return NextResponse.json(
        { error: "campaign_id and week_number are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Compute signals
    const velocity      = computeVelocityAcceleration(ugc_volume_this_week, ugc_volume_last_week);
    const commentRatio  = computeCommentRatio(comment_count, post_count);
    const cascade_status = computeCascadeStatus(velocity, commentRatio);
    const amplification_window = buildAmplificationWindow(cascade_status, velocity, commentRatio);

    // Phase 2 — Dark Cascade Inference (INTERNAL)
    const { flag: dark_cascade_flag, note: dark_cascade_inference_note } = buildDarkCascadeInferenceNote(
      cascade_status,
      dark_cascade_direct_traffic_spike,
      dark_cascade_search_spike,
      dark_cascade_geo_clustering,
      cross_platform_detected,
      cross_platform_platforms ?? null,
      cross_platform_theme ?? null
    );

    // Determine if an alert should fire
    const alertFires = cascade_status === "CASCADE ACTIVE" || cascade_status === "CASCADE PEAK";

    // Upsert into social_proof_cascade
    const { data, error } = await supabase
      .from("social_proof_cascade")
      .upsert(
        {
          campaign_id,
          week_number,
          ugc_volume_this_week: ugc_volume_this_week ?? null,
          ugc_volume_last_week: ugc_volume_last_week ?? null,
          comment_count:        comment_count ?? null,
          post_count:           post_count    ?? null,
          velocity_acceleration: velocity,
          comment_to_post_ratio: commentRatio,
          cascade_status,
          amplification_window,
          strategy_notes,
          // Phase 2 — Dark Cascade (INTERNAL)
          dark_cascade_direct_traffic_spike,
          dark_cascade_search_spike,
          dark_cascade_geo_clustering,
          dark_cascade_flag,
          dark_cascade_inference_note,
          // Phase 2 — Cross-Platform (INTERNAL)
          cross_platform_detected,
          cross_platform_platforms: cross_platform_platforms ?? null,
          cross_platform_theme:     cross_platform_theme     ?? null,
          // cascade_alert_sent stays false until Janine dismisses the in-app alert
          updated_at: new Date().toISOString(),
        },
        { onConflict: "campaign_id,week_number" }
      )
      .select("id, cascade_alert_sent, created_at")
      .single();

    if (error) {
      console.error("/api/cascade-detection save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id:                    data?.id,
      campaign_id,
      week_number,
      ugc_volume_this_week:  ugc_volume_this_week ?? null,
      ugc_volume_last_week:  ugc_volume_last_week ?? null,
      comment_count:         comment_count ?? null,
      post_count:            post_count    ?? null,
      velocity_acceleration: velocity,
      comment_to_post_ratio: commentRatio,
      cascade_status,
      amplification_window,
      // INTERNAL — alert flag for Janine only
      alert_fires:                        alertFires,
      // INTERNAL — dark cascade inference
      dark_cascade_flag,
      dark_cascade_inference_note,
      dark_cascade_direct_traffic_spike,
      dark_cascade_search_spike,
      dark_cascade_geo_clustering,
      // INTERNAL — cross-platform
      cross_platform_detected,
      cross_platform_platforms,
      cross_platform_theme,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/cascade-detection error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaign_id = searchParams.get("campaign_id");

  if (!campaign_id) {
    return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("social_proof_cascade")
    .select("*")
    .eq("campaign_id", campaign_id)
    .order("week_number", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}
