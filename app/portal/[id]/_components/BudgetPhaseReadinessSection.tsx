import type { GateSignalStatus } from "@/lib/types";
import { SectionHeading } from "./reportUi";

// ─── Budget & Phase Readiness — client-facing ────────────────────────────────
// Answers "should we fund what's next," not "how is weekly spend tracking."
// Strategic readiness (this section) is built from data already client-safe
// elsewhere in the portal: frame_briefs.budget_total (the committed
// investment), gate_signal_status, and the next phase_gates milestone.
// Deliberately does NOT show weekly spend, overspend, or budget_allocation_pct
// per channel — that operational detail stays with the strategist. Janine
// confirmed this split: budget *readiness* is a critical client-facing
// signal, weekly spend tracking is not.

const READINESS_COPY: Record<GateSignalStatus, { verdict: string; tone: string; line: string }> = {
  "On Track": {
    verdict: "Ready to fund what's next",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    line: "Signal health and gate status support moving budget into the next phase.",
  },
  "At Risk": {
    verdict: "Hold before committing more budget",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
    line: "Some signals are not yet where they need to be — we're watching before recommending more spend.",
  },
  Blocked: {
    verdict: "Do not fund the next phase yet",
    tone: "bg-red-50 text-red-800 border-red-200",
    line: "A guardrail or gate condition has not been met — see Guardrails and Campaign milestones below.",
  },
  Pending: {
    verdict: "Readiness not yet assessed",
    tone: "bg-neutral-100 text-neutral-600 border-neutral-200",
    line: "We haven't logged enough signal data yet to make a funding call.",
  },
};

export function BudgetPhaseReadinessSection({
  budgetTotal,
  gateSignalStatus,
  nextGateType,
}: {
  budgetTotal: number | null;
  gateSignalStatus: GateSignalStatus;
  nextGateType: string | null;
}) {
  if (budgetTotal == null) return null;

  const readiness = READINESS_COPY[gateSignalStatus];

  return (
    <section className="space-y-3">
      <SectionHeading title="Budget &amp; phase readiness" subtitle="Whether the case to invest in what's next is holding" />
      <div className="rounded-2xl bg-neutral-900 text-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Total campaign investment
        </p>
        <p className="text-3xl font-black mt-1">{budgetTotal.toLocaleString()}</p>
        {nextGateType && (
          <p className="text-xs text-neutral-400 mt-1.5">Next milestone: {nextGateType}</p>
        )}
      </div>
      <div className={`px-4 py-3 rounded-xl border text-xs leading-relaxed ${readiness.tone}`}>
        <span className="font-semibold">{readiness.verdict}.</span> {readiness.line}
      </div>
      <p className="text-[10px] text-neutral-400">
        This reflects the strategic case to fund the next phase, not week-to-week spend — weekly
        budget tracking stays with your strategist.
      </p>
    </section>
  );
}
