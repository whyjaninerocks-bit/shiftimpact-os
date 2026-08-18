-- Combined one-shot migration: 0039 + 0042 + 0043
-- Run this directly in Supabase SQL Editor if the apply-migration-0043 endpoint fails.
-- Fully idempotent — safe to run multiple times.

-- ── 0039: cultural_signals table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cultural_signals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_name             TEXT NOT NULL,
  signal_type             TEXT NOT NULL CHECK (signal_type IN ('behavioural','linguistic','ritual','community')),
  source_description      TEXT NOT NULL,
  evidence                TEXT NOT NULL,
  is_trending             BOOLEAN DEFAULT false,
  geographic_scope        TEXT DEFAULT 'MY',
  why_it_matters          TEXT,
  brand_fit_notes         TEXT,
  brand_fit_status        TEXT DEFAULT 'pending'
                            CHECK (brand_fit_status IN ('pending','strong','weak','not_ours')),
  community_respect_check BOOLEAN DEFAULT false,
  handoff_brief           TEXT,
  handoff_generated_at    TIMESTAMPTZ,
  status                  TEXT DEFAULT 'logged'
                            CHECK (status IN ('logged','assessed','briefed','archived')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_cultural_signals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'cultural_signals_updated_at'
  ) THEN
    CREATE TRIGGER cultural_signals_updated_at
      BEFORE UPDATE ON cultural_signals
      FOR EACH ROW EXECUTE FUNCTION update_cultural_signals_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cultural_signals_created_at_idx ON cultural_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS cultural_signals_status_idx ON cultural_signals(status);

-- ── 0042: strategic_move window + cultural signal client linking ──────────────

ALTER TABLE opportunity_windows
  DROP CONSTRAINT IF EXISTS opportunity_windows_window_type_check;

ALTER TABLE opportunity_windows
  ADD CONSTRAINT opportunity_windows_window_type_check
  CHECK (window_type IN (
    'fiscal_cycle','conference_calendar','renewal_season','funding_event',
    'leadership_change','rfp_cycle','campaign_season','product_launch','strategic_move'
  ));

INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint, is_active)
VALUES (
  'strategic_move', 'B2C', 'Strategic Move',
  'MOU, distribution partnership, market expansion, or major business milestone. External communications rarely keep pace — the narrative gap is the entry point.',
  'MOU, partnership signing, market expansion, or milestone announcement detected',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint, is_active)
VALUES (
  'strategic_move', 'B2B', 'Strategic Move',
  'Signed agreement, joint venture, distribution deal, or significant market expansion. New strategic commitments create rapid demand for aligned positioning and intelligence before execution begins.',
  'Signed agreement, partnership, joint venture, or expansion announcement detected',
  true
) ON CONFLICT DO NOTHING;

ALTER TABLE cultural_signals
  ADD COLUMN IF NOT EXISTS relevant_industries TEXT[] DEFAULT '{}';

ALTER TABLE cultural_signals
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- ── 0043: is_generic flag ─────────────────────────────────────────────────────

ALTER TABLE cultural_signals
  ADD COLUMN IF NOT EXISTS is_generic BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS cultural_signals_is_generic_idx
  ON cultural_signals (is_generic) WHERE is_generic = true;

CREATE INDEX IF NOT EXISTS cultural_signals_industries_idx
  ON cultural_signals USING GIN (relevant_industries);

CREATE INDEX IF NOT EXISTS cultural_signals_client_id_idx
  ON cultural_signals (client_id) WHERE client_id IS NOT NULL;
