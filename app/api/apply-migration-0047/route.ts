import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SQL = `
CREATE TABLE IF NOT EXISTS kol_trackers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'TikTok',
  tier            TEXT NOT NULL DEFAULT 'Micro',
  follower_count  INTEGER,
  brief_status    TEXT NOT NULL DEFAULT 'Pending',
  performance_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kol_trackers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kol_trackers' AND policyname='allow_all_kol_trackers') THEN
    CREATE POLICY "allow_all_kol_trackers" ON kol_trackers FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS kol_trackers_campaign_id_idx ON kol_trackers(campaign_id);
`;

export async function GET() {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("exec_sql", { sql: SQL });
  if (error) {
    // exec_sql may not exist — return SQL for manual run
    return NextResponse.json({
      ok: false,
      error: error.message,
      manual_sql: SQL,
    });
  }
  return NextResponse.json({ ok: true });
}
