-- Migration 0004 — Idea Extensions, Channel Registry, Signal Source Library

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Client Channel Registry — custom touchpoints per client
-- ─────────────────────────────────────────────────────────────────────────
create table client_channels (
  id               uuid        not null default gen_random_uuid() primary key,
  client_id        uuid        not null references clients(id) on delete cascade,
  channel_name     text        not null,
  channel_category text        not null default 'Custom',
  translation_hint text        not null default '',
  active           boolean     not null default true,
  created_at       timestamptz not null default now()
);
alter table client_channels enable row level security;
create policy "client_channels_all" on client_channels for all using (true) with check (true);
create index client_channels_client_idx on client_channels (client_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Client Signal Source Library — custom signal sources per client
-- ─────────────────────────────────────────────────────────────────────────
create table client_signal_sources (
  id           uuid        not null default gen_random_uuid() primary key,
  client_id    uuid        not null references clients(id) on delete cascade,
  source_name  text        not null,
  source_type  text        not null,
  unit         text        not null default '%',
  description  text        not null default '',
  active       boolean     not null default true,
  created_at   timestamptz not null default now()
);
alter table client_signal_sources enable row level security;
create policy "client_signal_sources_all" on client_signal_sources for all using (true) with check (true);
create index client_signal_sources_client_idx on client_signal_sources (client_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Idea Extensions — Big Idea translated to any channel touchpoint
-- ─────────────────────────────────────────────────────────────────────────
create table idea_extensions (
  id                    uuid        not null default gen_random_uuid() primary key,
  campaign_id           uuid        not null references campaigns(id) on delete cascade,
  channel_name          text        not null,
  channel_category      text        not null default 'Custom',
  brief_body            text        not null default '',
  frame_anchor          text        not null default '',
  mood_register         text        not null default '',
  clarity_statement     text        not null default '',
  propagation_mechanism text        not null default '',
  status                text        not null default 'Draft'
                          check (status in ('Draft', 'Ready', 'Approved')),
  ai_generated          boolean     not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table idea_extensions enable row level security;
create policy "idea_extensions_all" on idea_extensions for all using (true) with check (true);
create index idea_extensions_campaign_idx on idea_extensions (campaign_id);

create trigger idea_extensions_set_updated_at
  before update on idea_extensions
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Seed standard channels + signal sources for existing clients
-- ─────────────────────────────────────────────────────────────────────────
insert into client_channels (client_id, channel_name, channel_category, translation_hint)
select
  id,
  unnest(array['ERA FM / Radio', 'KOL / Influencer', 'Retail / In-Store', 'Digital / Social', 'PR / Earned Media']),
  unnest(array['Radio', 'KOL', 'Retail', 'Digital', 'PR']),
  unnest(array[
    'Audio hook that triggers human tension in 15 seconds. No visual dependency. Must work on first listen.',
    'Creator brief: same story, native platform format. Specific save-bait or share mechanic required.',
    'Single shelf/POS moment reflecting same cultural tension. No copy — brand signal only.',
    'Platform-native brief. Channel mechanics vary, idea stays identical. Scroll-stopping hook first.',
    'Newshook version for earned media. Journalist angle, not brand angle. Same tension, different frame.'
  ])
from clients;

insert into client_signal_sources (client_id, source_name, source_type, unit, description)
select
  id,
  unnest(array['TikTok Save Rate', 'TikTok Share Rate', 'Google Search Intent', 'Google Search Console (Branded)', 'Meta ROAS', 'TikTok Shop CTR', 'TikTok Shop CVR', 'Cart Abandonment Rate', 'Repeat Purchase Rate (60-day)', 'Organic UGC Volume', 'NPS Score', 'In-Store Footfall Lift', 'Loyalty App Opens']),
  unnest(array['save_rate', 'share_rate', 'search_intent', 'branded_search', 'meta_roas', 'tiktok_shop_ctr', 'tiktok_shop_cvr', 'cart_abandonment', 'repeat_purchase', 'organic_ugc', 'nps', 'footfall', 'loyalty_opens']),
  unnest(array['%', '%', '%', '%', 'x', '%', '%', '%', '%', '#', 'score', '%', '%']),
  unnest(array[
    'Hero content saves as % of views — primary Demand signal',
    'Shares as % of views — secondary virality signal',
    'Search volume lift vs baseline for category/brand terms',
    'Branded search volume movement from Google Search Console',
    'Return on ad spend from Meta campaigns',
    'Click-through rate on TikTok Shop product links',
    'Conversion rate on TikTok Shop (clicks to purchase)',
    'Shopping cart abandonment rate — lower is better',
    'Customers who repurchased within 60 days',
    'Volume of organic user-generated content mentioning brand',
    'Net Promoter Score from post-purchase survey',
    'Store footfall lift vs baseline period',
    'Loyalty app open rate during campaign period'
  ])
from clients;
