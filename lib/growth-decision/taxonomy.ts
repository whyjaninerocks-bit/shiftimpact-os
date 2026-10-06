// lib/growth-decision/taxonomy.ts
// Activation Blueprint V1 — controlled vocabularies.
//
// ShiftImpact specifies the JOB the execution must perform. It never writes the
// creative. Everything here is a job/role/structure label, never a script,
// concept, storyboard, casting or production instruction.

export const BEHAVIOURAL_JOBS = [
  "reduce_uncertainty",
  "increase_conviction",
  "improve_reason_to_choose",
  "increase_trust",
  "clarify_usage",
  "reduce_price_dependence",
  "convert_discovery_to_choice",
  "strengthen_repeat",
  "reduce_single_stimulus_reliance",
] as const;

export const CONTENT_ROLES = [
  "discovery",
  "education",
  "demonstration",
  "expert_reassurance",
  "testimonial",
  "usage",
  "comparison",
  "product_proof",
  "social_proof",
  "objection_handling",
  "conversion",
  "reminder",
  "offer",
] as const;

export const PROOF_TYPES = [
  "mechanism",
  "usage",
  "claim_credibility",
  "visible_result",
  "comparison",
  "objection_removal",
  "authority",
  "product_assignment",
] as const;

export const CREATOR_ROLES = [
  "authority",
  "credible_demonstration",
  "peer_reassurance",
  "social_proof",
  "discovery",
  "distribution",
  "comparison",
  "education",
  "conversion",
] as const;

export const ASSET_BEATS = [
  "problem",
  "explanation",
  "mechanism",
  "usage",
  "proof",
  "objection_resolution",
  "reason_to_believe",
  "personal_use",
  "product_choice",
  "cta",
] as const;

export const PLATFORM_ROLES = [
  "short_form_discovery",
  "compressed_proof",
  "deeper_education",
  "product_evaluation",
  "retargeting",
  "conversion",
  "product_assignment",
  "reassurance",
  "retention",
] as const;

export const COMMERCE_ROLES = [
  "product_assignment",
  "pdp_proof",
  "comparison",
  "offer",
  "handoff_to_purchase",
  "full_price_choice",
  "bundle",
  "retention",
  "repeat",
] as const;

export const TEST_ROLES = ["resolve", "strengthen", "explore"] as const;

/** Commercial moves. `inconclusive` is an outcome verdict, never a pre-test recommendation. */
export const MOVES = ["scale", "strengthen", "shift", "stop"] as const;
export const OUTCOME_MOVES = [...MOVES, "inconclusive"] as const;

/**
 * Test designs — what evidence strength a result can honestly carry.
 * Growth Driver tests must be commercially safe: reduce / vary / hold out /
 * match / split — never "remove the thing that works".
 */
export const TEST_DESIGNS = [
  "before_after",
  "matched_comparison",
  "holdout",
  "split_test",
  "randomised",
] as const;

export const CONFIDENCE = ["high", "medium", "directional"] as const;
export const BASIS = ["evidenced", "hypothesis"] as const;

/**
 * "Push the Brief" — the MECHANIC that makes proof more convincing than hygiene.
 * A mechanic is a strategic device, not an idea: ShiftImpact names the device and
 * the opportunity; the execution owner creates the expression.
 */
export const PROOF_MECHANICS = [
  "reveal",
  "contrast",
  "side_by_side",
  "stress_test",
  "diagnostic_explanation",
  "proof_stack",
  "before_after_logic",
  "decision_shortcut",
  "make_invisible_visible",
] as const;

export const EVIDENCE_CLASS = ["known", "unknown", "test_required"] as const;
export const EVIDENCE_MODES = [
  "indexed",
  "client_computed",
  "blind_result",
  "public_observation",
  "client_statement",
] as const;
export const EVIDENCE_GRADES = [
  "public_observation",
  "client_reported",
  "aggregated_indexed",
  "matched_comparison",
  "controlled_experiment",
  "randomised_experiment",
] as const;

export const UNITS = [
  "index",
  "pct_change",
  "pct_points",
  "ratio",
  "absolute",
  "pass_fail",
  "text",
] as const;

export const COMPARATORS = ["gte", "lte", "gt", "lt"] as const;
export const MEASURE_ROLES = ["primary", "guardrail"] as const;
export const EXECUTION_OWNER_TYPES = [
  "agency",
  "in_house",
  "commerce_partner",
  "media_partner",
  "specialist",
] as const;

export const TERRITORIES = ["commerce_leakage", "demand_quality"] as const;

export type BehaviouralJob = (typeof BEHAVIOURAL_JOBS)[number];
export type ContentRole = (typeof CONTENT_ROLES)[number];
export type ProofType = (typeof PROOF_TYPES)[number];
export type CreatorRole = (typeof CREATOR_ROLES)[number];
export type AssetBeat = (typeof ASSET_BEATS)[number];
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type CommerceRole = (typeof COMMERCE_ROLES)[number];
export type TestRole = (typeof TEST_ROLES)[number];
export type Move = (typeof MOVES)[number];
export type OutcomeMove = (typeof OUTCOME_MOVES)[number];
export type TestDesign = (typeof TEST_DESIGNS)[number];
export type Confidence = (typeof CONFIDENCE)[number];
export type Basis = (typeof BASIS)[number];
export type Territory = (typeof TERRITORIES)[number];

/**
 * Territory templates — configuration, not modules. Same loop, different
 * default lens, evidence checklist and guardrails. Market differences
 * (Malaysia etc.) later live in templates/triggers, not in code.
 */
export const TERRITORY_TEMPLATES: Record<
  Territory,
  {
    label: string;
    lens: string;
    evidence_checklist: string[];
    default_guardrails: string[];
    default_held_constant: string[];
    test_stance: string;
  }
> = {
  commerce_leakage: {
    label: "Commerce Leakage / Brand-Commerce Handoff",
    lens:
      "Interest exists but is not becoming product choice. Locate where interest breaks between exposure and purchase, and what the product page / content must prove at that point.",
    evidence_checklist: [
      "Traffic, PDP visits, add-to-cart, PDP-to-purchase (indexed, same base period)",
      "Discount depth and promotion level over the same period",
      "Stock availability for the SKUs in question",
      "Traffic source mix",
      "Public proof architecture on own vs competitor product pages",
      "Known objections / reasons for hesitation (if any exist)",
    ],
    default_guardrails: [
      "margin",
      "discount depth",
      "stock availability",
      "traffic mix / quality",
    ],
    default_held_constant: ["price", "discount", "audience", "stock", "media weight"],
    test_stance:
      "Vary the proof the shopper meets at the decision point; hold everything commercial constant; compare against a matched set.",
  },
  demand_quality: {
    label: "Growth Driver / Demand Quality",
    lens:
      "Movement exists. Establish what is actually carrying growth — and whether it is the kind of demand worth scaling — before committing more budget.",
    evidence_checklist: [
      "GMV / orders trend (indexed)",
      "Promotion, affiliate and discount intensity (indexed)",
      "New vs repeat customer mix",
      "Repeat / re-purchase rate",
      "Margin or contribution by channel",
      "Promo vs full-price order mix",
    ],
    default_guardrails: [
      "order volume retained",
      "contribution margin",
      "new-customer share",
      "brand demand signal (e.g. branded search)",
    ],
    default_held_constant: ["media weight", "price list", "stock", "creator roster"],
    test_stance:
      "Commercially safe only: reduce, vary, hold out, match or split-test promotion on a bounded comparison set. Never default to removing the thing that works across the whole business.",
  },
};
