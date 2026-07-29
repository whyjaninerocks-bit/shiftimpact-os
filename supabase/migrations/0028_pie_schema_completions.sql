-- Migration 0028: PIE Schema Completions
-- signal_freshness_score + prospect_tier + auto-tier trigger
-- ShiftImpact OS · July 2026

-- ─── 1. signal_freshness_score on business_signals ───────────────────────────
-- Decay: 1.0 at detection, -0.015/day, floor 0.0
-- Used by assessment ranking to weight stale signals down

ALTER TABLE business_signals
  ADD COLUMN IF NOT EXISTS signal_freshness_score numeric(4,3)
    NOT NULL DEFAULT 1.000
    CHECK (signal_freshness_score >= 0 AND signal_freshness_score <= 1);

-- Back-fill existing rows: compute decay from detected_at
UPDATE business_signals
SET signal_freshness_score = GREATEST(
  0,
  1.0 - (EXTRACT(EPOCH FROM (now() - detected_at)) / 86400 * 0.015)
)
WHERE signal_freshness_score = 1.000
  AND detected_at < now() - INTERVAL '1 day';

-- Scheduled refresh via cron would re-run this; for v1 recompute at scan time
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
-- 'Tier 1 Hot' | 'Tier 2 Warm' | 'Tier 3 Watch' | NULL (unassessed)
-- Derived from latest assessment: opportunity_score*0.6 + pursuit_score*0.4

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS prospect_tier text
    CHECK (prospect_tier IN ('Tier 1 Hot', 'Tier 2 Warm', 'Tier 3 Watch'));

-- ─── 3. Auto-tier trigger — fires after each assessment INSERT/UPDATE ─────────
CREATE OR REPLACE FUNCTION update_prospect_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _composite numeric;
  _tier text;
BEGIN
  -- Composite score: opportunity weighted 60%, pursuit 40%
  _composite := (COALESCE(NEW.opportunity_score, 0) * 0.6)
              + (COALESCE(NEW.pursuit_score,     0) * 0.4);

  _tier := CASE
    WHEN _composite >= 75 THEN 'Tier 1 Hot'
    WHEN _composite >= 50 THEN 'Tier 2 Warm'
    ELSE                       'Tier 3 Watch'
  END;

  UPDATE companies
  SET    prospect_tier = _tier
  WHERE  id = NEW.company_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_prospect_tier ON prospect_assessments;
CREATE TRIGGER trg_update_prospect_tier
  AFTER INSERT OR UPDATE OF opportunity_score, pursuit_score
  ON prospect_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_tier();

-- ─── 4. prospect_scores — ensure append-only constraint comment ───────────────
-- Table already created in migration 0027; no column changes needed.
-- Reminder: never UPDATE rows in prospect_scores — INSERT only.
COMMENT ON TABLE prospect_scores IS
  'Append-only score history. Never UPDATE rows. One INSERT per assessment.';

-- ─── 5. os_settings — freshness decay rate (configurable) ────────────────────
INSERT INTO os_settings (setting_key, setting_value, description)
VALUES
  ('pie_freshness_decay_rate', '0.015',
   'PIE signal freshness decay per day (0.015 = loses full score in ~67 days)'),
  ('pie_tier1_threshold',      '75',
   'PIE composite score threshold for Tier 1 Hot'),
  ('pie_tier2_threshold',      '50',
   'PIE composite score threshold for Tier 2 Warm (below = Tier 3 Watch)')
ON CONFLICT (setting_key) DO NOTHING;
