-- Migration 0024 — Data Source Preferences (Proxy Mode)
-- Sprint 31 · 20 July 2026
--
-- Stores per-campaign, per-signal data source mode:
--   confirmed = client provides actual data (full weight)
--   indexed   = client provides directional signals (85% weight)
--   proxied   = OS derives from public sources (70% weight)
--
-- One row per campaign. Upsert on campaign_id.
-- Indexed direction fields only populated when mode = 'indexed'.

CREATE TABLE IF NOT EXISTS campaign_data_preferences (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id                     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Signal 1 — Share of Voice
  mode_sov                        TEXT NOT NULL DEFAULT 'confirmed'
                                    CHECK (mode_sov IN ('confirmed','indexed','proxied')),
  indexed_sov_direction           TEXT CHECK (indexed_sov_direction IN ('Higher','Same','Lower')),
  indexed_sov_pct                 INTEGER CHECK (indexed_sov_pct BETWEEN 0 AND 200),

  -- Signal 2 — Save Rate
  mode_save_rate                  TEXT NOT NULL DEFAULT 'confirmed'
                                    CHECK (mode_save_rate IN ('confirmed','indexed','proxied')),
  indexed_save_rate_direction     TEXT CHECK (indexed_save_rate_direction IN ('Higher','Same','Lower')),

  -- Signal 2B — Share Rate
  mode_share_rate                 TEXT NOT NULL DEFAULT 'confirmed'
                                    CHECK (mode_share_rate IN ('confirmed','indexed','proxied')),
  indexed_share_rate_direction    TEXT CHECK (indexed_share_rate_direction IN ('Higher','Same','Lower')),

  -- Signal 3 — Branded Search Lift
  mode_branded_search             TEXT NOT NULL DEFAULT 'confirmed'
                                    CHECK (mode_branded_search IN ('confirmed','indexed','proxied')),
  indexed_branded_search_direction TEXT CHECK (indexed_branded_search_direction IN ('Higher','Same','Lower')),
  indexed_branded_search_pct      INTEGER CHECK (indexed_branded_search_pct BETWEEN 0 AND 200),

  -- Signal 3B — Video Completion Rate
  mode_vcr                        TEXT NOT NULL DEFAULT 'confirmed'
                                    CHECK (mode_vcr IN ('confirmed','indexed','proxied')),
  indexed_vcr_direction           TEXT CHECK (indexed_vcr_direction IN ('Higher','Same','Lower')),

  -- Signal 4 — App Retention
  mode_retention                  TEXT NOT NULL DEFAULT 'confirmed'
                                    CHECK (mode_retention IN ('confirmed','indexed','proxied')),
  indexed_retention_direction     TEXT CHECK (indexed_retention_direction IN ('Higher','Same','Lower')),

  -- Attribution / Conversions
  mode_attribution                TEXT NOT NULL DEFAULT 'confirmed'
                                    CHECK (mode_attribution IN ('confirmed','indexed','proxied')),
  indexed_attribution_direction   TEXT CHECK (indexed_attribution_direction IN ('Higher','Same','Lower')),

  -- Media Spend (indexed only — no proxied option for spend)
  mode_media_spend                TEXT NOT NULL DEFAULT 'confirmed'
                                    CHECK (mode_media_spend IN ('confirmed','indexed')),

  -- Setup notes
  setup_notes                     TEXT,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (campaign_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_data_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_data_preferences_updated_at
  BEFORE UPDATE ON campaign_data_preferences
  FOR EACH ROW EXECUTE FUNCTION update_data_preferences_timestamp();
