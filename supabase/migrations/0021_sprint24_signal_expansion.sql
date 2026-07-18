-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0021 — Sprint 24: Signal 2B (Share Rate) + Gate Signal Convergence
-- ShiftImpact OS · 18 July 2026
--
-- Signal Gap Framework v2 Gate Logic:
--   Amber Gate = 1 behaviour signal above threshold (progress reportable, no budget release)
--   Green Gate = 2+ independent behaviour signals converging AND both holding
--   "Fires AND holds" — a spike from a prior week does not open the Gate today.
--   Budget releases ONLY on Gate: Green.
--
-- Signal 2B (TikTok Share Rate) is the second Tier 1 behaviour signal.
-- It is always tracked alongside Signal 2 (Save Rate) as an independent
-- confirmation signal. Two Nurture-stage signals both at Green = Gate opens.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. signal_weekly_reports — add Signal 2B + Gate Convergence fields
ALTER TABLE signal_weekly_reports
  ADD COLUMN IF NOT EXISTS signal_2b_actual_pct       NUMERIC,
  ADD COLUMN IF NOT EXISTS signal_2b_label             TEXT     DEFAULT 'TikTok share rate',
  ADD COLUMN IF NOT EXISTS signal_2b_health            TEXT     CHECK (signal_2b_health IN ('Green', 'Amber', 'Red')),
  ADD COLUMN IF NOT EXISTS gate_status                 TEXT     CHECK (gate_status IN ('Green', 'Amber', 'Red')),
  ADD COLUMN IF NOT EXISTS gate_signals_converging     INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gate_note                   TEXT;

-- 2. signal_thresholds — add Signal 2B pre-committed thresholds
--    Defaults: Green ≥5% share rate, Amber ≥3%, Red <3%
--    These are pre-committed targets, agreed with the client before launch.
ALTER TABLE signal_thresholds
  ADD COLUMN IF NOT EXISTS signal_2b_label             TEXT     DEFAULT 'TikTok share rate',
  ADD COLUMN IF NOT EXISTS signal_2b_target_pct        NUMERIC  DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS signal_2b_amber_pct         NUMERIC  DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS signal_2b_red_pct           NUMERIC  DEFAULT 1.0;

-- ─── Verify ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'signal_weekly_reports'
      AND column_name IN (
        'signal_2b_actual_pct', 'signal_2b_label', 'signal_2b_health',
        'gate_status', 'gate_signals_converging', 'gate_note'
      )
  ) = 6,
  'signal_weekly_reports: expected 6 new columns, found fewer';

  ASSERT (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'signal_thresholds'
      AND column_name IN (
        'signal_2b_label', 'signal_2b_target_pct', 'signal_2b_amber_pct', 'signal_2b_red_pct'
      )
  ) = 4,
  'signal_thresholds: expected 4 new columns, found fewer';

  RAISE NOTICE 'Migration 0021 verified — Signal 2B + Gate Convergence fields ready.';
END $$;
