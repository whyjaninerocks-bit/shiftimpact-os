// app/api/signal-movement/stage-brief/route.ts
// Creates a Stage Brief pre-filled from a Horizon 2 movement plan output.
// FRAME lock guard enforced server-side.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id, stage, channel, department, brief_body, propagation_mechanism, idea_led_vs_spend_led } = body;

    if (!campaign_id || !stage || !channel || !brief_body) {
      return NextResponse.json({ error: "campaign_id, stage, channel, and brief_body are required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // FRAME lock guard
    const { data: frame } = await supabase
      .from("frame_briefs")
      .select("lock_status")
      .eq("campaign_id", campaign_id)
      .single();

    if (!frame || frame.lock_status !== "Locked") {
      return NextResponse.json(
        { error: "FRAME Brief must be Locked before creating Stage Briefs." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("stage_briefs")
      .insert({
        campaign_id,
        stage,
        channel: channel ?? "",
        department: department || null,
        brief_body,
        propagation_mechanism: propagation_mechanism || "",
        idea_led_vs_spend_led: idea_led_vs_spend_led || null,
        status: "Draft",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data?.id, status: "Draft", created: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
