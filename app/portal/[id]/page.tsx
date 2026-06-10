import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, getDashboards } from "@/lib/data";
import { Badge, Card, ragTone } from "@/app/_components/ui";
import type { CampaignPhase, IndustryProfile } from "@/lib/types";

const PHASE_LABELS: Record<IndustryProfile, Record<CampaignPhase, string>> = {
  QSR: {
    Demand: "Getting Noticed",
    Conversion: "Earning the Order",
    Retention: "Keeping Them Coming Back",
    Complete: "Complete",
  },
  B2B: {
    Demand: "Building Awareness",
    Conversion: "Winning the Deal",
    Retention: "Growing the Account",
    Complete: "Complete",
  },
  Retail: {
    Demand: "Sparking Interest",
    Conversion: "Driving the Sale",
    Retention: "Earning Repeat Purchases",
    Complete: "Complete",
  },
  Other: {
    Demand: "Building Awareness",
    Conversion: "Driving Conversion",
    Retention: "Building Loyalty",
    Complete: "Complete",
  },
};

export default async function ClientPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const dashboards = await getDashboards(id);
  const latest = dashboards[0];

  const phaseLabel = PHASE_LABELS[campaign.industry_profile][campaign.current_phase];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-neutral-400">{campaign.client_name}</p>
        <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">Where things stand</p>
            <p className="text-xl font-semibold">{phaseLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-400">Confidence</p>
            <p className="text-2xl font-bold">{Math.round(campaign.confidence_score)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 rounded-md p-3">
            <p className="text-xs text-neutral-400">{campaign.business_outcome_label}</p>
            <p className="text-lg font-semibold">
              {campaign.business_outcome_actual ?? "—"}
              <span className="text-sm font-normal text-neutral-400"> / {campaign.business_outcome_target ?? "—"} target</span>
            </p>
          </div>
          <div className="bg-neutral-50 rounded-md p-3">
            <p className="text-xs text-neutral-400">{campaign.retention_metric_label}</p>
            <p className="text-lg font-semibold">
              {campaign.retention_metric_actual ?? "—"}
              <span className="text-sm font-normal text-neutral-400"> / {campaign.retention_metric_target ?? "—"} target</span>
            </p>
          </div>
        </div>
      </Card>

      {latest ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">This Week — {latest.week_of}</h2>
            <div className="flex gap-1">
              <Badge tone={ragTone(latest.funnel_health_demand)}>●</Badge>
              <Badge tone={ragTone(latest.funnel_health_conversion)}>●</Badge>
              <Badge tone={ragTone(latest.funnel_health_retention)}>●</Badge>
            </div>
          </div>

          <div>
            <p className="text-xs text-neutral-400 mb-1">Decision Needed</p>
            <p className="text-sm">{latest.decision_snapshot || "Nothing needed from you this week."}</p>
          </div>

          {latest.idea_integrity_observation && (
            <div>
              <p className="text-xs text-neutral-400 mb-1">Strategy Note</p>
              <p className="text-sm">{latest.idea_integrity_observation}</p>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-neutral-500">No weekly update yet — check back soon.</p>
        </Card>
      )}

      <Link href={`/campaigns/${campaign.id}`} className="block text-center text-xs text-neutral-400 hover:text-neutral-700">
        Internal team view →
      </Link>
    </div>
  );
}
