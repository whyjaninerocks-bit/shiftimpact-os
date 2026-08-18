-- Migration 0036 — Sprint 6: F30 DSEM + F28 Phase 2 + F23 Phase 2
-- ShiftImpact OS
--
-- F30: dark_social_readings table — 3-signal DSEM (DTA + BSWM + GUCL)
-- F28: extend social_proof_cascade — dark cascade inference columns
-- F23: extend ai_brand_visibility_scores — trust gap diagnosis columns

-- ─── F30: dark_social_readings ───────────────────────────────────────────────
-- GOVERNANCE: multiplier_value, signals_fired, trigger_log → INTERNAL ONLY
-- Client sees: dark_social_narrative (plain language, "inferred" framing only)

CREATE TABLE IF NOT EXISTS dark_social_readings (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id               UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  week_number               INTEGER     NOT NULL CHECK (week_number >= 0),

  -- Signal A — Direct Traffic Anomaly (DTA)
  dta_direct_sessions       INTEGER,                    -- GA4 direct sessions this week
  dta_baseline_sessions     INTEGER,                    -- 4-week rolling baseline
  dta_pct_above_baseline    NUMERIC(8,2),               -- computed: (this - baseline) / baseline * 100
  dta_paid_active           BOOLEAN NOT NULL DEFAULT FALSE, -- true if paid media was running
  dta_triggered             BOOLEAN NOT NULL DEFAULT FALSE, -- true when >20% above baseline + no paid

  -- Signal B — Branded Search Without Media (BSWM)
  bswm_search_volume        INTEGER,                    -- branded search volume this week
  bswm_baseline_volume      INTEGER,                    -- 4-week rolling baseline
  bswm_pct_above_baseline   NUMERIC(8,2),
  bswm_paid_search_active   BOOLEAN NOT NULL DEFAULT FALSE,
  bswm_triggered            BOOLEAN NOT NULL DEFAULT FALSE, -- true when >15% above baseline + no paid search

  -- Signal C — Geographic UGC Clustering (GUCL)
  gucl_tier1_post_count     INTEGER,                    -- Tier 1 posts from same city/district in 5-day window
  gucl_location_available   BOOLEAN NOT NULL DEFAULT TRUE,  -- false when Instagram/X location data unavailable
  gucl_activation_event     BOOLEAN NOT NULL DEFAULT FALSE, -- true if brand activation event in that area
  gucl_triggered            BOOLEAN NOT NULL DEFAULT FALSE, -- true when ≥3 Tier 1 posts + no activation

  -- Multiplier logic (INTERNAL ONLY)
  signals_fired             INTEGER NOT NULL DEFAULT 0, -- count of triggered signals (0–3)
  multiplier_min            NUMERIC(5,2),               -- lower bound of probabilistic range
  multiplier_max            NUMERIC(5,2),               -- upper bound
  multiplier_label          TEXT,                       -- "1 signal", "2 signals", "3 signals", or null

  -- Adjusted Signal 3 (INTERNAL ONLY — never in client view)
  signal3_raw_score         NUMERIC(8,2),               -- raw S3 reading before multiplier
  signal3_adjusted_score    NUMERIC(8,2),               -- S3 × multiplier midpoint (internal diagnostic only)

  -- Client-facing output
  dark_social_narrative     TEXT NOT NULL DEFAULT '',   -- plain language, "inferred momentum" framing only

  -- Malaysia category calibration
  category_calibration      TEXT,                       -- QSR/FMCG/Financial Services tier applied

  -- Strategy notes (internal)
  strategy_notes            TEXT NOT NULL DEFAULT '',

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, week_number)
);

CREATE INDEX IF NOT EXISTS dark_social_readings_campaign_id_idx
  ON dark_social_readings(campaign_id);

CREATE INDEX IF NOT EXISTS dark_social_readings_signals_fired_idx
  ON dark_social_readings(signals_fired)
  WHERE signals_fired > 0;

-- ─── F28 Phase 2: extend social_proof_cascade ────────────────────────────────
-- Dark cascade inference — always stated as inferred, never confirmed

ALTER TABLE social_proof_cascade
  ADD COLUMN IF NOT EXISTS dark_cascade_direct_traffic_spike  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dark_cascade_search_spike          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dark_cascade_geo_clustering        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dark_cascade_flag                  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dark_cascade_inference_note        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cross_platform_detected            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cross_platform_platforms           TEXT,   -- comma-separated platform list
  ADD COLUMN IF NOT EXISTS cross_platform_theme               TEXT;   -- AI-detected theme summary (INTERNAL)

-- ─── F23 Phase 2: extend ai_brand_visibility_scores ──────────────────────────
-- Trust Gap Diagnosis — 5 gap types. Competitor data INTERNAL ONLY under all circumstances.

ALTER TABLE ai_brand_visibility_scores
  ADD COLUMN IF NOT EXISTS trust_gap_owned          TEXT,   -- Owned gap: brand-controlled AI content gaps
  ADD COLUMN IF NOT EXISTS trust_gap_community      TEXT,   -- Community gap: UGC depth vs CEP requirements
  ADD COLUMN IF NOT EXISTS trust_gap_cep            TEXT,   -- CEP gap: missing category entry point coverage
  ADD COLUMN IF NOT EXISTS trust_gap_platform       TEXT,   -- Platform gap: AI platform-specific blind spots
  ADD COLUMN IF NOT EXISTS trust_gap_competitor     TEXT,   -- Competitor gap: INTERNAL ONLY — never shared
  ADD COLUMN IF NOT EXISTS trust_gap_priority       TEXT    -- Which gap to close first + rationale
    CHECK (trust_gap_priority IS NULL OR trust_gap_priority IN ('Owned', 'Community', 'CEP', 'Platform', 'Competitor')),
  ADD COLUMN IF NOT EXISTS trust_gap_priority_note  TEXT,   -- Plain language rationale for priority
  ADD COLUMN IF NOT EXISTS ai_visibility_risk       TEXT    -- Risk modifier for F20 Risk Posture
    CHECK (ai_visibility_risk IS NULL OR ai_visibility_risk IN ('Low', 'Moderate', 'High', 'Critical'));

-- ─── Verify ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name = 'dark_social_readings'
  ) = 1,
  'dark_social_readings table not found';

  ASSERT (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'social_proof_cascade'
      AND column_name IN ('dark_cascade_flag', 'dark_cascade_inference_note', 'cross_platform_detected')
  ) = 3,
  'social_proof_cascade: expected dark cascade columns';

  ASSERT (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'ai_brand_visibility_scores'
      AND column_name IN ('trust_gap_owned', 'trust_gap_community', 'trust_gap_priority', 'ai_visibility_risk')
  ) = 4,
  'ai_brand_visibility_scores: expected trust gap columns';

  RAISE NOTICE 'Migration 0036 verified — F30 DSEM + F28 Ph2 + F23 Ph2 schema ready.';
END $$;
