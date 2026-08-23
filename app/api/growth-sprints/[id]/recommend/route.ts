// app/api/growth-sprints/[id]/recommend/route.ts
// Growth Sprint Experience v1 — AI Call 2 — INTERNAL ONLY
//
// POST /api/growth-sprints/[id]/recommend
// Body: { priority_moment_id: string, override_reason?: string }
//
// Runs after the operator has reviewed Call 1's output and confirmed
// (or overridden) which Growth Moment to act on. Writes
// recommendation_raw + recommendation_reviewed as identical copies and
// sets decision_outcome directly (Scale/Shift/Hold/Retest/Stop — no
// mapping layer in v1). Status moves to "recommended".

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRecommendation } from "@/lib/growth-sprint/recommend";
import type { GrowthMoment } from "@/lib/growth-sprint/types";
import { requireGrowthSprintAuth } from "@/lib/growth-sprint/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireGrowthSprintAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await req.json();
    const priority_moment_id = typeof body?.priority_moment_id === "string" ? body.priority_moment_id : "";
    const override_reason = typeof body?.override_reason === "string" ? body.override_reason : null;

    if (!priority_moment_id) {
      return NextResponse.json({ error: "priority_moment_id required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: sprint, error: fetchErr } = await supabase
      .from("growth_sprints")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !sprint) {
      return NextResponse.json({ error: "Growth sprint not found" }, { status: 404 });
    }

    if (!sprint.diagnosis_reviewed) {
      return NextResponse.json({ error: "Diagnosis must be completed first" }, { status: 400 });
    }

    const moments: GrowthMoment[] = sprint.growth_moments ?? [];
    const priorityMoment = moments.find((m) => m.id === priority_moment_id);
    if (!priorityMoment) {
      return NextResponse.json({ error: "priority_moment_id does not match any Growth Moment on this sprint" }, { status: 400 });
    }

    const { output, model } = await runRecommendation({
      business_name: sprint.business_name,
      business_context: sprint.business_context,
      diagnosis: sprint.diagnosis_reviewed,
      priority_moment: priorityMoment,
      override_reason,
    });

    const { data: updated, error: updateErr } = await supabase
      .from("growth_sprints")
      .update({
        recommendation_raw: output,
        recommendation_reviewed: output,
        decision_outcome: output.decision_outcome,
        override_reason: override_reason ?? sprint.override_reason,
        status: "recommended",
        model_used: model,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("recommendation_raw, recommendation_reviewed, decision_outcome, status")
      .single();

    if (updateErr || !updated) {
      console.error("Failed to save recommendation:", updateErr);
      return NextResponse.json({ error: "Failed to save recommendation" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints/[id]/recommend error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
