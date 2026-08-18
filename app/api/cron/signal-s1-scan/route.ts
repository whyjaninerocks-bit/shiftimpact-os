// app/api/cron/signal-s1-scan/route.ts
// Weekly automated S1 (Share of Search) scan via Google Trends.
// Runs every Tuesday 4am UTC (12pm MYT) — one hour after signal-s3-scan.
//
// WHAT IT DOES:
//   For every client with a brand_search_term, fetches relative Google Trends
//   interest for that term in Malaysia over the past 4 weeks. The week-on-week
//   delta vs the 4-week baseline is stored as signal_1_actual_pct.
//
//   Why delta, not raw interest?
//   Google Trends returns relative interest (0–100), not absolute search volume.
//   The 4-week baseline average becomes 0%; each week's deviation is the pct.
//   This aligns with how S1 is defined: "branded search lift vs baseline".
//
// ACTOR: apify~google-trends-scraper
//   Input: keyword + geo + timeRange
//   Output: array of { date, value } interest-over-time data points
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

// ─── Google Trends via Apify ──────────────────────────────────────────────────
// Returns the latest week's interest value (0–100) and a 4-week average.
// We pass the past 90 days so we always have a stable baseline window.

type TrendDataPoint = {
  date: string;     // YYYY-MM-DD
  value: number;    // 0–100 relative interest
};

async function fetchGoogleTrends(keyword: string, geo: string = "MY"): Promise<{
  currentValue: number;
  baselineAvg: number;
  liftPct: number;
} | null> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not configured");

  const url = `${APIFY_BASE}/acts/apify~google-trends-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=90&maxItems=200`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchTerms: [keyword],
      geo,
      timeRange: "now 90-d",   // past 90 days — gives us ~12-13 data points
      category: 0,             // all categories
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Trends scraper failed: ${res.status} — ${body.slice(0, 200)}`);
  }

  const items = await res.json() as unknown[];
  if (!Array.isArray(items) || items.length === 0) return null;

  // Extract interest-over-time points from Apify output
  // The actor returns items with: { keyword, date, value } OR nested structure
  const points: TrendDataPoint[] = [];

  for (const item of items) {
    const it = item as Record<string, unknown>;

    // Handle nested interestOverTime array (common actor output format)
    if (Array.isArray(it.interestOverTime)) {
      for (const pt of it.interestOverTime as Array<Record<string, unknown>>) {
        if (pt.date && typeof pt.value === "number") {
          points.push({ date: String(pt.date).slice(0, 10), value: pt.value });
        }
      }
    }
    // Handle flat format: each item is a data point
    else if (it.date && typeof it.value === "number") {
      points.push({ date: String(it.date).slice(0, 10), value: it.value as number });
    }
  }

  if (points.length < 2) return null;

  // Sort by date descending
  points.sort((a, b) => b.date.localeCompare(a.date));

  const currentValue = points[0].value;
  // Baseline = mean of weeks 2–5 (exclude current week; use the 4 prior weeks)
  const baselinePoints = points.slice(1, 5);
  if (baselinePoints.length === 0) return null;

  const baselineAvg = baselinePoints.reduce((sum, p) => sum + p.value, 0) / baselinePoints.length;

  // Lift % = (current - baseline) / baseline * 100
  // e.g. baseline=50, current=59 → lift = 18%
  const liftPct = baselineAvg > 0
    ? Math.round(((currentValue - baselineAvg) / baselineAvg) * 100 * 10) / 10
    : 0;

  return { currentValue, baselineAvg: Math.round(baselineAvg * 10) / 10, liftPct };
}

// ─── Get active campaigns needing S1 update ───────────────────────────────────

type CampaignS1Row = {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  brand_search_term: string;
  geo: string;
  week_number: number;
  report_id: string;
  signal_1_actual_pct: number | null;
  signal_1_auto: boolean;
};

async function getActiveCampaigns(
  supabase: ReturnType<typeof createAdminClient>
): Promise<CampaignS1Row[]> {
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(`
      id,
      name,
      clients!inner (
        name,
        brand_search_term,
        market_code
      )
    `)
    .eq("status", "active")
    .not("clients.brand_search_term", "is", null);

  if (error || !campaigns) return [];

  const results: CampaignS1Row[] = [];

  for (const c of campaigns as Array<{
    id: string;
    name: string;
    clients: { name: string; brand_search_term: string; market_code?: string } | null;
  }>) {
    if (!c.clients?.brand_search_term) continue;

    const { data: latestReport } = await supabase
      .from("signal_weekly_reports")
      .select("id, week_number, signal_1_actual_pct, signal_1_auto")
      .eq("campaign_id", c.id)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestReport) continue;

    // Skip if manual entry exists
    if (latestReport.signal_1_actual_pct !== null && !latestReport.signal_1_auto) {
      continue;
    }

    results.push({
      campaign_id: c.id,
      campaign_name: c.name,
      client_name: c.clients.name,
      brand_search_term: c.clients.brand_search_term,
      geo: c.clients.market_code ?? "MY",
      week_number: latestReport.week_number,
      report_id: latestReport.id,
      signal_1_actual_pct: latestReport.signal_1_actual_pct,
      signal_1_auto: latestReport.signal_1_auto ?? false,
    });
  }

  return results;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json({
      ok: false,
      error: "APIFY_API_TOKEN not configured. Add it to Vercel env to enable S1 automation.",
      setup_required: true,
    }, { status: 400 });
  }

  const supabase = createAdminClient();
  const log: string[] = [];
  let updated = 0;

  try {
    const campaigns = await getActiveCampaigns(supabase);
    log.push(`Found ${campaigns.length} active campaigns with brand_search_term configured`);

    for (const campaign of campaigns) {
      try {
        log.push(`Fetching Google Trends for "${campaign.brand_search_term}" (${campaign.geo}) — ${campaign.client_name}`);

        const trends = await fetchGoogleTrends(campaign.brand_search_term, campaign.geo);

        if (!trends) {
          log.push(`  → No trend data returned — skipping`);
          continue;
        }

        log.push(`  → Current: ${trends.currentValue} | Baseline avg: ${trends.baselineAvg} | Lift: ${trends.liftPct}%`);

        const { error } = await supabase
          .from("signal_weekly_reports")
          .update({
            signal_1_actual_pct: trends.liftPct,
            signal_1_auto: true,
          })
          .eq("id", campaign.report_id);

        if (error) {
          log.push(`  ERROR: ${error.message}`);
        } else {
          updated++;
          log.push(`  ✓ S1 = ${trends.liftPct}% lift written to week ${campaign.week_number}`);
        }

      } catch (err) {
        log.push(`  ERROR for ${campaign.client_name}: ${String(err)}`);
      }

      // Rate limit: 3 seconds between Apify calls (Trends scraper is slower)
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    log.push(`Done. ${updated} campaigns updated.`);

    return NextResponse.json({
      ok: true,
      campaigns_scanned: campaigns.length,
      campaigns_updated: updated,
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
