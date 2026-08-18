const PHASES = ["Demand", "Conversion", "Retention", "Complete"] as const;
const GATE_SIGNAL_STATUSES = ["Pending", "On Track", "At Risk", "Blocked"] as const;

// The 5 fields a Claude weekly review is allowed to write — see the
// "Weekly Scheduled Review" OS Rule. Every other campaign field is
// human-owned and must never be touched by a review.
export const OWNED_FIELDS = [
  "current_phase",
  "confidence_score",
  "gate_signal_status",
  "operating_notes",
  "last_review_date",
] as const;

export type OwnedFieldUpdate = Partial<{
  current_phase: (typeof PHASES)[number];
  confidence_score: number;
  gate_signal_status: (typeof GATE_SIGNAL_STATUSES)[number];
  operating_notes: string;
  last_review_date: string;
}>;

export type ValidationResult =
  | { ok: true; update: OwnedFieldUpdate }
  | { ok: false; error: string };

// Validates a raw object against the 5 owned-field rules. Used by both the
// PATCH write-back endpoint and the cron-driven Anthropic review.
export function validateOwnedFieldUpdate(body: Record<string, unknown>): ValidationResult {
  const unknownFields = Object.keys(body).filter(
    (key) => !OWNED_FIELDS.includes(key as (typeof OWNED_FIELDS)[number]),
  );
  if (unknownFields.length > 0) {
    return { ok: false, error: `Field(s) not writable by the scheduled review: ${unknownFields.join(", ")}.` };
  }

  const update: OwnedFieldUpdate = {};

  if ("current_phase" in body) {
    if (!PHASES.includes(body.current_phase as (typeof PHASES)[number])) {
      return { ok: false, error: `current_phase must be one of: ${PHASES.join(", ")}.` };
    }
    update.current_phase = body.current_phase as (typeof PHASES)[number];
  }

  if ("confidence_score" in body) {
    const score = body.confidence_score;
    if (typeof score !== "number" || Number.isNaN(score) || score < 0 || score > 100) {
      return { ok: false, error: "confidence_score must be a number between 0 and 100." };
    }
    update.confidence_score = score;
  }

  if ("gate_signal_status" in body) {
    if (!GATE_SIGNAL_STATUSES.includes(body.gate_signal_status as (typeof GATE_SIGNAL_STATUSES)[number])) {
      return { ok: false, error: `gate_signal_status must be one of: ${GATE_SIGNAL_STATUSES.join(", ")}.` };
    }
    update.gate_signal_status = body.gate_signal_status as (typeof GATE_SIGNAL_STATUSES)[number];
  }

  if ("operating_notes" in body) {
    if (typeof body.operating_notes !== "string") {
      return { ok: false, error: "operating_notes must be a string." };
    }
    update.operating_notes = body.operating_notes;
  }

  if ("last_review_date" in body) {
    const date = body.last_review_date;
    if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
      return { ok: false, error: "last_review_date must be a valid date string." };
    }
    update.last_review_date = date;
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, error: `Provide at least one of: ${OWNED_FIELDS.join(", ")}.` };
  }

  return { ok: true, update };
}
