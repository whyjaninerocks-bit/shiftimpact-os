// lib/data-review-platform.ts
// Review Platform Intelligence — data getter
// Sprint 30 · 20 July 2026

import { createClient } from "@supabase/supabase-js";
import type { ReviewPlatformScore } from "./types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Returns the most recent ReviewPlatformScore for a campaign,
 * or null if no review intelligence has been run yet.
 */
export async function getLatestReviewPlatformScore(
  campaignId: string
): Promise<ReviewPlatformScore | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("review_platform_scores")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLatestReviewPlatformScore error:", error.message);
    return null;
  }
  return data as ReviewPlatformScore | null;
}

/**
 * Returns all ReviewPlatformScore rows for a campaign,
 * ordered by week ascending — used for trend charts.
 */
export async function getReviewPlatformHistory(
  campaignId: string
): Promise<ReviewPlatformScore[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("review_platform_scores")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: true });

  if (error) {
    console.error("getReviewPlatformHistory error:", error.message);
    return [];
  }
  return (data ?? []) as ReviewPlatformScore[];
}
