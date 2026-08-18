// app/api/stage-brief-autodraft/promote/route.ts
// Sprint 8 — Promote an autodraft to a real Stage Brief
//
// POST /api/stage-brief-autodraft/promote
// Body: { autodraft_id: string }
//
// Copies the autodraft fields into stage_briefs (status: Draft),
// then marks the autodraft as promoted.

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
    const { autodraft_id } = await req.json();
    if (!autodraft_id) {
      return NextResponse.json({ error: "autodraft_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch the autodraft
    const { data: draft, error: fetchErr } = await supabase
      .from("stage_brief_autodrafts")
      .select("*")
      .eq("id", autodraft_id)
      .maybeSingle();

    if (fetchErr || !draft) {
      return NextResponse.json({ error: "Autodraft not found" }, { status: 404 });
    }
    if (draft.promoted) {
      return NextResponse.json({ error: "Already promoted" }, { status: 400 });
    }

    // Insert into stage_briefs
    const { data: stageBrief, error: insertErr } = await supabase
      .from("stage_briefs")
      .insert({
        campaign_id:     draft.campaign_id,
        stage_name:      draft.stage_name,
        stage_objective: draft.stage_objective,
        channel:         draft.channel,
        idea_led:        draft.idea_led,
        department:      draft.department ?? "Media",
        status:          "Draft",
      })
      .select("id, stage_name, channel, status")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Mark autodraft as promoted
    await supabase
      .from("stage_brief_autodrafts")
      .update({ promoted: true, promoted_at: new Date().toISOString() })
      .eq("id", autodraft_id);

    return NextResponse.json({ stage_brief: stageBrief, promoted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
