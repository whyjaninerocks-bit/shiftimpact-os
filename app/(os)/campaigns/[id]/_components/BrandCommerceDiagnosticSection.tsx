"use client";

// BrandCommerceDiagnosticSection.tsx — Brand-Commerce Diagnostic v0.1
//
// ACCESS: INTERNAL ONLY. Wired only into app/(os)/campaigns/[id]/page.tsx —
// never import this into app/portal/ or any external-reviewer-facing route.
//
// Append-only for v0.1: writing a new diagnostic never edits an old one —
// there is no update action. A strategist whose read has changed writes a
// new diagnostic rather than revising the existing text.
//
// classification here is always read-only — it mirrors campaign_signal_maps'
// current value, fetched by the page and passed in as a prop. This section
// never writes to campaign_signal_maps and never computes a classification;
// the "classification_at_diagnosis" shown per diagnostic is a one-time
// snapshot the server took when that diagnostic was created (see
// createBrandCommerceDiagnostic in lib/actions.ts) and can legitimately
// differ from the live value above it — that's expected, not a bug.
//
// Evidence source pickers are scoped to this campaign only: cultural signal
// options come from signals already cited somewhere on this campaign (via
// Strategic Basis Sources), strategic basis options come from
// getStrategicBasisSourcesForCampaign, and the Learning Memory option is
// this campaign's own single campaign_learning_records row, or hidden
// entirely if none exists yet. Nothing here computes a score, predicts
// performance, or references Brand Momentum — Brand Momentum is
// client-level, not campaign-level, and stays out of this section per the
// Brand Performance validation pass.

import { useState, useTransition } from "react";
import {
  createBrandCommerceDiagnostic,
  addBrandCommerceDiagnosticSource,
  removeBrandCommerceDiagnosticSource,
  markBrandCommerceDiagnosticReviewed,
} from "@/lib/actions";
import type {
  BrandCommerceClassification,
  BrandCommerceDiagnostic,
  BrandCommerceDiagnosticSource,
  BrandCommerceDiagnosticSourceType,
} from "@/lib/types";
import {
  BRAND_COMMERCE_CLASSIFICATION_LABELS,
  BRAND_COMMERCE_DIAGNOSTIC_SOURCE_TYPE_LABELS,
} from "@/lib/types";
import type { StrategicBasisSource } from "@/lib/types";
import { Badge, Card, SectionTitle, buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";

const EVIDENCE_CONFIDENCE_OPTIONS: { value: "direct_evidence" | "inference" | "insufficient_evidence"; label: string }[] = [
  { value: "direct_evidence", label: "Direct evidence" },
  { value: "inference", label: "Inference" },
  { value: "insufficient_evidence", label: "Insufficient evidence" },
];

const EVIDENCE_CONFIDENCE_LABEL: Record<string, string> = {
  direct_evidence: "Direct evidence",
  inference: "Inference",
  insufficient_evidence: "Insufficient evidence",
};

const FREE_TEXT_SOURCE_TYPES: BrandCommerceDiagnosticSourceType[] = [
  "client_supplied_context",
  "campaign_observation",
  "commerce_mechanic",
  "platform_or_category_reference",
  "strategist_note",
];

export type CulturalSignalOption = { id: string; label: string };

function SourceRow({
  source,
  onRemove,
  removing,
}: {
  source: BrandCommerceDiagnosticSource;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border border-neutral-100 rounded-md p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-neutral-800">{source.source_title}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase tracking-wide shrink-0">
            {BRAND_COMMERCE_DIAGNOSTIC_SOURCE_TYPE_LABELS[source.source_type]}
          </span>
          {source.evidence_confidence && (
            <Badge tone={source.evidence_confidence === "direct_evidence" ? "green" : source.evidence_confidence === "inference" ? "amber" : "neutral"} className="text-[10px]">
              {EVIDENCE_CONFIDENCE_LABEL[source.evidence_confidence]}
            </Badge>
          )}
        </div>
        {source.source_note && <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{source.source_note}</p>}
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block break-all"
          >
            {source.source_url}
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="shrink-0 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
        aria-label="Remove source"
      >
        Remove
      </button>
    </div>
  );
}

function AddSourceForm({
  campaignId,
  diagnosticId,
  culturalSignalOptions,
  strategicBasisOptions,
  campaignLearningRecordId,
  onAdded,
}: {
  campaignId: string;
  diagnosticId: string;
  culturalSignalOptions: CulturalSignalOption[];
  strategicBasisOptions: StrategicBasisSource[];
  campaignLearningRecordId: string | null;
  onAdded: (source: BrandCommerceDiagnosticSource) => void;
}) {
  const availableSourceTypes = (Object.keys(BRAND_COMMERCE_DIAGNOSTIC_SOURCE_TYPE_LABELS) as BrandCommerceDiagnosticSourceType[]).filter(
    (t) => t !== "learning_memory" || campaignLearningRecordId !== null
  );

  const [sourceType, setSourceType] = useState<BrandCommerceDiagnosticSourceType>(availableSourceTypes[0]);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [culturalSignalId, setCulturalSignalId] = useState("");
  const [strategicBasisSourceId, setStrategicBasisSourceId] = useState("");
  const [evidenceConfidence, setEvidenceConfidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setSourceTitle("");
    setSourceNote("");
    setSourceUrl("");
    setCulturalSignalId("");
    setStrategicBasisSourceId("");
    setEvidenceConfidence("");
  }

  function handleSubmit() {
    setError(null);

    if (sourceType === "cultural_signal" && !culturalSignalId) {
      setError("Select a cultural signal to link.");
      return;
    }
    if (sourceType === "strategic_basis" && !strategicBasisSourceId) {
      setError("Select a strategic basis source to link.");
      return;
    }
    if (sourceType === "learning_memory" && !campaignLearningRecordId) {
      setError("This campaign has no Learning Memory record to link yet.");
      return;
    }

    let title = sourceTitle.trim();
    if (sourceType === "cultural_signal") {
      title = culturalSignalOptions.find((s) => s.id === culturalSignalId)?.label ?? title;
    } else if (sourceType === "strategic_basis") {
      title = strategicBasisOptions.find((s) => s.id === strategicBasisSourceId)?.source_title ?? title;
    } else if (sourceType === "learning_memory") {
      title = title || "This campaign's Learning Memory record";
    }
    if (!title) {
      setError("Source title is required.");
      return;
    }

    startTransition(async () => {
      try {
        const inserted = await addBrandCommerceDiagnosticSource({
          diagnostic_id: diagnosticId,
          campaign_id: campaignId,
          source_type: sourceType,
          source_title: title,
          source_note: sourceNote || null,
          source_url: sourceUrl || null,
          cultural_signal_id: sourceType === "cultural_signal" ? culturalSignalId : null,
          strategic_basis_source_id: sourceType === "strategic_basis" ? strategicBasisSourceId : null,
          campaign_learning_record_id: sourceType === "learning_memory" ? campaignLearningRecordId : null,
          evidence_confidence: (evidenceConfidence || null) as "direct_evidence" | "inference" | "insufficient_evidence" | null,
        });
        onAdded(inserted);
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add source.");
      }
    });
  }

  return (
    <div className="border border-dashed border-neutral-200 rounded-md p-3 space-y-2">
      <div>
        <label className={labelClass}>Source type</label>
        <select
          className={inputClass}
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as BrandCommerceDiagnosticSourceType)}
        >
          {availableSourceTypes.map((t) => (
            <option key={t} value={t}>
              {BRAND_COMMERCE_DIAGNOSTIC_SOURCE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {sourceType === "cultural_signal" && (
        <div>
          <label className={labelClass}>Cultural signal</label>
          {culturalSignalOptions.length === 0 ? (
            <p className="text-xs text-neutral-400">
              No cultural signals are cited on this campaign yet — link one via Brief basis or Creative strategy
              basis first.
            </p>
          ) : (
            <select className={inputClass} value={culturalSignalId} onChange={(e) => setCulturalSignalId(e.target.value)}>
              <option value="">Select a signal…</option>
              {culturalSignalOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {sourceType === "strategic_basis" && (
        <div>
          <label className={labelClass}>Strategic basis source</label>
          {strategicBasisOptions.length === 0 ? (
            <p className="text-xs text-neutral-400">
              No strategic basis sources are on record for this campaign yet.
            </p>
          ) : (
            <select
              className={inputClass}
              value={strategicBasisSourceId}
              onChange={(e) => setStrategicBasisSourceId(e.target.value)}
            >
              <option value="">Select a source…</option>
              {strategicBasisOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.source_title}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {sourceType === "learning_memory" && (
        <p className="text-xs text-neutral-500">
          Links this campaign&apos;s single Learning Memory record. Add an optional note below if useful.
        </p>
      )}

      {FREE_TEXT_SOURCE_TYPES.includes(sourceType) && (
        <div>
          <label className={labelClass}>Source title</label>
          <input className={inputClass} value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} />
        </div>
      )}

      <div>
        <label className={labelClass}>Note (optional)</label>
        <textarea className={inputClass} rows={2} value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>URL (optional)</label>
        <input className={inputClass} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Evidence confidence (optional)</label>
        <select className={inputClass} value={evidenceConfidence} onChange={(e) => setEvidenceConfidence(e.target.value)}>
          <option value="">Not set</option>
          {EVIDENCE_CONFIDENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button type="button" onClick={handleSubmit} disabled={pending} className={buttonSecondaryClass}>
        {pending ? "Adding…" : "Add source"}
      </button>
    </div>
  );
}

function DiagnosticCard({
  campaignId,
  diagnostic,
  sources,
  culturalSignalOptions,
  strategicBasisOptions,
  campaignLearningRecordId,
  onSourceAdded,
  onSourceRemoved,
  onReviewed,
}: {
  campaignId: string;
  diagnostic: BrandCommerceDiagnostic;
  sources: BrandCommerceDiagnosticSource[];
  culturalSignalOptions: CulturalSignalOption[];
  strategicBasisOptions: StrategicBasisSource[];
  campaignLearningRecordId: string | null;
  onSourceAdded: (s: BrandCommerceDiagnosticSource) => void;
  onSourceRemoved: (id: string) => void;
  onReviewed: () => void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reviewPending, startReviewTransition] = useTransition();
  const [reviewError, setReviewError] = useState<string | null>(null);

  function handleRemove(sourceId: string) {
    setRemovingId(sourceId);
    removeBrandCommerceDiagnosticSource(campaignId, sourceId)
      .then(() => onSourceRemoved(sourceId))
      .catch(() => {})
      .finally(() => setRemovingId(null));
  }

  function handleMarkReviewed() {
    setReviewError(null);
    startReviewTransition(async () => {
      try {
        await markBrandCommerceDiagnosticReviewed(campaignId, diagnostic.id);
        onReviewed();
      } catch (err) {
        setReviewError(err instanceof Error ? err.message : "Could not mark reviewed.");
      }
    });
  }

  return (
    <div className="border border-neutral-200 rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase tracking-wide">
            Classification at diagnosis snapshot
          </span>
          <Badge tone="neutral">
            {diagnostic.classification_at_diagnosis
              ? BRAND_COMMERCE_CLASSIFICATION_LABELS[diagnostic.classification_at_diagnosis]
              : "Not classified at the time"}
          </Badge>
        </div>
        {/* suppressHydrationWarning: toLocaleString() can render differently on
            the server (Vercel's runtime locale/timezone) than in the visitor's
            browser. That mismatch is expected and harmless (React error #418),
            not a real bug, so it's silenced here rather than restructured. */}
        <span className="text-[10px] text-neutral-400" suppressHydrationWarning>
          {new Date(diagnostic.created_at).toLocaleString()}
        </span>
      </div>

      <div>
        <p className="text-[10px] font-medium text-neutral-400 mb-0.5">Classification rationale</p>
        <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">{diagnostic.classification_rationale}</p>
      </div>

      {diagnostic.commerce_mechanic_description && (
        <div>
          <p className="text-[10px] font-medium text-neutral-400 mb-0.5">Commerce mechanic</p>
          <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">{diagnostic.commerce_mechanic_description}</p>
        </div>
      )}
      {diagnostic.promotion_pressure_notes && (
        <div>
          <p className="text-[10px] font-medium text-neutral-400 mb-0.5">Promotion pressure notes</p>
          <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">{diagnostic.promotion_pressure_notes}</p>
        </div>
      )}
      {diagnostic.proof_layer_notes && (
        <div>
          <p className="text-[10px] font-medium text-neutral-400 mb-0.5">Proof layer notes</p>
          <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">{diagnostic.proof_layer_notes}</p>
        </div>
      )}
      {diagnostic.brand_meaning_risk_notes && (
        <div>
          <p className="text-[10px] font-medium text-neutral-400 mb-0.5">Brand meaning risk notes</p>
          <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">{diagnostic.brand_meaning_risk_notes}</p>
        </div>
      )}
      {diagnostic.evidence_confidence && (
        <Badge tone={diagnostic.evidence_confidence === "direct_evidence" ? "green" : diagnostic.evidence_confidence === "inference" ? "amber" : "neutral"} className="text-[10px]">
          {EVIDENCE_CONFIDENCE_LABEL[diagnostic.evidence_confidence]}
        </Badge>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
        {diagnostic.reviewed_at ? (
          <span className="text-xs text-emerald-700" suppressHydrationWarning>
            Reviewed {new Date(diagnostic.reviewed_at).toLocaleDateString()}
          </span>
        ) : (
          <button type="button" onClick={handleMarkReviewed} disabled={reviewPending} className={buttonSecondaryClass}>
            {reviewPending ? "Marking…" : "Mark reviewed"}
          </button>
        )}
      </div>
      {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}

      <div className="pt-2 border-t border-neutral-100 space-y-2">
        <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Evidence sources</p>
        {sources.length === 0 && <p className="text-xs text-neutral-400">No evidence sources added yet.</p>}
        {sources.map((s) => (
          <SourceRow key={s.id} source={s} onRemove={() => handleRemove(s.id)} removing={removingId === s.id} />
        ))}
        <AddSourceForm
          campaignId={campaignId}
          diagnosticId={diagnostic.id}
          culturalSignalOptions={culturalSignalOptions}
          strategicBasisOptions={strategicBasisOptions}
          campaignLearningRecordId={campaignLearningRecordId}
          onAdded={onSourceAdded}
        />
      </div>
    </div>
  );
}

export function BrandCommerceDiagnosticSection({
  campaignId,
  classification,
  initialDiagnostics,
  initialLatestSources,
  culturalSignalOptions,
  strategicBasisOptions,
  campaignLearningRecordId,
}: {
  campaignId: string;
  classification: BrandCommerceClassification | null;
  initialDiagnostics: BrandCommerceDiagnostic[];
  initialLatestSources: BrandCommerceDiagnosticSource[];
  culturalSignalOptions: CulturalSignalOption[];
  strategicBasisOptions: StrategicBasisSource[];
  campaignLearningRecordId: string | null;
}) {
  const [diagnostics, setDiagnostics] = useState<BrandCommerceDiagnostic[]>(initialDiagnostics);
  const [latestSources, setLatestSources] = useState<BrandCommerceDiagnosticSource[]>(initialLatestSources);

  const [showForm, setShowForm] = useState(false);
  const [rationale, setRationale] = useState("");
  const [commerceMechanic, setCommerceMechanic] = useState("");
  const [promotionPressure, setPromotionPressure] = useState("");
  const [proofLayer, setProofLayer] = useState("");
  const [brandMeaningRisk, setBrandMeaningRisk] = useState("");
  const [evidenceConfidence, setEvidenceConfidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const latest = diagnostics[0] ?? null;
  const earlierCount = Math.max(diagnostics.length - 1, 0);

  const classificationIsSet = classification && classification !== "not_classified";

  function handleCreate() {
    setError(null);
    if (!rationale.trim()) {
      setError("Classification rationale is required.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createBrandCommerceDiagnostic({
          campaign_id: campaignId,
          classification_rationale: rationale,
          commerce_mechanic_description: commerceMechanic || null,
          promotion_pressure_notes: promotionPressure || null,
          proof_layer_notes: proofLayer || null,
          brand_meaning_risk_notes: brandMeaningRisk || null,
          evidence_confidence: (evidenceConfidence || null) as "direct_evidence" | "inference" | "insufficient_evidence" | null,
        });
        setDiagnostics((prev) => [created, ...prev]);
        setLatestSources([]);
        setRationale("");
        setCommerceMechanic("");
        setPromotionPressure("");
        setProofLayer("");
        setBrandMeaningRisk("");
        setEvidenceConfidence("");
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create diagnostic.");
      }
    });
  }

  return (
    <Card>
      <SectionTitle id="brand-commerce-diagnostic">Brand-Commerce Diagnostic</SectionTitle>
      <p className="text-xs text-neutral-400 mb-3">
        A strategist&apos;s written read of this campaign&apos;s Brand-Commerce classification, with rationale and
        supporting evidence. Never automatically classified, never scored, never a performance prediction. INTERNAL ONLY.
      </p>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase tracking-wide">
          Current Signal Map classification
        </span>
        <Badge tone="neutral">
          {classificationIsSet && classification
            ? BRAND_COMMERCE_CLASSIFICATION_LABELS[classification]
            : "Not set"}
        </Badge>
      </div>

      {!latest && (
        <div className="border border-dashed border-neutral-200 rounded-md p-4 mb-4">
          <p className="text-xs text-neutral-500 mb-3">
            {classificationIsSet && classification
              ? `No Brand Commerce Diagnostic has been written for this campaign yet. Current classification: ${BRAND_COMMERCE_CLASSIFICATION_LABELS[classification]}, set on the Campaign Signal Map.`
              : "No Brand Commerce Diagnostic has been written for this campaign yet. This campaign's Signal Map classification has not been set yet."}
          </p>
          {!showForm && (
            <button type="button" onClick={() => setShowForm(true)} className={buttonClass}>
              Write a diagnostic.
            </button>
          )}
        </div>
      )}

      {latest && !showForm && (
        <div className="mb-3">
          <button type="button" onClick={() => setShowForm(true)} className={buttonSecondaryClass}>
            Write a diagnostic.
          </button>
        </div>
      )}

      {showForm && (
        <div className="border border-neutral-200 rounded-md p-4 space-y-2 mb-4">
          <div>
            <label className={labelClass}>Classification rationale</label>
            <textarea className={inputClass} rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Commerce mechanic description</label>
            <textarea className={inputClass} rows={2} value={commerceMechanic} onChange={(e) => setCommerceMechanic(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Promotion pressure notes</label>
            <textarea className={inputClass} rows={2} value={promotionPressure} onChange={(e) => setPromotionPressure(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Proof layer notes</label>
            <textarea className={inputClass} rows={2} value={proofLayer} onChange={(e) => setProofLayer(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Brand meaning risk notes</label>
            <textarea className={inputClass} rows={2} value={brandMeaningRisk} onChange={(e) => setBrandMeaningRisk(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Evidence confidence (optional)</label>
            <select className={inputClass} value={evidenceConfidence} onChange={(e) => setEvidenceConfidence(e.target.value)}>
              <option value="">Not set</option>
              {EVIDENCE_CONFIDENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={handleCreate} disabled={pending} className={buttonClass}>
              {pending ? "Saving…" : "Save diagnostic"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={buttonSecondaryClass}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {latest && (
        <>
          <DiagnosticCard
            campaignId={campaignId}
            diagnostic={latest}
            sources={latestSources}
            culturalSignalOptions={culturalSignalOptions}
            strategicBasisOptions={strategicBasisOptions}
            campaignLearningRecordId={campaignLearningRecordId}
            onSourceAdded={(s) => setLatestSources((prev) => [...prev, s])}
            onSourceRemoved={(id) => setLatestSources((prev) => prev.filter((s) => s.id !== id))}
            onReviewed={() =>
              setDiagnostics((prev) =>
                prev.map((d) => (d.id === latest.id ? { ...d, reviewed_at: new Date().toISOString() } : d))
              )
            }
          />
          {earlierCount > 0 && (
            <p className="text-xs text-neutral-400 mt-2">
              {earlierCount === 1 ? "1 earlier diagnostic on record." : `${earlierCount} earlier diagnostics on record.`}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
