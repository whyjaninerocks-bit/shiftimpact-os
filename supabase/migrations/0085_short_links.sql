-- General-purpose short-link table, extending the existing /s/[code] branded
-- short-link resolver (app/s/[code]/route.ts) beyond its original
-- quick_audits-only prefix-matching scheme.
--
-- Why a new table rather than reusing the quick_audits ID-prefix trick: that
-- scheme only works because the destination is fully derivable from the
-- audit row itself. A client-portal link needs to carry a plaintext access
-- token (see lib/portal/access-token.ts) — and by design only the token's
-- SHA-256 hash is ever stored (portal_access_tokens.token_hash), never the
-- plaintext. So the short link has to store the exact destination URL
-- (token included) at mint time, while the plaintext is still in hand.
create table if not exists short_links (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  destination_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

comment on table short_links is
  'Branded short-link mappings resolved by app/s/[code]/route.ts. code is checked first, before the legacy quick_audits ID-prefix fallback.';
