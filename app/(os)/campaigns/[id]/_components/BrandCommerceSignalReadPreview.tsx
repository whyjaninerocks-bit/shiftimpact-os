"use client";

// BrandCommerceSignalReadPreview.tsx — Brand-Commerce Signal Read, Stage A
// (Agency Preview)
//
// INTERNAL ONLY, PREVIEW ONLY. This is not the client-facing Brand-Commerce
// Signal Read — it is a strategist-facing rehearsal of what that future
// client view would say, so wording can be checked before anything is ever
// exposed to app/portal. Never import this into app/portal or any
// external-reviewer-facing route.
//
// Data rules:
// - Renders only the latest REVIEWED brand_commerce_diagnostic (reviewed_at
//   IS NOT NULL). page.tsx picks that row out of the full diagnostics
//   array before this component ever sees it, and this component
//   defensively re-checks reviewed_at itself and never falls back to a
//   draft.
// - classification_at_diagnosis of null or not_classified renders nothing —
//   there is no read to preview yet.
// - Sources shown are only the ones attached to that same diagnostic row —
//   never pooled across diagnostics.
// - Nothing here is computed, scored, predicted, or generated. Every value
//   rendered is a direct pass-through of an existing stored field, or a
//   static lookup-table translation of one.
//
// Important handling:
// - If the diagnostic's own evidence_confidence is insufficient_evidence,
//   the normal read is withheld and an internal explanation is shown in
//   its place — never a half-confident read.
// - If classification_at_diagnosis no longer matches the campaign's live
//   Signal Map classification, an internal warning is shown so nobody
//   mistakes a stale review for a current one. The preview still renders
//   for review purposes — that warning is itself the reason this must not
//   be exposed externally yet.
// - "What to strengthen next" only ever echoes existing strategist-written
//   fields (proof_layer_notes, promotion_pressure_notes,
//   brand_meaning_risk_notes). Nothing here is inferred or generated, and
//   the block is hidden entirely when none of those fields are filled in.

import {
  BRAND_COMMERCE_CLASSIFICATION_LABELS,
  type BrandCommerceClassification,
  type BrandCommerceDiagnostic,
  type BrandCommerceDiagnosticSource,
  type SynthesisEvidenceQuality,
} from "@/lib/types";
import { Badge, Card, SectionTitle } from "@/app/_components/ui";

const CLASSIFICATION_READ_PHRASE: Record<Exclude<BrandCommerceClassification, "not_classified">, string> = {
  brand_builder: "building brand meaning",
  commerce_mover: "moving commerce",
  promo_extractor: "leaning on promotion",
  brand_risk: "creating brand risk",
  conversion_blocked: "facing conversion blockage",
  inefficient_activity: "creating activity without clear brand or commerce movement",
};

const EVIDENCE_CONFIDENCE_READ_LINE: Record<SynthesisEvidenceQuality, string> = {
  direct_evidence: "Based on what we have directly observed.",
  inference: "Based on what the evidence suggests.",
  insufficient_evidence: "Marked as insufficient evidence. See the withheld notice above.",
};

const EVIDENCE_CONFIDENCE_BADGE_LABEL: Record<SynthesisEvidenceQuality, string> = {
  direct_evidence: "Directly observed",
  inference: "Evidence suggests",
  insufficient_evidence: "Insufficient evidence",
};

export function BrandCommerceSignalReadPreview({
  diagnostic,
  sources,
  currentClassification,
}: {
  diagnostic: BrandCommerceDiagnostic | null;
  sources: BrandCommerceDiagnosticSource[];
  currentClassification: BrandCommerceClassification | null;
}) {
  // Defensive re-check even though page.tsx should only ever pass a
  // reviewed, classified diagnostic in — this component never renders a
  // draft or an unclassified read under any circumstance.
  if (!diagnostic || !diagnostic.reviewed_at) return null;
  if (!diagnostic.classification_at_diagnosis || diagnostic.classification_at_diagnosis === "not_classified") {
    return null;
  }

  const classification = diagnostic.classification_at_diagnosis;
  const readPhrase = CLASSIFICATION_READ_PHRASE[classification];
  const isWithheld = diagnostic.evidence_confidence === "insufficient_evidence";
  const hasDrifted = currentClassification !== null && currentClassification !== classification;

  const strengthenItems: { label: string; text: string }[] = [
    diagnostic.proof_layer_notes ? { label: "Proof layer", text: diagnostic.proof_layer_notes } : null,
    diagnostic.promotion_pressure_notes
      ? { label: "Promotion pressure", text: diagnostic.promotion_pressure_notes }
      : null,
    diagnostic.brand_meaning_risk_notes
      ? { label: "Brand meaning risk", text: diagnostic.brand_meaning_risk_notes }
      : null,
  ].filter((item): item is { label: string; text: string } => item !== null);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <SectionTitle id="brand-commerce-signal-read-preview">Agency Preview</SectionTitle>
        <Badge tone="purple">Brand-Commerce Signal Read</Badge>
      </div>
      <p className="text-xs text-neutral-400 mb-4">Agency preview only. Not visible in the client portal.</p>

      {hasDrifted && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">
            This reviewed diagnostic was written against {BRAND_COMMERCE_CLASSIFICATION_LABELS[classification]},
            but the current Signal Map classification is{" "}
            {BRAND_COMMERCE_CLASSIFICATION_LABELS[currentClassification as BrandCommerceClassification]}. Do not
            expose until reviewed again.
          </p>
        </div>
      )}

      {isWithheld ? (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3">
          <p className="text-sm text-neutral-700">
            Agency preview withheld because the reviewed diagnostic is marked insufficient evidence.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-neutral-800">This campaign currently reads as {readPhrase}.</p>

          <div>
            <p className="text-[10px] font-medium text-neutral-400 mb-0.5 uppercase tracking-wide">Rationale</p>
            <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {diagnostic.classification_rationale}
            </p>
          </div>

          {diagnostic.evidence_confidence && (
            <div>
              <p className="text-[10px] font-medium text-neutral-400 mb-0.5 uppercase tracking-wide">
                Evidence confidence
              </p>
              <p className="text-xs text-neutral-700">
                {EVIDENCE_CONFIDENCE_READ_LINE[diagnostic.evidence_confidence]}
              </p>
            </div>
          )}

          {sources.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-neutral-400 mb-1 uppercase tracking-wide">
                What supports this read
              </p>
              <ul className="space-y-1">
                {sources.map((source) => (
                  <li key={source.id} className="flex items-center justify-between gap-2 text-xs text-neutral-700">
                    <span>{source.source_title}</span>
                    <Badge tone="neutral" className="text-[10px] shrink-0">
                      {source.evidence_confidence
                        ? EVIDENCE_CONFIDENCE_BADGE_LABEL[source.evidence_confidence]
                        : "Not set"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {strengthenItems.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-neutral-400 mb-1 uppercase tracking-wide">
                What to strengthen next
              </p>
              <div className="space-y-1.5">
                {strengthenItems.map((item) => (
                  <p key={item.label} className="text-xs text-neutral-700 leading-relaxed">
                    <span className="font-medium text-neutral-500">{item.label}:</span> {item.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
