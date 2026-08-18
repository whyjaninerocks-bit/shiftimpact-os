-- Migration 0029: Prospect Insights — Topline + Deep Dive
-- Two-tier intelligence: topline always generated on assess,
-- deep dive generated on-demand when company is marked Pursuing.
-- ShiftImpact OS · July 2026

-- ─── 1. Add 'Pursuing' to companies status ───────────────────────────────────
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE companies
  ADD CONSTRAINT companies_status_check
  CHECK (status IN ('Watching','Qualified','Pursuing','Active','Converted','Dismissed'));

-- ─── 2. prospect_insights table ──────────────────────────────────────────────
-- Stores both topline (depth_level = 'topline') and deep dive (depth_level = 'deep') rows.
-- One topline row per assessment. One deep row per pursue decision.
CREATE TABLE IF NOT EXISTS prospect_insights (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID        NOT NULL REFERENCES companies(id)          ON DELETE CASCADE,
  assessment_id         UUID                 REFERENCES prospect_assessments(id) ON DELETE SET NULL,
  depth_level           TEXT        NOT NULL CHECK (depth_level IN ('topline','deep')),

  -- Topline fields (always populated on assess)
  recommendation        TEXT        CHECK (recommendation IN ('Pursue','Watch','Pass')),
  benchmark_context     TEXT,   -- how scores compare to typical sector/market prospects
  market_context        TEXT,   -- competitive/environmental factors shaping the moment
  best_entry_angle      TEXT,   -- the single sharpest way to open the conversation

  -- Deep dive fields (populated when Pursuing)
  competitive_landscape TEXT,   -- who else is in the room, what they offer
  approach_sequence     TEXT,   -- step-by-step pursuit plan
  signal_analysis       TEXT,   -- each signal in context (why it matters, what it signals)
  risk_factors          TEXT,   -- what could go wrong or slow the deal
  market_timing         TEXT,   -- why now (or not yet)

  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prospect_insights_company
  ON prospect_insights (company_id, depth_level, created_at DESC);
CREATE INDEX IF NOT EXISTS prospect_insights_assessment
  ON prospect_insights (assessment_id, depth_level);
