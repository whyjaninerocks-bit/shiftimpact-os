// app/api/cultural-signals/[id]/route.ts
// GET   /api/cultural-signals/[id]  — fetch single signal
// PATCH /api/cultural-signals/[id]  — update (Part 2 brand-fit assessment + status)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
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
