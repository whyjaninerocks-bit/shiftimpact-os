-- Migration 0039: Cultural Radar & Instigation Engine
-- GA3 prototype extension — deliberately minimal.
-- Three-part loop: Read the culture → Understand it → Fuel the creative.
-- Status: logged → assessed → briefed → archived

CREATE TABLE IF NOT EXISTS cultural_signals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Part 1: Read the culture
  signal_name             TEXT NOT NULL,
  signal_type             TEXT NOT NULL CHECK (signal_type IN ('behavioural', 'linguistic', 'ritual', 'community')),
  source_description      TEXT NOT NULL,   -- where it was found or observed
  evidence                TEXT NOT NULL,   -- verbatim quotes, data, examples
  is_trending             BOOLEAN DEFAULT false, -- false = "permanent ordinary" (e.g. cincai lah)
  geographic_scope        TEXT DEFAULT 'MY',

  -- Part 2: Understand the culture
  why_it_matters          TEXT,            -- root cause / cultural meaning
  brand_fit_notes         TEXT,            -- written brand-fit & authenticity assessment
  brand_fit_status        TEXT DEFAULT 'pending'
                            CHECK (brand_fit_status IN ('pending', 'strong', 'weak', 'not_ours')),
  community_respect_check BOOLEAN DEFAULT false, -- genuine, respectful entry possible?

  -- Part 3: Creative handoff
  handoff_brief           TEXT,            -- Claude-generated handoff doc for creative team
  handoff_generated_at    TIMESTAMPTZ,

  -- Workflow
  status                  TEXT DEFAULT 'logged'
                            CHECK (status IN ('logged', 'assessed', 'briefed', 'archived')),

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_cultural_signals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cultural_signals_updated_at
  BEFORE UPDATE ON cultural_signals
  FOR EACH ROW EXECUTE FUNCTION update_cultural_signals_updated_at();

-- Index for list ordering
CREATE INDEX IF NOT EXISTS cultural_signals_created_at_idx ON cultural_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS cultural_signals_status_idx ON cultural_signals(status);
