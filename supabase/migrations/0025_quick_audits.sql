-- Migration 0025 — Quick Audits (Prospect Campaign Intelligence Preview)
-- Sprint 32 · 20 July 2026
--
-- Stores full AI analysis results for prospect quick audits.
-- No foreign key to clients — prospects are not yet clients.
-- result (JSONB) holds the entire multi-module analysis output.
-- Shareable via /audit/[id] — ID is the primary key.

CREATE TABLE IF NOT EXISTS quick_audits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name          TEXT NOT NULL,
  campaign_name       TEXT NOT NULL,
  industry            TEXT NOT NULL,
  campaign_phase      TEXT,
  business_objective  TEXT,
  channels            TEXT[],
  context_summary     TEXT,   -- truncated version of what was fetched/pasted
  result              JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for recent audits list (admin view)
CREATE INDEX IF NOT EXISTS quick_audits_created_at_idx ON quick_audits (created_at DESC);
