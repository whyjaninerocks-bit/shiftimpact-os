-- 0101: Brand-Commerce Diagnostic v0.1 backend foundation.
--
-- Two tables. brand_commerce_diagnostic is the strategist's diagnostic
-- record: rationale, commerce mechanic description, promotion pressure
-- notes, proof layer notes, brand meaning risk notes, and a one time
-- snapshot of what campaign_signal_maps.classification read at the moment
-- this diagnostic was written. classification_at_diagnosis is a snapshot
-- only. campaign_signal_maps.classification stays the single live source
-- of truth and this migration does not touch that table, its column, or
-- its check constraint — all 7 existing classification values (
-- not_classified, brand_builder, commerce_mover, promo_extractor,
-- brand_risk, inefficient_activity, conversion_blocked) are unchanged and
-- untouched. Nothing in this migration computes, defaults, or infers a
-- classification, an evidence_confidence value, a score, or a prediction.
--
-- brand_commerce_diagnostic_sources is the evidence layer, one row per
-- cited source, many rows per diagnostic. Shape follows the precedent
-- already proven on strategic_basis_sources (source_type, source_title,
-- source_note, source_url, created_by) rather than inventing a new
-- pattern. evidence_confidence, at both the diagnostic level and the per
-- source level, uses the same vocabulary already live in Strategic
-- Synthesis and Creative Format Read (direct_evidence, inference,
-- insufficient_evidence), not new labels.
--
-- RLS is enabled on both tables from creation, service_role only, no
-- permissive anon or authenticated policy — the posture campaign_signal_maps
-- already uses on purpose, and the posture migration 0100 had to retrofit
-- onto three earlier tables that shipped without it. Building these two
-- with it from the start avoids repeating that gap.
--
-- updated_at trigger pattern matches 0087 (strategic_basis_sources) and
-- 0088 (strategic_synthesis_runs): a dedicated update_<table>_updated_at()
-- function per table plus a BEFORE UPDATE trigger, not a shared generic
-- function. brand_commerce_diagnostic_sources has no updated_at column
-- (matches strategic_basis_sources' own created_by/created_at-only shape
-- for its evidence-style rows) and so gets no trigger.

CREATE TABLE brand_commerce_diagnostic (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id                    UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_signal_map_id         UUID REFERENCES campaign_signal_maps(id) ON DELETE SET NULL,
  classification_at_diagnosis    TEXT
    CHECK (
      classification_at_diagnosis IS NULL
      OR classification_at_diagnosis = ANY (ARRAY[
        'not_classified', 'brand_builder', 'commerce_mover',
        'promo_extractor', 'brand_risk', 'inefficient_activity',
        'conversion_blocked'
      ])
    ),
  classification_rationale       TEXT NOT NULL,
  commerce_mechanic_description  TEXT,
  promotion_pressure_notes       TEXT,
  proof_layer_notes              TEXT,
  brand_meaning_risk_notes       TEXT,
  evidence_confidence            TEXT
    CHECK (
      evidence_confidence IS NULL
      OR evidence_confidence = ANY (ARRAY['direct_evidence', 'inference', 'insufficient_evidence'])
    ),
  reviewed_by                    UUID,
  reviewed_at                    TIMESTAMPTZ,
  created_by                     UUID,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE brand_commerce_diagnostic ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON brand_commerce_diagnostic
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_brand_commerce_diagnostic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_commerce_diagnostic_updated_at
  BEFORE UPDATE ON brand_commerce_diagnostic
  FOR EACH ROW EXECUTE FUNCTION update_brand_commerce_diagnostic_updated_at();

CREATE TABLE brand_commerce_diagnostic_sources (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id                 UUID NOT NULL REFERENCES brand_commerce_diagnostic(id) ON DELETE CASCADE,
  campaign_id                   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_type                   TEXT NOT NULL
    CHECK (
      source_type = ANY (ARRAY[
        'cultural_signal', 'strategic_basis', 'client_supplied_context',
        'campaign_observation', 'commerce_mechanic',
        'platform_or_category_reference', 'learning_memory', 'strategist_note'
      ])
    ),
  source_title                  TEXT NOT NULL,
  source_note                   TEXT,
  source_url                    TEXT,
  cultural_signal_id            UUID REFERENCES cultural_signals(id) ON DELETE SET NULL,
  strategic_basis_source_id     UUID REFERENCES strategic_basis_sources(id) ON DELETE SET NULL,
  campaign_learning_record_id   UUID REFERENCES campaign_learning_records(id) ON DELETE SET NULL,
  evidence_confidence           TEXT
    CHECK (
      evidence_confidence IS NULL
      OR evidence_confidence = ANY (ARRAY['direct_evidence', 'inference', 'insufficient_evidence'])
    ),
  created_by                    UUID,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Signal integrity checks, same pattern strategic_basis_sources already
  -- uses (strategic_basis_sources_signal_id_required): a source claiming a
  -- given type must actually carry the linkage that type implies.
  CONSTRAINT bcds_cultural_signal_required
    CHECK (source_type <> 'cultural_signal' OR cultural_signal_id IS NOT NULL),
  CONSTRAINT bcds_strategic_basis_required
    CHECK (source_type <> 'strategic_basis' OR strategic_basis_source_id IS NOT NULL),
  CONSTRAINT bcds_learning_memory_required
    CHECK (source_type <> 'learning_memory' OR campaign_learning_record_id IS NOT NULL)
);

ALTER TABLE brand_commerce_diagnostic_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON brand_commerce_diagnostic_sources
  FOR ALL TO service_role USING (true) WITH CHECK (true);
