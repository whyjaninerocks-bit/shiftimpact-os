-- Migration 0070 — Security P3: lock down SECURITY DEFINER views + trigger functions
-- ShiftImpact OS
--
-- Engineering audit (23 Aug 2026) found campaigns_overview and
-- team_with_rollups defined as SECURITY DEFINER views with SELECT/INSERT/
-- UPDATE/DELETE/TRUNCATE grants open to anon and authenticated. Because the
-- frontend ships NEXT_PUBLIC_SUPABASE_ANON_KEY to the browser (lib/supabase/
-- client.ts), any visitor who extracts that key could read every client's
-- campaign, retention, and frame brief data directly via PostgREST, bypassing
-- every app-level auth check — SECURITY DEFINER views run with the view
-- creator's privileges rather than the querying role's, so RLS on the
-- underlying tables (campaigns, clients, frame_briefs, team_members) never
-- applied to these views.
--
-- Confirmed safe: the app only ever queries these views via
-- createAdminClient() (service_role) in lib/data.ts — service_role bypasses
-- grants/RLS entirely and is unaffected by this migration. No anon/
-- authenticated code path uses them today, so revoking is zero-impact.
--
-- Also revokes direct RPC execution on 4 internal trigger functions
-- (pie_audit_trigger, refresh_signal_freshness, update_company_last_signal_date,
-- update_prospect_tier). These fire automatically via BEFORE/AFTER triggers
-- and are never called directly by the app (confirmed via codebase search —
-- only referenced inside migration files as trigger definitions). As
-- SECURITY DEFINER functions with anon/authenticated EXECUTE grants, they
-- were callable by anyone with no auth via /rest/v1/rpc/<name>, running with
-- elevated privileges. Revoking direct execution does not affect their
-- normal trigger-based operation.
--
-- Continues the security_p0/p1/p2 lockdown pass applied 15-17 Aug 2026
-- (clients, os_settings, orchestration_runs, prediction_accuracy_log,
-- knowledge_docs, and other disabled tables) — those migrations were applied
-- directly via the Supabase MCP and were not previously saved as local
-- migration files; noting that gap here for the record.

revoke all on public.campaigns_overview from anon, authenticated;
revoke all on public.team_with_rollups from anon, authenticated;

alter view public.campaigns_overview set (security_invoker = true);
alter view public.team_with_rollups set (security_invoker = true);

revoke execute on function public.pie_audit_trigger() from anon, authenticated;
revoke execute on function public.refresh_signal_freshness() from anon, authenticated;
revoke execute on function public.update_company_last_signal_date() from anon, authenticated;
revoke execute on function public.update_prospect_tier() from anon, authenticated;
