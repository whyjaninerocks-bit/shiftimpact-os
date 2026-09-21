-- Migration 0095 tried to restrict lookup_auth_user_id_by_email() to
-- service_role via `revoke all ... from public` + `grant execute ... to
-- service_role`. That didn't work: Supabase projects have default
-- privileges on the public schema that auto-grant EXECUTE on newly
-- created functions to anon and authenticated, and revoking from the
-- PUBLIC pseudo-role does not revoke a role's own direct/default-privilege
-- grant. Verified via information_schema.routine_privileges that anon and
-- authenticated both still had EXECUTE.
--
-- This function is security definer and, given any email, returns whether
-- a Supabase Auth account exists for it and that account's raw user id —
-- exactly the kind of thing that must never be callable with just the
-- public anon key or by any logged-in user (including an external
-- Partner/Client reviewer). Explicitly revoking from anon and authenticated
-- (not just PUBLIC) is required to actually close this off.

revoke execute on function public.lookup_auth_user_id_by_email(text) from anon;
revoke execute on function public.lookup_auth_user_id_by_email(text) from authenticated;
revoke execute on function public.lookup_auth_user_id_by_email(text) from public;

grant execute on function public.lookup_auth_user_id_by_email(text) to service_role;
