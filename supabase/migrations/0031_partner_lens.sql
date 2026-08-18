-- Migration 0031: Partner Lens — ShiftImpact vs AOAI dual-pipeline
-- Companies are auto-tagged by the assessment as ShiftImpact / AOAI / Both.
-- Prospects list filters by partner. Intelligence Read shows partner-specific offer.
-- ShiftImpact OS · July 2026

-- ─── 1. partner_tag on companies ─────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS partner_tag TEXT
    CHECK (partner_tag IN ('ShiftImpact','AOAI','Both'));

CREATE INDEX IF NOT EXISTS companies_partner_tag ON companies (partner_tag);

-- ─── 2. AOAI fields on prospect_insights (topline rows) ──────────────────────
-- aoai_fit: does this company fit AOAI's marketing/activation/growth mandate?
-- aoai_recommended_offer: which AOAI service fits the moment
-- aoai_entry_angle: the specific hook for AOAI to open the conversation

ALTER TABLE prospect_insights
  ADD COLUMN IF NOT EXISTS partner_lens           TEXT CHECK (partner_lens IN ('ShiftImpact','AOAI','Both')),
  ADD COLUMN IF NOT EXISTS aoai_recommended_offer TEXT CHECK (aoai_recommended_offer IN (
    'Performance Marketing Funnel',
    'Ecosystem Infrastructure Build',
    'Marketing Growth & Sales Strategy',
    'Brand Activation Program',
    'Not a fit'
  )),
  ADD COLUMN IF NOT EXISTS aoai_entry_angle       TEXT;
