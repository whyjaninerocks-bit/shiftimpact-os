-- Migration 0082: Brief / recommendation compliance tracking
--
-- Closes a real gap: every recommendation surface in the app (decision_snapshot,
-- report finding.recommendation, prediction_accuracy_log) is one-directional —
-- the system records what it recommended, never whether it was actually
-- executed. This table adds that missing "did it happen" loop, one row per
-- recommendation extracted from a campaign_reports.findings entry.
--
-- Rows are lazily generated (see lib/data.ts ensureComplianceItems) the first
-- time an agency user opens the compliance checklist for a report — not via
-- trigger — so this migration only needs to create the table.

create table if not exists report_recommendation_compliance (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  campaign_report_id uuid not null references campaign_reports(id) on delete cascade,
  finding_index integer not null,                 -- position within that report's findings[] array
  recommendation_text text not null,               -- denormalized copy, durable even if findings edits later
  status text not null default 'Pending'
    check (status in ('Pending', 'Done in full', 'Done partially', 'Not done')),
  reason text,                                      -- required in the UI when partial/not done, not DB-enforced
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_report_id, finding_index)
);

create index if not exists idx_report_compliance_campaign
  on report_recommendation_compliance (campaign_id);

create index if not exists idx_report_compliance_report
  on report_recommendation_compliance (campaign_report_id);

-- updated_at trigger — reuses the shared set_updated_at() function from
-- migration 0001, same pattern as every other table in this schema.
drop trigger if exists report_compliance_set_updated_at on report_recommendation_compliance;
create trigger report_compliance_set_updated_at
  before update on report_recommendation_compliance
  for each row execute function set_updated_at();
