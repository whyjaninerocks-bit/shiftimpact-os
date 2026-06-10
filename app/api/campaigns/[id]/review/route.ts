import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PHASES = ["Demand", "Conversion", "Retention", "Complete"] as const;
const GATE_SIGNAL_STATUSES = ["Pending", "On Track", "At Risk", "Blocked"] as const;

// The 5 fields a Claude weekly review is allowed to write — see the
// "Weekly Scheduled Review" OS Rule. Every other campaign field is
// human-owned and must never be touched by this endpoint.
const OWNED_FIELDS = [
  "current_phase",
  "confidence_score",
  "gate_signal_status",
  "operating_notes",
  "last_review_date",
] as const;

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

  const unknownFields = Object.keys(body).filter(
    (key) => !OWNED_FIELDS.includes(key as (typeof OWNED_FIELDS)[number]),
  );
  if (unknownFields.length > 0) {
    return badRequest(
      `Field(s) not writable by the scheduled review: ${unknownFields.join(", ")}.`,
    );
  }

  const update: Record<string, unknown> = {};

  if ("current_phase" in body) {
    if (!PHASES.includes(body.current_phase as (typeof PHASES)[number])) {
      return badRequest(`current_phase must be one of: ${PHASES.join(", ")}.`);
    }
    update.current_phase = body.current_phase;
  }

  if ("confidence_score" in body) {
    const score = body.confidence_score;
    if (typeof score !== "number" || Number.isNaN(score) || score < 0 || score > 100) {
      return badRequest("confidence_score must be a number between 0 and 100.");
    }
    update.confidence_score = score;
  }

  if ("gate_signal_status" in body) {
    if (!GATE_SIGNAL_STATUSES.includes(body.gate_signal_status as (typeof GATE_SIGNAL_STATUSES)[number])) {
      return badRequest(`gate_signal_status must be one of: ${GATE_SIGNAL_STATUSES.join(", ")}.`);
    }
    update.gate_signal_status = body.gate_signal_status;
  }

  if ("operating_notes" in body) {
    if (typeof body.operating_notes !== "string") {
      return badRequest("operating_notes must be a string.");
    }
    update.operating_notes = body.operating_notes;
  }

  if ("last_review_date" in body) {
    const date = body.last_review_date;
    if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
      return badRequest("last_review_date must be a valid date string.");
    }
    update.last_review_date = date;
  }

  if (Object.keys(update).length === 0) {
    return badRequest(`Provide at least one of: ${OWNED_FIELDS.join(", ")}.`);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .update(update)
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
