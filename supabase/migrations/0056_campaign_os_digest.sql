-- Migration 0056 — Campaign OS Digest (Sprint 7)
-- ShiftImpact OS
--
-- Stores generated Campaign OS Digests — the cross-signal intelligence narrative
-- that reads all signal sections simultaneously and produces:
--   narrative         — 3-4 para story of what's happening across all signals
--   contradictions    — detected conflicts between signal layers
--   blindspots        — gaps in data or strategy not being tracked
--   recommendations   — ranked actions with confidence + rationale
--   top_action        — single most important next step
--   overall_health    — Green / Amber / Red
--
-- One digest per campaign per generation. Latest is the active digest.
-- History is preserved for calibration (prediction accuracy closed loop, Sprint 9).

CREATE TABLE IF NOT EXISTS campaign_os_digests (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Context at time of generation
  week_number           INTEGER,                -- campaign week when generated (null = not week-specific)
  campaign_phase        TEXT        NOT NULL DEFAULT '',

  -- Signal context snapshot — what Claude read when generating this digest
  signal_context_json   JSONB       NOT NULL DEFAULT '{}',

  -- Top-level health signal
  overall_health        TEXT        NOT NULL DEFAULT 'Amber'
                          CHECK (overall_health IN ('Green', 'Amber', 'Red')),

  -- Primary narrative (3-4 paragraphs)
  narrative             TEXT        NOT NULL DEFAULT '',

  -- Single highest-priority action (imperative, ≤25 words)
  top_action            TEXT        NOT NULL DEFAULT '',

  -- Structured outputs — stored as JSONB arrays for easy querying
  -- contradictions: [{signal_a, signal_b, description, severity}]
  contradictions_json   JSONB       NOT NULL DEFAULT '[]',

  -- blindspots: [{area, description, recommended_fix}]
  blindspots_json       JSONB       NOT NULL DEFAULT '[]',

  -- recommendations: [{action, rationale, confidence, urgency, signal_source}]
  recommendations_json  JSONB       NOT NULL DEFAULT '[]',

  -- Meta
  model_used            TEXT        NOT NULL DEFAULT '',
  signal_count          INTEGER     NOT NULL DEFAULT 0, -- how many signals contributed
  data_weeks_available  INTEGER     NOT NULL DEFAULT 0, -- max weeks across all signals

  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE campaign_os_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_digests"
  ON campaign_os_digests FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS campaign_os_digests_campaign_idx
  ON campaign_os_digests(campaign_id);

CREATE INDEX IF NOT EXISTS campaign_os_digests_generated_idx
  ON campaign_os_digests(campaign_id, generated_at DESC);

-- ─── Verify ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'campaign_os_digests'
  ) = 1, 'campaign_os_digests table missing';

  RAISE NOTICE 'Migration 0056 verified — Campaign OS Digest schema ready.';
END $$;
