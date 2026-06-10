import { NextResponse } from "next/server";
import {
  getBusinessOutcomes,
  getCampaignsOverview,
  getDashboards,
  getKillSwitches,
  getOsRules,
  getPhaseGates,
  getStageBriefs,
} from "@/lib/data";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const secret = process.env.REVIEW_API_SECRET;
  if (secret) {
    const header = request.headers.get("x-review-secret");
    if (header !== secret) return unauthorized();
  }

  const [campaigns, osRules] = await Promise.all([getCampaignsOverview(), getOsRules()]);
  const reviewRule = osRules.find((r) => r.rule_name === "Weekly Scheduled Review") ?? null;

  const activeCampaigns = campaigns.filter((c) => c.status === "Active");

  const campaignContexts = await Promise.all(
    activeCampaigns.map(async (campaign) => {
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

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    review_rule: reviewRule,
    campaigns: campaignContexts,
  });
}
