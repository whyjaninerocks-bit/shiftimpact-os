// app/api/ga5-benchmarks/route.ts
// Sprint 10 — GA5 Data Boundary: Own Campaign Baseline + Category Benchmarks
// INTERNAL ONLY
//
// GET /api/ga5-benchmarks?campaign_id=<id>
//
// Returns:
//   own_baseline: this campaign's avg signal performance and spend efficiency per week
//   category:     industry_profile for this campaign
//   category_n:   how many clients exist in this category (N gate)
//   benchmarks:   cross-category avg data (only populated when category_n >= 5)
//   unlocked:     boolean — true when N >= 5

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const GA5_MIN_N = 5;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function avg(arr: (number | null)[]): number | null {
  const vals = arr.filter((v): v is number => v !== null && !isNaN(v));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get("campaign_id");
    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // ── 1. Get campaign + client + FRAME for industry_profile ─────────────────
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("client_id, name")
      .eq("id", campaignId)
      .maybeSingle();

    const { data: frame } = await supabase
      .from("frame_briefs")
      .select("industry_category")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    const industryCategory = (frame as { industry_category?: string | null } | null)?.industry_category ?? null;
    const clientId = (campaign as { client_id?: string } | null)?.client_id ?? null;

    // ── 2. Own campaign signal performance ────────────────────────────────────
    const { data: signalReports } = await supabase
      .from("signal_weekly_reports")
      .select("week_number, signal_1_actual_pct, signal_2_actual_pct, signal_3_actual_count, demand_health, nurture_health, conversion_health")
      .eq("campaign_id", campaignId)
      .order("week_number", { ascending: true })
      .limit(20);

    const reports = (signalReports ?? []) as Array<{
      week_number: number;
      signal_1_actual_pct: number | null;
      signal_2_actual_pct: number | null;
      signal_3_actual_count: number | null;
      demand_health: string | null;
      nurture_health: string | null;
      conversion_health: string | null;
    }>;

    const ownBaseline = {
      week_count: reports.length,
      avg_s1: avg(reports.map(r => r.signal_1_actual_pct)),
      avg_s2: avg(reports.map(r => r.signal_2_actual_pct)),
      avg_s3: avg(reports.map(r => r.signal_3_actual_count)),
      weeks: reports.map(r => ({
        week: r.week_number,
        s1: r.signal_1_actual_pct,
        s2: r.signal_2_actual_pct,
        s3: r.signal_3_actual_count,
        demand: r.demand_health,
        nurture: r.nurture_health,
        conversion: r.conversion_health,
      })),
    };

    // ── 3. Own attribution efficiency ─────────────────────────────────────────
    const { data: attributionRows } = await supabase
      .from("attribution_records")
      .select("week_number, spend_rm, sales_rm, lift_pct")
      .eq("campaign_id", campaignId)
      .order("week_number", { ascending: true })
      .limit(20);

    type AttrRow = { week_number: number; spend_rm: number | null; sales_rm: number | null; lift_pct: number | null };
    const attrData = (attributionRows ?? []) as AttrRow[];

    const totalSpend = attrData.reduce((s, r) => s + (r.spend_rm ?? 0), 0);
    const totalSales = attrData.reduce((s, r) => s + (r.sales_rm ?? 0), 0);
    const roi = totalSpend > 0 ? Math.round((totalSales / totalSpend) * 100) / 100 : null;

    const ownAttribution = {
      week_count: attrData.length,
      total_spend_rm: totalSpend || null,
      total_sales_rm: totalSales || null,
      roi_ratio: roi,
      avg_lift_pct: avg(attrData.map(r => r.lift_pct)),
    };

    // ── 4. Category N gate ────────────────────────────────────────────────────
    let categoryN = 0;
    if (industryCategory) {
      const { count } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("industry_profile", industryCategory)
        .neq("id", clientId ?? "");
      // Include this client too
      categoryN = (count ?? 0) + 1;
    }

    const unlocked = categoryN >= GA5_MIN_N;

    // ── 5. Category benchmarks (only if unlocked) ─────────────────────────────
    let benchmarks: Record<string, unknown> | null = null;
    if (unlocked && industryCategory) {
      // Get all campaigns in this category
      const { data: categoryClients } = await supabase
        .from("clients")
        .select("id")
        .eq("industry_profile", industryCategory);

      const clientIds = (categoryClients ?? []).map((c: { id: string }) => c.id);

      if (clientIds.length >= GA5_MIN_N) {
        const { data: allCampaigns } = await supabase
          .from("campaigns")
          .select("id")
          .in("client_id", clientIds)
          .limit(50);

        const campaignIds = (allCampaigns ?? []).map((c: { id: string }) => c.id);

        if (campaignIds.length >= GA5_MIN_N) {
          const { data: allSignals } = await supabase
            .from("signal_weekly_reports")
            .select("signal_1_actual_pct, signal_2_actual_pct, signal_3_actual_count")
            .in("campaign_id", campaignIds)
            .limit(200);

          const allRows = (allSignals ?? []) as Array<{
            signal_1_actual_pct: number | null;
            signal_2_actual_pct: number | null;
            signal_3_actual_count: number | null;
          }>;

          benchmarks = {
            category: industryCategory,
            n_clients: categoryN,
            n_campaigns: campaignIds.length,
            avg_s1: avg(allRows.map(r => r.signal_1_actual_pct)),
            avg_s2: avg(allRows.map(r => r.signal_2_actual_pct)),
            avg_s3: avg(allRows.map(r => r.signal_3_actual_count)),
          };
        }
      }
    }

    return NextResponse.json({
      campaign_id: campaignId,
      category: industryCategory,
      category_n: categoryN,
      unlocked,
      ga5_min_n: GA5_MIN_N,
      own_baseline: ownBaseline,
      own_attribution: ownAttribution,
      benchmarks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/ga5-benchmarks error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
