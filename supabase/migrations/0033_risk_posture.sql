-- Migration 0033: Risk Posture Classification — Feature 20 (GA4)
-- Adds structured risk_posture column to campaign_reports so posture can be
-- queried, filtered, and surfaced at the campaign list level.
-- Five postures derived from BMS direction/velocity + signal health state.
-- ShiftImpact OS · July 2026

ALTER TABLE campaign_reports
  ADD COLUMN IF NOT EXISTS risk_posture TEXT CHECK (risk_posture IN (
    'Gaining',
    'Plateauing',
    'Under Threat',
    'Fragile',
    'Eroding Slowly'
  ));

-- Index for fast filtering by risk posture (e.g. "show all Fragile campaigns")
CREATE INDEX IF NOT EXISTS idx_campaign_reports_risk_posture
  ON campaign_reports (risk_posture);
