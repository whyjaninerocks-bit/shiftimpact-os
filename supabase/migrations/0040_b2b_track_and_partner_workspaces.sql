-- Migration 0040: B2B track additions + opportunity windows + partner workspaces
-- Applies: engagement_model on business_signals + prospect_insights
--          opportunity_windows table (B2C + B2B windows seeded)
--          partner_workspaces table (AOAI seeded as referral_out_only)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. engagement_model on business_signals
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE business_signals
  ADD COLUMN IF NOT EXISTS engagement_model TEXT NOT NULL DEFAULT 'B2C'
    CHECK (engagement_model IN ('B2C', 'B2B', 'B2B2C'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. engagement_model + converted_to_prospect_id on prospect_insights
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE prospect_insights
  ADD COLUMN IF NOT EXISTS engagement_model TEXT NOT NULL DEFAULT 'B2C'
    CHECK (engagement_model IN ('B2C', 'B2B', 'B2B2C'));

ALTER TABLE prospect_insights
  ADD COLUMN IF NOT EXISTS converted_to_prospect_id UUID
    REFERENCES companies(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Opportunity windows
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunity_windows (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  window_type      TEXT        NOT NULL CHECK (window_type IN (
    'fiscal_cycle', 'conference_calendar', 'renewal_season',
    'funding_event', 'leadership_change', 'rfp_cycle',
    'campaign_season', 'product_launch'
  )),
  engagement_model TEXT        NOT NULL DEFAULT 'B2C'
    CHECK (engagement_model IN ('B2C', 'B2B', 'B2B2C')),
  label            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  signal_hint      TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunity_windows_model
  ON opportunity_windows (engagement_model, window_type);

-- Seed B2C windows
INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint) VALUES
  ('campaign_season',     'B2C', 'Campaign Season',
   'High-intensity campaign period aligned to festive or promotional calendar — awareness intelligence is in highest demand.',
   'Multiple new campaigns launched within 60 days'),
  ('product_launch',      'B2C', 'Product Launch Window',
   'New SKU or brand extension entering market. Brand needs audience intelligence before creative is locked.',
   'Product-launch signal detected in news or LinkedIn'),
  ('fiscal_cycle',        'B2C', 'Fiscal Year Planning',
   'Q4 or pre-FY planning period. Budgets reset and agencies are under review.',
   'No campaign activity in 45+ days with Q4 timing'),
  ('conference_calendar', 'B2C', 'Industry Conference',
   'Major FMCG or marketing conference creates natural window for introductions and credibility-building.',
   'Award, event, or speaker signal detected in evidence');

-- Seed B2B windows
INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint) VALUES
  ('fiscal_cycle',        'B2B', 'Fiscal Year Budget Cycle',
   'B2B buyers lock budgets 60 to 90 days before FY start. Highest receptivity to new vendor evaluation.',
   'Q3 or Q4 hiring in finance, procurement, or operations roles'),
  ('conference_calendar', 'B2B', 'Industry Conference Window',
   'Key sector conference 4 to 8 weeks out. Decision-makers are reachable and actively evaluating solutions.',
   'Speaker, sponsorship, or event-attendance announcement detected'),
  ('renewal_season',      'B2B', 'Contract Renewal Window',
   'Existing vendor contracts typically renew on 12-month cycles. Switching cost is lowest in the 90 days before renewal.',
   'LinkedIn post about vendor frustration, agency review, or RFP signal'),
  ('funding_event',       'B2B', 'Post-Funding Expansion',
   'Series A, B, or C announcement opens a 30 to 90 day window before headcount and tooling are locked.',
   'Funding announcement in news or LinkedIn'),
  ('leadership_change',   'B2B', 'New Leadership Entry',
   'New CMO, VP Marketing, or CEO in role 0 to 90 days. High receptivity to intelligence tools that build credibility fast.',
   'Leadership hire or promotion signal detected'),
  ('rfp_cycle',           'B2B', 'RFP or Agency Review',
   'Formal or informal agency and vendor review in progress. Brand is actively evaluating alternatives.',
   'Hiring for agency coordinator, marketing ops, or procurement role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Partner workspaces
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_workspaces (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name   TEXT        NOT NULL,
  partner_slug   TEXT        NOT NULL UNIQUE,
  description    TEXT,
  direction      TEXT        NOT NULL
    CHECK (direction IN ('referral_out_only', 'referral_in_only', 'both_ways')),
  contact_name   TEXT,
  contact_email  TEXT,
  notes          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_partner_workspaces_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_partner_workspaces_updated_at
  BEFORE UPDATE ON partner_workspaces
  FOR EACH ROW EXECUTE FUNCTION update_partner_workspaces_updated_at();

-- Seed AOAI (referral out only — Janine refers to AOAI, not vice versa)
INSERT INTO partner_workspaces (partner_name, partner_slug, description, direction, notes)
VALUES (
  'AOAI',
  'aoai',
  'Association of Organisational Administrators of Influence — training and certification body for social media and content practitioners.',
  'referral_out_only',
  'Janine refers suitable prospects to AOAI training programmes. No inbound referrals from AOAI. Do not position as a client.'
);
