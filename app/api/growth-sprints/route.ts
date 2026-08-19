// app/api/growth-sprints/route.ts
// Growth Sprint Experience v1 — INTERNAL ONLY
//
// POST /api/growth-sprints  — create a draft
// GET  /api/growth-sprints  — list all sprints (list view)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthSprintAuth } from "@/lib/growth-sprint/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authError = await requireGrowthSprintAuth();
    if (authError) return authError;

    const body = await req.json();
    const business_name = typeof body?.business_name === "string" ? body.business_name.trim() : "";

    if (!business_name) {
      return NextResponse.json({ error: "business_name required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("growth_sprints")
      .insert({
        business_name,
        growth_question: "", // filled in step 2, not-null in schema so start empty
        status: "draft",
      })
      .select("id, status")
      .single();

    if (error || !data) {
      console.error("Failed to create growth sprint:", error);
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, status: data.status }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const authError = await requireGrowthSprintAuth();
    if (authError) return authError;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("growth_sprints")
      .select("id, business_name, business_context, status, decision_outcome, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to list growth sprints:", error);
      return NextResponse.json({ error: "Failed to list" }, { status: 500 });
    }

    return NextResponse.json({ sprints: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
