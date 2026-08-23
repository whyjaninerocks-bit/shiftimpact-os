-- Migration 0072 — Security Hardening Phase 1: portal access tokens
-- ShiftImpact OS
--
-- The client portal (/portal/[campaignId]) and its two API routes
-- (portal-chat, portal-notify) currently have no access control beyond
-- knowledge of the campaign UUID in the URL. This table backs a signed,
-- expiring, revocable token minted whenever a report is published to the
-- portal, released to the client, or previewed to the agency. Only the
-- SHA-256 hash of the token is ever stored — see lib/portal/access-token.ts.
--
-- Table is written/read exclusively via createAdminClient() (service role),
-- same access model as the rest of the portal data path, so RLS is enabled
-- with no permissive policies (deny-by-default for anon/authenticated —
-- consistent with security_p0/p1/p2/p3 lockdown precedent).

create table if not exists public.portal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_access_tokens_campaign
  on public.portal_access_tokens(campaign_id);

create unique index if not exists idx_portal_access_tokens_hash
  on public.portal_access_tokens(token_hash);

alter table public.portal_access_tokens enable row level security;

-- No policies created — deny-by-default for anon/authenticated.
-- All reads/writes go through createAdminClient() (service role, bypasses RLS).
revoke all on public.portal_access_tokens from anon, authenticated;
