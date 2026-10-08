-- 0107_api_rate_limits.sql
-- Security remediation step 3 (8 Oct 2026). Fixed-window rate limit counter
-- for public routes. Service-role only; anon/authenticated have no access.

create table if not exists public.api_rate_limits (
  route        text        not null,
  caller_key   text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (route, caller_key, window_start)
);

alter table public.api_rate_limits enable row level security;
create policy api_rate_limits_deny_public on public.api_rate_limits
  for all to public using (false) with check (false);

create or replace function public.api_rate_limit_hit(
  p_route text, p_key text, p_window_seconds integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.api_rate_limits (route, caller_key, window_start, hits)
  values (p_route, p_key, w, 1)
  on conflict (route, caller_key, window_start)
  do update set hits = api_rate_limits.hits + 1
  returning hits into n;

  -- opportunistic cleanup of windows older than a day
  delete from public.api_rate_limits where window_start < now() - interval '1 day';
  return n;
end $$;

revoke all on function public.api_rate_limit_hit(text, text, integer) from public, anon, authenticated;
grant execute on function public.api_rate_limit_hit(text, text, integer) to service_role;
