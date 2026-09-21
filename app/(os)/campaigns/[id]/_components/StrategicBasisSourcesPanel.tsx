"use client";

// Signal-to-Creative Citation v0.1 — Stage 4A build, Stage 4A.1 copy pass,
// Stage 4A.2 UX fix (campaign-aware grouped OS Cultural Radar signal picker
// — see lib/cultural-signal-picker.ts — replacing the flat dropdown; also
// fixed a red production Server Components render error caused by passing
// `undefined` as an object property value into the addStrategicBasisSource
// Server Action call, see the source_title comment in AddSourceForm below).
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

import { useMemo, useState } from "react";
import {
  addStrategicBasisSource,
  removeStrategicBasisSource,
  markStrategicBasisNotApplicable,
  type AddStrategicBasisSourceInput,
} from "@/lib/actions";
import type { StrategicBasisSource, StrategicBasisTargetType, StrategicBasisSourceType } from "@/lib/types";
import type { CulturalSignalPickerRow } from "@/lib/data";
import {
  groupSignals,
  signalMatchesSearch,
  displayMarket,
  displayDurabilityStatus,
  summarizeSignalQuality,
  SIGNAL_GROUP_LABELS,
  SIGNAL_GROUP_ORDER,
  type CampaignSignalContext,
} from "@/lib/cultural-signal-picker";
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

// ─── Campaign-aware grouped Cultural Radar signal picker — Stage 4A.2 ──────
// Replaces the flat, unscoped dropdown. Deterministic grouping only (see
// lib/cultural-signal-picker.ts) — no AI ranking, no scoring, no
// auto-selection. "Other available signals" is never hidden; search filters
// within groups, it never removes a group from the list.

// Cultural Signal Quality Lens — Layer 2 v0.1. Lightweight, single-chip read
// of signal completeness — not the full 8-item checklist (that lives on the
// signal detail page). Never blocks selection; a "Thin context" signal can
// still be picked, this is guidance only.
const QUALITY_BADGE_CLASS: Record<"strong" | "partial" | "thin", string> = {
  strong: "bg-emerald-50 text-emerald-700",
  partial: "bg-amber-50 text-amber-700",
  thin: "bg-neutral-100 text-neutral-500",
};

function SignalChips({ signal }: { signal: CulturalSignalPickerRow }) {
  // durability_status is the primary read when set — surfaced first and
  // most prominently. is_trending stays as the legacy/supporting movement
  // flag alongside it, unchanged.
  const durabilityLabel = displayDurabilityStatus(signal.durability_status);
  const quality = summarizeSignalQuality(signal);
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${QUALITY_BADGE_CLASS[quality.tier]}`}>
        {quality.label}
      </span>
      {durabilityLabel && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
          {durabilityLabel}
        </span>
      )}
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
        {displayMarket(signal.geographic_scope)}
      </span>
      {signal.relevant_industries && signal.relevant_industries.length > 0 && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
          {signal.relevant_industries.join(", ")}
        </span>
      )}
      {signal.signal_type && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 capitalize">
          {signal.signal_type}
        </span>
      )}
      {signal.is_trending && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
          Currently trending
        </span>
      )}
      {signal.brand_fit_status && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 capitalize">
          Brand fit: {signal.brand_fit_status}
        </span>
      )}
    </div>
  );
}

function CulturalSignalPicker({
  signals,
  campaignSignalContext,
  selectedId,
  onSelect,
}: {
  signals: CulturalSignalPickerRow[];
  campaignSignalContext?: CampaignSignalContext;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const context: CampaignSignalContext = campaignSignalContext ?? { industryCategory: null, market: null };
  const filtered = useMemo(() => signals.filter((s) => signalMatchesSearch(s, search)), [signals, search]);
  const grouped = useMemo(() => groupSignals(filtered, context), [filtered, context]);

  return (
    <div>
      <label className={labelClass}>Cultural Radar signal</label>
      <input
        className={`${inputClass} mb-2`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        placeholder="Search by title, category, market or signal type…"
      />
      <div className="border border-neutral-200 rounded-md max-h-64 overflow-y-auto divide-y divide-neutral-100">
        {SIGNAL_GROUP_ORDER.map((groupKey) => {
          const rows = grouped[groupKey];
          if (rows.length === 0) return null;
          const { title, helper } = SIGNAL_GROUP_LABELS[groupKey];
          return (
            <div key={groupKey}>
              <div className="px-2.5 pt-2 pb-1 bg-neutral-50 sticky top-0">
                <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">{title}</p>
                <p className="text-[10px] text-neutral-400">{helper}</p>
              </div>
              {rows.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={`w-full text-left px-2.5 py-2 hover:bg-neutral-50 ${
                    selectedId === s.id ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="text-xs font-medium text-neutral-800">{s.signal_name}</span>
                  <SignalChips signal={s} />
                </button>
              ))}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-400 px-2.5 py-3">No signals match this search.</p>
        )}
      </div>
      <p className="text-[10px] text-neutral-400 mt-1">
        The signal&apos;s current name is saved as the citation label. You can still open the current signal later.
      </p>
    </div>
  );
}

function AddSourceForm({
  campaignId,
  targetType,
  targetId,
  culturalSignals,
  campaignSignalContext,
  defaultSourceType,
  onAdded,
  onCancel,
}: {
  campaignId: string;
  targetType: StrategicBasisTargetType;
  targetId: string;
  culturalSignals: CulturalSignalPickerRow[];
  campaignSignalContext?: CampaignSignalContext;
  defaultSourceType: AddableSourceType;
  onAdded: (row: StrategicBasisSource) => void;
  onCancel: () => void;
}) {
  const [sourceType, setSourceType] = useState<AddableSourceType>(defaultSourceType);
  // Deliberately starts unselected — the grouped picker (Stage 4A.2) never
  // auto-selects a signal, even the first one in a group. The strategist
  // must actively choose.
  const [signalId, setSignalId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOsSignal = sourceType === "os_cultural_radar_signal";
  // Client-side gate mirroring the server's own requirement (lib/actions.ts
  // addStrategicBasisSource: "Source title is required." for every
  // non-OS-signal type). This is what previously let an empty-title manual
  // source reach the server action at all — the Save button's `required`
  // attribute is never enforced because this is a type="button" click
  // handler, not a real form submit (see the "Deliberately a <div>, not a
  // <form>" comment below).
  const canSubmit = isOsSignal ? !!signalId : title.trim().length > 0;

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
    // Known, anticipated validation cases are checked here, client-side,
    // before the server action is ever called — this is the only way to
    // show a specific, useful message instead of Next.js's generic
    // production Server Action error text. Next.js redacts the .message of
    // ANY thrown Error from a Server Action in production builds (not just
    // unexpected ones — this applies uniformly, including the server's own
    // deliberate `throw new Error("Source title is required.")` etc.), so
    // once a call reaches the server, a real failure there can only ever
    // surface client-side as that same generic, undifferentiated text.
    if (isOsSignal && !signalId) {
      setError("Select a Cultural Radar signal to link.");
      return;
    }
    if (!isOsSignal && !title.trim()) {
      setError("Please add a title before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input: AddStrategicBasisSourceInput = {
        campaign_id: campaignId,
        target_type: targetType,
        target_id: targetId,
        source_type: sourceType,
        cultural_signal_id: isOsSignal ? signalId : null,
        // Never pass `undefined` as an object property value into a Server
        // Action call — this is exactly what was causing the red production
        // Server Components render error (see file header / Stage 4A.2
        // fix note below). The server already re-derives the title for OS
        // signal rows (see addStrategicBasisSource), so "" is a safe,
        // fully-serializable placeholder that's never actually used.
        source_title: isOsSignal ? "" : title.trim(),
        source_note: note.trim() || null,
        source_url: url.trim() || null,
      };
      const inserted = await addStrategicBasisSource(input);
      onAdded(inserted);
    } catch (err) {
      // A thrown Error from a Server Action is redacted to this generic
      // "Server Components render" / digest text by Next.js in production
      // builds, regardless of what actually failed server-side (auth,
      // validation, or a real DB error) — there is no way to recover the
      // real reason client-side. Showing that raw text to a strategist is
      // more alarming than useful, so it's replaced with a plain retry
      // prompt; anything else (a message we don't recognize as the
      // Next.js redaction shape) is shown as-is, in case a future,
      // non-redacted error path adds a genuinely specific message.
      const rawMessage = err instanceof Error ? err.message : "";
      const isRedactedProductionError =
        !rawMessage || rawMessage.includes("Server Components render") || rawMessage.includes("digest");
      setError(isRedactedProductionError ? "Could not save source. Please try again." : rawMessage);
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
          onChange={(e) => {
            // A stale error from a previous failed attempt (e.g. "Please
            // add a title before saving" while on a manual-note type)
            // should never linger onto a different source type — clear it
            // whenever the strategist changes what they're trying to save.
            setSourceType(e.target.value as AddableSourceType);
            setError(null);
          }}
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
          <CulturalSignalPicker
            signals={culturalSignals}
            campaignSignalContext={campaignSignalContext}
            selectedId={signalId}
            onSelect={(id) => {
              setSignalId(id);
              setError(null);
            }}
          />
        )
      ) : (
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
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
          disabled={saving || (isOsSignal && culturalSignals.length === 0) || !canSubmit}
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
  campaignSignalContext,
  synthesisSlot,
}: {
  campaignId: string;
  targetType: StrategicBasisTargetType;
  targetId: string;
  initialSources: StrategicBasisSource[];
  culturalSignals: CulturalSignalPickerRow[];
  // Campaign-aware grouping context for the OS Cultural Radar signal picker
  // — Stage 4A.2. Optional/undefined degrades gracefully (picker still
  // works, everything just falls into "broader market" / "other").
  campaignSignalContext?: CampaignSignalContext;
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
          campaignSignalContext={campaignSignalContext}
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
