-- Migration 0102 — Quick Audits: ranked (multi) campaign phase + business objective
--
-- The /audit prospecting tool's intake previously captured exactly one
-- campaign_phase and one business_objective per audit. A client asked
-- whether a prospect audit can carry more than one of each, ranked by
-- priority. This adds new ordered-array columns alongside the existing
-- scalar columns (kept for backward compatibility with rows written
-- before this migration and any code path not yet updated), and backfills
-- the new columns from the old ones so no existing audit loses data.
--
-- Array index 0 = primary (highest priority), index 1 = secondary, etc.
-- This tool's campaign_phase/business_objective are confirmed isolated to
-- quick_audits — not read or written by the main campaign engine, FRAME
-- briefs, or any other table — so this change has no blast radius outside
-- this one table and the /audit route group.

ALTER TABLE quick_audits
  ADD COLUMN IF NOT EXISTS campaign_phases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_objectives TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: wrap each existing scalar value as a single-item ranked array.
UPDATE quick_audits
  SET campaign_phases = ARRAY[campaign_phase]
  WHERE campaign_phase IS NOT NULL
    AND campaign_phases = '{}';

UPDATE quick_audits
  SET business_objectives = ARRAY[business_objective]
  WHERE business_objective IS NOT NULL
    AND business_objective <> ''
    AND business_objectives = '{}';

-- ─── Verify ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'quick_audits' AND column_name = 'campaign_phases'
  ) = 1, 'quick_audits.campaign_phases missing';

  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'quick_audits' AND column_name = 'business_objectives'
  ) = 1, 'quick_audits.business_objectives missing';

  RAISE NOTICE 'Migration 0102 verified — quick_audits ranked phase/objective columns ready.';
END $$;
