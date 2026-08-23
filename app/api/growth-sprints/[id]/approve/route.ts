// app/api/growth-sprints/[id]/approve/route.ts
// Growth Sprint Experience v1 — INTERNAL ONLY
//
// POST /api/growth-sprints/[id]/approve
// Marks the reviewed output as operator-approved. Required before publish.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthSprintAuth } from "@/lib/growth-sprint/auth";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireGrowthSprintAuth();
    if (authError) return authError;

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: sprint, error: fetchErr } = await supabase
      .from("growth_sprints")
      .select("status, diagnosis_reviewed, recommendation_reviewed")
      .eq("id", id)
      .single();

    if (fetchErr || !sprint) {
      return NextResponse.json({ error: "Growth sprint not found" }, { status: 404 });
    }
    if (sprint.status !== "recommended") {
      return NextResponse.json({ error: `Cannot approve from status "${sprint.status}" — recommendation must be completed first` }, { status: 400 });
    }
    if (!sprint.diagnosis_reviewed || !sprint.recommendation_reviewed) {
      return NextResponse.json({ error: "Reviewed output is incomplete" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from("growth_sprints")
      .update({ status: "approved", approved_at: now, updated_at: now })
      .eq("id", id)
      .select("status, approved_at")
      .single();

    if (updateErr || !updated) {
      console.error("Failed to approve growth sprint:", updateErr);
      return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints/[id]/approve error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
