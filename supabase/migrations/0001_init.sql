-- ShiftImpact OS — initial schema (v1)
-- 11 tables per docs/PRD.md

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────
-- Table 10 — Team
-- ─────────────────────────────────────────────────────────────────────────
create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  urgent_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Table 1 — Clients
-- ─────────────────────────────────────────────────────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry_profile text not null check (industry_profile in ('QSR','B2B','Retail','Other')),
  business_outcome_label text not null default 'Business Outcome',
  retention_metric_label text not null default 'Retention Metric',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Table 2 — Campaigns
-- ─────────────────────────────────────────────────────────────────────────
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  team_member_id uuid references team_members(id) on delete set null,
  name text not null,
  current_phase text not null default 'Demand' check (current_phase in ('Demand','Conversion','Retention','Complete')),
  confidence_score numeric(5,2) not null default 50 check (confidence_score between 0 and 100),
  gate_signal_status text not null default 'Pending' check (gate_signal_status in ('Pending','On Track','At Risk','Blocked')),
  -- operating intelligence (Claude-updated weekly)
  operating_notes text not null default '',
  last_review_date date,
  -- business outcome layer (commitment the OS is held accountable to)
  business_outcome_target numeric,
  business_outcome_actual numeric,
  retention_metric_target numeric,
  retention_metric_actual numeric,
  status text not null default 'Active' check (status in ('Active','Paused','Complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaigns_set_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Table 3 — FRAME Briefs (one per campaign, ICS scoring embedded)
-- ─────────────────────────────────────────────────────────────────────────
create table frame_briefs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references campaigns(id) on delete cascade,
  force text not null default '',
  role text not null default '',
  anchor text not null default '',
  mood text not null default '',
  expression text not null default '',
  clarity_statement text not null default '',
  -- ICS dimension scores, 1-5
  ics_cultural_fit smallint not null default 3 check (ics_cultural_fit between 1 and 5),
  ics_business_alignment smallint not null default 3 check (ics_business_alignment between 1 and 5),
  ics_audience_tension smallint not null default 3 check (ics_audience_tension between 1 and 5),
  ics_executional_coherence smallint not null default 3 check (ics_executional_coherence between 1 and 5),
  ics_measurability smallint not null default 3 check (ics_measurability between 1 and 5),
  ics_scalability smallint not null default 3 check (ics_scalability between 1 and 5),
  -- ICS Weighted Total: weights 20/20/20/15/15/10, scaled to 0-100
  ics_weighted_total numeric(5,1) generated always as (
    round(
      (
        ics_cultural_fit * 0.20
        + ics_business_alignment * 0.20
        + ics_audience_tension * 0.20
        + ics_executional_coherence * 0.15
        + ics_measurability * 0.15
        + ics_scalability * 0.10
      ) * 20
    , 1)
  ) stored,
  -- Any Dimension = 1 blocker
  ics_any_dimension_blocker boolean generated always as (
    ics_cultural_fit = 1
    or ics_business_alignment = 1
    or ics_audience_tension = 1
    or ics_executional_coherence = 1
    or ics_measurability = 1
    or ics_scalability = 1
  ) stored,
  -- ICS Threshold: >=85 Advance, 70-84 Fix, 55-69 Rework, <55 Stop
  ics_threshold text generated always as (
    case
      when (
        ics_cultural_fit * 0.20
        + ics_business_alignment * 0.20
        + ics_audience_tension * 0.20
        + ics_executional_coherence * 0.15
        + ics_measurability * 0.15
        + ics_scalability * 0.10
      ) * 20 >= 85 then 'Advance'
      when (
        ics_cultural_fit * 0.20
        + ics_business_alignment * 0.20
        + ics_audience_tension * 0.20
        + ics_executional_coherence * 0.15
        + ics_measurability * 0.15
        + ics_scalability * 0.10
      ) * 20 >= 70 then 'Fix'
      when (
        ics_cultural_fit * 0.20
        + ics_business_alignment * 0.20
        + ics_audience_tension * 0.20
        + ics_executional_coherence * 0.15
        + ics_measurability * 0.15
        + ics_scalability * 0.10
      ) * 20 >= 55 then 'Rework'
      else 'Stop'
    end
  ) stored,
  lock_status text not null default 'Draft' check (lock_status in ('Draft','Locked')),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger frame_briefs_set_updated_at
  before update on frame_briefs
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Table 4 — Kill Switches (child of FRAME Brief, multiple per campaign)
-- ─────────────────────────────────────────────────────────────────────────
create table kill_switches (
  id uuid primary key default gen_random_uuid(),
  frame_brief_id uuid not null references frame_briefs(id) on delete cascade,
  condition text not null,
  trigger_status text not null default 'Inactive' check (trigger_status in ('Inactive','Monitoring','Triggered')),
  priority text not null default 'Medium' check (priority in ('High','Medium','Low')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Table 6 — Gate Templates (reference table, pre-loaded)
-- ─────────────────────────────────────────────────────────────────────────
create table gate_templates (
  id uuid primary key default gen_random_uuid(),
  gate_type text not null unique,
  sequence_order smallint not null,
  required_signal_template text not null,
  standard_criteria text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Table 7 — Phase Gates (four per campaign, inherits from Gate Templates)
-- ─────────────────────────────────────────────────────────────────────────
create table phase_gates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  gate_template_id uuid not null references gate_templates(id),
  gate_type text not null,
  sequence_order smallint not null,
  required_signal text not null,
  actual_signal_data text not null default '',
  gate_decision text not null default 'Pending' check (gate_decision in ('Pending','Open','Hold','Stop')),
  pre_mortem text not null default '',
  idea_led_vs_spend_led text check (idea_led_vs_spend_led in ('Idea-Led','Spend-Led','Mixed')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, gate_template_id)
);

create trigger phase_gates_set_updated_at
  before update on phase_gates
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Table 5 — STAGE Briefs (five per campaign, inherits FRAME DNA via lookup)
-- ─────────────────────────────────────────────────────────────────────────
create table stage_briefs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  stage text not null check (stage in ('Demand','Conversion','Retention')),
  channel text not null,
  brief_body text not null default '',
  propagation_mechanism text not null default '',
  idea_led_vs_spend_led text check (idea_led_vs_spend_led in ('Idea-Led','Spend-Led','Mixed')),
  -- lookups, auto-inherited from the campaign's locked FRAME Brief
  frame_anchor text not null default '',
  mood_register text not null default '',
  status text not null default 'Draft' check (status in ('Draft','Ready','Live','Paused','Complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stage_briefs_set_updated_at
  before update on stage_briefs
  for each row execute function set_updated_at();

-- Lookup: pull FRAME Anchor + Mood Register from the campaign's FRAME Brief.
-- Also enforces "FRAME is locked before any STAGE Brief is issued".
create or replace function stage_briefs_inherit_frame()
returns trigger as $$
declare
  f record;
begin
  select anchor, mood, lock_status into f
  from frame_briefs
  where campaign_id = new.campaign_id;

  if f is null or f.lock_status <> 'Locked' then
    raise exception 'FRAME Brief must be locked before a STAGE Brief can be created for this campaign';
  end if;

  new.frame_anchor := f.anchor;
  new.mood_register := f.mood;
  return new;
end;
$$ language plpgsql;

create trigger stage_briefs_inherit_frame_trg
  before insert on stage_briefs
  for each row execute function stage_briefs_inherit_frame();

-- Re-sync lookups on STAGE Briefs whenever the FRAME Brief changes
-- (so drift is visible immediately, per PRD).
create or replace function frame_briefs_propagate_to_stage_briefs()
returns trigger as $$
begin
  if new.lock_status = 'Locked' then
    update stage_briefs
    set frame_anchor = new.anchor, mood_register = new.mood
    where campaign_id = new.campaign_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger frame_briefs_propagate_trg
  after update on frame_briefs
  for each row execute function frame_briefs_propagate_to_stage_briefs();

-- "A STAGE Brief cannot be set to Live if the previous Gate is not Open"
-- Conversion stage requires Gate 1: Demand to be Open.
-- Retention stage requires Gate 2: Conversion to be Open.
-- Demand stage requires no prior gate.
create or replace function stage_briefs_check_gate_for_live()
returns trigger as $$
declare
  required_gate_type text;
  decision text;
begin
  if new.status = 'Live' and (old.status is distinct from 'Live') then
    required_gate_type := case new.stage
      when 'Conversion' then 'Gate 1: Demand'
      when 'Retention' then 'Gate 2: Conversion'
      else null
    end;

    if required_gate_type is not null then
      select gate_decision into decision
      from phase_gates
      where campaign_id = new.campaign_id and gate_type = required_gate_type;

      if decision is distinct from 'Open' then
        raise exception 'Cannot set STAGE Brief to Live: % is not Open', required_gate_type;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger stage_briefs_check_gate_for_live_trg
  before update on stage_briefs
  for each row execute function stage_briefs_check_gate_for_live();

-- ─────────────────────────────────────────────────────────────────────────
-- Table 8 — Campaign Command Dashboard (one record per campaign per week)
-- ─────────────────────────────────────────────────────────────────────────
create table campaign_dashboards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  week_of date not null,
  -- Quadrant 1: Decision Snapshot
  decision_snapshot text not null default '',
  -- Quadrant 2: Funnel Health RAG per stage
  funnel_health_demand text not null default 'Green' check (funnel_health_demand in ('Green','Amber','Red')),
  funnel_health_conversion text not null default 'Green' check (funnel_health_conversion in ('Green','Amber','Red')),
  funnel_health_retention text not null default 'Green' check (funnel_health_retention in ('Green','Amber','Red')),
  -- Quadrant 3: Business Impact (actual vs target)
  business_impact_actual numeric,
  business_impact_target numeric,
  -- Quadrant 4: SSIC + Triggers
  ssic text not null default '',
  triggers text not null default '',
  -- human expert judgement (strategy lead), not Claude
  idea_integrity_observation text not null default '',
  created_at timestamptz not null default now(),
  unique (campaign_id, week_of)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Table 9 — Business Outcomes Log (rolling weekly record, audit trail)
-- ─────────────────────────────────────────────────────────────────────────
create table business_outcomes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  week_of date not null,
  metric_label text not null,
  target_value numeric,
  actual_value numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (campaign_id, week_of, metric_label)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Table 11 — OS Rules (intelligence layer brain)
-- ─────────────────────────────────────────────────────────────────────────
create table os_rules (
  id uuid primary key default gen_random_uuid(),
  rule_name text not null unique,
  rule_type text not null check (rule_type in ('Escalation','Scoring','Gate Permission','Scheduled Review','Configuration')),
  description text not null,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Rollups
-- ─────────────────────────────────────────────────────────────────────────

-- Clients.Active Campaigns
create view clients_with_rollups as
select
  c.*,
  coalesce(ac.active_campaigns, 0) as active_campaigns
from clients c
left join (
  select client_id, count(*) as active_campaigns
  from campaigns
  where status = 'Active'
  group by client_id
) ac on ac.client_id = c.id;

-- Team.Active Campaigns + Capacity Status
create view team_with_rollups as
select
  t.*,
  coalesce(ac.active_campaigns, 0) as active_campaigns,
  case when coalesce(ac.active_campaigns, 0) > 5 then 'Over Capacity' else 'OK' end as capacity_status
from team_members t
left join (
  select team_member_id, count(*) as active_campaigns
  from campaigns
  where status = 'Active'
  group by team_member_id
) ac on ac.team_member_id = t.id;

-- Campaign overview (joins client + frame brief headline fields, used across the app)
create view campaigns_overview as
select
  camp.*,
  cl.name as client_name,
  cl.industry_profile,
  cl.business_outcome_label,
  cl.retention_metric_label,
  tm.name as team_member_name,
  fb.id as frame_brief_id,
  fb.lock_status as frame_lock_status,
  fb.ics_weighted_total,
  fb.ics_threshold,
  fb.anchor as frame_anchor,
  fb.mood as frame_mood,
  fb.clarity_statement
from campaigns camp
left join clients cl on cl.id = camp.client_id
left join team_members tm on tm.id = camp.team_member_id
left join frame_briefs fb on fb.campaign_id = camp.id;
