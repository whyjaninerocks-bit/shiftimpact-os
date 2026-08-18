-- Migration 0061: Widget Leads — add synthesis capture columns
-- Stores the full OS output from each /decide session so decision patterns
-- can be analysed across prospects for consulting positioning + prospecting.

ALTER TABLE widget_leads
  ADD COLUMN IF NOT EXISTS industry           TEXT,
  ADD COLUMN IF NOT EXISTS brand_category     TEXT,
  ADD COLUMN IF NOT EXISTS campaign_stage     TEXT CHECK (campaign_stage IN ('Demand','Conversion','Retention','Scale')),
  ADD COLUMN IF NOT EXISTS signal_gap_type    TEXT CHECK (signal_gap_type IN ('S1-Share of Search','S2-Save Rate','S3-UGC','S4-OOH','Multi-signal')),
  ADD COLUMN IF NOT EXISTS decision_gap_type  TEXT CHECK (decision_gap_type IN ('Evidence','Logic','Timing','Authority','Conviction','Framing')),
  ADD COLUMN IF NOT EXISTS stage_read         TEXT,
  ADD COLUMN IF NOT EXISTS signal_gap_text    TEXT,
  ADD COLUMN IF NOT EXISTS gate_condition     TEXT,
  ADD COLUMN IF NOT EXISTS next_action        TEXT,
  ADD COLUMN IF NOT EXISTS bridge_question    TEXT,
  ADD COLUMN IF NOT EXISTS probe_count        INTEGER;

-- Index for pattern analysis queries
CREATE INDEX IF NOT EXISTS widget_leads_industry       ON widget_leads (industry)          WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS widget_leads_posture        ON widget_leads (assumption_category) WHERE assumption_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS widget_leads_stage         ON widget_leads (campaign_stage)     WHERE campaign_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS widget_leads_signal_gap    ON widget_leads (signal_gap_type)   WHERE signal_gap_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS widget_leads_decision_gap  ON widget_leads (decision_gap_type) WHERE decision_gap_type IS NOT NULL;
