-- Firewall prototype: org_access_grants.access_level only allowed
-- ('view','comment','edit'). The approved spike plan and the RLS policies
-- in 0093 (ccsa_insert, ccsa_update) both key off a new
-- 'view_plus_assessment' access level, which could never actually be
-- stored under the old constraint. Extending the allowed set rather than
-- overloading 'edit', which may carry a different, broader meaning
-- elsewhere later. Table had 0 rows when this was written, so this is a
-- safe, additive change with nothing to backfill.

alter table org_access_grants drop constraint org_access_grants_access_level_check;

alter table org_access_grants add constraint org_access_grants_access_level_check
  check (access_level = ANY (ARRAY['view'::text, 'comment'::text, 'edit'::text, 'view_plus_assessment'::text]));
