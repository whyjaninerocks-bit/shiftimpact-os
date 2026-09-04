-- 0076_iq_evaluate_stage1_extended_fields.sql
-- SEA Marketing Effectiveness Intelligence KB — Stage 1: IQ Evaluate output
-- restructure. Additive only. Existing 6 rows, the live 8-dimension rubric,
-- and the existing route/UI behaviour are all untouched by this migration.
--
-- extended_evaluation: 7 genuinely new structured fields — business_challenge_clarity,
--   behaviour_to_move, market_category_tension, proof_logic, signal_plan, execution_risk,
--   decision_recommendation. Each stored as {value, claim_type}, claim_type one of:
--   source_supported | inference | hypothesis | recommendation | not_claimable_yet.
--   idea_strength / cultural_specificity / brand_role_credibility / ai_usefulness are
--   intentionally NOT stored here — they are exposed as response aliases onto the
--   existing 8-dimension rubric (overall_assessment / Cultural Permission / Brand Role /
--   Dual Audience Architecture) so the model never produces two separate opinions about
--   the same thing.
--
-- confidence_model: evidence_confidence, result_confidence, causal_confidence,
--   market_confidence, transferability_score. Defaults to the lowest-confidence value on
--   every dimension until kb_grounded is true — there is no case-study corpus yet to earn
--   a higher confidence than that.
--
-- kb_grounded: false until this evaluation actually drew on a verified case_studies /
--   effectiveness_formulas record from the SEA KB. Never imply award-case training or
--   calibration while this is false.
--
-- schema_version: 1 = pre-Stage-1 rows, 2 = this shape.

alter table iq_evaluations
  add column if not exists extended_evaluation jsonb not null default '{}'::jsonb,
  add column if not exists confidence_model    jsonb not null default '{}'::jsonb,
  add column if not exists kb_grounded         boolean not null default false,
  add column if not exists schema_version      smallint not null default 2;

-- Mark every row that predates this migration as schema_version 1. Safe/idempotent:
-- going forward the app always writes a non-empty confidence_model, so any row still
-- showing both fields empty is guaranteed to be a pre-Stage-1 row.
update iq_evaluations
set schema_version = 1
where extended_evaluation = '{}'::jsonb
  and confidence_model = '{}'::jsonb;

comment on column iq_evaluations.extended_evaluation is
  'Stage 1 SEA KB groundwork fields: business_challenge_clarity, behaviour_to_move, market_category_tension, proof_logic, signal_plan, execution_risk, decision_recommendation. Each {value, claim_type}. Overlapping concepts (idea_strength, cultural_specificity, brand_role_credibility, ai_usefulness) are deliberately NOT duplicated here.';
comment on column iq_evaluations.confidence_model is
  'evidence_confidence, result_confidence, causal_confidence, market_confidence, transferability_score. Defaults to Low / Not Stated / Not Claimable / Not Tested until kb_grounded is true.';
comment on column iq_evaluations.kb_grounded is
  'True only once this evaluation drew on verified case_studies/effectiveness_formulas records. False = rubric-only evaluation. Never imply award-case training/calibration while false.';
comment on column iq_evaluations.schema_version is
  '1 = pre-Stage-1 (8-dimension rubric only). 2 = includes extended_evaluation + confidence_model.';
