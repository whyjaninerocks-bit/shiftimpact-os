-- External Reviewers card v0.1.
--
-- Two additions, both required for the card's "add reviewer by existing
-- Supabase Auth email" flow and its duplicate-prevention requirement:
--
-- 1. A partial unique index on org_access_grants. The table had no unique
--    constraint at all before this — the firewall spike fixture testing
--    this session produced duplicate grant rows twice from repeated form
--    submissions, both times needing manual cleanup. Partial (WHERE
--    grantee_user_id IS NOT NULL) because grantee_user_id stays nullable
--    for a possible future invite-by-unregistered-email flow, which this
--    build does not implement — a null-user row should never collide with
--    another null-user row under this index.
--
-- 2. A narrow, security definer lookup function. The app's Next.js code
--    only ever talks to Postgres through the admin (service role) client
--    via PostgREST, which does not expose the auth schema — there is no
--    existing precedent in this codebase for querying auth.users from
--    application code, and user_profiles does not mirror email. Rather
--    than add a broad auth.users read path, this function returns only an
--    id (or null) for a given email, nothing else, and is not granted to
--    anon/authenticated — callable only via the service role, i.e. only
--    from server-side code that already has full database access anyway.
--    This lets "does an auth user exist for this email" be answered
--    without ever exposing auth.users column data to the app layer.

create unique index if not exists org_access_grants_grantee_resource_unique
  on org_access_grants (grantee_user_id, resource_type, resource_id)
  where grantee_user_id is not null;

create or replace function public.lookup_auth_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;

revoke all on function public.lookup_auth_user_id_by_email(text) from public;
grant execute on function public.lookup_auth_user_id_by_email(text) to service_role;
