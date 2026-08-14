// app/api/apply-migration-0046/route.ts
// GET /api/apply-migration-0046
// Adds active_channels + brief_submitted_at to frame_briefs.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const supabase = getSupabase();

  const sql = `
    ALTER TABLE frame_briefs
      ADD COLUMN IF NOT EXISTS active_channels TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS brief_submitted_at TIMESTAMPTZ;
  `;

  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, migration: "0046" });
}
