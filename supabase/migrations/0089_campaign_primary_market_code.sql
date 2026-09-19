-- Migration 0089: Stage 4A.3 — structured campaign market
--
-- Adds campaigns.primary_market_code so the Cultural Radar signal picker
-- (lib/cultural-signal-picker.ts, Stage 4A.2) can match campaign market
-- against cultural_signals.geographic_scope deterministically, instead of
-- relying only on the free-text keyword inference fallback.
--
-- Nullable, no default, no CHECK constraint on purpose — the approved
-- option list (MY/ID/SG/PH/TH/VN/SEA/GLOBAL/OTHER) is validated at the app
-- layer (lib/actions.ts updateCampaign()), matching the existing pattern
-- for campaign_pathway / regulatory_category on frame_briefs. This keeps
-- adding a future market code a code change, not a migration.
alter table campaigns add column if not exists primary_market_code text;

-- campaigns_overview is `SELECT c.<explicit columns>, ...` (Postgres froze
-- the old `camp.*` into a fixed column list at CREATE VIEW time — verified
-- via pg_get_viewdef against the live database before writing this
-- migration, not assumed from the original 0001_init.sql text, since that
-- file's join types had already drifted from what's actually deployed).
-- A new column on campaigns does NOT automatically appear here; the view
-- must be recreated. Everything below is byte-for-byte identical to the
-- live view (same alias `c`, same INNER JOIN on clients, same LEFT JOINs)
-- except for the one added column — no other view logic changes.
create or replace view campaigns_overview as
 SELECT c.id,
    c.client_id,
    c.team_member_id,
    c.name,
    c.current_phase,
    c.confidence_score,
    c.gate_signal_status,
    c.operating_notes,
    c.last_review_date,
    c.business_outcome_target,
    c.business_outcome_actual,
    c.retention_metric_target,
    c.retention_metric_actual,
    c.status,
    c.created_at,
    c.updated_at,
    c.primary_market_code,
    cl.name AS client_name,
    cl.industry_profile,
    cl.business_outcome_label,
    cl.retention_metric_label,
    tm.name AS team_member_name,
    fb.id AS frame_brief_id,
    fb.lock_status AS frame_lock_status,
    fb.ics_weighted_total,
    fb.ics_threshold,
    fb.anchor AS frame_anchor,
    fb.mood AS frame_mood,
    fb.clarity_statement
   FROM campaigns c
     JOIN clients cl ON cl.id = c.client_id
     LEFT JOIN team_members tm ON tm.id = c.team_member_id
     LEFT JOIN frame_briefs fb ON fb.campaign_id = c.id;

-- Re-apply migration 0070's security fix — CREATE OR REPLACE VIEW does not
-- reliably preserve view options across a definition change, so this is
-- re-asserted explicitly rather than assumed.
alter view public.campaigns_overview set (security_invoker = true);
