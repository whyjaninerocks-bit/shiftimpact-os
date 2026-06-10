import Link from "next/link";
import { getCampaignsOverview } from "@/lib/data";
import { Badge, Card, gateSignalTone, icsThresholdTone, phaseTone } from "./_components/ui";

export default async function Home() {
  const campaigns = await getCampaignsOverview();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Is the idea still strong enough here to earn the next stage?
          </p>
        </div>
        <Link href="/clients" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
          + New campaign (via a client)
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => (
          <Link key={c.id} href={`/campaigns/${c.id}`}>
            <Card className="h-full hover:border-neutral-400 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-neutral-400">{c.client_name} · {c.industry_profile}</p>
                  <h3 className="font-semibold mt-0.5">{c.name}</h3>
                </div>
                <Badge tone={phaseTone(c.current_phase)}>{c.current_phase}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-400">Confidence</p>
                  <p className="font-medium">{c.confidence_score}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Gate Signal</p>
                  <Badge tone={gateSignalTone(c.gate_signal_status)}>{c.gate_signal_status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">FRAME</p>
                  {c.frame_lock_status === "Locked" ? (
                    <Badge tone="green">Locked</Badge>
                  ) : (
                    <Badge tone="neutral">Draft</Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-neutral-400">ICS</p>
                  {c.ics_threshold ? (
                    <Badge tone={icsThresholdTone(c.ics_threshold)}>
                      {c.ics_weighted_total} · {c.ics_threshold}
                    </Badge>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </div>
              </div>

              {c.clarity_statement && (
                <p className="mt-3 text-xs text-neutral-500 line-clamp-2 italic">
                  &ldquo;{c.clarity_statement}&rdquo;
                </p>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card>
          <p className="text-sm text-neutral-500">
            No campaigns yet. Go to <Link href="/clients" className="underline">Clients</Link> to create one.
          </p>
        </Card>
      )}
    </div>
  );
}
