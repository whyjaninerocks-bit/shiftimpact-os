-- Migration 0045 — Brief KPI fields + brand asset storage on frame_briefs
-- Adds the missing brief sections the client needs to complete before ShiftImpact can start work:
--   • budget_total / budget_notes — campaign budget and media split
--   • secondary_kpis — additional KPIs beyond the primary metric
--   • brand_guidelines_url — link to brand guidelines / CI deck
--   • brand_guidelines_notes — any additional brand asset notes
--   • rfp_notes — RFP or scope clarifications from client

ALTER TABLE frame_briefs
  ADD COLUMN IF NOT EXISTS budget_total        NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS budget_notes        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_kpis      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_guidelines_url   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_guidelines_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rfp_notes           TEXT NOT NULL DEFAULT '';
