// app/(os)/signal-maps/page.tsx
// Outcome-Led Signal Mapping — internal admin view, campaign picker.
// Internal only, never surfaced client-facing. Page access is already
// enforced by middleware.ts (every (os) route requires a Supabase session);
// the mutation itself additionally calls assertInternalSession() as a
// second, explicit check that doesn't depend on route placement.
// See project memory: Outcome-Led Signal Mapping — APPLIED.

import Link from "next/link";
import { getCampaignsOverview, getActiveSignalMapSummaries } from "@/lib/data";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";

function confidenceTone(label: string | null): "green" | "amber" | "red" | "neutral" {
  if (label === "Conversion Measured") return "green";
  if (label === "Conversion Partially Supported") return "amber";
  if (label === "Conversion Likelihood Only") return "red";
  return "neutral";
}

function statusTone(status: string): "green" | "amber" | "blue" | "neutral" {
  if (status === "used_in_report") return "green";
  if (status === "reviewed") return "blue";
  return "neutral";
}

export default async function SignalMapsPickerPage() {
  const [campaigns, summaries] = await Promise.all([
    getCampaignsOverview(),
    getActiveSignalMapSummaries(),
  ]);

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 mb-1">Internal only</p>
        <SectionTitle>Signal Maps</SectionTitle>
        <p className="text-sm text-neutral-500 max-w-2xl">
          Outcome-Led Signal Mapping. For each campaign, record what signals are actually available and get an
          honest confidence label for how well the data supports a real business outcome claim — not a generic
          engagement summary. Not shown to clients.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-2.5">Campaign</th>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">Business outcome</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Confidence</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {campaigns.map((c) => {
              const summary = summaries[c.id];
              return (
                <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/signal-maps/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.client_name}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.business_outcome_label}</td>
                  <td className="px-4 py-3 text-neutral-600">{summary?.category_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {summary ? (
                      <Badge tone={confidenceTone(summary.confidence_label)}>{summary.confidence_label}</Badge>
                    ) : (
                      <span className="text-neutral-400 text-xs">No map yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {summary ? (
                      <Badge tone={statusTone(summary.map_status)}>{summary.map_status.replace(/_/g, " ")}</Badge>
                    ) : (
                      <span className="text-neutral-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">
                  No campaigns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
