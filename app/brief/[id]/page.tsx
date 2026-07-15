// app/brief/[id]/page.tsx
// Client-facing campaign brief intake.
// Route: /brief/[id]
//
// Clients fill in FRAME Brief + Big Idea Platform fields.
// Saves directly to the same Supabase tables via /api/brief-save.
//
// BOUNDARY: Input fields only. No ICS scores, no state codes, no internal analytics.
// No auth required for beta — campaign_id + record IDs are the access key.

import { notFound } from "next/navigation";
import { getCampaign, getFrameBrief, getBigIdeaPlatform } from "@/lib/data";
import { BriefIntakeForm } from "./_components/BriefIntakeForm";

export const dynamic = "force-dynamic";

export default async function BriefIntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [campaign, frame, bip] = await Promise.all([
    getCampaign(id),
    getFrameBrief(id),
    getBigIdeaPlatform(id),
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
          <p className="text-sm text-neutral-500 mt-2">
            Fill in the sections below. Your inputs are saved directly to the
            campaign workspace and visible to your ShiftImpact strategy lead
            immediately after saving.
          </p>
        </div>

        <BriefIntakeForm
          campaignId={id}
          frame={frame}
          bip={bip}
        />
      </main>
    </div>
  );
}
