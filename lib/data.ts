import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BusinessOutcome,
  CampaignDashboard,
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
