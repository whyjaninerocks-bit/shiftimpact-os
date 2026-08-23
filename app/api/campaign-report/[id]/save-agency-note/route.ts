// POST /api/campaign-report/[id]/save-agency-note
// Saves the agency narrative note on a campaign report.
// Agency writes this note before releasing the report to the brand client.
// The note appears as a highlighted callout in the brand client portal view.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let note: string;
  try {
    const body = await req.json();
    note = typeof body.note === "string" ? body.note : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("campaign_reports")
    .update({ agency_note: note.trim() || null })
    .eq("id", id);

  if (error) {
    console.error("[save-agency-note] Supabase error:", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
