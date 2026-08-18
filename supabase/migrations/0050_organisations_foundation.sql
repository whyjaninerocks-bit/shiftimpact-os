-- Migration 0050: Organisations foundation — multi-tenant scaffold
-- Non-breaking: all new columns are nullable. RLS stays off until auth sprint.
-- When auth is added, flip on RLS policies and the app becomes multi-tenant automatically.

-- ─── Root tenant table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('ShiftImpact', 'Partner', 'Client')),
  slug        TEXT UNIQUE,                          -- future URL routing: /workspace/yeos
  website     TEXT,
  logo_url    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_organisations" ON organisations FOR ALL USING (true) WITH CHECK (true);

-- ─── Explicit access grants (partner → campaign/client sharing) ───────────────

CREATE TABLE IF NOT EXISTS org_access_grants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grantee_org_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  resource_type   TEXT NOT NULL CHECK (resource_type IN ('campaign', 'client', 'report', 'workspace')),
  resource_id     UUID NOT NULL,
  access_level    TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'comment', 'edit')),
  granted_by      TEXT,                             -- ShiftImpact team member who granted it
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE org_access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_org_access_grants" ON org_access_grants FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS org_access_grants_grantee_idx ON org_access_grants(grantee_org_id);
CREATE INDEX IF NOT EXISTS org_access_grants_resource_idx ON org_access_grants(resource_type, resource_id);

-- ─── Add org scoping to existing tables (nullable — non-breaking) ─────────────

-- companies: client organisations
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id);

-- campaigns: owned by a client org (ShiftImpact manages all for now)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS owner_org_id UUID REFERENCES organisations(id);

-- partner_workspaces: link each partner workspace to its organisation
ALTER TABLE partner_workspaces
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS companies_org_id_idx        ON companies(org_id);
CREATE INDEX IF NOT EXISTS campaigns_owner_org_id_idx  ON campaigns(owner_org_id);
CREATE INDEX IF NOT EXISTS partner_workspaces_org_id_idx ON partner_workspaces(org_id);

-- ─── Seed: ShiftImpact as the system organisation ────────────────────────────
-- This is the admin/operator tenant. All current data is implicitly owned by this org.

INSERT INTO organisations (id, name, type, slug, notes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ShiftImpact',
  'ShiftImpact',
  'shiftimpact',
  'System organisation — the operator tenant. Admins can see all data across all client and partner orgs.'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: AOAI as the first partner organisation ────────────────────────────

INSERT INTO organisations (name, type, slug, notes)
VALUES (
  'Academy Of Artificial Intelligence',
  'Partner',
  'aoai',
  'First partner organisation. Referral and collaboration partner. Link to partner_workspaces.org_id when ready.'
)
ON CONFLICT (slug) DO NOTHING;
