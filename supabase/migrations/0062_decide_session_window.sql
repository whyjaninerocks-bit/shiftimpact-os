-- Migration 0062: decide_session opportunity window
-- Adds a new window_type so that /decide session prospect matches surface
-- automatically in the Weekly Digest as a high-intent engagement signal.
-- When a known prospect's email domain is captured in a /decide session,
-- a window_alert is created against this window type.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend CHECK constraint to include decide_session
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE opportunity_windows
  DROP CONSTRAINT IF EXISTS opportunity_windows_window_type_check;

ALTER TABLE opportunity_windows
  ADD CONSTRAINT opportunity_windows_window_type_check
  CHECK (window_type IN (
    'fiscal_cycle', 'conference_calendar', 'renewal_season',
    'funding_event', 'leadership_change', 'rfp_cycle',
    'campaign_season', 'product_launch', 'strategic_move',
    'decide_session'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Seed the decide_session window rows
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint, is_active)
VALUES (
  'decide_session', 'B2C',
  'Decision Session Match',
  'A tracked prospect engaged with the ShiftImpact /decide diagnostic. High intent signal — they are actively working through a real decision and sought an external intelligence read.',
  'Email domain matched a tracked company during a /decide diagnostic session',
  TRUE
)
ON CONFLICT DO NOTHING;

INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint, is_active)
VALUES (
  'decide_session', 'B2B',
  'Decision Session Match',
  'A tracked B2B prospect engaged with the ShiftImpact /decide diagnostic. High intent signal — they are actively evaluating their growth decisions and sought an external read.',
  'Email domain matched a tracked company during a /decide diagnostic session',
  TRUE
)
ON CONFLICT DO NOTHING;
