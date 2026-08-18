-- Migration 0047: KOL / Influencer tracker
-- Structured per-campaign registry for creator partnerships
-- linked to campaign via campaign_id

CREATE TABLE IF NOT EXISTS kol_trackers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'TikTok',       -- TikTok | Instagram | YouTube | X | Other
  tier            TEXT NOT NULL DEFAULT 'Micro',        -- Nano | Micro | Macro | Mega
  follower_count  INTEGER,
  brief_status    TEXT NOT NULL DEFAULT 'Pending',      -- Pending | Briefed | Content Live | Complete
  performance_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kol_trackers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_kol_trackers" ON kol_trackers FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS kol_trackers_campaign_id_idx ON kol_trackers(campaign_id);
