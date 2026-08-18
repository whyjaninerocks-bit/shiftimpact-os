-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0016 — Sprint 12: F34 Consumer Intelligence Layer
-- 16 July 2026
--
-- Single addition:
--   consumer_intelligence_snapshots — stores live consumer pulse data pulled
--   from Apify actors (TikTok trending MY, Google Trends MY, The Star MY)
--   plus an AI-synthesised context paragraph per campaign.
--
--   Triggered manually via "Generate Consumer Pulse" button on the campaign page,
--   or programmatically at campaign start / campaign close.
--
--   trigger_type: 'manual' | 'campaign_start' | 'campaign_end'
--   status: 'pending' | 'complete' | 'error'
--   tiktok_trends, google_trends, thestar_news: raw JSONB from Apify
--   ai_synthesis: Claude-generated consumer context paragraph (internal only)
-- ─────────────────────────────────────────────────────────────────────────────

create table consumer_intelligence_snapshots (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       uuid references campaigns(id) on delete cascade not null,
  trigger_type      text not null default 'manual'
                      check (trigger_type in ('manual', 'campaign_start', 'campaign_end')),
  status            text not null default 'complete'
                      check (status in ('pending', 'complete', 'error')),
  cultural_context  text,
  industry_category text,
  tiktok_trends     jsonb,
  google_trends     jsonb,
  thestar_news      jsonb,
  ai_synthesis      text,
  error_detail      text,
  created_at        timestamptz default now() not null
);

-- Most-recent-first index for getConsumerSnapshot()
create index consumer_intelligence_snapshots_campaign_recent
  on consumer_intelligence_snapshots (campaign_id, created_at desc);

comment on table consumer_intelligence_snapshots is
  'F34 Consumer Intelligence Layer — live consumer pulse snapshots per campaign. INTERNAL ONLY.';
comment on column consumer_intelligence_snapshots.ai_synthesis is
  'Claude-generated consumer context paragraph synthesising TikTok, Google Trends and news signals. Never shown to clients.';
comment on column consumer_intelligence_snapshots.trigger_type is
  'manual = user-triggered button; campaign_start = auto on campaign create; campaign_end = auto on status → Complete.';

-- ─────────────────────────────────────────────────────────────────────────────
-- os_settings — global key-value store for operator-controlled configuration.
-- Used for AI model selection across all inference routes so the model can be
-- changed from the /settings UI without a Vercel redeploy.
-- ─────────────────────────────────────────────────────────────────────────────

create table os_settings (
  key         text primary key,
  value       text not null,
  label       text not null,
  description text,
  updated_at  timestamptz default now() not null
);

-- Seed: default AI models per route.
-- All Anthropic model strings — update value to switch models from the UI.
insert into os_settings (key, value, label, description) values
  ('model_signal_report',
   'claude-haiku-4-5-20251001',
   'Signal Intelligence',
   'Weekly signal report narrative + recommended actions'),
  ('model_intelligence_router',
   'claude-haiku-4-5-20251001',
   'Intelligence Query — Router',
   'Classifies query scope (fast/cheap; Haiku recommended)'),
  ('model_intelligence_query',
   'claude-sonnet-4-6',
   'Intelligence Query — Analysis',
   'Generates the 4-part intelligence finding (richer output; Sonnet recommended)'),
  ('model_campaign_report',
   'claude-sonnet-4-6',
   'Campaign Report',
   'Full Campaign Intelligence Report generation'),
  ('model_orchestration',
   'claude-haiku-4-5-20251001',
   'Orchestration',
   'Step-by-step campaign intelligence orchestration chain'),
  ('model_consumer_pulse',
   'claude-haiku-4-5-20251001',
   'Consumer Pulse',
   'Consumer intelligence synthesis from TikTok, Google Trends, The Star');

comment on table os_settings is
  'Operator-controlled configuration. AI model keys are read by API routes at runtime — change from /settings UI, no redeploy needed.';
