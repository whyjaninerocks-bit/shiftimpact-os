// app/api/apply-migration-0042/route.ts
// One-time: adds strategic_move window type + cultural_signals client linking columns.
// GET /api/apply-migration-0042

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const steps: string[] = [];
  const errors: string[] = [];

  // 1. Drop old CHECK constraint on opportunity_windows.window_type
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `ALTER TABLE opportunity_windows DROP CONSTRAINT IF EXISTS opportunity_windows_window_type_check`,
  }).single();
  if (e1) {
    // rpc may not exist; fall through — next step will fail loudly if needed
    errors.push(`drop constraint (may be ok): ${e1.message}`);
  } else {
    steps.push("dropped old window_type CHECK constraint");
  }

  // 2. Add new CHECK constraint including strategic_move
  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `ALTER TABLE opportunity_windows ADD CONSTRAINT opportunity_windows_window_type_check CHECK (window_type IN ('fiscal_cycle','conference_calendar','renewal_season','funding_event','leadership_change','rfp_cycle','campaign_season','product_launch','strategic_move'))`,
  }).single();
  if (e2) errors.push(`add constraint: ${e2.message}`);
  else steps.push("added new CHECK constraint with strategic_move");

  // 3. Seed B2C strategic_move window
  const { error: e3 } = await supabase
    .from("opportunity_windows")
    .upsert({
      window_type: "strategic_move",
      engagement_model: "B2C",
      label: "Strategic Move",
      description: "MOU, distribution partnership, market expansion, or major business milestone. External communications rarely keep pace — the narrative gap is the entry point.",
      signal_hint: "MOU, partnership signing, market expansion, or milestone announcement detected",
      is_active: true,
    }, { onConflict: "window_type,engagement_model", ignoreDuplicates: true });
  if (e3) errors.push(`seed B2C strategic_move: ${e3.message}`);
  else steps.push("seeded B2C strategic_move window");

  // 4. Seed B2B strategic_move window
  const { error: e4 } = await supabase
    .from("opportunity_windows")
    .upsert({
      window_type: "strategic_move",
      engagement_model: "B2B",
      label: "Strategic Move",
      description: "Signed agreement, joint venture, distribution deal, or significant market expansion. New strategic commitments create rapid demand for aligned positioning and intelligence before execution begins.",
      signal_hint: "Signed agreement, partnership, joint venture, or expansion announcement detected",
      is_active: true,
    }, { onConflict: "window_type,engagement_model", ignoreDuplicates: true });
  if (e4) errors.push(`seed B2B strategic_move: ${e4.message}`);
  else steps.push("seeded B2B strategic_move window");

  // 5. Add relevant_industries column to cultural_signals
  const { error: e5 } = await supabase.rpc("exec_sql", {
    sql: `ALTER TABLE cultural_signals ADD COLUMN IF NOT EXISTS relevant_industries TEXT[] DEFAULT '{}'`,
  }).single();
  if (e5) errors.push(`relevant_industries column: ${e5.message}`);
  else steps.push("added relevant_industries column to cultural_signals");

  // 6. Add client_id column to cultural_signals
  const { error: e6 } = await supabase.rpc("exec_sql", {
    sql: `ALTER TABLE cultural_signals ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES companies(id) ON DELETE SET NULL`,
  }).single();
  if (e6) errors.push(`client_id column: ${e6.message}`);
  else steps.push("added client_id column to cultural_signals");

  return NextResponse.json({ steps, errors, ok: errors.length === 0 });
}
