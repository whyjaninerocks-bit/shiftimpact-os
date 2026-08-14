import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaign_id");
  if (!campaignId) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("budget_movements")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: true })
    .order("channel", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { campaign_id, channel, week_number, planned_spend, actual_spend, currency, note } = body;
  if (!campaign_id || !channel) return NextResponse.json({ error: "campaign_id + channel required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("budget_movements")
    .insert({
      campaign_id,
      channel,
      week_number: week_number ?? 1,
      planned_spend: planned_spend ?? null,
      actual_spend: actual_spend ?? null,
      currency: currency ?? "MYR",
      note: note ?? null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
