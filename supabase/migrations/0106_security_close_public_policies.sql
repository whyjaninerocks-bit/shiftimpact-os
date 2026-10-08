-- 0106_security_close_public_policies.sql
-- Security remediation step 1 (Pre-PRD Resolution Pack, section 6, approved 8 Oct 2026).
--
-- Replaces every `qual = true` policy granted to the `public` role (which
-- includes the anon key shipped in the browser bundle) with a deny policy.
-- All app reads and writes on these tables go through the server-side
-- service role client (createAdminClient), which bypasses RLS, so the app
-- is unaffected. Verified 8 Oct 2026: no file using the session/anon client
-- (lib/supabase/server.ts, lib/supabase/client.ts) queries these tables.
--
-- Reversible: each dropped policy is recreated in the DOWN block at the end
-- of this file (commented out).

-- 1. Drop the 16 open policies --------------------------------------------
drop policy if exists allow_all_autodrafts          on public.stage_brief_autodrafts;
drop policy if exists allow_all_budget_movements    on public.budget_movements;
drop policy if exists allow_all_decisions           on public.digest_decision_captures;
drop policy if exists allow_all_diagnostic_sessions on public.diagnostic_sessions;
drop policy if exists allow_all_digests             on public.campaign_os_digests;
drop policy if exists allow_all_kol_trackers        on public.kol_trackers;
drop policy if exists allow_all_learning_records    on public.campaign_learning_records;
drop policy if exists allow_all_mdh_imports         on public.mdh_imports;
drop policy if exists allow_all_organisations       on public.organisations;
drop policy if exists allow_all_replenishment       on public.audience_replenishment;
drop policy if exists allow_all_widget_leads        on public.widget_leads;
drop policy if exists bip_all_access                on public.big_idea_platforms;
drop policy if exists client_channels_all           on public.client_channels;
drop policy if exists client_signal_sources_all     on public.client_signal_sources;
drop policy if exists idea_extensions_all           on public.idea_extensions;
drop policy if exists gate_signal_log_all_access    on public.gate_signal_log;

-- signal_benchmarks: public read + public insert
drop policy if exists signal_benchmarks_insert on public.signal_benchmarks;
drop policy if exists signal_benchmarks_read   on public.signal_benchmarks;

-- 2. Explicit deny for public (same convention as *_deny_public elsewhere) -
create policy stage_brief_autodrafts_deny_public    on public.stage_brief_autodrafts    for all to public using (false) with check (false);
create policy budget_movements_deny_public          on public.budget_movements          for all to public using (false) with check (false);
create policy digest_decision_captures_deny_public  on public.digest_decision_captures  for all to public using (false) with check (false);
create policy diagnostic_sessions_deny_public       on public.diagnostic_sessions       for all to public using (false) with check (false);
create policy campaign_os_digests_deny_public       on public.campaign_os_digests       for all to public using (false) with check (false);
create policy kol_trackers_deny_public              on public.kol_trackers              for all to public using (false) with check (false);
create policy campaign_learning_records_deny_public on public.campaign_learning_records for all to public using (false) with check (false);
create policy mdh_imports_deny_public               on public.mdh_imports               for all to public using (false) with check (false);
create policy organisations_deny_public             on public.organisations             for all to public using (false) with check (false);
create policy audience_replenishment_deny_public    on public.audience_replenishment    for all to public using (false) with check (false);
create policy widget_leads_deny_public              on public.widget_leads              for all to public using (false) with check (false);
create policy client_channels_deny_public           on public.client_channels           for all to public using (false) with check (false);
create policy client_signal_sources_deny_public     on public.client_signal_sources     for all to public using (false) with check (false);
create policy idea_extensions_deny_public           on public.idea_extensions           for all to public using (false) with check (false);
create policy signal_benchmarks_deny_public         on public.signal_benchmarks         for all to public using (false) with check (false);
-- big_idea_platforms and gate_signal_log keep their existing
-- `authenticated_access` policy (auth.role() = 'authenticated'); only the
-- open public policy is removed. Tightening authenticated_access to
-- ShiftImpact org only is part of the engagement RLS step, not this one.

-- DOWN (manual rollback, do not run unless reverting):
-- drop policy <table>_deny_public on public.<table>;  -- for each above
-- create policy allow_all_widget_leads on public.widget_leads for all to public using (true) with check (true);
-- ...recreate the remaining 17 originals with `using (true)` in the same way.
