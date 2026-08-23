// lib/growth-sprint/types.ts
// Shared types for Growth Sprint Experience v1.
// Growth Sprint is a client-facing, operator-facilitated growth decision
// experience — NOT an intelligence engine, NOT a report generator.
// See docs discussion for full architecture rationale.

export type BusinessContext = "commerce" | "experience" | "service" | "custom";

export type EvidenceConfidence =
  | "Confirmed"
  | "Observed"
  | "Directional"
  | "Inferred"
  | "Missing";

export type DecisionOutcome = "Scale" | "Shift" | "Hold" | "Retest" | "Stop";

export type GrowthSprintStatus =
  | "draft"
  | "diagnosed"
  | "recommended"
  | "approved"
  | "published"
  | "revoked";

export interface GrowthMoment {
  id: string;
  customer: string;
  situation: string;
  trigger: string;
  need: string;
  behaviour: string;
  commercial_response: string;
}

export interface EvidenceTag {
  confidence: EvidenceConfidence;
  note?: string;
}

export type EvidenceTags = Record<string, EvidenceTag>; // keyed by GrowthMoment.id

export interface RankedOpportunity {
  moment_id: string;
  rank: number;
  rationale: string;
  supporting_evidence: string[];
  missing_evidence: string[];
}

export interface DiagnosisOutput {
  business_situation: string;
  growth_constraints: string[];
  opportunities: RankedOpportunity[];
  recommended_priority_moment_id: string;
}

export interface RecommendationOutput {
  // 1. Growth Hypothesis — what we believe is true about this opportunity,
  // stated explicitly as unproven. Distinct from the diagnosis rationale:
  // this is the specific bet the 30-day test is designed to check.
  growth_hypothesis: string;

  // 2. 30-Day Test
  thirty_day_test: string;
  target_audience: string;
  offer_intervention: string;
  conversion_path: string;
  evidence_signals: string[];

  // 3. Decision Rule — the forward-looking rule for interpreting results
  // once the test has actually run. Not a prediction of the outcome.
  decision_rule: string;

  // decision_outcome/decision_rationale describe the CURRENT, pre-test
  // state. Before a test has run, decision_outcome should almost always
  // be "Hold" — see STRICT RULES in lib/growth-sprint/recommend.ts.
  decision_rationale: string;
  decision_outcome: DecisionOutcome;
}

export interface ValidationFeedback {
  action_taken?: boolean;
  outcome_summary?: string;
  would_repeat_decision?: boolean;
  captured_at?: string; // ISO date
}

export interface GrowthSprint {
  id: string;
  business_name: string;
  business_location: string | null;
  business_context: BusinessContext | null; // optional operator selection only
  target_customer: string | null;

  growth_question: string;
  desired_outcome: string | null;
  current_obstacle: string | null;
  constraints_notes: string | null;

  revenue_pillars: string[];
  growth_moments: GrowthMoment[];
  evidence_tags: EvidenceTags;

  diagnosis_raw: DiagnosisOutput | null;
  diagnosis_reviewed: DiagnosisOutput | null;

  recommendation_raw: RecommendationOutput | null;
  recommendation_reviewed: RecommendationOutput | null;
  decision_outcome: DecisionOutcome | null;

  override_reason: string | null;
  validation_feedback: ValidationFeedback;

  status: GrowthSprintStatus;
  model_used: string | null;

  created_at: string;
  updated_at: string;
  approved_at: string | null;
  published_at: string | null;
  revoked_at: string | null;
}
