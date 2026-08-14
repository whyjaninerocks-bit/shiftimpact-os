-- Migration 0030: Person Recommendation fields on prospect_insights (deep dive)
-- AI identifies the right person to approach from market signals.
-- ShiftImpact OS · July 2026

ALTER TABLE prospect_insights
  ADD COLUMN IF NOT EXISTS recommended_person_name    TEXT,  -- name if surfaced in signals, else null
  ADD COLUMN IF NOT EXISTS recommended_person_role    TEXT,  -- specific title/role to target
  ADD COLUMN IF NOT EXISTS recommended_person_why     TEXT,  -- why this person, not others
  ADD COLUMN IF NOT EXISTS recommended_person_signal  TEXT,  -- which signal surfaced them
  ADD COLUMN IF NOT EXISTS recommended_person_hook    TEXT;  -- specific opening line for this person
