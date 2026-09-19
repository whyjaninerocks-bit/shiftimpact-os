-- Migration 0088: Strategic Synthesis Runs (Strategic Synthesis v0.1)
-- Stage 4C.2 build approval. Optional, user-triggered, assistive routes for
-- FRAME Brief (Marketing Brief Synthesis) and Big Idea Platform (Creative
-- Strategy Synthesis) — never mandatory, never automatic, never a direct
-- write to frame_briefs or big_idea_platforms. Applying a suggested step
-- only pre-fills the relevant field client-side; the strategist still has
-- to click the existing Save FRAME Brief / Save BIP Draft button for
-- anything to persist. This table only records what was suggested and what
-- the strategist did with it.
--
-- Polymorphic targeting (target_type + target_id), same pattern and same
-- reasoning as strategic_basis_sources (migration 0087) — Postgres cannot
-- enforce a real FK on target_id, so every write is server-action /
-- API-route validated: target_type checked against the allow-list,
-- target_id confirmed to exist in the matching table, and that row's
-- campaign_id confirmed to match campaign_id here.
--
-- One row per generation event (never overwritten), matching the
-- iq_evaluations precedent already in this schema. routes is a NESTED
-- JSONB shape — multiple routes, each with multiple prompt-chain steps —
-- never a flat array of steps. See lib/types.ts StrategicSynthesisRun /
-- SynthesisRoute / SynthesisStep for the exact shape.
--
-- status is the generation lifecycle (pending → ready | error).
-- review_status is the separate human-decision lifecycle
-- (not_reviewed → reviewed | applied | rejected), tracked independently
-- because a run can be generated successfully and still sit unreviewed.

CREATE TABLE IF NOT EXISTS strategic_synthesis_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  target_type     TEXT NOT NULL CHECK (target_type IN ('frame_brief', 'big_idea_platform')),
  target_id       UUID NOT NULL,

  triggered_by    UUID,

  -- Frozen at run time: the FRAME/BIP field values and the specific
  -- strategic_basis_sources ids actually used, so a later edit to either
  -- never retroactively misrepresents what a past run was based on.
  input_snapshot  JSONB NOT NULL,

  -- Nested routes[].steps[] — see migration header. Never flat.
  routes          JSONB NOT NULL DEFAULT '[]'::jsonb,

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'ready', 'error')),

  review_status   TEXT NOT NULL DEFAULT 'not_reviewed'
                    CHECK (review_status IN ('not_reviewed', 'reviewed', 'applied', 'rejected')),

  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  applied_at      TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  error_message   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategic_synthesis_runs_target_idx
  ON strategic_synthesis_runs (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS strategic_synthesis_runs_campaign_idx
  ON strategic_synthesis_runs (campaign_id);

CREATE OR REPLACE FUNCTION update_strategic_synthesis_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER strategic_synthesis_runs_updated_at
  BEFORE UPDATE ON strategic_synthesis_runs
  FOR EACH ROW EXECUTE FUNCTION update_strategic_synthesis_runs_updated_at();
