-- Migration 0080 — Add "Nurture" as a real stage + phase gate
-- 4 Sept 2026
--
-- Context: MessageSequenceSection.tsx (the message-sequencing governance validator)
-- was misusing the "Retention" stage to mean "Nurture/Consideration" content, which
-- collided with Retention's real meaning (post-purchase loyalty, gated after Conversion)
-- used everywhere else in the app. Decision: give Nurture its own real stage + gate,
-- rather than a tag with no criteria, because its readiness criteria genuinely differ
-- from Demand and Conversion. Advancement remains 100% human-approved — no new
-- automation is introduced; this only extends the existing manual gate-approval pattern
-- from 4 gates to 5. No live client campaigns exist yet (confirmed with Janine before
-- running this) — the 4 campaigns touched below are internal demo/seed data.

-- ─── 1. Widen stage_briefs.stage to allow "Nurture" ──────────────────────────
ALTER TABLE stage_briefs DROP CONSTRAINT stage_briefs_stage_check;
ALTER TABLE stage_briefs ADD CONSTRAINT stage_briefs_stage_check
  CHECK (stage = ANY (ARRAY['Demand'::text, 'Nurture'::text, 'Conversion'::text, 'Retention'::text]));

-- ─── 2. Widen campaigns.current_phase to allow "Nurture" ─────────────────────
ALTER TABLE campaigns DROP CONSTRAINT campaigns_current_phase_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_current_phase_check
  CHECK (current_phase = ANY (ARRAY['Demand'::text, 'Nurture'::text, 'Conversion'::text, 'Retention'::text, 'Complete'::text]));

-- ─── 3. Renumber existing gate_templates (descending, to avoid collisions) ───
UPDATE gate_templates SET gate_type = 'Gate 5: Scale',      sequence_order = 5 WHERE gate_type = 'Gate 4: Scale';
UPDATE gate_templates SET gate_type = 'Gate 4: Retention',  sequence_order = 4 WHERE gate_type = 'Gate 3: Retention';
UPDATE gate_templates SET gate_type = 'Gate 3: Conversion', sequence_order = 3 WHERE gate_type = 'Gate 2: Conversion';

-- Insert the new Nurture gate template at position 2
INSERT INTO gate_templates (gate_type, sequence_order, required_signal_template, standard_criteria)
VALUES (
  'Gate 2: Nurture',
  2,
  'Share Rate (Signal 2B) above category benchmark for 2 weeks AND Attention Quality Score trending "Attention Adequate" or better on differentiation-led creative',
  'Confirms proof and differentiation content is landing — the audience is actively considering the brand, not just aware of the category — before conversion spend ramps. (First-pass criteria — refine thresholds as real campaign data comes in.)'
);

-- ─── 4. Renumber existing phase_gates rows the same way (descending) ────────
UPDATE phase_gates SET gate_type = 'Gate 5: Scale',      sequence_order = 5 WHERE gate_type = 'Gate 4: Scale';
UPDATE phase_gates SET gate_type = 'Gate 4: Retention',  sequence_order = 4 WHERE gate_type = 'Gate 3: Retention';
UPDATE phase_gates SET gate_type = 'Gate 3: Conversion', sequence_order = 3 WHERE gate_type = 'Gate 2: Conversion';

-- Insert a "Gate 2: Nurture" phase_gates row (status Pending) for every existing campaign,
-- matching the same instantiation pattern createCampaign() uses for new campaigns.
INSERT INTO phase_gates (campaign_id, gate_template_id, gate_type, sequence_order, required_signal, gate_decision)
SELECT
  c.id,
  gt.id,
  gt.gate_type,
  gt.sequence_order,
  gt.required_signal_template,
  'Pending'
FROM campaigns c
CROSS JOIN gate_templates gt
WHERE gt.gate_type = 'Gate 2: Nurture'
  AND NOT EXISTS (
    SELECT 1 FROM phase_gates pg WHERE pg.campaign_id = c.id AND pg.gate_type = 'Gate 2: Nurture'
  );

-- ─── Verify ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM gate_templates) = 5, 'expected 5 gate_templates rows';
  ASSERT (SELECT COUNT(*) FROM gate_templates WHERE gate_type = 'Gate 2: Nurture') = 1, 'Gate 2: Nurture template missing';
  ASSERT (SELECT COUNT(DISTINCT campaign_id) FROM phase_gates WHERE gate_type = 'Gate 2: Nurture') = (SELECT COUNT(*) FROM campaigns), 'not every campaign got a Nurture gate';
  RAISE NOTICE 'Migration 0080 verified — Nurture stage + gate added, 5-gate sequence in place.';
END $$;
