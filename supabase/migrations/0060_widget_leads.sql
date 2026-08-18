-- Migration 0060: Widget Leads — free diagnostic widget lead capture
-- Separate from diagnostic_sessions (paid engagements).
-- Captures: decision text, assumption classification, and email (post-reveal).
-- Source: the public /diagnostic page.

CREATE TABLE IF NOT EXISTS widget_leads (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          TEXT        UNIQUE NOT NULL,
  decision_text       TEXT,
  assumption_category TEXT        CHECK (assumption_category IN ('press','hold','pivot','stop','investigate')),
  email               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  emailed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS widget_leads_email ON widget_leads (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS widget_leads_created ON widget_leads (created_at DESC);

ALTER TABLE widget_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all_widget_leads ON widget_leads FOR ALL USING (true);
