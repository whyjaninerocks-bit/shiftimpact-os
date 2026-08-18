-- Migration 0049: Prediction Accuracy Log (Blind Mirror Test)
-- Tracks predictions made before/during a campaign vs actual outcomes.
-- Primary credibility proof layer for ShiftImpact OS — builds prediction accuracy record.
-- INTERNAL ONLY. Never surface raw rows to clients.

CREATE TABLE IF NOT EXISTS prediction_accuracy_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- The prediction
  category      TEXT NOT NULL CHECK (category IN ('Signal', 'Outcome', 'Gate', 'Behaviour')),
  prediction_text TEXT NOT NULL,           -- plain language: "Save rate will reach 8% by week 4"
  predicted_value NUMERIC(12,4),           -- numeric prediction (optional)
  unit            TEXT,                    -- %, x, units, etc.
  prediction_week INTEGER,                 -- week the prediction was made

  -- The outcome
  actual_value    NUMERIC(12,4),           -- recorded once outcome is known
  outcome_week    INTEGER,                 -- week the outcome was recorded
  verdict         TEXT CHECK (verdict IN ('Accurate', 'Close', 'Off', 'Pending')),
  accuracy_pct    NUMERIC(5,2),            -- computed: |actual - predicted| / predicted * 100
  outcome_note    TEXT,                    -- context on why it hit or missed

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_log_campaign
  ON prediction_accuracy_log(campaign_id);

COMMENT ON TABLE prediction_accuracy_log IS
  'Blind Mirror Test — prediction vs actual outcome log. Primary credibility proof for ShiftImpact OS.';
