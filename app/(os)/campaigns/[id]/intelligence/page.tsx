import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCampaign,
  getCreativeFormatReadsForCampaign,
  getBrandCommerceSignalReadAgencySafe,
  getCampaignLearning,
  getPlatformBenchmarks,
} from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, SectionTitle } from "@/app/_components/ui";
import {
  ModuleStatusSummary,
  CreativeIntelligenceCard,
  BrandCommerceModuleCard,
  CulturalRadarModuleCard,
  PlatformEvidenceCard,
  LearningMemoryCard,
  PilotSimulationCard,
  FutureIntegrationNote,
  type ModuleSummaryRow,
} from "./_components/IntelligenceModuleCards";

// v0.1 demo display config only. Not entitlement or access control.
// Replace later with campaign/client module entitlement model.
// (No campaign-specific overrides exist yet — every campaign gets the same
// data-driven status derivation below; this comment marks where a future
// entitlement model would hook in.)

export default async function AgencyIntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [creativeReads, brandCommerceRead, learningRecord, benchmarks] = await Promise.all([
    getCreativeFormatReadsForCampaign(id),
    getBrandCommerceSignalReadAgencySafe(id),
    getCampaignLearning(id),
    getPlatformBenchmarks().catch(() => []),
  ]);

  // Cultural Radar — no existing shaped fetcher for this campaign-scoped
  // check; direct admin read here rather than adding new infrastructure.
  const supabase = createAdminClient();
  const { count: culturalCount } = await supabase
    .from("campaign_cultural_signal_assessments")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id);
  const hasCulturalRadar = (culturalCount ?? 0) > 0;

  const summaryRows: ModuleSummaryRow[] = [
    { label: "Creative Intelligence", status: creativeReads.length ? "agency_preview" : "available_add_on", href: "#creative-intelligence" },
    { label: "Brand-Commerce Signal Read", status: brandCommerceRead ? "agency_preview" : "available_add_on", href: "#brand-commerce" },
    { label: "Cultural Radar", status: hasCulturalRadar ? "active" : "available_add_on", href: "#cultural-radar" },
    { label: "Platform Evidence", status: "available_add_on", href: "#platform-evidence" },
    { label: "Learning Memory", status: learningRecord ? "agency_preview" : "available_add_on", href: "#learning-memory" },
    { label: "Brand Power Threshold", status: "pilot_simulation", href: "#brand-power-threshold" },
    { label: "Promotion Dependency", status: "pilot_simulation", href: "#promotion-dependency" },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link href={`/campaigns/${id}`} className="text-sm text-neutral-500 hover:text-neutral-800">
          &larr; Back to campaign workspace
        </Link>
        <div className="mt-2 flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Agency Intelligence</h1>
          <span className="text-sm text-neutral-500">{campaign.client_name}</span>
        </div>
        <p className="mt-1 text-sm text-neutral-600 max-w-2xl">
          A standalone read of what this campaign&apos;s intelligence modules currently show &mdash;
          Creative Intelligence, Brand-Commerce Signal Read, Cultural Radar, and supporting evidence.
          This is not the Marketing Effectiveness workflow and does not include Client Preview.
        </p>
      </div>

      <ModuleStatusSummary rows={summaryRows} />

      <div>
        <SectionTitle>Modules</SectionTitle>
        <div className="grid grid-cols-1 gap-4">
          <CreativeIntelligenceCard
            reads={creativeReads}
            hasCulturalRadar={hasCulturalRadar}
            hasBrandCommerce={!!brandCommerceRead}
          />
          <BrandCommerceModuleCard read={brandCommerceRead} />
          <CulturalRadarModuleCard hasData={hasCulturalRadar} />
          <PlatformEvidenceCard hasBenchmarks={benchmarks.length > 0} />
          <LearningMemoryCard hasRecord={!!learningRecord} />
        </div>
      </div>

      <div>
        <SectionTitle>Next-Layer Pilot Simulations</SectionTitle>
        <p className="text-sm text-neutral-600 mb-3 max-w-2xl">
          Not built. These two cards show what a future pilot would need to define &mdash; they carry
          no live data and compute nothing.
        </p>
        <div className="grid grid-cols-1 gap-4">
          <PilotSimulationCard
            copy={{
              title: "Brand Power Threshold",
              question: "Has this campaign moved brand power enough to hold demand without ongoing promotion?",
              currentRead: "No live measurement exists today. The Brand-Commerce Signal Read above shows a point-in-time strategist classification, not a threshold or trend.",
              dataNeeded: "A consistent brand tracking series over time (awareness, consideration, or equivalent), tied to this campaign's activity windows.",
              pilotWouldDefine: "What threshold, over what time horizon, in what market, would count as durable brand power for this category.",
              doNotClaim: "This is not a live score. No threshold has been computed, calibrated, or validated for any campaign.",
              honestyLine: "Shown here to make the next-layer question visible, not to claim it is answered.",
            }}
          />
          <PilotSimulationCard
            copy={{
              title: "Promotion Dependency",
              question: "How much of this campaign's commerce outcome depends on active promotion versus underlying brand demand?",
              currentRead: "No live measurement exists today. Promotion pressure notes may appear as strategist commentary inside the Brand-Commerce Signal Read above, but nothing here computes a dependency ratio.",
              dataNeeded: "Commerce outcome data segmented by promotion-active versus promotion-inactive periods for this campaign.",
              pilotWouldDefine: "What counts as a promotion event, what counts as baseline demand, and what ratio would signal healthy versus risky dependency.",
              doNotClaim: "This is not a live score. No dependency ratio has been computed for any campaign.",
              honestyLine: "Shown here to make the next-layer question visible, not to claim it is answered.",
            }}
          />
        </div>
      </div>

      <Card>
        <FutureIntegrationNote />
      </Card>
    </main>
  );
}
