-- Migration 0059: default os_settings rows for model routing
-- These allow per-operator model selection from the UI without code changes.
-- Haiku is the default for background cron jobs (weekly-review, cultural-scan, prospect-rescan).
-- Sonnet is the default for real-time client-facing analysis (campaign-digest).

INSERT INTO os_settings (key, value, description)
VALUES
  ('model_weekly_review',   'claude-haiku-4-5-20251001', 'Model used by the weekly campaign review cron. Haiku by default — fast and cheap for background assessment.'),
  ('model_cultural_scan',   'claude-haiku-4-5-20251001', 'Model used by the cultural signal scanner cron. Haiku by default.'),
  ('model_prospect_rescan', 'claude-haiku-4-5-20251001', 'Model used by the prospect rescan cron. Haiku by default.'),
  ('model_campaign_digest', 'claude-sonnet-4-6',         'Model used by the campaign OS digest (real-time). Sonnet by default for higher reasoning quality.')
ON CONFLICT (key) DO NOTHING;
