-- 0104: Brand-Commerce Diagnostic — Phase 2 client-stage bridge.
--
-- Additive only. Every column below is nullable; no existing row, query, or
-- component is affected until the new promotion/review/outcome actions
-- (lib/actions.ts) write to them. brand_commerce_diagnostic remains the
-- same append-only-for-diagnosis table it always was — this migration does
-- not add an update path for classification_rationale, commerce_mechanic_
-- description, promotion_pressure_notes, proof_layer_notes, or
-- brand_meaning_risk_notes. Those stay exactly as they behaved before this
-- migration: written once at INSERT, never edited.
--
-- source_audit_id is a plain UUID, not a foreign key. quick_audits (the
-- prospect /audit table) and brand_commerce_diagnostic have never had a
-- relationship, quick_audits carries no retention guarantee tied to
-- campaigns, and the whole Brand-Commerce architecture's standing rule is
-- that the three layers (prospect /audit, campaign_signal_maps.classification,
-- brand_commerce_diagnostic) are never merged or hard-linked. A soft
-- reference preserves traceability (see prospect_hypothesis_snapshot below)
-- without coupling the tables' lifecycles.
--
-- prospect_hypothesis_snapshot is written once, at promotion time, by
-- promoteProspectAuditToDiagnostic — no other action in lib/actions.ts
-- touches this column. That is the actual immutability mechanism here
-- (same as classification_at_diagnosis being a one-time snapshot already):
-- there simply is no update path, not a database-level constraint.
--
-- The reviewed_* fields represent what the strategist has actually reviewed
-- and stands behind for section 2/3 of the bridge (decision, intervention,
-- test). updateBrandCommerceDiagnosticReview() may write these only while
-- reviewed_at IS NULL — once markBrandCommerceDiagnosticReviewed() sets
-- reviewed_at, that action refuses further writes (frozen record). A
-- materially changed strategist interpretation after review means writing a
-- NEW diagnostic row via the existing createBrandCommerceDiagnostic /
-- promoteProspectAuditToDiagnostic pattern, never editing the reviewed one.
--
-- validation_status/outcome_* are a distinct, later stage of the same
-- record — captured only after a test has actually run, which by
-- definition happens after review. They are therefore NOT subject to the
-- reviewed_at freeze; updateBrandCommerceDiagnosticOutcome() may write them
-- at any time. A CHECK constraint (not a new enum type) matches the
-- existing classification_at_diagnosis / evidence_confidence precedent in
-- this table rather than inventing a new pattern.

ALTER TABLE brand_commerce_diagnostic
  ADD COLUMN source_audit_id UUID,
  ADD COLUMN prospect_hypothesis_snapshot JSONB,

  ADD COLUMN reviewed_decision_implication TEXT,
  ADD COLUMN reviewed_intervention TEXT,

  ADD COLUMN reviewed_test_hypothesis TEXT,
  ADD COLUMN reviewed_test_plan TEXT,
  ADD COLUMN reviewed_test_evidence_required TEXT,
  ADD COLUMN reviewed_test_success_signal TEXT,
  ADD COLUMN reviewed_test_failure_signal TEXT,
  ADD COLUMN reviewed_test_decision_rule TEXT,

  ADD COLUMN validation_status TEXT
    CHECK (
      validation_status IS NULL
      OR validation_status = ANY (ARRAY[
        'not_tested', 'supported', 'partially_supported', 'not_supported', 'inconclusive'
      ])
    ),
  ADD COLUMN outcome_summary TEXT,
  ADD COLUMN outcome_evidence TEXT,
  ADD COLUMN next_decision TEXT,
  ADD COLUMN outcome_captured_at TIMESTAMPTZ;

-- Duplicate-promotion guard: the same prospect audit should not silently
-- create more than one diagnostic on the same campaign. Partial unique
-- index (not a full UNIQUE constraint) so NULL source_audit_id — every
-- diagnostic written the old way, and any future diagnostic not promoted
-- from a prospect audit — is completely unaffected.
CREATE UNIQUE INDEX brand_commerce_diagnostic_source_audit_campaign_uq
  ON brand_commerce_diagnostic (campaign_id, source_audit_id)
  WHERE source_audit_id IS NOT NULL;
