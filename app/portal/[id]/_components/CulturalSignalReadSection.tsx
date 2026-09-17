import type { CulturalSignalRead } from "@/lib/data";
import { SectionHeading } from "./reportUi";
import { Collapse } from "@/app/portal/_components/Collapse";

// ─── Cultural-to-Commerce Signal Read — client-facing, category signals ─────
// Task 5 (Brand-Commerce Intelligence Extension v0.1). Shows category/market
// cultural signals (never client-owned — see getCulturalSignalReadClientSafe
// in lib/data.ts) translated into Cultural Entry Point → Meaning Transfer →
// Proof Stack → Action Path → Brand Power Check, with the deeper cultural
// read (social surface, market culture, human culture, subculture, language,
// brand risk, sources, challenger-brand learning) tucked behind progressive
// disclosure so the closed card stays scannable. Not a trend forecast, no
// predictive language, no auto-scoring — brand_fit_status stays "pending" on
// every row this section can ever show.

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

function DetailRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">{label}</p>
      <p className="text-xs text-neutral-600 leading-relaxed">{text}</p>
    </div>
  );
}

function SignalCard({ signal }: { signal: CulturalSignalRead }) {
  const power = classifyBrandPower(signal.brandPowerCheck);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
      {/* Card top */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-base font-semibold text-neutral-900 leading-snug">{signal.signalName}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            {signal.categoryRelevance.map((cat) => (
              <span
                key={cat}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-neutral-100 text-neutral-500"
              >
                {cat}
              </span>
            ))}
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                TYPE_TONE[signal.signalType] ?? "bg-neutral-100 text-neutral-500"
              }`}
            >
              {signal.signalType}
            </span>
          </div>
        </div>
        {signal.evidenceConfidence && (
          <span className="shrink-0 text-[10px] font-semibold text-neutral-400 uppercase tracking-wide text-right max-w-[45%]">
            {signal.evidenceConfidence.split(";")[0]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-900 text-white uppercase tracking-wide">
          Manually researched / demo signal
        </span>
        <span className="text-[10px] text-neutral-400">Brand fit: pending strategist review</span>
      </div>

      {power && (
        <div className={`px-3 py-2 rounded-lg border text-[11px] leading-relaxed ${power.tone}`}>
          <span className="font-semibold">{power.label}.</span>
        </div>
      )}

      {/* Main read */}
      <div className="space-y-3 pt-1 border-t border-neutral-100">
        {signal.culturalEntryPoint && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Cultural Entry Point</p>
            <p className="text-sm text-neutral-700 leading-relaxed">{signal.culturalEntryPoint}</p>
          </div>
        )}
        {signal.meaningTransfer && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Meaning Transfer</p>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {signal.meaningTransfer.meaningActivated} — from {signal.meaningTransfer.meaningSource}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Lands today: {signal.meaningTransfer.whereItLandsToday} · Should land: {signal.meaningTransfer.whereItShouldLand}
            </p>
          </div>
        )}
        {signal.proofStack && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Proof Stack</p>
            <p className="text-sm text-neutral-700 leading-relaxed">{signal.proofStack}</p>
          </div>
        )}
        {signal.actionPath && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Action Path</p>
            <p className="text-sm text-neutral-700 leading-relaxed">{signal.actionPath}</p>
          </div>
        )}
      </div>

      {/* Expandable detail */}
      <Collapse label="Show cultural depth & brand-commerce translation" variant="inline">
        <div className="space-y-3 pt-1">
          {signal.culturalDepth && (
            <>
              <DetailRow label="Social surface" text={signal.culturalDepth.socialSurface} />
              <DetailRow label="Market culture" text={signal.culturalDepth.marketCulture} />
              <DetailRow label="Human culture" text={signal.culturalDepth.humanCulture} />
              <DetailRow label="Cultural pattern" text={signal.culturalDepth.culturalPattern} />
              <DetailRow label="Subculture / psychographic lens" text={signal.culturalDepth.subculturePsychographic} />
              <DetailRow label="Language / codes" text={signal.culturalDepth.languageCodes} />
            </>
          )}
          {signal.brandCommerceTranslation && (
            <>
              <DetailRow label="Creative implication" text={signal.brandCommerceTranslation.creativeImplication} />
              <DetailRow label="Proof implication" text={signal.brandCommerceTranslation.proofImplication} />
              <DetailRow label="Commerce implication" text={signal.brandCommerceTranslation.commerceImplication} />
              <DetailRow label="Brand risk / guardrail" text={signal.brandCommerceTranslation.brandRiskGuardrail} />
            </>
          )}
          {signal.nextSteps && (
            <>
              <DetailRow label="Suggested next question" text={signal.nextSteps.suggestedNextQuestion} />
              <DetailRow label="Suggested pattern to test" text={signal.nextSteps.suggestedPatternToTest} />
              <DetailRow label="Related case-study pattern" text={signal.nextSteps.relatedCaseStudyPattern} />
            </>
          )}
          {signal.challengerBrandLearning && (
            <DetailRow
              label="Challenger-brand learning"
              text={`What fast-moving brands do well: ${signal.challengerBrandLearning.whatChallengersDoWell} What legacy brands can learn: ${signal.challengerBrandLearning.whatLegacyCanLearn} Not to copy blindly: ${signal.challengerBrandLearning.whatNotToCopyBlindly}`}
            />
          )}
          {signal.evidenceConfidence && <DetailRow label="Evidence & confidence" text={signal.evidenceConfidence} />}
          <DetailRow label="Source" text={signal.sourceDescription} />
        </div>
      </Collapse>
    </div>
  );
}

export function CulturalSignalReadSection({ signals }: { signals: CulturalSignalRead[] }) {
  return (
    <section className="space-y-3">
      <SectionHeading
        title="Cultural-to-Commerce Signal Read — Indonesia / Category Signals"
        subtitle="Structured cultural signals across social trends, market culture, human mindset, subcultures, language and rituals — translated into meaning transfer, proof gaps, commerce actions and brand risk. Not a trend forecast."
      />
      {signals.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4">
          <p className="text-sm text-neutral-400">
            No cultural signals have been attached yet. Add signals to show what people are starting to notice,
            question, trust, resist or buy before creative and commerce decisions are made.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      )}
    </section>
  );
}
