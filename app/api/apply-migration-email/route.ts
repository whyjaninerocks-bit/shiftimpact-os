// TEMPORARY — delete after running once
// Applies migration 0026: email to team_members, contact fields to clients

import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const statements = [
    `ALTER TABLE team_members ADD COLUMN IF NOT EXISTS email text`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name text`,
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_email text`,
  ];

  const results: { sql: string; status: string; error?: string }[] = [];

  for (const sql of statements) {
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (res.ok) {
      results.push({ sql, status: "ok" });
    } else {
      // exec_sql not available — try postgres extension via pg_query
      const res2 = await fetch(`${url}/rest/v1/rpc/pg_query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await res2.text();
      results.push({ sql, status: res2.ok ? "ok" : "error", error: res2.ok ? undefined : text });
    }
  }

  const allOk = results.every((r) => r.status === "ok");
  return NextResponse.json({ results }, { status: allOk ? 200 : 207 });
}
