// app/api/cultural-signals/[id]/route.ts
// GET   /api/cultural-signals/[id]  — fetch single signal
// PATCH /api/cultural-signals/[id]  — update (Part 2 brand-fit assessment + status)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidDurabilityStatus, suggestReassessDate } from "@/lib/cultural-signal-picker";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cultural_signals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ signal: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await req.json();

  // Allowed updatable fields
  const allowed = [
    "signal_name", "signal_type", "source_description", "evidence",
    "is_trending", "geographic_scope",
    "why_it_matters", "brand_fit_notes", "brand_fit_status", "community_respect_check",
    "status",
    "durability_status",
    "durability_reassess_at",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  // durability_status — Stage 4B — strategist-set only, app-level validation
  // (no DB CHECK). Blank/empty string clears it back to NULL (explicitly
  // supported — this is how a strategist "un-sets" it); a non-blank value
  // must be one of the five approved values or the request is rejected.
  const reassessExplicitlyProvided = "durability_reassess_at" in patch;
  if ("durability_status" in patch) {
    const raw = patch.durability_status;
    if (raw === null || raw === "" || (typeof raw === "string" && raw.trim() === "")) {
      patch.durability_status = null;
      // Clearing the classification clears its reassessment date too,
      // unless the caller explicitly set one in the same request.
      if (!reassessExplicitlyProvided) patch.durability_reassess_at = null;
    } else if (typeof raw !== "string" || !isValidDurabilityStatus(raw.trim())) {
      return NextResponse.json({ error: `Invalid durability_status: ${String(raw)}` }, { status: 400 });
    } else {
      patch.durability_status = raw.trim();
      // Stage 4B follow-up — "longer term durability reassess": when the
      // caller doesn't explicitly send a reassess date (e.g. the simple
      // create-time dropdown on /cultural-radar/new), propose one
      // server-side based on the value, so every classified signal gets a
      // reassessment horizon without extra UI. DurabilityStatusForm on the
      // detail page always sends an explicit value (the strategist's own
      // edit or their accepted suggestion), which takes precedence here.
      if (!reassessExplicitlyProvided) {
        patch.durability_reassess_at = suggestReassessDate(patch.durability_status as string);
      }
    }
  }

  // durability_reassess_at — plain date validation only (YYYY-MM-DD or
  // null/blank to clear). The suggested default is computed client-side
  // (DurabilityStatusForm) or server-side above; either way this field is
  // never silently recomputed once the caller has sent an explicit value.
  if (reassessExplicitlyProvided) {
    const raw = patch.durability_reassess_at;
    if (raw === null || raw === "" || (typeof raw === "string" && raw.trim() === "")) {
      patch.durability_reassess_at = null;
    } else if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
      return NextResponse.json({ error: `Invalid durability_reassess_at: ${String(raw)}` }, { status: 400 });
    } else {
      patch.durability_reassess_at = raw.trim();
    }
  }

  // Auto-advance status when brand fit is completed
  if (
    patch.brand_fit_status &&
    patch.brand_fit_status !== "pending" &&
    !patch.status
  ) {
    patch.status = "assessed";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cultural_signals")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signal: data });
}
