-- Migration 0068 — Signal 2 (Save Rate) automation flag
-- ShiftImpact OS
--
-- Adds signal_2_auto to signal_weekly_reports, mirroring signal_1_auto /
-- signal_3_auto (migration 0066). Lets the UI show "auto-updated" vs
-- "needs entry" for Save Rate, and lets signal-s3-scan write S2 without
-- overwriting a strategy lead's manual entry.
--
-- Verified live via a direct Apify test call (23 Aug 2026) that
-- clockworks/free-tiktok-scraper returns both collectCount (saves) and
-- playCount per video — Save Rate = collectCount / playCount * 100 is
-- computable from the same hashtag scrape already running for S3, no new
-- Apify actor or credential needed.

ALTER TABLE signal_weekly_reports
  ADD COLUMN IF NOT EXISTS signal_2_auto BOOLEAN DEFAULT false;

COMMENT ON COLUMN signal_weekly_reports.signal_2_auto IS 'True when signal_2_actual_pct was written by the signal-s3-scan cron (TikTok collectCount / playCount), not entered manually.';

-- ─── Verify ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'signal_weekly_reports' AND column_name = 'signal_2_auto'
  ) = 1, 'signal_weekly_reports.signal_2_auto column missing';

  RAISE NOTICE 'Migration 0068 verified — signal_2_auto ready.';
END $$;
