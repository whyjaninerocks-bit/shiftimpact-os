// app/api/apply-migration-0043/route.ts
// One-time: adds is_generic flag to cultural_signals
// Also re-runs 0042 steps (idempotent) in case they weren't applied yet.
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

  // ── Migration 0042 (idempotent catch-up) ─────────────────────────────────

  await runSQL(
    "drop old window_type constraint",
    `ALTER TABLE opportunity_windows DROP CONSTRAINT IF EXISTS opportunity_windows_window_type_check`
  );

  await runSQL(
    "add new window_type constraint with strategic_move",
    `ALTER TABLE opportunity_windows ADD CONSTRAINT opportunity_windows_window_type_check
     CHECK (window_type IN ('fiscal_cycle','conference_calendar','renewal_season','funding_event',
       'leadership_change','rfp_cycle','campaign_season','product_launch','strategic_move'))`
  );

  // Seed windows via upsert (safe if already exists)
  const { error: seedB2C } = await supabase
    .from("opportunity_windows")
    .upsert({
      window_type: "strategic_move",
      engagement_model: "B2C",
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
      window_type: "strategic_move",
      engagement_model: "B2B",
      label: "Strategic Move",
      description: "Signed agreement, joint venture, distribution deal, or significant market expansion. New strategic commitments create rapid demand for aligned positioning and intelligence before execution begins.",
      signal_hint: "Signed agreement, partnership, joint venture, or expansion announcement detected",
      is_active: true,
    }, { onConflict: "window_type,engagement_model", ignoreDuplicates: true });
  if (seedB2B) errors.push(`seed B2B strategic_move: ${seedB2B.message}`);
  else steps.push("seeded B2B strategic_move window");

  await runSQL(
    "add relevant_industries to cultural_signals",
    `ALTER TABLE cultural_signals ADD COLUMN IF NOT EXISTS relevant_industries TEXT[] DEFAULT '{}'`
  );

  await runSQL(
    "add client_id to cultural_signals",
    `ALTER TABLE cultural_signals ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES companies(id) ON DELETE SET NULL`
  );

  // ── Migration 0043 ────────────────────────────────────────────────────────

  await runSQL(
    "add is_generic to cultural_signals",
    `ALTER TABLE cultural_signals ADD COLUMN IF NOT EXISTS is_generic BOOLEAN NOT NULL DEFAULT false`
  );

  await runSQL(
    "create is_generic index",
    `CREATE INDEX IF NOT EXISTS cultural_signals_is_generic_idx
     ON cultural_signals (is_generic) WHERE is_generic = true`
  );

  await runSQL(
    "create relevant_industries GIN index",
    `CREATE INDEX IF NOT EXISTS cultural_signals_industries_idx
     ON cultural_signals USING GIN (relevant_industries)`
  );

  await runSQL(
    "create client_id index",
    `CREATE INDEX IF NOT EXISTS cultural_signals_client_id_idx
     ON cultural_signals (client_id) WHERE client_id IS NOT NULL`
  );

  return NextResponse.json({ steps, errors, ok: errors.length === 0 });
}
