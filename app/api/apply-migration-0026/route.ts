// TEMPORARY — delete after running once
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const sql = `
    ALTER TABLE idea_extensions
      ADD COLUMN IF NOT EXISTS idea_spine text DEFAULT '',
      ADD COLUMN IF NOT EXISTS concept_rationale text DEFAULT '',
      ADD COLUMN IF NOT EXISTS win_conditions text DEFAULT '',
      ADD COLUMN IF NOT EXISTS cog_lens text DEFAULT '',
      ADD COLUMN IF NOT EXISTS cfo_lens text DEFAULT '',
      ADD COLUMN IF NOT EXISTS cco_lens text DEFAULT '',
      ADD COLUMN IF NOT EXISTS client_notes text DEFAULT '',
      ADD COLUMN IF NOT EXISTS bip_topline_idea text DEFAULT '',
      ADD COLUMN IF NOT EXISTS anchor_integrity_check text DEFAULT '';
  `;
  const { error } = await supabase.rpc("exec_sql", { sql }).single();
  // exec_sql may not exist — use raw query approach
  if (error && error.message?.includes("exec_sql")) {
    // Try direct approach via pg
    const results = await Promise.all([
      supabase.from("idea_extensions").select("idea_spine").limit(1),
    ]);
    const alreadyHas = !results[0].error;
    if (alreadyHas) {
      return NextResponse.json({ status: "columns already exist" });
    }
    return NextResponse.json({ error: "exec_sql not available, run migration manually", sql }, { status: 500 });
  }
  if (error) return NextResponse.json({ error: error.message, sql }, { status: 500 });
  return NextResponse.json({ status: "migration applied" });
}
