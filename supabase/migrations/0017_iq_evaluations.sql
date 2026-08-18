-- Migration 0017: IQ Evaluations table
-- Stores Idea Quality (IQ) evaluation results for a campaign's Big Idea Platform.
-- INTERNAL ONLY — never shown to clients.
-- Triggered by: /api/iq-evaluate (Elevation Mode ON + BIP has topline_idea)

create table if not exists iq_evaluations (
  id                  uuid        primary key default gen_random_uuid(),
  campaign_id         uuid        not null references campaigns(id) on delete cascade,

  -- Snapshot of BIP + FRAME Brief at evaluation time (audit trail)
  bip_snapshot        jsonb       not null default '{}',
  frame_snapshot      jsonb       not null default '{}',

  -- 8 IQ dimensions: [{name, level, score, rationale, elevation_question}]
  -- level: "Foundational" | "Developing" | "World-Class"
  -- score: 1 | 2 | 3
  dimensions          jsonb       not null default '[]',

  -- Red flags identified (array of strings)
  red_flags           jsonb       not null default '[]',

  -- Elevation Brief: strategic guidance to lift the idea to World-Class
  elevation_brief     text        not null default '',

  -- Top-line assessment (2-3 sentences, what this idea is and where it needs to go)
  overall_assessment  text        not null default '',

  -- Computed overall IQ score: sum(score) / 24 * 100 — stored for trending
  iq_score_pct        integer,

  -- Run status
  status              text        not null default 'ready'
                        check (status in ('pending', 'ready', 'error')),
  error_message       text,
  created_at          timestamptz not null default now()
);

create index if not exists iq_evaluations_campaign_id_idx
  on iq_evaluations(campaign_id);

create index if not exists iq_evaluations_campaign_created_idx
  on iq_evaluations(campaign_id, created_at desc);
