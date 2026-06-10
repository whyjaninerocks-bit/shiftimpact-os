-- ShiftImpact OS — seed data
-- Gate Templates, OS Rules, Team, and 3 sample campaigns (QSR / B2B / Retail)

-- ─────────────────────────────────────────────────────────────────────────
-- Gate Templates (4 standard gates, universal chain language)
-- ─────────────────────────────────────────────────────────────────────────
insert into gate_templates (gate_type, sequence_order, required_signal_template, standard_criteria) values
('Gate 1: Demand', 1,
 'Saves >8% for 2 weeks AND Search intent +40% above baseline',
 'Confirms the Demand-stage idea is earning attention before investment moves to Conversion.'),
('Gate 2: Conversion', 2,
 'Retail velocity +25% for 3 weeks AND TikTok Shop CTR >3.5%',
 'Confirms the idea removes purchase friction before scaling spend into Retention.'),
('Gate 3: Retention', 3,
 'Repeat purchase in 60 days >30% AND Organic UGC growing month-over-month',
 'Confirms the brand is becoming the default, habitual choice.'),
('Gate 4: Scale', 4,
 'Sustained Green funnel health across all 3 stages for 4+ consecutive weeks',
 'Confirms the full chain is compounding and ready for budget scale-up.');

-- ─────────────────────────────────────────────────────────────────────────
-- OS Rules (8 core rules + scheduled review)
-- ─────────────────────────────────────────────────────────────────────────
insert into os_rules (rule_name, rule_type, description, config, active) values
('Kill Switch Cascade', 'Escalation',
 'If any Kill Switch fires, all downstream STAGE Briefs are flagged for review and Phase Gate decisions are held until reviewed.',
 '{"action": "hold_downstream_gates"}', true),
('Spend-Led Escalation', 'Escalation',
 'If a STAGE Brief is tagged Spend-Led for 2+ consecutive weeks, escalate to the strategy lead for an Idea Integrity review.',
 '{"threshold_weeks": 2}', true),
('Confidence Score Decline', 'Escalation',
 'If a campaign''s Confidence Score declines 2+ points over 2 consecutive weekly reviews, flag the campaign At Risk.',
 '{"decline_points": 2, "window_weeks": 2}', true),
('Gate Block', 'Gate Permission',
 'A STAGE Brief cannot be set to Live if its prerequisite Phase Gate decision is not Open.',
 '{"enforced": true}', true),
('ICS Blocker', 'Scoring',
 'If any ICS dimension scores 1, the FRAME Brief is forced to Stop regardless of the weighted total.',
 '{"blocker_score": 1}', true),
('Margin Guardrail Breach', 'Escalation',
 'If Business Outcome Actual falls below 80% of Target for 2 consecutive weeks, escalate to the client lead.',
 '{"threshold_pct": 0.8, "window_weeks": 2}', true),
('Overdue Dashboard', 'Escalation',
 'If a Campaign Command Dashboard record is not completed within 7 days of the prior week_of date, flag the campaign Overdue.',
 '{"max_days_overdue": 7}', true),
('Capacity Alert', 'Escalation',
 'If a Team member''s Active Campaigns count exceeds 5, flag for capacity rebalancing.',
 '{"max_active_campaigns": 5}', true),
('Weekly Scheduled Review', 'Scheduled Review',
 'Every Monday, review each active campaign''s STAGE Briefs, Phase Gates, Kill Switches and Business Outcomes Log, then write back to the 5 Claude-owned fields on Campaigns: Current Phase, Confidence Score, Gate Signal Status, Operating Notes, Last Review Date. Do not modify any human-owned field (Idea Integrity Observation, Pre-mortem, Clarity Statement).',
 '{"owned_fields": ["current_phase", "confidence_score", "gate_signal_status", "operating_notes", "last_review_date"], "schedule": "weekly_monday"}', true);

-- ─────────────────────────────────────────────────────────────────────────
-- Team
-- ─────────────────────────────────────────────────────────────────────────
insert into team_members (name, role, urgent_count) values
('Maya Chen', 'Strategy Lead', 1),
('Diego Ramirez', 'Strategy Lead', 0),
('Priya Patel', 'Account Director', 2);

-- ═══════════════════════════════════════════════════════════════════════
-- Campaign A — QSR: Burger Yard / "Smashburger Tuesdays Launch"
-- ═══════════════════════════════════════════════════════════════════════
do $$
declare
  v_client_id uuid;
  v_team_id uuid;
  v_campaign_id uuid;
  v_frame_id uuid;
  v_gate uuid;
begin
  select id into v_team_id from team_members where name = 'Maya Chen';

  insert into clients (name, industry_profile, business_outcome_label, retention_metric_label)
  values ('Burger Yard', 'QSR', 'Same-Store Sales Lift', 'Repeat Visit Rate (60-day)')
  returning id into v_client_id;

  insert into campaigns (
    client_id, team_member_id, name, current_phase, confidence_score, gate_signal_status,
    operating_notes, last_review_date,
    business_outcome_target, business_outcome_actual,
    retention_metric_target, retention_metric_actual, status
  ) values (
    v_client_id, v_team_id, 'Smashburger Tuesdays Launch', 'Conversion', 78, 'On Track',
    'Demand signal cleared Gate 1 two weeks ago. Conversion-stage drive-thru menu board rollout is live in 12 stores; watching TikTok Shop CTR against the 3.5% Gate 2 threshold.',
    '2026-06-08',
    6, 4.1,
    35, 22, 'Active'
  ) returning id into v_campaign_id;

  insert into frame_briefs (
    campaign_id, force, role, anchor, mood, expression, clarity_statement,
    ics_cultural_fit, ics_business_alignment, ics_audience_tension, ics_executional_coherence, ics_measurability, ics_scalability,
    lock_status, locked_at
  ) values (
    v_campaign_id,
    'Cultural momentum around late-night smash burgers on TikTok, but Burger Yard is invisible in that conversation.',
    'Make Tuesdays the night Burger Yard is impossible to ignore in the neighborhood.',
    'The Smash Heard Round the Block',
    'Loud, communal, a little chaotic — like a block party',
    'UGC-style videos of the smash, the sizzle, and the crowd reaction, seeded through local creators',
    'Every Tuesday, Burger Yard turns the smash into the loudest, most shareable moment in the neighborhood — and gives people a reason to show up, post, and come back.',
    5, 5, 4, 4, 4, 4,
    'Locked', now() - interval '21 days'
  ) returning id into v_frame_id;

  insert into kill_switches (frame_brief_id, condition, trigger_status, priority) values
  (v_frame_id, 'Weekly UGC volume drops below 50% of trailing 4-week average for 2 consecutive weeks', 'Inactive', 'High'),
  (v_frame_id, 'Paid CAC exceeds 1.5x blended target for 2 consecutive weeks', 'Monitoring', 'Medium');

  -- Phase Gates (instantiate all 4 templates)
  for v_gate in select id from gate_templates order by sequence_order loop
    insert into phase_gates (campaign_id, gate_template_id, gate_type, sequence_order, required_signal, actual_signal_data, gate_decision, pre_mortem, idea_led_vs_spend_led, decided_at)
    select v_campaign_id, gt.id, gt.gate_type, gt.sequence_order, gt.required_signal_template,
      case gt.gate_type
        when 'Gate 1: Demand' then 'Saves at 9.4% for 2 weeks; search intent +47% above baseline.'
        when 'Gate 2: Conversion' then 'Retail velocity +14% (week 1 of 3); TikTok Shop CTR at 2.8%.'
        else ''
      end,
      case gt.gate_type when 'Gate 1: Demand' then 'Open' else 'Pending' end,
      case gt.gate_type
        when 'Gate 2: Conversion' then 'If CTR stalls below 3.5%, the menu board creative is too generic — pre-mortem says swap to UGC-style screen recordings before adding paid spend.'
        else ''
      end,
      case gt.gate_type when 'Gate 1: Demand' then 'Idea-Led' else 'Mixed' end,
      case gt.gate_type when 'Gate 1: Demand' then now() - interval '14 days' else null end
    from gate_templates gt where gt.id = v_gate;
  end loop;

  -- Stage Briefs (5)
  insert into stage_briefs (campaign_id, stage, channel, brief_body, propagation_mechanism, idea_led_vs_spend_led, status) values
  (v_campaign_id, 'Demand', 'TikTok + Local Creator Seeding',
   'Seed 15 local creators with the Tuesday smash ritual: the press, the sizzle, the crowd chant. Every video ends with the same audio hook.',
   'Earns enough shareable attention that people search "Burger Yard Tuesday" and show up expecting the ritual.',
   'Idea-Led', 'Complete'),
  (v_campaign_id, 'Demand', 'In-Store Ritual Signage',
   'Countdown signage and a branded chant card on every table, reinforcing the Tuesday ritual for dine-in guests.',
   'Turns dine-in guests into the next round of UGC creators.',
   'Idea-Led', 'Complete'),
  (v_campaign_id, 'Conversion', 'Drive-Thru Menu Board',
   'Menu board swaps to UGC-style screen recordings of the smash on Tuesdays, with a one-tap "Tuesday Stack" combo.',
   'Converts drive-thru intent into the Tuesday Stack order, the highest-margin combo.',
   'Mixed', 'Live'),
  (v_campaign_id, 'Conversion', 'In-App Ordering Flow',
   'App home screen surfaces the Tuesday Stack with the same chant-card visual language as in-store.',
   'Removes the extra tap between "I saw this on TikTok" and "I ordered it".',
   'Idea-Led', 'Ready'),
  (v_campaign_id, 'Retention', 'SMS Loyalty Club',
   'Tuesday-only SMS drop with a sneak peek of next week''s smash variation, sent to anyone who ordered the Tuesday Stack.',
   'Makes Tuesday a standing appointment rather than a one-off promo.',
   'Idea-Led', 'Draft');

  -- Campaign Command Dashboard (2 weekly records)
  insert into campaign_dashboards (campaign_id, week_of, decision_snapshot, funnel_health_demand, funnel_health_conversion, funnel_health_retention, business_impact_actual, business_impact_target, ssic, triggers, idea_integrity_observation) values
  (v_campaign_id, '2026-06-01',
   'Decide whether to expand the drive-thru menu board rollout from 12 to 40 stores ahead of Gate 2 read.',
   'Green', 'Amber', 'Green', 3.6, 6,
   'Single Strategic Idea Check: the chant-card visual language is consistent across TikTok, in-store signage, and the menu board.',
   'TikTok Shop CTR trending up but still below 3.5% threshold — watch next week before committing media spend.',
   'The ritual still feels authentic in-store, not like a corporate promo. Crew buy-in on the chant is real.'),
  (v_campaign_id, '2026-06-08',
   'Confirm Gate 2 read next week before greenlighting the SMS Loyalty Club send.',
   'Green', 'Amber', 'Green', 4.1, 6,
   'Single Strategic Idea Check: Tuesday Stack combo is the consistent conversion anchor across all live channels.',
   'CTR up to 2.8%, one point shy of threshold — pre-mortem creative swap queued if next week is flat.',
   'Strong — the in-app flow finally matches the energy of the TikTok content instead of feeling bolted on.');

  -- Business Outcomes Log
  insert into business_outcomes (campaign_id, week_of, metric_label, target_value, actual_value, notes) values
  (v_campaign_id, '2026-06-01', 'Same-Store Sales Lift', 6, 3.6, 'Drive-thru rollout still ramping across 12 stores.'),
  (v_campaign_id, '2026-06-08', 'Same-Store Sales Lift', 6, 4.1, 'Tuesday Stack attach rate climbing week over week.'),
  (v_campaign_id, '2026-06-08', 'Repeat Visit Rate (60-day)', 35, 22, 'Pre-SMS-club baseline; expect lift once Retention stage goes live.');
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Campaign B — B2B: Northwind Analytics / "Built for the Forecast Call"
-- ═══════════════════════════════════════════════════════════════════════
do $$
declare
  v_client_id uuid;
  v_team_id uuid;
  v_campaign_id uuid;
  v_frame_id uuid;
  v_gate uuid;
begin
  select id into v_team_id from team_members where name = 'Diego Ramirez';

  insert into clients (name, industry_profile, business_outcome_label, retention_metric_label)
  values ('Northwind Analytics', 'B2B', 'Pipeline Generated ($)', 'Net Revenue Retention')
  returning id into v_client_id;

  insert into campaigns (
    client_id, team_member_id, name, current_phase, confidence_score, gate_signal_status,
    operating_notes, last_review_date,
    business_outcome_target, business_outcome_actual,
    retention_metric_target, retention_metric_actual, status
  ) values (
    v_client_id, v_team_id, 'Built for the Forecast Call', 'Demand', 64, 'At Risk',
    'FRAME locked at ICS 74 (Fix band) — anchor is strong but executional coherence needs another pass before Conversion assets are briefed. Demand signal still below Gate 1 thresholds.',
    '2026-06-08',
    250000, 96000,
    110, 0, 'Active'
  ) returning id into v_campaign_id;

  insert into frame_briefs (
    campaign_id, force, role, anchor, mood, expression, clarity_statement,
    ics_cultural_fit, ics_business_alignment, ics_audience_tension, ics_executional_coherence, ics_measurability, ics_scalability,
    lock_status, locked_at
  ) values (
    v_campaign_id,
    'Category fatigue — every analytics vendor claims "AI-powered insights," and revenue leaders have stopped listening.',
    'Position Northwind as the only platform built for the revenue team, not the data team.',
    'Built for the Forecast Call, Not the Dashboard',
    'Confident, plain-spoken, slightly contrarian',
    'Founder-led video plus LinkedIn carousels contrasting "dashboard theater" with "a forecast you can defend"',
    'Northwind replaces the dashboard nobody trusts with the forecast number a VP will actually defend in the board meeting.',
    4, 4, 3, 4, 4, 3,
    'Locked', now() - interval '10 days'
  ) returning id into v_frame_id;

  insert into kill_switches (frame_brief_id, condition, trigger_status, priority) values
  (v_frame_id, 'Founder-led video series produces zero qualified inbound demos after 3 weeks', 'Monitoring', 'High'),
  (v_frame_id, 'LinkedIn engagement rate falls below category benchmark for 2 consecutive weeks', 'Inactive', 'Medium');

  for v_gate in select id from gate_templates order by sequence_order loop
    insert into phase_gates (campaign_id, gate_template_id, gate_type, sequence_order, required_signal, actual_signal_data, gate_decision, pre_mortem, idea_led_vs_spend_led, decided_at)
    select v_campaign_id, gt.id, gt.gate_type, gt.sequence_order, gt.required_signal_template,
      case gt.gate_type
        when 'Gate 1: Demand' then 'Saves equivalent (gated content downloads) at 5.2% (target >8%); search intent +22% (target +40%).'
        else ''
      end,
      case gt.gate_type when 'Gate 1: Demand' then 'Hold' else 'Pending' end,
      case gt.gate_type
        when 'Gate 1: Demand' then 'If founder-led video doesn''t move search intent within 3 weeks, the contrarian framing may be too inside-baseball — pre-mortem says test a plainer "forecast you can defend" headline first.'
        else ''
      end,
      case gt.gate_type when 'Gate 1: Demand' then 'Idea-Led' else null end,
      null
    from gate_templates gt where gt.id = v_gate;
  end loop;

  insert into stage_briefs (campaign_id, stage, channel, brief_body, propagation_mechanism, idea_led_vs_spend_led, status) values
  (v_campaign_id, 'Demand', 'Founder-Led Video Series',
   'Founder records a weekly 90-second "forecast call teardown" — a real (anonymized) forecast call, annotated to show where dashboards lie.',
   'Earns enough trust that revenue leaders search Northwind by name before a vendor evaluation starts.',
   'Idea-Led', 'Live'),
  (v_campaign_id, 'Demand', 'LinkedIn Carousel Series',
   'Carousel series: "Dashboard Theater vs. The Forecast You Can Defend" — 5-slide visual contrast, one new comparison per week.',
   'Builds enough shared vocabulary ("dashboard theater") that prospects use the phrase unprompted in discovery calls.',
   'Idea-Led', 'Live'),
  (v_campaign_id, 'Demand', 'Category Podcast Tour',
   'Founder appears on 6 RevOps-adjacent podcasts, each time bridging back to the "forecast you can defend" anchor.',
   'Plants the anchor language in a third-party voice, increasing search intent for branded terms.',
   'Idea-Led', 'Ready'),
  (v_campaign_id, 'Conversion', 'Sales Enablement Deck',
   'Rebuild the first sales deck slide around "the forecast you can defend" instead of feature comparison.',
   'Carries the Demand-stage anchor into the first sales conversation so the idea doesn''t reset at handoff.',
   'Idea-Led', 'Draft'),
  (v_campaign_id, 'Retention', 'Customer Advisory Board',
   'Quarterly advisory board framed around "what would make this forecast more defensible next quarter."',
   'Keeps the anchor alive post-sale so renewal conversations stay idea-led, not feature-led.',
   'Idea-Led', 'Draft');

  insert into campaign_dashboards (campaign_id, week_of, decision_snapshot, funnel_health_demand, funnel_health_conversion, funnel_health_retention, business_impact_actual, business_impact_target, ssic, triggers, idea_integrity_observation) values
  (v_campaign_id, '2026-06-08',
   'Decide whether to brief the Conversion-stage sales deck now or wait for Gate 1 to clear.',
   'Amber', 'Green', 'Green', 96000, 250000,
   'Single Strategic Idea Check: "forecast you can defend" language is consistent across founder video, carousels, and podcast talking points.',
   'Search intent +22% vs +40% target — Kill Switch on founder video inbound is in Monitoring, not yet triggered.',
   'The contrarian tone is landing with senior buyers but may be too subtle for mid-market — recommend a plainer headline test before broadening spend.');

  insert into business_outcomes (campaign_id, week_of, metric_label, target_value, actual_value, notes) values
  (v_campaign_id, '2026-06-08', 'Pipeline Generated ($)', 250000, 96000, 'Early — only 2 of 3 Demand-stage briefs live so far.');
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Campaign C — Retail: Heritage Denim Co. / "Your First Pair Was Just the Beginning"
-- ═══════════════════════════════════════════════════════════════════════
do $$
declare
  v_client_id uuid;
  v_team_id uuid;
  v_campaign_id uuid;
  v_frame_id uuid;
  v_gate uuid;
begin
  select id into v_team_id from team_members where name = 'Priya Patel';

  insert into clients (name, industry_profile, business_outcome_label, retention_metric_label)
  values ('Heritage Denim Co.', 'Retail', 'Sell-Through Rate', 'Repeat Purchase Rate (60-day)')
  returning id into v_client_id;

  insert into campaigns (
    client_id, team_member_id, name, current_phase, confidence_score, gate_signal_status,
    operating_notes, last_review_date,
    business_outcome_target, business_outcome_actual,
    retention_metric_target, retention_metric_actual, status
  ) values (
    v_client_id, v_team_id, 'Your First Pair Was Just the Beginning', 'Retention', 88, 'On Track',
    'Gates 1-3 are Open. Retention-stage lifecycle flows are live and Gate 4 (Scale) is tracking 3 of 4 consecutive Green weeks — one more clean week and this campaign is ready for budget scale-up.',
    '2026-06-08',
    72, 69,
    30, 34, 'Active'
  ) returning id into v_campaign_id;

  insert into frame_briefs (
    campaign_id, force, role, anchor, mood, expression, clarity_statement,
    ics_cultural_fit, ics_business_alignment, ics_audience_tension, ics_executional_coherence, ics_measurability, ics_scalability,
    lock_status, locked_at
  ) values (
    v_campaign_id,
    'Customers who bought one pair of selvedge jeans 2-3 years ago and never came back.',
    'Turn first-time buyers into lifetime collectors of the brand''s evolving fits.',
    'Your First Pair Was Just the Beginning',
    'Warm, archival, a little nostalgic — like flipping through a denim logbook',
    'Email and SMS series showing the "next chapter" fit for returning customers, paired with a loyalty patch program',
    'Heritage Denim turns a one-time purchase into a years-long relationship by showing returning customers exactly which "next pair" fits the story they''ve already started.',
    5, 5, 4, 5, 4, 5,
    'Locked', now() - interval '60 days'
  ) returning id into v_frame_id;

  insert into kill_switches (frame_brief_id, condition, trigger_status, priority) values
  (v_frame_id, 'Loyalty patch redemption rate falls below 10% for 2 consecutive cohorts', 'Inactive', 'Medium'),
  (v_frame_id, 'Email unsubscribe rate exceeds 1% on any "next chapter" send', 'Inactive', 'Low');

  for v_gate in select id from gate_templates order by sequence_order loop
    insert into phase_gates (campaign_id, gate_template_id, gate_type, sequence_order, required_signal, actual_signal_data, gate_decision, pre_mortem, idea_led_vs_spend_led, decided_at)
    select v_campaign_id, gt.id, gt.gate_type, gt.sequence_order, gt.required_signal_template,
      case gt.gate_type
        when 'Gate 1: Demand' then 'Saves at 11.2% for 2 weeks; search intent +52% above baseline.'
        when 'Gate 2: Conversion' then 'Retail velocity +31% for 3 weeks; TikTok Shop CTR at 4.1%.'
        when 'Gate 3: Retention' then 'Repeat purchase in 60 days at 34% (target >30%); organic UGC up 18% MoM.'
        when 'Gate 4: Scale' then 'Funnel health Green across all 3 stages for 3 of the last 4 weeks — one more clean week needed.'
        else ''
      end,
      case gt.gate_type
        when 'Gate 1: Demand' then 'Open'
        when 'Gate 2: Conversion' then 'Open'
        when 'Gate 3: Retention' then 'Open'
        else 'Pending'
      end,
      case gt.gate_type
        when 'Gate 4: Scale' then 'If week 4 dips to Amber, hold scale-up and re-check whether the loyalty patch program is cannibalizing full-price sell-through.'
        else ''
      end,
      'Idea-Led',
      case gt.gate_type when 'Gate 4: Scale' then null else now() - interval '7 days' end
    from gate_templates gt where gt.id = v_gate;
  end loop;

  insert into stage_briefs (campaign_id, stage, channel, brief_body, propagation_mechanism, idea_led_vs_spend_led, status) values
  (v_campaign_id, 'Demand', 'Instagram Reels — "Denim Logbook"',
   'Reels series following 3 long-time customers'' jeans over years of wear, framed as entries in a "logbook."',
   'Earns enough nostalgia-driven attention that past customers start tagging their own worn-in pairs.',
   'Idea-Led', 'Complete'),
  (v_campaign_id, 'Conversion', 'Shopify PDP + Email Flow',
   'Product pages for "next chapter" fits show a side-by-side with the customer''s previously purchased fit (via order history).',
   'Removes the friction of "which fit do I get next" by answering it before the customer asks.',
   'Idea-Led', 'Live'),
  (v_campaign_id, 'Conversion', 'Retail Pop-up — "Logbook Bar"',
   'In-store station where returning customers get their original pair stamped with a new "chapter" patch on purchase.',
   'Converts the digital nostalgia hook into an in-person ritual that''s easy to film and share.',
   'Idea-Led', 'Live'),
  (v_campaign_id, 'Retention', 'SMS + Email Lifecycle — "Next Chapter"',
   'Quarterly lifecycle send tied to wear-and-tear cycles, recommending the next fit in the customer''s personal logbook.',
   'Keeps the relationship compounding by giving returning customers a reason to come back roughly every 90 days.',
   'Idea-Led', 'Live'),
  (v_campaign_id, 'Retention', 'Loyalty Patch Program',
   'Physical patch mailed for every 2nd+ purchase, each one tied to a chapter in the customer''s logbook — collectible and visible on the jeans themselves.',
   'Turns the product itself into a walking piece of UGC that compounds organic reach.',
   'Idea-Led', 'Live');

  insert into campaign_dashboards (campaign_id, week_of, decision_snapshot, funnel_health_demand, funnel_health_conversion, funnel_health_retention, business_impact_actual, business_impact_target, ssic, triggers, idea_integrity_observation) values
  (v_campaign_id, '2026-06-01',
   'Decide whether to pre-book Q3 media budget pending one more Green week for Gate 4.',
   'Green', 'Green', 'Green', 67, 72,
   'Single Strategic Idea Check: the "logbook" / "next chapter" language is consistent from Reels through to the physical patch program.',
   'Three consecutive Green weeks toward Gate 4 — one more needed before Scale gate opens.',
   'The patch program is the strongest idea-to-product translation we''ve shipped this year — customers are filming the unboxing unprompted.'),
  (v_campaign_id, '2026-06-08',
   'If this week reads Green, open Gate 4 and greenlight Q3 scale-up budget.',
   'Green', 'Green', 'Green', 69, 72,
   'Single Strategic Idea Check: every live channel still routes back to "your next chapter" — no drift detected.',
   'Repeat purchase rate now above the Gate 3 threshold and holding — Kill Switches remain Inactive.',
   'Holding the line — no need to add new creative ideas right now, just sustain what''s working through Q3.');

  insert into business_outcomes (campaign_id, week_of, metric_label, target_value, actual_value, notes) values
  (v_campaign_id, '2026-06-01', 'Sell-Through Rate', 72, 67, 'Tracking toward target; pop-up driving incremental lift.'),
  (v_campaign_id, '2026-06-08', 'Sell-Through Rate', 72, 69, 'Continued steady climb.'),
  (v_campaign_id, '2026-06-01', 'Repeat Purchase Rate (60-day)', 30, 31, 'Crossed Gate 3 threshold this week.'),
  (v_campaign_id, '2026-06-08', 'Repeat Purchase Rate (60-day)', 30, 34, 'Loyalty patch program cohort outperforming control.');
end $$;
