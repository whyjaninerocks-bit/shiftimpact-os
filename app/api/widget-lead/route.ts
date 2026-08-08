// app/api/widget-lead/route.ts
// Public endpoint — no auth required. CORS open for embeds + external demos.
//
// POST /api/widget-lead   — create a lead record (decision + assumption, no email yet)
// PATCH /api/widget-lead  — add email to an existing lead (post-reveal capture)
//
// Table: widget_leads
// session_id is a client-generated UUID that ties the two calls together.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { session_id, decision_text, assumption_category } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400, headers: CORS });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("widget_leads")
    .upsert(
      {
        session_id,
        decision_text: decision_text ?? null,
        assumption_category: assumption_category ?? null,
      },
      { onConflict: "session_id" }
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json(data, { status: 201, headers: CORS });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { session_id, email } = body;

  if (!session_id || !email) {
    return NextResponse.json({ error: "session_id and email required" }, { status: 400, headers: CORS });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400, headers: CORS });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("widget_leads")
    .update({ email: email.toLowerCase().trim() })
    .eq("session_id", session_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json({ ok: true }, { headers: CORS });
}

export async function GET(req: NextRequest) {
  // Internal only — list recent leads for Janine
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("widget_leads")
    .select("id, session_id, assumption_category, email, created_at, emailed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json(data ?? [], { headers: CORS });
}
