// app/api/growth-sprints/[id]/revoke/route.ts
// Growth Sprint Experience v1 — INTERNAL ONLY
//
// POST /api/growth-sprints/[id]/revoke
// Revokes all active share tokens for this sprint. The public report
// immediately stops resolving. Sprint returns to "approved" so it can
// be republished with a fresh token later.

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
    const now = new Date().toISOString();

    const { error: shareErr } = await supabase
      .from("growth_sprint_shares")
      .update({ revoked_at: now })
      .eq("growth_sprint_id", id)
      .is("revoked_at", null);

    if (shareErr) {
      console.error("Failed to revoke share tokens:", shareErr);
      return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("growth_sprints")
      .update({ status: "revoked", revoked_at: now, updated_at: now })
      .eq("id", id)
      .select("status, revoked_at")
      .single();

    if (updateErr || !updated) {
      console.error("Failed to mark growth sprint revoked:", updateErr);
      return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/growth-sprints/[id]/revoke error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
