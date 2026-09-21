-- Firewall prototype / security spike, Sprint: gated external access
-- Adds person-level grant targeting and the campaign-scoped external
-- durability assessment table. cultural_signals stays master/read-only
-- for external users by design; this table is where their judgement lives.

alter table org_access_grants
  add column if not exists grantee_user_id uuid references auth.users(id);

create table if not exists campaign_cultural_signal_assessments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  cultural_signal_id uuid not null references cultural_signals(id),
  assessor_user_id uuid not null references auth.users(id),
  assessor_org_id uuid not null references organisations(id),
  durability_status text,
  durability_reassess_at date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, cultural_signal_id, assessor_user_id)
);
