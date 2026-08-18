import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaign_id");
  if (!campaignId) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("kol_trackers")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { campaign_id, name, platform, tier, follower_count, brief_status, performance_note } = body;
  if (!campaign_id || !name) return NextResponse.json({ error: "campaign_id + name required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("kol_trackers")
    .insert({ campaign_id, name, platform: platform ?? "TikTok", tier: tier ?? "Micro", follower_count: follower_count ?? null, brief_status: brief_status ?? "Pending", performance_note: performance_note ?? null })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
