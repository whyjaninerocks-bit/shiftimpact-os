import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/prospect-scores ─────────────────────────────────────────────────
// Score history for a company — ordered newest first.
// Query params: company_id (required), limit? (default 10)

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const company_id = searchParams.get("company_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);

  if (!company_id) {
    return NextResponse.json({ error: "company_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("prospect_scores")
    .select("id, opportunity_score, pursuit_score, composite_score, scored_at, assessment_id")
    .eq("company_id", company_id)
    .order("scored_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ scores: data });
}

// ─── POST /api/prospect-scores ────────────────────────────────────────────────
// Insert a score snapshot after an assessment.
// Called internally by /api/prospect-assess — not typically called directly.
// Body: { company_id, assessment_id, opportunity_score, pursuit_score }

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { company_id, assessment_id, opportunity_score, pursuit_score } = body;
  if (!company_id || opportunity_score == null || pursuit_score == null) {
    return NextResponse.json(
      { error: "company_id, opportunity_score, pursuit_score are required" },
      { status: 400 }
    );
  }

  const composite_score =
    Number(opportunity_score) * 0.6 + Number(pursuit_score) * 0.4;

  const { data, error } = await supabase
    .from("prospect_scores")
    .insert({
      company_id:        company_id as string,
      assessment_id:     assessment_id as string ?? null,
      opportunity_score: Number(opportunity_score),
      pursuit_score:     Number(pursuit_score),
      composite_score:   Number(composite_score.toFixed(1)),
      scored_at:         new Date().toISOString(),
    })
    .select("id, composite_score, scored_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ score: data }, { status: 201 });
}
