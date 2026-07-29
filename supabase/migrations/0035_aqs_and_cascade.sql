-- Migration 0035 — F25 Attention Quality Score + F28 Social Proof Cascade Detection
-- ShiftImpact OS · Sprint 5
--
-- F25: AQS columns added to signal_media_delivery.
--   AQS is computed from video view rate data (3s, 10s, completion).
--   AQS score and band are INTERNAL ONLY.
--   Client sees: attention gap flag action in plain language only.
--
-- F28: social_proof_cascade table for UGC velocity + comment ratio tracking.
--   Cascade Status: NO CASCADE / EARLY SIGNAL / CASCADE ACTIVE / CASCADE PEAK
--   CASCADE ACTIVE triggers an in-app alert for Janine only — no client notification.

-- ─── F25: AQS columns on signal_media_delivery ───────────────────────────────

ALTER TABLE signal_media_delivery
  -- Video view rate inputs (manual entry from ad platform dashboards)
  ADD COLUMN IF NOT EXISTS view_rate_3s_pct       NUMERIC(6,2),   -- % impressions with 3+ sec view
  ADD COLUMN IF NOT EXISTS view_rate_10s_pct      NUMERIC(6,2),   -- % impressions with 10+ sec view
  ADD COLUMN IF NOT EXISTS completion_rate_pct    NUMERIC(6,2),   -- % who watched full video

  -- AQS outputs (INTERNAL ONLY)
  ADD COLUMN IF NOT EXISTS aqs_score              NUMERIC(6,2),   -- 0–100 weighted attention score
  ADD COLUMN IF NOT EXISTS aqs_band               TEXT            -- "Attention Strong" / "Attention Adequate" / "Attention Weak" / "Attention Gap"
    CHECK (aqs_band IN ('Attention Strong', 'Attention Adequate', 'Attention Weak', 'Attention Gap')),
  ADD COLUMN IF NOT EXISTS attention_gap_flag     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attention_gap_action   TEXT NOT NULL DEFAULT '',  -- specific named action when flag fires
  ADD COLUMN IF NOT EXISTS aqs_benchmark_delta    NUMERIC(6,2),   -- AQS vs category benchmark (positive = above, negative = below)
  ADD COLUMN IF NOT EXISTS aqs_prev_week_delta    NUMERIC(6,2);   -- AQS vs previous week

-- ─── F28: social_proof_cascade ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_proof_cascade (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID          NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  week_number           INTEGER       NOT NULL CHECK (week_number >= 0),

  -- UGC velocity inputs (from Signal 3 / social listening)
  ugc_volume_this_week  INTEGER,                  -- total UGC posts this week
  ugc_volume_last_week  INTEGER,                  -- previous week volume
  comment_count         INTEGER,                  -- total comments on brand content
  post_count            INTEGER,                  -- total brand posts (for comment ratio)

  -- Computed outputs
  velocity_acceleration NUMERIC(8,4),             -- WoW growth rate change (this week / last week)
  comment_to_post_ratio NUMERIC(8,4),             -- comments ÷ posts
  cascade_status        TEXT NOT NULL DEFAULT 'NO CASCADE'
    CHECK (cascade_status IN ('NO CASCADE', 'EARLY SIGNAL', 'CASCADE ACTIVE', 'CASCADE PEAK')),
  cascade_alert_sent    BOOLEAN NOT NULL DEFAULT FALSE,  -- tracks if Janine was notified

  -- AI-generated amplification window recommendation (INTERNAL)
  amplification_window  TEXT NOT NULL DEFAULT '',

  -- Strategy notes
  strategy_notes        TEXT NOT NULL DEFAULT '',

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, week_number)
);

CREATE INDEX IF NOT EXISTS social_proof_cascade_campaign_id_idx
  ON social_proof_cascade(campaign_id);

CREATE INDEX IF NOT EXISTS social_proof_cascade_status_idx
  ON social_proof_cascade(cascade_status)
  WHERE cascade_status IN ('CASCADE ACTIVE', 'CASCADE PEAK');

-- ─── Verify ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'signal_media_delivery'
      AND column_name IN (
        'view_rate_3s_pct', 'view_rate_10s_pct', 'completion_rate_pct',
        'aqs_score', 'aqs_band', 'attention_gap_flag',
        'attention_gap_action', 'aqs_benchmark_delta', 'aqs_prev_week_delta'
      )
  ) = 9,
  'signal_media_delivery: expected 9 new AQS columns';

  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name = 'social_proof_cascade'
  ) = 1,
  'social_proof_cascade table not found';

  RAISE NOTICE 'Migration 0035 verified — F25 AQS + F28 Cascade Detection ready.';
END $$;
