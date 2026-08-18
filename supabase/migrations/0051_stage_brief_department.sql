-- 0051: add department tag to stage_briefs
-- Used to group/filter briefs by execution department (Radio, KOL, Retail, Digital, PR)

alter table stage_briefs
  add column if not exists department text;
