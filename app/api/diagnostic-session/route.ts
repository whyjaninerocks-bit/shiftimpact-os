// app/api/diagnostic-session/route.ts
// Sprint 11 — Diagnostic Session CRUD
// INTERNAL ONLY
//
// GET  /api/diagnostic-session           — list all sessions
// GET  /api/diagnostic-session?id=<id>  — single session
// POST /api/diagnostic-session           — create
// PATCH /api/diagnostic-session          — update (id in body)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("diagnostic_sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("diagnostic_sessions")
    .select("id, client_name, contact_name, industry, status, engagement_fee_rm, session_date, created_at, delivered_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    client_name, contact_name, contact_email,
    industry, budget_range, current_channels, pain_points, current_tools,
    engagement_fee_rm, session_date,
  } = body;

  if (!client_name || !industry) {
    return NextResponse.json({ error: "client_name and industry required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diagnostic_sessions")
    .insert({
      client_name,
      contact_name: contact_name ?? null,
      contact_email: contact_email ?? null,
      industry,
      budget_range: budget_range ?? null,
      current_channels: current_channels ?? [],
      pain_points: pain_points ?? null,
      current_tools: current_tools ?? null,
      engagement_fee_rm: engagement_fee_rm ? Number(engagement_fee_rm) : null,
      session_date: session_date ?? null,
      status: "Booked",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("diagnostic_sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
