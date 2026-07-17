import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllTeamMembers,
  getBigIdeaPlatform,
  getBusinessOutcomes,
  getCampaign,
  getDashboards,
  getFrameBrief,
  getKillSwitches,
  getPhaseGates,
  getStageBriefs,
  getSignalLogs,
  getIdeaExtensions,
  getClientChannels,
  getSignalThreshold,
  getSignalWeeklyReports,
  getAllChannelProfiles,
  getCampaignChannels,
  getCrossChannelReports,
  getConsumerBehaviourStates,
  getSignalMarketContexts,
  getAttributionRecords,
  getConsumerSnapshot,
  getIqEvaluation,
  getMediaDeliveryRecords,
  getAiBrandVisibilityScore,
  getSocialCurrencyScore,
} from "@/lib/data";
import { Badge, ErrorBanner, gateSignalTone, phaseTone } from "@/app/_components/ui";
import { CampaignInfoSection } from "./_components/CampaignInfoSection";
import { FrameBriefSection } from "./_components/FrameBriefSection";
import { KillSwitchesSection } from "./_components/KillSwitchesSection";
import { StageBriefsSection } from "./_components/StageBriefsSection";
import { PhaseGatesSection } from "./_components/PhaseGatesSection";
import { DashboardSection } from "./_components/DashboardSection";
import { BusinessOutcomesSection } from "./_components/BusinessOutcomesSection";
import { SignalLogSection } from "./_components/SignalLogSection";
import { DiagnosticsSection } from "./_components/DiagnosticsSection";
import { IdeaExtensionsSection } from "./_components/IdeaExtensionsSection";
import { BigIdeaPlatformSection } from "./_components/BigIdeaPlatformSection";
import { SignalIntelligenceSection } from "./_components/SignalIntelligenceSection";
import { CrossChannelSection } from "./_components/CrossChannelSection";
import { ConsumerBehaviourSection } from "./_components/ConsumerBehaviourSection";
import { MarketContextSection } from "./_components/MarketContextSection";
import { AttributionSection } from "./_components/AttributionSection";
import { IntelligenceQuerySection } from "./_components/IntelligenceQuerySection";
import { CampaignReportSection } from "./_components/CampaignReportSection";
import { ConsumerPulseSection } from "./_components/ConsumerPulseSection";
import { ShareBriefWidget } from "./_components/ShareBriefWidget";
import { ShareReportWidget } from "./_components/ShareReportWidget";
import { IqEvaluateSection } from "./_components/IqEvaluateSection";
import { SignalLayer0Section } from "./_components/SignalLayer0Section";
import { AiBrandVisibilitySection } from "./_components/AiBrandVisibilitySection";
import { SocialCurrencySection } from "./_components/SocialCurrencySection";

const sectionLinks = [
  { href: "#info", label: "Campaign" },
  { href: "#frame", label: "FRAME Brief" },
  { href: "#bip", label: "Big Idea Platform" },
  { href: "#iq-evaluate", label: "IQ Evaluate ✦" },
  { href: "#ai-brand-visibility", label: "AI Visibility F23 ✦" },
  { href: "#social-currency", label: "Social Currency F23 ✦" },
  { href: "#kill-switches", label: "Kill Switches" },
  { href: "#stage-briefs", label: "STAGE Briefs" },
  { href: "#phase-gates", label: "Phase Gates" },
  { href: "#signal-layer-0", label: "Layer 0 — MDH ⚿" },
  { href: "#signal-intelligence", label: "Signal Intelligence ⚿" },
  { href: "#cross-channel", label: "Cross-Channel Hub ⚿" },
  { href: "#behaviour-state", label: "Behaviour State ⚿" },
  { href: "#market-context", label: "Market Context ⚿" },
  { href: "#attribution", label: "Attribution ⚿" },
  { href: "#intelligence-query", label: "Intelligence Query ✦" },
  { href: "#consumer-pulse", label: "Consumer Pulse ⚿" },
  { href: "#campaign-report", label: "Campaign Report ✦" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#business-outcomes", label: "Business Outcomes" },
  { href: "#signal-log", label: "Signal Log" },
  { href: "#idea-extensions", label: "Idea Extensions" },
  { href: "#diagnostics", label: "Diagnostics" },
];

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const frame = await getFrameBrief(id);
  if (!frame) notFound();

  const clientChannels = await getClientChannels(campaign.client_id);

  const [killSwitches, stageBriefs, phaseGates, dashboards, businessOutcomes, teamMembers, signalLogs, ideaExtensions, bip, signalThreshold, signalReports, campaignChannels, crossChannelReports, allChannelProfiles, behaviourStates, marketContexts, attributionRecords, consumerSnapshot, iqEvaluation, mdhRecords, aiBrandVisibilityScore, socialCurrencyScore] = await Promise.all([
    getKillSwitches(frame.id),
    getStageBriefs(id),
    getPhaseGates(id),
    getDashboards(id),
    getBusinessOutcomes(id),
    getAllTeamMembers(),
    getSignalLogs(id),
    getIdeaExtensions(id),
    getBigIdeaPlatform(id),
    getSignalThreshold(id),
    getSignalWeeklyReports(id),
    getCampaignChannels(id),
    getCrossChannelReports(id),
    getAllChannelProfiles(),
    getConsumerBehaviourStates(id),
    getSignalMarketContexts(id),
    getAttributionRecords(id),
    getConsumerSnapshot(id),
    getIqEvaluation(id),
    getMediaDeliveryRecords(id),
    getAiBrandVisibilityScore(id),
    getSocialCurrencyScore(id),
  ]);

  const latestSignalWeek = signalReports[0]?.week_number ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/clients/${campaign.client_id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← {campaign.client_name}
        </Link>
        <div className="flex items-start justify-between gap-2 mt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {campaign.industry_profile} · Owner: {campaign.team_member_name ?? "Unassigned"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={phaseTone(campaign.current_phase)}>{campaign.current_phase}</Badge>
            <Badge tone={gateSignalTone(campaign.gate_signal_status)}>{campaign.gate_signal_status}</Badge>
          </div>
        </div>
        <ShareBriefWidget campaignId={id} />
        <ShareReportWidget campaignId={id} />
      </div>

      <ErrorBanner message={error} />

      <nav className="flex flex-wrap gap-1 text-xs">
        {sectionLinks.map((s) => (
          <a key={s.href} href={s.href} className="px-2 py-1 rounded bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900">
            {s.label}
          </a>
        ))}
      </nav>

      <CampaignInfoSection campaign={campaign} teamMembers={teamMembers} />
      <FrameBriefSection campaignId={id} frame={frame} />
      {bip && <BigIdeaPlatformSection campaignId={id} frame={frame} bip={bip} />}
      {bip && (
        <IqEvaluateSection
          campaignId={id}
          bipToplineIdea={bip.topline_idea}
          elevationModeEnabled={frame.elevation_mode_enabled}
          lastEvaluation={iqEvaluation}
        />
      )}
      <AiBrandVisibilitySection campaignId={id} lastScore={aiBrandVisibilityScore} />
      <SocialCurrencySection
        campaignId={id}
        lastScore={socialCurrencyScore}
        currentWeek={latestSignalWeek ?? 1}
      />
      <KillSwitchesSection campaignId={id} frameBriefId={frame.id} killSwitches={killSwitches} />
      <StageBriefsSection
        campaignId={id}
        frameLocked={frame.lock_status === "Locked"}
        frameAnchor={frame.anchor}
        moodRegister={frame.mood}
        stageBriefs={stageBriefs}
      />
      <PhaseGatesSection campaignId={id} phaseGates={phaseGates} />
      <SignalLayer0Section campaignId={id} records={mdhRecords} />
      <SignalIntelligenceSection
        campaignId={id}
        threshold={signalThreshold}
        reports={signalReports}
      />
      <CrossChannelSection
        campaignId={id}
        campaignChannels={campaignChannels}
        channelReports={crossChannelReports}
        allChannelProfiles={allChannelProfiles}
      />
      <ConsumerBehaviourSection
        campaignId={id}
        behaviourStates={behaviourStates}
      />
      <MarketContextSection
        campaignId={id}
        marketContexts={marketContexts}
        latestSignalWeek={latestSignalWeek}
      />
      <AttributionSection
        campaignId={id}
        attributionRecords={attributionRecords}
      />
      <ConsumerPulseSection
        campaignId={id}
        culturalContext={frame.primary_cultural_context}
        industryCategory={frame.industry_category}
        initialSnapshot={consumerSnapshot}
      />
      <IntelligenceQuerySection campaignId={id} campaignName={campaign.name} />
      <CampaignReportSection campaignId={id} campaignName={campaign.name} />
      <DashboardSection campaignId={id} dashboards={dashboards} />
      <BusinessOutcomesSection campaignId={id} campaign={campaign} outcomes={businessOutcomes} />
      <SignalLogSection campaignId={id} signalLogs={signalLogs} phaseGates={phaseGates} />
      <IdeaExtensionsSection
        campaignId={id}
        frame={frame}
        extensions={ideaExtensions}
        clientChannels={clientChannels}
      />
      <DiagnosticsSection
        campaign={campaign}
        frame={frame}
        phaseGates={phaseGates}
        stageBriefs={stageBriefs}
        killSwitches={killSwitches}
        signalLogs={signalLogs}
        dashboards={dashboards}
      />
    </div>
  );
}
