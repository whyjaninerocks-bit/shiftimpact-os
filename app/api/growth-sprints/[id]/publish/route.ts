// app/api/growth-sprints/[id]/publish/route.ts
// Growth Sprint Experience v1 — INTERNAL ONLY
//
// POST /api/growth-sprints/[id]/publish
// Creates a growth_sprint_shares row with a hashed token. The plaintext
// token is returned exactly once in this response and is never stored
// anywhere — if it's lost, revoke and publish again for a new one.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateShareToken, hashShareToken } from "@/lib/growth-sprint/share-token";
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
    const body = await req.json().catch(() => ({}));
    const expires_at = typeof body?.expires_at === "string" ? body.expires_at : null;

    const supabase = createAdminClient();

    const { data: sprint, error: fetchErr } = await supabase
      .from("growth_sprints")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchErr || !sprint) {
      return NextResponse.json({ error: "Growth sprint not found" }, { status: 404 });
    }
    if (sprint.status !== "approved") {
      return NextResponse.json({ error: `Cannot publish from status "${sprint.status}" — must be approved first` }, { status: 400 });
    }

    const token = generateShareToken();
    const token_hash = hashShareToken(token);

    const { error: shareErr } = await supabase
      .from("growth_sprint_shares")
      .insert({
        growth_sprint_id: id,
        token_hash,
        expires_at,
      });

    if (shareErr) {
      console.error("Failed to create share token:", shareErr);
      return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("growth_sprints")
      .update({ status: "published", published_at: now, updated_at: now })
      .eq("id", id);

    if (updateErr) {
      console.error("Failed to mark growth sprint published:", updateErr);
      return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
    }

    return NextResponse.json({
      status: "published",
      published_at: now,
      share_token: token, // plaintext — shown once, caller must copy it now
      share_path: `/growth-sprint/share/${token}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints/[id]/publish error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
