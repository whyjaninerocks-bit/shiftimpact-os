import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOwnedFieldUpdate } from "@/lib/reviewFields";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.REVIEW_API_SECRET;
  if (secret) {
    const header = request.headers.get("x-review-secret");
    if (header !== secret) return unauthorized();
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const result = validateOwnedFieldUpdate(body);
  if (!result.ok) {
    return badRequest(result.error);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update(result.update)
    .eq("id", id)
    .select("id, current_phase, confidence_score, gate_signal_status, operating_notes, last_review_date")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  return NextResponse.json({ campaign: data });
}
