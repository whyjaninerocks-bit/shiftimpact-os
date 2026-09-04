-- 0078_kb_schema_foundation.sql
-- SEA Marketing Effectiveness Intelligence KB — Stage 2, part 2.
-- Seven new tables. Schema only: no scraping, no ingestion, no case_studies rows,
-- no effectiveness_formulas rows, no KB retrieval wired into any route. award_sources
-- is the one table seeded here, and every row is is_active = false — reference rows
-- only, not a claim that any of these sources have been ingested or trained on.
--
-- Operating rule this schema is built to enforce (Janine, 3 Sept 2026):
--   Award win = recognition. Case detail = support. Business result = proof.
--   Repeated pattern = hypothesis. Client application = strategic judgement.
-- Nothing here should let a later feature default to treating an award win as proof.
--
-- All 7 tables: RLS enabled, no permissive policy — internal-only, same posture as
-- category_attributes / signal_vocabulary / campaign_signal_maps. Access is exclusively
-- via the server-side admin client (service role bypasses RLS).

-- ── 1. award_sources ───────────────────────────────────────────────────────
-- market_code nullable: null = cross-market/global reference source (e.g. Cannes).

create table if not exists award_sources (
  id uuid primary key default gen_random_uuid(),
  market_code text references market_parameters(market_code),
  award_source text not null,
  award_type text not null default '',
  source_role text not null check (source_role = any (array[
    'deep_case_source','effectiveness_proof_source','client_capability_source',
    'creative_cultural_source','activation_sales_source','video_platform_source',
    'agency_capability_source','global_reference_source'
  ])),
  years_available text not null default '',
  source_url text not null default '',
  source_depth_default text check (source_depth_default = any (array[
    'Full Case','Partial Case','Winner Listing','Article Summary',
    'PDF Winner Release','Video / Case Film','Not Extractable'
  ])),
  evidence_use text not null default '',
  copyright_note text not null default '',
  extraction_confidence text not null default 'Low' check (extraction_confidence = any (array['High','Medium','Low'])),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table award_sources enable row level security;
-- Deliberately no permissive policy — internal-only, service role only.

comment on table award_sources is
  'Reference catalogue of award/effectiveness bodies per market. is_active=false for every row until a source is actually verified and curated for ingestion — seeding this table is not a claim of ingestion.';

-- ── 2. source_registry ────────────────────────────────────────────────────

create table if not exists source_registry (
  id uuid primary key default gen_random_uuid(),
  market_code text references market_parameters(market_code),
  award_source_id uuid references award_sources(id) on delete set null,
  source_title text not null default '',
  source_type text not null default '',
  source_depth text check (source_depth = any (array[
    'Full Case','Partial Case','Winner Listing','Article Summary',
    'PDF Winner Release','Video / Case Film','Not Extractable'
  ])),
  source_reference text not null default '',
  year integer,
  case_detail_available boolean not null default false,
  results_available boolean not null default false,
  extraction_confidence text not null default 'Low' check (extraction_confidence = any (array['High','Medium','Low'])),
  copyright_note text not null default '',
  recommended_use text not null default '',
  last_verified date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table source_registry enable row level security;
-- Deliberately no permissive policy — internal-only, service role only.

-- ── 3. case_studies ────────────────────────────────────────────────────────
-- Empty at creation. verification_status / result_type / the three confidence
-- fields exist precisely so an award win is never silently treated as proof.

create table if not exists case_studies (
  id uuid primary key default gen_random_uuid(),
  case_id text,
  market_code text references market_parameters(market_code),
  award_source_id uuid references award_sources(id) on delete set null,
  year integer,
  award_level text not null default '',
  award_category text not null default '',
  campaign_title text not null default '',
  brand text not null default '',
  client text not null default '',
  agency text not null default '',
  partner_agencies text[] not null default '{}'::text[],
  source_reference text not null default '',
  source_depth text check (source_depth = any (array[
    'Full Case','Partial Case','Winner Listing','Article Summary',
    'PDF Winner Release','Video / Case Film','Not Extractable'
  ])),
  challenge_summary text not null default '',
  thinking_summary text not null default '',
  execution_summary text not null default '',
  results_summary text not null default '',
  behaviour_moved text not null default '',
  cultural_code text not null default '',
  local_cultural_code text not null default '',
  category_pattern text not null default '',
  effectiveness_formula text not null default '',
  business_outcome_type text not null default '',
  result_type text check (result_type = any (array[
    'business_outcome','near_conversion_signal','media_activity_metric',
    'reputation_metric','social_impact_metric','not_stated'
  ])),
  near_conversion_signal text not null default '',
  media_activity_metric text not null default '',
  evidence_confidence text not null default 'Low' check (evidence_confidence = any (array['High','Medium','Low'])),
  result_confidence text not null default 'Not Stated' check (result_confidence = any (array['High','Medium','Low','Not Stated'])),
  causal_confidence text not null default 'Not Claimable' check (causal_confidence = any (array['High','Medium','Low','Not Claimable'])),
  verification_status text not null default 'Not Stated' check (verification_status = any (array[
    'Verified','Partially Verified','Unverified Claim','Inference','Not Stated'
  ])),
  rights_status text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_studies_market_category on case_studies (market_code, category_pattern);

alter table case_studies enable row level security;
-- Deliberately no permissive policy — internal-only, service role only.

comment on table case_studies is
  'Empty by design at Stage 2. Award win = recognition, case detail = support, business result = proof — verification_status/result_type/*_confidence exist so a win is never treated as proof by default.';

-- ── 4. effectiveness_formulas ─────────────────────────────────────────────
-- markets_observed is an array (a formula can span markets), not a single
-- market_code — this table is explicitly about patterns, not single-market facts.

create table if not exists effectiveness_formulas (
  id uuid primary key default gen_random_uuid(),
  formula_id text,
  formula_name text not null default '',
  regional_or_market_specific text check (regional_or_market_specific = any (array[
    'Regional Pattern','Market-Specific Pattern','Category-Specific Pattern'
  ])),
  markets_observed text[] not null default '{}'::text[],
  categories_observed text[] not null default '{}'::text[],
  cases_observed integer not null default 0,
  description text not null default '',
  why_it_worked text not null default '',
  what_transfers text not null default '',
  what_needs_local_adaptation text not null default '',
  where_it_may_fail text not null default '',
  business_outcome_link text not null default '',
  behaviour_signal text not null default '',
  frame_application text not null default '',
  bip_application text not null default '',
  weekly_pulse_application text not null default '',
  ai_trend_layer text not null default '',
  confidence_level text not null default 'Low' check (confidence_level = any (array['High','Medium','Low'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table effectiveness_formulas enable row level security;
-- Deliberately no permissive policy — internal-only, service role only.

comment on table effectiveness_formulas is
  'Empty by design at Stage 2. cases_observed must stay 0 until real case_studies rows exist to back it — a formula with cases_observed=0 is a hypothesis, not a pattern.';

-- ── 5. behaviour_signals ──────────────────────────────────────────────────
-- Distinct from the existing prospect-scanning business_signals table (different
-- domain — PIE prospect scans, not marketing-effectiveness behaviour patterns).

create table if not exists behaviour_signals (
  id uuid primary key default gen_random_uuid(),
  behaviour_id text,
  market_code text references market_parameters(market_code),
  behaviour_name text not null default '',
  plain_language_description text not null default '',
  category_fit text not null default '',
  stage text check (stage = any (array['attention','leading','near_conversion','conversion','lagging'])),
  cases_observed integer not null default 0,
  signal_source text not null default '',
  what_it_may_indicate text not null default '',
  what_it_cannot_prove text not null default '',
  business_outcome_relevance text not null default '',
  recommended_measurement text not null default '',
  confidence_level text not null default 'Low' check (confidence_level = any (array['High','Medium','Low'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table behaviour_signals enable row level security;
-- Deliberately no permissive policy — internal-only, service role only.

-- ── 6. os_integration_rules ───────────────────────────────────────────────

create table if not exists os_integration_rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text,
  market_code text references market_parameters(market_code),
  os_layer text check (os_layer = any (array['FRAME','BIP','IQ_Evaluate','Weekly_Pulse','Opportunity_Layer'])),
  rule_name text not null default '',
  trigger text not null default '',
  input_needed text not null default '',
  kb_source text not null default '',
  output text not null default '',
  example_prompt text not null default '',
  confidence_requirement text not null default 'Low' check (confidence_requirement = any (array['High','Medium','Low'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table os_integration_rules enable row level security;
-- Deliberately no permissive policy — internal-only, service role only.

comment on table os_integration_rules is
  'Empty by design at Stage 2 — defines how FRAME/BIP/IQ_Evaluate/Weekly_Pulse/Opportunity_Layer would draw on the KB once curated. No route reads this table yet.';

-- ── 7. agency_client_opportunities ────────────────────────────────────────
-- Repeated wins are explicitly NOT auto-treated as stronger effectiveness — see
-- likely_capability vs possible_gap below, kept as separate fields on purpose.

create table if not exists agency_client_opportunities (
  id uuid primary key default gen_random_uuid(),
  market_code text references market_parameters(market_code),
  brand text not null default '',
  agency text not null default '',
  repeated_wins text not null default '',
  category_strength text not null default '',
  likely_capability text not null default '',
  possible_gap text not null default '',
  outreach_opportunity text not null default '',
  potential_shiftimpact_use_case text not null default '',
  priority_level text not null default 'Low' check (priority_level = any (array['High','Medium','Low'])),
  evidence_source text not null default '',
  confidence_level text not null default 'Low' check (confidence_level = any (array['High','Medium','Low'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table agency_client_opportunities enable row level security;
-- Deliberately no permissive policy — internal-only, service role only.

comment on table agency_client_opportunities is
  'Repeated wins may indicate creative strength, award-writing strength, client access, category concentration, or agency relationship — not necessarily stronger effectiveness. likely_capability and possible_gap are kept as separate fields so those hypotheses are never collapsed into one.';

-- ── Seed: award_sources reference rows, all inactive ──────────────────────
-- Reference catalogue only. is_active=false on every row — none of these have
-- been verified, extracted, or ingested. Adding a row here is not a claim of
-- corpus access.

insert into award_sources (market_code, award_source, source_role, is_active, evidence_use, copyright_note)
values
  ('MY', 'APPIES Malaysia', 'effectiveness_proof_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('MY', 'Effie Malaysia', 'effectiveness_proof_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('MY', 'Marketing Excellence Awards Malaysia', 'client_capability_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('MY', 'Kancil Awards', 'creative_cultural_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('MY', 'Dragons of Malaysia', 'creative_cultural_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('MY', 'YouTube Works Malaysia / SEA', 'video_platform_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('MY', 'MARKies / Agency of the Year Malaysia', 'agency_capability_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('ID', 'Citra Pariwara', 'creative_cultural_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('ID', 'Effie / APAC Effie', 'effectiveness_proof_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('ID', 'YouTube Works SEA', 'video_platform_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  ('ID', 'SMARTIES Indonesia / APAC', 'activation_sales_source', false, 'Not yet extracted — pending source verification.', 'Copyright status not yet reviewed.'),
  (null, 'Cannes Lions', 'global_reference_source', false, 'Optional future global reference source — not the core SEA effectiveness corpus.', 'Copyright status not yet reviewed.')
on conflict do nothing;
