-- Migration 0066 — Client signal automation config
-- ShiftImpact OS
--
-- Adds three fields to clients so the automated signal crons (S1 SoS + S3 UGC)
-- know what to search for per client, and a GA4 property ID for the WA Echo
-- detection connector (Phase 2 when GA4 API is wired in).
--
-- signal_weekly_reports also gets:
--   direct_traffic_sessions — manual entry v1 for WA Echo Event detection
--   wa_echo_event           — computed flag, set by signal-report or cron when
--                             S2 spike (week N) precedes direct traffic spike
--                             (week N or N+1) by at least 20% above 4-week avg

-- ─── 1. clients — signal automation config ────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tiktok_handle       TEXT,   -- e.g. "@cooksmalaysia" — used by S3 scan cron
  ADD COLUMN IF NOT EXISTS primary_hashtag     TEXT,   -- e.g. "cookswith" — TikTok hashtag to count weekly
  ADD COLUMN IF NOT EXISTS brand_search_term   TEXT,   -- e.g. "Cooks sauce" — Google Trends keyword for S1
  ADD COLUMN IF NOT EXISTS ga4_property_id     TEXT;   -- e.g. "properties/123456789" — GA4 Data API (Phase 2)

COMMENT ON COLUMN clients.tiktok_handle     IS 'TikTok brand handle (without @). Used by signal-s3-scan cron.';
COMMENT ON COLUMN clients.primary_hashtag   IS 'Primary campaign hashtag (without #). Counts weekly UGC volume for S3.';
COMMENT ON COLUMN clients.brand_search_term IS 'Exact phrase for Google Trends branded search. Used by signal-s1-scan cron.';
COMMENT ON COLUMN clients.ga4_property_id   IS 'Google Analytics 4 property ID (format: properties/XXXXXXXXX). Used for WA Echo detection Phase 2.';

-- ─── 2. signal_weekly_reports — WA Echo Event detection ───────────────────────

ALTER TABLE signal_weekly_reports
  ADD COLUMN IF NOT EXISTS direct_traffic_sessions  INTEGER,
  ADD COLUMN IF NOT EXISTS wa_echo_event            BOOLEAN  DEFAULT false;

COMMENT ON COLUMN signal_weekly_reports.direct_traffic_sessions IS 'GA4 direct/none sessions for the week. Manual entry v1; GA4 API connector in Phase 2.';
COMMENT ON COLUMN signal_weekly_reports.wa_echo_event           IS 'True when S2 save spike (this week or prior week) coincides with direct traffic spike — confirms content entered WhatsApp networks.';

-- ─── 3. signal_weekly_reports — S1 and S3 automation source flag ──────────────
-- Track whether the value was entered manually or written by the cron.
-- Allows UI to show "auto-updated" vs "needs entry" per signal.

ALTER TABLE signal_weekly_reports
  ADD COLUMN IF NOT EXISTS signal_1_auto   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signal_3_auto   BOOLEAN DEFAULT false;

COMMENT ON COLUMN signal_weekly_reports.signal_1_auto IS 'True when signal_1_actual_pct was written by the signal-s1-scan cron (Google Trends).';
COMMENT ON COLUMN signal_weekly_reports.signal_3_auto IS 'True when signal_3_actual_count was written by the signal-s3-scan cron (TikTok hashtag).';

-- ─── Verify ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'clients'
      AND column_name IN ('tiktok_handle', 'primary_hashtag', 'brand_search_term', 'ga4_property_id')
  ) = 4, 'clients: expected 4 new signal config columns';

  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'signal_weekly_reports'
      AND column_name IN ('direct_traffic_sessions', 'wa_echo_event', 'signal_1_auto', 'signal_3_auto')
  ) = 4, 'signal_weekly_reports: expected 4 new columns';

  RAISE NOTICE 'Migration 0066 verified — client signal automation config + WA Echo detection fields ready.';
END $$;
