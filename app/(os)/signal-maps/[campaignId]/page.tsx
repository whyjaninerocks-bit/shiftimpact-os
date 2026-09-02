// app/(os)/signal-maps/[campaignId]/page.tsx
// Outcome-Led Signal Mapping — internal admin editor for one campaign.
// Internal only. Page access enforced by middleware.ts; the save/status
// mutations in lib/actions.ts additionally call assertInternalSession().

import { notFound } from "next/navigation";
import Link from "next/link";
import { getCampaign, getFrameBrief, getActiveCampaignSignalMap, getCampaignSignalMapHistory, getSignalVocabulary } from "@/lib/data";
import { getCategoryAttributes } from "@/lib/actions";
import { SectionTitle, Badge } from "@/app/_components/ui";
import { SignalMapEditor } from "./_components/SignalMapEditor";

export default async function SignalMapEditorPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const campaign = await getCampaign(campaignId);
  if (!campaign) notFound();

  const [frameBrief, categories, vocabulary, activeMap, history] = await Promise.all([
    getFrameBrief(campaignId),
    getCategoryAttributes(),
    getSignalVocabulary(),
    getActiveCampaignSignalMap(campaignId),
    getCampaignSignalMapHistory(campaignId),
  ]);

  return (
    <div>
      <div className="mb-5">
        <Link href="/signal-maps" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Signal Maps
        </Link>
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 mt-2 mb-1">Internal only</p>
        <SectionTitle>{campaign.name}</SectionTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span>{campaign.client_name}</span>
          <span className="text-neutral-300">·</span>
          <span>
            Business outcome: <span className="font-medium text-neutral-700">{campaign.business_outcome_label}</span>
          </span>
          {frameBrief?.industry_category && (
            <>
              <span className="text-neutral-300">·</span>
              <Badge tone="neutral">FRAME category: {frameBrief.industry_category}</Badge>
            </>
          )}
        </div>
      </div>

      <SignalMapEditor
        campaignId={campaignId}
        businessOutcomeLabel={campaign.business_outcome_label}
        categories={categories}
        vocabulary={vocabulary}
        activeMap={activeMap}
        history={history}
      />
    </div>
  );
}
