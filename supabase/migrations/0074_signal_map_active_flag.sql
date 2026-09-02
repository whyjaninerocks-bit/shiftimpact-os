-- 0074_signal_map_active_flag.sql
-- Outcome-Led Signal Mapping — adds is_active to campaign_signal_maps so the
-- internal admin view (/signal-maps) can enforce "only one active map per
-- campaign." Applied directly via Supabase MCP on 1 Sept 2026; this file
-- mirrors that applied state for repo/migration-history parity.

alter table campaign_signal_maps
  add column if not exists is_active boolean not null default true;

comment on column campaign_signal_maps.is_active is
  'Only one active signal map per campaign at a time. Enforced by idx_campaign_signal_maps_one_active.';

create unique index if not exists idx_campaign_signal_maps_one_active
  on campaign_signal_maps (campaign_id)
  where is_active;
