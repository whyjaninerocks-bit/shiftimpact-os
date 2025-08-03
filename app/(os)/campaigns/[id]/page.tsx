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
  getLatestConsumerStateReading,
  getBrandAssets,
  getDataPreferences,
  getCascadeRecords,
  getDsemRecords,
  getKolTrackers,
  getBudgetMovements,
  getCategoryClientCount,
  getPredictionAccuracyRecords,
  getClientCampaignBriefs,
  getCampaignLearning,
  getAudienceReplenishment,
  getCompetitiveSignalActive,
} from "@/lib/data";
import { getLatestReviewPlatformScore } from "@/lib/data-review-platform";
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
import { SignalIntelligenceSection, type WeeklyDataContext } from "./_components/SignalIntelligenceSection";
import { CrossChannelSection } from "./_components/CrossChannelSection";
import { ConsumerBehaviourSection } from "./_components/ConsumerBehaviourSection";
import { MarketContextSection } from "./_components/MarketContextSection";
import { AttributionSection } from "./_components/AttributionSection";
import { IntelligenceQuerySection } from "./_components/IntelligenceQuerySection";
import { CampaignReportSection } from "./_components/CampaignReportSection";
import { ConsumerPulseSection } from "./_components/ConsumerPulseSection";
import { ShareBriefWidget } from "./_components/ShareBriefWidget";
import { ShareReportWidget } from "./_components/ShareReportWidget";
import { BackToTop } from "@/app/_components/BackToTop";
import { IqEvaluateSection } from "./_components/IqEvaluateSection";
import { SignalLayer0Section } from "./_components/SignalLayer0Section";
import { AiBrandVisibilitySection } from "./_components/AiBrandVisibilitySection";
import { SocialCurrencySection } from "./_components/SocialCurrencySection";
import { CascadeSection } from "./_components/CascadeSection";
import { DsemSection } from "./_components/DsemSection";
import { ReviewPlatformSection } from "./_components/ReviewPlatformSection";
import { DataSourceSetupSection } from "./_components/DataSourceSetupSection";
import { CstrSection } from "./_components/CstrSection";
import { DbaSection } from "./_components/DbaSection";
import { KolTrackerSection } from "./_components/KolTrackerSection";
import { BudgetMovementSection } from "./_components/BudgetMovementSection";
import { PredictionAccuracySection } from "./_components/PredictionAccuracySection";
import { BrandHealthBatterySection } from "./_components/BrandHealthBatterySection";
import { CreativeFatigueSection } from "./_components/CreativeFatigueSection";
import { MessageSequenceSection } from "./_components/MessageSequenceSection";
import { AudienceReplenishmentSection } from "./_components/AudienceReplenishmentSection";
import { CampaignLearningSection } from "./_components/CampaignLearningSection";
import { SignalHealthSection } from "./_components/SignalHealthSection";
import CampaignOsDigestSection from "./_components/CampaignOsDigestSection";

const sectionGroups = [
  {
    label: "Overview",
    links: [
      { href: "#dashboard", label: "Dashboard" },
      { href: "#campaign-digest", label: "OS Digest ✦" },
      { href: "#campaign-report", label: "Campaign Report ✦" },
      { href: "#intelligence-query", label: "Campaign Intelligence ✦" },
      { href: "#business-outcomes", label: "Business Outcomes" },
      { href: "#signal-log", label: "Signal Log" },
      { href: "#prediction-log", label: "Prediction Log" },
      { href: "#diagnostics", label: "Diagnostics" },
    ],
  },
  {
    label: "Strategy",
    links: [
      { href: "#info", label: "Campaign" },
      { href: "#data-configuration", label: "Data Config" },
      { href: "#frame", label: "FRAME Brief" },
      { href: "#bip", label: "Big Idea Platform" },
      { href: "#iq-evaluate", label: "IQ Evaluate ✦" },
      { href: "#kill-switches", label: "Kill Switches" },
      { href: "#stage-briefs", label: "STAGE Briefs" },
      { href: "#phase-gates", label: "Phase Gates" },
      { href: "#idea-extensions", label: "Channel Briefs" },
      { href: "#kol-tracker", label: "KOL Tracker" },
    ],
  },
  {
    label: "Signal Intel",
    links: [
      { href: "#signal-layer-0", label: "Layer 0 MDH ⚿" },
      { href: "#signal-health", label: "Signal Health F16B ⚿" },
      { href: "#signal-intelligence", label: "Signal Intelligence ⚿" },
      { href: "#cross-channel", label: "Cross-Channel ⚿" },
      { href: "#consumer-state-transition", label: "CSTR F27 ⚿" },
      { href: "#consumer-pulse", label: "Consumer Pulse ⚿" },
      { href: "#behaviour-state", label: "Behaviour State ⚿" },
      { href: "#market-context", label: "Market Context ⚿" },
      { href: "#social-proof-cascade", label: "Cascade F28 ⚿" },
      { href: "#dark-social-dsem", label: "Dark Social F30 ⚿" },
      { href: "#budget-movement", label: "Budget Movement" },
    ],
  },
  {
    label: "Brand Intel",
    links: [
      { href: "#ai-brand-visibility", label: "AI Visibility F23 ✦" },
      { href: "#social-currency", label: "Social Currency F23 ✦" },
      { href: "#review-platform", label: "Review Platform F30 ✦" },
      { href: "#dba-intelligence", label: "Brand Assets F29 ⚿" },
      { href: "#attribution", label: "Attribution ⚿" },
    ],
  },
  {
    label: "Expert Arch",
    links: [
      { href: "#brand-health-battery",    label: "Brand Battery ⚿" },
      { href: "#creative-fatigue",        label: "Creative Fatigue ⚿" },
      { href: "#message-sequence",        label: "Msg Sequence ⚿" },
      { href: "#audience-replenishment",  label: "Replenishment ⚿" },
      { href: "#campaign-learning",       label: "Learning Record ⚿" },
    ],
  },
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

  const [killSwitches, stageBriefs, phaseGates, dashboards, businessOutcomes, teamMembers, signalLogs, ideaExtensions, bip, signalThreshold, signalReports, campaignChannels, crossChannelReports, allChannelProfiles, behaviourStates, marketContexts, attributionRecords, consumerSnapshot, iqEvaluation, mdhRecords, aiBrandVisibilityScore, socialCurrencyScore, latestCstrReading, brandAssets, reviewScore, dataPreferences, cascadeRecords, dsemRecords, kolTrackers, budgetMovements, categoryClientCount, predictionRecords, clientCampaignBriefs, campaignLearning, audienceReplenishment, hasCompetitiveSignal] = await Promise.all([
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
    getLatestConsumerStateReading(id),
    getBrandAssets(campaign.client_id),
    getLatestReviewPlatformScore(id),
    getDataPreferences(id),
    getCascadeRecords(id),
    getDsemRecords(id),
    getKolTrackers(id),
    getBudgetMovements(id),
    getCategoryClientCount(frame.industry_category ?? ""),
    getPredictionAccuracyRecords(id),
    getClientCampaignBriefs(campaign.client_id),
    getCampaignLearning(id),
    getAudienceReplenishment(id),
    getCompetitiveSignalActive(campaign.client_id),
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

      {/* Sticky section nav — grouped scrollable strip */}
      <nav className="sticky top-0 z-20 -mx-4 sm:-mx-6 bg-neutral-50/95 backdrop-blur border-b border-neutral-100 overflow-x-auto scrollbar-hide">
        <div className="flex items-stretch min-w-max px-4 sm:px-6">
          {sectionGroups.map((group, gi) => (
            <div
              key={group.label}
              className={`flex items-center gap-1 py-1.5 px-2 ${gi > 0 ? "border-l border-neutral-200" : ""}`}
            >
              <span className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400 pr-1 whitespace-nowrap select-none">
                {group.label}
              </span>
              {group.links.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-[11px] text-neutral-600 hover:text-neutral-900 hover:border-neutral-400 transition-colors whitespace-nowrap"
                >
                  {s.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* ── OVERVIEW ────────────────────────────────────────────────── */}
      <div id="overview-group" className="flex items-center gap-3 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 whitespace-nowrap">Overview</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
      <DashboardSection campaignId={id} dashboards={dashboards} />
      <CampaignOsDigestSection campaignId={id} />
      <CampaignReportSection campaignId={id} campaignName={campaign.name} />
      <IntelligenceQuerySection campaignId={id} campaignName={campaign.name} />
      <BusinessOutcomesSection campaignId={id} campaign={campaign} outcomes={businessOutcomes} />
      <SignalLogSection
        campaignId={id}
        signalLogs={signalLogs}
        phaseGates={phaseGates}
        campaignName={campaign.name}
        clientName={campaign.client_name ?? ""}
      />
      <PredictionAccuracySection campaignId={id} initialRecords={predictionRecords} />
      <DiagnosticsSection
        campaign={campaign}
        frame={frame}
        phaseGates={phaseGates}
        stageBriefs={stageBriefs}
        killSwitches={killSwitches}
        signalLogs={signalLogs}
        dashboards={dashboards}
      />

      {/* ── STRATEGY ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 whitespace-nowrap">Strategy</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
      <CampaignInfoSection campaign={campaign} teamMembers={teamMembers} />
      <DataSourceSetupSection campaignId={id} initialPrefs={dataPreferences} />
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
      <KillSwitchesSection campaignId={id} frameBriefId={frame.id} killSwitches={killSwitches} />
      <StageBriefsSection
        campaignId={id}
        frameLocked={frame.lock_status === "Locked"}
        frameAnchor={frame.anchor}
        moodRegister={frame.mood}
        clarityStatement={frame.clarity_statement ?? ""}
        stageBriefs={stageBriefs}
        phaseGates={phaseGates}
        activeChannels={frame.active_channels ?? []}
      />
      <PhaseGatesSection campaignId={id} phaseGates={phaseGates} />
      <IdeaExtensionsSection
        campaignId={id}
        frame={frame}
        bip={bip ?? null}
        extensions={ideaExtensions}
        clientChannels={clientChannels}
      />
      <KolTrackerSection campaignId={id} initialKols={kolTrackers} />

      {/* ── SIGNAL INTEL ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 whitespace-nowrap">Signal Intel</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
      <SignalLayer0Section campaignId={id} records={mdhRecords} />
      <SignalHealthSection
        campaignId={id}
        mdhRecords={mdhRecords}
        signalReports={signalReports}
        signalThreshold={signalThreshold}
      />
      <SignalIntelligenceSection
        campaignId={id}
        threshold={signalThreshold}
        reports={signalReports}
        dataContext={{
          failingLogs: signalLogs
            .filter((l) => l.pass === false)
            .map((l) => ({
              signal_label: l.signal_label,
              actual_value: l.actual_value ?? null,
              threshold_value: l.threshold_value ?? null,
              unit: l.unit ?? null,
            })),
          nextGateName: phaseGates.find((g) => g.gate_outcome !== "Passed")?.gate_name ?? null,
          pendingPredictionCount: predictionRecords.filter((r) => r.verdict === "Pending").length,
          recentBudgetFlags: budgetMovements
            .slice(0, 5)
            .map((b) => ({ channel: b.channel, movement_type: b.movement_type })),
        } satisfies WeeklyDataContext}
      />
      <CrossChannelSection
        campaignId={id}
        campaignChannels={campaignChannels}
        channelReports={crossChannelReports}
        allChannelProfiles={allChannelProfiles}
      />
      <CstrSection
        campaignId={id}
        lastReading={latestCstrReading}
        currentWeek={latestSignalWeek ?? 1}
      />
      <ConsumerPulseSection
        campaignId={id}
        culturalContext={frame.primary_cultural_context}
        industryCategory={frame.industry_category}
        initialSnapshot={consumerSnapshot}
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
      <CascadeSection
        campaignId={id}
        records={cascadeRecords}
        currentWeek={latestSignalWeek ?? 1}
      />
      <DsemSection
        campaignId={id}
        records={dsemRecords}
        currentWeek={latestSignalWeek ?? 1}
      />
      <BudgetMovementSection
        campaignId={id}
        initialRows={budgetMovements}
        activeChannels={frame.active_channels ?? []}
      />

      {/* ── BRAND INTEL ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 whitespace-nowrap">Brand Intel</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
      <AiBrandVisibilitySection campaignId={id} lastScore={aiBrandVisibilityScore} />
      <SocialCurrencySection
        campaignId={id}
        lastScore={socialCurrencyScore}
        currentWeek={latestSignalWeek ?? 1}
      />
      <ReviewPlatformSection
        campaignId={id}
        lastScore={reviewScore}
        currentWeek={latestSignalWeek ?? 1}
      />
      <DbaSection
        campaignId={id}
        clientId={campaign.client_id}
        frameBriefId={frame.id}
        initialAssets={brandAssets}
        distinctiveAssetsDeployed={frame.distinctive_assets_deployed ?? ""}
      />
      <AttributionSection
        campaignId={id}
        attributionRecords={attributionRecords}
        industryCategory={frame.industry_category ?? "Other"}
        categoryClientCount={categoryClientCount}
      />

      {/* ── EXPERT ARCHITECTURE ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 whitespace-nowrap">Expert Architecture</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
      <BrandHealthBatterySection
        campaignId={id}
        clientId={campaign.client_id}
        currentDemandPct={frame.demand_investment_pct ?? null}
        clientCampaigns={clientCampaignBriefs}
      />
      <CreativeFatigueSection
        mdhRecords={mdhRecords}
        hasCompetitiveSignal={hasCompetitiveSignal}
      />
      <MessageSequenceSection
        stageBriefs={stageBriefs}
        frameLocked={frame.lock_status === "Locked"}
      />
      <AudienceReplenishmentSection
        campaignId={id}
        records={audienceReplenishment}
        latestSignalWeek={latestSignalWeek ?? 1}
      />
      <CampaignLearningSection
        campaignId={id}
        campaignName={campaign.name}
        existingRecord={campaignLearning}
      />

      <BackToTop />
    </div>
  );
}
