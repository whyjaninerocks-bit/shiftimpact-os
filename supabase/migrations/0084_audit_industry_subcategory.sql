-- Adds an optional sub-category to quick_audits so ambiguous top-level
-- industries (FMCG, Retail, E-commerce) can be classified against the real
-- category_attributes rows (e.g. FMCG -> Food & Beverage vs Personal Care;
-- Retail/E-commerce -> Electronics vs Fashion) instead of guessing.
--
-- Populated only when the audit intake form shows the sub-category picker
-- (see app/(os)/audit/page.tsx INDUSTRY_SUBCATEGORIES). Null for industries
-- that map to exactly one category_attributes row already.

alter table quick_audits
  add column if not exists industry_subcategory text;

comment on column quick_audits.industry_subcategory is
  'Optional sub-classification for ambiguous industry values (FMCG, Retail, E-commerce) used to resolve which category_attributes row drives the Signal Diagnostic. Null when the top-level industry already maps 1:1.';
