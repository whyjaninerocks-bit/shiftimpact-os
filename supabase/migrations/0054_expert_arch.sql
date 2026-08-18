-- Migration 0054 — Expert Architecture Additions (Sprint 5)
-- ShiftImpact OS
--
-- Adds schema for:
--   1. Brand Health Battery: demand_investment_pct on frame_briefs
--      Tracks what % of each campaign's budget is Demand (brand-building) vs Activation.
--      Battery level computed at query time from rolling campaign history.
--
--   2. Campaign Learning Records (F18C)
--      End-of-campaign capture: what worked, what to change, pre-populated recommendations
--      for next brief. SOV:SOM point-in-time capture.
--
--   3. Audience Replenishment Rate
--      Manual weekly inputs: nurture pool size, weekly conversion count.
--      Pipeline horizon weeks = pool ÷ weekly conversions.
--      Red Flag auto-computed when horizon < 8 weeks.

-- ─── 1. Brand Health Battery: investment split on frame_briefs ─────────────────

ALTER TABLE frame_briefs
  ADD COLUMN IF NOT EXISTS demand_investment_pct INTEGER
    CHECK (demand_investment_pct IS NULL OR demand_investment_pct BETWEEN 0 AND 100);

-- ─── 2. Campaign Learning Records ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_learning_records (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id                  UUID        NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Core learnings
  what_worked                  TEXT        NOT NULL DEFAULT '',
  what_to_change               TEXT        NOT NULL DEFAULT '',
  signal_insights              TEXT        NOT NULL DEFAULT '',   -- which signals proved most predictive

  -- Pre-populated recommendations for next brief
  anchor_recommendation        TEXT        NOT NULL DEFAULT '',   -- recommended FRAME anchor direction
  kill_switch_recommendation   TEXT        NOT NULL DEFAULT '',   -- kill switch thresholds to carry forward
  channel_recommendation       TEXT        NOT NULL DEFAULT '',   -- channel mix recommendation
  budget_split_recommendation  TEXT        NOT NULL DEFAULT '',   -- demand vs activation split recommendation

  -- SOV:SOM point-in-time snapshot
  sov_pct                      NUMERIC(6,2),  -- Share of Voice %
  som_pct                      NUMERIC(6,2),  -- Share of Market %

  -- Transfer tracking
  transferred_at               TIMESTAMPTZ,   -- when this record was transferred to a new brief

  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE campaign_learning_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_learning_records"
  ON campaign_learning_records FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS campaign_learning_records_campaign_idx
  ON campaign_learning_records(campaign_id);

-- ─── 3. Audience Replenishment Rate ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audience_replenishment (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id               UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  week_number               INTEGER     NOT NULL CHECK (week_number >= 0),

  -- Manual inputs
  estimated_nurture_pool    INTEGER,     -- estimated people in nurture/awareness stage
  weekly_conversion_count   INTEGER,     -- conversions this week
  demand_new_audience       INTEGER,     -- new audience entering demand stage this week

  -- Notes
  notes                     TEXT        NOT NULL DEFAULT '',

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (campaign_id, week_number)
);

ALTER TABLE audience_replenishment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_replenishment"
  ON audience_replenishment FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS audience_replenishment_campaign_idx
  ON audience_replenishment(campaign_id);

-- ─── Verify ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'frame_briefs' AND column_name = 'demand_investment_pct'
  ) = 1, 'frame_briefs.demand_investment_pct missing';

  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'campaign_learning_records'
  ) = 1, 'campaign_learning_records table missing';

  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audience_replenishment'
  ) = 1, 'audience_replenishment table missing';

  RAISE NOTICE 'Migration 0054 verified — Expert Architecture schema ready.';
END $$;
