// app/brief/[id]/page.tsx
// Client-facing campaign brief intake.
// Route: /brief/[id]
//
// Clients fill in:
//   - Active channels (Tab 1)
//   - Campaign KPIs + budget (Tab 2)
//   - Brand Assets / CI / RFP (Tab 3)
//   - FRAME Brief strategic fields (Tab 4)
//   - Big Idea Platform (Tab 5)
// Tab 6 (Discipline Briefs) shows ShiftImpact-generated channel briefs (read-only).
//
// BOUNDARY: Input fields only. No ICS scores, no state codes, no internal analytics.
// No auth required for beta — campaign_id + record IDs are the access key.

import { notFound } from "next/navigation";
import { getCampaign, getFrameBrief, getBigIdeaPlatform, getStageBriefs } from "@/lib/data";
import { BriefIntakeForm } from "./_components/BriefIntakeForm";

export const dynamic = "force-dynamic";

export default async function BriefIntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [campaign, frame, bip, stageBriefs] = await Promise.all([
    getCampaign(id),
    getFrameBrief(id),
    getBigIdeaPlatform(id),
    getStageBriefs(id),
  ]);

  if (!campaign) notFound();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Minimal header — no internal nav */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <span className="font-bold tracking-tight text-lg">
            ShiftImpact <span className="text-neutral-400 font-normal">OS</span>
          </span>
          <span className="text-xs text-neutral-400">Campaign Brief Intake</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Campaign header */}
        <div className="border-b border-neutral-200 pb-6">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">
            Campaign Brief
          </p>
          <h1 className="text-2xl font-bold text-neutral-900">{campaign.name}</h1>
          {campaign.client_name && (
            <p className="text-sm text-neutral-500 mt-0.5">{campaign.client_name}</p>
          )}
          <p className="text-sm text-neutral-500 mt-2">
            Fill in the sections below. Your inputs are saved directly to the
            campaign workspace and visible to your ShiftImpact strategy lead
            immediately after saving.
          </p>
        </div>

        <BriefIntakeForm
          campaignId={id}
          campaignName={campaign.name}
          frame={frame}
          bip={bip}
          businessOutcomeLabel={campaign.business_outcome_label ?? "Business Outcome"}
          businessOutcomeTarget={campaign.business_outcome_target ?? null}
          retentionLabel={campaign.retention_metric_label ?? "Retention Metric"}
          retentionTarget={campaign.retention_metric_target ?? null}
          clientName={campaign.client_name ?? ""}
          stageBriefs={stageBriefs}
        />
      </main>
    </div>
  );
}
