-- Layer 1 — Market Activation by Radar v0.1
-- Adds an honest, strategist-set coverage-status field to market_parameters
-- so downstream prompt chains (starting with Strategic Synthesis) can
-- distinguish markets with real curated cultural intelligence from markets
-- that are seeded metadata only. Never auto-computed from signal volume —
-- this is a deliberate ShiftImpact judgment call about what's actually been
-- curated and validated, not a raw count threshold.
--
-- NOT the same as is_active_for_kb (which is false for all 10 seeded rows,
-- including Malaysia, and belongs to a separate, currently-unwired KB
-- feature) — deliberately not reused, see Layer 1 plan.
--
-- QC note: this migration was applied directly to the live database via
-- the Supabase MCP on 2026-09-19 but this file was never written to the
-- repo at that time, so supabase/migrations/ drifted from the live schema.
-- Added here during the 2026-09-21 QC pass so the migration history matches
-- what is actually live. Safe to re-run (add column if not exists / drop+
-- recreate constraint), but should NOT be re-applied against the same
-- database that already has it — this file exists for history/parity with
-- a fresh environment, not to be run again against production.

alter table market_parameters
  add column if not exists coverage_status text not null default 'not_tracked';

alter table market_parameters
  drop constraint if exists market_parameters_coverage_status_check;

alter table market_parameters
  add constraint market_parameters_coverage_status_check
  check (coverage_status in ('not_tracked', 'experimental', 'active_tracking', 'strategic_coverage'));

-- Backfill: only MY and ID have real curated cultural signal coverage today
-- (31 and 3 signals respectively, per direct data check). Every other
-- seeded ASEAN market stays at the column default, 'not_tracked' — honest,
-- not silently upgraded.
update market_parameters set coverage_status = 'active_tracking' where market_code = 'MY';
update market_parameters set coverage_status = 'experimental' where market_code = 'ID';
