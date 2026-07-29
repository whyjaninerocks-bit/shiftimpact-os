-- Migration 0034: Fix companies status constraint
-- Adds 'Client' and 'Archived' (used in PIE UI) to the status enum.
-- Keeps legacy values (Active, Converted, Dismissed) so existing rows are unaffected.
-- ShiftImpact OS · July 2026

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_status_check;

ALTER TABLE companies
  ADD CONSTRAINT companies_status_check
  CHECK (status IN (
    'Watching',
    'Qualified',
    'Pursuing',
    'Client',
    'Archived',
    -- Legacy values kept for backward compat — not used in PIE UI
    'Active',
    'Converted',
    'Dismissed'
  ));

-- Update the default to match PIE UI expectations
ALTER TABLE companies ALTER COLUMN status SET DEFAULT 'Watching';
