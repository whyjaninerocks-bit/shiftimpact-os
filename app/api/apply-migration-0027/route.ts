// TEMPORARY — delete after running once
// Applies migration 0027: Growth Intelligence Layer (PIE) — 12 tables + triggers + RLS + os_settings

import { NextResponse } from "next/server";

const STATEMENTS: { label: string; sql: string }[] = [
  // ── Step 1: companies ─────────────────────────────────────────────────────
  {
    label: "CREATE TABLE companies",
    sql: `CREATE TABLE companies (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT         NOT NULL,
  industry                TEXT         NOT NULL,
  size_band               TEXT         CHECK (size_band IN ('SME','Mid-Market','Enterprise','Startup')),
  market_code             TEXT         NOT NULL DEFAULT 'MY'
                            CHECK (market_code IN ('MY','SG','PH','TH','ID','VN')),
  website                 TEXT,
  linkedin_url            TEXT,
  status                  TEXT         NOT NULL DEFAULT 'Watching'
                            CHECK (status IN ('Watching','Qualified','Active','Converted','Dismissed')),
  source_notes            TEXT         NOT NULL DEFAULT '',
  is_suppressed           BOOLEAN      NOT NULL DEFAULT false,
  business_model          TEXT         CHECK (business_model IN ('B2C','B2B','B2B2C','Marketplace','DTC','Other')),
  growth_stage            TEXT         CHECK (growth_stage IN ('Pre-Revenue','Early','Growth','Scale','Mature','Enterprise')),
  employee_band           TEXT         CHECK (employee_band IN ('<10','10-50','51-200','201-500','501-2000','2000+')),
  company_profile_summary TEXT         NOT NULL DEFAULT '',
  last_signal_date        TIMESTAMPTZ,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "TRIGGER companies_set_updated_at",
    sql: `CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  },
  {
    label: "INDEX companies_status_market",
    sql: `CREATE INDEX companies_status_market ON companies (status, market_code)`,
  },
  {
    label: "INDEX companies_suppressed",
    sql: `CREATE INDEX companies_suppressed ON companies (is_suppressed) WHERE is_suppressed = true`,
  },
  {
    label: "INDEX companies_last_signal",
    sql: `CREATE INDEX companies_last_signal ON companies (last_signal_date DESC NULLS LAST)`,
  },

  // ── Step 2: people ────────────────────────────────────────────────────────
  {
    label: "CREATE TABLE people",
    sql: `CREATE TABLE people (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                      TEXT         NOT NULL,
  role                      TEXT         NOT NULL
                              CHECK (role IN ('Founder','CEO','CMO','Marketing Lead','Other')),
  linkedin_url              TEXT,
  confidence_level          TEXT         NOT NULL DEFAULT 'Medium'
                              CHECK (confidence_level IN ('High','Medium','Directional')),
  last_verified_at          TIMESTAMPTZ,
  relationship_status       TEXT         NOT NULL DEFAULT 'Cold'
                              CHECK (relationship_status IN ('Cold','Warm','Connected','Introduced','Met','Active')),
  warm_intro_possible       BOOLEAN      NOT NULL DEFAULT false,
  warm_intro_via            TEXT,
  previous_interaction      TEXT         NOT NULL DEFAULT '',
  network_connection_status TEXT         NOT NULL DEFAULT 'None'
                              CHECK (network_connection_status IN ('1st','2nd','3rd','None')),
  is_suppressed             BOOLEAN      NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "TRIGGER people_set_updated_at",
    sql: `CREATE TRIGGER people_set_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  },
  {
    label: "INDEX people_company",
    sql: `CREATE INDEX people_company ON people (company_id)`,
  },
  {
    label: "INDEX people_relationship",
    sql: `CREATE INDEX people_relationship ON people (relationship_status, warm_intro_possible)`,
  },
  {
    label: "INDEX people_suppressed",
    sql: `CREATE INDEX people_suppressed ON people (is_suppressed) WHERE is_suppressed = true`,
  },

  // ── Step 3: business_signals ──────────────────────────────────────────────
  {
    label: "CREATE TABLE business_signals",
    sql: `CREATE TABLE business_signals (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  signal_category    TEXT         NOT NULL
                       CHECK (signal_category IN ('Growth','Recognition','Milestone','Activation','Leadership')),
  signal_type        TEXT         NOT NULL,
  signal_text        TEXT         NOT NULL,
  source_url         TEXT,
  detected_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  raw_evidence       JSONB        NOT NULL DEFAULT '{}',
  signal_fingerprint TEXT         NOT NULL UNIQUE,
  duplicate_of_id    UUID         REFERENCES business_signals(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "INDEX business_signals_company_date",
    sql: `CREATE INDEX business_signals_company_date ON business_signals (company_id, detected_at DESC)`,
  },
  {
    label: "INDEX business_signals_category",
    sql: `CREATE INDEX business_signals_category ON business_signals (signal_category, signal_type)`,
  },
  {
    label: "INDEX business_signals_duplicate",
    sql: `CREATE INDEX business_signals_duplicate ON business_signals (duplicate_of_id) WHERE duplicate_of_id IS NOT NULL`,
  },

  // ── Step 4: evidence_sources ──────────────────────────────────────────────
  {
    label: "CREATE TABLE evidence_sources",
    sql: `CREATE TABLE evidence_sources (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id           UUID         NOT NULL REFERENCES business_signals(id) ON DELETE CASCADE,
  source_type         TEXT         NOT NULL
                        CHECK (source_type IN ('news','linkedin','event','award','funding','website','manual')),
  url                 TEXT,
  headline            TEXT,
  published_at        TIMESTAMPTZ,
  content_excerpt     TEXT         NOT NULL DEFAULT '',
  fetched_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  source_confidence   TEXT         NOT NULL DEFAULT 'Medium'
                        CHECK (source_confidence IN ('High','Medium','Low')),
  verification_status TEXT         NOT NULL DEFAULT 'Unverified'
                        CHECK (verification_status IN ('Verified','Unverified','Disputed')),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "INDEX evidence_signal",
    sql: `CREATE INDEX evidence_signal ON evidence_sources (signal_id)`,
  },
  {
    label: "INDEX evidence_confidence",
    sql: `CREATE INDEX evidence_confidence ON evidence_sources (source_confidence, verification_status)`,
  },

  // ── Step 5: prospect_assessments ──────────────────────────────────────────
  {
    label: "CREATE TABLE prospect_assessments",
    sql: `CREATE TABLE prospect_assessments (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  business_moment_summary TEXT         NOT NULL DEFAULT '',
  shiftimpact_entry_point TEXT         NOT NULL DEFAULT '',
  recommended_approach    TEXT         NOT NULL DEFAULT '',
  recommended_offer       TEXT         NOT NULL
                            CHECK (recommended_offer IN (
                              'Founder Growth Diagnostic',
                              'Marketing Decision Snapshot',
                              'Brand Clarity Audit',
                              'ESG Storytelling Diagnostic',
                              'Launch Readiness Audit',
                              'Command Desk'
                            )),
  offer_rationale         TEXT         NOT NULL DEFAULT '',
  status                  TEXT         NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','ready','dismissed')),
  generated_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "INDEX prospect_assessments_company",
    sql: `CREATE INDEX prospect_assessments_company ON prospect_assessments (company_id, status)`,
  },
  {
    label: "INDEX prospect_assessments_offer",
    sql: `CREATE INDEX prospect_assessments_offer ON prospect_assessments (recommended_offer)`,
  },

  // ── Step 6: assessment_signals ────────────────────────────────────────────
  {
    label: "CREATE TABLE assessment_signals",
    sql: `CREATE TABLE assessment_signals (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID          NOT NULL REFERENCES prospect_assessments(id) ON DELETE CASCADE,
  signal_id     UUID          NOT NULL REFERENCES business_signals(id) ON DELETE CASCADE,
  signal_weight NUMERIC(3,2)  NOT NULL DEFAULT 1.00
                  CHECK (signal_weight BETWEEN 0.00 AND 1.00),
  signal_role   TEXT          NOT NULL DEFAULT 'primary'
                  CHECK (signal_role IN ('primary','supporting','contextual')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, signal_id)
)`,
  },
  {
    label: "INDEX assessment_signals_assessment",
    sql: `CREATE INDEX assessment_signals_assessment ON assessment_signals (assessment_id)`,
  },
  {
    label: "INDEX assessment_signals_signal",
    sql: `CREATE INDEX assessment_signals_signal ON assessment_signals (signal_id)`,
  },
  {
    label: "INDEX assessment_signals_weight",
    sql: `CREATE INDEX assessment_signals_weight ON assessment_signals (signal_weight DESC)`,
  },

  // ── Step 7: prospect_scores ───────────────────────────────────────────────
  {
    label: "CREATE TABLE prospect_scores",
    sql: `CREATE TABLE prospect_scores (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id         UUID         NOT NULL REFERENCES prospect_assessments(id) ON DELETE CASCADE,
  opportunity_score     INTEGER      NOT NULL CHECK (opportunity_score BETWEEN 0 AND 100),
  pursuit_score         INTEGER      NOT NULL CHECK (pursuit_score BETWEEN 0 AND 100),
  opportunity_rationale TEXT         NOT NULL DEFAULT '',
  pursuit_rationale     TEXT         NOT NULL DEFAULT '',
  surfaced_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "INDEX prospect_scores_assessment",
    sql: `CREATE INDEX prospect_scores_assessment ON prospect_scores (assessment_id)`,
  },
  {
    label: "INDEX prospect_scores_pursuit",
    sql: `CREATE INDEX prospect_scores_pursuit ON prospect_scores (pursuit_score DESC)`,
  },

  // ── Step 8: outreach ──────────────────────────────────────────────────────
  {
    label: "CREATE TABLE outreach",
    sql: `CREATE TABLE outreach (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id      UUID         NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  assessment_id  UUID         REFERENCES prospect_assessments(id) ON DELETE SET NULL,
  channel        TEXT         NOT NULL
                   CHECK (channel IN ('LinkedIn DM','Email','Introduction','Event')),
  message_draft  TEXT         NOT NULL DEFAULT '',
  message_sent   TEXT,
  status         TEXT         NOT NULL DEFAULT 'Drafted'
                   CHECK (status IN ('Drafted','Approved','Sent','Replied','Meeting Booked','No Reply')),
  drafted_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  approved_at    TIMESTAMPTZ,
  sent_at        TIMESTAMPTZ,
  replied_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "TRIGGER outreach_set_updated_at",
    sql: `CREATE TRIGGER outreach_set_updated_at
  BEFORE UPDATE ON outreach
  FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  },
  {
    label: "INDEX outreach_person_status",
    sql: `CREATE INDEX outreach_person_status ON outreach (person_id, status)`,
  },
  {
    label: "INDEX outreach_assessment",
    sql: `CREATE INDEX outreach_assessment ON outreach (assessment_id)`,
  },

  // ── Step 9: outcomes ──────────────────────────────────────────────────────
  {
    label: "CREATE TABLE outcomes",
    sql: `CREATE TABLE outcomes (
  id                              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                      UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assessment_id                   UUID         REFERENCES prospect_assessments(id) ON DELETE SET NULL,
  status                          TEXT         NOT NULL DEFAULT 'Active'
                                    CHECK (status IN ('Proposal Sent','Engaged','Contract Signed','Lost','Deferred')),
  lost_reason                     TEXT,
  conversion_source               TEXT
                                    CHECK (conversion_source IN (
                                      'Prospect Intelligence','Referral','Inbound','Event','Other'
                                    )),
  trigger_signal_id               UUID         REFERENCES business_signals(id) ON DELETE SET NULL,
  opportunity_score_at_conversion INTEGER      CHECK (opportunity_score_at_conversion BETWEEN 0 AND 100),
  pursuit_score_at_conversion     INTEGER      CHECK (pursuit_score_at_conversion BETWEEN 0 AND 100),
  recommended_offer_at_conversion TEXT,
  converted_client_id             UUID         REFERENCES clients(id) ON DELETE SET NULL,
  proposal_sent_at                TIMESTAMPTZ,
  notes                           TEXT         NOT NULL DEFAULT '',
  created_at                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "TRIGGER outcomes_set_updated_at",
    sql: `CREATE TRIGGER outcomes_set_updated_at
  BEFORE UPDATE ON outcomes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  },
  {
    label: "INDEX outcomes_company_status",
    sql: `CREATE INDEX outcomes_company_status ON outcomes (company_id, status)`,
  },
  {
    label: "INDEX outcomes_conversion_source",
    sql: `CREATE INDEX outcomes_conversion_source ON outcomes (conversion_source)`,
  },
  {
    label: "INDEX outcomes_trigger_signal",
    sql: `CREATE INDEX outcomes_trigger_signal ON outcomes (trigger_signal_id)`,
  },
  {
    label: "INDEX outcomes_converted_client",
    sql: `CREATE INDEX outcomes_converted_client ON outcomes (converted_client_id) WHERE converted_client_id IS NOT NULL`,
  },

  // ── Step 10: ai_processing_queue ──────────────────────────────────────────
  {
    label: "CREATE TABLE ai_processing_queue",
    sql: `CREATE TABLE ai_processing_queue (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type     TEXT          NOT NULL
                   CHECK (queue_type IN (
                     'prospect_assess','prospect_score','prospect_diagnostic',
                     'outreach_draft','opportunity_scan','opportunity_score','company_profile'
                   )),
  priority       INTEGER       NOT NULL DEFAULT 2
                   CHECK (priority IN (1,2,3)),
  status         TEXT          NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','complete','failed','cancelled')),
  company_id     UUID          REFERENCES companies(id) ON DELETE CASCADE,
  input_payload  JSONB         NOT NULL DEFAULT '{}',
  output_payload JSONB,
  model_tier     TEXT          NOT NULL DEFAULT 'haiku'
                   CHECK (model_tier IN ('haiku','sonnet')),
  model_used     TEXT,
  tokens_used    INTEGER,
  estimated_cost NUMERIC(10,6),
  attempt_count  INTEGER       NOT NULL DEFAULT 0,
  max_attempts   INTEGER       NOT NULL DEFAULT 3,
  error_log      JSONB         NOT NULL DEFAULT '[]',
  scheduled_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
)`,
  },
  {
    label: "TRIGGER ai_queue_set_updated_at",
    sql: `CREATE TRIGGER ai_queue_set_updated_at
  BEFORE UPDATE ON ai_processing_queue
  FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  },
  {
    label: "INDEX ai_queue_worker",
    sql: `CREATE INDEX ai_queue_worker ON ai_processing_queue (status, priority, scheduled_at) WHERE status IN ('pending','processing')`,
  },
  {
    label: "INDEX ai_queue_company",
    sql: `CREATE INDEX ai_queue_company ON ai_processing_queue (company_id, status)`,
  },
  {
    label: "INDEX ai_queue_type",
    sql: `CREATE INDEX ai_queue_type ON ai_processing_queue (queue_type, status)`,
  },

  // ── Step 11a: prospect_audit_log ──────────────────────────────────────────
  {
    label: "CREATE TABLE prospect_audit_log",
    sql: `CREATE TABLE prospect_audit_log (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name     TEXT         NOT NULL,
  record_id      UUID         NOT NULL,
  action         TEXT         NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by     TEXT         NOT NULL DEFAULT 'system',
  changed_fields JSONB,
  old_values     JSONB,
  new_values     JSONB,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
)`,
  },
  {
    label: "INDEX audit_table_record",
    sql: `CREATE INDEX audit_table_record ON prospect_audit_log (table_name, record_id, created_at DESC)`,
  },
  {
    label: "INDEX audit_created",
    sql: `CREATE INDEX audit_created ON prospect_audit_log (created_at DESC)`,
  },

  // ── Step 11b: pie_audit_trigger function ──────────────────────────────────
  {
    label: "FUNCTION pie_audit_trigger",
    sql: `CREATE OR REPLACE FUNCTION pie_audit_trigger()
RETURNS trigger AS $$
DECLARE
  _old_json  jsonb := NULL;
  _new_json  jsonb := NULL;
  _changed   jsonb := NULL;
  _record_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _old_json  := to_jsonb(OLD);
    _record_id := (OLD).id;
  ELSIF TG_OP = 'INSERT' THEN
    _new_json  := to_jsonb(NEW);
    _record_id := (NEW).id;
  ELSE
    _old_json  := to_jsonb(OLD);
    _new_json  := to_jsonb(NEW);
    _record_id := (NEW).id;
    SELECT jsonb_agg(n.key)
    INTO   _changed
    FROM   jsonb_each(_new_json) AS n(key, val)
    WHERE  _new_json -> n.key IS DISTINCT FROM _old_json -> n.key;
  END IF;
  INSERT INTO prospect_audit_log
    (table_name, record_id, action, changed_fields, old_values, new_values)
  VALUES
    (TG_TABLE_NAME, _record_id, TG_OP, _changed, _old_json, _new_json);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,
  },

  // ── Step 11c: audit triggers on all 10 operational tables ─────────────────
  {
    label: "TRIGGER companies_audit",
    sql: `CREATE TRIGGER companies_audit AFTER INSERT OR UPDATE OR DELETE ON companies FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER people_audit",
    sql: `CREATE TRIGGER people_audit AFTER INSERT OR UPDATE OR DELETE ON people FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER business_signals_audit",
    sql: `CREATE TRIGGER business_signals_audit AFTER INSERT OR UPDATE OR DELETE ON business_signals FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER evidence_sources_audit",
    sql: `CREATE TRIGGER evidence_sources_audit AFTER INSERT OR UPDATE OR DELETE ON evidence_sources FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER prospect_assessments_audit",
    sql: `CREATE TRIGGER prospect_assessments_audit AFTER INSERT OR UPDATE OR DELETE ON prospect_assessments FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER assessment_signals_audit",
    sql: `CREATE TRIGGER assessment_signals_audit AFTER INSERT OR UPDATE OR DELETE ON assessment_signals FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER prospect_scores_audit",
    sql: `CREATE TRIGGER prospect_scores_audit AFTER INSERT OR UPDATE OR DELETE ON prospect_scores FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER outreach_audit",
    sql: `CREATE TRIGGER outreach_audit AFTER INSERT OR UPDATE OR DELETE ON outreach FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER outcomes_audit",
    sql: `CREATE TRIGGER outcomes_audit AFTER INSERT OR UPDATE OR DELETE ON outcomes FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },
  {
    label: "TRIGGER ai_queue_audit",
    sql: `CREATE TRIGGER ai_queue_audit AFTER INSERT OR UPDATE OR DELETE ON ai_processing_queue FOR EACH ROW EXECUTE FUNCTION pie_audit_trigger()`,
  },

  // ── Step 12: prospect_suppression_list ────────────────────────────────────
  {
    label: "CREATE TABLE prospect_suppression_list",
    sql: `CREATE TABLE prospect_suppression_list (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  suppression_type TEXT         NOT NULL CHECK (suppression_type IN ('company','person','domain')),
  company_id       UUID         REFERENCES companies(id) ON DELETE CASCADE,
  person_id        UUID         REFERENCES people(id) ON DELETE CASCADE,
  domain           TEXT,
  reason           TEXT         NOT NULL,
  suppressed_by    TEXT         NOT NULL DEFAULT 'system',
  suppressed_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ,
  CONSTRAINT suppression_target_check CHECK (
    (suppression_type = 'company' AND company_id IS NOT NULL AND person_id IS NULL AND domain IS NULL) OR
    (suppression_type = 'person'  AND person_id  IS NOT NULL AND company_id IS NULL AND domain IS NULL) OR
    (suppression_type = 'domain'  AND domain      IS NOT NULL AND company_id IS NULL AND person_id IS NULL)
  )
)`,
  },
  {
    label: "INDEX suppression_company",
    sql: `CREATE INDEX suppression_company ON prospect_suppression_list (company_id) WHERE company_id IS NOT NULL`,
  },
  {
    label: "INDEX suppression_person",
    sql: `CREATE INDEX suppression_person ON prospect_suppression_list (person_id) WHERE person_id IS NOT NULL`,
  },
  {
    label: "INDEX suppression_domain",
    sql: `CREATE INDEX suppression_domain ON prospect_suppression_list (domain) WHERE domain IS NOT NULL`,
  },
  {
    label: "INDEX suppression_expires",
    sql: `CREATE INDEX suppression_expires ON prospect_suppression_list (expires_at) WHERE expires_at IS NOT NULL`,
  },

  // ── Step 13: RLS — all 12 tables ─────────────────────────────────────────
  { label: "RLS companies",                 sql: `ALTER TABLE companies                 ENABLE ROW LEVEL SECURITY` },
  { label: "RLS people",                    sql: `ALTER TABLE people                    ENABLE ROW LEVEL SECURITY` },
  { label: "RLS business_signals",          sql: `ALTER TABLE business_signals          ENABLE ROW LEVEL SECURITY` },
  { label: "RLS evidence_sources",          sql: `ALTER TABLE evidence_sources          ENABLE ROW LEVEL SECURITY` },
  { label: "RLS prospect_assessments",      sql: `ALTER TABLE prospect_assessments      ENABLE ROW LEVEL SECURITY` },
  { label: "RLS assessment_signals",        sql: `ALTER TABLE assessment_signals        ENABLE ROW LEVEL SECURITY` },
  { label: "RLS prospect_scores",           sql: `ALTER TABLE prospect_scores           ENABLE ROW LEVEL SECURITY` },
  { label: "RLS outreach",                  sql: `ALTER TABLE outreach                  ENABLE ROW LEVEL SECURITY` },
  { label: "RLS outcomes",                  sql: `ALTER TABLE outcomes                  ENABLE ROW LEVEL SECURITY` },
  { label: "RLS ai_processing_queue",       sql: `ALTER TABLE ai_processing_queue       ENABLE ROW LEVEL SECURITY` },
  { label: "RLS prospect_audit_log",        sql: `ALTER TABLE prospect_audit_log        ENABLE ROW LEVEL SECURITY` },
  { label: "RLS prospect_suppression_list", sql: `ALTER TABLE prospect_suppression_list ENABLE ROW LEVEL SECURITY` },

  { label: "POLICY deny public companies",             sql: `CREATE POLICY "pie_companies_deny_public"   ON companies                 FOR ALL TO public USING (false)` },
  { label: "POLICY deny public people",                sql: `CREATE POLICY "pie_people_deny_public"       ON people                    FOR ALL TO public USING (false)` },
  { label: "POLICY deny public business_signals",      sql: `CREATE POLICY "pie_signals_deny_public"      ON business_signals          FOR ALL TO public USING (false)` },
  { label: "POLICY deny public evidence_sources",      sql: `CREATE POLICY "pie_evidence_deny_public"     ON evidence_sources          FOR ALL TO public USING (false)` },
  { label: "POLICY deny public prospect_assessments",  sql: `CREATE POLICY "pie_assessments_deny_public"  ON prospect_assessments      FOR ALL TO public USING (false)` },
  { label: "POLICY deny public assessment_signals",    sql: `CREATE POLICY "pie_asmt_sig_deny_public"     ON assessment_signals        FOR ALL TO public USING (false)` },
  { label: "POLICY deny public prospect_scores",       sql: `CREATE POLICY "pie_scores_deny_public"       ON prospect_scores           FOR ALL TO public USING (false)` },
  { label: "POLICY deny public outreach",              sql: `CREATE POLICY "pie_outreach_deny_public"     ON outreach                  FOR ALL TO public USING (false)` },
  { label: "POLICY deny public outcomes",              sql: `CREATE POLICY "pie_outcomes_deny_public"     ON outcomes                  FOR ALL TO public USING (false)` },
  { label: "POLICY deny public ai_processing_queue",   sql: `CREATE POLICY "pie_queue_deny_public"        ON ai_processing_queue       FOR ALL TO public USING (false)` },
  { label: "POLICY deny public prospect_audit_log",    sql: `CREATE POLICY "pie_audit_deny_public"        ON prospect_audit_log        FOR ALL TO public USING (false)` },
  { label: "POLICY deny public suppression_list",      sql: `CREATE POLICY "pie_suppression_deny_public"  ON prospect_suppression_list FOR ALL TO public USING (false)` },

  // ── Step 14: os_settings (10 new PIE rows) ────────────────────────────────
  {
    label: "os_settings PIE rows",
    sql: `INSERT INTO os_settings (key, value, label, description) VALUES
  ('model_prospect_scan',          'claude-haiku-4-5-20251001', 'PIE: Signal Detection',         'Fast Apify signal sweep and company profile generation'),
  ('model_prospect_assess',        'claude-sonnet-4-6',          'PIE: Business Assessment',      'Business moment interpretation and offer mapping'),
  ('model_prospect_score',         'claude-sonnet-4-6',          'PIE: Prospect Scoring',         'Two-score generation with rationale (Opportunity + Pursuit)'),
  ('model_prospect_diagnostic',    'claude-sonnet-4-6',          'PIE: Diagnostic Snapshot',      'Prospect campaign intelligence preview generation'),
  ('model_outreach_draft',         'claude-sonnet-4-6',          'PIE: Outreach Draft',           'Voice-matched outreach draft — requires human approval before send'),
  ('model_suppression_check',      'claude-haiku-4-5-20251001', 'PIE: Suppression Check',        'Fast suppression list match before outreach draft fires'),
  ('pie_sonnet_pursuit_threshold', '60',                          'PIE: Sonnet Pursuit Threshold', 'Trigger Sonnet when Haiku rough score >= this value (0-100)'),
  ('pie_sonnet_evidence_min',      '3',                           'PIE: Sonnet Evidence Minimum',  'Trigger Sonnet when verified evidence sources >= this count'),
  ('pie_sonnet_signal_categories', 'Leadership,Growth',           'PIE: Sonnet Signal Categories', 'CSV of signal categories that always trigger Sonnet routing'),
  ('pie_haiku_batch_limit',        '20',                          'PIE: Haiku Batch Limit',        'Max Haiku jobs per queue worker invocation (rate limit guard)')
ON CONFLICT (key) DO NOTHING`,
  },

  // ── Step 15: update_company_last_signal_date trigger ──────────────────────
  {
    label: "FUNCTION update_company_last_signal_date",
    sql: `CREATE OR REPLACE FUNCTION update_company_last_signal_date()
RETURNS trigger AS $$
BEGIN
  UPDATE companies
  SET last_signal_date = now()
  WHERE id = NEW.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,
  },
  {
    label: "TRIGGER business_signals_update_last_date",
    sql: `CREATE TRIGGER business_signals_update_last_date
  AFTER INSERT ON business_signals
  FOR EACH ROW EXECUTE FUNCTION update_company_last_signal_date()`,
  },
];

async function execSql(
  url: string,
  key: string,
  sql: string
): Promise<{ ok: boolean; body: string }> {
  // Try exec_sql first
  const r1 = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql }),
  });
  if (r1.ok) return { ok: true, body: await r1.text() };

  // Fallback: pg_query
  const r2 = await fetch(`${url}/rest/v1/rpc/pg_query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await r2.text();
  return { ok: r2.ok, body };
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const results: { label: string; status: string; error?: string }[] = [];
  let errors = 0;

  for (const { label, sql } of STATEMENTS) {
    const { ok, body } = await execSql(url, key, sql);
    if (ok) {
      results.push({ label, status: "ok" });
    } else {
      // Treat "already exists" as a non-fatal skip
      const alreadyExists =
        body.includes("already exists") ||
        body.includes("duplicate") ||
        body.includes("42P07") ||   // duplicate_table
        body.includes("42710");     // duplicate_object (trigger/index)
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
      migration: "0027_growth_intelligence_layer",
      total: STATEMENTS.length,
      ok: STATEMENTS.length - errors,
      errors,
      results,
    },
    { status: errors === 0 ? 200 : 207 }
  );
}
