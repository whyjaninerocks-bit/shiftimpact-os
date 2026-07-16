import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignsForClient, getClient, getAllTeamMembers, getClientChannels, getClientSignalSources, getBrandMomentumScores } from "@/lib/data";
import { ChannelRegistrySection } from "./_components/ChannelRegistrySection";
import { SignalSourcesSection } from "./_components/SignalSourcesSection";
import { BrandMomentumSection } from "./_components/BrandMomentumSection";
import { createCampaign, updateClient } from "@/lib/actions";
import {
  Badge,
  Card,
  ErrorBanner,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  gateSignalTone,
  icsThresholdTone,
  inputClass,
  labelClass,
  phaseTone,
} from "@/app/_components/ui";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const client = await getClient(id);
  if (!client) notFound();

  const [campaigns, teamMembers, clientChannels, signalSources, bmsScores] = await Promise.all([
    getCampaignsForClient(id),
    getAllTeamMembers(),
    getClientChannels(id),
    getClientSignalSources(id),
    getBrandMomentumScores(id),
  ]);

  const updateClientWithId = updateClient.bind(null, id);
  const createCampaignWithClient = createCampaign;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-neutral-500 hover:text-neutral-900">← Clients</Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{client.name}</h1>
        <Badge tone="blue">{client.active_campaigns} active campaigns</Badge>
      </div>

      <ErrorBanner message={error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <SectionTitle>Campaigns</SectionTitle>
          {campaigns.map((c) => (
            <Card key={c.id} className="hover:border-neutral-400 transition-colors">
              <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {c.team_member_name ?? "Unassigned"} · Confidence {c.confidence_score}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.ics_threshold && (
                    <Badge tone={icsThresholdTone(c.ics_threshold)}>{c.ics_threshold}</Badge>
                  )}
                  <Badge tone={gateSignalTone(c.gate_signal_status)}>{c.gate_signal_status}</Badge>
                  <Badge tone={phaseTone(c.current_phase)}>{c.current_phase}</Badge>
                </div>
              </Link>
              <div className="mt-2 pt-2 border-t border-neutral-100">
                <a
                  href={`/brief/${c.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Share Brief with Client →
                </a>
              </div>
            </Card>
          ))}
          {campaigns.length === 0 && (
            <Card><p className="text-sm text-neutral-500">No campaigns yet for this client.</p></Card>
          )}

          <Card>
            <SectionTitle>New Campaign</SectionTitle>
            <form action={createCampaignWithClient} className="space-y-3">
              <input type="hidden" name="client_id" value={client.id} />
              <div>
                <label className={labelClass} htmlFor="name">Campaign Name</label>
                <input className={inputClass} id="name" name="name" required />
              </div>
              <div>
                <label className={labelClass} htmlFor="team_member_id">Owner</label>
                <select className={inputClass} id="team_member_id" name="team_member_id" defaultValue="">
                  <option value="">Unassigned</option>
                  {teamMembers.map((tm) => (
                    <option key={tm.id} value={tm.id}>{tm.name} — {tm.role}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-neutral-400">
                Creates a Draft FRAME Brief and the 4 standard Phase Gates automatically.
              </p>
              <button type="submit" className={buttonClass}>Create Campaign</button>
            </form>
          </Card>
        </div>

        <Card>
          <SectionTitle>Client Profile</SectionTitle>
          <form action={updateClientWithId} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="name">Name</label>
              <input className={inputClass} id="name" name="name" defaultValue={client.name} required />
            </div>
            <div>
              <label className={labelClass} htmlFor="industry_profile">Industry Profile</label>
              <select className={inputClass} id="industry_profile" name="industry_profile" defaultValue={client.industry_profile} required>
                <option value="QSR">QSR</option>
                <option value="B2B">B2B</option>
                <option value="Retail">Retail</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="business_outcome_label">Business Outcome Label</label>
              <input className={inputClass} id="business_outcome_label" name="business_outcome_label" defaultValue={client.business_outcome_label} />
            </div>
            <div>
              <label className={labelClass} htmlFor="retention_metric_label">Retention Metric Label</label>
              <input className={inputClass} id="retention_metric_label" name="retention_metric_label" defaultValue={client.retention_metric_label} />
            </div>
            <button type="submit" className={buttonSecondaryClass}>Save</button>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelRegistrySection clientId={id} channels={clientChannels} />
        <SignalSourcesSection clientId={id} sources={signalSources} />
      </div>

      <BrandMomentumSection clientId={id} scores={bmsScores} />
    </div>
  );
}
