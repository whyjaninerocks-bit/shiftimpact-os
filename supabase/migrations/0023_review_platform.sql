-- Migration 0023 — Review Platform Intelligence
-- Sprint 30 · 20 July 2026
--
-- Adds review_platform_scores table for Google Reviews + TripAdvisor signals.
-- Designed for hospitality category but extensible to any category with
-- structured review platforms (restaurants, retail, services).
--
-- TripAdvisor columns are nullable — only populated for hospitality clients.
-- review_health_score (0–100) is the composite signal fed into CHS supplementary layer.

CREATE TABLE IF NOT EXISTS review_platform_scores (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id                   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  week_number                   INTEGER NOT NULL,

  -- Google Reviews
  google_rating                 NUMERIC(3,2),          -- current overall rating (e.g. 4.3)
  google_review_count_total     INTEGER,               -- cumulative total reviews
  google_review_count_period    INTEGER,               -- new reviews this week
  google_avg_rating_period      NUMERIC(3,2),          -- avg rating of new reviews this week

  -- TripAdvisor (hospitality + F&B — nullable for other categories)
  tripadvisor_rating            NUMERIC(3,2),
  tripadvisor_review_count_total  INTEGER,
  tripadvisor_review_count_period INTEGER,
  tripadvisor_avg_rating_period   NUMERIC(3,2),

  -- Sentiment (aggregated across platforms)
  sentiment_positive_pct        INTEGER CHECK (sentiment_positive_pct BETWEEN 0 AND 100),
  sentiment_neutral_pct         INTEGER CHECK (sentiment_neutral_pct BETWEEN 0 AND 100),
  sentiment_negative_pct        INTEGER CHECK (sentiment_negative_pct BETWEEN 0 AND 100),

  -- Management response rate (% of reviews responded to in last 30 days)
  management_response_rate_pct  INTEGER CHECK (management_response_rate_pct BETWEEN 0 AND 100),

  -- Recurring themes from reviews (top 3 each, stored as text arrays)
  top_positive_themes           TEXT[],
  top_negative_themes           TEXT[],

  -- Composite score and direction
  review_health_score           INTEGER CHECK (review_health_score BETWEEN 0 AND 100),
  trend_direction               TEXT CHECK (trend_direction IN ('Improving', 'Stable', 'Declining')),

  -- AI outputs
  ai_narrative                  TEXT,   -- client-shareable: what the reviews tell us
  action_recommendation         TEXT,   -- INTERNAL: highest-leverage action for strategy team

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (campaign_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_review_platform_campaign
  ON review_platform_scores (campaign_id, week_number DESC);
