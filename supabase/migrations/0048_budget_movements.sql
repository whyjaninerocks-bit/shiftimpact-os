-- Migration 0048: Budget movement tracking per channel
-- Tracks planned vs actual spend by channel and week within a campaign.

CREATE TABLE IF NOT EXISTS budget_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     TEXT NOT NULL,
  channel         TEXT NOT NULL,
  week_number     INTEGER NOT NULL DEFAULT 1,
  planned_spend   NUMERIC(12,2),
  actual_spend    NUMERIC(12,2),
  currency        TEXT NOT NULL DEFAULT 'MYR',
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE budget_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_budget_movements" ON budget_movements FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS budget_movements_campaign_id_idx ON budget_movements(campaign_id);
CREATE INDEX IF NOT EXISTS budget_movements_campaign_week_idx ON budget_movements(campaign_id, week_number);
