"use client";
// Stage 4B — durability_status editor, extended Stage 4B follow-up with a
// guided picker + reassessment date. Strategist-set only, never
// auto-computed (same human-driven principle as BrandFitForm.tsx's brand
// fit assessment, but a separate concern: this is about the signal's own
// nature — rooted vs. emerging vs. trending vs. uncertain — not about fit
// with the brand). Lives in Part 1 ("Read the culture") rather than inside
// BrandFitForm's Part 2, and can be set, changed, or cleared at any time.
//
// Guided picker: a 4-question decision tree that SUGGESTS a value — it never
// picks for the strategist. The tree mirrors the "durability" definition
// worked out with Janine: evidence confidence, then repetition/history, then
// current momentum, then rootedness. First disqualifying answer wins. The
// strategist can ignore the suggestion entirely and use the plain dropdown.
//
// Reassess date: proposed automatically from DURABILITY_REASSESS_DEFAULT_DAYS
// whenever the strategist changes durability_status (short horizon for
// trending/needs_validation, longer for emerging, longest for rooted) — but
// it's an editable date input, never locked. An overdue date is flagged in
// red so a signal that was classified a while ago doesn't just sit there.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DURABILITY_STATUS_OPTIONS,
  suggestReassessDate,
  isReassessOverdue,
  type DurabilityStatus,
} from "@/lib/cultural-signal-picker";
import { labelClass, inputClass, buttonSecondaryClass } from "@/app/_components/ui";

type QuizStep = 0 | 1 | 2 | 3 | 4; // 4 = done

const QUESTIONS: { prompt: string; yes: string; no: string }[] = [
  {
    prompt: "Would you be comfortable citing this in a client deck exactly as it is now?",
    yes: "Yes, the evidence holds up",
    no: "No, it's thin or single-source",
  },
  {
    prompt: "Have you seen this pattern repeat, or is this the first time you've noticed it?",
    yes: "Seen it repeat / has precedent",
    no: "First sighting",
  },
  {
    prompt: "Is this accelerating right now — tied to a specific platform, meme, season, or news cycle?",
    yes: "Yes, it's moving right now",
    no: "No, it's steady / ambient",
  },
  {
    prompt: "Would this still be true if the platform driving it disappeared tomorrow?",
    yes: "Yes — it's about enduring behavior, not a channel",
    no: "Not sure / probably not",
  },
];

function runQuiz(answers: boolean[]): DurabilityStatus {
  // First disqualifying answer wins — mirrors the decision tree order.
  if (answers[0] === false) return "needs_validation";
  if (answers[1] === false) return "emerging_signal";
  if (answers[2] === true) return "currently_trending";
  if (answers[3] === true) return "rooted_cultural_pattern";
  return "needs_validation";
}

export function DurabilityStatusForm({
  signalId,
  currentValue,
  currentReassessAt,
}: {
  signalId: string;
  currentValue: string | null;
  currentReassessAt: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentValue ?? "");
  const [reassessAt, setReassessAt] = useState(currentReassessAt ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quizOpen, setQuizOpen] = useState(false);
  const [step, setStep] = useState<QuizStep>(0);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const dirty = value !== (currentValue ?? "") || reassessAt !== (currentReassessAt ?? "");
  const overdue = isReassessOverdue(currentReassessAt, currentValue);

  function pickStatus(next: string) {
    setValue(next);
    setError(null);
    // Propose a reassess date for the newly picked value, but only if the
    // strategist hasn't already set a date that differs from what the
    // previous value would have suggested — simplest safe rule: always
    // re-propose on change, strategist can still edit it below before Save.
    setReassessAt(suggestReassessDate(next) ?? "");
  }

  function answerQuiz(yes: boolean) {
    const next = [...answers, yes];
    setAnswers(next);
    // Early exit the moment a disqualifying answer is given.
    if (step === 0 && !yes) { pickStatus(runQuiz(next)); setQuizOpen(false); setStep(0); setAnswers([]); return; }
    if (step === 1 && !yes) { pickStatus(runQuiz(next)); setQuizOpen(false); setStep(0); setAnswers([]); return; }
    if (step === 2 && yes)  { pickStatus(runQuiz(next)); setQuizOpen(false); setStep(0); setAnswers([]); return; }
    if (step === 3) { pickStatus(runQuiz(next)); setQuizOpen(false); setStep(0); setAnswers([]); return; }
    setStep((step + 1) as QuizStep);
  }

  function startQuiz() {
    setQuizOpen(true);
    setStep(0);
    setAnswers([]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cultural-signals/${signalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durability_status: value || null,
          durability_reassess_at: reassessAt || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Could not save durability status.");
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not save durability status.");
    } finally {
      setSaving(false);
    }
  }

  const selectedOption = DURABILITY_STATUS_OPTIONS.find((o) => o.value === value);

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={labelClass}>Durability</label>
        {overdue && (
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
            Reassess overdue
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-400 mb-1.5">
        Is this a rooted cultural pattern, an emerging signal, currently trending, or still uncertain? Strategist judgment only — never auto-computed.
      </p>

      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => pickStatus(e.target.value)}
          className={inputClass}
        >
          <option value="">Not set</option>
          {DURABILITY_STATUS_OPTIONS.map(({ value: v, label }) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        {!quizOpen && (
          <button type="button" onClick={startQuiz} className={`${buttonSecondaryClass} whitespace-nowrap text-xs`}>
            Not sure? Ask me
          </button>
        )}
      </div>
      {selectedOption && (
        <p className="text-[11px] text-neutral-400 mt-1">{selectedOption.desc}</p>
      )}

      {/* Guided 4-question picker — suggests, never decides. */}
      {quizOpen && (
        <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
            Question {step + 1} of 4
          </p>
          <p className="text-xs text-neutral-700 mb-2">{QUESTIONS[step].prompt}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => answerQuiz(true)} className="flex-1 text-xs text-left rounded-lg border border-neutral-200 bg-white px-3 py-2 hover:border-neutral-400">
              {QUESTIONS[step].yes}
            </button>
            <button type="button" onClick={() => answerQuiz(false)} className="flex-1 text-xs text-left rounded-lg border border-neutral-200 bg-white px-3 py-2 hover:border-neutral-400">
              {QUESTIONS[step].no}
            </button>
          </div>
          <button type="button" onClick={() => { setQuizOpen(false); setStep(0); setAnswers([]); }} className="text-[11px] text-neutral-400 hover:text-neutral-600 underline mt-2">
            Cancel
          </button>
        </div>
      )}

      {/* Reassess date — proposed automatically, always editable. */}
      {value && (
        <div className="mt-2">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Reassess by</label>
          <input
            type="date"
            value={reassessAt}
            onChange={(e) => { setReassessAt(e.target.value); setError(null); }}
            className={`${inputClass} mt-1`}
          />
          <p className="text-[11px] text-neutral-400 mt-1">
            Proposed automatically based on the classification — move it if you know better.
          </p>
        </div>
      )}

      {dirty && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-700 rounded-lg px-3 py-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
