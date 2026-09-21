-- Migration 0099: Platform Benchmark Reference Library v0.1
--
-- Manual reference bank for Platform Behaviour + Format Efficacy Intelligence
-- (see brainstorm/plan delivered before this build). This table stores ONLY
-- curated, human-entered reference entries about platform/format/market
-- behaviour — it is not a live tracker, not scraped, and not connected to
-- any AI diagnosis. It has no relationship to creative_format_reads
-- (migration 0098) yet; that connection is explicitly future work per the
-- approved plan's point 3, and this migration does not touch that table.
--
-- Every entry keeps its source_type and market_applicability separate and
-- visible — never flattened into one confidence number — mirroring the
-- discipline strategic_basis_sources (migration 0087) already applies to
-- FRAME/BIP citations. A platform_published_metric, a mccann_client_benchmark,
-- and a strategist_observation about the same platform/format stay three
-- distinct rows, each labeled with its own evidence tier.
--
-- Standard editable-reference-data shape (matches partner_workspaces,
-- migration 0040): has updated_at + a trigger, unlike creative_format_reads'
-- append-only runs, because this is a maintained library, not a run log.
-- Archiving (is_active = false) is how a stale or superseded entry is
-- retired — the row stays for history but must never be treated as a live,
-- citable reference once archived (enforced at the UI/query layer: default
-- fetchers only return is_active = true).
--
-- INTERNAL ONLY. No RLS policy grants client-side access — same posture as
-- creative_format_reads and strategic_synthesis_runs. Access is exclusively
-- through the server-side admin client. No portal exposure anywhere in this
-- build.
--
-- No seed data in this migration — per explicit instruction, only real,
-- source-and-date-verified entries may be seeded, and none were provided or
-- verified at build time. The table ships empty; a strategist populates it
-- through the CRUD UI (app/(os)/platform-benchmarks) with real sources.

CREATE TABLE IF NOT EXISTS platform_benchmarks (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── What this entry is about ──────────────────────────────────────────
  platform                  TEXT        NOT NULL,
  format                    TEXT        NOT NULL,
  asset_type                TEXT        NOT NULL,
  campaign_objective        TEXT,

  -- ── Market scope ───────────────────────────────────────────────────────
  -- market_code nullable: a 'global' or 'proxy_needs_validation' entry may
  -- have no specific market. Not validated against MARKET_CODE_OPTIONS at
  -- the DB layer (same posture as campaigns.primary_market_code) — kept
  -- loose here because a benchmark can legitimately cite a market outside
  -- the OS's own tracked-market list (e.g. a global platform stat).
  market_code               TEXT,
  market_applicability      TEXT        NOT NULL
    CHECK (market_applicability IN ('country_specific', 'sea_regional', 'global', 'proxy_needs_validation')),

  -- ── Source, kept separate and never blended ──────────────────────────────
  source_type               TEXT        NOT NULL
    CHECK (source_type IN (
      'platform_published_metric',
      'platform_creative_guidance',
      'industry_benchmark',
      'mccann_client_benchmark',
      'campaign_actual',
      'strategist_observation'
    )),
  source_title               TEXT        NOT NULL,
  source_url                 TEXT,
  captured_on                 DATE        NOT NULL,
  staleness_window_days       INTEGER,

  -- ── The actual reference content ─────────────────────────────────────
  guidance_or_benchmark       TEXT        NOT NULL,
  strategic_implication       TEXT        NOT NULL,

  -- Fixed vocabulary, validated in lib/platform-benchmarks.ts, not a DB
  -- CHECK — an array CHECK against 10 literal values is brittle to
  -- maintain in SQL; the app layer is the single source of truth for the
  -- allowed tag list (RISK_TAG_OPTIONS), same posture as
  -- CREATIVE_FORMAT_DIMENSIONS' key list living in TS, not SQL.
  risk_tags                   TEXT[]      NOT NULL DEFAULT '{}',

  what_to_check_in_asset      TEXT,
  what_not_to_claim           TEXT,

  confidence_level            TEXT        NOT NULL DEFAULT 'medium'
    CHECK (confidence_level IN ('low', 'medium', 'high')),

  is_active                   BOOLEAN     NOT NULL DEFAULT TRUE,

  created_by                  UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_platform_benchmarks_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_platform_benchmarks_updated_at
  BEFORE UPDATE ON platform_benchmarks
  FOR EACH ROW EXECUTE FUNCTION update_platform_benchmarks_updated_at();

-- Supports the CRUD view's default filtered lists: active references first,
-- filterable by platform/format/market/source_type.
CREATE INDEX IF NOT EXISTS platform_benchmarks_active_idx
  ON platform_benchmarks (is_active, platform, format);

CREATE INDEX IF NOT EXISTS platform_benchmarks_market_idx
  ON platform_benchmarks (market_code);

-- No rows inserted — see header note. Table ships empty.
