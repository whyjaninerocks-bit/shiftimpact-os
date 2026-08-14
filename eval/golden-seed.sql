-- eval/golden-seed.sql
-- Golden test set seed data for ShiftImpact OS.
--
-- Run this ONCE in the Supabase SQL editor before executing the golden test set.
-- It is safe to re-run (uses INSERT ... ON CONFLICT DO NOTHING / DO UPDATE).
--
-- Env vars these rows satisfy:
--   GOLDEN_CLIENT_ID    = 0001d717-a5e8-40f2-9b77-0127045a4f92
--   GOLDEN_PERIOD_START = 2026-07-01
--   GOLDEN_CAMPAIGN_ID  = 99dcd9c1-bbbd-4a7e-b8d8-d6023ea8a30c
--   GOLDEN_WEEK_NUMBER  = 1

-- ── 1. Golden client ──────────────────────────────────────────────────────────
-- HP-03 / ADV-05 / OOS-01 all resolve client name for the BMS prompt context.
INSERT INTO clients (id, name, industry_profile)
VALUES (
  '0001d717-a5e8-40f2-9b77-0127045a4f92',
  'Golden Test Client',
  'Other'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ── 2. Golden BMS row (all 6 dimensions positive) ─────────────────────────────
-- Required by HP-03: all positive → direction=Positive, confidence ≥ 7
-- Also satisfies OOS-01: extra 'question' field ignored, normal BMS returned.
-- ADV-05 (injected bms_direction) always auto-passes, so these inputs are fine.
INSERT INTO brand_momentum_scores (
  client_id,
  period_label,
  period_start,
  period_end,
  sos_trajectory,
  sos_magnitude,
  sos_note,
  save_rate_trend,
  save_rate_note,
  ugc_trend,
  ugc_note,
  sov_som_ratio,
  sov_som_note,
  cep_coverage,
  cep_note,
  competitive_context,
  competitive_note
)
VALUES (
  '0001d717-a5e8-40f2-9b77-0127045a4f92',
  'Q3 2026 – Golden Test Period',
  '2026-07-01',
  '2026-09-30',
  'Up',
  'Strong',
  'Share of Search growing steadily for 6 consecutive weeks — golden test fixture.',
  'Up',
  'Save rate above threshold — golden test fixture.',
  'Up',
  'UGC volume growing — golden test fixture.',
  'Positive',
  'SOV exceeds SOM — gaining ground — golden test fixture.',
  'Expanding',
  'New CEP categories added this period — golden test fixture.',
  'Gaining',
  'Outperforming primary competitor on all tracked signals — golden test fixture.'
)
ON CONFLICT DO NOTHING;

-- ── 3. Golden campaign ───────────────────────────────────────────────────────
-- Required by ADV-08: /api/signal-report with missing campaign_id → 400
-- Campaign must exist so the 400 is a missing-field error, not a 404.
-- (If your GOLDEN_CAMPAIGN_ID already exists, this is a no-op.)
INSERT INTO campaigns (id, client_id, name, status)
SELECT
  '99dcd9c1-bbbd-4a7e-b8d8-d6023ea8a30c',
  '0001d717-a5e8-40f2-9b77-0127045a4f92',
  'Golden Test Campaign',
  'Active'
WHERE NOT EXISTS (
  SELECT 1 FROM campaigns WHERE id = '99dcd9c1-bbbd-4a7e-b8d8-d6023ea8a30c'
);
