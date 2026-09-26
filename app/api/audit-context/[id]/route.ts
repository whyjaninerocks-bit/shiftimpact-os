// app/api/audit-context/[id]/route.ts
// Internal endpoint — returns the stored request_snapshot from a past /audit
// run, so the intake form can pre-fill every field on rerun without the user
// re-typing or re-fetching anything. See migration 0103. Not exposed
// publicly beyond this app; returns only what's needed to fill the form.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quick_audits")
    .select("request_snapshot")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }

  if (!data.request_snapshot) {
    return NextResponse.json(
      { error: "This audit was generated before rerun support was added and has no stored request to reload." },
      { status: 400 }
    );
  }

  return NextResponse.json(data.request_snapshot);
}
