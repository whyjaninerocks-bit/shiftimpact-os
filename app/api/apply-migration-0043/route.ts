// app/api/apply-migration-0043/route.ts
// One-time: creates cultural_signals table (0039) + client linking (0042) + is_generic (0043).
// Fully idempotent — safe to run multiple times.
// GET /api/apply-migration-0043

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const steps: string[] = [];
  const errors: string[] = [];

  async function runSQL(label: string, sql: string) {
    const { error } = await supabase.rpc("exec_sql", { sql }).single();
    if (error) {
      errors.push(`${label}: ${error.message}`);
    } else {
      steps.push(label);
    }
  }

  // ── Migration 0039: Create cultural_signals table ─────────────────────────

  await runSQL("create cultural_signals table", `
    CREATE TABLE IF NOT EXISTS cultural_signals (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      signal_name             TEXT NOT NULL,
      signal_type             TEXT NOT NULL CHECK (signal_type IN ('behavioural','linguistic','ritual','community')),
      source_description      TEXT NOT NULL,
      evidence                TEXT NOT NULL,
      is_trending             BOOLEAN DEFAULT false,
      geographic_scope        TEXT DEFAULT 'MY',
      why_it_matters          TEXT,
      brand_fit_notes         TEXT,
      brand_fit_status        TEXT DEFAULT 'pending'
                                CHECK (brand_fit_status IN ('pending','strong','weak','not_ours')),
      community_respect_check BOOLEAN DEFAULT false,
      handoff_brief           TEXT,
      handoff_generated_at    TIMESTAMPTZ,
      status                  TEXT DEFAULT 'logged'
                                CHECK (status IN ('logged','assessed','briefed','archived')),
      created_at              TIMESTAMPTZ DEFAULT NOW(),
      updated_at              TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await runSQL("create updated_at trigger function", `
    CREATE OR REPLACE FUNCTION update_cultural_signals_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await runSQL("create updated_at trigger", `
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'cultural_signals_updated_at'
      ) THEN
        CREATE TRIGGER cultural_signals_updated_at
          BEFORE UPDATE ON cultural_signals
          FOR EACH ROW EXECUTE FUNCTION update_cultural_signals_updated_at();
      END IF;
    END $$
  `);

  await runSQL("create created_at index", `
    CREATE INDEX IF NOT EXISTS cultural_signals_created_at_idx ON cultural_signals(created_at DESC)
  `);

  await runSQL("create status index", `
    CREATE INDEX IF NOT EXISTS cultural_signals_status_idx ON cultural_signals(status)
  `);

  // ── Migration 0042: strategic_move + cultural signal client linking ────────

  await runSQL("drop old window_type constraint", `
    ALTER TABLE opportunity_windows DROP CONSTRAINT IF EXISTS opportunity_windows_window_type_check
  `);

  await runSQL("add window_type constraint with strategic_move", `
    ALTER TABLE opportunity_windows ADD CONSTRAINT opportunity_windows_window_type_check
    CHECK (window_type IN (
      'fiscal_cycle','conference_calendar','renewal_season','funding_event',
      'leadership_change','rfp_cycle','campaign_season','product_launch','strategic_move'
    ))
  `);

  const { error: seedB2C } = await supabase
    .from("opportunity_windows")
    .upsert({
      window_type: "strategic_move", engagement_model: "B2C",
      label: "Strategic Move",
      description: "MOU, distribution partnership, market expansion, or major business milestone. External communications rarely keep pace — the narrative gap is the entry point.",
      signal_hint: "MOU, partnership signing, market expansion, or milestone announcement detected",
      is_active: true,
    }, { onConflict: "window_type,engagement_model", ignoreDuplicates: true });
  if (seedB2C) errors.push(`seed B2C strategic_move: ${seedB2C.message}`);
  else steps.push("seeded B2C strategic_move window");

  const { error: seedB2B } = await supabase
    .from("opportunity_windows")
    .upsert({
      window_type: "strategic_move", engagement_model: "B2B",
      label: "Strategic Move",
      description: "Signed agreement, joint venture, distribution deal, or significant market expansion. New strategic commitments create rapid demand for aligned positioning and intelligence before execution begins.",
      signal_hint: "Signed agreement, partnership, joint venture, or expansion announcement detected",
      is_active: true,
    }, { onConflict: "window_type,engagement_model", ignoreDuplicates: true });
  if (seedB2B) errors.push(`seed B2B strategic_move: ${seedB2B.message}`);
  else steps.push("seeded B2B strategic_move window");

  await runSQL("add relevant_industries column", `
    ALTER TABLE cultural_signals ADD COLUMN IF NOT EXISTS relevant_industries TEXT[] DEFAULT '{}'
  `);

  await runSQL("add client_id column", `
    ALTER TABLE cultural_signals ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES companies(id) ON DELETE SET NULL
  `);

  // ── Migration 0043: is_generic flag ──────────────────────────────────────

  await runSQL("add is_generic column", `
    ALTER TABLE cultural_signals ADD COLUMN IF NOT EXISTS is_generic BOOLEAN NOT NULL DEFAULT false
  `);

  await runSQL("create is_generic index", `
    CREATE INDEX IF NOT EXISTS cultural_signals_is_generic_idx
    ON cultural_signals (is_generic) WHERE is_generic = true
  `);

  await runSQL("create relevant_industries GIN index", `
    CREATE INDEX IF NOT EXISTS cultural_signals_industries_idx
    ON cultural_signals USING GIN (relevant_industries)
  `);

  await runSQL("create client_id index", `
    CREATE INDEX IF NOT EXISTS cultural_signals_client_id_idx
    ON cultural_signals (client_id) WHERE client_id IS NOT NULL
  `);

  return NextResponse.json({ steps, errors, ok: errors.length === 0 });
}
