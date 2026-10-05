-- 0105: Activation Blueprint V1 (Growth Decision Sprint) — Roma-ready prototype.
--
-- One table. Narrative sections, measures and the illustrative outcome all live
-- in structured JSONB (validated in lib/growth-decision/schema.ts). Measures are
-- shaped to match the columns a future blueprint_measures table would carry, so
-- promotion to relational tables for a named pilot is mechanical.
--
-- Access: service-role only, same posture as migration 0100. No anon or
-- authenticated policy. Every read/write goes through createAdminClient()
-- behind requireShiftImpactSession() / middleware.
--
-- execution_owner_* is deliberately generic: McCann Indonesia for the demo,
-- but any agency / in-house team / commerce or media partner later.

create table if not exists public.activation_blueprints (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null,
  territory               text not null,           -- e.g. commerce_leakage | demand_quality (config-driven, not constrained)
  market                  text not null default 'Indonesia',
  execution_owner_label   text,
  execution_owner_type    text,                    -- agency | in_house | commerce_partner | media_partner | specialist
  is_demo                 boolean not null default false,
  schema_version          integer not null default 1,
  inputs                  jsonb not null default '{}'::jsonb,   -- structured evidence + framing (seeded for demo)
  content                 jsonb not null default '{}'::jsonb,   -- stage1 / stage2 / stage3 / outcome / next
  stages                  jsonb not null default '{}'::jsonb,   -- per-stage draft metadata (model, drafted_at, lint)
  created_at              timestamp with time zone not null default now(),
  updated_at              timestamp with time zone not null default now()
);

alter table public.activation_blueprints enable row level security;

drop policy if exists service_role_full_access on public.activation_blueprints;
create policy service_role_full_access
  on public.activation_blueprints
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.activation_blueprints is
  'Activation Blueprint V1 (Growth Decision Sprint). Internal-only; service-role access. See lib/growth-decision/.';
