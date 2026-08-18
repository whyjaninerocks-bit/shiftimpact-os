// app/(os)/campaigns/[id]/_components/CompetitiveIntelSection.tsx
// Sprint 10 — OIE → Campaign Workspace: Competitive Intelligence Feed
//
// Server component. Receives competitive intel data fetched in page.tsx.
// Shows competitor signals from the OIE for the linked company.
// If no OIE link is set on the client, shows setup guidance.

import Link from "next/link";
import type { CompetitiveIntelData } from "@/lib/data";
import { Badge, Card, SectionTitle } from "@/app/_components/ui";

function formatDetectedAt(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return d.toLocaleDateString("en-MY", { year: "numeric", month: "short" });
}

function signalTypeTone(type: string): "neutral" | "red" | "amber" | "green" {
  const t = type.toLowerCase();
  if (t.includes("launch") || t.includes("expansion") || t.includes("acqui")) return "red";
  if (t.includes("price") || t.includes("promotion") || t.includes("surge")) return "amber";
  return "neutral";
}

interface CompetitiveIntelSectionProps {
  clientId: string;
  competitiveIntel: CompetitiveIntelData;
}

export function CompetitiveIntelSection({ clientId, competitiveIntel }: CompetitiveIntelSectionProps) {
  const { oieCompanyId, oieCompanyName, signals } = competitiveIntel;

  return (
    <section id="competitive-intel">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle id="competitive-intel">Competitive Intelligence</SectionTitle>
        <Badge tone="neutral">OIE ⚿</Badge>
      </div>

      {!oieCompanyId ? (
        <Card>
          <p className="text-xs font-semibold text-neutral-700 mb-1">No OIE Company Linked</p>
          <p className="text-xs text-neutral-500 mb-3">
            Link this client to a company in the Opportunity Intelligence Engine to surface
            competitive signals automatically in the Campaign OS Digest.
          </p>
          <Link
            href={`/clients/${clientId}`}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            Set up OIE link in client settings →
          </Link>
        </Card>
      ) : signals.length === 0 ? (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-700">
              {oieCompanyName ?? "Competitor"} — OIE Active
            </p>
            <Badge tone="amber">No Competitive Signals Yet</Badge>
          </div>
          <p className="text-xs text-neutral-500 mb-3">
            OIE is linked to {oieCompanyName ?? "this competitor"} but no Competitive category signals
            have been scanned yet. Run a prospect scan to populate.
          </p>
          <Link
            href={`/prospects/${oieCompanyId}`}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            View OIE company profile →
          </Link>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-neutral-500">
              Tracking{" "}
              <Link
                href={`/prospects/${oieCompanyId}`}
                className="text-indigo-600 hover:underline font-medium"
              >
                {oieCompanyName ?? "linked competitor"}
              </Link>{" "}
              via OIE — {signals.length} competitive signal{signals.length !== 1 ? "s" : ""} detected
            </p>
            <Badge tone="red">Live Feed</Badge>
          </div>

          <div className="space-y-2">
            {signals.map((sig, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge tone={signalTypeTone(sig.signal_type)}>
                        {sig.signal_type}
                      </Badge>
                      <span className="text-xs text-neutral-400 shrink-0">
                        {formatDetectedAt(sig.detected_at)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      {sig.signal_text}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-xs text-neutral-400 mt-3">
            These signals feed the Campaign OS Digest competitive context layer.
            The digest names competitor activity when relevant to budget or channel decisions.
          </p>
        </>
      )}
    </section>
  );
}
