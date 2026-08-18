SHIFTIMPACT OS — Product Requirements Document v2

PHILOSOPHY
Most campaigns fail not in production but in transit. The idea that earns attention at the top of the funnel gets diluted — by execution teams, by conversion pressure, by channel constraints — until what reaches the customer at the point of decision is a shadow of what was originally briefed. ShiftImpact OS exists to prevent that. Core question at every stage: Is the idea still strong enough here to earn the next stage?

THREE FORCES THE OS ENFORCES
1. Idea Integrity — the Clarity Statement travels unchanged through every handover
2. Evidence Gates — nothing advances until a specific consumer behaviour signal fires and holds
3. Compounding — each stage brief inherits and builds on the previous anchor, never resets

UNIVERSAL 3-STAGE BUSINESS CHAIN (labels change by industry, logic does not)
Stage 1 — DEMAND: Get the right audience to notice and signal intent
Stage 2 — CONVERSION: Remove every barrier between intent and purchase
Stage 3 — RETENTION: Make the brand the default, habitual choice

DATA SCHEMA — 11 TABLES

Table 1 — Clients: Master record. Industry Profile flows into OS Rules to configure campaign chain language per client.

Table 2 — Campaigns: Central hub. All other tables link here. Contains: operating intelligence fields (Claude-updated weekly), business outcome layer (commitment the OS is held accountable to), Confidence Score, Current Phase, Gate Signal Status.

Table 3 — FRAME Briefs: One per campaign. ICS scoring embedded. Fields: Force, Role, Anchor, Mood, Expression, Clarity Statement (locked), ICS scores per dimension (Cultural Fit 20%, Business Alignment 20%, Audience Tension 20%, Executional Coherence 15%, Measurability 15%, Scalability 10%), ICS Weighted Total, ICS Threshold (85=Advance, 70-84=Fix, 55-69=Rework, <55=Stop), Lock Status. FRAME is locked before any STAGE Brief is issued.

Table 4 — Kill Switches: Child of FRAME Brief. Multiple per campaign. Active throughout campaign — not a pre-launch checklist. Fields: Condition, Trigger Status, Priority.

Table 5 — STAGE Briefs: Five per campaign. Inherits FRAME DNA via lookup — drift visible before it becomes a problem. Key field: Propagation Mechanism (what does the idea do HERE to earn the audience's movement to the next stage?). Fields: Stage (Demand/Conversion/Retention), Channel, Brief Body, FRAME Anchor (lookup), Mood Register (lookup), Idea-Led vs Spend-Led indicator.

Table 6 — Gate Templates: Reference table. Pre-loads standard criteria for all 4 gate types. Phase Gate records inherit from here.

Table 7 — Phase Gates: Four per campaign. Gate is a business decision, not a review meeting. Opens ONLY when idea has demonstrated enough strength to justify next investment. Fields: Gate Type, Required Signal, Actual Signal Data, Gate Decision (Open/Hold/Stop), Pre-mortem, Idea-Led vs Spend-Led diagnostic.

Gate Signal Thresholds (pre-defined before execution starts):
- Gate 1 Demand: Saves >8% for 2 weeks + Search intent +40% above baseline
- Gate 2 Conversion: Retail velocity +25% for 3 weeks + TikTok Shop CTR >3.5%
- Gate 3 Retention: Repeat purchase in 60 days >30% + Organic UGC growing MoM

Table 8 — Campaign Command Dashboard: One record per campaign per week. 4 quadrants: (1) Decision Snapshot — the one decision needed this week, (2) Funnel Health RAG — Green/Amber/Red per stage, (3) Business Impact — actual vs target, (4) SSIC + Triggers. Idea Integrity Observation = human expert judgement (strategy lead), not Claude.

Table 9 — Business Outcomes Log: Rolling weekly record of actual business results vs targets. Audit trail.

Table 10 — Team: Capacity tracking. Fields: Active Campaigns, Urgent count.

Table 11 — OS Rules: Intelligence layer brain. Stores scoring rules, escalation rules, gate permissions, Claude scheduled review instructions, industry configuration labels. 8 core rules: Kill Switch Cascade, Spend-Led Escalation, Confidence Score Decline (2+ points over 2 weeks), Gate Block, ICS Blocker, Margin Guardrail Breach, Overdue Dashboard, Capacity Alert.

V1 FUNCTIONAL REQUIREMENTS (Must Have)
1. All 11 tables created with specified fields and types
2. Linked records across full chain as documented
3. Formula fields: ICS Weighted Total, ICS Threshold, Any Dimension=1 blocker, Capacity Status on Team
4. Lookup fields on STAGE Briefs: FRAME Anchor + Mood Register auto-inherited
5. Lookup fields on Phase Gates: all standard criteria auto-loaded from Gate Templates
6. Rollup fields on Clients (Active Campaigns) and Team (Active + Urgent counts)
7. All 10 views with specified filters and sorts
8. Gate Templates pre-populated with 4 standard gates using universal chain language
9. OS Rules pre-populated with minimum 8 core rules
10. 3 sample campaigns seeded: one QSR, one B2B, one Retail — demonstrates industry versatility
11. Industry Profile on Client record flowing into Business Outcome Label and Retention Metric Label throughout
12. Weekly Scheduled Review Prompt saved as Claude scheduled task
13. Client Interface page: Campaign Name, Current Phase, Confidence Score, Dashboard summary, Decision Needed — no framework exposed

V2 POST-LAUNCH (not v1)
Automated Kill Switch cascade, automated gate block, Intake Form, Campaign duplication, Failure Mode suggestion, Business Outcome trend chart

SUCCESS CRITERIA (8 conditions, reviewed at 30-day mark)
1. A FRAME Brief can be completed and locked in under 30 minutes
2. ICS score calculates automatically from dimension inputs
3. A STAGE Brief cannot be set to Live if the previous Gate is not Open
4. Kill Switch Cascade fires automatically when a Kill Switch is triggered
5. The weekly Dashboard record can be completed in under 20 minutes
6. Claude's weekly scheduled review writes back to the 5 owned fields without manual input
7. A new client and campaign can be onboarded in under 2 hours
8. The Client Interface shows zero framework terminology