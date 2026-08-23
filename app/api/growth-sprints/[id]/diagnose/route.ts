// app/api/growth-sprints/[id]/diagnose/route.ts
// Growth Sprint Experience v1 — AI Call 1 — INTERNAL ONLY
//
// POST /api/growth-sprints/[id]/diagnose
//
// Runs after steps 1-6 are complete. Writes diagnosis_raw AND
// diagnosis_reviewed as identical copies on first write — the operator
// edits diagnosis_reviewed from here, diagnosis_raw is never touched
// again and never exposed publicly. Status moves to "diagnosed".

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDiagnosis } from "@/lib/growth-sprint/diagnose";
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
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !sprint) {
      return NextResponse.json({ error: "Growth sprint not found" }, { status: 404 });
    }

    if (!sprint.growth_question) {
      return NextResponse.json({ error: "growth_question is required before diagnosis" }, { status: 400 });
    }
    if (!Array.isArray(sprint.growth_moments) || sprint.growth_moments.length === 0) {
      return NextResponse.json({ error: "At least one Growth Moment is required before diagnosis" }, { status: 400 });
    }

    const { output, model } = await runDiagnosis({
      business_name: sprint.business_name,
      business_location: sprint.business_location,
      business_context: sprint.business_context,
      target_customer: sprint.target_customer,
      growth_question: sprint.growth_question,
      desired_outcome: sprint.desired_outcome,
      current_obstacle: sprint.current_obstacle,
      constraints_notes: sprint.constraints_notes,
      revenue_pillars: sprint.revenue_pillars ?? [],
      growth_moments: sprint.growth_moments ?? [],
      evidence_tags: sprint.evidence_tags ?? {},
    });

    const { data: updated, error: updateErr } = await supabase
      .from("growth_sprints")
      .update({
        diagnosis_raw: output,
        diagnosis_reviewed: output,
        status: "diagnosed",
        model_used: model,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("diagnosis_raw, diagnosis_reviewed, status")
      .single();

    if (updateErr || !updated) {
      console.error("Failed to save diagnosis:", updateErr);
      return NextResponse.json({ error: "Failed to save diagnosis" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints/[id]/diagnose error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
