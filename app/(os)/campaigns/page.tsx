// app/(os)/campaigns/page.tsx
// Cross-client campaigns command view — all active campaigns sorted by confidence score (lowest = most at risk)

import Link from "next/link";
import { getCampaignsOverview } from "@/lib/data";
import { Badge, Card, SectionTitle, phaseTone, gateSignalTone } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score);
  const color = pct >= 70 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
        {pct}
      </span>
    </div>
  );
}

export default async function CampaignsCommandPage() {
  const all = await getCampaignsOverview();
  const active = all
    .filter((c) => c.status !== "Complete")
    .sort((a, b) => a.confidence_score - b.confidence_score); // lowest first = most at risk

  const atRisk = active.filter((c) => c.confidence_score < 50);
  const watch = active.filter((c) => c.confidence_score >= 50 && c.confidence_score < 70);
  const healthy = active.filter((c) => c.confidence_score >= 70);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="rounded-xl border border-neutral-200 bg-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Campaigns</p>
          <p className="text-sm text-neutral-500">
            {active.length} active · {atRisk.length} at risk · {watch.length} watch · {healthy.length} healthy
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-neutral-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> At risk &lt;50</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Watch 50–69</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Healthy ≥70</span>
        </div>
      </div>

      {active.length === 0 && (
        <Card>
          <p className="text-sm text-neutral-500">No active campaigns. <Link href="/clients" className="underline">Create one under a client.</Link></p>
        </Card>
      )}

      {/* At Risk */}
      {atRisk.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>At Risk</SectionTitle>
          {atRisk.map((c) => <CampaignRow key={c.id} campaign={c} />)}
        </div>
      )}

      {/* Watch */}
      {watch.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>Watch</SectionTitle>
          {watch.map((c) => <CampaignRow key={c.id} campaign={c} />)}
        </div>
      )}

      {/* Healthy */}
      {healthy.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>Healthy</SectionTitle>
          {healthy.map((c) => <CampaignRow key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  );
}

function CampaignRow({ campaign: c }: { campaign: Awaited<ReturnType<typeof getCampaignsOverview>>[number] }) {
  return (
    <Link href={`/campaigns/${c.id}`}>
      <Card className="hover:border-neutral-300 transition-colors cursor-pointer">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Client + Campaign */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-neutral-400 truncate">{c.client_name} · {c.industry_profile}</p>
            <p className="text-sm font-semibold text-neutral-900 truncate">{c.name}</p>
          </div>

          {/* Phase */}
          <Badge tone={phaseTone(c.current_phase)}>{c.current_phase}</Badge>

          {/* Gate signal */}
          <Badge tone={gateSignalTone(c.gate_signal_status)}>{c.gate_signal_status}</Badge>

          {/* ICS threshold */}
          {c.ics_threshold && (
            <Badge tone={c.ics_threshold === "Advance" ? "green" : c.ics_threshold === "Stop" ? "red" : "amber"}>
              ICS {c.ics_threshold}
            </Badge>
          )}

          {/* FRAME lock */}
          {c.frame_lock_status && (
            <Badge tone={c.frame_lock_status === "Locked" ? "green" : "neutral"}>
              FRAME {c.frame_lock_status}
            </Badge>
          )}

          {/* Confidence bar */}
          <ConfidenceBar score={c.confidence_score} />

          {/* Last review */}
          <span className="text-[10px] text-neutral-400 shrink-0">
            {c.last_review_date
              ? `Reviewed ${new Date(c.last_review_date).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`
              : "Not reviewed"}
          </span>
        </div>

        {/* Clarity statement */}
        {c.clarity_statement && (
          <p className="mt-1.5 text-[11px] text-neutral-400 italic truncate">{c.clarity_statement}</p>
        )}
      </Card>
    </Link>
  );
}
