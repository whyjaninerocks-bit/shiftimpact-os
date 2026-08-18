// GET /api/apply-migration-0045
// Adds budget, secondary KPI, brand guidelines, and RFP fields to frame_briefs.
// Run once from browser after deploy.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  const sql = `
    ALTER TABLE frame_briefs
      ADD COLUMN IF NOT EXISTS budget_total           NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS budget_notes           TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS secondary_kpis         TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS brand_guidelines_url   TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS brand_guidelines_notes TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS rfp_notes              TEXT NOT NULL DEFAULT '';
  `;

  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Migration 0045 applied — brief KPI + brand asset fields added to frame_briefs",
  });
}
