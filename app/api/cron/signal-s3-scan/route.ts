// app/api/cron/signal-s3-scan/route.ts
// Weekly automated S3 UGC Volume scan via TikTok hashtag counting.
// Runs every Tuesday 3am UTC (11am MYT) — one hour after cultural-scan.
//
// WHAT IT DOES:
//   For every client that has a primary_hashtag set, fetches recent TikTok posts
//   for that hashtag and writes the weekly count to signal_weekly_reports.
//   Only updates weeks that already exist (i.e. the strategy lead has started
//   weekly reporting for that campaign) and where signal_3_auto = false or
//   the value is null (does not overwrite manual entries).
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
// Returns the count of posts found for the hashtag in the current week window.
// We request 50 results to get a meaningful sample — the raw count is what we
// store, not a reach-normalised rate. The strategy lead can see the absolute
// weekly volume and judge directional change.

async function fetchHashtagCount(hashtag: string): Promise<number> {
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

  const items = await res.json() as unknown[];
  return Array.isArray(items) ? items.length : 0;
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

  for (const c of campaigns as Array<{
    id: string;
    name: string;
    clients: { name: string; primary_hashtag: string } | null;
  }>) {
    if (!c.clients?.primary_hashtag) continue;

    // Get the most recent signal_weekly_reports row for this campaign
    const { data: latestReport } = await supabase
      .from("signal_weekly_reports")
      .select("id, week_number, signal_3_actual_count, signal_3_auto")
      .eq("campaign_id", c.id)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestReport) continue; // No reporting started — skip

    // Skip if this week already has a manual entry
    if (latestReport.signal_3_actual_count !== null && !latestReport.signal_3_auto) {
      continue;
    }

    results.push({
      campaign_id: c.id,
      campaign_name: c.name,
      client_name: c.clients.name,
      primary_hashtag: c.clients.primary_hashtag,
      week_number: latestReport.week_number,
      report_id: latestReport.id,
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

  try {
    const campaigns = await getActiveCampaigns(supabase);
    log.push(`Found ${campaigns.length} active campaigns with hashtag configured`);

    for (const campaign of campaigns) {
      try {
        log.push(`Scanning #${campaign.primary_hashtag} for ${campaign.client_name} — campaign: ${campaign.campaign_name}`);

        const count = await fetchHashtagCount(campaign.primary_hashtag);
        log.push(`  → ${count} posts found`);

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

        // Write to signal_weekly_reports
        const { error } = await supabase
          .from("signal_weekly_reports")
          .update({
            signal_3_actual_count: count,
            signal_3_auto: true,
            ...(isEcho ? { wa_echo_event: true } : {}),
          })
          .eq("id", campaign.report_id);

        if (error) {
          log.push(`  ERROR: ${error.message}`);
        } else {
          updated++;
          log.push(`  ✓ Written to week ${campaign.week_number}`);
        }

      } catch (err) {
        log.push(`  ERROR for ${campaign.client_name}: ${String(err)}`);
      }

      // Rate limit: 2 seconds between Apify calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    log.push(`Done. ${updated} campaigns updated, ${echoEvents} WA Echo Events detected.`);

    return NextResponse.json({
      ok: true,
      campaigns_scanned: campaigns.length,
      campaigns_updated: updated,
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
