export type IndustryProfile = "QSR" | "B2B" | "Retail" | "Other";

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

export type LockStatus = "Draft" | "Locked";
export type IcsThreshold = "Advance" | "Conditional" | "Rework" | "Stop";

export type FrameBrief = {
  id: string;
  campaign_id: string;
  force: string;
  role: string;
  anchor: string;
  mood: string;
  expression: string;
  clarity_statement: string;
  ics_cultural_fit: number;
  ics_business_alignment: number;
  ics_audience_tension: number;
  ics_executional_coherence: number;
  ics_measurability: number;
  ics_scalability: number;
  ics_weighted_total: number;
  ics_any_dimension_blocker: boolean;
  ics_threshold: IcsThreshold;
  lock_status: LockStatus;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

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

export type OsRule = {
  id: string;
  rule_name: string;
  rule_type: "Escalation" | "Scoring" | "Gate Permission" | "Scheduled Review" | "Configuration";
  description: string;
  config: Record<string, unknown>;
  active: boolean;
  created_at: string;
};

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

// ─── Client Channel Registry ───────────────────────────────────────────────

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

// ─── Client Signal Source Library ──────────────────────────────────────────

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

// ─── Idea Extensions ───────────────────────────────────────────────────────

export type IdeaExtensionStatus = "Draft" | "Ready" | "Approved";

export type IdeaExtension = {
  id: string;
  campaign_id: string;
  channel_name: string;
  channel_category: ChannelCategory;
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
