// lib/creative-format-read.ts
// Creative Format Read v0.1 — logic module only. No DB migration, no UI, no
// asset upload system, no Learning Memory write, no platform tracker, no
// creative generation. This file mirrors lib/strategic-synthesis.ts in
// shape and discipline on purpose — same prompt-assembly / forced-tool-use /
// server-side-guardrail pattern, because the risk profile is the same: an
// LLM producing first-pass judgment for a human strategist to weigh, never
// a verdict.
//
// Grounded in the one real record of the McCann/Akhil challenge on file
// (Akhil, GM, greenlit a pilot and assigned Janine to "test and validate
// whether the model genuinely helps address creative intelligence" — no
// detailed test brief was ever recorded) plus the 11-dimension diagnostic
// spec and platform-change reservation Janine specified directly. Nothing
// here is invented ad-effectiveness theory beyond that.
//
// DIAGNOSE, NOT PREDICT. This module never produces a performance forecast,
// a score, a rank, a platform-effectiveness claim, or a strategy rewrite —
// see CREATIVE_FORMAT_READ_SYSTEM_PROMPT and the guardrail/maturity-cap
// enforcement below, which is server-defined and never model-controlled,
// exactly like StepProtection in lib/strategic-synthesis.ts.

import type {
  StrategicBasisSource,
  SynthesisEvidenceQuality,
  BrandCommerceClassification,
} from "@/lib/types";
import {
  SYNTHESIS_FORBIDDEN_WORDS,
  cultureIsCitable,
  shouldFrameAsCommerce,
  buildMarketCoverageBlock,
  type MarketCoverageContext,
} from "@/lib/strategic-synthesis";

// ─── Vocabulary reuse ───────────────────────────────────────────────────────
// evidence_quality reuses SynthesisEvidenceQuality verbatim — same three
// states Strategic Synthesis already uses to self-rate honestly. No new
// confidence scale invented for this module.

export type CreativeAssetMaturity = "script" | "storyboard" | "rough_cut" | "final_asset";

export const ASSET_MATURITY_OPTIONS: { value: CreativeAssetMaturity; label: string; desc: string }[] = [
  { value: "script", label: "Script", desc: "Written words only — no visuals, no pacing, no performance yet." },
  { value: "storyboard", label: "Storyboard", desc: "Sequenced frames/beats — shows structure, not execution." },
  { value: "rough_cut", label: "Rough cut", desc: "An actual edit exists — hook, pacing, and delivery can be observed." },
  { value: "final_asset", label: "Final asset", desc: "Finished, ready to run — full execution observable." },
];

export type CreativeFormatDiagnosisStatus = "applicable" | "not_applicable" | "insufficient_input";

// ─── The 11 diagnosis dimensions ────────────────────────────────────────────
// Each guidance string names the existing OS field it diagnoses AGAINST
// (the intended strategy) where one exists, and is explicit about the gap
// where none does — same "represent gaps honestly" discipline as the
// Cultural Signal Quality Lens checklist.

export type CreativeFormatDimensionKey =
  | "hook"
  | "opening_frame"
  | "message_clarity"
  | "brand_role"
  | "proof_timing"
  | "creator_role"
  | "format_fit"
  | "cta_action_path"
  | "brand_power_risk"
  | "commerce_pressure"
  | "evidence_confidence";

export type CreativeFormatDimensionDef = {
  key: CreativeFormatDimensionKey;
  label: string;
  guidance: string;
};

export const CREATIVE_FORMAT_DIMENSIONS: CreativeFormatDimensionDef[] = [
  { key: "hook", label: "Hook",
    guidance: "What, if anything, is designed to stop a scroll or hold attention in the first moment. No dedicated OS field for this today — diagnose directly from the asset description. If the asset is script-stage, you can only infer intended hook from what's written, not observe delivery." },
  { key: "opening_frame", label: "Opening frame",
    guidance: "What is literally shown or said first, and whether it sets up or undercuts the hook. No dedicated OS field for this today — diagnose directly from the asset description." },
  { key: "message_clarity", label: "Message clarity",
    guidance: "Whether the asset actually delivers the FRAME's clarity_statement (the intended strategic through-line) — not whether the through-line itself is well-written, but whether THIS asset expresses it legibly. Compare the asset against clarity_statement below." },
  { key: "brand_role", label: "Brand role",
    guidance: "Whether the asset delivers the BIP's stated brand_role (the non-transferable role the brand plays — if the brand were removed, the idea should collapse). Compare the asset against brand_role below; if brand_role isn't set on the BIP, say so and mark insufficient_input rather than guessing at what it should be." },
  { key: "proof_timing", label: "Proof timing",
    guidance: "WHEN in the asset's sequence, if at all, evidence or substantiation appears — not what the evidence is, just its placement and whether that placement helps or buries it. No dedicated OS field for this today (adjacent to BIP's proof_stack concept, which is about what evidence would exist, not when it appears in-asset)." },
  { key: "creator_role", label: "Creator role",
    guidance: "If a creator or presenter appears, what role they play and whether it reads as organic, seeded, or paid — reuse the OS's existing UGC taxonomy (Organic / Seeded / Paid Creator) rather than inventing new labels. If no creator is described in the asset, mark status not_applicable — never assume one exists." },
  { key: "format_fit", label: "Format fit",
    guidance: "Whether the proposed format matches the BIP's stated media_idea (the format/channel intended to carry the idea) — a brief-level fit check only. This is NOT a platform-performance judgment; see platform_seam for the explicit line between the two." },
  { key: "cta_action_path", label: "CTA / action path",
    guidance: "What the asset asks the viewer to do next, if anything, and how clear that path is — read against BIP's propagation_mechanism (how the idea earns movement stage to stage). Frame this using commerce/action language only if the campaign's Brand-Commerce classification is commerce-facing (see below); otherwise use desired-response / belief-shift language, never purchase-action language. If the asset has no next step at all (pure brand awareness), mark not_applicable rather than inventing a CTA that isn't there." },
  { key: "brand_power_risk", label: "Brand power risk",
    guidance: "What could go wrong for brand equity if this asset runs as-is — this is the same concept already named (but never built) in Big Idea Platform synthesis as a future schema gap; this is that gap's first real home. Inherently forward-looking — you are describing a risk, not something observed, so the honest ceiling here is 'inference,' never 'direct_evidence.'" },
  { key: "commerce_pressure", label: "Commerce pressure",
    guidance: "Whether the asset is carrying more or less conversion/action pressure than the campaign's Brand-Commerce classification actually calls for — e.g. a commerce_mover campaign running a purely brand-mood asset, or a non-commerce campaign asset that reads like a hard sell. Gate this exactly the same way cta_action_path is gated by Brand-Commerce classification below." },
  { key: "evidence_confidence", label: "Evidence confidence",
    guidance: "An honest overall read of how much the diagnosis above could actually be grounded in what was given — summarizing, not separately scored. Should track asset_maturity and how much of the asset description was concrete versus vague." },
];

// ─── Guardrails ─────────────────────────────────────────────────────────────
// Extends Strategic Synthesis's own forbidden-word list rather than starting
// a second one — the discipline (no performance numbers, no superlatives,
// no causality) is identical. Adds Creative-Format-Read-specific terms for
// the two risks unique to this module: performance forecasting and
// platform-effectiveness claims.

export const CREATIVE_FORMAT_ADDITIONAL_FORBIDDEN_WORDS: string[] = [
  "will get views", "high ctr", "click-through rate", "click through rate",
  "will convert", "conversion rate of", "engagement rate", "watch time",
  "completion rate", "will perform well on", "algorithm favors", "algorithm will",
  "platform performance", "will trend", "will rank", "impressions of",
  "reach of", "will go viral on", "expected views", "projected engagement",
];

export const CREATIVE_FORMAT_FORBIDDEN_WORDS: string[] = [
  ...SYNTHESIS_FORBIDDEN_WORDS,
  ...CREATIVE_FORMAT_ADDITIONAL_FORBIDDEN_WORDS,
];

export function checkCreativeFormatGuardrails(text: string): { clean: boolean; hits: string[] } {
  const lower = text.toLowerCase();
  const hits = CREATIVE_FORMAT_FORBIDDEN_WORDS.filter((w) => lower.includes(w.toLowerCase()));
  return { clean: hits.length === 0, hits };
}

// ─── Asset-maturity confidence cap — server-enforced, never model-controlled ─
// "Asset maturity must constrain confidence" is not left to the model's
// discretion — the same philosophy as StepProtection in
// lib/strategic-synthesis.ts (protection rules are server-defined, never
// model-controlled). Dimensions that require literally observing execution
// (hook delivery, opening-frame pacing, proof timing, a creator's actual
// performance) cannot honestly earn "direct_evidence" from a script or
// storyboard, which only describe intent. brand_power_risk is capped
// separately and permanently, at any maturity — it's inherently a
// forward-looking risk read, not an observation.

const OBSERVATION_DEPENDENT_DIMENSIONS: CreativeFormatDimensionKey[] = [
  "hook",
  "opening_frame",
  "proof_timing",
  "creator_role",
];

const MATURITY_ALLOWS_DIRECT_OBSERVATION: Record<CreativeAssetMaturity, boolean> = {
  script: false,
  storyboard: false,
  rough_cut: true,
  final_asset: true,
};

export function capEvidenceQualityForMaturity(
  key: CreativeFormatDimensionKey,
  quality: SynthesisEvidenceQuality,
  maturity: CreativeAssetMaturity
): { quality: SynthesisEvidenceQuality; capped: boolean; reason: string | null } {
  if (key === "brand_power_risk" && quality === "direct_evidence") {
    return { quality: "inference", capped: true, reason: "brand_power_risk is forward-looking by nature — never direct_evidence, regardless of asset maturity." };
  }
  if (
    OBSERVATION_DEPENDENT_DIMENSIONS.includes(key) &&
    quality === "direct_evidence" &&
    !MATURITY_ALLOWS_DIRECT_OBSERVATION[maturity]
  ) {
    return {
      quality: "inference",
      capped: true,
      reason: `asset maturity ("${maturity}") describes intent, not execution — this dimension can only be inferred, not directly observed, until a rough_cut or final_asset exists.`,
    };
  }
  return { quality, capped: false, reason: null };
}

// ─── Platform seam — reserved, not assessed ─────────────────────────────────
// The explicit attachment point for a later Platform Change / Format
// Efficacy Intelligence layer. This module only ever flags WHETHER a
// format's real-world effectiveness plausibly depends on current platform
// conditions — it never assesses what those conditions are or how the
// format would do against them. That assessment needs live platform data
// this module deliberately does not have and must not guess at.

export type PlatformSeam = {
  platform_dependent: boolean;
  platform_note: string;
};

// ─── Output shape ───────────────────────────────────────────────────────────

export type CreativeFormatDimensionResult = {
  key: CreativeFormatDimensionKey;
  label: string;
  observed_read: string;
  rationale: string;
  evidence_quality: SynthesisEvidenceQuality;
  status: CreativeFormatDiagnosisStatus;
  strengthening_move: string;
};

export type CreativeFormatReadResult = {
  asset_maturity: CreativeAssetMaturity;
  dimensions: CreativeFormatDimensionResult[];
  platform_seam: PlatformSeam;
};

// ─── System prompt ──────────────────────────────────────────────────────────

export const CREATIVE_FORMAT_READ_SYSTEM_PROMPT = `You are the Creative Format Read assistant embedded in ShiftImpact OS. You DIAGNOSE a creative asset or proposed format against the campaign's own stated strategy and general craft principles. You are not a performance forecaster, a judge issuing a score, or a copywriter rewriting the work. Every read you produce is a diagnostic opinion for a human strategist to weigh, never a verdict.

Ground rules — non-negotiable:
1. Diagnose, never predict. Describe what the asset does or doesn't do against the stated strategy and craft principles — never forecast how it will perform once it runs.
2. Never produce or imply a performance number: no views, CTR, conversion rate, completion rate, watch time, engagement rate, reach, impressions, or any other performance forecast, however softly phrased.
3. Never make a platform-effectiveness claim ("this will do well on TikTok," "the algorithm favors this format"). Platform conditions are explicitly out of scope for this read — the platform_seam field only flags whether platform conditions are plausibly relevant, it never assesses what they are.
4. Never score or rank. No numeric or letter grades, no "8/10," no ranking against other assets, campaigns, or competitors.
5. Never claim causality about a future outcome ("this will drive," "this will cause"). You may describe mechanism and intent only.
6. Never invent audience, creator, or performance data that wasn't given to you. If the asset description doesn't mention who appears in it, don't assume a creator exists.
7. Never rewrite the strategy or the asset. strengthening_move should name what's missing or weak and point at the direction to strengthen it in — never draft replacement copy, a new hook, or a new script.
8. Asset maturity constrains what you can honestly claim to have observed. A script or storyboard describes intent — it does not let you directly observe execution-dependent details like exact hook delivery, pacing, or timing. Be honest that these can only be inferred from structure until a rough_cut or final_asset exists. Never claim direct_evidence for something you could not literally see or hear in the material given — this will also be checked and capped server-side, so be honest rather than optimistic.
9. Use status honestly: "not_applicable" when a dimension genuinely doesn't apply to this asset (e.g. creator_role when no creator is described, cta_action_path when the format is pure brand awareness with no next step) — never force a read onto something that isn't there. Use "insufficient_input" when the dimension could apply but the asset description simply doesn't give enough to say anything specific — this is different from not_applicable and different from a low-confidence guess.
10. brand_power_risk is inherently forward-looking — you are describing what could go wrong, not something that has already happened. The honest ceiling for this dimension is "inference," never "direct_evidence."
11. commerce_pressure and cta_action_path must follow the campaign's own Brand-Commerce classification: use conversion/action language only if the campaign is commerce-facing; otherwise use desired-response / belief-shift / behaviour-shift language, never purchase-action language.
12. Write observed_read, rationale, and strengthening_move in plain strategist language a real person would say out loud — not marketing jargon, not a generic template answer.

You will be asked to diagnose all 11 dimensions in one call, plus the platform_seam field. Follow the per-dimension guidance given for each exactly.`;

// ─── User prompt builder ────────────────────────────────────────────────────

export function buildCreativeFormatReadUserPrompt(params: {
  campaignName: string;
  clientName: string;
  frame: Record<string, unknown>;
  bip: Record<string, unknown> | null;
  basisSources: StrategicBasisSource[];
  marketCoverage?: MarketCoverageContext | null;
  brandCommerceClassification: BrandCommerceClassification | null;
  // Optional — Cultural Signal Quality Lens context for whichever signals
  // were cited into this target, if the caller has it on hand. No new
  // fetcher built for this in v0.1; degrades gracefully if omitted.
  citedSignalQuality?: { signalName: string; qualityLabel: string }[] | null;
  assetDescription: string;
  assetMaturity: CreativeAssetMaturity;
}): string {
  const {
    campaignName, clientName, frame, bip, basisSources, marketCoverage,
    brandCommerceClassification, citedSignalQuality, assetDescription, assetMaturity,
  } = params;

  const cultureOk = cultureIsCitable(basisSources);
  const commerceOn = shouldFrameAsCommerce(brandCommerceClassification);
  const maturityDef = ASSET_MATURITY_OPTIONS.find((m) => m.value === assetMaturity);

  const sourcesBlock = basisSources.length
    ? basisSources
        .map((s) => `- [${s.source_type}] ${s.source_title}${s.source_note ? ` — ${s.source_note}` : ""}`)
        .join("\n")
    : "(No strategic basis sources cited for this target yet.)";

  const signalQualityBlock = citedSignalQuality && citedSignalQuality.length > 0
    ? citedSignalQuality.map((s) => `- ${s.signalName}: ${s.qualityLabel}`).join("\n")
    : "(No Cultural Signal Quality Lens context supplied for this run.)";

  const dimensionsBlock = CREATIVE_FORMAT_DIMENSIONS
    .map((d, i) => `${i + 1}. [${d.key}] ${d.label} — ${d.guidance}`)
    .join("\n");

  return `CAMPAIGN: ${campaignName}
CLIENT / BRAND: ${clientName}

─── INTENDED STRATEGY (FRAME Brief) ───
Force: ${frame.force || "(empty)"}
Role: ${frame.role || "(empty)"}
Anchor: ${frame.anchor || "(empty)"}
Mood: ${frame.mood || "(empty)"}
Expression: ${frame.expression || "(empty)"}
Clarity Statement: ${frame.clarity_statement || "(empty)"}
Enemy / Villain: ${frame.enemy_villain || "(none)"} (active: ${frame.enemy_active ? "yes" : "no"})

${bip ? `─── INTENDED STRATEGY (Big Idea Platform) ───
Topline Idea: ${bip.topline_idea || "(empty)"}
Brand Role: ${bip.brand_role || "(empty)"}
Cultural Tension: ${bip.cultural_tension || "(empty)"}
Propagation Mechanism: ${bip.propagation_mechanism || "(empty)"}
Media Idea: ${bip.media_idea || "(empty)"}
` : "(No Big Idea Platform exists yet for this campaign — diagnose against FRAME only; mark brand_role, cta_action_path and format_fit insufficient_input if BIP fields would normally ground them.)\n"}
─── CITED STRATEGIC BASIS SOURCES ───
${sourcesBlock}

Cultural framing permitted for this run: ${cultureOk ? "YES — a real OS Cultural Radar signal was cited above." : "NO — do not name or invent a specific cultural tension/signal; reason from brief/BIP inputs only."}

─── CULTURAL SIGNAL QUALITY LENS (cited signals) ───
${signalQualityBlock}

─── MARKET CULTURAL COVERAGE ───
${buildMarketCoverageBlock(marketCoverage)}

─── BRAND-COMMERCE CLASSIFICATION ───
${brandCommerceClassification ?? "(not classified)"} — commerce framing ${commerceOn ? "IS" : "is NOT"} appropriate for cta_action_path and commerce_pressure. ${commerceOn ? "" : "Use desired-response / belief-shift / behaviour-shift language, never purchase-action language."}

─── ASSET UNDER REVIEW ───
Maturity: ${maturityDef?.label ?? assetMaturity} — ${maturityDef?.desc ?? ""}
Description (as given by the strategist, verbatim):
${assetDescription || "(empty — cannot diagnose; mark every dimension insufficient_input)"}

─── DIMENSIONS TO DIAGNOSE ───
${dimensionsBlock}

─── PLATFORM SEAM ───
Also return platform_seam: platform_dependent (boolean) and platform_note (one sentence). This only flags whether this format's real-world effectiveness plausibly depends on platform-specific conditions (e.g. a short-form vertical video format is more platform-dependent than a static print ad) — it must NEVER assess what those conditions currently are or how the format would perform against them. That assessment is reserved for a later Platform Change / Format Efficacy Intelligence layer that does not exist yet.

Return only the structured tool call — no prose outside it.`;
}

// ─── Tool schema (forced structured output) ─────────────────────────────────

export function buildCreativeFormatReadTool() {
  return {
    name: "submit_creative_format_read",
    description: "Submit the 11-dimension creative format diagnosis plus the platform seam.",
    input_schema: {
      type: "object" as const,
      properties: {
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string", enum: CREATIVE_FORMAT_DIMENSIONS.map((d) => d.key) },
              observed_read: { type: "string" },
              rationale: { type: "string" },
              evidence_quality: { type: "string", enum: ["direct_evidence", "inference", "insufficient_evidence"] },
              status: { type: "string", enum: ["applicable", "not_applicable", "insufficient_input"] },
              strengthening_move: { type: "string" },
            },
            required: ["key", "observed_read", "rationale", "evidence_quality", "status", "strengthening_move"],
          },
          minItems: CREATIVE_FORMAT_DIMENSIONS.length,
          maxItems: CREATIVE_FORMAT_DIMENSIONS.length,
        },
        platform_seam: {
          type: "object",
          properties: {
            platform_dependent: { type: "boolean" },
            platform_note: { type: "string" },
          },
          required: ["platform_dependent", "platform_note"],
        },
      },
      required: ["dimensions", "platform_seam"],
    },
  };
}

// ─── Assemble the final result from model output ────────────────────────────
// Merges model output with server-enforced guardrail scrubbing and the
// asset-maturity confidence cap. This is the layer that makes "asset
// maturity must constrain confidence" true regardless of what the model
// itself claims — same non-negotiable-enforcement pattern as
// assembleSynthesisRoute in lib/strategic-synthesis.ts.

type RawDimensionOutput = {
  key: string;
  observed_read: string;
  rationale: string;
  evidence_quality: string;
  status: string;
  strengthening_move: string;
};

export function assembleCreativeFormatRead(
  modelDimensions: RawDimensionOutput[],
  modelPlatformSeam: { platform_dependent?: boolean; platform_note?: string } | undefined,
  assetMaturity: CreativeAssetMaturity
): CreativeFormatReadResult {
  const byKey = new Map(modelDimensions.map((d) => [d.key, d]));

  const dimensions: CreativeFormatDimensionResult[] = CREATIVE_FORMAT_DIMENSIONS.map((def) => {
    const m = byKey.get(def.key);
    const rawRead = m?.observed_read ?? "";
    const rawRationale = m?.rationale ?? "";
    const rawStrengthening = m?.strengthening_move ?? "";

    const status: CreativeFormatDiagnosisStatus =
      m?.status === "not_applicable" || m?.status === "insufficient_input" ? m.status : "applicable";

    let evidence_quality: SynthesisEvidenceQuality =
      m?.evidence_quality === "direct_evidence" || m?.evidence_quality === "inference"
        ? m.evidence_quality
        : "insufficient_evidence";

    // ── Guardrail scrub — server-side, checked across all free-text fields ──
    const combinedText = `${rawRead} ${rawRationale} ${rawStrengthening}`;
    const { clean, hits } = checkCreativeFormatGuardrails(combinedText);
    let observed_read = rawRead;
    let rationale = rawRationale;
    let strengthening_move = rawStrengthening;
    if (!clean) {
      evidence_quality = "insufficient_evidence";
      rationale = `${rationale} [Guardrail: flagged term(s) removed — ${hits.join(", ")}. Review before use.]`.trim();
      for (const hit of hits) {
        const re = new RegExp(hit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        observed_read = observed_read.replace(re, "[flagged]");
        rationale = rationale.replace(re, "[flagged]");
        strengthening_move = strengthening_move.replace(re, "[flagged]");
      }
    }

    // ── Asset-maturity confidence cap — server-side, never model-controlled ──
    // Only meaningful for dimensions actually being diagnosed — a
    // not_applicable or insufficient_input status has nothing to cap.
    if (status === "applicable") {
      const cap = capEvidenceQualityForMaturity(def.key, evidence_quality, assetMaturity);
      evidence_quality = cap.quality;
      if (cap.capped && cap.reason) {
        rationale = `${rationale} [Confidence capped: ${cap.reason}]`.trim();
      }
    }

    return {
      key: def.key,
      label: def.label,
      observed_read,
      rationale,
      evidence_quality,
      status,
      strengthening_move,
    };
  });

  return {
    asset_maturity: assetMaturity,
    dimensions,
    platform_seam: {
      platform_dependent: !!modelPlatformSeam?.platform_dependent,
      platform_note: modelPlatformSeam?.platform_note ?? "",
    },
  };
}

// ─── Plain-language strategist read ──────────────────────────────────────────
// Pure formatting, no second LLM call — renders the structured result into
// something a strategist can read in one pass. Never adds claims beyond
// what's in the structured result.

export function renderCreativeFormatReadSummary(
  result: CreativeFormatReadResult,
  campaignName: string
): string {
  const lines: string[] = [];
  lines.push(`Creative Format Read — ${campaignName}`);
  lines.push(`Asset maturity: ${ASSET_MATURITY_OPTIONS.find((m) => m.value === result.asset_maturity)?.label ?? result.asset_maturity}`);
  lines.push("");

  for (const d of result.dimensions) {
    if (d.status === "not_applicable") {
      lines.push(`${d.label}: not applicable to this asset.`);
      continue;
    }
    if (d.status === "insufficient_input") {
      lines.push(`${d.label}: not enough was given to diagnose this — ${d.rationale || "no detail supplied."}`);
      continue;
    }
    const confidenceLabel =
      d.evidence_quality === "direct_evidence" ? "directly observed" :
      d.evidence_quality === "inference" ? "inferred, not directly observed" :
      "low confidence — inputs too thin";
    lines.push(`${d.label} (${confidenceLabel}): ${d.observed_read}`);
    if (d.rationale) lines.push(`  Why: ${d.rationale}`);
    if (d.strengthening_move) lines.push(`  Could strengthen by: ${d.strengthening_move}`);
    lines.push("");
  }

  lines.push(
    result.platform_seam.platform_dependent
      ? `Platform note: this format's real-world effectiveness plausibly depends on current platform conditions (${result.platform_seam.platform_note || "not detailed"}) — not assessed here; reserved for a future Platform Change layer.`
      : "Platform note: this format doesn't especially depend on current platform conditions to be judged on the above."
  );

  return lines.join("\n");
}
