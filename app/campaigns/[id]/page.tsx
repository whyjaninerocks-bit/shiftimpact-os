import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllTeamMembers,
  getBusinessOutcomes,
  getCampaign,
  getDashboards,
  getFrameBrief,
  getKillSwitches,
  getPhaseGates,
  getStageBriefs,
} from "@/lib/data";
import { Badge, ErrorBanner, gateSignalTone, phaseTone } from "@/app/_components/ui";
import { CampaignInfoSection } from "./_components/CampaignInfoSection";
import { FrameBriefSection } from "./_components/FrameBriefSection";
import { KillSwitchesSection } from "./_components/KillSwitchesSection";
import { StageBriefsSection } from "./_components/StageBriefsSection";
import { PhaseGatesSection } from "./_components/PhaseGatesSection";
import { DashboardSection } from "./_components/DashboardSection";
import { BusinessOutcomesSection } from "./_components/BusinessOutcomesSection";

const sectionLinks = [
  { href: "#info", label: "Campaign" },
  { href: "#frame", label: "FRAME Brief" },
  { href: "#kill-switches", label: "Kill Switches" },
  { href: "#stage-briefs", label: "STAGE Briefs" },
  { href: "#phase-gates", label: "Phase Gates" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#business-outcomes", label: "Business Outcomes" },
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

  const [killSwitches, stageBriefs, phaseGates, dashboards, businessOutcomes, teamMembers] = await Promise.all([
    getKillSwitches(frame.id),
    getStageBriefs(id),
    getPhaseGates(id),
    getDashboards(id),
    getBusinessOutcomes(id),
    getAllTeamMembers(),
  ]);

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
        <Link
          href={`/portal/${campaign.id}`}
          className="inline-block mt-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 underline"
        >
          View Client Interface →
        </Link>
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
      <KillSwitchesSection campaignId={id} frameBriefId={frame.id} killSwitches={killSwitches} />
      <StageBriefsSection
        campaignId={id}
        frameLocked={frame.lock_status === "Locked"}
        frameAnchor={frame.anchor}
        moodRegister={frame.mood}
        stageBriefs={stageBriefs}
      />
      <PhaseGatesSection campaignId={id} phaseGates={phaseGates} />
      <DashboardSection campaignId={id} dashboards={dashboards} />
      <BusinessOutcomesSection campaignId={id} campaign={campaign} outcomes={businessOutcomes} />
    </div>
  );
}
