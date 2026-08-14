// TEMPORARY — delete after running once
// Applies migration 0040: B2B track + opportunity windows + partner workspaces

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STATEMENTS: { label: string; sql: string }[] = [
  {
    label: "ALTER business_signals ADD engagement_model",
    sql: `ALTER TABLE business_signals ADD COLUMN IF NOT EXISTS engagement_model TEXT NOT NULL DEFAULT 'B2C' CHECK (engagement_model IN ('B2C', 'B2B', 'B2B2C'))`,
  },
  {
    label: "ALTER prospect_insights ADD engagement_model",
    sql: `ALTER TABLE prospect_insights ADD COLUMN IF NOT EXISTS engagement_model TEXT NOT NULL DEFAULT 'B2C' CHECK (engagement_model IN ('B2C', 'B2B', 'B2B2C'))`,
  },
  {
    label: "ALTER prospect_insights ADD converted_to_prospect_id",
    sql: `ALTER TABLE prospect_insights ADD COLUMN IF NOT EXISTS converted_to_prospect_id UUID REFERENCES companies(id) ON DELETE SET NULL`,
  },
  {
    label: "CREATE TABLE opportunity_windows",
    sql: `CREATE TABLE IF NOT EXISTS opportunity_windows (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  window_type      TEXT        NOT NULL CHECK (window_type IN ('fiscal_cycle','conference_calendar','renewal_season','funding_event','leadership_change','rfp_cycle','campaign_season','product_launch')),
  engagement_model TEXT        NOT NULL DEFAULT 'B2C' CHECK (engagement_model IN ('B2C','B2B','B2B2C')),
  label            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  signal_hint      TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    label: "INDEX opportunity_windows_model",
    sql: `CREATE INDEX IF NOT EXISTS opportunity_windows_model ON opportunity_windows (engagement_model, window_type)`,
  },
  {
    label: "SEED opportunity_windows B2C",
    sql: `INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint)
SELECT * FROM (VALUES
  ('campaign_season','B2C','Campaign Season','High-intensity campaign period aligned to festive or promotional calendar.','Multiple new campaigns launched within 60 days'),
  ('product_launch','B2C','Product Launch Window','New SKU or brand extension entering market.','Product-launch signal detected in news or LinkedIn'),
  ('fiscal_cycle','B2C','Fiscal Year Planning','Q4 or pre-FY planning period. Budgets reset and agencies are under review.','No campaign activity in 45+ days with Q4 timing'),
  ('conference_calendar','B2C','Industry Conference','Major FMCG or marketing conference creates natural window for introductions.','Award, event, or speaker signal detected in evidence')
) AS v(window_type,engagement_model,label,description,signal_hint)
WHERE NOT EXISTS (SELECT 1 FROM opportunity_windows WHERE engagement_model = 'B2C' LIMIT 1)`,
  },
  {
    label: "SEED opportunity_windows B2B",
    sql: `INSERT INTO opportunity_windows (window_type, engagement_model, label, description, signal_hint)
SELECT * FROM (VALUES
  ('fiscal_cycle','B2B','Fiscal Year Budget Cycle','B2B buyers lock budgets 60 to 90 days before FY start.','Q3 or Q4 hiring in finance, procurement, or operations'),
  ('conference_calendar','B2B','Industry Conference Window','Key sector conference 4 to 8 weeks out.','Speaker, sponsorship, or event-attendance announcement'),
  ('renewal_season','B2B','Contract Renewal Window','Switching cost lowest in 90 days before renewal.','LinkedIn post about vendor frustration or RFP signal'),
  ('funding_event','B2B','Post-Funding Expansion','Series A, B, or C opens 30 to 90 day window.','Funding announcement in news or LinkedIn'),
  ('leadership_change','B2B','New Leadership Entry','New CMO, VP Marketing, or CEO in role 0 to 90 days.','Leadership hire or promotion signal detected'),
  ('rfp_cycle','B2B','RFP or Agency Review','Brand is actively evaluating alternatives.','Hiring for agency coordinator or marketing ops role')
) AS v(window_type,engagement_model,label,description,signal_hint)
WHERE NOT EXISTS (SELECT 1 FROM opportunity_windows WHERE engagement_model = 'B2B' LIMIT 1)`,
  },
  {
    label: "CREATE TABLE partner_workspaces",
    sql: `CREATE TABLE IF NOT EXISTS partner_workspaces (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name   TEXT        NOT NULL,
  partner_slug   TEXT        NOT NULL UNIQUE,
  description    TEXT,
  direction      TEXT        NOT NULL CHECK (direction IN ('referral_out_only','referral_in_only','both_ways')),
  contact_name   TEXT,
  contact_email  TEXT,
  notes          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
)`,
  },
  {
    label: "FUNCTION update_partner_workspaces_updated_at",
    sql: `CREATE OR REPLACE FUNCTION update_partner_workspaces_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$`,
  },
  {
    label: "TRIGGER trg_partner_workspaces_updated_at",
    sql: `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_partner_workspaces_updated_at') THEN
    CREATE TRIGGER trg_partner_workspaces_updated_at
      BEFORE UPDATE ON partner_workspaces
      FOR EACH ROW EXECUTE FUNCTION update_partner_workspaces_updated_at();
  END IF;
END $$`,
  },
  {
    label: "SEED partner_workspaces AOAI",
    sql: `INSERT INTO partner_workspaces (partner_name, partner_slug, description, direction, notes)
SELECT 'AOAI', 'aoai',
  'Association of Organisational Administrators of Influence — training and certification body for social media and content practitioners.',
  'referral_out_only',
  'Janine refers suitable prospects to AOAI training programmes. No inbound referrals from AOAI. Do not position as a client.'
WHERE NOT EXISTS (SELECT 1 FROM partner_workspaces WHERE partner_slug = 'aoai')`,
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
  const body = await r.text();
  return { ok: r.ok, body };
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createAdminClient();

  // Check if already applied
  const { error: checkError } = await supabase
    .from("partner_workspaces")
    .select("id")
    .limit(1);

  if (!checkError) {
    // Table exists — check engagement_model too
    const { data: bsCheck } = await supabase
      .from("business_signals")
      .select("engagement_model")
      .limit(1);
    if (bsCheck !== null) {
      return NextResponse.json({ status: "migration 0040 already applied — skipped" });
    }
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
        body.includes("42710") ||
        body.includes("42701"); // column already exists
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
      migration: "0040_b2b_track_and_partner_workspaces",
      total: STATEMENTS.length,
      ok: STATEMENTS.length - errors,
      errors,
      results,
    },
    { status: errors === 0 ? 200 : 207 }
  );
}
