-- Migration 0057 — Sprint 8: Pre-population Chains
-- ShiftImpact OS
--
-- Tables:
--   digest_decision_captures  — records when Janine acts on / overrides / monitors
--                               a Campaign OS Digest recommendation. Feeds confidence
--                               calibration in Sprint 9 (prediction accuracy closed loop).
--
--   stage_brief_autodrafts    — stores Claude-generated Stage Brief drafts triggered
--                               from a locked FRAME Brief. Drafts are editable before
--                               being promoted to live Stage Briefs.

-- ─── digest_decision_captures ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS digest_decision_captures (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_id       UUID        NOT NULL REFERENCES campaign_os_digests(id) ON DELETE CASCADE,
  campaign_id     UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Which recommendation from the digest (0-indexed position)
  recommendation_index  INTEGER   NOT NULL DEFAULT 0,
  recommendation_action TEXT      NOT NULL DEFAULT '',   -- the action text at time of capture

  -- Decision
  decision        TEXT        NOT NULL CHECK (decision IN ('Acted', 'Overriding', 'Monitoring')),
  decision_note   TEXT        NOT NULL DEFAULT '',       -- optional free-text context

  -- For confidence calibration: did the action produce the expected outcome?
  -- Filled retroactively in Sprint 9 (prediction accuracy closed loop)
  outcome_confirmed   BOOLEAN,    -- null = pending, true = worked, false = didn't work
  outcome_note        TEXT,

  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE digest_decision_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_decisions"
  ON digest_decision_captures FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS digest_decisions_digest_idx
  ON digest_decision_captures(digest_id);

CREATE INDEX IF NOT EXISTS digest_decisions_campaign_idx
  ON digest_decision_captures(campaign_id);

-- ─── stage_brief_autodrafts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stage_brief_autodrafts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  frame_brief_id  UUID        NOT NULL REFERENCES frame_briefs(id) ON DELETE CASCADE,

  -- Proposed stage brief fields (mirrors stage_briefs columns)
  stage_name      TEXT        NOT NULL DEFAULT '',
  stage_objective TEXT        NOT NULL DEFAULT '',
  channel         TEXT        NOT NULL DEFAULT '',
  idea_led        TEXT        NOT NULL DEFAULT '',
  department      TEXT        NOT NULL DEFAULT 'Media',
  status          TEXT        NOT NULL DEFAULT 'Draft',

  -- Draft provenance
  draft_rationale TEXT        NOT NULL DEFAULT '',   -- why Claude suggested this
  promoted        BOOLEAN     NOT NULL DEFAULT FALSE, -- TRUE when promoted to stage_briefs
  promoted_at     TIMESTAMPTZ,

  -- Meta
  model_used      TEXT        NOT NULL DEFAULT '',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stage_brief_autodrafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_autodrafts"
  ON stage_brief_autodrafts FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS stage_autodrafts_campaign_idx
  ON stage_brief_autodrafts(campaign_id);

CREATE INDEX IF NOT EXISTS stage_autodrafts_frame_idx
  ON stage_brief_autodrafts(frame_brief_id);

-- ─── Verify ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'digest_decision_captures'
  ) = 1, 'digest_decision_captures table missing';

  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'stage_brief_autodrafts'
  ) = 1, 'stage_brief_autodrafts table missing';

  RAISE NOTICE 'Migration 0057 verified — Pre-population schema ready.';
END $$;
