// ─── Consumer Behaviour State (Feature 18A — Sprint 3) ───────────────────────
// AI-classified consumer state per campaign per week.
// 6-state model: Unaware → Aware but Passive → Aware but Unconvinced →
//   In Consideration → Intent-Active → Post-Purchase.
//
// INTERNAL ONLY: state names, numbers, and classification system are
// never shown in the Client Interface. Clients receive plain-language output.

export type BehaviourConfidence = "High" | "Medium" | "Directional";

export type ConsumerBehaviourState = {
  id: string;
  campaign_id: string;
  week_number: number;
  week_of: string;
  // AI classification (null until diagnostic is run for this week)
  diagnosed_state: number | null;         // 1–6
  state_name: string;                     // "Unaware", "Aware but Passive", etc.
  signal_pattern_read: string;            // what signal combination drove this classification
  activation_direction: string;           // what to do to advance to the next state
  low_involvement_note: string;           // category involvement modifier (may be empty)
  confidence_level: BehaviourConfidence;
  // Strategy lead input
  strategy_notes: string;
  created_at: string;
  updated_at: string;
};

// ─── Signal Market Context (Feature 16C — Sprint 4) ──────────────────────────
// External market variable context entered weekly by the strategy lead.
// Loaded by /api/signal-report and injected into the AI prompt as supplementary
// context — distinguishes campaign problems from market-wide conditions.
// All fields optional; graceful degradation if not filled.

export type MarketContextTrend   = "Up" | "Flat" | "Down";
export type MarketContextSovSign = "Positive" | "Neutral" | "Negative";

export type SignalMarketContext = {
  id: string;
  campaign_id: string;
  week_number: number;
  // 1. Category search volume trend
  category_search_trend: MarketContextTrend | null;
  category_search_note: string;
  // 2. Competitive SOV change
  competitive_sov_change: MarketContextSovSign | null;
  competitive_sov_note: string;
  // 3. Cultural moment
  cultural_moment_flag: boolean;
  cultural_moment_note: string;
  // 4. Platform algorithm / policy change
  platform_algorithm_flag: boolean;
  platform_algorithm_note: string;
  // 5. Macro-economic context
  macro_context_note: string;
  // 6. Weather / seasonality
  weather_seasonality_note: string;
  created_at: string;
  updated_at: string;
};

// ─── Attribution Records (Feature 14B — Sprint 4) ─────────────────────────────
// Data capture layer for the Universal Business Outcome Attribution Framework.
// Three-lens methodology: MMM / Holdout Testing / Proxy Correlation.
// Sprint 4 = data collection only. AI-assisted MMM analysis: Sprint 5+.
// INTERNAL ONLY.

export type AttributionTestType = "MMM" | "Holdout" | "Proxy";

export type AttributionRecord = {
  id: string;
  campaign_id: string;
  week_number: number;
  week_of: string;
  channel_name: string;
  spend_rm: number | null;
  sales_units: number | null;
  sales_rm: number | null;
  incremental_lift_pct: number | null;
  test_type: AttributionTestType;
  notes: string;
  created_at: string;
};

// ─── Brand Momentum Score (Feature 19 — Sprint 4) ────────────────────────────
// CLIENT-LEVEL composite intelligence. Synthesises 6 signal dimensions into
// a single directional composite: "Is the brand winning or losing overall?"
// Computed by /api/brand-momentum.
//
// ACCESS:
//   Client: bms_direction + bms_velocity + bms_confidence only.
//   Internal: all dimensions, conflict flags, ai_read.
//   Derivation rules: NEVER shared with clients or agencies.

export type BmsDirection  = "Positive" | "Neutral" | "Negative";
export type BmsVelocity   = "Accelerating" | "Stable" | "Decelerating";
export type SosTrajDir    = "Up" | "Flat" | "Down";
export type SosMagnitude  = "Strong" | "Moderate" | "Weak";
export type CepCoverage   = "Expanding" | "Stable" | "Narrowing";
export type CompetitiveCtx = "Gaining" | "Holding" | "Losing";

export type BrandMomentumScore = {
  id: string;
  client_id: string;
  period_label: string;
  period_start: string;
  period_end: string | null;
  // 6 dimension inputs
  sos_trajectory: SosTrajDir | null;
  sos_magnitude: SosMagnitude | null;
  sos_note: string;
  save_rate_trend: SosTrajDir | null;
  save_rate_note: string;
  ugc_trend: SosTrajDir | null;
  ugc_note: string;
  sov_som_ratio: MarketContextSovSign | null;
  sov_som_note: string;
  cep_coverage: CepCoverage | null;
  cep_note: string;
  competitive_context: CompetitiveCtx | null;
  competitive_note: string;
  // AI composite outputs
  bms_direction: BmsDirection | null;
  bms_velocity: BmsVelocity | null;
  bms_confidence: number | null;    // 1–10 data completeness
  dimension_conflict_flag: boolean;
  ai_read: string;
  created_at: string;
  updated_at: string;
};

// ─── Industry / Category ─────────────────────────────────────────────────────
// Client-level profile (legacy — broad classification on the client record)
export type IndustryProfile = "QSR" | "B2B" | "Retail" | "Other";

// FRAME Brief-level category (Sprint 1 addition — drives Gate Signal Library,
// holding periods, ICS weighting, Benchmark Library filter, Pitch Intel priming)
export type IndustryCategory =
  | "QSR"
  | "FMCG"
  | "Retail"
  | "B2B"
  | "Financial Services"
  | "Telco"
  | "Other";

// Campaign Pathway — drives Business Ambition dimension in IQ Evaluate (Sprint 2-3)
// and Channel Strategy defaults
export type CampaignPathway = "Growth" | "Challenger" | "Loyalty" | "Premium";

// ─── Client ──────────────────────────────────────────────────────────────────

export type Client = {
  id: string;
  name: string;
  industry_profile: IndustryProfile;
  business_outcome_label: string;
  retention_metric_label: string;
  created_at: string;
};

export type ClientWithRollups = Client & {
  active_campaigns: number;
};

// ─── Campaign ─────────────────────────────────────────────────────────────────

export type CampaignPhase = "Demand" | "Conversion" | "Retention" | "Complete";
export type GateSignalStatus = "Pending" | "On Track" | "At Risk" | "Blocked";
export type CampaignStatus = "Active" | "Paused" | "Complete";

export type Campaign = {
  id: string;
  client_id: string;
  team_member_id: string | null;
  name: string;
  current_phase: CampaignPhase;
  confidence_score: number;
  gate_signal_status: GateSignalStatus;
  operating_notes: string;
  last_review_date: string | null;
  business_outcome_target: number | null;
  business_outcome_actual: number | null;
  retention_metric_target: number | null;
  retention_metric_actual: number | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
};

export type CampaignOverview = Campaign & {
  client_name: string;
  industry_profile: IndustryProfile;
  business_outcome_label: string;
  retention_metric_label: string;
  team_member_name: string | null;
  frame_brief_id: string | null;
  frame_lock_status: "Draft" | "Locked" | null;
  ics_weighted_total: number | null;
  ics_threshold: "Advance" | "Conditional" | "Rework" | "Stop" | null;
  frame_anchor: string | null;
  frame_mood: string | null;
  clarity_statement: string | null;
};

// ─── FRAME Brief ──────────────────────────────────────────────────────────────

export type LockStatus = "Draft" | "Locked";
export type IcsThreshold = "Advance" | "Conditional" | "Rework" | "Stop";

// Gate 1 status — computed from FRAME field completeness (not stored in DB)
// Passes when: all 5 FRAME fields filled + industry_category set + campaign_pathway set
// + primary_kpi filled + gate_signal_commitment filled + FRAME locked
export type Gate1Status = "Incomplete" | "Ready" | "Passed";

export type FrameBrief = {
  id: string;
  campaign_id: string;

  // ── FRAME 5 fields ──
  force: string;
  role: string;
  anchor: string;
  mood: string;
  expression: string;
  clarity_statement: string;

  // ── Sprint 1 additions ──
  industry_category: IndustryCategory;
  campaign_pathway: CampaignPathway | null;
  enemy_villain: string;
  enemy_active: boolean;
  primary_kpi: string;
  primary_kpi_baseline: number | null;
  gate_signal_commitment: string;
  elevation_mode_enabled: boolean;

  // ── Feature 15 — Cultural Intelligence & Regulatory Layer ──
  // primary_cultural_context: primary ethnic/cultural market context for this campaign
  primary_cultural_context: string; // e.g. "Malay", "Chinese", "Indian", "Pan-Malaysian", "Pan-SEA"
  // regulatory_category: primary regulatory body/framework relevant to this category
  regulatory_category: string; // e.g. "MCMC", "ASA Malaysia", "KKM", "BNM", "MBAM", "None"

  // ── ICS scores (1-5 per dimension, stored; weighted total + threshold computed in DB) ──
  ics_cultural_fit: number;
  ics_business_alignment: number;
  ics_audience_tension: number;
  ics_executional_coherence: number;
  ics_measurability: number;
  ics_scalability: number;
  ics_weighted_total: number;
  ics_any_dimension_blocker: boolean;
  ics_threshold: IcsThreshold;

  // ── Lock ──
  lock_status: LockStatus;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

// Gate 1 helper — compute from a FrameBrief object (no DB round-trip)
export function computeGate1Status(frame: FrameBrief): Gate1Status {
  if (frame.lock_status !== "Locked") return "Incomplete";
  const required = [
    frame.force,
    frame.role,
    frame.anchor,
    frame.mood,
    frame.expression,
    frame.primary_kpi,
    frame.gate_signal_commitment,
  ];
  const allFilled = required.every((f) => f.trim().length > 0);
  const pathwaySet = frame.campaign_pathway !== null;
  if (!allFilled || !pathwaySet) return "Incomplete";
  return "Passed";
}

// ─── Kill Switches ────────────────────────────────────────────────────────────

export type KillSwitchPriority = "High" | "Medium" | "Low";
export type KillSwitchStatus = "Inactive" | "Monitoring" | "Triggered";

export type KillSwitch = {
  id: string;
  frame_brief_id: string;
  condition: string;
  trigger_status: KillSwitchStatus;
  priority: KillSwitchPriority;
  created_at: string;
};

// ─── Stage Briefs ─────────────────────────────────────────────────────────────

export type Stage = "Demand" | "Conversion" | "Retention";
export type StageBriefStatus = "Draft" | "Ready" | "Live" | "Paused" | "Complete";
export type IdeaOrSpend = "Idea-Led" | "Spend-Led" | "Mixed";

export type StageBrief = {
  id: string;
  campaign_id: string;
  stage: Stage;
  channel: string;
  brief_body: string;
  propagation_mechanism: string;
  idea_led_vs_spend_led: IdeaOrSpend | null;
  frame_anchor: string;
  mood_register: string;
  status: StageBriefStatus;
  created_at: string;
  updated_at: string;
};

// ─── Phase Gates ──────────────────────────────────────────────────────────────

export type GateTemplate = {
  id: string;
  gate_type: string;
  sequence_order: number;
  required_signal_template: string;
  standard_criteria: string;
  created_at: string;
};

export type GateDecision = "Pending" | "Open" | "Hold" | "Stop";

export type PhaseGate = {
  id: string;
  campaign_id: string;
  gate_template_id: string;
  gate_type: string;
  sequence_order: number;
  required_signal: string;
  actual_signal_data: string;
  gate_decision: GateDecision;
  pre_mortem: string;
  idea_led_vs_spend_led: IdeaOrSpend | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Campaign Command Dashboard ───────────────────────────────────────────────

export type RagStatus = "Green" | "Amber" | "Red";

export type CampaignDashboard = {
  id: string;
  campaign_id: string;
  week_of: string;
  decision_snapshot: string;
  funnel_health_demand: RagStatus;
  funnel_health_conversion: RagStatus;
  funnel_health_retention: RagStatus;
  business_impact_actual: number | null;
  business_impact_target: number | null;
  ssic: string;
  triggers: string;
  idea_integrity_observation: string;
  created_at: string;
};

// ─── Business Outcomes ────────────────────────────────────────────────────────

export type BusinessOutcome = {
  id: string;
  campaign_id: string;
  week_of: string;
  metric_label: string;
  target_value: number | null;
  actual_value: number | null;
  notes: string;
  created_at: string;
};

// ─── Team ─────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  urgent_count: number;
  created_at: string;
};

export type TeamMemberWithRollups = TeamMember & {
  active_campaigns: number;
  capacity_status: "OK" | "Over Capacity";
};

// ─── OS Rules ─────────────────────────────────────────────────────────────────

export type OsRule = {
  id: string;
  rule_name: string;
  rule_type: "Escalation" | "Scoring" | "Gate Permission" | "Scheduled Review" | "Configuration";
  description: string;
  config: Record<string, unknown>;
  active: boolean;
  created_at: string;
};

// ─── Gate Signal Log ──────────────────────────────────────────────────────────

export type GateSignalLog = {
  id: string;
  campaign_id: string;
  gate_id: string | null;
  logged_at: string;
  signal_type: string;
  signal_label: string;
  actual_value: number | null;
  threshold_value: number | null;
  unit: string | null;
  pass: boolean | null;
  notes: string | null;
  created_at: string;
};

// ─── Client Channel Registry ──────────────────────────────────────────────────

export type ChannelCategory = "Radio" | "KOL" | "Retail" | "Digital" | "PR" | "CRM" | "Custom";

export type ClientChannel = {
  id: string;
  client_id: string;
  channel_name: string;
  channel_category: ChannelCategory;
  translation_hint: string;
  active: boolean;
  created_at: string;
};

// ─── Client Signal Source Library ─────────────────────────────────────────────

export type ClientSignalSource = {
  id: string;
  client_id: string;
  source_name: string;
  source_type: string;
  unit: string;
  description: string;
  active: boolean;
  created_at: string;
};

// ─── Idea Extensions ──────────────────────────────────────────────────────────

export type IdeaExtensionStatus = "Draft" | "Ready" | "Approved";

// channel_role: which funnel stage this channel is serving.
// A single campaign may have channels across all 4 roles simultaneously.
export type ChannelRole = "Demand" | "Nurture" | "Conversion" | "Retention";

export type IdeaExtension = {
  id: string;
  campaign_id: string;
  channel_name: string;
  channel_category: ChannelCategory;
  // expression_name: short creative label for how the idea lives in this channel
  // e.g. "Silence is Loud", "First Attempt Challenge", "The Smash Moment"
  expression_name: string;
  // channel_role: funnel stage this channel executes at
  channel_role: ChannelRole | null;
  brief_body: string;
  frame_anchor: string;
  mood_register: string;
  clarity_statement: string;
  propagation_mechanism: string;
  status: IdeaExtensionStatus;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Big Idea Platform (BIP) ──────────────────────────────────────────────────
// Sprint 1 — one BIP per campaign.
// Unlocked after Gate 1 passes (FRAME Brief locked + all required fields filled).
// IQ Evaluate API reads from this in Sprint 2-3.

export type BigIdeaPlatform = {
  id: string;
  campaign_id: string;

  // 7 BIP components
  topline_idea: string;         // The hero statement. One sentence.
  enemy_villain: string;        // Structural enemy. Inherited from FRAME enemy_villain.
  brand_role: string;           // Non-transferable role. Remove brand = idea collapses.
  propagation_mechanism: string;// How does this idea earn movement stage to stage?
  cultural_tension: string;     // The specific human tension being resolved.
  media_idea: string;           // The format / channel that carries the idea.
  expression_summary: string;   // How it manifests across all touchpoints.

  lock_status: LockStatus;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

// BIP completeness check — all 7 components must be non-empty to lock
export function computeBipComplete(bip: BigIdeaPlatform): boolean {
  return [
    bip.topline_idea,
    bip.enemy_villain,
    bip.brand_role,
    bip.propagation_mechanism,
    bip.cultural_tension,
    bip.media_idea,
    bip.expression_summary,
  ].every((f) => f.trim().length > 0);
}

// ─── Knowledge Base (Feature 15 — Cultural Intelligence & Regulatory Layer) ──
// Stores uploaded strategic documents: cultural briefs, regulatory guides,
// market intelligence, and cross-market reference material.
// Access: Janine only (internal). Not shown to clients.

export type KnowledgeDocType =
  | "Cultural Intelligence"
  | "Regulatory Guide"
  | "Market Intelligence"
  | "Competitor Intel"
  | "Custom";

export type KnowledgeDocMarket =
  | "Malaysia"
  | "Singapore"
  | "Thailand"
  | "India"
  | "Indonesia"
  | "Pan-SEA"
  | "Global";

// ─── Signal Intelligence (Feature 12) ────────────────────────────────────────
// Internal only — not shown to clients.
// Signal → Stage mapping: Signal 1 → Conversion | Signal 2 → Nurture | Signal 3 → Demand

export type SignalHealth = "Green" | "Amber" | "Red";
export type CampaignPhaseNumber = 1 | 2 | 3 | 4;

// Standard campaign duration reference models (PRD v2.4)
export type CampaignDurationWeeks = 8 | 12 | 26;

export type SignalThreshold = {
  id: string;
  campaign_id: string;
  campaign_duration_weeks: number;

  // Signal 1 — Branded Search Lift (%)
  signal_1_label: string;
  signal_1_threshold_pct: number;   // Green if >= this
  signal_1_amber_pct: number;       // Amber if below threshold but >= this
  signal_1_red_pct: number;         // Red if below this

  // Signal 2 — Content Save Rate (%)
  signal_2_label: string;
  signal_2_threshold_pct: number;
  signal_2_amber_pct: number;
  signal_2_red_pct: number;

  // Signal 3 — UGC Volume (count/week via Apify)
  signal_3_label: string;
  signal_3_threshold_count: number;
  signal_3_amber_count: number;
  signal_3_red_count: number;

  locked: boolean;
  locked_at: string | null;
  lock_notes: string;
  created_at: string;
  updated_at: string;
};

export type SignalWeeklyReport = {
  id: string;
  campaign_id: string;
  threshold_id: string;

  week_number: number;
  week_of: string; // ISO date

  // Raw signal inputs
  signal_1_actual_pct: number | null;   // Branded search lift %
  signal_2_actual_pct: number | null;   // Content save rate %
  signal_3_actual_count: number | null; // UGC volume

  // Campaign phase (1-4), computed from week_number / campaign_duration_weeks
  campaign_phase: CampaignPhaseNumber;
  flags_suppressed: boolean;

  // Traffic lights — one per funnel stage
  demand_health: SignalHealth;     // driven by Signal 3 (UGC)
  nurture_health: SignalHealth;    // driven by Signal 2 (Save Rate)
  conversion_health: SignalHealth; // driven by Signal 1 (Search Lift)

  // AI-generated outputs
  ai_narrative: string;
  ai_recommended_actions: string; // JSON array of action strings
  ai_phase_context: string;

  pipeline_risk_detected: boolean;
  created_at: string;
};

// Phase boundary helper — given duration and week, compute phase (1-4)
export function computeSignalPhase(
  weekNumber: number,
  durationWeeks: number
): CampaignPhaseNumber {
  const pct = weekNumber / durationWeeks;
  if (pct <= 0.25) return 1;
  if (pct <= 0.60) return 2;
  if (pct <= 0.80) return 3;
  return 4;
}

// Health computation — determines traffic light for a single signal
// Returns health + whether this is a new flag (vs held from prior week)
export function computeSignalHealth(
  actual: number | null,
  greenThreshold: number,
  amberThreshold: number,
  redThreshold: number,
  phase: CampaignPhaseNumber
): SignalHealth {
  if (actual === null) return "Green"; // no data = no flag
  if (phase === 1) return "Green";     // Phase 1: baseline only, no flags
  if (actual >= greenThreshold) return "Green";
  if (actual > redThreshold) return "Amber";
  return "Red";
}

// KB scope hierarchy: Global → Client → Campaign
// Context injection priority: Campaign (most specific) first
export type KbScope = "Global" | "Client" | "Campaign";

export type KnowledgeDoc = {
  id: string;
  doc_type: KnowledgeDocType;
  market: KnowledgeDocMarket;
  title: string;
  description: string;
  // file_path: Supabase Storage path (e.g. "campaign/{id}/1234_brief.pdf") — internal only
  file_path: string | null;
  // source_url: optional external reference URL
  source_url: string | null;
  // tags: comma-separated (e.g. "Ramadan,Malay,FMCG")
  tags: string;
  // F24 scope fields — added in migration 0013
  kb_scope: KbScope;
  campaign_id: string | null;   // set when kb_scope = 'Campaign'
  client_id: string | null;     // set when kb_scope = 'Campaign' or 'Client'
  active: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Open Architecture Foundations (Features 17D / 17E / 17F) ────────────────
// Sprint 3 — Migration 0008
// Three system-level reference tables. No campaign FK.
// All three tables are internal only. Never surfaced to clients.

// ── F17D — Open Channel Profile Architecture ──────────────────────────────────
// 14 standard channels seeded in migration 0008.
// 8 attributes drive all channel weighting, signal health scoring,
// and channel recommendation across F13, F16B, F18A, F19, F20, F21.

export type ChannelClass      = "Paid" | "Owned" | "Earned" | "Hybrid";
export type AttentionType     = "Active" | "Passive" | "Lean-In" | "Ambient";
export type DwellTimeBand     = "Short" | "Medium" | "Long";
// Short = <30 seconds | Medium = 30 seconds to 3 minutes | Long = 3 minutes+
export type AudienceContext   = "Browsing" | "Searching" | "Social" | "Transit" | "Viewing" | "Reading";
export type ActionAffordance  = "High" | "Medium" | "Low";
export type ContentFormat     = "Video" | "Static" | "Audio" | "Text" | "Interactive" | "Mixed";
export type EngagementMode    = "Passive Consumption" | "Active Engagement" | "Social Sharing" | "Search Intent";
// Extends ChannelRole to include 'All' for channels that serve every funnel stage
export type ChannelFunnelStage = ChannelRole | "All";

export type ChannelProfile = {
  id: string;
  channel_name: string;        // Display name (e.g. 'TikTok')
  channel_slug: string;        // Kebab identifier (e.g. 'tiktok')
  channel_class: ChannelClass;
  attention_type: AttentionType;
  dwell_time_band: DwellTimeBand;
  audience_context: AudienceContext;
  action_affordance: ActionAffordance;
  content_format: ContentFormat;
  engagement_mode: EngagementMode;
  primary_funnel_stage: ChannelFunnelStage;
  is_system_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// ── F17E — Category Attribute Model ───────────────────────────────────────────
// 9 standard category types seeded in migration 0008.
// Drives ICS weighting adjustments, signal threshold calibration,
// and benchmark library filtering.

export type PurchaseFrequency    = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual" | "Infrequent";
export type PurchaseInvolvement  = "Low" | "Medium" | "High";
export type SocialVisibility     = "High" | "Medium" | "Low";
export type RegulatoryStatus     = "Regulated" | "Semi-Regulated" | "Open";
export type DecisionArchitecture = "Individual" | "Household" | "Group" | "B2B Committee";

export type CategoryAttribute = {
  id: string;
  category_name: string;       // e.g. 'FMCG — Food & Beverage'
  category_slug: string;       // e.g. 'fmcg-food-beverage'
  industry_vertical: IndustryCategory;  // reuses existing IndustryCategory type
  purchase_frequency: PurchaseFrequency;
  purchase_involvement: PurchaseInvolvement;
  social_visibility: SocialVisibility;
  regulatory_status: RegulatoryStatus;
  decision_architecture: DecisionArchitecture;
  is_system_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// ── F17F — Market Parameter Architecture ──────────────────────────────────────
// 10 ASEAN markets seeded in migration 0008 (MY, SG, ID, TH, VN, PH, MM, KH, LA, BN).
// confidence_weight: 1.00 = primary market (MY); lower = less directly applicable.
// Used by Benchmark Library and Consumer State Diagnostic for cross-market weighting.
// Internal only — confidence weights never surfaced to clients.

export type DigitalPenetrationBand = "High" | "Medium" | "Low";

export type MarketParameter = {
  id: string;
  market_code: string;          // ISO 3166-1 alpha-2 (e.g. 'MY')
  market_name: string;          // e.g. 'Malaysia'
  region: string;               // 'SEA'
  primary_language: string;     // e.g. 'Malay / English'
  confidence_weight: number;    // 0.35 (lowest) – 1.00 (same market)
  digital_penetration_band: DigitalPenetrationBand;
  mobile_first: boolean;
  is_primary_market: boolean;   // TRUE for MY only
  active: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Cross-Channel Campaign Intelligence Hub (Feature 13) ─────────────────────
// Sprint 3 — Migration 0009
// Internal only. Not surfaced to clients.

// Which channel_profiles are active in a campaign, in what role.
// One record per channel per campaign.
export type CampaignChannel = {
  id: string;
  campaign_id: string;
  channel_profile_id: string;
  channel_role: ChannelRole;
  budget_allocation_pct: number | null;   // % of total campaign budget
  start_week: number | null;             // null = runs from campaign start
  end_week: number | null;               // null = runs to campaign end
  is_primary: boolean;                   // primary channel for its funnel role
  signal_proxy_label: string;            // key metric for this channel (e.g. 'Save Rate %')
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// CampaignChannel with channel_profiles join flattened — for display
export type CampaignChannelWithProfile = CampaignChannel & {
  channel_name: string;
  channel_slug: string;
  channel_class: ChannelClass;
  attention_type: AttentionType;
  dwell_time_band: DwellTimeBand;
  audience_context: AudienceContext;
  action_affordance: ActionAffordance;
  content_format: ContentFormat;
  engagement_mode: EngagementMode;
  profile_funnel_stage: ChannelFunnelStage;  // the channel's default stage (from profile)
};

// Actual per-channel performance data per week.
// signal_proxy_value is the key metric for this channel's funnel contribution.
export type ChannelWeeklyMetric = {
  id: string;
  campaign_id: string;
  campaign_channel_id: string;
  week_number: number;
  week_of: string;
  impressions: number | null;
  reach: number | null;
  engagement_rate_pct: number | null;
  click_rate_pct: number | null;
  signal_proxy_value: number | null;     // key signal metric for this channel's role
  signal_proxy_label: string;            // label describing the proxy value
  channel_health: RagStatus;             // Green / Amber / Red
  notes: string;
  created_at: string;
};

// AI-generated cross-channel intelligence narrative per week.
// idea_integrity_score: 1–5 (is the big idea coherent across all active channels?)
// dominant_funnel_gap: which stage has the biggest shortfall this week.
export type CrossChannelReport = {
  id: string;
  campaign_id: string;
  week_number: number;
  week_of: string;
  ai_narrative: string;
  ai_recommended_actions: string;           // JSON array string
  idea_integrity_score: number | null;      // 1 (fragmented) → 5 (fully coherent)
  idea_integrity_note: string;              // human observation (Janine / strategy lead)
  dominant_funnel_gap: ChannelRole | "None" | null;
  budget_allocated: number | null;          // RM total allocated this week
  budget_deployed: number | null;           // RM total actually deployed
  created_at: string;
  updated_at: string;
};

// ─── Consumer State Transition Rate (Feature F27) ─────────────────────────────
// Sprint 5 — Migration 0013 (consumer_state_readings table)
// Time-series state distribution per campaign per week.
//
// INTERNAL ONLY — state_distribution keys (1-6), dominant_state,
// cstr_vs_prior, and velocity_score are NEVER shown to clients.
// Clients receive only: ai_narrative (plain language, no state codes).

export type ConsumerStateReading = {
  id: string;
  campaign_id: string;
  week_number: number;
  week_of: string;

  // JSONB: { "1": 40.0, "2": 35.0, ..., "6": 1.0 } — sums to ~100
  // Keys are state numbers (string coerced from int by JSON); INTERNAL ONLY
  state_distribution: Record<string, number>;

  // 1–6: highest % state this week — INTERNAL ONLY (state system never shown to clients)
  dominant_state: number | null;

  // JSONB: { "1_to_2": 3.5, "2_to_3": -1.0, ... } — INTERNAL ONLY
  // Positive = forward momentum, negative = regression vs prior week
  // null until 2+ readings exist for this campaign
  cstr_vs_prior: Record<string, number> | null;

  // Composite of all CSTR values — INTERNAL ONLY
  // Positive = audience advancing; negative = stalling/regressing
  velocity_score: number | null;

  // TRUE when no forward movement (delta < 0.5pp) in any transition for 2+ weeks
  state_stall_flag: boolean;
  state_stall_note: string;   // which transition is stalling — INTERNAL ONLY

  // ONLY field shown to client — plain language, no state codes
  ai_narrative: string;

  // 'behaviour-state' | 'manual'
  reading_source: string;

  created_at: string;
};

// ─── Distinctive Brand Asset Intelligence (Feature F29) ───────────────────────
// Sprint 5 — Migration 0013 (brand_assets table)
// Client-level registry of Distinctive Brand Assets (Byron Sharp / Ehrenberg-Bass).
//
// INTERNAL:
//   consistency_score — internal diagnostic; never shown to clients.
//   asset_strength + notes — internal.
// CLIENT sees: asset_name + asset_type only (at onboarding orientation).

export type BrandAssetType     = "Visual" | "Sonic" | "Verbal" | "Experiential";
export type BrandAssetStrength = "Established" | "Building" | "Emerging" | "At Risk";

export type BrandAsset = {
  id: string;
  client_id: string;

  // Asset identity
  asset_name: string;       // e.g. "Red mascot character", "Da-da-dum jingle"
  asset_type: BrandAssetType;
  description: string;      // what the asset is and how it appears — INTERNAL

  // Strength classification
  // Established: >70% association | Building: 40-70% | Emerging: <40% | At Risk: was Established, decaying
  asset_strength: BrandAssetStrength;

  // % of last N campaigns that deployed this asset — INTERNAL
  // null until 2+ campaigns exist for this client
  consistency_score: number | null;

  notes: string;  // Janine's observations — INTERNAL

  active: boolean;
  created_at: string;
  updated_at: string;
};

// ─── F32 — Intelligence Orchestration Layer (Sprint 7) ───────────────────────
// Tracks every prompt-chain execution per campaign.
// INTERNAL ONLY — never surfaced to clients.

export type TriggerType =
  | "BRIEF_SUBMITTED"
  | "SIGNAL_ENTERED"
  | "MARKET_UPDATED"
  | "ATTRIBUTION_ENTERED";

export type OrchestratorStatus =
  | "RUNNING"
  | "COMPLETE"
  | "FAILED"
  | "MDH_QUARANTINE";

export type OrchestrationRun = {
  id: string;
  campaign_id: string;
  trigger_type: TriggerType;
  // Snapshot of input that fired the chain — INTERNAL ONLY
  trigger_data: Record<string, unknown>;
  status: OrchestratorStatus;
  // Step names in completion order
  steps_completed: string[];
  steps_failed: string[];
  // { step_name: error_message } — INTERNAL ONLY
  error_log: Record<string, string>;
  // Single client-safe summary sentence — read by F33 and F31
  chain_summary: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

// ─── F33 — Intelligence Query Activator (Sprint 7) ───────────────────────────
// Janine-operated on-demand extraction. NEVER exposed to clients.
// Client receives only the 4-part finding text (headline/context/implication/recommendation).

// Which stored intelligence domains to route to
export type QueryScope =
  | "signal_delivery"
  | "consumer_behaviour"
  | "brand_momentum"
  | "risk_pipeline"
  | "activation_next_steps"
  | "attribution_roi"
  | "ai_competitive_visibility"
  | "campaign_overview";

// Confidence tier — INTERNAL ONLY (Janine sees, client never does)
export type ConfidenceTier = "High" | "Directional" | "Speculative";

export type DataBasis = {
  component: string;
  table: string;
  record_count: number;
  latest_record_at: string | null;
};

export type IntelligenceQueryResult = {
  query_id: string;
  campaign_id: string;
  query_text: string;
  // ── 4-part client-safe finding ──
  headline: string;       // One sentence — CLIENT SAFE
  context: string;        // 2-3 sentences — CLIENT SAFE
  implication: string;    // 1-2 sentences — CLIENT SAFE
  recommendation: string; // 1-2 sentences — CLIENT SAFE
  // ── Internal fields — NEVER shown to clients ──
  confidence: ConfidenceTier;
  components_used: string[];
  data_basis: DataBasis[];
  scopes_resolved: QueryScope[];
  generated_at: string;
};
