-- Migration 0028: PIE Schema Completions (corrected)
-- signal_freshness_score, prospect_tier, prospect_scores additions, outreach Archived status
-- ShiftImpact OS · July 2026

-- ─── 1. signal_freshness_score on business_signals ───────────────────────────
ALTER TABLE business_signals
  ADD COLUMN IF NOT EXISTS signal_freshness_score numeric(4,3)
    NOT NULL DEFAULT 1.000
    CHECK (signal_freshness_score >= 0 AND signal_freshness_score <= 1);

UPDATE business_signals
SET signal_freshness_score = GREATEST(
  0,
  1.0 - (EXTRACT(EPOCH FROM (now() - detected_at)) / 86400 * 0.015)
)
WHERE detected_at < now() - INTERVAL '1 day';

CREATE OR REPLACE FUNCTION refresh_signal_freshness()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE business_signals
  SET signal_freshness_score = GREATEST(
    0,
    1.0 - (EXTRACT(EPOCH FROM (now() - detected_at)) / 86400 * 0.015)
  )
  WHERE detected_at < now() - INTERVAL '1 day';
END;
$$;

-- ─── 2. prospect_tier on companies ───────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS prospect_tier text
    CHECK (prospect_tier IN ('Tier 1 Hot', 'Tier 2 Warm', 'Tier 3 Watch'));

-- ─── 3. Add company_id + composite_score to prospect_scores ──────────────────
-- Scores live in prospect_scores (not prospect_assessments).
-- company_id added for direct lookup and trigger use without a join.
ALTER TABLE prospect_scores
  ADD COLUMN IF NOT EXISTS company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS composite_score numeric(5,1);

-- Back-fill company_id via assessment FK for any existing rows
UPDATE prospect_scores ps
SET company_id = pa.company_id
FROM prospect_assessments pa
WHERE ps.assessment_id = pa.id
  AND ps.company_id IS NULL;

CREATE INDEX IF NOT EXISTS prospect_scores_company
  ON prospect_scores (company_id, created_at DESC);

-- ─── 4. Auto-tier trigger — fires on prospect_scores INSERT ──────────────────
-- NOTE: trigger is on prospect_scores, NOT prospect_assessments.
-- prospect_assessments has no score columns — scores live in prospect_scores.
CREATE OR REPLACE FUNCTION update_prospect_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _company_id uuid;
  _composite  numeric;
  _tier       text;
BEGIN
  -- Get company_id: directly if populated, else via assessment FK
  _company_id := COALESCE(
    NEW.company_id,
    (SELECT company_id FROM prospect_assessments WHERE id = NEW.assessment_id)
  );

  _composite := (COALESCE(NEW.opportunity_score, 0) * 0.6)
              + (COALESCE(NEW.pursuit_score,     0) * 0.4);

  _tier := CASE
    WHEN _composite >= 75 THEN 'Tier 1 Hot'
    WHEN _composite >= 50 THEN 'Tier 2 Warm'
    ELSE                       'Tier 3 Watch'
  END;

  -- Write composite_score back to the inserted row
  UPDATE prospect_scores
  SET composite_score = _composite
  WHERE id = NEW.id;

  -- Update company tier
  IF _company_id IS NOT NULL THEN
    UPDATE companies
    SET prospect_tier = _tier
    WHERE id = _company_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_prospect_tier ON prospect_scores;
CREATE TRIGGER trg_update_prospect_tier
  AFTER INSERT ON prospect_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_tier();

-- ─── 5. Fix outreach status constraint — add Archived ────────────────────────
ALTER TABLE outreach
  DROP CONSTRAINT IF EXISTS outreach_status_check;

ALTER TABLE outreach
  ADD CONSTRAINT outreach_status_check
  CHECK (status IN ('Drafted','Approved','Sent','Replied','Meeting Booked','No Reply','Archived'));

-- ─── 6. os_settings ──────────────────────────────────────────────────────────
INSERT INTO os_settings (setting_key, setting_value, description)
VALUES
  ('pie_freshness_decay_rate', '0.015',
   'PIE signal freshness decay per day (0.015 = loses full score in ~67 days)'),
  ('pie_tier1_threshold', '75',
   'PIE composite score threshold for Tier 1 Hot'),
  ('pie_tier2_threshold', '50',
   'PIE composite score threshold for Tier 2 Warm (below = Tier 3 Watch)')
ON CONFLICT (setting_key) DO NOTHING;
