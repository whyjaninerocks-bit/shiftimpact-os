-- Migration 0063 — add portal_published_at to campaign_reports
-- Tracks when Janine approved a report for client portal viewing.
-- Distinct from "exported" (which means PDF was downloaded).
-- A null portal_published_at means the report is internal only.

alter table campaign_reports
  add column if not exists portal_published_at timestamptz;
