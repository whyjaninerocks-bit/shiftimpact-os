-- Migration 0083: Compliance item PIC reassignment
--
-- Not every recommendation logged in report_recommendation_compliance is
-- actually the agency's to execute — some fall to the client's own internal
-- team (IT, ops, a specific department). Before this, "Not done" on such an
-- item looked like agency underperformance when it was really an ownership
-- mismatch. This adds a scope + assignee so the client can reassign an item
-- to the right person in charge (PIC) on their side, at which point that
-- person (via the same token-based portal, no separate login required at
-- this stage — see CLAUDE.md "no login wall in v1") becomes the one who
-- marks it done, using the same status flow the agency already uses.

alter table report_recommendation_compliance
  add column if not exists owner_scope text not null default 'agency'
    check (owner_scope in ('agency', 'client')),
  add column if not exists assigned_pic text,          -- name of the person now responsible (client side)
  add column if not exists reassigned_by text,          -- who made the reassignment call
  add column if not exists reassigned_at timestamptz;

comment on column report_recommendation_compliance.owner_scope is
  'Who currently owns completing this item: agency (default) or client (reassigned to an internal PIC).';
comment on column report_recommendation_compliance.assigned_pic is
  'Name of the person in charge when owner_scope = client. Free text, not a linked user — no per-user auth yet.';
