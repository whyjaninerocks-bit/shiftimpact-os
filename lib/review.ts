import {
  getBusinessOutcomes,
  getCampaignsOverview,
  getDashboards,
  getKillSwitches,
  getOsRules,
  getPhaseGates,
  getStageBriefs,
} from "@/lib/data";
import type {
  BusinessOutcome,
  CampaignDashboard,
  CampaignOverview,
  KillSwitch,
  OsRule,
  PhaseGate,
  StageBrief,
} from "@/lib/types";

export type CampaignReviewContext = {
  campaign: CampaignOverview;
  stage_briefs: StageBrief[];
  phase_gates: PhaseGate[];
  kill_switches: KillSwitch[];
  dashboards: CampaignDashboard[];
  business_outcomes: BusinessOutcome[];
};

export type ReviewContext = {
  generated_at: string;
  review_rule: OsRule | null;
  campaigns: CampaignReviewContext[];
};

// Assembles everything a weekly review needs: every active campaign's
// stage briefs, phase gates, kill switches, dashboards and business
// outcomes, plus the "Weekly Scheduled Review" OS Rule (owned_fields config).
export async function buildReviewContext(): Promise<ReviewContext> {
  const [campaigns, osRules] = await Promise.all([getCampaignsOverview(), getOsRules()]);
  const reviewRule = osRules.find((r) => r.rule_name === "Weekly Scheduled Review") ?? null;

  const activeCampaigns = campaigns.filter((c) => c.status === "Active");

  const campaignContexts = await Promise.all(
    activeCampaigns.map(async (campaign): Promise<CampaignReviewContext> => {
      const [stageBriefs, phaseGates, dashboards, businessOutcomes, killSwitches] =
        await Promise.all([
          getStageBriefs(campaign.id),
          getPhaseGates(campaign.id),
          getDashboards(campaign.id),
          getBusinessOutcomes(campaign.id),
          campaign.frame_brief_id ? getKillSwitches(campaign.frame_brief_id) : Promise.resolve([]),
        ]);

      return {
        campaign,
        stage_briefs: stageBriefs,
        phase_gates: phaseGates,
        kill_switches: killSwitches,
        dashboards,
        business_outcomes: businessOutcomes,
      };
    }),
  );

  return {
    generated_at: new Date().toISOString(),
    review_rule: reviewRule,
    campaigns: campaignContexts,
  };
}
