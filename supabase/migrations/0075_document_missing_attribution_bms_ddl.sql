-- 0075_document_missing_attribution_bms_ddl.sql
-- Documentation/backfill migration — attribution_records and
-- brand_momentum_scores were created directly against the live database at
-- some point in the 0005-0015 migration range, but no CREATE TABLE for
-- either ever made it into supabase/migrations/ (that numeric range is
-- entirely absent from the repo). Found during the Golden Test Set security
-- audit (1 Sept 2026) — EC-07/EC-09/EC-11/EC-14's nullability and
-- uniqueness claims were unverifiable from code alone as a result.
--
-- This migration is idempotent and purely documentary: every statement is
-- guarded (IF NOT EXISTS / conditional DO blocks) so it is a safe no-op
-- against the live database, which already has both tables in exactly this
-- shape (verified via information_schema + pg_constraint on 1 Sept 2026).
-- Its only purpose is to make the schema auditable from the repo going
-- forward, matching what already exists in production.

-- ── attribution_records ──────────────────────────────────────────────────
create table if not exists attribution_records (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null references campaigns(id) on delete cascade,
  week_number           integer not null check (week_number > 0),
  week_of               date not null,
  channel_name          text not null,
  spend_rm              numeric,
  sales_units           integer,
  sales_rm              numeric,
  incremental_lift_pct  numeric,
  test_type             text not null default 'MMM' check (test_type = any (array['MMM','Holdout','Proxy'])),
  notes                 text not null default '',
  created_at            timestamptz not null default now()
);

comment on table attribution_records is
  'Deliberately NO unique constraint on (campaign_id, week_number, channel_name) — '
  'multiple test_type records (MMM/Holdout/Proxy) can coexist for the same week+channel. '
  'spend_rm, sales_units, sales_rm, incremental_lift_pct are all nullable by design '
  '(e.g. Proxy records may have no spend_rm; blackout weeks may have spend_rm=0 with no crash risk).';

-- ── brand_momentum_scores ─────────────────────────────────────────────────
create table if not exists brand_momentum_scores (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 uuid not null references clients(id) on delete cascade,
  period_label              text not null default '',
  period_start              date not null,
  period_end                date, -- nullable: open/current periods have no end date yet
  sos_trajectory            text check (sos_trajectory = any (array['Up','Flat','Down'])),
  sos_magnitude             text check (sos_magnitude = any (array['Strong','Moderate','Weak'])),
  sos_note                  text not null default '',
  save_rate_trend           text check (save_rate_trend = any (array['Up','Flat','Down'])),
  save_rate_note            text not null default '',
  ugc_trend                 text check (ugc_trend = any (array['Up','Flat','Down'])),
  ugc_note                  text not null default '',
  sov_som_ratio             text check (sov_som_ratio = any (array['Positive','Neutral','Negative'])),
  sov_som_note              text not null default '',
  cep_coverage              text check (cep_coverage = any (array['Expanding','Stable','Narrowing'])),
  cep_note                  text not null default '',
  competitive_context       text check (competitive_context = any (array['Gaining','Holding','Losing'])),
  competitive_note          text not null default '',
  bms_direction             text check (bms_direction = any (array['Positive','Neutral','Negative'])),
  bms_velocity              text check (bms_velocity = any (array['Accelerating','Stable','Decelerating'])),
  bms_confidence            integer check (bms_confidence >= 1 and bms_confidence <= 10),
  dimension_conflict_flag   boolean not null default false,
  ai_read                   text not null default '',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on column brand_momentum_scores.period_end is
  'Nullable by design — an open/current period has no end date yet. '
  'Rendered in BrandMomentumSection.tsx history card alongside period_start when present.';
