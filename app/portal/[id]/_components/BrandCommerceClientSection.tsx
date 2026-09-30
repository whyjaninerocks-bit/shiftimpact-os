import type { BrandCommerceDiagnosticClientSafe } from "@/lib/data";
import { SectionHeading } from "./reportUi";
import { Card } from "@/app/_components/ui";

// ─── Brand-Commerce — client-facing (Phase 3) ────────────────────────────────
// ACCESS RULES: this component receives ONLY the already-shaped
// BrandCommerceDiagnosticClientSafe payload from getBrandCommerceDiagnosticClientSafe
// (lib/data.ts) — it has no access to the full brand_commerce_diagnostic row,
// no prospect audit content, no competitor reasoning, no raw evidence. It is
// a pure decision-first render: current read -> what this means -> what we
// recommend -> the test -> what we need from you -> what would prove/challenge
// it -> validation -> what we learned -> what happens next. Sections with no
// content are omitted entirely, never shown empty. Render only in the
// default/brand portal view — never in AgencyPortalView (that stays a
// separate, later decision per the Phase 3 architecture review).

const VALIDATION_COPY: Record<
  string,
  { label: string; description: string }
> = {
  not_tested: {
    label: "Not tested",
    description: "Evidence has not yet resolved this hypothesis.",
  },
  supported: {
    label: "Supported",
    description: "Available test evidence supports the reviewed hypothesis.",
  },
  partially_supported: {
    label: "Partially supported",
    description: "Some elements were supported while others remain unresolved or challenged.",
  },
  not_supported: {
    label: "Not supported",
    description: "The available test evidence did not support the reviewed hypothesis.",
  },
  inconclusive: {
    label: "Inconclusive",
    description: "The available evidence was insufficient or conflicting.",
  },
};

function Block({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">{label}</p>
      <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export function BrandCommerceClientSection({
  diagnostic,
}: {
  diagnostic: BrandCommerceDiagnosticClientSafe;
}) {
  if (!diagnostic) return null;

  const { classification_label, decision_implication, intervention, test, validation, reviewed_at } = diagnostic;
  const validationCopy = validation?.status ? VALIDATION_COPY[validation.status] : null;

  return (
    <section id="brand-commerce" className="space-y-3 scroll-mt-20">
      <SectionHeading title="Brand-Commerce" subtitle="A reviewed read on how this campaign is moving commerce" />
      <Card className="space-y-5">
        {classification_label && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Current read</p>
            <p className="text-sm font-semibold text-neutral-900">{classification_label}</p>
          </div>
        )}

        <Block label="What this means" text={decision_implication} />
        <Block label="What we recommend" text={intervention} />

        {test && (
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">The test</p>
            <Block label="Hypothesis" text={test.hypothesis} />
            <Block label="The test" text={test.plan} />
            <Block label="What we need from you" text={test.evidence_required} />
            <Block label="What would support this" text={test.success_signal} />
            <Block label="What would challenge this" text={test.failure_signal} />
            <Block label="Decision rule" text={test.decision_rule} />
          </div>
        )}

        {(validationCopy || validation?.outcome_summary || validation?.next_decision) && (
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            {validationCopy && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Validation</p>
                <p className="text-sm font-semibold text-neutral-900">{validationCopy.label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{validationCopy.description}</p>
              </div>
            )}
            <Block label="What we learned" text={validation?.outcome_summary ?? null} />
            <Block label="What happens next" text={validation?.next_decision ?? null} />
          </div>
        )}

        <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-100" suppressHydrationWarning>
          Reviewed {new Date(reviewed_at).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </Card>
    </section>
  );
}
