-- Migration 0018: Signal Media Delivery Health (Signal Layer 0 — MDH)
-- Tracks Reach / Impressions / Average Frequency as the prerequisite
-- check before Signal 1–3 can be interpreted.
--
-- Quarantine rule: MDH = Red → Signal 1–3 readings are quarantined.
-- Report shows delivery status only; signals are NOT interpreted.
--
-- Frequency thresholds (calibrated to category involvement):
--   < 1.5        → Red   (critically under-exposed — quarantine)
--   1.5 – 3.0   → Amber (light — signals directionally interpretable)
--   3.0 – 7.0   → Green (effective range — standard interpretation)
--   7.0 – 10.0  → Amber (high — check Creative Fatigue Index)
--   > 10.0       → Red   (over-frequency — quarantine, refresh creative)

create table if not exists signal_media_delivery (
  id              uuid          primary key default gen_random_uuid(),
  campaign_id     uuid          not null references campaigns(id) on delete cascade,
  week_number     integer       not null check (week_number >= 0),

  -- Three tracked metrics (all optional — graceful degradation if unavailable)
  reach_unique    integer,                     -- unique audience reached this week
  impressions     integer,                     -- total ad impressions
  avg_frequency   numeric(6,2),                -- auto-computed OR manual override

  -- Computed MDH status
  mdh_status      text          check (mdh_status in ('Green', 'Amber', 'Red')),

  -- Frequency interpretation label (stored for display)
  frequency_label text          not null default '',

  -- Quarantine flag: true when MDH = Red
  quarantine_active boolean     not null default false,

  -- Strategy lead notes
  strategy_notes  text          not null default '',

  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now(),
  unique (campaign_id, week_number)
);

create index if not exists signal_media_delivery_campaign_id_idx
  on signal_media_delivery(campaign_id);
