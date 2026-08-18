// app/api/digest-decision/route.ts
// Sprint 8 — Digest recommendation decision capture
//
// POST /api/digest-decision
// Body: { digest_id, campaign_id, recommendation_index, recommendation_action, decision, decision_note }
//
// Saves to digest_decision_captures. Used for confidence calibration in Sprint 9.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { digest_id, campaign_id, recommendation_index, recommendation_action, decision, decision_note } = body;

    if (!digest_id || !campaign_id || decision === undefined) {
      return NextResponse.json({ error: "digest_id, campaign_id, decision required" }, { status: 400 });
    }

    const validDecisions = ["Acted", "Overriding", "Monitoring"];
    if (!validDecisions.includes(decision)) {
      return NextResponse.json({ error: "Invalid decision value" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("digest_decision_captures")
      .insert({
        digest_id,
        campaign_id,
        recommendation_index: recommendation_index ?? 0,
        recommendation_action: recommendation_action ?? "",
        decision,
        decision_note: decision_note ?? "",
      })
      .select("id, decision, captured_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
