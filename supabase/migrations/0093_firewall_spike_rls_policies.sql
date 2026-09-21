-- Firewall prototype / security spike, Sprint: RLS narrowing + additive grants.
--
-- Two pre-existing gaps found during this spike's investigation, fixed here
-- because the spike cannot function safely without them (not scope creep,
-- a precondition):
--   1. org_access_grants had `allow_all_org_access_grants` (PERMISSIVE, ALL,
--      qual=true, with_check=true, role public) — anyone, even unauthenticated,
--      could read or write every grant row, including granting themselves
--      access. Replaced with a read-your-own-grants policy; writes go through
--      the admin client only (internal grant management), never client input.
--   2. campaigns had `authenticated_access` (PERMISSIVE, ALL, qual=
--      auth.role()='authenticated') — any authenticated user had full access
--      to every campaign. Replaced with a SELECT-only policy scoped to an
--      explicit grant. Safe: all existing internal reads/writes use
--      createAdminClient(), which bypasses RLS regardless of policy content.
--
-- cultural_signals keeps its existing deny-all policy untouched; this adds
-- one additive SELECT-only policy on top (permissive policies OR together).
-- No write policy is added for cultural_signals under any role.

-- 1. org_access_grants: was fully open to public. Narrow to "read your own grants".
drop policy if exists allow_all_org_access_grants on org_access_grants;

create policy org_access_grants_own_select on org_access_grants
  for select
  to authenticated
  using (grantee_user_id = auth.uid());

-- 2. campaigns: was ALL access to any authenticated user. Narrow to granted campaigns, read-only.
drop policy if exists authenticated_access on campaigns;

create policy campaigns_external_grant_select on campaigns
  for select
  to authenticated
  using (
    exists (
      select 1 from org_access_grants g
      where g.resource_type = 'campaign'
        and g.resource_id = campaigns.id
        and g.grantee_user_id = auth.uid()
    )
  );

-- 3. strategic_basis_sources: RLS was disabled entirely. Enable + scope to granted campaigns.
alter table strategic_basis_sources enable row level security;

create policy sbs_external_grant_select on strategic_basis_sources
  for select
  to authenticated
  using (
    exists (
      select 1 from org_access_grants g
      where g.resource_type = 'campaign'
        and g.resource_id = strategic_basis_sources.campaign_id
        and g.grantee_user_id = auth.uid()
    )
  );

-- 4. cultural_signals: additive read-only policy for signals cited into a granted campaign.
create policy cultural_signals_external_grant_select on cultural_signals
  for select
  to authenticated
  using (
    exists (
      select 1
      from strategic_basis_sources sbs
      join org_access_grants g
        on g.resource_type = 'campaign'
        and g.resource_id = sbs.campaign_id
      where sbs.cultural_signal_id = cultural_signals.id
        and g.grantee_user_id = auth.uid()
    )
  );

-- 5. campaign_cultural_signal_assessments: enable RLS, scope select/insert/update to the grant.
alter table campaign_cultural_signal_assessments enable row level security;

create policy ccsa_select on campaign_cultural_signal_assessments
  for select
  to authenticated
  using (
    exists (
      select 1 from org_access_grants g
      where g.resource_type = 'campaign'
        and g.resource_id = campaign_cultural_signal_assessments.campaign_id
        and g.grantee_user_id = auth.uid()
    )
  );

create policy ccsa_insert on campaign_cultural_signal_assessments
  for insert
  to authenticated
  with check (
    assessor_user_id = auth.uid()
    and assessor_org_id = (select org_id from user_profiles where id = auth.uid())
    and exists (
      select 1 from org_access_grants g
      where g.resource_type = 'campaign'
        and g.resource_id = campaign_cultural_signal_assessments.campaign_id
        and g.grantee_user_id = auth.uid()
        and g.access_level = 'view_plus_assessment'
    )
  );

create policy ccsa_update on campaign_cultural_signal_assessments
  for update
  to authenticated
  using (assessor_user_id = auth.uid())
  with check (
    assessor_user_id = auth.uid()
    and assessor_org_id = (select org_id from user_profiles where id = auth.uid())
    and exists (
      select 1 from org_access_grants g
      where g.resource_type = 'campaign'
        and g.resource_id = campaign_cultural_signal_assessments.campaign_id
        and g.grantee_user_id = auth.uid()
        and g.access_level = 'view_plus_assessment'
    )
  );
