-- Adds request_snapshot: the exact original /api/audit-analyze POST body
-- (brand_name, campaign_name, industry, industry_subcategory, country,
-- campaign_phases, business_objectives, channels, budget_range, the FULL
-- context_text, read_mode). Existing columns only ever stored a 500-char
-- context_summary and no country/budget/read_mode at all, so a prior audit
-- could not be reloaded into the intake form. This lets /audit support a
-- "Rerun this audit" flow that pre-fills the whole form from a past run
-- without re-typing or re-fetching everything. Nullable + backfill-free —
-- existing rows simply have no snapshot and are not rerun-able, which is
-- fine since they still render exactly as before.
alter table quick_audits
  add column if not exists request_snapshot jsonb;

comment on column quick_audits.request_snapshot is
  'Full original POST body to /api/audit-analyze for this run — used to pre-fill the /audit intake form on rerun. Null for audits generated before this column existed.';
