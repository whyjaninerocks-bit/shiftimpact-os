-- Migration 0098: Creative Format Reads (Creative Format Read v0.1 schema/UI)
--
-- Stores one row per Creative Format Read diagnosis run — the output of
-- lib/creative-format-read.ts's 11-dimension diagnosis against a pasted
-- creative asset description. See that file for the full guardrail /
-- asset-maturity-cap logic; this table only persists what it produces.
--
-- Genuinely append-only, unlike strategic_synthesis_runs (migration 0088),
-- which gets updated for its review/apply/reject lifecycle. Creative Format
-- Read never writes to frame_briefs or big_idea_platforms and has no
-- apply/reject step of its own — it's a read, not a draft — so there is no
-- review lifecycle here and therefore no reason to ever UPDATE a row after
-- insert. A re-run at a later asset maturity is a new row, never an edit to
-- an old one: a script-stage read and a final-asset-stage read of the same
-- idea are different diagnoses, not corrections of each other.
--
-- frame_brief_id / big_idea_platform_id are nullable, for fast display/joins
-- only — the actual source of truth for what was diagnosed against is
-- input_snapshot, frozen at run time, same reasoning strategic_synthesis_runs
-- already uses: a later edit to the FRAME or BIP must never retroactively
-- misrepresent what a past read was based on.
--
-- INTERNAL ONLY. No RLS policy grants client-side access — same posture as
-- strategic_synthesis_runs and campaign_signal_maps. Access is exclusively
-- through the server-side admin client (see lib/supabase/admin.ts), and the
-- UI that reads this table (CreativeFormatReadSection.tsx) is wired only
-- into app/(os)/campaigns/[id]/page.tsx, never into app/portal/.
--
-- Live model-output QA is still pending (ANTHROPIC_API_KEY not reachable in
-- the build/QC sandbox) — see CreativeFormatReadSection.tsx's on-screen
-- "Unvalidated — pending live-output QA" badge, not just this comment.

CREATE TABLE IF NOT EXISTS creative_format_reads (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id            UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  frame_brief_id         UUID REFERENCES frame_briefs(id) ON DELETE SET NULL,
  big_idea_platform_id   UUID REFERENCES big_idea_platforms(id) ON DELETE SET NULL,

  asset_description      TEXT NOT NULL,
  asset_maturity         TEXT NOT NULL
                            CHECK (asset_maturity IN ('script', 'storyboard', 'rough_cut', 'final_asset')),

  -- Frozen at run time: FRAME/BIP field values, cited basis sources, market
  -- coverage, and Brand-Commerce classification actually used to build the
  -- prompt. Never a live join — see header note above.
  input_snapshot         JSONB NOT NULL,

  -- The 11 CreativeFormatDimensionResult objects (dimensions[] only), exactly
  -- as returned by assembleCreativeFormatRead().dimensions in
  -- lib/creative-format-read.ts.
  output_dimensions      JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- assembleCreativeFormatRead().platform_seam, stored separately from
  -- output_dimensions (rather than folded into one blob) so the UI can
  -- render it as its own footer note rather than a 12th dimension card —
  -- it's explicitly not part of the 11-dimension diagnosis.
  platform_seam           JSONB NOT NULL DEFAULT '{"platform_dependent": false, "platform_note": ""}'::jsonb,

  -- Rendered plain-language read (renderCreativeFormatReadSummary output).
  -- Stored rather than only derived client-side so a past run's strategist
  -- read never changes shape if the renderer's formatting changes later.
  strategist_summary     TEXT,

  status                 TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'ready', 'error')),
  error_message          TEXT,

  created_by             UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_format_reads_campaign_idx
  ON creative_format_reads (campaign_id, created_at DESC);

-- No updated_at / update trigger — deliberately append-only, see header note.
