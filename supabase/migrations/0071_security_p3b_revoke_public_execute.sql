-- Migration 0071 — Security P3b: revoke PUBLIC execute on internal trigger functions
-- ShiftImpact OS
--
-- Follow-up to 0070. Postgres grants EXECUTE to the PUBLIC pseudo-role by
-- default at function creation time. Revoking EXECUTE from anon/authenticated
-- specifically (0070) did not close the gap, because both roles still
-- inherit whatever PUBLIC holds. Confirmed via get_advisors re-run after
-- 0070: anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable were still flagged for
-- all 4 functions. This migration revokes the underlying PUBLIC grant.

revoke execute on function public.pie_audit_trigger() from public;
revoke execute on function public.refresh_signal_freshness() from public;
revoke execute on function public.update_company_last_signal_date() from public;
revoke execute on function public.update_prospect_tier() from public;
