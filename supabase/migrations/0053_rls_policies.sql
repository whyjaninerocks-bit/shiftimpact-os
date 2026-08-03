-- 0053: Phase 1 RLS — authenticated users only
-- Simple: any logged-in user can see/edit everything.
-- Phase 2 upgrade: add org_id scoping (when partner/client accounts go live).

-- campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON campaigns;
CREATE POLICY "authenticated_access" ON campaigns FOR ALL USING (auth.role() = 'authenticated');

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON companies;
CREATE POLICY "authenticated_access" ON companies FOR ALL USING (auth.role() = 'authenticated');

-- frame_briefs
ALTER TABLE frame_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON frame_briefs;
CREATE POLICY "authenticated_access" ON frame_briefs FOR ALL USING (auth.role() = 'authenticated');

-- stage_briefs
ALTER TABLE stage_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON stage_briefs;
CREATE POLICY "authenticated_access" ON stage_briefs FOR ALL USING (auth.role() = 'authenticated');

-- big_idea_platforms
ALTER TABLE big_idea_platforms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON big_idea_platforms;
CREATE POLICY "authenticated_access" ON big_idea_platforms FOR ALL USING (auth.role() = 'authenticated');

-- phase_gates
ALTER TABLE phase_gates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON phase_gates;
CREATE POLICY "authenticated_access" ON phase_gates FOR ALL USING (auth.role() = 'authenticated');

-- kill_switches
ALTER TABLE kill_switches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON kill_switches;
CREATE POLICY "authenticated_access" ON kill_switches FOR ALL USING (auth.role() = 'authenticated');

-- campaign_dashboards
ALTER TABLE campaign_dashboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON campaign_dashboards;
CREATE POLICY "authenticated_access" ON campaign_dashboards FOR ALL USING (auth.role() = 'authenticated');

-- gate_signal_logs
ALTER TABLE gate_signal_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON gate_signal_logs;
CREATE POLICY "authenticated_access" ON gate_signal_logs FOR ALL USING (auth.role() = 'authenticated');

-- campaign_reports
ALTER TABLE campaign_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON campaign_reports;
CREATE POLICY "authenticated_access" ON campaign_reports FOR ALL USING (auth.role() = 'authenticated');

-- keep portal_views public (no auth needed for /portal/[id])
-- (portal_views table may not exist, so wrapped in DO block)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portal_views') THEN
    ALTER TABLE portal_views ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_read" ON portal_views;
    CREATE POLICY "public_read" ON portal_views FOR SELECT USING (true);
  END IF;
END $$;
