-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0022 — Sprint 25: Market Context + Signal 3B (VCR) + Signal 4 (Retention)
-- ShiftImpact OS · 18 July 2026
--
-- Three additions:
--
-- 1. market_code on signal_thresholds
--    MY / SG / PH / TH / ID — drives AI system prompt market context.
--    Attached to signal_thresholds (campaign-level signal config record)
--    rather than campaigns to avoid a separate campaign table migration.
--
-- 2. Signal 3B — Video Completion Rate (VCR)
--    Optional Demand-stage LEAD signal. TikTok-native.
--    NOT a primary Gate signal. Supplementary to Gate if entered.
--    Defaults: Green ≥70%, Amber ≥50%, Red <50%
--
-- 3. Signal 4 — Retention
--    LAG signal — repeat visit / re-engagement rate.
--    NOT a Gate signal (LAG signals confirm what happened, not what's coming).
--    GrabAds API is the upgrade path. Manual entry for now.
--    Defaults: Green ≥15%, Amber ≥8%, Red <8%
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. signal_thresholds — market_code + Signal 3B + Signal 4 thresholds
ALTER TABLE signal_thresholds
  ADD COLUMN IF NOT EXISTS market_code              TEXT    DEFAULT 'MY'
    CHECK (market_code IN ('MY', 'SG', 'PH', 'TH', 'ID')),

  -- Signal 3B — Video Completion Rate (VCR)
  ADD COLUMN IF NOT EXISTS signal_3b_label          TEXT    DEFAULT 'Video completion rate',
  ADD COLUMN IF NOT EXISTS signal_3b_target_pct     NUMERIC DEFAULT 70.0,
  ADD COLUMN IF NOT EXISTS signal_3b_amber_pct      NUMERIC DEFAULT 50.0,
  ADD COLUMN IF NOT EXISTS signal_3b_red_pct        NUMERIC DEFAULT 30.0,

  -- Signal 4 — Retention / Repeat Visit Rate
  ADD COLUMN IF NOT EXISTS signal_4_label           TEXT    DEFAULT 'Retention / repeat visit rate',
  ADD COLUMN IF NOT EXISTS signal_4_target_pct      NUMERIC DEFAULT 15.0,
  ADD COLUMN IF NOT EXISTS signal_4_amber_pct       NUMERIC DEFAULT 8.0,
  ADD COLUMN IF NOT EXISTS signal_4_red_pct         NUMERIC DEFAULT 3.0;

-- 2. signal_weekly_reports — Signal 3B + Signal 4 actuals + health
ALTER TABLE signal_weekly_reports
  ADD COLUMN IF NOT EXISTS signal_3b_actual_pct     NUMERIC,
  ADD COLUMN IF NOT EXISTS signal_3b_label          TEXT    DEFAULT 'Video completion rate',
  ADD COLUMN IF NOT EXISTS signal_3b_health         TEXT    CHECK (signal_3b_health IN ('Green', 'Amber', 'Red')),
  ADD COLUMN IF NOT EXISTS signal_4_actual_pct      NUMERIC,
  ADD COLUMN IF NOT EXISTS signal_4_label           TEXT    DEFAULT 'Retention / repeat visit rate',
  ADD COLUMN IF NOT EXISTS signal_4_health          TEXT    CHECK (signal_4_health IN ('Green', 'Amber', 'Red'));

-- ─── Verify ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'signal_thresholds'
      AND column_name IN (
        'market_code',
        'signal_3b_label', 'signal_3b_target_pct', 'signal_3b_amber_pct', 'signal_3b_red_pct',
        'signal_4_label', 'signal_4_target_pct', 'signal_4_amber_pct', 'signal_4_red_pct'
      )
  ) = 9,
  'signal_thresholds: expected 9 new columns (market_code + 3B + 4), found fewer';

  ASSERT (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'signal_weekly_reports'
      AND column_name IN (
        'signal_3b_actual_pct', 'signal_3b_label', 'signal_3b_health',
        'signal_4_actual_pct', 'signal_4_label', 'signal_4_health'
      )
  ) = 6,
  'signal_weekly_reports: expected 6 new columns (3B + 4), found fewer';

  RAISE NOTICE 'Migration 0022 verified — market_code + Signal 3B (VCR) + Signal 4 (Retention) ready.';
END $$;
