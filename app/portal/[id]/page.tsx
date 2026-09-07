import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCampaign,
  getDashboards,
  getFrameBrief,
  getIdeaExtensions,
  getLatestCampaignReport,
  getSignalWeeklyReports,
  getPhaseGates,
  getPredictionAccuracyClientSafe,
  getCategorySignalFramework,
  getBrandMomentumClientSafe,
  getGuardrailsClientSafe,
  getSignalThresholdsClientSafe,
  getCampaignReportHistoryClientSafe,
  getChannelHealthClientSafe,
  getRecentReportsForCompliance,
  ensureComplianceItems,
  getComplianceItems,
  getComplianceRecordClientSafe,
  getCategoryBenchmarksClientSafe,
} from "@/lib/data";
import { Badge, Card, ragTone } from "@/app/_components/ui";
import type { CampaignPhase, IndustryProfile } from "@/lib/types";
import { PortalChatWidget } from "./_components/PortalChatWidget";
import { AgencyPortalView } from "./_components/AgencyPortalView";
import { PredictionTrackSection } from "./_components/PredictionTrackSection";
import { CategorySignalSection } from "./_components/CategorySignalSection";
import { BrandMomentumSection } from "./_components/BrandMomentumSection";
import { GuardrailsSection } from "./_components/GuardrailsSection";
import { SignalTrajectorySection } from "./_components/SignalTrajectorySection";
import { ReportHistorySection } from "./_components/ReportHistorySection";
import { ChannelHealthSection } from "./_components/ChannelHealthSection";
import { BudgetPhaseReadinessSection } from "./_components/BudgetPhaseReadinessSection";
import { ComplianceSection } from "./_components/ComplianceSection";
import { CategoryBenchmarkSection } from "./_components/CategoryBenchmarkSection";
import { SectionHeading, ReportHero, CampaignHealthCard, POSTURE_DOT } from "./_components/reportUi";
import { PortalNav, type NavSection, type NavWeek } from "./_components/PortalNav";
import { Collapse } from "../_components/Collapse";

type PortalView = "brand" | "agency" | "partner";

export const dynamic = "force-dynamic";

// ─── Phase labels ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Partial<Record<IndustryProfile, Record<CampaignPhase, string>>> = {
  QSR: {
    Demand: "Getting Noticed",
    Nurture: "Winning Them Over",
    Conversion: "Earning the Order",
    Retention: "Keeping Them Coming Back",
    Complete: "Complete",
  },
  B2B: {
    Demand: "Building Awareness",
    Nurture: "Building the Case",
    Conversion: "Winning the Deal",
    Retention: "Growing the Account",
    Complete: "Complete",
  },
  Retail: {
    Demand: "Sparking Interest",
    Nurture: "Building Desire",
    Conversion: "Driving the Sale",
    Retention: "Earning Repeat Purchases",
    Complete: "Complete",
  },
  Other: {
    Demand: "Building Awareness",
    Nurture: "Building Trust",
    Conversion: "Driving Conversion",
    Retention: "Building Loyalty",
    Complete: "Complete",
  },
};

function getPhaseLabel(profile: IndustryProfile, phase: CampaignPhase): string {
  return PHASE_LABELS[profile]?.[phase] ?? phase;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PortalSection({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-20">
      <SectionHeading title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; t?: string }>;
}) {
  const { id } = await params;
  const { view: viewParam, t: portalToken } = await searchParams;
  const view: PortalView =
    viewParam === "agency" ? "agency" : viewParam === "partner" ? "partner" : "brand";

  // Guard: reject non-UUID segments (e.g. /portal/demo routes to demo/page.tsx first,
  // but if that page isn't deployed yet, id="demo" would cause a Postgres UUID error)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) notFound();

  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [frame, dashboards, extensions, report, signalReports, phaseGates, predictionRecords, signalFramework, brandMomentum, signalThresholds, reportHistory, channelHealth, complianceRecord, categoryBenchmarks] =
    await Promise.all([
      getFrameBrief(id).catch(() => null),
      getDashboards(id),
      getIdeaExtensions(id),
      getLatestCampaignReport(id),
      getSignalWeeklyReports(id),
      getPhaseGates(id),
      getPredictionAccuracyClientSafe(id),
      getCategorySignalFramework(id),
      getBrandMomentumClientSafe(campaign.client_id),
      getSignalThresholdsClientSafe(id),
      getCampaignReportHistoryClientSafe(id),
      getChannelHealthClientSafe(id),
      getComplianceRecordClientSafe(id),
      getCategoryBenchmarksClientSafe(id),
    ]);

  // Guardrails are keyed off the FRAME brief, which just resolved above.
  const guardrails = frame?.id ? await getGuardrailsClientSafe(frame.id) : [];

  // ── Agency view — full intelligence dashboard ─────────────────────────────
  if (view === "agency") {
    // Compliance checklist for the report BEFORE the current one — recent[0]
    // is the latest report (the one about to be reviewed/released), recent[1]
    // is the prior week whose recommendations should now be checked off.
    const recentForCompliance = await getRecentReportsForCompliance(id);
    let complianceItems: Awaited<ReturnType<typeof getComplianceItems>> = [];
    let complianceSourceWeek: number | null = null;
    let complianceTargetWeek: number | null = null;
    if (recentForCompliance.length >= 2) {
      const [current, previous] = recentForCompliance;
      await ensureComplianceItems(previous.id);
      complianceItems = await getComplianceItems(previous.id);
      complianceSourceWeek = previous.report_week;
      complianceTargetWeek = current.report_week;
    }

    return (
      <AgencyPortalView
        campaign={campaign}
        report={report}
        signalReports={signalReports}
        phaseGates={phaseGates}
        frame={frame}
        complianceItems={complianceItems}
        complianceSourceWeek={complianceSourceWeek}
        complianceTargetWeek={complianceTargetWeek}
      />
    );
  }

  const latest = dashboards[0] ?? null;
  const latestSignalWeek = signalReports[0]?.week_number ?? null;
  const activeChannels: string[] = frame?.active_channels ?? [];
  const readyBriefs = extensions.filter((e) => e.status === "Ready" || e.status === "Approved");
  const label = getPhaseLabel(campaign.industry_profile, campaign.current_phase);
  const completedGates = phaseGates.filter((g) => g.gate_decision === "Open");
  const nextGate = phaseGates.find((g) => g.gate_decision !== "Open");
  const clarityStatement = frame?.clarity_statement ?? null;

  const reportDate = new Date().toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const kicker = `ShiftImpact · Decision Intelligence · ${reportDate}${
    latestSignalWeek ? ` · Week ${latestSignalWeek}` : ""
  }`;

  // Weekly report visibility — computed once, used by both the nav section
  // list and the section render below.
  const reportVisible = !!report && (!!report.client_released_at || !!report.portal_published_at);
  const releasedAt = report ? report.client_released_at ?? report.portal_published_at : null;

  const showChannels = channelHealth.length > 0 || activeChannels.length > 0;
  const showSignalHealth = signalReports.length > 0 && !signalReports[0].flags_suppressed;
  const showReportHistory = reportHistory.length >= 2;
  const latestPosture = reportHistory.length > 0
    ? [...reportHistory].sort((a, b) => b.report_week - a.report_week)[0].risk_posture
    : report?.risk_posture ?? null;

  const navSections: NavSection[] = [
    { id: "campaign-health", label: "Campaign health" },
    ...(signalFramework ? [{ id: "measuring-success", label: "How we measure success" }] : []),
    ...(categoryBenchmarks ? [{ id: "benchmarks", label: "Category benchmarks" }] : []),
    ...(brandMomentum ? [{ id: "brand-momentum", label: "Brand momentum" }] : []),
    ...(showChannels ? [{ id: "channels", label: "Channels" }] : []),
    { id: "weekly-update", label: "Latest update" },
    ...(showSignalHealth ? [{ id: "signal-health", label: "Signal health" }] : []),
    ...(complianceRecord ? [{ id: "compliance", label: "Brief compliance" }] : []),
    ...(showReportHistory ? [{ id: "report-history", label: "Report history" }] : []),
    ...(reportVisible ? [{ id: "weekly-report", label: "Weekly report" }] : []),
    ...(readyBriefs.length > 0 ? [{ id: "channel-briefs", label: "Channel briefs" }] : []),
    ...(phaseGates.length > 0 ? [{ id: "milestones", label: "Milestones" }] : []),
    ...(frame?.budget_total != null ? [{ id: "budget", label: "Budget & readiness" }] : []),
    ...(guardrails.length > 0 ? [{ id: "guardrails", label: "Guardrails" }] : []),
    { id: "predictions", label: "Predictions" },
  ];

  const navWeeks: NavWeek[] = reportHistory.map((r) => ({
    week_number: r.report_week,
    risk_posture: r.risk_posture,
  }));

  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      <PortalNav
        campaignId={id}
        currentView={view}
        portalToken={portalToken}
        clientName={campaign.client_name}
        campaignName={campaign.name}
        healthScore={campaign.confidence_score}
        gateSignalStatus={campaign.gate_signal_status}
        posture={latestPosture}
        sections={navSections}
        weeks={navWeeks}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile-only compact header (desktop shows identity in the sidebar) */}
        <header className="lg:hidden border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
          <span className="font-bold tracking-tight">
            ShiftImpact <span className="text-neutral-400 font-normal text-sm">OS</span>
          </span>
          <span className="text-xs text-neutral-400">{campaign.client_name}</span>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">

          {/* ── Hero ── */}
          <ReportHero
            clientName={campaign.client_name}
            campaignName={campaign.name}
            phaseLabel={label}
            kicker={kicker}
            clarityStatement={clarityStatement}
            strategistReviewed={!!report}
          />

          {/* ── Campaign health — the main visual anchor of the report, so it
               carries more than the score: a real week-over-week posture
               trajectory, the latest strategist verdict, and the primary
               gate's progress bar, all from data already fetched above. ── */}
          <section id="campaign-health" className="space-y-3 scroll-mt-20">
            <SectionHeading title="Campaign health" />
            <CampaignHealthCard
              confidenceScore={campaign.confidence_score}
              gateSignalStatus={campaign.gate_signal_status}
              businessOutcomeLabel={campaign.business_outcome_label}
              businessOutcomeActual={campaign.business_outcome_actual}
              businessOutcomeTarget={campaign.business_outcome_target}
              retentionMetricLabel={campaign.retention_metric_label}
              retentionMetricActual={campaign.retention_metric_actual}
              retentionMetricTarget={campaign.retention_metric_target}
              postureWeeks={navWeeks.length > 0 ? navWeeks : undefined}
              strategistVerdict={report?.executive_summary ?? null}
              primaryGate={
                signalThresholds?.signal_1_label != null &&
                signalThresholds.signal_1_threshold_pct != null &&
                signalReports[0]?.signal_1_actual_pct != null
                  ? {
                      label: signalThresholds.signal_1_label,
                      current: signalReports[0].signal_1_actual_pct,
                      target: signalThresholds.signal_1_threshold_pct,
                      unit: "%",
                    }
                  : null
              }
            />
          </section>

          {/* ── Category signal framework — replaces generic Demand/Nurture/Conversion
               framing with this campaign's actual category-appropriate signals,
               when one has been built for it (see CategorySignalSection for why
               this doesn't try to merge in real weekly numbers yet). ── */}
          <div id="measuring-success" className="scroll-mt-20">
            <CategorySignalSection framework={signalFramework} />
          </div>

          {/* ── Category benchmark reference — externally sourced industry
               norms, shown as context for how ambitious this campaign's own
               targets are (see getCategoryBenchmarksClientSafe). ── */}
          <CategoryBenchmarkSection data={categoryBenchmarks} />

          {/* ── Brand momentum ── */}
          <div id="brand-momentum" className="scroll-mt-20">
            <BrandMomentumSection momentum={brandMomentum} />
          </div>

        {/* ── Channel health — falls back to a plain list of channel names
             when weekly channel metrics haven't started yet for this
             campaign (see getChannelHealthClientSafe). ── */}
        {showChannels && (
          <div id="channels" className="scroll-mt-20">
            {channelHealth.length > 0 ? (
              <ChannelHealthSection channels={channelHealth} />
            ) : (
              <PortalSection title="Active channels">
                <Card>
                  <div className="flex flex-wrap gap-2">
                    {activeChannels.map((ch) => (
                      <span
                        key={ch}
                        className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </Card>
              </PortalSection>
            )}
          </div>
        )}

        {/* ── Weekly dashboard ── */}
        <PortalSection id="weekly-update" title="Latest weekly update">
          {latest ? (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Week of {latest.week_of}</p>
                <div className="flex gap-1">
                  <Badge tone={ragTone(latest.funnel_health_demand)}>Demand</Badge>
                  <Badge tone={ragTone(latest.funnel_health_conversion)}>Conv.</Badge>
                  <Badge tone={ragTone(latest.funnel_health_retention)}>Ret.</Badge>
                </div>
              </div>
              {latest.decision_snapshot && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                    Decision needed
                  </p>
                  <p className="text-sm text-neutral-700">{latest.decision_snapshot}</p>
                </div>
              )}
              {latest.idea_integrity_observation && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                    Strategy note
                  </p>
                  <p className="text-sm text-neutral-700">{latest.idea_integrity_observation}</p>
                </div>
              )}
              {latestSignalWeek && (
                <p className="text-xs text-neutral-400 pt-2 border-t border-neutral-100">
                  Signal data through week {latestSignalWeek}
                </p>
              )}
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-neutral-500">No weekly update yet. Check back soon.</p>
            </Card>
          )}
        </PortalSection>

        {/* ── Signal Health ── */}
        {showSignalHealth && (
          <PortalSection id="signal-health" title="Signal health">
            {/* Topline — always visible */}
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Week {signalReports[0].week_number} — measured signals</p>
                <Badge tone={ragTone(signalReports[0].gate_status ?? "Red")}>
                  Gate: {signalReports[0].gate_status ?? "—"}
                </Badge>
              </div>
              {/* Week-over-week trend — only renders once there are 2+ weeks */}
              <SignalTrajectorySection reports={signalReports} thresholds={signalThresholds} />
            </Card>
            {/* Signal breakdown — collapsed by default */}
            <Collapse label="Signal breakdown" sublabel="Demand · Nurture · Conversion">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center bg-neutral-50 rounded-md p-2">
                  <p className="text-[10px] text-neutral-400 mb-1">Demand</p>
                  <Badge tone={ragTone(signalReports[0].demand_health ?? "Red")}>
                    {signalReports[0].demand_health ?? "—"}
                  </Badge>
                </div>
                <div className="text-center bg-neutral-50 rounded-md p-2">
                  <p className="text-[10px] text-neutral-400 mb-1">Nurture</p>
                  <Badge tone={ragTone(signalReports[0].nurture_health ?? "Red")}>
                    {signalReports[0].nurture_health ?? "—"}
                  </Badge>
                </div>
                <div className="text-center bg-neutral-50 rounded-md p-2">
                  <p className="text-[10px] text-neutral-400 mb-1">Conversion</p>
                  <Badge tone={ragTone(signalReports[0].conversion_health ?? "Red")}>
                    {signalReports[0].conversion_health ?? "—"}
                  </Badge>
                </div>
              </div>
              {signalReports[0].gate_note && (
                <p className="text-xs text-neutral-500 pt-3 border-t border-neutral-100">
                  {signalReports[0].gate_note}
                </p>
              )}
            </Collapse>
          </PortalSection>
        )}

        {/* ── Brief compliance — did we do what we said last week ── */}
        <ComplianceSection record={complianceRecord} />

        {/* ── Report history — every past week, browsable at a glance ── */}
        {showReportHistory && (
          <div id="report-history" className="scroll-mt-20">
            <ReportHistorySection reports={reportHistory} />
          </div>
        )}

        {/* ── Weekly Intelligence Report — staged visibility ── */}
        {(() => {
          // reportVisible/releasedAt computed above (shared with nav section
          // list). view === "agency" never reaches here — it's handled by
          // the early return at the top of this component.
          if (!reportVisible || !report) return null;

          return (
            <PortalSection id="weekly-report" title="Weekly intelligence report">
              <Card className="space-y-4">
                {/* Agency note — shown to brand client after release */}
                {report.agency_note && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1.5">A note from your agency</p>
                    <p className="text-sm text-blue-900 leading-relaxed">{report.agency_note}</p>
                  </div>
                )}

                {/* Header — posture badge sits right up top, visible without scrolling in */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{report.report_label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Week {report.report_week} · Reviewed by your strategist
                    </p>
                  </div>
                  {report.risk_posture ? (
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                        report.risk_posture === "Gaining"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : report.risk_posture === "Plateauing"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${POSTURE_DOT[report.risk_posture] ?? "bg-neutral-400"}`} />
                      {report.risk_posture}
                    </span>
                  ) : (
                    <Badge tone="green">Ready</Badge>
                  )}
                </div>

                {/* Executive summary — editorial blockquote, matches hero tone */}
                {report.executive_summary && (
                  <blockquote className="border-l-4 border-neutral-900 pl-4 text-sm text-neutral-700 leading-relaxed">
                    {report.executive_summary}
                  </blockquote>
                )}

                {/* Intelligence findings — collapsed by default to reduce scroll */}
                {report.findings.length > 0 && (
                  <Collapse
                    label={`What the data is telling us · ${report.findings.length} finding${report.findings.length !== 1 ? "s" : ""}`}
                    defaultOpen={false}
                  >
                    <div className="space-y-4">
                      {report.findings.map((f, i) => (
                        <div key={i} className="border-l-2 border-neutral-200 pl-3">
                          <p className="text-xs font-semibold text-neutral-800 mb-1">{f.headline}</p>
                          <p className="text-xs text-neutral-500 leading-relaxed">{f.implication}</p>
                          {f.recommendation && (
                            <p className="text-xs text-emerald-700 mt-1.5 font-medium">→ {f.recommendation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Collapse>
                )}

                <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-100">
                  {releasedAt
                    ? `Published ${new Date(releasedAt).toLocaleDateString("en-MY", {
                        day: "numeric", month: "long", year: "numeric",
                      })} · Questions? Reply to the notification email.`
                    : "Prepared by your ShiftImpact strategist."}
                </p>
              </Card>
            </PortalSection>
          );
        })()}

        {/* ── Discipline briefs ready ── */}
        {readyBriefs.length > 0 && (
          <PortalSection id="channel-briefs" title="Channel briefs">
            <Card className="divide-y divide-neutral-100">
              {readyBriefs.map((ext) => (
                <div key={ext.id} className="py-2.5 flex items-center justify-between">
                  <span className="text-sm text-neutral-700">{ext.channel_name}</span>
                  <Badge tone="green">{ext.status}</Badge>
                </div>
              ))}
            </Card>
            <Link
              href={`/brief/${id}`}
              className="block text-center text-xs font-medium text-emerald-700 hover:text-emerald-900 mt-2"
            >
              View and download briefs →
            </Link>
          </PortalSection>
        )}

        {/* ── Phase gates ── */}
        {phaseGates.length > 0 && (
          <PortalSection id="milestones" title="Campaign milestones">
            {/* Next gate — always visible */}
            {nextGate && (
              <Card>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-300">○</span>
                  <div>
                    <p className="text-xs text-neutral-400">Next milestone</p>
                    <p className="text-sm font-medium text-neutral-700">{nextGate.gate_type}</p>
                  </div>
                </div>
              </Card>
            )}
            {/* Completed gates — collapsed */}
            {completedGates.length > 0 && (
              <Collapse
                label={`${completedGates.length} completed milestone${completedGates.length !== 1 ? "s" : ""}`}
                defaultOpen={false}
              >
                <div className="space-y-2">
                  {completedGates.map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span className="text-sm text-neutral-600">{g.gate_type}</span>
                    </div>
                  ))}
                </div>
              </Collapse>
            )}
          </PortalSection>
        )}

        {/* ── Budget & phase readiness — strategic funding case only,
             never weekly spend (see BudgetPhaseReadinessSection). ── */}
        <div id="budget" className="scroll-mt-20">
          <BudgetPhaseReadinessSection
            budgetTotal={frame?.budget_total ?? null}
            gateSignalStatus={campaign.gate_signal_status}
            nextGateType={nextGate?.gate_type ?? null}
            nextGateSignal={nextGate?.required_signal ?? null}
          />
        </div>

        {/* ── Guardrails reviewed this week ── */}
        <div id="guardrails" className="scroll-mt-20">
          <GuardrailsSection guardrails={guardrails} />
        </div>

        {/* ── Prediction track record ── */}
        <div id="predictions" className="scroll-mt-20">
          <PredictionTrackSection records={predictionRecords} frameLocked={!!frame} />
        </div>

          {/* Footer */}
          <div className="pt-4 border-t border-neutral-200 text-xs text-neutral-400">
            <span>ShiftImpact OS</span>
          </div>
        </main>
      </div>

      {/* LLM-backed Q&A widget — pulls live signal data, streams from Claude */}
      <PortalChatWidget campaignId={id} portalToken={portalToken} />
    </div>
  );
}
