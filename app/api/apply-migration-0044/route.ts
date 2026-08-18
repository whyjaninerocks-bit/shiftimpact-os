// GET /api/apply-migration-0044
// Expands the clients.industry_profile CHECK constraint to include FMCG, Financial Services,
// Telco, Healthcare, etc. — aligning the DB with the create-client form options.
// Run once from browser while app is deployed.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();

  const sql = `
    ALTER TABLE clients
      DROP CONSTRAINT IF EXISTS clients_industry_profile_check;

    ALTER TABLE clients
      ADD CONSTRAINT clients_industry_profile_check
      CHECK (industry_profile IN (
        'QSR', 'B2B', 'Retail', 'Other',
        'FMCG', 'Financial Services', 'Telco',
        'Healthcare', 'Insurance', 'Automotive',
        'Hospitality', 'Media & Entertainment',
        'E-Commerce', 'Education', 'B2B SaaS'
      ));
  `;

  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Migration 0044 applied — industry_profile constraint expanded",
  });
}
