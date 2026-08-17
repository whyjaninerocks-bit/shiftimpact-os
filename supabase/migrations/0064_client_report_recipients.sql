-- Migration 0064: client_report_recipients
-- Stores additional email recipients for weekly report portal notifications.
-- The primary contact_email on clients is always included; this table holds extras.

CREATE TABLE IF NOT EXISTS client_report_recipients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        text,
  email       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_report_recipients_client
  ON client_report_recipients(client_id);
