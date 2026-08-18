-- Migration 0019 — F23 AI Brand Visibility Layer (Phase 1)
-- Sprint 19 · 17 July 2026
--
-- Creates: ai_brand_visibility_scores
--
-- ACCESS RULES:
--   eligibility_score (number): INTERNAL ONLY — Janine / Strategy Lead
--   eligibility_band (label):   INTERNAL ONLY (band shared in narrative, not as raw label)
--   trust_gap_*:                INTERNAL ONLY
--   ai_narrative:               Shared with client in plain language
--   competitor_ai_visibility:   NEVER shared with client
--
-- Note: AI Visibility Score fed into BMS as D7 (10% weight) — BMS remains
--       on brand_momentum_scores table; this table stores the F23 input data.

CREATE TABLE ai_brand_visibility_scores (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id                  uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- ── Manual inputs (entered by Strategy Lead) ──────────────────────────────
  cep_count                    integer NOT NULL DEFAULT 0,       -- # Category Entry Points mapped
  information_consistency_score integer NOT NULL DEFAULT 50      -- 0–100: brand info accuracy across platforms
    CHECK (information_consistency_score BETWEEN 0 AND 100),
  ai_visibility_observations   text NOT NULL DEFAULT '',         -- what strategy lead has observed about AI mentions

  -- ── Computed dimension scores (0–100 each) ────────────────────────────────
  -- These are derived from existing Signal data + manual inputs at run time.
  ugc_depth_score              integer,  -- 30% — from Signal 3 / demand_health
  sentiment_clarity_score      integer,  -- 25% — from overall signal health
  cep_breadth_score            integer,  -- 20% — from cep_count
  search_intent_score          integer,  -- 15% — from Signal 1 / conversion_health
  -- information_consistency_score used directly as 10% input

  -- ── Computed eligibility ──────────────────────────────────────────────────
  eligibility_score            integer,  -- 0–100 weighted composite (INTERNAL ONLY)
  eligibility_band             text CHECK (eligibility_band IN ('AI-Ready', 'Developing', 'Emerging', 'At Risk')),

  -- ── Trust Gap Diagnosis (Phase 1) ─────────────────────────────────────────
  trust_gap_owned              text,     -- gaps in owned content / brand information
  trust_gap_cep                text,     -- gaps in CEP coverage

  -- ── Priority action ───────────────────────────────────────────────────────
  priority_action              text,     -- single most important next action

  -- ── AI narrative (client-shareable plain language) ────────────────────────
  ai_narrative                 text,

  -- ── Metadata ──────────────────────────────────────────────────────────────
  status                       text NOT NULL DEFAULT 'ready',
  created_at                   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast campaign lookup (most recent score)
CREATE INDEX idx_ai_brand_visibility_campaign ON ai_brand_visibility_scores(campaign_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE ai_brand_visibility_scores ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by all API routes)
CREATE POLICY "service role full access" ON ai_brand_visibility_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);
