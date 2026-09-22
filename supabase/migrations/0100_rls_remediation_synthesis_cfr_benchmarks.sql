-- 0100: RLS remediation for three tables the Supabase Security Advisor
-- flagged as fully exposed to the anon and authenticated roles:
--   strategic_synthesis_runs, creative_format_reads, platform_benchmarks
--
-- Root cause: these three tables' own creation migrations (0088, 0098, 0099)
-- never included an ENABLE ROW LEVEL SECURITY line. Not a deliberate choice,
-- an oversight, unlike campaign_signal_maps (0073), which enables RLS with
-- no permissive policy on purpose and says so in a comment.
--
-- Access inventory before this migration (checked against the live code,
-- not assumed): every read and write against these three tables, across
-- lib/data.ts, lib/actions.ts, app/api/creative-format-read/route.ts, and
-- app/api/strategic-synthesis/route.ts, goes through createAdminClient()
-- (lib/supabase/admin.ts), the service role client. No browser client, no
-- user-session-bound server client, and no client component ever queries
-- these three tables directly. CreativeFormatReadSection.tsx (client
-- component) calls the API route over fetch, it does not touch Supabase
-- directly. The Platform Benchmark admin page and its Server Actions are
-- additionally gated by middleware.ts, which already requires a logged in,
-- org_type = 'ShiftImpact' session for any page outside PUBLIC_PREFIXES.
--
-- Because every legitimate path already uses the service role client, which
-- bypasses RLS regardless of policies present, enabling RLS here changes
-- nothing about how the app itself reads or writes these tables. What it
-- changes is the anon key: NEXT_PUBLIC_SUPABASE_ANON_KEY ships to the
-- browser bundle and can call the Supabase REST API directly, outside the
-- app entirely. With RLS disabled, that direct call could read or write
-- every row. With RLS enabled and no permissive policy for anon or
-- authenticated, that direct call is refused.
--
-- Deliberately no "authenticated_access" policy here, unlike 0053's pattern
-- on campaigns / frame_briefs / big_idea_platforms / kill_switches /
-- campaign_reports. Those are Phase 1, any logged in user policies, and
-- that is too wide for these three tables specifically: assertShiftImpactSession's
-- own comment confirms an External Reviewer or a future Partner/Client
-- account is a real Supabase Auth user with role 'authenticated', so an
-- authenticated_access policy would let that account read or write
-- strategic_synthesis_runs, creative_format_reads, and platform_benchmarks
-- directly via the REST API, bypassing both middleware's org_type check and
-- the app's own route logic. Matches the explicit requirement: no external
-- reviewer or client portal access to these three tables yet.
--
-- Pattern used instead matches campaign_signal_maps' posture (RLS on, no
-- policy for anon/authenticated) but adds one explicit, documented
-- service_role policy per table, the same shape already used on
-- ai_brand_visibility_scores (0019), so the intent reads clearly on
-- inspection rather than relying on an undocumented bypass.

ALTER TABLE strategic_synthesis_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON strategic_synthesis_runs;
CREATE POLICY "service_role_full_access" ON strategic_synthesis_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE creative_format_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON creative_format_reads;
CREATE POLICY "service_role_full_access" ON creative_format_reads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE platform_benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON platform_benchmarks;
CREATE POLICY "service_role_full_access" ON platform_benchmarks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
