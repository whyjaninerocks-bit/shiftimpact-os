-- Migration 0037 — F29 DBA Performance Correlation
-- ShiftImpact OS · Sprint 6 · 30 July 2026
--
-- Stores the output of the DBA ↔ Signal correlation analysis.
-- ALL FIELDS INTERNAL ONLY — Janine only, never client-facing.
--
-- Correlation dimensions:
--   Signal 1 (branded search / SoS): does DBA consistency correlate with share of search?
--   AQS (Attention Quality Score):   does AQS improve when DBAs are present?
--   CSTR (Consumer State Transition): does CSTR improve when DBAs are consistent?
--
-- Erosion alert: fires when Established → Building or At Risk, or when
--   AQS shows low attention co-incident with DBA deployment.

CREATE TABLE IF NOT EXISTS dba_correlation_logs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Snapshot inputs (at time of correlation run)
  assets_deployed_ids   TEXT,                   -- comma-separated asset IDs evaluated
  signal1_health        TEXT,                   -- Green / Amber / Red at time of run
  aqs_score             NUMERIC(5,2),           -- latest AQS at time of run
  aqs_band              TEXT,                   -- Strong / Moderate / Weak / Poor
  cstr_status           TEXT,                   -- latest CSTR status at time of run

  -- Correlation assessments (directional — not statistical)
  correlation_signal1   TEXT CHECK (correlation_signal1 IS NULL OR correlation_signal1 IN ('Positive', 'Neutral', 'Negative', 'Insufficient Data')),
  correlation_aqs       TEXT CHECK (correlation_aqs IS NULL OR correlation_aqs IN ('Positive', 'Neutral', 'Negative', 'Insufficient Data')),
  correlation_cstr      TEXT CHECK (correlation_cstr IS NULL OR correlation_cstr IN ('Positive', 'Neutral', 'Negative', 'Insufficient Data')),

  -- Erosion detection
  erosion_alert         BOOLEAN NOT NULL DEFAULT FALSE,
  erosion_asset_names   TEXT,           -- comma-separated asset names flagged (INTERNAL)
  erosion_inference     TEXT,           -- INTERNAL — reason for erosion flag

  -- AI narrative (INTERNAL ONLY — Janine strategy read, not for client)
  correlation_summary   TEXT NOT NULL DEFAULT '',

  -- Analyst notes
  strategy_notes        TEXT NOT NULL DEFAULT '',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dba_correlation_logs_campaign_idx
  ON dba_correlation_logs(campaign_id);

-- Verify
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name = 'dba_correlation_logs'
  ) = 1,
  'dba_correlation_logs table not found';

  RAISE NOTICE 'Migration 0037 verified — dba_correlation_logs ready.';
END $$;
