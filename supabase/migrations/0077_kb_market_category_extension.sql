-- 0077_kb_market_category_extension.sql
-- SEA Marketing Effectiveness Intelligence KB — Stage 2, part 1.
-- Extends the EXISTING market_parameters and category_attributes tables to serve
-- as the market-pack and category-playbook layers, rather than forking new
-- "markets" / "category_playbooks" tables. Schema only — no case data, no
-- ingestion, no scraping.

-- ── market_parameters: market pack layer ──────────────────────────────────
-- All 6 SEA markets Janine named (MY/ID/TH/VN/PH/SG), plus BN/KH/LA/MM, already
-- exist here with MY flagged is_primary_market. This migration only adds the
-- market-pack-readiness columns; it does not reseed markets.

alter table market_parameters
  add column if not exists language_codes         text[] not null default '{}'::text[],
  add column if not exists source_market          text not null default '',
  add column if not exists source_scope           text not null default '',
  add column if not exists market_behaviour_note  text not null default '',
  add column if not exists market_adaptation_note text not null default '',
  add column if not exists market_confidence      text not null default 'Low',
  add column if not exists transferability_score  text not null default 'Not Tested',
  add column if not exists is_active_for_kb       boolean not null default false;

alter table market_parameters
  add constraint market_parameters_market_confidence_check
    check (market_confidence = any (array['High','Medium','Low'])),
  add constraint market_parameters_transferability_score_check
    check (transferability_score = any (array['High','Medium','Low','Not Tested']));

comment on column market_parameters.language_codes is
  'ISO language codes for this market, e.g. {ms,en}. Distinct from primary_language (human-readable display string, already existed).';
comment on column market_parameters.source_market is
  'If this market pack currently borrows calibration from a neighbouring market (e.g. provisional MY patterns before ID-specific evidence exists), name that market here. Empty = not borrowing.';
comment on column market_parameters.is_active_for_kb is
  'False for every market, including Malaysia, until the SEA Marketing Effectiveness Intelligence KB has real curated content for it. Do not flip true at schema-creation time — this migration intentionally leaves every row false.';

-- ── category_attributes: category playbook layer, market-aware ───────────
-- market_code = null   -> default/regional pattern (existing 10 rows + 3 new below)
-- market_code = 'MY' etc -> market-specific override row for the same category_slug
-- No override rows are created by this migration — schema + constraint only.

alter table category_attributes
  add column if not exists market_code                 text,
  add column if not exists common_business_challenges   text[] not null default '{}'::text[],
  add column if not exists common_consumer_tensions     text[] not null default '{}'::text[],
  add column if not exists weak_campaign_patterns       text[] not null default '{}'::text[],
  add column if not exists common_proof_types           text[] not null default '{}'::text[],
  add column if not exists frame_questions              text[] not null default '{}'::text[],
  add column if not exists bip_elevation_prompts        text[] not null default '{}'::text[],
  add column if not exists ai_opportunities             text[] not null default '{}'::text[],
  add column if not exists market_adaptation_note       text not null default '',
  add column if not exists confidence_level             text not null default 'Low';

alter table category_attributes
  add constraint category_attributes_confidence_level_check
    check (confidence_level = any (array['High','Medium','Low'])),
  add constraint category_attributes_market_code_fkey
    foreign key (market_code) references market_parameters(market_code);

comment on column category_attributes.market_code is
  'Null = default/regional category pattern. Set = market-specific override for the same category_slug. Enforced by the two partial unique indexes below, not by the old global category_slug uniqueness.';

-- Replace "one slug, ever" uniqueness with a market-aware version: one default
-- row (market_code null) per slug, one override row per slug+market. Existing
-- 10 rows are unaffected (all market_code null, still exactly one per slug).
alter table category_attributes drop constraint if exists category_attributes_category_slug_key;

create unique index if not exists category_attributes_slug_default_key
  on category_attributes (category_slug)
  where market_code is null;

create unique index if not exists category_attributes_slug_market_key
  on category_attributes (category_slug, market_code)
  where market_code is not null;

-- Complete Janine's priority category list: 3 new default (regional) rows.
-- Structural attributes are first estimates, not calibrated — same posture as
-- the Hospitality row added in migration 0073 (recalibrate after real client use).
insert into category_attributes (
  category_name, category_slug, industry_vertical,
  purchase_frequency, purchase_involvement, social_visibility, regulatory_status, decision_architecture,
  is_system_default, active, confidence_level
)
values
  ('Property', 'property', 'Other', 'Infrequent', 'High', 'Medium', 'Semi-Regulated', 'Household', true, true, 'Low'),
  ('Healthcare', 'healthcare', 'Other', 'Infrequent', 'High', 'Low', 'Regulated', 'Individual', true, true, 'Low'),
  ('Festive / Cultural Campaigns', 'festive-cultural', 'Other', 'Annual', 'Medium', 'High', 'Open', 'Household', true, true, 'Low')
on conflict (category_slug) where market_code is null do nothing;
