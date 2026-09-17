-- 0086_signal_map_brand_commerce_classification.sql
-- Brand-Commerce Intelligence Extension v0.1 — Task 1
--
-- Applied directly via Supabase MCP (apply_migration, name
-- "signal_map_brand_commerce_classification") on 17 Sept 2026; this file
-- mirrors that applied state for repo/migration-history parity, same
-- convention as 0074_signal_map_active_flag.sql.
--
-- Strategist-set only, never auto-computed. No RLS change — the table keeps
-- zero permissive policies; access stays exclusively through the
-- server-side admin client, same posture as every other column here.
--
-- Deliberately does NOT seed Demo Trial's classification value. A specific
-- campaign's business classification is not schema hygiene and does not
-- belong in a migration that could be replayed on a fresh branch — see
-- lib/actions.ts (saveCampaignSignalMap) for the strategist-facing write
-- path, and the separate one-off UPDATE run via execute_sql for Demo Trial.

alter table campaign_signal_maps
  add column if not exists classification text
    check (classification is null or classification in (
      'not_classified','brand_builder','commerce_mover',
      'promo_extractor','brand_risk','inefficient_activity','conversion_blocked'
    ))
    default 'not_classified';

comment on column campaign_signal_maps.classification is
  'Strategist-set Brand-Commerce read. Never auto-computed. Default not_classified. See CategorySignalSection.tsx for client-facing badge.';

-- Blanket-backfill only: guarantees no existing row is left NULL/ambiguous.
-- Demo Trial's specific commerce_mover value is set separately, not here.
update campaign_signal_maps set classification = 'not_classified' where classification is null;
