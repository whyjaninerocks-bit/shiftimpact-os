-- Migration 0087: Strategic Basis Sources (Signal-to-Creative Citation v0.1)
-- Stage 4A build approval. Captures the strategic basis / supporting insight
-- sources that inform a FRAME Brief or Big Idea Platform — the first
-- evidence-trail foundation:
--   culture or insight source → FRAME Brief → Big Idea Platform →
--   (later) Creative Format Read → Connected Intelligence → Learning Memory.
-- Deliberately minimal for v0.1. Not built in this migration: Creative
-- Format Read, Connected Intelligence Read, Brand Power Threshold, Pattern
-- Library, regression/modelling, automated creative scoring, auto-selection
-- of cultural signals, durability_status.
--
-- Polymorphic targeting (target_type + target_id) rather than two nullable
-- FKs, since more target types are already planned (creative_format_read,
-- creative_asset, campaign_signal_map, campaign_learning_record,
-- connected_intelligence_read) — extending the CHECK below is cheaper than
-- adding a column per target every time. Postgres cannot enforce a real FK
-- on a polymorphic target_id, so every write is server-action validated
-- (see addStrategicBasisSource in lib/actions.ts): target_type is checked
-- against the allow-list, target_id is confirmed to exist in the matching
-- table, and that row's campaign_id is confirmed to match campaign_id here.
--
-- 'not_selected_yet' is never stored — it is purely the UI's empty state
-- when zero rows exist for a target. 'not_applicable' IS stored, as a row,
-- and is kept mutually exclusive with real sources for the same target via
-- the partial unique index below plus application logic in lib/actions.ts.

CREATE TABLE IF NOT EXISTS strategic_basis_sources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Polymorphic target — v0.1 allows only frame_brief and big_idea_platform.
  -- Extend this CHECK (not the table shape) when future targets ship.
  target_type         TEXT NOT NULL CHECK (target_type IN ('frame_brief', 'big_idea_platform')),
  target_id           UUID NOT NULL,

  -- 8 stored source types. 'not_selected_yet' is intentionally absent from
  -- this list — see note above.
  source_type         TEXT NOT NULL CHECK (source_type IN (
                          'os_cultural_radar_signal',
                          'agency_provided_insight',
                          'client_provided_research',
                          'platform_social_listening_insight',
                          'category_market_report',
                          'creative_team_observation',
                          'strategist_manual_note',
                          'not_applicable'
                        )),

  -- Only populated when source_type = 'os_cultural_radar_signal'. Live link
  -- to the current signal; source_title below is a snapshot taken at
  -- citation time and is allowed to drift from the signal's current state
  -- on purpose — the citation is a historical record, not a live mirror.
  cultural_signal_id  UUID REFERENCES cultural_signals(id) ON DELETE SET NULL,

  source_title        TEXT NOT NULL,   -- always required; snapshot for OS signals
  source_note          TEXT,            -- optional elaboration
  source_url           TEXT,            -- optional, mainly for external sources

  created_by           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- os_cultural_radar_signal rows must carry a real signal link.
  CONSTRAINT strategic_basis_sources_signal_id_required
    CHECK (source_type <> 'os_cultural_radar_signal' OR cultural_signal_id IS NOT NULL)
);

-- At most one 'not_applicable' row per target — a DB-level backstop to the
-- application-layer mutual-exclusivity rule in lib/actions.ts (real sources
-- and not_applicable never coexist for the same target).
CREATE UNIQUE INDEX IF NOT EXISTS strategic_basis_sources_not_applicable_unique
  ON strategic_basis_sources (target_type, target_id)
  WHERE source_type = 'not_applicable';

CREATE INDEX IF NOT EXISTS strategic_basis_sources_target_idx
  ON strategic_basis_sources (target_type, target_id);
CREATE INDEX IF NOT EXISTS strategic_basis_sources_campaign_idx
  ON strategic_basis_sources (campaign_id);
CREATE INDEX IF NOT EXISTS strategic_basis_sources_signal_idx
  ON strategic_basis_sources (cultural_signal_id);

-- Auto-update timestamp, matching cultural_signals' own trigger pattern
-- (migration 0039).
CREATE OR REPLACE FUNCTION update_strategic_basis_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER strategic_basis_sources_updated_at
  BEFORE UPDATE ON strategic_basis_sources
  FOR EACH ROW EXECUTE FUNCTION update_strategic_basis_sources_updated_at();
