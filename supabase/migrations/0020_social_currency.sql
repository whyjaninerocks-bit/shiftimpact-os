-- Migration 0020 — F23 Social Currency Index (Phase 2)
-- Sprint 20 · 17 July 2026
--
-- Creates: social_currency_scores
--
-- The Social Currency Index (SCI) measures how well the brand is
-- accumulating shareable, conversation-worthy consumer content.
--
-- 5 dimensions (weighted composite → sci_score 0–100):
--   save_to_post_ratio  30%  — from Signal 2 save rate
--   share_velocity      25%  — week-over-week Signal 2 trend
--   comment_depth       20%  — manual input (avg comments per post)
--   cross_platform      15%  — manual input (% content on 2+ platforms)
--   sentiment_momentum  10%  — from Signal 3 demand_health
--
-- ACCESS RULES:
--   sci_score + trend_direction + ai_narrative: shareable with client (plain language)
--   dimension scores (save/share/comment/cross/sentiment): INTERNAL ONLY
--   build_action: INTERNAL ONLY

CREATE TABLE social_currency_scores (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id                uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  week_number                integer NOT NULL,

  -- ── Manual inputs (entered by Strategy Lead) ──────────────────────────────
  comment_depth_avg          integer NOT NULL DEFAULT 0
    CHECK (comment_depth_avg >= 0),    -- avg comments per post this week
  cross_platform_pct         integer NOT NULL DEFAULT 0
    CHECK (cross_platform_pct BETWEEN 0 AND 100), -- % of content spreading to 2+ platforms

  -- ── Dimension scores (0–100 each) — INTERNAL ONLY ─────────────────────────
  save_to_post_ratio_score   integer CHECK (save_to_post_ratio_score BETWEEN 0 AND 100),
  share_velocity_score       integer CHECK (share_velocity_score BETWEEN 0 AND 100),
  comment_depth_score        integer CHECK (comment_depth_score BETWEEN 0 AND 100),
  cross_platform_score       integer CHECK (cross_platform_score BETWEEN 0 AND 100),
  sentiment_momentum_score   integer CHECK (sentiment_momentum_score BETWEEN 0 AND 100),

  -- ── Composite ─────────────────────────────────────────────────────────────
  sci_score                  integer NOT NULL DEFAULT 0
    CHECK (sci_score BETWEEN 0 AND 100),
  trend_direction            text NOT NULL DEFAULT 'Stable'
    CHECK (trend_direction IN ('Improving', 'Stable', 'Declining')),

  -- ── AI outputs ────────────────────────────────────────────────────────────
  ai_narrative               text,   -- client-shareable, plain language
  build_action               text,   -- INTERNAL — single priority action for strategy lead

  -- ── Metadata ──────────────────────────────────────────────────────────────
  created_at                 timestamptz NOT NULL DEFAULT now()
);

-- Index for fast campaign lookup (most recent score)
CREATE INDEX idx_social_currency_campaign ON social_currency_scores(campaign_id, created_at DESC);
CREATE INDEX idx_social_currency_week ON social_currency_scores(campaign_id, week_number DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE social_currency_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access" ON social_currency_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);
