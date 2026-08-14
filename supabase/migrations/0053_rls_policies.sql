-- 0053: Phase 1 RLS -- authenticated users only
-- Any logged-in user can see/edit everything.
-- Phase 2: add org_id scoping when partner/client accounts go live.

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON campaigns;
CREATE POLICY "authenticated_access" ON campaigns FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON companies;
CREATE POLICY "authenticated_access" ON companies FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE frame_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON frame_briefs;
CREATE POLICY "authenticated_access" ON frame_briefs FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE stage_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON stage_briefs;
CREATE POLICY "authenticated_access" ON stage_briefs FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE big_idea_platforms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON big_idea_platforms;
CREATE POLICY "authenticated_access" ON big_idea_platforms FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE phase_gates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON phase_gates;
CREATE POLICY "authenticated_access" ON phase_gates FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE kill_switches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON kill_switches;
CREATE POLICY "authenticated_access" ON kill_switches FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE campaign_dashboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON campaign_dashboards;
CREATE POLICY "authenticated_access" ON campaign_dashboards FOR ALL USING (auth.role() = 'authenticated');

-- Correct table name is gate_signal_log (singular)
ALTER TABLE gate_signal_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON gate_signal_log;
CREATE POLICY "authenticated_access" ON gate_signal_log FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE campaign_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON campaign_reports;
CREATE POLICY "authenticated_access" ON campaign_reports FOR ALL USING (auth.role() = 'authenticated');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portal_views') THEN
    ALTER TABLE portal_views ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_read" ON portal_views;
    CREATE POLICY "public_read" ON portal_views FOR SELECT USING (true);
  END IF;
END $$;
