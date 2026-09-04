-- 0079_add_missing_contact_email_columns.sql
-- Found during type-error cleanup (4 Sept 2026): createClient/updateClient and
-- createTeamMember/updateTeamMember in lib/actions.ts, plus the "Brief notification
-- recipient" form on the client settings page and the "Notification email" field on
-- the team page, have all been writing contact_name/contact_email (clients) and
-- email (team_members) since they were built — but neither column ever existed on
-- these tables. Every client or team member create/update through the UI has almost
-- certainly been failing with a Postgres undefined_column error since this shipped.
-- This migration just adds the missing columns; it does not change any app logic.
-- Applied directly via Supabase MCP on 4 Sept 2026; this file mirrors that applied
-- state for repo/migration-history parity.

alter table clients
  add column if not exists contact_name text,
  add column if not exists contact_email text;

alter table team_members
  add column if not exists email text;

comment on column clients.contact_name is 'Brief notification recipient — client-side contact name. Added retroactively; code referencing this column predates the column existing.';
comment on column clients.contact_email is 'Brief notification recipient — client-side contact email. Added retroactively; code referencing this column predates the column existing.';
comment on column team_members.email is 'Notification email for this team member. Added retroactively; code referencing this column predates the column existing.';
