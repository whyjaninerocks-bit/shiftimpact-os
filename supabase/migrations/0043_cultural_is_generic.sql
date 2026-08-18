-- Migration 0043: Add is_generic flag to cultural_signals
--
-- Generic cultural signals apply to ANY Malaysian/SEA consumer brand
-- (festive behaviours, common expressions, universal rituals, broad symbols).
-- Industry-specific signals (is_generic = false) are matched by relevant_industries[].
--
-- is_generic = true  → always surfaced in ALL active client contexts + digest
-- is_generic = false → surfaced only when client.industry overlaps relevant_industries
--
-- Auto-classified by Claude Haiku at signal creation time.
-- Can be manually overridden via the cultural radar edit UI.

ALTER TABLE cultural_signals
  ADD COLUMN IF NOT EXISTS is_generic BOOLEAN NOT NULL DEFAULT false;

-- Index for fast digest queries (pull generic signals + industry-matched)
CREATE INDEX IF NOT EXISTS cultural_signals_is_generic_idx
  ON cultural_signals (is_generic)
  WHERE is_generic = true;
