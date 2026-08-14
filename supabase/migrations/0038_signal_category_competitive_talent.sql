-- Migration 0038 — Extend signal_category to include Competitive + Talent
-- ShiftImpact OS · OIE Completion · 30 July 2026
--
-- The Growth Intelligence Layer KB v1.0 defines 7 signal categories:
--   1. Growth
--   2. Recognition
--   3. Milestone
--   4. Activation
--   5. Leadership
--   6. Competitive & Market Pressure  ← NEW
--   7. Talent & Capability Intelligence ← NEW
--
-- Migration 0027 only included categories 1–5.
-- This migration drops and recreates the CHECK constraint to add 6 & 7.

-- 1. Drop the existing constraint
ALTER TABLE business_signals
  DROP CONSTRAINT IF EXISTS business_signals_signal_category_check;

-- 2. Add the expanded constraint
ALTER TABLE business_signals
  ADD CONSTRAINT business_signals_signal_category_check
  CHECK (signal_category IN (
    'Growth',
    'Recognition',
    'Milestone',
    'Activation',
    'Leadership',
    'Competitive',
    'Talent'
  ));

-- 3. Verify
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.check_constraints
    WHERE constraint_name = 'business_signals_signal_category_check'
  ) = 1,
  'signal_category check constraint not found';
  RAISE NOTICE 'Migration 0038 verified — Competitive + Talent categories added.';
END $$;
