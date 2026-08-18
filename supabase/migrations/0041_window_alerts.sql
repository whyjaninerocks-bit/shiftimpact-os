-- Migration 0041: window_alerts
-- Requires 0040 (opportunity_windows table) to be applied first.
-- One alert per company per window type — upserted on each scan.

CREATE TABLE IF NOT EXISTS window_alerts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES companies(id)          ON DELETE CASCADE,
  window_id         UUID        NOT NULL REFERENCES opportunity_windows(id) ON DELETE CASCADE,
  trigger_signal_id UUID                 REFERENCES business_signals(id)   ON DELETE SET NULL,
  trigger_reason    TEXT        NOT NULL,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_open           BOOLEAN     NOT NULL DEFAULT TRUE,
  dismissed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, window_id)
);

CREATE INDEX IF NOT EXISTS window_alerts_company_open
  ON window_alerts (company_id, is_open, detected_at DESC);

CREATE INDEX IF NOT EXISTS window_alerts_open_detected
  ON window_alerts (is_open, detected_at DESC)
  WHERE is_open = TRUE;
