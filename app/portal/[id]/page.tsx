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
} from "@/lib/data";
import { Badge, Card, ragTone } from "@/app/_components/ui";
import type { CampaignPhase, IndustryProfile } from "@/lib/types";

type PortalView = "brand" | "agency" | "partner";

export const dynamic = "force-dynamic";

// ─── Phase labels ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Partial<Record<IndustryProfile, Record<CampaignPhase, string>>> = {
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

function getPhaseLabel(profile: IndustryProfile, phase: CampaignPhase): string {
  return PHASE_LABELS[profile]?.[phase] ?? phase;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PortalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{title}</h2>
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
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view: viewParam } = await searchParams;
  const view: PortalView =
    viewParam === "agency" ? "agency" : viewParam === "partner" ? "partner" : "brand";

  // Guard: reject non-UUID segments (e.g. /portal/demo routes to demo/page.tsx first,
  // but if that page isn't deployed yet, id="demo" would cause a Postgres UUID error)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) notFound();

  const [campaign, frame, dashboards, extensions, report, signalReports, phaseGates] =
    await Promise.all([
      getCampaign(id),
      getFrameBrief(id).catch(() => null),
      getDashboards(id),
      getIdeaExtensions(id),
      getLatestCampaignReport(id),
      getSignalWeeklyReports(id),
      getPhaseGates(id),
    ]);

  if (!campaign) notFound();

  const latest = dashboards[0] ?? null;
  const latestSignalWeek = signalReports[0]?.week_number ?? null;
  const activeChannels: string[] = frame?.active_channels ?? [];
  const readyBriefs = extensions.filter((e) => e.status === "Ready" || e.status === "Approved");
  const label = getPhaseLabel(campaign.industry_profile, campaign.current_phase);
  const completedGates = phaseGates.filter((g) => g.gate_decision === "Open");
  const nextGate = phaseGates.find((g) => g.gate_decision !== "Open");
  const clarityStatement = frame?.clarity_statement ?? null;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
        <span className="font-bold tracking-tight">
          ShiftImpact <span className="text-neutral-400 font-normal text-sm">OS</span>
        </span>
        <span className="text-xs text-neutral-400">{campaign.client_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Title */}
        <div>
          <p className="text-xs text-neutral-400 mb-0.5">{campaign.client_name}</p>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
        </div>

        {/* ── Status ── */}
        <PortalSection title="Where things stand">
          {clarityStatement && (
            <div className="px-4 py-3 rounded-xl bg-neutral-900 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">What we&apos;re here to do</p>
              <p className="text-sm leading-relaxed">{clarityStatement}</p>
            </div>
          )}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-neutral-400">Current phase</p>
                <p className="text-lg font-semibold">{label}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-400">Signal confidence</p>
                <p className="text-2xl font-bold">{Math.round(campaign.confidence_score)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 rounded-md p-3">
                <p className="text-xs text-neutral-400">{campaign.business_outcome_label}</p>
                <p className="text-base font-semibold">
                  {campaign.business_outcome_actual ?? "—"}
                  <span className="text-sm font-normal text-neutral-400">
                    {" "}/{" "}{campaign.business_outcome_target ?? "—"} target
                  </span>
                </p>
              </div>
              <div className="bg-neutral-50 rounded-md p-3">
                <p className="text-xs text-neutral-400">{campaign.retention_metric_label}</p>
                <p className="text-base font-semibold">
                  {campaign.retention_metric_actual ?? "—"}
                  <span className="text-sm font-normal text-neutral-400">
                    {" "}/{" "}{campaign.retention_metric_target ?? "—"} target
                  </span>
                </p>
              </div>
            </div>
          </Card>
        </PortalSection>

        {/* ── Active channels ── */}
        {activeChannels.length > 0 && (
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

        {/* ── Weekly dashboard ── */}
        <PortalSection title="Latest weekly update">
          {latest ? (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Week {latest.week_number} — {latest.week_of}</p>
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
        {signalReports.length > 0 && !signalReports[0].flags_suppressed && (
          <PortalSection title="Signal health">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-neutral-500">Week {signalReports[0].week_number} — measured signals</p>
                <Badge tone={ragTone(signalReports[0].gate_status ?? "Red")}>
                  Gate: {signalReports[0].gate_status ?? "—"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
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
                <p className="text-xs text-neutral-500 mt-3 pt-2 border-t border-neutral-100">
                  {signalReports[0].gate_note}
                </p>
              )}
            </Card>
          </PortalSection>
        )}

        {/* ── Weekly Intelligence Report — staged visibility ── */}
        {(() => {
          if (!report) return null;

          // Determine if this viewer can see the report
          const hasAgencyPreview = !!report.agency_preview_at;
          const hasClientRelease = !!report.client_released_at;
          // Legacy: portal_published_at used before two-stage system
          const legacyPublished = !!report.portal_published_at;

          const canSeeReport =
            view === "agency"
              ? hasAgencyPreview || legacyPublished
              : view === "partner"
              ? hasClientRelease || legacyPublished
              : hasClientRelease || legacyPublished; // brand default

          if (!canSeeReport) return null;

          const isAgencyPreviewOnly = view === "agency" && hasAgencyPreview && !hasClientRelease;
          const releasedAt = report.client_released_at ?? report.portal_published_at;

          return (
            <PortalSection title="Weekly intelligence report">
              {/* Agency preview banner */}
              {isAgencyPreviewOnly && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
                  <span className="text-amber-600 text-sm shrink-0">⏳</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Agency preview — not yet released to the brand client</p>
                    <p className="text-xs text-amber-700 mt-0.5">You are viewing this report before it has been shared with the brand. Add your narrative note in the OS and release when ready.</p>
                  </div>
                </div>
              )}

              <Card className="space-y-4">
                {/* Agency note — shown to brand client after release */}
                {report.agency_note && view !== "agency" && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1.5">A note from your agency</p>
                    <p className="text-sm text-blue-900 leading-relaxed">{report.agency_note}</p>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{report.report_label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Week {report.report_week} · Reviewed by your strategist
                    </p>
                  </div>
                  <Badge tone="green">Ready</Badge>
                </div>

                {/* Executive summary */}
                {report.executive_summary && (
                  <div className="bg-neutral-50 rounded-lg p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Summary</p>
                    <p className="text-sm text-neutral-700 leading-relaxed">{report.executive_summary}</p>
                  </div>
                )}

                {/* Risk posture */}
                {report.risk_posture && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Brand posture this week</p>
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${
                      report.risk_posture === "Gaining"
                        ? "bg-green-50 text-green-800 border-green-200"
                        : report.risk_posture === "Plateauing"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : report.risk_posture === "Under Threat" || report.risk_posture === "Fragile" || report.risk_posture === "Eroding Slowly"
                        ? "bg-red-50 text-red-800 border-red-200"
                        : "bg-neutral-100 text-neutral-700 border-neutral-200"
                    }`}>
                      {report.risk_posture}
                    </span>
                  </div>
                )}

                {/* Intelligence findings — partner view strips competitor-sensitive details */}
                {report.findings.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">What the data is telling us</p>
                    <div className="space-y-3">
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
                  </div>
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
          <PortalSection title="Channel briefs">
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
          <PortalSection title="Campaign milestones">
            <Card className="space-y-2">
              {completedGates.map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span className="text-sm text-neutral-600">{g.gate_type}</span>
                </div>
              ))}
              {nextGate && (
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                  <span className="text-neutral-300">○</span>
                  <span className="text-sm text-neutral-400">Next: {nextGate.gate_type}</span>
                </div>
              )}
            </Card>
          </PortalSection>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-200 text-xs text-neutral-400">
          <span>ShiftImpact OS</span>
        </div>
      </main>
    </div>
  );
}
