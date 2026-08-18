// app/api/data-preferences/route.ts
// Data Source Preferences — Proxy Mode
// Sprint 31 · 20 July 2026
//
// GET  /api/data-preferences?campaign_id=<id>
//   Returns the current data preferences for a campaign.
//   Returns null body if no preferences saved yet.
//
// POST /api/data-preferences
//   Body: { campaign_id, mode_sov, indexed_sov_direction, ... }
//   Upserts on campaign_id.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { DataPreferences } from "@/lib/types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaign_id = searchParams.get("campaign_id");

  if (!campaign_id) {
    return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("campaign_data_preferences")
    .select("*")
    .eq("campaign_id", campaign_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id, ...fields } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("campaign_data_preferences")
      .upsert(
        { campaign_id, ...fields },
        { onConflict: "campaign_id" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as DataPreferences);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
