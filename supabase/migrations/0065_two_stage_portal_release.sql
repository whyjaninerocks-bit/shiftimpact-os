-- Migration 0065: two-stage portal release
-- Adds agency preview → client release workflow to campaign_reports.
-- Adds recipient_type to client_report_recipients so emails route correctly.
-- Adds client_type to clients so the OS knows brand vs agency.

-- campaign_reports: staged publish timestamps + agency note
ALTER TABLE campaign_reports
  ADD COLUMN IF NOT EXISTS agency_preview_at  timestamptz,
  ADD COLUMN IF NOT EXISTS client_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS agency_note        text;

-- client_report_recipients: type of viewer
ALTER TABLE client_report_recipients
  ADD COLUMN IF NOT EXISTS recipient_type text
    CHECK (recipient_type IN ('brand_contact', 'agency_partner', 'agency_client'))
    DEFAULT 'brand_contact';

-- clients: brand vs agency
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type text
    CHECK (client_type IN ('brand', 'agency'))
    DEFAULT 'brand';
