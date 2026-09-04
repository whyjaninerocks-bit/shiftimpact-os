// app/api/cron/signal-s3-scan/route.ts
// Weekly automated S3 UGC Volume + S2 Save Rate scan via TikTok hashtag counting.
// Runs every Tuesday 3am UTC (11am MYT) — one hour after cultural-scan.
//
// WHAT IT DOES:
//   For every client that has a primary_hashtag set, fetches recent TikTok posts
//   for that hashtag in one Apify call and writes two signals from it:
//     - S3 UGC Volume: post count for the hashtag (signal_3_actual_count)
//     - S2 Save Rate: sum(collectCount) / sum(playCount) * 100 across the same
//       posts (signal_2_actual_pct) — added 23 Aug 2026, verified live that
//       clockworks/free-tiktok-scraper returns both collectCount and playCount
//       per video, so this needed no new actor or credential.
//   Each signal is only written if that field is null or was itself last
//   written by this cron (signal_2_auto / signal_3_auto) — a manual entry by
//   the strategy lead is never overwritten. Only skips the Apify call entirely
//   if BOTH signals are manually locked for the current week.
//
// ACTOR: clockworks~free-tiktok-scraper (already used in audit-fetch)
//
// Security: Vercel injects Authorization: Bearer <CRON_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 120;

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = "https://api.apify.com/v2";

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// ─── Apify TikTok hashtag scrape ─────────────────────────────────────────────
// Returns the post count (S3) and the aggregate Save Rate (S2) for the hashtag
// in the current week window, from a single Apify call. We request 50 results
// to get a meaningful sample. Save Rate = sum(collectCount) / sum(playCount) * 100
// across the sampled posts — collectCount is TikTok's bookmark/save count,
// confirmed present on this actor's output (verified via a live test call,
// 23 Aug 2026, alongside playCount, diggCount, shareCount, commentCount).

type HashtagScanResult = {
  count: number;
  saveRatePct: number | null; // null if no plays in the sample — can't compute a rate
};

async function fetchHashtagData(hashtag: string): Promise<HashtagScanResult> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not configured");

  const clean = hashtag.replace(/^#/, "").trim();
  const url = `${APIFY_BASE}/acts/clockworks~free-tiktok-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=90&maxItems=50`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hashtags: [clean],
      resultsPerPage: 50,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TikTok scraper failed: ${res.status} — ${body.slice(0, 200)}`);
  }

  const items = await res.json() as Array<{ playCount?: number; collectCount?: number }>;
  if (!Array.isArray(items)) return { count: 0, saveRatePct: null };

  let totalPlays = 0;
  let totalCollects = 0;
  for (const item of items) {
    totalPlays += typeof item.playCount === "number" ? item.playCount : 0;
    totalCollects += typeof item.collectCount === "number" ? item.collectCount : 0;
  }

  const saveRatePct = totalPlays > 0
    ? Number(((totalCollects / totalPlays) * 100).toFixed(2))
    : null;

  return { count: items.length, saveRatePct };
}

// ─── Get active campaigns with signal reporting underway ─────────────────────
// We only update campaigns that:
//   1. Have a client with a primary_hashtag set
//   2. Have at least one signal_weekly_reports row (reporting is live)
//   3. The current week's row is either missing signal_3_actual_count
//      or was written by a prior auto-scan (signal_3_auto = true)

type CampaignRow = {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  primary_hashtag: string;
  week_number: number;
  report_id: string | null;
  signal_2_actual_pct: number | null;
  signal_2_auto: boolean;
  signal_3_actual_count: number | null;
  signal_3_auto: boolean;
};

async function getActiveCampaigns(
  supabase: ReturnType<typeof createAdminClient>
): Promise<CampaignRow[]> {
  // Get all active campaigns whose clients have a hashtag configured
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(`
      id,
      name,
      clients!inner (
        name,
        primary_hashtag
      )
    `)
    .eq("status", "active")
    .not("clients.primary_hashtag", "is", null);

  if (error || !campaigns) return [];

  const results: CampaignRow[] = [];

  for (const c of campaigns as unknown as Array<{
    id: string;
    name: string;
    clients: { name: string; primary_hashtag: string } | null;
  }>) {
    if (!c.clients?.primary_hashtag) continue;

    // Get the most recent signal_weekly_reports row for this campaign
    const { data: latestReport } = await supabase
      .from("signal_weekly_reports")
      .select("id, week_number, signal_2_actual_pct, signal_2_auto, signal_3_actual_count, signal_3_auto")
      .eq("campaign_id", c.id)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestReport) continue; // No reporting started — skip

    // Skip the Apify call entirely only if BOTH S2 and S3 are manually locked
    // for this week — otherwise at least one signal can still be auto-written.
    const s3Locked = latestReport.signal_3_actual_count !== null && !latestReport.signal_3_auto;
    const s2Locked = latestReport.signal_2_actual_pct !== null && !latestReport.signal_2_auto;
    if (s3Locked && s2Locked) continue;

    results.push({
      campaign_id: c.id,
      campaign_name: c.name,
      client_name: c.clients.name,
      primary_hashtag: c.clients.primary_hashtag,
      week_number: latestReport.week_number,
      report_id: latestReport.id,
      signal_2_actual_pct: latestReport.signal_2_actual_pct,
      signal_2_auto: latestReport.signal_2_auto ?? false,
      signal_3_actual_count: latestReport.signal_3_actual_count,
      signal_3_auto: latestReport.signal_3_auto ?? false,
    });
  }

  return results;
}

// ─── WA Echo Event detection ──────────────────────────────────────────────────
// After writing S3, check if a WA Echo Event should be flagged on the same row.
// Rule: signal_2_actual_pct >= threshold AND (this week OR prior week) AND
//       direct_traffic_sessions is above 4-week average by ≥20%.
// In v1 (no GA4 API), we can only check S2 and S3 convergence as a proxy:
// If S2 save rate is above threshold AND S3 UGC grew ≥15% from last week,
// flag wa_echo_event as a provisional echo signal pending GA4 confirmation.

async function detectWaEchoEvent(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
  weekNumber: number,
  newS3Count: number
): Promise<boolean> {
  // Get last 3 weeks of data
  const { data: history } = await supabase
    .from("signal_weekly_reports")
    .select("week_number, signal_2_actual_pct, signal_3_actual_count, direct_traffic_sessions")
    .eq("campaign_id", campaignId)
    .lte("week_number", weekNumber)
    .order("week_number", { ascending: false })
    .limit(3);

  if (!history || history.length < 2) return false;

  const current = history[0];
  const prior   = history[1];

  // S2 save rate must be above 8% (default threshold) this week or last week
  const s2Live = (current?.signal_2_actual_pct ?? 0) >= 8
    || (prior?.signal_2_actual_pct ?? 0) >= 8;

  if (!s2Live) return false;

  // S3 UGC must have grown ≥15% from prior week
  const priorS3 = prior?.signal_3_actual_count ?? 0;
  if (priorS3 === 0) return false;
  const s3Growth = (newS3Count - priorS3) / priorS3;
  if (s3Growth < 0.15) return false;

  // If we also have GA4 direct traffic data, require that too
  if (current?.direct_traffic_sessions != null) {
    // Compute 4-week avg of direct traffic
    const { data: fourWeeks } = await supabase
      .from("signal_weekly_reports")
      .select("direct_traffic_sessions")
      .eq("campaign_id", campaignId)
      .lt("week_number", weekNumber)
      .not("direct_traffic_sessions", "is", null)
      .order("week_number", { ascending: false })
      .limit(4);

    const values = (fourWeeks ?? [])
      .map(r => r.direct_traffic_sessions as number)
      .filter(v => v > 0);

    if (values.length >= 2) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const spike = current.direct_traffic_sessions! / avg;
      return spike >= 1.20; // 20% above average = confirmed echo
    }
  }

  // S2 + S3 convergence without GA4 = provisional echo (still flag it)
  return true;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json({
      ok: false,
      error: "APIFY_API_TOKEN not configured. Add it to Vercel env to enable S3 automation.",
      setup_required: true,
    }, { status: 400 });
  }

  const supabase = createAdminClient();
  const log: string[] = [];
  let updated = 0;
  let echoEvents = 0;
  let s2Written = 0;
  let s3Written = 0;

  try {
    const campaigns = await getActiveCampaigns(supabase);
    log.push(`Found ${campaigns.length} active campaigns with hashtag configured`);

    for (const campaign of campaigns) {
      try {
        log.push(`Scanning #${campaign.primary_hashtag} for ${campaign.client_name} — campaign: ${campaign.campaign_name}`);

        const { count, saveRatePct } = await fetchHashtagData(campaign.primary_hashtag);
        log.push(`  → ${count} posts found, Save Rate ${saveRatePct !== null ? saveRatePct + "%" : "unavailable (no plays in sample)"}`);

        // Detect WA Echo Event before writing (uses prior signal_3 for comparison)
        const isEcho = await detectWaEchoEvent(
          supabase,
          campaign.campaign_id,
          campaign.week_number,
          count
        );

        if (isEcho) {
          echoEvents++;
          log.push(`  → WA Echo Event detected (S2+S3 convergence)`);
        }

        // Only write each field if it isn't manually locked for this week
        const s3Locked = campaign.signal_3_actual_count !== null && !campaign.signal_3_auto;
        const s2Locked = campaign.signal_2_actual_pct !== null && !campaign.signal_2_auto;

        const updatePayload: Record<string, unknown> = {};
        if (!s3Locked) {
          updatePayload.signal_3_actual_count = count;
          updatePayload.signal_3_auto = true;
        }
        if (!s2Locked && saveRatePct !== null) {
          updatePayload.signal_2_actual_pct = saveRatePct;
          updatePayload.signal_2_auto = true;
        }
        if (isEcho) updatePayload.wa_echo_event = true;

        if (Object.keys(updatePayload).length === 0) {
          log.push(`  — both signals manually locked, nothing to write`);
          continue;
        }

        const { error } = await supabase
          .from("signal_weekly_reports")
          .update(updatePayload)
          .eq("id", campaign.report_id);

        if (error) {
          log.push(`  ERROR: ${error.message}`);
        } else {
          updated++;
          if ("signal_3_actual_count" in updatePayload) s3Written++;
          if ("signal_2_actual_pct" in updatePayload) s2Written++;
          log.push(`  ✓ Written to week ${campaign.week_number}`);
        }

      } catch (err) {
        log.push(`  ERROR for ${campaign.client_name}: ${String(err)}`);
      }

      // Rate limit: 2 seconds between Apify calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    log.push(`Done. ${updated} campaigns updated (S3: ${s3Written}, S2: ${s2Written}), ${echoEvents} WA Echo Events detected.`);

    return NextResponse.json({
      ok: true,
      campaigns_scanned: campaigns.length,
      campaigns_updated: updated,
      s3_written: s3Written,
      s2_written: s2Written,
      echo_events: echoEvents,
      log,
    });

  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      log,
    }, { status: 500 });
  }
}
