-- 0052: user_profiles — links Supabase auth users to organisations
-- Run after 0050 (organisations table). Backfills existing data to ShiftImpact org.

CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES organisations(id),
  org_type   TEXT NOT NULL CHECK (org_type IN ('ShiftImpact', 'Partner', 'Client')),
  role       TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Admin', 'Member', 'Viewer')),
  full_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- Users can read their own profile; admins can read all
CREATE POLICY "own_profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

-- ── Backfill org_id on all existing data → ShiftImpact org ──────────────────
-- Safe: all seeded/demo data belongs to Janine's org

UPDATE campaigns
  SET owner_org_id = '00000000-0000-0000-0000-000000000001'
  WHERE owner_org_id IS NULL;

UPDATE companies
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

UPDATE partner_workspaces
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;
