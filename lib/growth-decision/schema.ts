// lib/growth-decision/schema.ts
// Activation Blueprint V1 — structured shapes and validators.
//
// content = { stage1, stage2, stage3, outcome?, next? }
//   stage1  → evidence read, competing explanations, decision      (AI, strategist-approved)
//   stage2  → the Activation Blueprint proper (job, proof, roles…)  (AI, strategist-approved)
//   stage3  → test design, held-constant, structured measures, rule (AI, strategist-approved)
//   outcome → authored in the demo (readings, delivery, held-constant check)
//   next    → authored in the demo (next decision). No AI route yet.
//
// Every specific recommendation carries `basis: evidenced | hypothesis`.
// `evidenced` is only valid if it cites at least one real evidence id — enforced
// in lint.ts (auto-downgraded to hypothesis otherwise).

import {
  arr,
  bool,
  nullable,
  num,
  obj,
  oneOf,
  optional,
  str,
  type Infer,
} from "./validate";
import {
  ASSET_BEATS,
  BASIS,
  BEHAVIOURAL_JOBS,
  COMMERCE_ROLES,
  COMPARATORS,
  CONFIDENCE,
  CONTENT_ROLES,
  CREATOR_ROLES,
  EVIDENCE_CLASS,
  EVIDENCE_GRADES,
  EVIDENCE_MODES,
  EXECUTION_OWNER_TYPES,
  MEASURE_ROLES,
  MOVES,
  OUTCOME_MOVES,
  PLATFORM_ROLES,
  PROOF_MECHANICS,
  PROOF_TYPES,
  TERRITORIES,
  TEST_DESIGNS,
  TEST_ROLES,
  UNITS,
} from "./taxonomy";
import { STRATEGIC_MOVE_IDS } from "./strategic-moves";

const ids = () => optional(arr(str({ min: 1 })), [] as string[]);

// ─── Inputs (seeded for the demo; intake UI is a named-pilot item) ──────────

export const EvidenceItemV = obj({
  id: str({ min: 1 }),
  label: str({ min: 2 }),
  mode: oneOf(EVIDENCE_MODES),
  class: oneOf(EVIDENCE_CLASS),
  grade: oneOf(EVIDENCE_GRADES),
  metric_key: optional(str(), ""),
  base_period: optional(str(), ""),
  baseline: nullable(num()),
  current: nullable(num()),
  unit: oneOf(UNITS),
  text: optional(str(), ""),
  source_label: str({ min: 2 }),
  source_date: str({ min: 4 }),
  owner: str({ min: 2 }),
});

export const InputsV = obj({
  brand_label: str({ min: 2 }),
  category: str({ min: 2 }),
  market: str({ min: 2 }),
  territory: oneOf(TERRITORIES),
  execution_owner: obj({ label: str({ min: 2 }), type: oneOf(EXECUTION_OWNER_TYPES) }),
  commercial_pressure: str({ min: 10 }),
  decision_question: str({ min: 10 }),
  decision_owner: str({ min: 2 }),
  objective: str({ min: 10 }),
  evidence: arr(EvidenceItemV, { min: 1 }),
  calendar: optional(
    arr(obj({ label: str({ min: 2 }), window: str({ min: 2 }), effect: str({ min: 2 }) })),
    [] as { label: string; window: string; effect: string }[],
  ),
  holdable: optional(arr(str({ min: 1 })), [] as string[]),
  not_holdable: optional(arr(str({ min: 1 })), [] as string[]),
  client_constraints: optional(arr(str({ min: 1 })), [] as string[]),
});

// ─── Stage 1 — evidence read, competing explanations, decision ──────────────

const ClaimV = obj({ text: str({ min: 5 }), evidence_ids: ids() });
const CiteV = obj({ evidence_id: str({ min: 1 }), why: str({ min: 5 }) });

export const ExplanationV = obj({
  id: str({ min: 1 }),
  statement: str({ min: 15 }),
  primary: bool(),
  supports: optional(arr(CiteV), [] as Infer<typeof CiteV>[]),
  contradicts: optional(arr(CiteV), [] as Infer<typeof CiteV>[]),
  falsified_if: str({ min: 15 }),
  basis: oneOf(BASIS),
});

export const Stage1V = obj({
  evidence_read: obj({
    known: arr(ClaimV),
    inferred: arr(ClaimV),
    unknown: arr(ClaimV),
    test_required: arr(ClaimV),
  }),
  explanations: arr(ExplanationV, { min: 2, max: 4 }),
  test_role: oneOf(TEST_ROLES),
  decision: obj({
    move: oneOf(MOVES),
    headline: str({ min: 10 }),
    rationale: str({ min: 30 }),
    confidence: oneOf(CONFIDENCE),
    what_changes: arr(str({ min: 5 }), { min: 1 }),
    what_stays: arr(str({ min: 3 }), { min: 1 }),
    cannot_conclude: arr(str({ min: 10 }), { min: 1 }),
  }),
});

// ─── Stage 2 — the Activation Blueprint ─────────────────────────────────────

// "Push the Brief": where the execution can create an ADVANTAGE beyond category
// hygiene. ShiftImpact defines the opportunity for distinctiveness; the execution
// owner creates the expression. Nothing here is a concept, script, storyboard,
// casting, visual idea or copy.
export const PushTheBriefV = obj({
  // What a competent execution in this category does anyway.
  category_hygiene: arr(str({ min: 15 }), { min: 2, max: 5 }),
  // What competitors are EVIDENCED to do that this brand must match. Parity is
  // catch-up, never an edge.
  parity_catchup: optional(
    arr(obj({ item: str({ min: 15 }), evidence_ids: ids() }), { max: 4 }),
    [] as { item: string; evidence_ids: string[] }[],
  ),
  // Only moves that go BEYOND parity.
  strategic_edge: arr(
    obj({
      edge: str({ min: 20 }),
      beyond_parity: str({ min: 20 }),
      why_stronger: str({ min: 20 }),
      basis: oneOf(BASIS),
      evidence_ids: ids(),
    }),
    { min: 1, max: 3 },
  ),
  // Selected / adapted / combined from the curated seed library
  // (strategic-moves.ts). Never the seed label unchanged.
  strategic_move: obj({
    seeds_used: arr(oneOf(STRATEGIC_MOVE_IDS), { min: 1, max: 2 }),
    adapted_statement: str({ min: 30 }),
    how_adapted: str({ min: 30 }),
    evidence_for_choosing: str({ min: 20 }),
    cannot_solve: str({ min: 15 }),
    basis: oneOf(BASIS),
    evidence_ids: ids(),
  }),
  proof_mechanic: obj({
    mechanic: oneOf(PROOF_MECHANICS),
    secondary: optional(arr(oneOf(PROOF_MECHANICS), { max: 2 }), [] as (typeof PROOF_MECHANICS)[number][]),
    statement: str({ min: 25 }),
    what_it_makes_visible: str({ min: 15 }),
    limit: str({ min: 10 }),
    basis: oneOf(BASIS),
    evidence_ids: ids(),
  }),
  creative_challenge: str({ min: 25 }),
  avoid: arr(obj({ default: str({ min: 5 }), why_weak: str({ min: 15 }) }), { min: 3, max: 6 }),
  stretch_territories: arr(
    obj({
      name: str({ min: 3, max: 60 }),
      direction: str({ min: 25 }),
      tension: str({ min: 25 }), // the specific tension in THIS case that generated it
      beyond_parity: str({ min: 20 }),
      built_from: arr(oneOf(STRATEGIC_MOVE_IDS), { min: 1, max: 2 }),
      must_be_true: arr(str({ min: 10 }), { min: 1, max: 4 }),
      cannot_solve: str({ min: 15 }),
      differs_from_others: str({ min: 20 }),
      why_not_hygiene: str({ min: 25 }),
      basis: oneOf(BASIS),
      evidence_ids: ids(),
    }),
    { min: 2, max: 3 },
  ),
});

export const Stage2V = obj({
  behavioural_job: obj({
    primary: oneOf(BEHAVIOURAL_JOBS),
    secondary: optional(arr(oneOf(BEHAVIOURAL_JOBS), { max: 2 }), [] as (typeof BEHAVIOURAL_JOBS)[number][]),
    statement: str({ min: 20 }),
    basis: oneOf(BASIS),
    evidence_ids: ids(),
  }),
  intervention: obj({
    statement: str({ min: 20 }),
    controlled_variable: str({ min: 3 }),
    preservation_constraints: arr(obj({ item: str({ min: 2 }), why: str({ min: 5 }) }), { min: 2 }),
    basis: oneOf(BASIS),
    evidence_ids: ids(),
  }),
  content_roles: arr(
    obj({
      role: oneOf(CONTENT_ROLES),
      job: str({ min: 20 }),
      basis: oneOf(BASIS),
      evidence_ids: ids(),
    }),
    { min: 1, max: 3 },
  ),
  proof_required: arr(
    obj({
      proof: oneOf(PROOF_TYPES),
      must_show: str({ min: 25 }),
      basis: oneOf(BASIS),
      evidence_ids: ids(),
    }),
    { min: 2, max: 5 },
  ),
  creator_role: obj({
    applicable: bool(),
    role: nullable(oneOf(CREATOR_ROLES)),
    not_role: nullable(oneOf(CREATOR_ROLES)),
    job: str({ min: 10 }),
    selection_criteria: optional(arr(str({ min: 5 })), [] as string[]),
    basis: oneOf(BASIS),
  }),
  asset_architecture: obj({
    beats: arr(obj({ beat: oneOf(ASSET_BEATS), job: str({ min: 10 }) }), { min: 4, max: 9 }),
    rationale: str({ min: 20 }),
  }),
  platform_roles: arr(
    obj({ environment: str({ min: 2 }), role: oneOf(PLATFORM_ROLES), job: str({ min: 10 }) }),
    { min: 1, max: 4 },
  ),
  commerce_roles: optional(
    arr(
      obj({
        role: oneOf(COMMERCE_ROLES),
        job: str({ min: 10 }),
        controlled_by: str({ min: 2 }),
      }),
      { max: 4 },
    ),
    [] as { role: (typeof COMMERCE_ROLES)[number]; job: string; controlled_by: string }[],
  ),
  // The questions an execution team would otherwise come back with. Each must
  // choose a side and name the alternative it rejected.
  execution_choices: arr(
    obj({
      question: str({ min: 10 }),
      recommended: str({ min: 10 }),
      why: str({ min: 20 }),
      alternative_not_chosen: str({ min: 5 }),
      basis: oneOf(BASIS),
      evidence_ids: ids(),
    }),
    { min: 3, max: 6 },
  ),
  execution_owner_asks: arr(str({ min: 10 }), { min: 2, max: 6 }),
  // Optional at parse time so rows drafted before this layer still load; the
  // drafting route (draft.ts) REQUIRES it for any newly drafted Stage 2.
  push_the_brief: nullable(PushTheBriefV),
});

// ─── Stage 3 — test design, structured measures, decision rule ──────────────

export const MeasureV = obj({
  key: str({ min: 2 }),
  role: oneOf(MEASURE_ROLES),
  label: str({ min: 3 }),
  definition: str({ min: 10 }),
  unit: oneOf(UNITS),
  baseline: nullable(num()),
  baseline_source: nullable(str()),
  comparator: oneOf(COMPARATORS),
  threshold: nullable(num()),
  threshold_status: oneOf(["proposed", "needs_client_input"] as const),
  failure_condition: str({ min: 10 }),
});

export const Stage3V = obj({
  test: obj({
    role: oneOf(TEST_ROLES),
    design: oneOf(TEST_DESIGNS),
    design_rationale: str({ min: 20 }),
    treatment: str({ min: 10 }),
    comparison: str({ min: 10 }),
    duration_weeks: num(),
    calendar_confounds: optional(
      arr(obj({ event: str({ min: 2 }), risk: str({ min: 5 }), mitigation: str({ min: 5 }) })),
      [] as { event: string; risk: string; mitigation: string }[],
    ),
    held_constant: arr(obj({ item: str({ min: 2 }), how_verified: str({ min: 5 }) }), { min: 2 }),
  }),
  measures: arr(MeasureV, { min: 3, max: 7 }),
  signals: obj({
    success: str({ min: 15 }),
    failure: str({ min: 15 }),
    inconclusive: str({ min: 15 }),
  }),
  decision_rule: obj({
    statement: str({ min: 30 }),
    on_pass: oneOf(MOVES),
    on_fail: oneOf(MOVES),
  }),
});

// ─── Outcome + next (authored for the demo; reconcile.ts reads these) ───────

export const OutcomeV = obj({
  is_illustrative: bool(),
  readings: arr(
    obj({
      measure_key: str({ min: 2 }),
      value: nullable(num()),
      passed: nullable(bool()),
    }),
  ),
  treatment_delivered: nullable(bool()),
  deviations: optional(arr(str({ min: 3 })), [] as string[]),
  held_constant_check: arr(
    obj({ item: str({ min: 2 }), status: oneOf(["held", "breached", "unknown"] as const) }),
  ),
  interpretation: str({ min: 20 }),
});

export const NextV = obj({
  is_authored: bool(),
  move: oneOf(OUTCOME_MOVES),
  rationale: str({ min: 20 }),
  next_question: str({ min: 10 }),
  test_role: oneOf(TEST_ROLES),
});

export type Inputs = Infer<typeof InputsV>;
export type EvidenceItem = Infer<typeof EvidenceItemV>;
export type Stage1 = Infer<typeof Stage1V>;
export type Stage2 = Infer<typeof Stage2V>;
export type Stage3 = Infer<typeof Stage3V>;
export type Measure = Infer<typeof MeasureV>;
export type Outcome = Infer<typeof OutcomeV>;
export type Next = Infer<typeof NextV>;

export type BlueprintContent = {
  stage1?: Stage1;
  stage2?: Stage2;
  stage3?: Stage3;
  outcome?: Outcome;
  next?: Next;
};

export type StageMeta = {
  drafted_at: string;
  model: string;
  attempts: number;
  lint_warnings: string[];
  downgraded_to_hypothesis: string[];
};

export type BlueprintRow = {
  id: string;
  title: string;
  territory: string;
  market: string;
  execution_owner_label: string | null;
  execution_owner_type: string | null;
  is_demo: boolean;
  schema_version: number;
  inputs: unknown;
  content: BlueprintContent;
  stages: Record<string, StageMeta | undefined>;
  created_at: string;
  updated_at: string;
};
