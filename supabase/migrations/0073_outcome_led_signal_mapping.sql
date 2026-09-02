-- 0073_outcome_led_signal_mapping.sql
-- Outcome-Led Signal Mapping — Phase 1 (internal only, no client-facing change)
--
-- NOT YET APPLIED. Revised per Janine's request (1 Sept 2026) to replace free-text
-- signal matching with a controlled internal vocabulary. Do not run `apply_migration`
-- / push until she confirms this version.
--
-- Locks in:
--   1. business_outcome_label stays the sole source of truth for the conversion anchor.
--      No new conversion_anchor column anywhere in this migration.
--   2. category_attributes (F17E) gets extended, not replaced.
--   3. Skincare (Cetaphil) nests under the existing FMCG — Personal Care row.
--   4. Luckin (coffee) nests under the existing single QSR row.
--   5. One genuinely new category: Hospitality (display name "Hospitality / Leisure /
--      Wellness"). Two separate CHECK constraints independently enumerate the same 7
--      industry values today (frame_briefs.industry_category and
--      category_attributes.industry_vertical) — both updated together here.
--   6. One new table, campaign_signal_maps, plus confidence_matched_data.
--   7. NEW in this revision: signal matching no longer compares free text. Every
--      signal is a fixed snake_case key drawn from a new signal_vocabulary table.
--      category_attributes and campaign_signal_maps store arrays of these keys, never
--      raw strings like "ticket sales" / "tickets sold" / "ticket purchases" — those
--      are all the same key, ticket_sales, everywhere. The UI renders the human label
--      from signal_vocabulary; the matching function only ever compares keys.
--   8. Still no confidence_label_rules column — one shared deterministic function,
--      no AI, now keyed off canonical signals instead of substrings.

-- ─── 1. Controlled signal vocabulary ──────────────────────────────────────────────
-- Single source of truth for every signal name used anywhere in the outcome-led
-- system. category_attributes and campaign_signal_maps store keys from this table,
-- never free text. Add new signals here first, then reference the key elsewhere —
-- never invent a new string inline in an array or jsonb value.

create table if not exists signal_vocabulary (
  key text primary key,          -- snake_case, stable, never renamed once in use
  label text not null,           -- human-readable, shown in UI
  created_at timestamptz not null default now()
);

insert into signal_vocabulary (key, label) values
  ('cup_sales', 'Cup sales'),
  ('sku_sales', 'SKU-level sales'),
  ('store_sales', 'Store-level sales'),
  ('voucher_redemption', 'Voucher redemption'),
  ('app_orders', 'App orders'),
  ('menu_page_visits', 'Menu page visits'),
  ('product_interest', 'Product-specific interest'),
  ('craving_comments', 'Craving comments'),
  ('location_search', 'Location / directions search'),
  ('app_opens', 'App opens'),
  ('repeat_purchase', 'Repeat purchase'),
  ('loyalty_behaviour', 'Loyalty behaviour'),
  ('ugc_after_purchase', 'Post-purchase UGC'),
  ('reviews', 'Reviews'),
  ('save_rate', 'Save rate'),
  ('generic_reach', 'Generic reach'),
  ('product_sales', 'Product sales'),
  ('retail_sellout', 'Retail sell-out'),
  ('ecommerce_sales', 'Ecommerce sales'),
  ('sampling_redemption', 'Sampling redemption'),
  ('product_search', 'Product search'),
  ('marketplace_behaviour', 'Marketplace behaviour'),
  ('competitor_comparison', 'Competitor comparison'),
  ('product_ugc', 'Product-specific UGC'),
  ('generic_likes', 'Generic likes'),
  ('generic_engagement', 'Generic engagement'),
  ('product_page_visits', 'Product page visits'),
  ('add_to_cart', 'Add to cart'),
  ('marketplace_search', 'Marketplace search'),
  ('comparison_search', 'Comparison search ("X vs Y")'),
  ('skin_concern_search', 'Skin concern search'),
  ('ingredient_search', 'Ingredient search'),
  ('pharmacy_interest', 'Pharmacy interest'),
  ('review_quality', 'Review quality'),
  ('trust_signals', 'Dermatologist / trust signals'),
  ('creator_reviews', 'Creator reviews'),
  ('routine_content', 'Routine content'),
  ('sensitive_skin_conversations', 'Sensitive skin conversations'),
  ('beauty_engagement', 'Generic beauty engagement'),
  ('bookings', 'Bookings'),
  ('ticket_sales', 'Ticket sales'),
  ('booking_enquiries', 'Booking / appointment enquiries'),
  ('package_sales', 'Package sales'),
  ('footfall', 'Footfall'),
  ('ticket_page_visits', 'Ticket / booking page visits'),
  ('checkout_starts', 'Checkout starts'),
  ('opening_hours_search', 'Opening hours search'),
  ('price_package_search', 'Price / package search'),
  ('seasonal_planning', 'Weekend / holiday / seasonal planning'),
  ('things_to_do_search', '"Things to do" search'),
  ('family_planning_queries', 'Family / couple / wellness planning queries'),
  ('repeat_visits', 'Repeat visits'),
  ('referral_signals', 'Referral / recommendation signals'),
  ('ugc_after_visit', 'Post-visit UGC'),
  ('influencer_content', 'Influencer content'),
  ('generic_saves', 'Generic saves')
on conflict (key) do nothing;

alter table signal_vocabulary enable row level security;
-- Internal only, same posture as category_attributes — no permissive policy.

-- ─── 2. Extend category_attributes with outcome-led columns ──────────────────────
-- The three signal-tier arrays and default_signal_weights now store signal_vocabulary
-- keys, not free text. required_data_types stays descriptive free text — it describes
-- data SOURCES to request from a client (e.g. "POS system access"), not signals used
-- in matching logic, so it is not part of the controlled vocabulary.

alter table category_attributes
  add column if not exists behaviour_chain text[],
  add column if not exists common_business_outcome_labels text[],
  add column if not exists default_leading_signals text[],
  add column if not exists default_conversion_signals text[],
  add column if not exists default_lagging_signals text[],
  add column if not exists default_signal_weights jsonb,
  add column if not exists required_data_types text[];

comment on column category_attributes.behaviour_chain is
  'Ordered default behaviour chain stages, e.g. {Discover,Consider,Plan/Book,...}. Narrative stage labels, not matched against signal_vocabulary.';
comment on column category_attributes.default_leading_signals is
  'Array of signal_vocabulary.key values. Never free text.';
comment on column category_attributes.default_conversion_signals is
  'Array of signal_vocabulary.key values. Never free text.';
comment on column category_attributes.default_lagging_signals is
  'Array of signal_vocabulary.key values. Never free text.';
comment on column category_attributes.default_signal_weights is
  'jsonb map of signal_vocabulary.key -> weight tier (Very High/High/Medium-High/Medium/Low-Medium/Low). Seeded by hand, not AI-generated.';

-- ─── 3. Update the 3 existing rows locked for MVP scope, using canonical keys ─────

update category_attributes set
  behaviour_chain = array['Attention','Craving','Location / App Action','Purchase','Repeat','Advocacy'],
  common_business_outcome_labels = array['cup sales'],
  default_leading_signals = array['menu_page_visits','product_interest','craving_comments','location_search','app_opens'],
  default_conversion_signals = array['cup_sales','sku_sales','store_sales','voucher_redemption','app_orders'],
  default_lagging_signals = array['repeat_purchase','loyalty_behaviour','ugc_after_purchase','reviews'],
  default_signal_weights = '{
    "cup_sales": "Very High",
    "voucher_redemption": "High",
    "app_orders": "High",
    "sku_sales": "High",
    "store_sales": "High",
    "location_search": "Medium-High",
    "craving_comments": "Medium",
    "menu_page_visits": "Medium",
    "product_interest": "Medium",
    "app_opens": "Medium",
    "repeat_purchase": "Medium-High",
    "loyalty_behaviour": "Medium",
    "ugc_after_purchase": "Medium",
    "reviews": "Medium",
    "save_rate": "Low-Medium",
    "generic_reach": "Low"
  }'::jsonb,
  required_data_types = array['cup / transaction sales data','voucher redemption logs','app order data','store-level POS data'],
  updated_at = now()
where category_slug = 'qsr';

update category_attributes set
  behaviour_chain = array['Awareness','Consideration','Trial','Purchase','Repeat','Advocacy'],
  common_business_outcome_labels = array['product sales','retail sell-out','ecommerce sales','trial purchase','sampling redemption','repeat purchase','penetration','basket inclusion','market share movement'],
  default_leading_signals = array['product_search','marketplace_behaviour','competitor_comparison'],
  default_conversion_signals = array['product_sales','retail_sellout','ecommerce_sales','sampling_redemption'],
  default_lagging_signals = array['reviews','repeat_purchase','product_ugc'],
  default_signal_weights = '{
    "product_sales": "High",
    "retail_sellout": "High",
    "ecommerce_sales": "High",
    "sampling_redemption": "High",
    "product_search": "High",
    "marketplace_behaviour": "High",
    "reviews": "High",
    "repeat_purchase": "High",
    "product_ugc": "High",
    "competitor_comparison": "High",
    "generic_reach": "Low",
    "generic_likes": "Low",
    "generic_engagement": "Low"
  }'::jsonb,
  required_data_types = array['retail sell-out data','ecommerce sales data','sampling redemption logs','repeat purchase / loyalty data'],
  updated_at = now()
where category_slug = 'fmcg-food-beverage';

-- FMCG — Personal Care: broad default chain only. Cetaphil's specific chain
-- (Concern -> Research -> Trust -> Consideration -> Trial -> Routine -> Advocacy)
-- is set at the campaign_signal_maps level, not here.
update category_attributes set
  behaviour_chain = array['Awareness','Consideration','Trial','Purchase','Repeat','Advocacy'],
  common_business_outcome_labels = array['product sales','trial purchase','repeat purchase','routine adoption','ecommerce conversion','pharmacy / retail sales'],
  default_leading_signals = array['product_page_visits','add_to_cart','marketplace_search','comparison_search','skin_concern_search','ingredient_search','pharmacy_interest'],
  default_conversion_signals = array['product_sales','repeat_purchase'],
  default_lagging_signals = array['review_quality','trust_signals','creator_reviews','routine_content','sensitive_skin_conversations'],
  default_signal_weights = '{
    "product_sales": "High",
    "repeat_purchase": "High",
    "product_page_visits": "High",
    "add_to_cart": "High",
    "marketplace_search": "High",
    "review_quality": "High",
    "trust_signals": "High",
    "comparison_search": "High",
    "skin_concern_search": "Medium",
    "ingredient_search": "Medium",
    "creator_reviews": "Medium",
    "routine_content": "Medium",
    "sensitive_skin_conversations": "Medium",
    "pharmacy_interest": "Medium",
    "generic_likes": "Low",
    "generic_reach": "Low",
    "beauty_engagement": "Low"
  }'::jsonb,
  required_data_types = array['product sales / ecommerce conversion data','repeat purchase data','pharmacy / retail sell-through data'],
  updated_at = now()
where category_slug = 'fmcg-personal-care';

-- ─── 4. Add 'Hospitality' to both CHECK constraints ───────────────────────────────
-- Display name is "Hospitality / Leisure / Wellness" (category_attributes.category_name
-- below); the enum/constraint value itself stays the short form "Hospitality",
-- consistent with how FMCG/QSR/etc. are short in the enum while category_attributes
-- carries the fuller descriptive name.

alter table frame_briefs drop constraint if exists frame_briefs_industry_category_check;
alter table frame_briefs add constraint frame_briefs_industry_category_check
  check (industry_category = any (array['QSR','FMCG','Retail','B2B','Financial Services','Telco','Hospitality','Other']));

alter table category_attributes drop constraint if exists category_attributes_industry_vertical_check;
alter table category_attributes add constraint category_attributes_industry_vertical_check
  check (industry_vertical = any (array['QSR','FMCG','Retail','B2B','Financial Services','Telco','Hospitality','Other']));

-- ─── 5. Insert the one genuinely new category row ─────────────────────────────────
-- Structural attributes are a first estimate, not calibrated — recalibrate after
-- Gamuda (and ideally a second experience-based client, e.g. UOA), same pattern as
-- CSTR benchmark recalibration after 3 campaigns per category.

insert into category_attributes (
  category_name, category_slug, industry_vertical,
  purchase_frequency, purchase_involvement, social_visibility, regulatory_status, decision_architecture,
  is_system_default, active,
  behaviour_chain, common_business_outcome_labels,
  default_leading_signals, default_conversion_signals, default_lagging_signals,
  default_signal_weights, required_data_types
) values (
  'Hospitality — Leisure & Wellness', 'hospitality-leisure-wellness', 'Hospitality',
  'Infrequent', 'Medium', 'High', 'Semi-Regulated', 'Group',
  true, true,
  array['Discover','Consider','Plan / Book','Purchase / Visit','Experience','Repeat / Recommend'],
  array['ticket sales','bookings','reservations','package sales','room nights','treatment bookings','appointment enquiries','membership sign-ups','footfall','repeat visits','referrals'],
  array['ticket_page_visits','checkout_starts','location_search','opening_hours_search','price_package_search','seasonal_planning','things_to_do_search','family_planning_queries'],
  array['bookings','ticket_sales','booking_enquiries','package_sales','footfall'],
  array['reviews','repeat_visits','referral_signals','ugc_after_visit','influencer_content'],
  '{
    "bookings": "High",
    "ticket_sales": "High",
    "booking_enquiries": "High",
    "package_sales": "High",
    "footfall": "High",
    "ticket_page_visits": "High",
    "checkout_starts": "High",
    "location_search": "High",
    "opening_hours_search": "High",
    "price_package_search": "High",
    "reviews": "High",
    "repeat_visits": "High",
    "referral_signals": "High",
    "ugc_after_visit": "Medium",
    "influencer_content": "Medium",
    "seasonal_planning": "Medium",
    "things_to_do_search": "Medium",
    "family_planning_queries": "Medium",
    "generic_saves": "Low",
    "generic_reach": "Low",
    "generic_engagement": "Low"
  }'::jsonb,
  array['ticket / booking transaction data','appointment or enquiry logs','footfall data','membership sign-up data']
)
on conflict (category_slug) do nothing;

-- ─── 6. New table: campaign_signal_maps ───────────────────────────────────────────
-- available_data / missing_data / leading_signals / conversion_signals / lagging_signals
-- all store signal_vocabulary keys, never free text. confidence_matched_data records
-- exactly which available_data keys triggered the confidence_label, so the reasoning
-- is auditable rather than a black box.

create table if not exists campaign_signal_maps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  category_attribute_id uuid not null references category_attributes(id),

  business_outcome_label text not null,
  signal_map_profile_name text,          -- e.g. "Skincare Trust & Routine", "Coffee Trial & Repeat" — human label, not a vocabulary key
  behaviour_chain_used text[] not null default '{}',

  leading_signals text[] not null default '{}',      -- signal_vocabulary keys
  conversion_signals text[] not null default '{}',    -- signal_vocabulary keys
  lagging_signals text[] not null default '{}',        -- signal_vocabulary keys
  signal_weights jsonb not null default '{}'::jsonb,   -- keyed by signal_vocabulary key

  available_data text[] not null default '{}',         -- signal_vocabulary keys the campaign actually has
  available_data_notes text,                             -- free-text strategist context, e.g. "ticket sales available weekly, but no checkout-stage data yet" — does not feed matching logic
  missing_data text[] not null default '{}',            -- signal_vocabulary keys it doesn't have

  confidence_label text check (confidence_label in ('Conversion Measured','Conversion Partially Supported','Conversion Likelihood Only')),
  confidence_reason text,
  confidence_matched_data text[] not null default '{}', -- which available_data keys triggered the label, e.g. {ticket_sales}

  map_status text not null default 'draft' check (map_status in ('draft','reviewed','used_in_report')),

  post_hoc_predictive_signal text,       -- signal_vocabulary key, filled in after the fact
  post_hoc_outcome_notes text,

  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaign_signal_maps_campaign_id on campaign_signal_maps (campaign_id, generated_at desc);

alter table campaign_signal_maps enable row level security;
-- Deliberately no permissive policy — internal-only, same posture as category_attributes
-- and signal_vocabulary. Access happens exclusively via the server-side admin client
-- (service role bypasses RLS). Do not add an "allow_all" policy for convenience; that
-- pattern exists on budget_movements but should not be propagated here.
