-- Sprint 31 — Email notifications: add email fields to team_members and clients

-- Team member email (used as the agency/strategist notification recipient)
alter table team_members
  add column if not exists email text;

-- Client contact details (used as the client-side notification recipient)
alter table clients
  add column if not exists contact_name text,
  add column if not exists contact_email text;
