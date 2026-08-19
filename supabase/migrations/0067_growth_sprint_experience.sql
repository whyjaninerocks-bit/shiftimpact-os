-- 0067_growth_sprint_experience.sql
-- Growth Sprint Experience v1
--
-- New, separate table — NOT an extension of diagnostic_sessions. Its
-- status CHECK constraint only supports 4 values incompatible with the
-- Growth Sprint lifecycle (draft -> diagnosed -> recommended -> approved
-- -> published -> revoked), so a new table was the correct call rather
-- than overloading an existing one.
--
-- RLS matches the two existing live conventions in this codebase, not a
-- new owner_id / auth.uid() row-scoping model:
--   - growth_sprints:        allow_all (qual = true)  — same as diagnostic_sessions
--   - growth_sprint_shares:  deny_public (qual = false) — same as quick_audits,
--                             client_report_recipients. All access to this
--                             table goes through the admin client only.
--
-- Applied and verified on staging (shiftimpactonlyai / zlyhrcendxcubxneihvq)
-- prior to this file being committed. This file is the production record.

create table if not exists public.growth_sprints (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_location text,
  business_context text check (business_context in ('commerce','experience','service','custom')),
  target_customer text,
  growth_question text not null,
  desired_outcome text,
  current_obstacle text,
  constraints_notes text,
  revenue_pillars jsonb not null default '[]'::jsonb,
  growth_moments jsonb not null default '[]'::jsonb,
  evidence_tags jsonb not null default '{}'::jsonb,
  diagnosis_raw jsonb,
  diagnosis_reviewed jsonb,
  recommendation_raw jsonb,
  recommendation_reviewed jsonb,
  decision_outcome text check (decision_outcome in ('Scale','Shift','Hold','Retest','Stop')),
  override_reason text,
  validation_feedback jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','diagnosed','recommended','approved','published','revoked')),
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  published_at timestamptz,
  revoked_at timestamptz
);

alter table public.growth_sprints enable row level security;

create policy "allow_all_growth_sprints" on public.growth_sprints
  for all using (true) with check (true);

create table if not exists public.growth_sprint_shares (
  id uuid primary key default gen_random_uuid(),
  growth_sprint_id uuid not null references public.growth_sprints(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  accessed_at timestamptz,
  access_count integer not null default 0
);

create index if not exists growth_sprint_shares_sprint_id_idx
  on public.growth_sprint_shares(growth_sprint_id);

alter table public.growth_sprint_shares enable row level security;

create policy "growth_sprint_shares_deny_public" on public.growth_sprint_shares
  for all using (false);
