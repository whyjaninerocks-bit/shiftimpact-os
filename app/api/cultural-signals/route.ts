// app/api/cultural-signals/route.ts
// Cultural Radar & Instigation Engine — GA3 prototype
// GET  /api/cultural-signals        — list all signals
// POST /api/cultural-signals        — create new signal (Part 1)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cultural_signals")
    .select("id, signal_name, signal_type, is_trending, geographic_scope, brand_fit_status, status, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signals: data });
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  const { signal_name, signal_type, source_description, evidence, is_trending, geographic_scope } = body;

  if (!signal_name?.trim())       return NextResponse.json({ error: "signal_name required" }, { status: 400 });
  if (!signal_type)               return NextResponse.json({ error: "signal_type required" }, { status: 400 });
  if (!source_description?.trim()) return NextResponse.json({ error: "source_description required" }, { status: 400 });
  if (!evidence?.trim())          return NextResponse.json({ error: "evidence required" }, { status: 400 });

  const { data, error } = await supabase
    .from("cultural_signals")
    .insert({
      signal_name:        signal_name.trim(),
      signal_type,
      source_description: source_description.trim(),
      evidence:           evidence.trim(),
      is_trending:        !!is_trending,
      geographic_scope:   geographic_scope || "MY",
      status:             "logged",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signal: data }, { status: 201 });
}
