import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaign_id");
  if (!campaignId) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prediction_accuracy_log")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { campaign_id, category, prediction_text, predicted_value, unit, prediction_week } = body;
  if (!campaign_id || !category || !prediction_text) {
    return NextResponse.json({ error: "campaign_id, category, prediction_text required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prediction_accuracy_log")
    .insert({
      campaign_id,
      category,
      prediction_text,
      predicted_value: predicted_value ?? null,
      unit: unit ?? null,
      prediction_week: prediction_week ?? null,
      verdict: "Pending",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
