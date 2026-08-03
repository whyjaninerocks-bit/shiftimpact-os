-- Migration 0042: Strategic Move window type + Cultural Signals client linking
--
-- Two fixes:
-- 1. Add 'strategic_move' opportunity window (MOU, partnerships, market expansion, major milestones)
--    Previous logic had no window for these signals — they fell through to null.
--    Awards (Recognition + award keyword) are conversation starters, NOT windows; they are
--    handled at the signal layer and excluded from window_alerts.
--
-- 2. Link cultural_signals to clients via relevant_industries[] and client_id.
--    Cultural signals were a standalone log with no connection to client intelligence.
--    Now they feed the client detail page based on industry match or direct association.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add strategic_move to opportunity_windows CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old constraint and recreate with strategic_move included
ALTER TABLE opportunity_windows
  DROP CONSTRAINT IF EXISTS opportunity_windows_window_type_check;

ALTER TABLE opportunity_windows
  ADD CONSTRAINT opportunity_windows_window_type_check
  CHECK (window_type IN (
    'fiscal_cycle', 'conference_calendar', 'renewal_season',
    'funding_event', 'leadership_change', 'rfp_cycle',
    'campaign_season', 'product_launch', 'strategic_move'
  ));

-- Seed B2C strategic_move window
INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint)
VALUES (
  'strategic_move', 'B2C',
  'Strategic Move',
  'MOU, distribution partnership, market expansion, or major business milestone. External communications rarely keep pace with strategic commitments — the narrative gap is the entry point.',
  'MOU, partnership signing, market expansion, or milestone announcement detected'
)
ON CONFLICT DO NOTHING;

-- Seed B2B strategic_move window
INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint)
VALUES (
  'strategic_move', 'B2B',
  'Strategic Move',
  'Signed agreement, joint venture, distribution deal, or significant market expansion. New strategic commitments create rapid demand for aligned positioning and intelligence before execution begins.',
  'Signed agreement, partnership, joint venture, or expansion announcement detected'
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Cultural signals — client linking columns
-- ─────────────────────────────────────────────────────────────────────────────

-- Which client industries this signal is relevant for
-- e.g. '{"FMCG", "Retail", "Financial Services"}'
ALTER TABLE cultural_signals
  ADD COLUMN IF NOT EXISTS relevant_industries TEXT[] DEFAULT '{}';

-- Direct client association (optional — for signals specific to one client's brief)
ALTER TABLE cultural_signals
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Index for client page lookup: pull signals by industry match
CREATE INDEX IF NOT EXISTS cultural_signals_industries_idx
  ON cultural_signals USING GIN (relevant_industries);

-- Index for direct client lookup
CREATE INDEX IF NOT EXISTS cultural_signals_client_id_idx
  ON cultural_signals (client_id)
  WHERE client_id IS NOT NULL;
