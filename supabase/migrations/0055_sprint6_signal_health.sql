-- Migration 0055 — Sprint 6: Signal Health Foundation
-- ShiftImpact OS
--
-- Adds schema for:
--   1. mdh_imports — CSV import session log per campaign
--   2. oie_company_id on clients — links a client to their OIE company record
--      so competitive signals from prospect_signals auto-feed Creative Fatigue Index.
--
-- NOTE: signal_health_scores is intentionally NOT persisted — it is computed at
-- render time from existing signal_media_delivery + signal_weekly_reports +
-- signal_thresholds data. Keeping it computed prevents stale cached values.

-- ─── 1. mdh_imports — CSV batch import log ────────────────────────────────────

CREATE TABLE IF NOT EXISTS mdh_imports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- file metadata
  filename        TEXT        NOT NULL DEFAULT '',
  row_count       INTEGER     NOT NULL DEFAULT 0,      -- total rows parsed from CSV
  imported_count  INTEGER     NOT NULL DEFAULT 0,      -- rows successfully written
  error_count     INTEGER     NOT NULL DEFAULT 0,      -- rows that failed
  status          TEXT        NOT NULL DEFAULT 'Processing'
                    CHECK (status IN ('Processing', 'Complete', 'Failed')),
  error_log       TEXT        NOT NULL DEFAULT '',     -- JSON array of per-row errors

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mdh_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_mdh_imports"
  ON mdh_imports FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS mdh_imports_campaign_idx
  ON mdh_imports(campaign_id);

-- ─── 2. oie_company_id on clients ─────────────────────────────────────────────
-- Nullable FK: when a ShiftImpact client was first an OIE prospect, link them here.
-- This enables live competitive signal feed: clients.oie_company_id
--   → companies(id) → prospect_signals(signal_category = 'Competitive')
-- When null, Creative Fatigue falls back to hasCompetitiveSignal = false.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS oie_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS clients_oie_company_idx
  ON clients(oie_company_id)
  WHERE oie_company_id IS NOT NULL;

-- ─── Verify ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mdh_imports'
  ) = 1, 'mdh_imports table missing';

  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'oie_company_id'
  ) = 1, 'clients.oie_company_id column missing';

  RAISE NOTICE 'Migration 0055 verified — Sprint 6 signal health schema ready.';
END $$;
