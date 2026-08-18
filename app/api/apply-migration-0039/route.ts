// TEMPORARY — delete after running once
// Applies migration 0039: Cultural Radar & Instigation Engine — cultural_signals table

import { NextResponse } from "next/server";

const STATEMENTS: { label: string; sql: string }[] = [
  {
    label: "CREATE TABLE cultural_signals",
    sql: `CREATE TABLE IF NOT EXISTS cultural_signals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_name             TEXT NOT NULL,
  signal_type             TEXT NOT NULL CHECK (signal_type IN ('behavioural', 'linguistic', 'ritual', 'community')),
  source_description      TEXT NOT NULL,
  evidence                TEXT NOT NULL,
  is_trending             BOOLEAN DEFAULT false,
  geographic_scope        TEXT DEFAULT 'MY',
  why_it_matters          TEXT,
  brand_fit_notes         TEXT,
  brand_fit_status        TEXT DEFAULT 'pending' CHECK (brand_fit_status IN ('pending', 'strong', 'weak', 'not_ours')),
  community_respect_check BOOLEAN DEFAULT false,
  handoff_brief           TEXT,
  handoff_generated_at    TIMESTAMPTZ,
  status                  TEXT DEFAULT 'logged' CHECK (status IN ('logged', 'assessed', 'briefed', 'archived')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
)`,
  },
  {
    label: "FUNCTION update_cultural_signals_updated_at",
    sql: `CREATE OR REPLACE FUNCTION update_cultural_signals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
  },
  {
    label: "TRIGGER cultural_signals_updated_at",
    sql: `CREATE TRIGGER cultural_signals_updated_at
  BEFORE UPDATE ON cultural_signals
  FOR EACH ROW EXECUTE FUNCTION update_cultural_signals_updated_at()`,
  },
  {
    label: "INDEX cultural_signals_created_at_idx",
    sql: `CREATE INDEX IF NOT EXISTS cultural_signals_created_at_idx ON cultural_signals(created_at DESC)`,
  },
  {
    label: "INDEX cultural_signals_status_idx",
    sql: `CREATE INDEX IF NOT EXISTS cultural_signals_status_idx ON cultural_signals(status)`,
  },
];

async function execSql(url: string, key: string, sql: string) {
  const r2 = await fetch(`${url}/rest/v1/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "params=single-object",
    },
    body: JSON.stringify({ query: sql }),
  });

  // Try the SQL API endpoint
  const sqlUrl = `${url}/rest/v1/rpc/exec_sql`;
  const r = await fetch(sqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql }),
  });
  const body = await r.text();
  return { ok: r.ok, body };
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Check if table already exists
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { error: checkError } = await supabase
    .from("cultural_signals")
    .select("id")
    .limit(1);

  if (!checkError) {
    return NextResponse.json({ status: "table already exists — migration skipped" });
  }

  const results: { label: string; status: string; error?: string }[] = [];
  let errors = 0;

  for (const { label, sql } of STATEMENTS) {
    const { ok, body } = await execSql(url, key, sql);
    if (ok) {
      results.push({ label, status: "ok" });
    } else {
      const alreadyExists =
        body.includes("already exists") ||
        body.includes("duplicate") ||
        body.includes("42P07") ||
        body.includes("42710");
      if (alreadyExists) {
        results.push({ label, status: "skipped (already exists)" });
      } else {
        results.push({ label, status: "ERROR", error: body });
        errors++;
      }
    }
  }

  return NextResponse.json(
    {
      migration: "0039_cultural_signals",
      total: STATEMENTS.length,
      ok: STATEMENTS.length - errors,
      errors,
      results,
    },
    { status: errors === 0 ? 200 : 207 }
  );
}
