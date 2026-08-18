-- Migration 0046: Add active_channels to frame_briefs
-- Stores which channels are active for a campaign (set via the client brief link).
-- Also adds brief_submitted_at so we can track when client marks brief as submitted.

ALTER TABLE frame_briefs
  ADD COLUMN IF NOT EXISTS active_channels TEXT[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brief_submitted_at TIMESTAMPTZ;
