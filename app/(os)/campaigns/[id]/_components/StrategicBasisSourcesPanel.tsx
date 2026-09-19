"use client";

// Signal-to-Creative Citation v0.1 — Stage 4A build, Stage 4A.1 copy pass.
// Reusable panel used on both the FRAME Brief page (near clarity_statement)
// and the Big Idea Platform page (near cultural_tension, but visually
// separate from it). Captures the strategic basis / supporting insight
// sources that inform that target — optional and non-blocking. Never gates
// Gate 1, BIP completeness, or locking.
//
// FRAME Brief and Big Idea Platform are NOT the same kind of brief, even
// though both are valid strategic_basis_sources targets sharing this one
// component and one table. FRAME Brief is the client/brand/marketing brief
// — the business-side objective and how success is measured. Big Idea
// Platform is the agency/creative brief — the agency's translation of that
// objective into human truth, creative territory, and proposition. The copy
// below is target-aware (TARGET_COPY) so the panel never implies the two
// are interchangeable; the data model itself stays target-agnostic on
// purpose (one table, one component — see migration 0087).
//
// Approved vocabulary only: "brief basis," "creative strategy basis,"
// "supporting input," "supporting insight," "linked signal," "external
// insight," "not selected yet," "not applicable." Never: "missing cultural
// signal," "required cultural signal," "cannot proceed," "campaign must
// select signal."

import { useState } from "react";
import {
  addStrategicBasisSource,
  removeStrategicBasisSource,
  markStrategicBasisNotApplicable,
  type AddStrategicBasisSourceInput,
} from "@/lib/actions";
import type { StrategicBasisSource, StrategicBasisTargetType, StrategicBasisSourceType } from "@/lib/types";
import type { CulturalSignalPickerRow } from "@/lib/data";
import { buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";

// Target-aware copy — see file header. Keys are StrategicBasisTargetType.
const TARGET_COPY: Record<
  StrategicBasisTargetType,
  {
    panelTitle: string;
    helper: string;
    emptyState: string;
    addInsightAction: string;
    linkSignalAction: string;
    markNaAction: string;
    notApplicableState: string;
  }
> = {
  frame_brief: {
    panelTitle: "Brief basis",
    helper: "Capture the client, brand, market or business inputs shaping this marketing brief. Optional and non-blocking.",
    emptyState: "No brief basis selected yet.",
    addInsightAction: "Add supporting input",
    linkSignalAction: "Link OS Cultural Radar signal",
    markNaAction: "Mark as not applicable for this brief",
    notApplicableState: "Not applicable for this brief",
  },
  big_idea_platform: {
    panelTitle: "Creative strategy basis",
    helper: "Capture the insight sources shaping this creative direction. Optional and non-blocking.",
    emptyState: "No creative strategy basis selected yet.",
    addInsightAction: "Add supporting insight",
    linkSignalAction: "Link OS Cultural Radar signal",
    markNaAction: "Mark as not applicable for this creative brief",
    notApplicableState: "Not applicable for this creative brief",
  },
};

type AddableSourceType = Exclude<StrategicBasisSourceType, "not_applicable">;

const SOURCE_TYPE_LABELS: Record<AddableSourceType, string> = {
  os_cultural_radar_signal: "OS Cultural Radar signal",
  agency_provided_insight: "Agency-provided insight",
  client_provided_research: "Client-provided research",
  platform_social_listening_insight: "Platform / social listening insight",
  category_market_report: "Category / market report",
  creative_team_observation: "Creative team observation",
  strategist_manual_note: "Strategist manual note",
};

const ADDABLE_SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as AddableSourceType[];

function SourceRow({
  source,
  onRemove,
  removing,
}: {
  source: StrategicBasisSource;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border border-neutral-100 rounded-md p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-neutral-800">{source.source_title}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase tracking-wide shrink-0">
            {SOURCE_TYPE_LABELS[source.source_type as AddableSourceType] ?? source.source_type}
          </span>
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
        {source.source_type === "os_cultural_radar_signal" && source.cultural_signal_id && (
          <p className="text-[10px] text-neutral-400 mt-1">
            Saved citation label — the current signal may have been updated since.{" "}
            <a href="/cultural-radar" className="text-blue-600 hover:underline">
              Open current signal →
            </a>
          </p>
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
  targetType,
  targetId,
  culturalSignals,
  defaultSourceType,
  onAdded,
  onCancel,
}: {
  campaignId: string;
  targetType: StrategicBasisTargetType;
  targetId: string;
  culturalSignals: CulturalSignalPickerRow[];
  defaultSourceType: AddableSourceType;
  onAdded: (row: StrategicBasisSource) => void;
  onCancel: () => void;
}) {
  const [sourceType, setSourceType] = useState<AddableSourceType>(defaultSourceType);
  const [signalId, setSignalId] = useState(culturalSignals[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOsSignal = sourceType === "os_cultural_radar_signal";

  // This panel renders inside the FRAME Brief / BIP page's own
  // <form action={...}>, which has a real type="submit" button elsewhere in
  // it ("Save FRAME Brief" / "Save BIP Draft"). Browsers implicitly submit
  // the nearest form on Enter inside any single-line text <input> — even an
  // unrelated, unnamed one nested deep inside — so every plain text <input>
  // in this panel must swallow Enter itself or it will silently save/redirect
  // the parent FRAME Brief / BIP instead of doing nothing (or submitting the
  // citation). <textarea> is unaffected (Enter just adds a newline there).
  function preventImplicitFormSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  // Deliberately a <div>, not a <form> — this panel is meant to sit inside
  // the FRAME Brief / BIP page's own <form action={...}> (so it can render
  // right next to clarity_statement / cultural_tension), and HTML forbids
  // nesting <form> elements. Submission is handled via a plain button click.
  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const input: AddStrategicBasisSourceInput = {
        campaign_id: campaignId,
        target_type: targetType,
        target_id: targetId,
        source_type: sourceType,
        cultural_signal_id: isOsSignal ? signalId : null,
        source_title: isOsSignal ? undefined : title.trim(),
        source_note: note.trim() || null,
        source_url: url.trim() || null,
      };
      const inserted = await addStrategicBasisSource(input);
      onAdded(inserted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this source.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-neutral-200 rounded-md p-3 space-y-2.5 bg-neutral-50">
      <div>
        <label className={labelClass}>Source type</label>
        <select
          className={inputClass}
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as AddableSourceType)}
        >
          {ADDABLE_SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SOURCE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {isOsSignal ? (
        culturalSignals.length === 0 ? (
          <p className="text-xs text-neutral-400">
            No Cultural Radar signals available yet.{" "}
            <a href="/cultural-radar" className="text-blue-600 hover:underline">
              Add one in Cultural Radar →
            </a>
          </p>
        ) : (
          <div>
            <label className={labelClass}>Cultural Radar signal</label>
            <select className={inputClass} value={signalId} onChange={(e) => setSignalId(e.target.value)}>
              {culturalSignals.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.signal_name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 mt-1">
              The signal&apos;s current name is saved as the citation label. You can still open the current signal later.
            </p>
          </div>
        )
      ) : (
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={preventImplicitFormSubmit}
            placeholder="e.g. Client Q3 brand tracker"
            required
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Note (optional)</label>
        <textarea
          className={inputClass}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What does this add to the strategy?"
        />
      </div>

      {!isOsSignal && (
        <div>
          <label className={labelClass}>Link (optional)</label>
          <input
            className={inputClass}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={preventImplicitFormSubmit}
            placeholder="https://..."
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || (isOsSignal && culturalSignals.length === 0)}
          className={buttonClass}
        >
          {saving ? "Saving…" : "Save source"}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondaryClass}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function StrategicBasisSourcesPanel({
  campaignId,
  targetType,
  targetId,
  initialSources,
  culturalSignals,
  synthesisSlot,
}: {
  campaignId: string;
  targetType: StrategicBasisTargetType;
  targetId: string;
  initialSources: StrategicBasisSource[];
  culturalSignals: CulturalSignalPickerRow[];
  // Strategic Synthesis v0.1 (Stage 4C.2) trigger — rendered here so it sits
  // inside this basis panel's own box, per approval. This component has no
  // knowledge of synthesis internals; the caller passes the fully-formed
  // <StrategicSynthesisPanel /> element.
  synthesisSlot?: React.ReactNode;
}) {
  const [sources, setSources] = useState<StrategicBasisSource[]>(initialSources);
  const [addingType, setAddingType] = useState<AddableSourceType | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [markingNa, setMarkingNa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = TARGET_COPY[targetType];

  const notApplicable = sources.find((s) => s.source_type === "not_applicable") ?? null;
  const realSources = sources.filter((s) => s.source_type !== "not_applicable");

  async function handleRemove(id: string) {
    setRemovingId(id);
    setError(null);
    try {
      await removeStrategicBasisSource(campaignId, id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this source.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleMarkNotApplicable() {
    setMarkingNa(true);
    setError(null);
    try {
      const inserted = await markStrategicBasisNotApplicable({
        campaign_id: campaignId,
        target_type: targetType,
        target_id: targetId,
      });
      setSources((prev) => [...prev, inserted]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this.");
    } finally {
      setMarkingNa(false);
    }
  }

  return (
    <div className="border border-neutral-200 rounded-md p-4 bg-white space-y-3">
      <div>
        <p className="text-sm font-semibold text-neutral-800">{copy.panelTitle}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{copy.helper}</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Empty state — zero rows, nothing marked not_applicable */}
      {sources.length === 0 && !addingType && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-400">{copy.emptyState}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={() => setAddingType("strategist_manual_note")}
            >
              {copy.addInsightAction}
            </button>
            <button
              type="button"
              className={buttonSecondaryClass}
              onClick={() => setAddingType("os_cultural_radar_signal")}
            >
              {copy.linkSignalAction}
            </button>
            <button
              type="button"
              onClick={handleMarkNotApplicable}
              disabled={markingNa}
              className="text-xs text-neutral-400 hover:text-neutral-700 underline disabled:opacity-50"
            >
              {markingNa ? "Saving…" : copy.markNaAction}
            </button>
          </div>
        </div>
      )}

      {/* Not-applicable state */}
      {notApplicable && realSources.length === 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">{copy.notApplicableState}</p>
          <button
            type="button"
            onClick={() => handleRemove(notApplicable.id)}
            disabled={removingId === notApplicable.id}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            {removingId === notApplicable.id ? "Undoing…" : "Undo"}
          </button>
        </div>
      )}

      {/* Populated state */}
      {realSources.length > 0 && (
        <div className="space-y-2">
          {realSources.map((s) => (
            <SourceRow key={s.id} source={s} onRemove={() => handleRemove(s.id)} removing={removingId === s.id} />
          ))}
          {!addingType && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setAddingType("strategist_manual_note")}
            >
              + Add another source
            </button>
          )}
        </div>
      )}

      {addingType && (
        <AddSourceForm
          campaignId={campaignId}
          targetType={targetType}
          targetId={targetId}
          culturalSignals={culturalSignals}
          defaultSourceType={addingType}
          onAdded={(row) => {
            setSources((prev) => [...prev.filter((s) => s.source_type !== "not_applicable"), row]);
            setAddingType(null);
          }}
          onCancel={() => setAddingType(null)}
        />
      )}

      {synthesisSlot && <div className="pt-2 border-t border-neutral-100">{synthesisSlot}</div>}
    </div>
  );
}
