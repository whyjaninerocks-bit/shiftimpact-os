// TEMPORARY — delete after running once.
// Applies migration 0041: window_alerts table.
// Requires migration 0040 (opportunity_windows) to already be applied.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STATEMENTS: { label: string; sql: string }[] = [
  {
    label: "CREATE TABLE window_alerts",
    sql: `CREATE TABLE IF NOT EXISTS window_alerts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES companies(id)          ON DELETE CASCADE,
  window_id         UUID        NOT NULL REFERENCES opportunity_windows(id) ON DELETE CASCADE,
  trigger_signal_id UUID                 REFERENCES business_signals(id)   ON DELETE SET NULL,
  trigger_reason    TEXT        NOT NULL,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_open           BOOLEAN     NOT NULL DEFAULT TRUE,
  dismissed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, window_id)
)`,
  },
  {
    label: "INDEX window_alerts_company_open",
    sql: `CREATE INDEX IF NOT EXISTS window_alerts_company_open
  ON window_alerts (company_id, is_open, detected_at DESC)`,
  },
  {
    label: "INDEX window_alerts_open_detected",
    sql: `CREATE INDEX IF NOT EXISTS window_alerts_open_detected
  ON window_alerts (is_open, detected_at DESC)
  WHERE is_open = TRUE`,
  },
];

async function execSql(url: string, key: string, sql: string) {
  const r = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql }),
  });
  return { ok: r.ok, body: await r.text() };
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Check if already applied
  const supabase = createAdminClient();
  const { error: check } = await supabase.from("window_alerts").select("id").limit(1);
  if (!check) {
    return NextResponse.json({ status: "migration 0041 already applied — skipped" });
  }

  // Check dependency
  const { error: depCheck } = await supabase.from("opportunity_windows").select("id").limit(1);
  if (depCheck) {
    return NextResponse.json(
      { error: "opportunity_windows table not found. Apply migration 0040 first via /api/apply-migration-0040" },
      { status: 422 }
    );
  }

  const results: { label: string; status: string; error?: string }[] = [];
  let errors = 0;

  for (const { label, sql } of STATEMENTS) {
    const { ok, body } = await execSql(url, key, sql);
    if (ok) {
      results.push({ label, status: "ok" });
    } else {
      const skip = body.includes("already exists") || body.includes("42P07") || body.includes("42710");
      if (skip) {
        results.push({ label, status: "skipped (already exists)" });
      } else {
        results.push({ label, status: "ERROR", error: body });
        errors++;
      }
    }
  }

  return NextResponse.json(
    { migration: "0041_window_alerts", total: STATEMENTS.length, ok: STATEMENTS.length - errors, errors, results },
    { status: errors === 0 ? 200 : 207 }
  );
}
