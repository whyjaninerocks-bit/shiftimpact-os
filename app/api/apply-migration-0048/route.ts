import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SQL = `
CREATE TABLE IF NOT EXISTS budget_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     TEXT NOT NULL,
  channel         TEXT NOT NULL,
  week_number     INTEGER NOT NULL DEFAULT 1,
  planned_spend   NUMERIC(12,2),
  actual_spend    NUMERIC(12,2),
  currency        TEXT NOT NULL DEFAULT 'MYR',
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE budget_movements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='budget_movements' AND policyname='allow_all_budget_movements') THEN
    CREATE POLICY "allow_all_budget_movements" ON budget_movements FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS budget_movements_campaign_id_idx ON budget_movements(campaign_id);
`;

export async function GET() {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("exec_sql", { sql: SQL });
  if (error) return NextResponse.json({ ok: false, error: error.message, manual_sql: SQL });
  return NextResponse.json({ ok: true });
}
