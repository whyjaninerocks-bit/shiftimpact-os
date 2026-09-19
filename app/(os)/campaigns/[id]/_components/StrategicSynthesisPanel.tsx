"use client";

// Strategic Synthesis v0.1 — Stage 4C.2 build.
// Optional, user-triggered, strategist-reviewed assistive drafting. NOT a
// standing mode (unlike Elevation Mode / IQ Evaluate) — one click generates
// one run; nothing regenerates automatically and nothing here is ever a
// direct write to frame_briefs or big_idea_platforms.
//
// "Apply" on a step does two things, both client-side/bookkeeping-only:
//   1. Finds the matching field by its `name` attribute in the nearest
//      ancestor <form> (the FRAME Brief / BIP page's own uncontrolled,
//      defaultValue-based form) and pre-fills its value.
//   2. Calls applyStrategicSynthesisStep() to record that the strategist
//      applied it — pure bookkeeping, never a write to the brief itself.
// The strategist still has to click the existing Save FRAME Brief / Save
// BIP Draft button for anything to actually persist. If the field can't be
// found in the DOM, nothing is recorded as applied — this panel never
// claims an apply happened that didn't.
//
// The trigger button renders inside StrategicBasisSourcesPanel's own box
// (passed in via its synthesisSlot prop) — the slide-over itself is a fixed
// overlay so it can render at the top of the DOM regardless.
//
// Step protection states rendered here (see lib/strategic-synthesis.ts
// StepProtection): "always" apply-able steps show a plain Apply button;
// "read_only" steps show a Context-only badge and no button; "empty_only"
// steps (already-committed measurement fields) show a comparison against
// the current value with no Apply button once filled; "enum" steps hide
// Apply if the draft didn't match an allowed structured value; and
// "confirm_overwrite" steps (BIP enemy_villain) require an explicit second
// click before overriding an existing value — never a silent one-click
// overwrite.

import { useRef, useState } from "react";
import {
  reviewStrategicSynthesisRun,
  applyStrategicSynthesisStep,
  rejectStrategicSynthesisRun,
} from "@/lib/actions";
import type {
  StrategicBasisTargetType,
  StrategicSynthesisRun,
  SynthesisEvidenceQuality,
  SynthesisStep,
} from "@/lib/types";
import { buttonClass, inputClass } from "@/app/_components/ui";

const TARGET_COPY: Record<
  StrategicBasisTargetType,
  { triggerLabel: string; panelTitle: string; generateLabel: string; emptyState: string }
> = {
  frame_brief: {
    triggerLabel: "Draft with Strategic Synthesis",
    panelTitle: "Marketing Brief Synthesis",
    generateLabel: "Generate brief draft",
    emptyState: "No synthesis runs yet for this brief.",
  },
  big_idea_platform: {
    triggerLabel: "Draft with Strategic Synthesis",
    panelTitle: "Creative Strategy Synthesis",
    generateLabel: "Generate creative draft",
    emptyState: "No synthesis runs yet for this creative brief.",
  },
};

const EVIDENCE_TONE: Record<SynthesisEvidenceQuality, string> = {
  direct_evidence: "bg-emerald-100 text-emerald-700",
  inference: "bg-amber-100 text-amber-700",
  insufficient_evidence: "bg-neutral-200 text-neutral-600",
};

const EVIDENCE_LABEL: Record<SynthesisEvidenceQuality, string> = {
  direct_evidence: "Direct evidence",
  inference: "Inference",
  insufficient_evidence: "Insufficient evidence",
};

function StepCard({
  step,
  formRef,
  onApplied,
}: {
  step: SynthesisStep;
  formRef: React.RefObject<HTMLDivElement | null>;
  onApplied: (stepKey: string) => void;
}) {
  const [applying, setApplying] = useState(false);
  const [confirmingOverride, setConfirmingOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      const form = formRef.current?.closest("form");
      if (!form) throw new Error("Could not find the brief form on this page.");
      const el = form.elements.namedItem(step.target_field as string) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;
      if (!el) throw new Error(`Could not find the "${step.label}" field on this page.`);

      el.value = step.draft_text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      // Only record the apply once the DOM pre-fill genuinely happened —
      // never claim applied if it didn't.
      onApplied(step.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply this draft.");
    } finally {
      setApplying(false);
      setConfirmingOverride(false);
    }
  }

  // A step is read-only in the UI sense either because it's context-only
  // (no target_field at all) or because a protection rule blocked it this
  // run (already-committed measurement field, or a drafted value that
  // didn't match an allowed structured option). These read differently to
  // the strategist, so they get different badges.
  const isContextOnly = step.target_field === null;
  const isBlockedByProtection = !isContextOnly && !step.applicable;
  const isBlockedByCommitment = isBlockedByProtection && step.current_value !== null;
  const isBlockedByEnumMismatch = isBlockedByProtection && step.current_value === null;

  return (
    <div className="border border-neutral-100 rounded-md p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-neutral-800">{step.label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${EVIDENCE_TONE[step.evidence_quality]}`}>
            {EVIDENCE_LABEL[step.evidence_quality]}
          </span>
          {isContextOnly && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
              Context only
            </span>
          )}
          {isBlockedByCommitment && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              Already committed
            </span>
          )}
          {isBlockedByEnumMismatch && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              Didn&apos;t match an allowed value
            </span>
          )}
          {step.overwrite_risk && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              Would override existing
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
        {step.draft_text || "(No draft — insufficient evidence to draft this step.)"}
      </p>
      {step.rationale && <p className="text-[11px] text-neutral-400 leading-relaxed">{step.rationale}</p>}
      {step.current_value && (
        <div className="bg-neutral-50 border border-neutral-100 rounded p-2">
          <p className="text-[10px] font-medium text-neutral-400 mb-0.5">Current value</p>
          <p className="text-xs text-neutral-600 whitespace-pre-wrap">{step.current_value}</p>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {step.applicable && (
        <div className="pt-1">
          {step.applied ? (
            <span className="text-[10px] font-medium text-emerald-700">Applied to field</span>
          ) : step.overwrite_risk ? (
            confirmingOverride ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-amber-700">Replace the current value shown above?</span>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  {applying ? "Applying…" : "Yes, override"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingOverride(false)}
                  disabled={applying}
                  className="text-xs text-neutral-400 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingOverride(true)}
                className="text-xs text-amber-700 hover:underline"
              >
                Apply (overrides existing)
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {applying ? "Applying…" : "Apply to field"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RunCard({
  run,
  formRef,
  onChange,
}: {
  run: StrategicSynthesisRun;
  formRef: React.RefObject<HTMLDivElement | null>;
  onChange: (updated: StrategicSynthesisRun) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyStepLocally(stepKey: string) {
    const updated: StrategicSynthesisRun = {
      ...run,
      routes: run.routes.map((r) => ({
        ...r,
        steps: r.steps.map((s) => (s.key === stepKey ? { ...s, applied: true } : s)),
      })),
      review_status: "applied",
    };
    onChange(updated);
    applyStrategicSynthesisStep(run.id, stepKey).catch(() => {
      // Bookkeeping failed server-side but the field was already pre-filled
      // client-side (the part that matters to the strategist). Surface
      // quietly rather than pretending nothing happened.
      setError("Applied to the field, but couldn't record it on the run. Your draft is still in the field.");
    });
  }

  async function handleReview() {
    setBusy(true);
    setError(null);
    try {
      await reviewStrategicSynthesisRun(run.id);
      onChange({ ...run, review_status: run.review_status === "not_reviewed" ? "reviewed" : run.review_status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark reviewed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    setError(null);
    try {
      await rejectStrategicSynthesisRun(run.id, note);
      onChange({ ...run, review_status: "rejected", rejection_note: note || null });
      setRejecting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject this run.");
    } finally {
      setBusy(false);
    }
  }

  if (run.status === "error") {
    return (
      <div className="border border-red-200 bg-red-50 rounded-md p-3">
        <p className="text-xs text-red-800">
          This run failed: {run.error_message || "Unknown error."}
        </p>
        <p className="text-[10px] text-neutral-400 mt-1">{new Date(run.created_at).toLocaleString()}</p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-neutral-400">{new Date(run.created_at).toLocaleString()}</p>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 capitalize">
          {run.review_status.replace("_", " ")}
        </span>
      </div>

      {run.routes.map((route) => (
        <div key={route.key} className="space-y-2">
          <p className="text-xs font-semibold text-neutral-600">{route.label}</p>
          {route.steps.map((step) => (
            <StepCard key={step.key} step={step} formRef={formRef} onApplied={applyStepLocally} />
          ))}
        </div>
      ))}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {run.review_status !== "rejected" && (
        <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
          {run.review_status === "not_reviewed" && (
            <button type="button" onClick={handleReview} disabled={busy} className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-50">
              Mark reviewed
            </button>
          )}
          {!rejecting ? (
            <button type="button" onClick={() => setRejecting(true)} disabled={busy} className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50">
              Reject this run
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                className={`${inputClass} text-xs py-1`}
                placeholder="Why? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
              <button type="button" onClick={handleReject} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-50">
                Confirm reject
              </button>
              <button type="button" onClick={() => setRejecting(false)} disabled={busy} className="text-xs text-neutral-400 hover:underline">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      {run.review_status === "rejected" && run.rejection_note && (
        <p className="text-[11px] text-neutral-400 italic">Rejected: {run.rejection_note}</p>
      )}
    </div>
  );
}

export function StrategicSynthesisPanel({
  campaignId,
  targetType,
  targetId,
  initialRuns,
  locked,
}: {
  campaignId: string;
  targetType: StrategicBasisTargetType;
  targetId: string;
  initialRuns: StrategicSynthesisRun[];
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState<StrategicSynthesisRun[]>(initialRuns);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const copy = TARGET_COPY[targetType];

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/strategic-synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, target_type: targetType, target_id: targetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate a draft.");
      setRuns((prev) => [data as StrategicSynthesisRun, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a draft.");
    } finally {
      setGenerating(false);
    }
  }

  function updateRun(updated: StrategicSynthesisRun) {
    setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  return (
    <div ref={anchorRef}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={locked}
        className="text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline"
      >
        {copy.triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white shadow-xl overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-800">{copy.panelTitle}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Optional, assistive drafts for review — never applied automatically.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">
                Close
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || locked}
              className={buttonClass}
            >
              {generating ? "Drafting…" : copy.generateLabel}
            </button>

            {error && <p className="text-xs text-red-600">{error}</p>}

            {runs.length === 0 && <p className="text-xs text-neutral-400">{copy.emptyState}</p>}

            <div className="space-y-3">
              {runs.map((run) => (
                <RunCard key={run.id} run={run} formRef={anchorRef} onChange={updateRun} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
