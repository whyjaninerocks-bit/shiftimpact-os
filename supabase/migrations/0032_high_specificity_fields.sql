-- Migration 0032: High-specificity intelligence fields
-- Upgrades prospect_insights with fields that make output pitch-ready rather than generic.
-- Also corrects aoai_recommended_offer enum to match the real Acquisition OS™ tier names.
-- ShiftImpact OS · July 2026

-- ─── Fix aoai_recommended_offer CHECK constraint (was set with wrong values in 0031) ─
-- Postgres names inline constraints as {table}_{column}_check
ALTER TABLE prospect_insights
  DROP CONSTRAINT IF EXISTS prospect_insights_aoai_recommended_offer_check;

ALTER TABLE prospect_insights
  ADD CONSTRAINT prospect_insights_aoai_recommended_offer_check
  CHECK (aoai_recommended_offer IN (
    'Acquisition OS Starter (P00)',
    'Acquisition OS Growth (P00-P03)',
    'Acquisition OS Full OS (All 6 Pillars)',
    'ActivationOS AI Lead Engine',
    'Not a fit'
  ));

-- ─── Topline fields ───────────────────────────────────────────────────────────
ALTER TABLE prospect_insights
  -- How many weeks until the business moment window closes
  ADD COLUMN IF NOT EXISTS decision_window_weeks   INTEGER,
  -- Budget availability signal based on evidence
  ADD COLUMN IF NOT EXISTS spend_signal            TEXT CHECK (spend_signal IN (
    'Budget likely available',
    'Budget possibly frozen',
    'Budget signal unclear'
  )),
  -- The specific first engagement offer, pitch-ready language
  ADD COLUMN IF NOT EXISTS first_engagement_offer  TEXT,
  -- The specific AOAI execution mechanic (not just the service label)
  ADD COLUMN IF NOT EXISTS aoai_campaign_mechanic  TEXT,
  -- The combined ShiftImpact + AOAI co-pitch angle
  ADD COLUMN IF NOT EXISTS aoai_joint_pitch        TEXT;

-- ─── Deep dive fields ─────────────────────────────────────────────────────────
ALTER TABLE prospect_insights
  -- The ONE thing to establish in the first meeting
  ADD COLUMN IF NOT EXISTS meeting_objective       TEXT,
  -- Why ShiftImpact specifically, not Publicis/BCG/a local agency
  ADD COLUMN IF NOT EXISTS competitive_moat        TEXT,
  -- Estimated engagement value range
  ADD COLUMN IF NOT EXISTS revenue_estimate        TEXT;
