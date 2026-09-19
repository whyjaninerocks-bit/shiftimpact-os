"use client";

import { useState } from "react";
import type { CulturalSignalRead } from "@/lib/data";
import { SectionHeading } from "./reportUi";

// ─── Creative, Culture & Commerce Intelligence — Agency-view only ───────────
// Task 5.5 Pass B. Summary first, choice second, depth third: an executive
// read of all signals up top (finding, Brand Power Check, action, risk),
// then click a signal to open its full intelligence in six bucketed tabs.
// Same CulturalSignalRead[] data as before (see getCulturalSignalReadClientSafe
// in lib/data.ts) — this is a presentation/navigation rewrite only, no field
// added, removed, or renamed. Never predictive language, no auto-scoring —
// brand_fit_status stays "pending" on every row this section can ever show.

const TYPE_TONE: Record<string, string> = {
  behavioural: "bg-blue-100 text-blue-700",
  linguistic: "bg-green-100 text-green-700",
  ritual: "bg-amber-100 text-amber-700",
  community: "bg-purple-100 text-purple-700",
};

const BRAND_POWER_PHRASES: { match: string; label: string; tone: string }[] = [
  {
    match: "builds brand meaning",
    label: "Builds brand meaning",
    tone: "bg-green-50 text-green-800 border-green-200",
  },
  {
    match: "transfers category/cultural meaning into the brand",
    label: "Transfers category/cultural meaning into the brand",
    tone: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    match: "borrows meaning without strengthening the brand",
    label: "Borrows meaning without strengthening the brand",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    match: "risks weakening brand meaning",
    label: "Risks weakening brand meaning",
    tone: "bg-red-50 text-red-800 border-red-200",
  },
];

function classifyBrandPower(text: string | null) {
  if (!text) return null;
  const lower = text.toLowerCase();
  let best: { idx: number; entry: (typeof BRAND_POWER_PHRASES)[number] } | null = null;
  for (const entry of BRAND_POWER_PHRASES) {
    const idx = lower.indexOf(entry.match);
    if (idx !== -1 && (best === null || idx < best.idx)) best = { idx, entry };
  }
  return best?.entry ?? null;
}

// ─── Bucket definitions ──────────────────────────────────────────────────────

type BucketId =
  | "core-read"
  | "culture-depth"
  | "brand-commerce-translation"
  | "creative-direction"
  | "commerce-action"
  | "risks-sources";

const BUCKETS: { id: BucketId; label: string }[] = [
  { id: "core-read", label: "Core Read" },
  { id: "culture-depth", label: "Culture Depth" },
  { id: "brand-commerce-translation", label: "Brand-Commerce Translation" },
  { id: "creative-direction", label: "Creative Direction" },
  { id: "commerce-action", label: "Commerce Action" },
  { id: "risks-sources", label: "Risks & Sources" },
];

type Row = { label: string; text: string };

// Every field from CulturalSignalRead is placed in exactly one bucket —
// see Task 5.5 Pass B planning notes for the approved mapping.
function getBucketRows(signal: CulturalSignalRead, bucket: BucketId): Row[] {
  const rows: Row[] = [];
  const push = (label: string, text: string | null | undefined) => {
    if (text) rows.push({ label, text });
  };

  switch (bucket) {
    case "core-read":
      push("Cultural Entry Point", signal.culturalEntryPoint);
      push("Proof Stack", signal.proofStack);
      push("Underlying tension", signal.underlyingTension);
      break;
    case "culture-depth":
      if (signal.culturalDepth) {
        push("Social surface", signal.culturalDepth.socialSurface);
        push("Market culture", signal.culturalDepth.marketCulture);
        push("Human culture", signal.culturalDepth.humanCulture);
        push("Cultural pattern", signal.culturalDepth.culturalPattern);
        push("Subculture / psychographic lens", signal.culturalDepth.subculturePsychographic);
        push("Language / codes", signal.culturalDepth.languageCodes);
        push("Underlying tension", signal.culturalDepth.underlyingTension);
      }
      break;
    case "brand-commerce-translation":
      if (signal.meaningTransfer) {
        push("Meaning activated", signal.meaningTransfer.meaningActivated);
        push("Meaning source", signal.meaningTransfer.meaningSource);
        push("How it could transfer to the brand", signal.meaningTransfer.howItCouldTransferToBrand);
        push("Where it lands today", signal.meaningTransfer.whereItLandsToday);
        push("Where it should land", signal.meaningTransfer.whereItShouldLand);
      }
      break;
    case "creative-direction":
      push("Creative implication", signal.brandCommerceTranslation?.creativeImplication);
      if (signal.challengerBrandLearning) {
        push(
          "Challenger-brand learning",
          `What fast-moving brands do well: ${signal.challengerBrandLearning.whatChallengersDoWell} What legacy brands can learn: ${signal.challengerBrandLearning.whatLegacyCanLearn} Not to copy blindly: ${signal.challengerBrandLearning.whatNotToCopyBlindly}`
        );
      }
      push("Suggested pattern to test", signal.nextSteps?.suggestedPatternToTest);
      break;
    case "commerce-action":
      push("Action Path", signal.actionPath);
      push("Commerce implication", signal.brandCommerceTranslation?.commerceImplication);
      push("Suggested next question", signal.nextSteps?.suggestedNextQuestion);
      break;
    case "risks-sources":
      push("Brand risk / guardrail", signal.brandCommerceTranslation?.brandRiskGuardrail);
      push("Proof implication", signal.brandCommerceTranslation?.proofImplication);
      push("Evidence & confidence", signal.evidenceConfidence);
      push("Source", signal.sourceDescription);
      push("Evidence", signal.evidence);
      if (signal.sources.length > 0) push("Sources", signal.sources.join(" · "));
      push("Related case-study pattern", signal.nextSteps?.relatedCaseStudyPattern);
      break;
  }
  return rows;
}

function DetailRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">{label}</p>
      <p className="text-xs text-neutral-600 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Executive summary card ──────────────────────────────────────────────────

function SignalSummaryCard({
  signal,
  active,
  onClick,
}: {
  signal: CulturalSignalRead;
  active: boolean;
  onClick: () => void;
}) {
  const power = classifyBrandPower(signal.brandPowerCheck);
  const hasRisk = !!signal.brandCommerceTranslation?.brandRiskGuardrail;

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`text-left rounded-2xl border bg-white p-4 space-y-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        active ? "border-neutral-900 shadow-sm" : "border-neutral-200 hover:border-neutral-400"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-900 leading-snug">{signal.signalName}</p>
        {hasRisk && (
          <span
            className="shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5"
            title="Brand risk / guardrail noted — see Risks & Sources"
          />
        )}
      </div>

      <span
        className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
          TYPE_TONE[signal.signalType] ?? "bg-neutral-100 text-neutral-500"
        }`}
      >
        {signal.signalType}
      </span>

      {signal.culturalEntryPoint && (
        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">{signal.culturalEntryPoint}</p>
      )}

      {power && (
        <div className={`px-2.5 py-1.5 rounded-lg border text-[11px] leading-snug ${power.tone}`}>
          <span className="font-semibold">{power.label}</span>
        </div>
      )}

      {signal.actionPath && (
        <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">→ {signal.actionPath}</p>
      )}
    </button>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function CulturalSignalReadSection({ signals }: { signals: CulturalSignalRead[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeBucket, setActiveBucket] = useState<BucketId>("core-read");

  const selected = signals.find((s) => s.id === selectedId) ?? null;

  function selectSignal(id: string) {
    if (id === selectedId) {
      // Clicking the active card again collapses the detail panel.
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    setActiveBucket("core-read"); // reset to first bucket on every switch
  }

  return (
    <section className="space-y-3">
      <SectionHeading
        title="Creative, Culture & Commerce Intelligence"
        subtitle="Structured cultural signals across social trends, market culture, human mindset, subcultures, language and rituals — translated into meaning transfer, proof gaps, commerce actions and brand risk. Not a trend forecast. Select a signal for the full read."
      />

      {signals.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4">
          <p className="text-sm text-neutral-400">
            No cultural signals have been attached yet. Add signals to show what people are starting to notice,
            question, trust, resist or buy before creative and commerce decisions are made.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {signals.map((s) => (
              <SignalSummaryCard key={s.id} signal={s} active={s.id === selectedId} onClick={() => selectSignal(s.id)} />
            ))}
          </div>

          {selected && (
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <div className="flex flex-wrap border-b border-neutral-100">
                {BUCKETS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBucket(b.id)}
                    aria-selected={activeBucket === b.id}
                    className={`px-3 py-2.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${
                      activeBucket === b.id
                        ? "text-neutral-900 border-b-2 border-neutral-900"
                        : "text-neutral-400 hover:text-neutral-700"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  const rows = getBucketRows(selected, activeBucket);
                  if (rows.length === 0) {
                    return <p className="text-xs text-neutral-400">Nothing recorded for this signal in this section yet.</p>;
                  }
                  return rows.map((r) => <DetailRow key={r.label} label={r.label} text={r.text} />);
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
