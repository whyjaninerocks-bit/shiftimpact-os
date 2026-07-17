import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AttributionRecord,
  BigIdeaPlatform,
  BrandMomentumScore,
  BusinessOutcome,
  CampaignDashboard,
  ConsumerBehaviourState,
  ConsumerIntelligenceSnapshot,
  SignalMarketContext,
  CampaignOverview,
  Client,
  ClientWithRollups,
  FrameBrief,
  GateTemplate,
  KillSwitch,
  OsRule,
  PhaseGate,
  StageBrief,
  TeamMember,
  TeamMemberWithRollups,
  GateSignalLog,
  ClientChannel,
  ClientSignalSource,
  IdeaExtension,
  SignalThreshold,
  SignalWeeklyReport,
  // Feature 13 — Sprint 3
  ChannelProfile,
  CampaignChannelWithProfile,
  ChannelWeeklyMetric,
  CrossChannelReport,
  // Sprint 18
  IqEvaluation,
  MediaDeliveryRecord,
  // Sprint 19
  AiBrandVisibilityScore,
  // Sprint 20
  SocialCurrencyScore,
  // Sprint 21 — F27
  ConsumerStateReading,
  // Sprint 22 — F29
  BrandAsset,
} from "@/lib/types";

export async function getClients(): Promise<ClientWithRollups[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients_with_rollups")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as ClientWithRollups[];
}

export async function getClient(id: string): Promise<ClientWithRollups | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients_with_rollups")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ClientWithRollups | null;
}

export async function getCampaignsOverview(): Promise<CampaignOverview[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns_overview")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as CampaignOverview[];
}

export async function getCampaignsForClient(clientId: string): Promise<CampaignOverview[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns_overview")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as CampaignOverview[];
}

export async function getCampaign(id: string): Promise<CampaignOverview | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaigns_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CampaignOverview | null;
}

export async function getFrameBrief(campaignId: string): Promise<FrameBrief | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("frame_briefs")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data as FrameBrief | null;
}

export async function getKillSwitches(frameBriefId: string): Promise<KillSwitch[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("kill_switches")
    .select("*")
    .eq("frame_brief_id", frameBriefId)
    .order("created_at");
  if (error) throw error;
  return data as KillSwitch[];
}

export async function getStageBriefs(campaignId: string): Promise<StageBrief[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stage_briefs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("stage")
    .order("created_at");
  if (error) throw error;
  return data as StageBrief[];
}

export async function getPhaseGates(campaignId: string): Promise<PhaseGate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("phase_gates")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sequence_order");
  if (error) throw error;
  return data as PhaseGate[];
}

export async function getGateTemplates(): Promise<GateTemplate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gate_templates")
    .select("*")
    .order("sequence_order");
  if (error) throw error;
  return data as GateTemplate[];
}

export async function getDashboards(campaignId: string): Promise<CampaignDashboard[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_dashboards")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_of", { ascending: false });
  if (error) throw error;
  return data as CampaignDashboard[];
}

export async function getBusinessOutcomes(campaignId: string): Promise<BusinessOutcome[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_outcomes")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_of", { ascending: false });
  if (error) throw error;
  return data as BusinessOutcome[];
}

export async function getTeamMembers(): Promise<TeamMemberWithRollups[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("team_with_rollups")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as TeamMemberWithRollups[];
}

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("team_members").select("*").order("name");
  if (error) throw error;
  return data as TeamMember[];
}

export async function getOsRules(): Promise<OsRule[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("os_rules")
    .select("*")
    .order("rule_type")
    .order("rule_name");
  if (error) throw error;
  return data as OsRule[];
}

export async function getAllClientsBasic(): Promise<Client[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) throw error;
  return data as Client[];
}

export async function getSignalLogs(campaignId: string): Promise<GateSignalLog[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gate_signal_log")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as GateSignalLog[];
}

export async function getClientChannels(clientId: string): Promise<ClientChannel[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_channels")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("channel_category")
    .order("channel_name");
  if (error) throw error;
  return data as ClientChannel[];
}

export async function getClientSignalSources(clientId: string): Promise<ClientSignalSource[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_signal_sources")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("source_name");
  if (error) throw error;
  return data as ClientSignalSource[];
}

export async function getIdeaExtensions(campaignId: string): Promise<IdeaExtension[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("idea_extensions")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("channel_category")
    .order("channel_name");
  if (error) throw error;
  return data as IdeaExtension[];
}

// ─── Big Idea Platform ────────────────────────────────────────────────────────
// Sprint 1. One BIP per campaign (UNIQUE constraint on campaign_id).
// Migration 0005 seeds a Draft row for all existing campaigns.

export async function getBigIdeaPlatform(campaignId: string): Promise<BigIdeaPlatform | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("big_idea_platforms")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data as BigIdeaPlatform | null;
}

// ─── Signal Intelligence (Feature 12 — Sprint 2) ──────────────────────────────
// Internal only. Never surfaced in Client Interface.

export async function getSignalThreshold(
  campaignId: string
): Promise<SignalThreshold | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signal_thresholds")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data as SignalThreshold | null;
}

export async function getSignalWeeklyReports(
  campaignId: string
): Promise<SignalWeeklyReport[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signal_weekly_reports")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: false });
  if (error) throw error;
  return data as SignalWeeklyReport[];
}

// ─── Cross-Channel Campaign Intelligence Hub (Feature 13 — Sprint 3) ──────────
// All functions: internal access only. Never surfaced to clients.

// All active channel_profiles (system reference table — for Add Channel dropdown)
export async function getAllChannelProfiles(): Promise<ChannelProfile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("channel_profiles")
    .select("*")
    .eq("active", true)
    .order("primary_funnel_stage")
    .order("channel_name");
  if (error) throw error;
  return data as ChannelProfile[];
}

// Campaign channel assignments with channel_profile data joined and flattened
export async function getCampaignChannels(
  campaignId: string
): Promise<CampaignChannelWithProfile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_channels")
    .select(`
      *,
      channel_profiles (
        channel_name, channel_slug, channel_class,
        attention_type, dwell_time_band, audience_context,
        action_affordance, content_format, engagement_mode,
        primary_funnel_stage
      )
    `)
    .eq("campaign_id", campaignId)
    .eq("active", true)
    .order("channel_role")
    .order("is_primary", { ascending: false });
  if (error) throw error;

  // Flatten nested channel_profiles object onto the parent record
  return (data ?? []).map((row: any) => {
    const p = row.channel_profiles ?? {};
    const { channel_profiles: _, ...rest } = row;
    return {
      ...rest,
      channel_name: p.channel_name ?? "",
      channel_slug: p.channel_slug ?? "",
      channel_class: p.channel_class ?? "Paid",
      attention_type: p.attention_type ?? "Passive",
      dwell_time_band: p.dwell_time_band ?? "Short",
      audience_context: p.audience_context ?? "Browsing",
      action_affordance: p.action_affordance ?? "Medium",
      content_format: p.content_format ?? "Mixed",
      engagement_mode: p.engagement_mode ?? "Passive Consumption",
      profile_funnel_stage: p.primary_funnel_stage ?? "Demand",
    } as CampaignChannelWithProfile;
  });
}

// Weekly metrics for all channels in a campaign for a specific week
export async function getChannelWeeklyMetrics(
  campaignId: string,
  weekNumber: number
): Promise<ChannelWeeklyMetric[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("channel_weekly_metrics")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("week_number", weekNumber);
  if (error) throw error;
  return data as ChannelWeeklyMetric[];
}

// All cross-channel reports for a campaign (most recent first)
export async function getCrossChannelReports(
  campaignId: string
): Promise<CrossChannelReport[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cross_channel_reports")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: false });
  if (error) throw error;
  return data as CrossChannelReport[];
}

// ─── Signal Market Context (Feature 16C — Sprint 4) ──────────────────────────
// Load the market context record for a specific campaign week (null if not saved yet).
export async function getSignalMarketContext(
  campaignId: string,
  weekNumber: number
): Promise<SignalMarketContext | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signal_market_contexts")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("week_number", weekNumber)
    .maybeSingle();
  if (error) throw error;
  return data as SignalMarketContext | null;
}

// All market context records for a campaign (most recent first).
export async function getSignalMarketContexts(
  campaignId: string
): Promise<SignalMarketContext[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signal_market_contexts")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SignalMarketContext[];
}

// ─── Attribution Records (Feature 14B — Sprint 4) ─────────────────────────────
// All attribution records for a campaign, most recent week first.
export async function getAttributionRecords(
  campaignId: string
): Promise<AttributionRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("attribution_records")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: false })
    .order("channel_name");
  if (error) throw error;
  return (data ?? []) as AttributionRecord[];
}

// ─── Brand Momentum Score (Feature 19 — Sprint 4) ────────────────────────────
// All BMS records for a client, most recent period first.
export async function getBrandMomentumScores(
  clientId: string
): Promise<BrandMomentumScore[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brand_momentum_scores")
    .select("*")
    .eq("client_id", clientId)
    .order("period_start", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrandMomentumScore[];
}

// ─── Consumer Behaviour State (Feature 18A — Sprint 3) ───────────────────────
// All behaviour state records for a campaign, most recent first.
// Internal only — never passed to the client portal.
export async function getConsumerBehaviourStates(
  campaignId: string
): Promise<ConsumerBehaviourState[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("consumer_behaviour_states")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConsumerBehaviourState[];
}

// ─── Consumer Intelligence Snapshot (Feature 34 — Sprint 12) ─────────────────
// Returns the most recent snapshot for this campaign.
// Returns null if no pulse has been run yet.
// INTERNAL ONLY — never passed to /brief/[id] or any client route.
export async function getConsumerSnapshot(
  campaignId: string
): Promise<ConsumerIntelligenceSnapshot | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("consumer_intelligence_snapshots")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as ConsumerIntelligenceSnapshot | null;
}

// ── Campaign Intelligence Report (F31) — client-safe view ─────────────────────
// Returns executive_summary + client-safe findings only.
// NEVER exposes: findings[].confidence, findings[].components_used,
//               findings[].scopes_resolved, or report_data internals.

export interface CampaignReportClientFinding {
  query_id: string;
  headline: string;
  context: string;
  implication: string;
  recommendation: string;
  generated_at: string;
}

export interface CampaignReportClientView {
  id: string;
  report_label: string;
  executive_summary: string;
  findings: CampaignReportClientFinding[];
  status: string;
  report_week: number;
  created_at: string;
}

// ─── IQ Evaluation (F-IQ) ────────────────────────────────────────────────────
// Returns the most recent IQ evaluation for this campaign (null if none run yet).
// INTERNAL ONLY — never passed to any client-facing route.
export async function getIqEvaluation(
  campaignId: string
): Promise<IqEvaluation | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("iq_evaluations")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as IqEvaluation | null;
}

// ─── Signal Layer 0 — Media Delivery Health (Sprint 18) ──────────────────────
// All MDH weekly records for a campaign, most recent first.
// INTERNAL ONLY — never passed to any client-facing route.
export async function getMediaDeliveryRecords(
  campaignId: string
): Promise<MediaDeliveryRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signal_media_delivery")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MediaDeliveryRecord[];
}

// ─── F23 — AI Brand Visibility Layer (Sprint 19) ─────────────────────────────
// Most recent AI Brand Visibility score for a campaign.
// INTERNAL ONLY — eligibility_score, trust gaps and band never exposed to portal.
export async function getAiBrandVisibilityScore(
  campaignId: string
): Promise<AiBrandVisibilityScore | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ai_brand_visibility_scores")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as AiBrandVisibilityScore | null;
}

// ─── F23 Phase 2 — Social Currency Index (Sprint 20) ─────────────────────────
// Most recent SCI score for a campaign.
// sci_score + trend_direction + ai_narrative are client-shareable;
// dimension scores and build_action are INTERNAL ONLY.
export async function getSocialCurrencyScore(
  campaignId: string
): Promise<SocialCurrencyScore | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("social_currency_scores")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as SocialCurrencyScore | null;
}

// ─── F27 — Consumer State Transition Rate (Sprint 21) ────────────────────────
// Most recent consumer_state_reading for a campaign.
// state_distribution, dominant_state, cstr_vs_prior, velocity_score: INTERNAL ONLY
// ai_narrative: client-shareable
export async function getLatestConsumerStateReading(
  campaignId: string
): Promise<ConsumerStateReading | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("consumer_state_readings")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as ConsumerStateReading | null;
}

// ─── F29 — Distinctive Brand Assets (Sprint 22) ───────────────────────────────
// All active brand assets for a client (ordered by type, then creation date).
// ALL fields INTERNAL ONLY — consistency_score computed in future sprint.
export async function getBrandAssets(
  clientId: string
): Promise<BrandAsset[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brand_assets")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("asset_type", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as BrandAsset[];
}

export async function getLatestCampaignReport(
  campaignId: string
): Promise<CampaignReportClientView | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_reports")
    .select("id, report_label, executive_summary, findings, status, report_week, created_at")
    .eq("campaign_id", campaignId)
    .in("status", ["ready", "exported"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Strip internal fields — confidence, components_used, scopes_resolved are INTERNAL ONLY
  const clientFindings: CampaignReportClientFinding[] = (
    (data.findings as Record<string, unknown>[]) ?? []
  ).map((f) => ({
    query_id: String(f.query_id ?? ""),
    headline: String(f.headline ?? ""),
    context: String(f.context ?? ""),
    implication: String(f.implication ?? ""),
    recommendation: String(f.recommendation ?? ""),
    generated_at: String(f.generated_at ?? ""),
  }));

  return {
    id: data.id,
    report_label: data.report_label,
    executive_summary: data.executive_summary ?? "",
    findings: clientFindings,
    status: data.status,
    report_week: data.report_week ?? 0,
    created_at: data.created_at,
  };
}
