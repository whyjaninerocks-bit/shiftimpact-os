-- Migration 0058: Diagnostic Sessions — Commercial Entry Product
-- Sprint 11: commercial launch
--
-- A Diagnostic Session is ShiftImpact OS's entry product (RM5,000–8,000).
-- Janine runs the session, the OS generates the deliverable.
-- Status: Booked → In Progress → Delivered → Archived.

CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name         TEXT        NOT NULL,
  contact_name        TEXT,
  contact_email       TEXT,
  industry            TEXT        NOT NULL,
  budget_range        TEXT,
  current_channels    TEXT[]      NOT NULL DEFAULT '{}',
  pain_points         TEXT,
  current_tools       TEXT,
  engagement_fee_rm   NUMERIC,
  status              TEXT        NOT NULL DEFAULT 'Booked'
                        CHECK (status IN ('Booked', 'In Progress', 'Delivered', 'Archived')),
  -- Generated deliverable
  deliverable_text    TEXT,
  brief_json          JSONB       NOT NULL DEFAULT '{}',
  model_used          TEXT,
  -- Timing
  session_date        DATE,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diagnostic_sessions_status ON diagnostic_sessions (status, created_at DESC);

ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all_diagnostic_sessions ON diagnostic_sessions FOR ALL USING (true);

-- Verify
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name = 'diagnostic_sessions'
  ) = 1, 'diagnostic_sessions table missing';
END $$;
