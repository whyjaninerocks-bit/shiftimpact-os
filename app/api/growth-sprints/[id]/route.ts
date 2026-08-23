// app/api/growth-sprints/[id]/route.ts
// Growth Sprint Experience v1 — INTERNAL ONLY
//
// GET   — fetch one sprint (full row)
// PATCH — autosave steps 1-6, operator edits to reviewed output,
//         override_reason, and post-pilot validation_feedback capture.
//         No separate route for validation_feedback — it's just a PATCH
//         field, since it's follow-up notes, not a workflow step.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthSprintAuth } from "@/lib/growth-sprint/auth";

export const dynamic = "force-dynamic";

// Fields an operator is allowed to write directly. Everything else
// (diagnosis_raw, recommendation_raw, status transitions, timestamps)
// is only ever written by the dedicated action routes.
const PATCHABLE_FIELDS = [
  "business_location",
  "business_context",
  "target_customer",
  "growth_question",
  "desired_outcome",
  "current_obstacle",
  "constraints_notes",
  "revenue_pillars",
  "growth_moments",
  "evidence_tags",
  "diagnosis_reviewed",
  "recommendation_reviewed",
  "override_reason",
  "validation_feedback",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireGrowthSprintAuth();
    if (authError) return authError;

    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("growth_sprints")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints/[id] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireGrowthSprintAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (field in body) update[field] = body[field];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    update.updated_at = new Date().toISOString();

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("growth_sprints")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Failed to update growth sprint:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints/[id] PATCH error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
