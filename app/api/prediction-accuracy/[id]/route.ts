import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeVerdict } from "@/lib/prediction-verdict";

export const dynamic = "force-dynamic";

// Fields that make up "the prediction itself" — locked forever once set
// (locked_at is set at creation for every row, auto-snapshotted or manual).
// See migration 0081. The whole point of a prediction is that you can't
// quietly change it after the fact once it's been made.
const LOCKED_FIELDS = ["prediction_text", "predicted_value", "unit", "category", "prediction_week"] as const;

type CorrectionEntry = {
  at: string;
  reason: string | null;
  previous: { actual_value: number | null; verdict: string; accuracy_pct: number | null; outcome_note: string | null };
  next: { actual_value: number | null; verdict: string; accuracy_pct: number | null; outcome_note: string | null };
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();

  // Reject any attempt to edit the locked fields — this must fail loudly,
  // not silently drop the field, so a client-facing UI (or a strategist
  // scripting a bulk edit) finds out immediately rather than assuming it worked.
  const attemptedLockedEdit = LOCKED_FIELDS.filter((f) => f in body);
  if (attemptedLockedEdit.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot edit ${attemptedLockedEdit.join(", ")} — predictions are locked at creation and cannot be changed after the fact. Delete and re-log the prediction if it was a genuine data-entry mistake made before any outcome was recorded, or add a correction note instead if an outcome has already been recorded.`,
      },
      { status: 400 }
    );
  }

  // Fetch current state — needed both to compute accuracy correctly and to
  // detect whether this edit is a first-time resolution (fine, no audit
  // entry needed) or a correction to something already resolved (needs one).
  const { data: current, error: fetchErr } = await supabase
    .from("prediction_accuracy_log")
    .select("predicted_value, actual_value, verdict, accuracy_pct, outcome_note, correction_log")
    .eq("id", id)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: fetchErr?.message ?? "Prediction not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("outcome_week" in body) updates.outcome_week = body.outcome_week;

  let nextVerdict = current.verdict;
  let nextAccuracy = current.accuracy_pct;
  let nextActual = current.actual_value;
  let nextNote = current.outcome_note;

  if (body.actual_value != null) {
    nextActual = body.actual_value;
    if (current.predicted_value != null) {
      const { verdict, accuracy_pct } = computeVerdict(current.predicted_value, body.actual_value);
      nextVerdict = body.verdict ?? verdict;
      nextAccuracy = accuracy_pct;
    } else {
      // No predicted_value to compare against (e.g. a Gate/Behaviour-style
      // prediction) — trust the human-provided verdict directly.
      nextVerdict = body.verdict ?? current.verdict;
    }
    updates.actual_value = nextActual;
    updates.verdict = nextVerdict;
    updates.accuracy_pct = nextAccuracy;
  } else if ("verdict" in body) {
    // Verdict-only override with no actual_value change (e.g. correcting a
    // miscategorised Gate/Behaviour verdict).
    nextVerdict = body.verdict;
    updates.verdict = nextVerdict;
  }

  if ("outcome_note" in body) {
    nextNote = body.outcome_note;
    updates.outcome_note = nextNote;
  }

  // Was this prediction already resolved before this edit? If so, this is a
  // correction to a verdict that may already have been shown to a client —
  // append to the audit trail instead of just overwriting silently.
  const wasAlreadyResolved = current.verdict !== "Pending";
  const outcomeFieldsChanged =
    ("actual_value" in updates && updates.actual_value !== current.actual_value) ||
    ("verdict" in updates && updates.verdict !== current.verdict) ||
    ("outcome_note" in updates && updates.outcome_note !== current.outcome_note);

  if (wasAlreadyResolved && outcomeFieldsChanged) {
    const entry: CorrectionEntry = {
      at: new Date().toISOString(),
      reason: typeof body.correction_reason === "string" ? body.correction_reason : null,
      previous: {
        actual_value: current.actual_value,
        verdict: current.verdict,
        accuracy_pct: current.accuracy_pct,
        outcome_note: current.outcome_note,
      },
      next: {
        actual_value: nextActual,
        verdict: nextVerdict,
        accuracy_pct: nextAccuracy,
        outcome_note: nextNote,
      },
    };
    const existingLog = Array.isArray(current.correction_log) ? current.correction_log : [];
    updates.correction_log = [...existingLog, entry];
  }

  const { data, error } = await supabase
    .from("prediction_accuracy_log")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Deleting a Pending prediction (never shown to anyone as resolved) is fine
  // — that's the "genuine data-entry mistake" escape hatch mentioned above.
  // Deleting an already-resolved prediction is exactly the kind of thing the
  // locking model exists to prevent, so it's blocked here too.
  const { data: current } = await supabase
    .from("prediction_accuracy_log")
    .select("verdict")
    .eq("id", id)
    .maybeSingle();

  if (current && current.verdict !== "Pending") {
    return NextResponse.json(
      { error: "Cannot delete a resolved prediction — it may have already been shown to a client. This is what the correction log is for." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("prediction_accuracy_log").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
