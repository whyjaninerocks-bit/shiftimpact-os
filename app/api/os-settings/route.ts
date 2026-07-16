// app/api/os-settings/route.ts
// OS Settings API — read and update operator configuration.
//
// GET  /api/os-settings          — returns all settings rows
// POST /api/os-settings          — body: { key, value } — updates one setting
//
// Auth: service role (admin only). No client exposure.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("os_settings")
    .select("key, value, label, description, updated_at")
    .order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json();
  if (!key || !value) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("os_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, setting: data });
}
