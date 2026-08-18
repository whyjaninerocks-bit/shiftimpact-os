import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const sql = `
    CREATE TABLE IF NOT EXISTS prediction_accuracy_log (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      category      TEXT NOT NULL CHECK (category IN ('Signal', 'Outcome', 'Gate', 'Behaviour')),
      prediction_text TEXT NOT NULL,
      predicted_value NUMERIC(12,4),
      unit            TEXT,
      prediction_week INTEGER,
      actual_value    NUMERIC(12,4),
      outcome_week    INTEGER,
      verdict         TEXT CHECK (verdict IN ('Accurate', 'Close', 'Off', 'Pending')),
      accuracy_pct    NUMERIC(5,2),
      outcome_note    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_log_campaign
      ON prediction_accuracy_log(campaign_id);
  `;
  const { error } = await supabase.rpc("exec_sql", { query: sql });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Migration 0049 applied" });
}
