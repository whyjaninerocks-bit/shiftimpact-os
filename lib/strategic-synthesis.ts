// lib/strategic-synthesis.ts
// Strategic Synthesis v0.1 (Stage 4C.2) — prompt-chain assembly.
//
// Optional, user-triggered, strategist-reviewed assistive drafting. NOT a
// standing mode like Elevation Mode / IQ Evaluate — it runs once per
// strategist click and produces one strategic_synthesis_runs row. Its
// output is never written to frame_briefs or big_idea_platforms directly —
// see lib/actions.ts (applyStrategicSynthesisStep is bookkeeping-only) and
// StrategicSynthesisPanel.tsx (client-side field pre-fill only).
//
// Two routes:
//   marketing_brief_synthesis   — FRAME Brief. 3 read-only context steps +
//                                  6 always-apply-able component steps +
//                                  4 protected structured/committed steps.
//   creative_strategy_synthesis — Big Idea Platform. 6 apply-able steps
//                                  (one inheritance-aware) + 4 read-only-only.
//
// Mapping-patch history: the first build of this file made all FRAME steps
// uniformly apply-able and added a standalone commerce_action_intelligence
// BIP step — both were accidental drift from context loss, not deliberate
// decisions. Corrected per the Stage 4C.2 mapping-patch review:
//   - FRAME now distinguishes read-only context / apply-able components /
//     protected structured fields (StepProtection below).
//   - BIP enemy_villain stays apply-able but is now inheritance-aware: it
//     reads the same FRAME-inheritance precedence already used by
//     BigIdeaPlatformSection.tsx (bip.enemy_villain if set, else
//     frame.enemy_villain if frame.enemy_active), and never silently
//     overwrites an existing value (overwrite_risk + confirm_overwrite).
//   - expression_summary stays read-only-only, unchanged.
//   - commerce_action_intelligence was removed as a standalone step.
//     Commerce framing now only modulates propagation_mechanism's guidance
//     (the closest existing field to "desired response / action") when
//     structurally relevant. Note: there is no dedicated BIP field for
//     "measurement_implication" — no new field was added per the "do not
//     build" list, so that half of the commerce-lens instruction has no
//     current home; flagged rather than silently dropped.

import type {
  StrategicBasisTargetType,
  StrategicBasisSource,
  SynthesisEvidenceQuality,
  SynthesisRoute,
  SynthesisStep,
  MarketCoverageStatus,
} from "@/lib/types";
import type { BrandCommerceClassification } from "@/lib/types";
import { displayMarketCoverageStatus } from "@/lib/cultural-signal-picker";

// ─── Protection rules (server-defined, never model-controlled) ──────────────
// Governs whether a step's draft can actually be applied to a field, beyond
// the basic target_field !== null check.

export type StepProtection =
  // Always apply-able when target_field is set — ordinary draft/creative
  // fields with no committed-value or format risk.
  | { kind: "always" }
  // Never apply-able. target_field must be null for these — context/
  // feed-forward only, shown to the strategist but never offered an Apply
  // button.
  | { kind: "read_only" }
  // Apply-able ONLY if the live field is currently empty at generation
  // time. If already filled, applicable is forced false and the draft is
  // shown as a read-only comparison next to the current value — no
  // override path in v0.1. Used for committed measurement fields
  // (primary_kpi, gate_signal_commitment) per explicit instruction: "Do not
  // apply blindly over already committed measurement fields."
  | { kind: "empty_only" }
  // Apply-able ONLY if the model's draft_text exactly matches one of the
  // allowed structured values (case-insensitive, trimmed). Used for the two
  // enum-backed FRAME fields (campaign_pathway, regulatory_category) so a
  // malformed suggestion can never be applied into a <select>.
  | { kind: "enum"; allowed: string[] }
  // Apply-able, but if the live field already has a non-empty effective
  // value, overwrite_risk is set true and the UI must require an explicit
  // second confirmation before applying — never a single-click silent
  // overwrite. Used for BIP enemy_villain, which is inheritance-aware (see
  // file header) rather than simply blocked like empty_only.
  | { kind: "confirm_overwrite" };

export type SynthesisStepDef = {
  key: string;
  label: string;
  target_field: string | null;
  guidance: string; // what this step should produce — goes into the prompt
  protection: StepProtection;
};

const PATHWAY_ALLOWED = ["Growth", "Challenger", "Loyalty", "Premium"];
const REGULATORY_CATEGORY_ALLOWED = [
  "None",
  "MCMC (Broadcast)",
  "ASA Malaysia (Advertising)",
  "KKM (Health & Food)",
  "BNM (Financial)",
  "MBAM (Outdoor)",
  "Multiple",
];

// ─── FRAME Brief — Marketing Brief Synthesis ────────────────────────────────

export const FRAME_SYNTHESIS_STEPS: SynthesisStepDef[] = [
  // A. Read-only context — never apply-able. business_outcome pulls from
  // Campaign/Client (cross-table); Strategic Synthesis for the frame_brief
  // target must never write cross-table, so read-only here is correctness,
  // not just caution. audience_market_priority synthesizes from
  // primary_cultural_context + industry_category, neither of which has its
  // own apply-able step in this pass.
  { key: "business_context", label: "Business Context", target_field: null,
    protection: { kind: "read_only" },
    guidance: "Read-only narrative context: the category-level situation and the brand's job within it, informed by Force and Role once those are drafted. Never applied to a field — this exists to help the strategist think, and to inform the Force/Role/Clarity Statement drafts below." },
  { key: "business_outcome", label: "Business Outcome", target_field: null,
    protection: { kind: "read_only" },
    guidance: "Read-only context surfaced from the campaign's and client's existing business outcome target/actual and label — never invented, never applied. This lives on Campaign/Client, not on this FRAME Brief, so it is context only." },
  { key: "audience_market_priority", label: "Audience / Market Priority", target_field: null,
    protection: { kind: "read_only" },
    guidance: "Read-only context: who this brief prioritizes, drawn from the existing industry category and primary cultural context on this brief. Never applied — feeds framing for the apply-able steps below." },

  // B. Apply-able FRAME component steps — real FRAME Brief drafting fields,
  // always apply-able (no committed-value risk, these are creative/strategic
  // draft fields the strategist iterates on freely).
  { key: "force", label: "Force", target_field: "force",
    protection: { kind: "always" },
    guidance: "The category-level tension or pressure this campaign is responding to. One tight paragraph." },
  { key: "role", label: "Role", target_field: "role",
    protection: { kind: "always" },
    guidance: "The brand's credible role in resolving that tension. Why this brand, not a category platitude." },
  { key: "anchor", label: "Anchor", target_field: "anchor",
    protection: { kind: "always" },
    guidance: "The tonal/emotional register the work should hold. A phrase or short sentence, not a mood board description." },
  { key: "mood", label: "Mood", target_field: "mood",
    protection: { kind: "always" },
    guidance: "The creative expression mode — how Anchor should feel when executed." },
  { key: "expression", label: "Expression", target_field: "expression",
    protection: { kind: "always" },
    guidance: "The channel expression logic — how the idea should translate across touchpoints, at a principle level." },
  { key: "clarity_statement", label: "Clarity Statement", target_field: "clarity_statement",
    protection: { kind: "always" },
    guidance: "One sentence synthesizing Force, Role, Anchor, Mood and Expression into a single strategic through-line." },

  // C. Protected structured / committed fields — apply-able only under
  // explicit conditions. Never blindly apply over an already-committed
  // measurement field or a malformed structured value.
  { key: "campaign_pathway", label: "Campaign Pathway", target_field: "campaign_pathway",
    protection: { kind: "enum", allowed: PATHWAY_ALLOWED },
    guidance: `Exactly one of: ${PATHWAY_ALLOWED.join(", ")} — output only the label, nothing else. If the draft does not exactly match one of these, it will be shown for reference only and cannot be applied.` },
  { key: "regulatory_category", label: "Regulatory Category", target_field: "regulatory_category",
    protection: { kind: "enum", allowed: REGULATORY_CATEGORY_ALLOWED },
    guidance: `Exactly one of: ${REGULATORY_CATEGORY_ALLOWED.join(", ")} — output only the label. If genuinely unclear from the inputs, output "None". If the draft does not exactly match one of these, it will be shown for reference only and cannot be applied.` },
  { key: "primary_kpi", label: "Primary KPI", target_field: "primary_kpi",
    protection: { kind: "empty_only" },
    guidance: "The single measurable outcome this brief should be judged against. This is a pre-agreed measurement commitment — if one is already set, your draft will be shown as a comparison only, never auto-applied over it." },
  { key: "gate_signal_commitment", label: "Gate Signal Commitment", target_field: "gate_signal_commitment",
    protection: { kind: "empty_only" },
    guidance: "What early signal this brief commits to tracking before the next phase gate. This is a pre-agreed measurement commitment — if one is already set, your draft will be shown as a comparison only, never auto-applied over it." },
];

// ─── Big Idea Platform — Creative Strategy Synthesis ────────────────────────

export const BIP_SYNTHESIS_STEPS: SynthesisStepDef[] = [
  { key: "creative_territory", label: "Creative Territory", target_field: null,
    protection: { kind: "read_only" },
    guidance: "The broader idea space this platform could live in. Read-only, feeds forward into Proposition Route — never applied directly, never written to topline_idea." },
  { key: "proposition_route", label: "Proposition Route", target_field: "topline_idea",
    protection: { kind: "always" },
    guidance: "The single sharpened hero statement, one sentence. This is the only step that may target topline_idea." },
  // Inheritance-aware — see file header. Never silently overwrites; the
  // caller must supply current_value (the same effective value
  // BigIdeaPlatformSection.tsx already computes and displays) and
  // overwrite_risk is set whenever that value is non-empty.
  { key: "enemy_villain", label: "Enemy / villain", target_field: "enemy_villain",
    protection: { kind: "confirm_overwrite" },
    guidance: "The structural enemy this idea positions against — not the competitor brand, but the systemic force that makes the human problem exist. If a FRAME-level enemy is already active and inherited, sharpen it for BIP rather than contradicting it; if you sharpen it into something different, be clear in your rationale that this is a BIP-level override, not a correction of FRAME." },
  { key: "brand_role", label: "Brand Role", target_field: "brand_role",
    protection: { kind: "always" },
    guidance: "The non-transferable role the brand plays. If the brand were removed, the idea should collapse." },
  { key: "cultural_tension", label: "Cultural Tension", target_field: "cultural_tension",
    protection: { kind: "always" },
    guidance: "The specific human tension this idea resolves. Only reference a named cultural signal if one was actually cited as a basis source." },
  // Carries the commerce/non-commerce lens — see buildSynthesisUserPrompt.
  { key: "propagation_mechanism", label: "Propagation Mechanism", target_field: "propagation_mechanism",
    protection: { kind: "always" },
    guidance: "How this idea earns movement from stage to stage — the mechanism, not a media plan. This is the closest existing field to \"desired response / action\" — see the commerce framing note for this run." },
  { key: "media_idea", label: "Media Idea", target_field: "media_idea",
    protection: { kind: "always" },
    guidance: "The format or channel that carries the idea most naturally." },
  { key: "expression_summary", label: "Expression Summary", target_field: null,
    protection: { kind: "read_only" },
    guidance: "How the idea manifests across touchpoints, at a glance. Read-only-only for v0.1 — help the strategist think this through, but never draft this as if it will be applied." },
  { key: "proof_stack", label: "Proof Stack", target_field: null,
    protection: { kind: "read_only" },
    guidance: "What evidence would need to exist for this idea to be defensible. Read-only-only — no BIP field exists for this yet (flagged as a future schema gap, not built in this pass)." },
  { key: "brand_power_risk", label: "Brand Power Risk", target_field: null,
    protection: { kind: "read_only" },
    guidance: "What could go wrong for brand equity if this idea is executed poorly. Read-only-only — no BIP field exists for this yet (future schema gap)." },
];

// ─── Commerce / culture gating (structured signals only — no free-text inference) ─

const COMMERCE_CLASSIFICATIONS: BrandCommerceClassification[] = [
  "commerce_mover",
  "promo_extractor",
  "conversion_blocked",
];

export function shouldFrameAsCommerce(classification: BrandCommerceClassification | null): boolean {
  return classification !== null && COMMERCE_CLASSIFICATIONS.includes(classification);
}

export function cultureIsCitable(basisSources: StrategicBasisSource[]): boolean {
  return basisSources.some((s) => s.source_type === "os_cultural_radar_signal");
}

// ─── Guardrails ───────────────────────────────────────────────────────────
// Two-layer defense: these words are named in the prompt as forbidden AND
// checked server-side against every draft_text after generation. A draft
// that trips this check is not discarded silently — evidence_quality is
// forced to "insufficient_evidence" and a flag is appended to rationale so
// the strategist sees exactly why, rather than getting a silently-laundered
// draft.

export const SYNTHESIS_FORBIDDEN_WORDS: string[] = [
  "guaranteed", "guarantee", "guarantees",
  "will go viral", "guaranteed to go viral",
  "proven to work", "scientifically proven",
  "best in class", "best-in-class",
  "world-class", // reserved for IQ Evaluate's own rubric language, not synthesis output
  "revolutionary", "unprecedented", "game-changing", "groundbreaking",
  "definitely will", "certainly will", "always works", "never fails",
  "#1", "number one", "top-ranked", "highest performing",
  // Added per Stage 4C.2 guardrail patch — 6 terms approved after live
  // production testing confirmed none appeared in real output, but the
  // code-level list had not yet been updated to catch them if they did.
  "proven", "caused by", "automatically derived", "final truth",
  "winning route", "best territory",
];

// 3 additional structural rules (not word-matchable) enforced via the
// system prompt instructions below: no ranking against other campaigns or
// competitors, no performance prediction (numbers, %, or outcome forecasts),
// no causality claims (this idea "will cause" / "will drive" a result).

export function checkGuardrails(text: string): { clean: boolean; hits: string[] } {
  const lower = text.toLowerCase();
  const hits = SYNTHESIS_FORBIDDEN_WORDS.filter((w) => lower.includes(w.toLowerCase()));
  return { clean: hits.length === 0, hits };
}

// ─── Market Cultural Coverage — Market Activation by Radar Layer 1 ─────────
// Injects an honest read of how much curated cultural intelligence actually
// exists for this campaign's primary market, so the model calibrates
// confidence instead of treating every market as equally well-covered.
// coverage_status is strategist-set (via market_parameters), never derived
// here from signalCount — signalCount is shown for transparency only.

export type MarketCoverageContext = {
  marketCode: string | null;
  marketName: string | null;
  coverageStatus: MarketCoverageStatus | null;
  signalCount: number;
};

export function buildMarketCoverageBlock(marketCoverage?: MarketCoverageContext | null): string {
  if (!marketCoverage || !marketCoverage.marketCode) {
    return "No primary market is set on this campaign. Do not invent, assume, or generalize market-specific cultural intelligence — reason only from the brief/BIP inputs and any explicitly cited basis sources.";
  }

  const { marketCode, marketName, coverageStatus, signalCount } = marketCoverage;
  const label = marketName ?? marketCode;
  const statusLabel = displayMarketCoverageStatus(coverageStatus);

  if (coverageStatus === "active_tracking" || coverageStatus === "strategic_coverage") {
    return `Market: ${label} (${marketCode}). Coverage: ${statusLabel} — ${signalCount} curated cultural signal(s) exist for this market. Normal confidence framing applies, still subject to rule 7's citation gate above.`;
  }

  if (coverageStatus === "experimental") {
    return `Market: ${label} (${marketCode}). Coverage: ${statusLabel} — ${signalCount} curated cultural signal(s), not yet fully validated. Frame any market-level cultural input as directional and early-stage only — do not present it with the same confidence as a well-established market.`;
  }

  // not_tracked, or the market code has no market_parameters row at all
  // (e.g. SEA / GLOBAL / OTHER, or a market not yet seeded).
  const marketDisplay = marketName && marketName !== marketCode ? `${marketName} (${marketCode})` : marketCode;
  return `Market: ${marketDisplay}. Coverage: Not actively tracked yet — ${signalCount} curated cultural signal(s) exist for this market. Do NOT invent, assume, or generalize cultural intelligence for this market. Omit market-specific cultural claims entirely and reason only from the brief/BIP inputs and any explicitly cited basis sources.`;
}

// ─── System prompt ────────────────────────────────────────────────────────

export const SYNTHESIS_SYSTEM_PROMPT = `You are the Strategic Synthesis assistant embedded in ShiftImpact OS — a senior strategist drafting FIRST-PASS material for a human strategist to review, edit, or discard. You are not the author of record. Every draft you produce is a starting point, never a finished, approved output.

Ground rules — non-negotiable:
1. Base every draft ONLY on the inputs you are given (FRAME Brief fields, BIP fields, cited strategic basis sources, Brand-Commerce Read classification). Never invent facts, data, prior campaign results, or client context not present in the inputs.
2. Never rank this idea, brand, or campaign against named competitors or other real campaigns.
3. Never predict performance — no numbers, percentages, or outcome forecasts (e.g. "this will lift awareness by X%").
4. Never claim causality — do not say this idea "will cause," "will drive," or "will deliver" a business result. Describe intent and mechanism, not guaranteed outcome.
5. Never use inflated, unearned superlatives (see forbidden word list). Be precise and specific instead of hyperbolic.
6. If the inputs given to you are too thin to draft something specific and non-generic, say so honestly: set evidence_quality to "insufficient_evidence" and keep draft_text short and explicit about what's missing, rather than fabricating specificity you don't have grounds for.
7. Cultural framing (naming a specific cultural tension, referencing a cultural signal) is only appropriate for steps where a real OS Cultural Radar signal was cited as a basis source. If none was cited, do not invent cultural specificity — reason from the brief/BIP inputs only.
8. Commerce framing (conversion mechanics, action-triggers, promo logic) is only appropriate for the Propagation Mechanism step, and only when this campaign's Brand-Commerce Read classification is commerce-facing (see the per-step note for this run). It is never a standalone topic, and never appears in any other step. When not commerce-facing, use desired response / belief shift / behaviour shift / memory-meaning language instead — never purchase-action language ("buy now," "shop now," "add to cart" and similar).
9. Never infer commerce intent from free-text objectives or campaign names yourself — only the structured classification passed to you determines this.
10. For every step, set evidence_quality honestly: "direct_evidence" (directly grounded in specific, cited inputs), "inference" (a reasonable extrapolation from thinner inputs), or "insufficient_evidence" (inputs too thin to say anything specific).
11. Write rationale as 1-2 sentences naming what in the inputs the draft is based on — never a generic justification. For the BIP enemy_villain step specifically: if a FRAME-level enemy is already active and you are sharpening or changing it, say so explicitly in the rationale — never present a changed enemy as if it were simply inherited unchanged.
12. Respect this run's Market Cultural Coverage status (see below) in addition to rule 7. Rule 7 gates cultural framing on whether a signal was cited at all; this rule governs how much confidence to place in market-level cultural framing even when one was. If coverage is "not tracked," do not invent, assume, or generalize any market-specific cultural intelligence — omit market-specific cultural claims entirely and reason only from the brief/BIP inputs and any explicitly cited basis sources. If coverage is "limited/experimental," frame any market-level cultural input as directional and early-stage, not settled fact — never with the same confidence you'd use for a well-established market.

You will be asked to draft multiple steps in one call. Follow the per-step guidance given for each exactly, and respect which steps are read-only context (they still need a thoughtful draft — they're simply never applied directly to a field).`;

// ─── User prompt builder ──────────────────────────────────────────────────

export function buildSynthesisUserPrompt(params: {
  targetType: StrategicBasisTargetType;
  campaignName: string;
  clientName: string;
  frame: Record<string, unknown>;
  bip: Record<string, unknown> | null;
  basisSources: StrategicBasisSource[];
  brandCommerceClassification: BrandCommerceClassification | null;
  steps: SynthesisStepDef[];
  // Cross-table business outcome context (Campaign/Client) — read-only,
  // surfaced only for the FRAME business_outcome step.
  businessOutcome?: { target: number | null; actual: number | null; label: string } | null;
  // BIP-only: the effective current enemy_villain value and whether it came
  // from FRAME inheritance, so the model can reason about it instead of
  // guessing. Mirrors the precedence already used by
  // BigIdeaPlatformSection.tsx (bip.enemy_villain if set, else
  // frame.enemy_villain if frame.enemy_active).
  enemyInheritance?: { effectiveValue: string | null; inheritedFromFrame: boolean } | null;
  // Market Activation by Radar Layer 1 — honest coverage read for this
  // campaign's primary market. Optional/nullable throughout: older callers
  // or campaigns with no primary_market_code set still work unchanged.
  marketCoverage?: MarketCoverageContext | null;
}): string {
  const {
    targetType, campaignName, clientName, frame, bip, basisSources,
    brandCommerceClassification, steps, businessOutcome, enemyInheritance,
    marketCoverage,
  } = params;

  const cultureOk = cultureIsCitable(basisSources);
  const commerceOn = shouldFrameAsCommerce(brandCommerceClassification);

  const sourcesBlock = basisSources.length
    ? basisSources
        .map((s) => `- [${s.source_type}] ${s.source_title}${s.source_note ? ` — ${s.source_note}` : ""}`)
        .join("\n")
    : "(No strategic basis sources cited for this target yet.)";

  const stepsBlock = steps
    .map((s, i) => {
      let note = "";
      if (s.key === "business_outcome" && businessOutcome) {
        note = ` Existing business outcome context: label "${businessOutcome.label}", target ${businessOutcome.target ?? "(not set)"}, actual ${businessOutcome.actual ?? "(not set)"}.`;
      }
      if (s.key === "enemy_villain" && enemyInheritance) {
        note = enemyInheritance.effectiveValue
          ? enemyInheritance.inheritedFromFrame
            ? ` Current effective BIP enemy is inherited from FRAME (FRAME Enemy is active): "${enemyInheritance.effectiveValue}". You may sharpen this for BIP, but say explicitly in your rationale that you are doing so.`
            : ` Current BIP enemy is already set independently: "${enemyInheritance.effectiveValue}". If you draft something different, say explicitly in your rationale that this is a BIP-level override, not an inherited value.`
          : " No current BIP or inherited FRAME enemy exists yet — this would be a fresh draft, not an override.";
      }
      if (s.key === "propagation_mechanism") {
        note = commerceOn
          ? " This campaign's Brand-Commerce Read classification is commerce-facing — you may frame this step around conversion/action mechanics grounded in the cited inputs, still no performance prediction, still no purchase-action superlatives."
          : " This campaign's Brand-Commerce Read classification is not commerce-facing (or not set) — use desired response / belief shift / behaviour shift / memory-meaning language, not purchase-action language.";
      }
      return `${i + 1}. [${s.key}] ${s.label} — ${s.guidance}${note}`;
    })
    .join("\n");

  return `CAMPAIGN: ${campaignName}
CLIENT / BRAND: ${clientName}
TARGET: ${targetType === "frame_brief" ? "FRAME Brief (Marketing Brief Synthesis)" : "Big Idea Platform (Creative Strategy Synthesis)"}

─── EXISTING FRAME BRIEF FIELDS ───
Force: ${frame.force || "(empty)"}
Role: ${frame.role || "(empty)"}
Anchor: ${frame.anchor || "(empty)"}
Mood: ${frame.mood || "(empty)"}
Expression: ${frame.expression || "(empty)"}
Clarity Statement: ${frame.clarity_statement || "(empty)"}
Campaign Pathway: ${frame.campaign_pathway || "(not set)"}
Primary KPI: ${frame.primary_kpi || "(empty)"}
Gate Signal Commitment: ${frame.gate_signal_commitment || "(empty)"}
Enemy / Villain: ${frame.enemy_villain || "(none)"} (active: ${frame.enemy_active ? "yes" : "no"})
Regulatory Category: ${frame.regulatory_category || "(not set)"}
Industry Category: ${frame.industry_category || "(not set)"}
Primary Cultural Context: ${frame.primary_cultural_context || "(not set)"}

${bip ? `─── EXISTING BIG IDEA PLATFORM FIELDS ───
Topline Idea: ${bip.topline_idea || "(empty)"}
Enemy / Villain: ${bip.enemy_villain || "(empty)"}
Brand Role: ${bip.brand_role || "(empty)"}
Propagation Mechanism: ${bip.propagation_mechanism || "(empty)"}
Cultural Tension: ${bip.cultural_tension || "(empty)"}
Media Idea: ${bip.media_idea || "(empty)"}
Expression Summary: ${bip.expression_summary || "(empty)"}
` : ""}
─── CITED STRATEGIC BASIS SOURCES ───
${sourcesBlock}

Cultural framing permitted for this run: ${cultureOk ? "YES — a real OS Cultural Radar signal was cited above." : "NO — do not name or invent a specific cultural tension/signal; reason from brief/BIP inputs only."}

─── MARKET CULTURAL COVERAGE ───
${buildMarketCoverageBlock(marketCoverage)}

─── STEPS TO DRAFT (in order) ───
${stepsBlock}

Return only the structured tool call — no prose outside it.`;
}

// ─── Tool schema (forced structured output) ────────────────────────────────

export function buildSynthesisTool(steps: SynthesisStepDef[]) {
  return {
    name: "submit_strategic_synthesis",
    description: "Submit drafted content for every requested step.",
    input_schema: {
      type: "object" as const,
      properties: {
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string", enum: steps.map((s) => s.key) },
              draft_text: { type: "string" },
              rationale: { type: "string" },
              evidence_quality: { type: "string", enum: ["direct_evidence", "inference", "insufficient_evidence"] },
            },
            required: ["key", "draft_text", "rationale", "evidence_quality"],
          },
          minItems: steps.length,
          maxItems: steps.length,
        },
      },
      required: ["steps"],
    },
  };
}

// ─── Assemble the final SynthesisRoute from model output ──────────────────
// This is where step metadata (target_field, protection — server-defined,
// never model-controlled) is merged with the model's draft_text/rationale/
// evidence_quality, the guardrail check runs, and protection rules are
// applied to compute the final applicable/current_value/overwrite_risk for
// this run.

export function assembleSynthesisRoute(
  routeKey: string,
  routeLabel: string,
  stepDefs: SynthesisStepDef[],
  modelSteps: { key: string; draft_text: string; rationale: string; evidence_quality: string }[],
  // currentValues: live field values at generation time, keyed by
  // target_field — only needed for empty_only / confirm_overwrite steps.
  // Steps with protection "always" / "read_only" / "enum" ignore this.
  currentValues: Record<string, string | null> = {}
): SynthesisRoute {
  const byKey = new Map(modelSteps.map((s) => [s.key, s]));

  const steps: SynthesisStep[] = stepDefs.map((def) => {
    const modelStep = byKey.get(def.key);
    const rawDraft = modelStep?.draft_text ?? "";
    const rawRationale = modelStep?.rationale ?? "";
    let evidence_quality: SynthesisEvidenceQuality =
      modelStep?.evidence_quality === "direct_evidence" || modelStep?.evidence_quality === "inference"
        ? modelStep.evidence_quality
        : "insufficient_evidence";

    const { clean, hits } = checkGuardrails(rawDraft);
    let draft_text = rawDraft;
    let rationale = rawRationale;
    if (!clean) {
      evidence_quality = "insufficient_evidence";
      rationale = `${rawRationale} [Guardrail: flagged term(s) removed — ${hits.join(", ")}. Review before use.]`.trim();
      let scrubbed = rawDraft;
      for (const hit of hits) {
        scrubbed = scrubbed.replace(new RegExp(hit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[flagged]");
      }
      draft_text = scrubbed;
    }

    // ── Protection rules — compute applicable / current_value / overwrite_risk ──
    const structurallyApplicable = def.target_field !== null;
    let applicable = false;
    let current_value: string | null = null;
    let overwrite_risk = false;

    if (structurallyApplicable) {
      const live = currentValues[def.target_field as string] ?? null;
      const liveIsFilled = !!live && live.trim().length > 0;

      switch (def.protection.kind) {
        case "always":
          applicable = true;
          break;
        case "read_only":
          // Should not happen (read_only steps have target_field: null by
          // construction), but never apply-able regardless.
          applicable = false;
          break;
        case "empty_only":
          current_value = live;
          applicable = !liveIsFilled;
          if (liveIsFilled) {
            rationale = `${rationale} [Already committed — shown as comparison only, not applied.]`.trim();
          }
          break;
        case "enum": {
          const matched = def.protection.allowed.some(
            (opt) => opt.trim().toLowerCase() === draft_text.trim().toLowerCase()
          );
          applicable = matched;
          if (!matched) {
            rationale = `${rationale} [Drafted value did not match an allowed option — shown for reference only.]`.trim();
          }
          break;
        }
        case "confirm_overwrite":
          current_value = live;
          applicable = true;
          overwrite_risk = liveIsFilled;
          break;
      }
    }

    return {
      key: def.key,
      label: def.label,
      target_field: def.target_field,
      draft_text,
      rationale,
      evidence_quality,
      applicable,
      current_value,
      overwrite_risk,
      applied: false,
    };
  });

  return { key: routeKey, label: routeLabel, steps };
}
