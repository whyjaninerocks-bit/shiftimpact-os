-- Migration 0003 — Signal Log table + ICS label fix
-- 1. Fix ics_threshold label: 70-84 was 'Fix', should be 'Conditional'
-- 2. Add gate_signal_log table (audit trail for all signal readings)

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Fix ICS threshold label (drop generated column, re-add with correct labels)
-- ─────────────────────────────────────────────────────────────────────────

alter table frame_briefs drop column ics_threshold;

alter table frame_briefs add column ics_threshold text generated always as (
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
    ) * 20 >= 70 then 'Conditional'
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
) stored;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Gate Signal Log — audit trail for all signal readings
-- ─────────────────────────────────────────────────────────────────────────

create table gate_signal_log (
  id              uuid        not null default gen_random_uuid() primary key,
  campaign_id     uuid        not null references campaigns(id) on delete cascade,
  gate_id         uuid        references phase_gates(id) on delete set null,
  logged_at       date        not null default current_date,
  signal_type     text        not null,
  signal_label    text        not null,
  actual_value    numeric,
  threshold_value numeric,
  unit            text,
  pass            boolean     generated always as (
                                actual_value is not null
                                and threshold_value is not null
                                and actual_value >= threshold_value
                              ) stored,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table gate_signal_log enable row level security;

create policy "gate_signal_log_all_access"
  on gate_signal_log for all using (true) with check (true);

create index gate_signal_log_campaign_idx on gate_signal_log (campaign_id, logged_at desc);
create index gate_signal_log_gate_idx     on gate_signal_log (gate_id, logged_at desc);
