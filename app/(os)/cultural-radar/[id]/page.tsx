// app/(os)/cultural-radar/[id]/page.tsx
// Cultural signal detail: Part 1 display, Part 2 brand-fit assessment, Part 3 handoff brief
// Deliberately minimal — the three-part loop, nothing more.

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";
import Link from "next/link";
import { BrandFitForm } from "./_components/BrandFitForm";
import { HandoffPanel } from "./_components/HandoffPanel";
import { ArchiveButtonClient } from "./_components/ArchiveButtonClient";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  signal_name: string;
  signal_type: string;
  source_description: string;
  evidence: string;
  is_trending: boolean;
  geographic_scope: string;
  why_it_matters: string | null;
  brand_fit_notes: string | null;
  brand_fit_status: string;
  community_respect_check: boolean;
  handoff_brief: string | null;
  handoff_generated_at: string | null;
  status: string;
  created_at: string;
};

function typeTone(type: string): "blue" | "green" | "amber" | "purple" | "neutral" {
  switch (type) {
    case "behavioural": return "blue";
    case "linguistic":  return "green";
    case "ritual":      return "amber";
    case "community":   return "purple";
    default:            return "neutral";
  }
}

function fitTone(fit: string): "green" | "amber" | "red" | "neutral" {
  switch (fit) {
    case "strong":   return "green";
    case "weak":     return "amber";
    case "not_ours": return "red";
    default:         return "neutral";
  }
}

function fitLabel(fit: string): string {
  switch (fit) {
    case "pending":  return "Pending assessment";
    case "strong":   return "Strong fit";
    case "weak":     return "Weak fit";
    case "not_ours": return "Not ours to enter";
    default:         return fit;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function CulturalSignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cultural_signals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return notFound();
  const signal = data as Signal;

  const part2Complete = !!(signal.why_it_matters && signal.brand_fit_notes && signal.brand_fit_status !== "pending");

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/cultural-radar" className="hover:text-neutral-700 underline">Cultural Radar</Link>
        <span>/</span>
        <span className="text-neutral-600 font-medium truncate">{signal.signal_name}</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start gap-3 flex-wrap mb-2">
          <SectionTitle>{signal.signal_name}</SectionTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={typeTone(signal.signal_type)}>{signal.signal_type}</Badge>
          <Badge tone="neutral">{signal.geographic_scope}</Badge>
          {signal.is_trending
            ? <Badge tone="green">Currently moving</Badge>
            : <Badge tone="neutral">Permanent ordinary</Badge>
          }
          {signal.brand_fit_status !== "pending" && (
            <Badge tone={fitTone(signal.brand_fit_status)}>{fitLabel(signal.brand_fit_status)}</Badge>
          )}
          <span className="text-xs text-neutral-400">{formatDate(signal.created_at)}</span>
        </div>
      </div>

      {/* ── Part 1: Read the culture ────────────────────────────────────── */}
      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
              Part 1 — Read the culture
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Where observed</p>
            <p className="text-sm text-neutral-700">{signal.source_description}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Evidence</p>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{signal.evidence}</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Link
              href={`/cultural-radar/new?edit=${signal.id}`}
              className="text-xs text-neutral-400 hover:text-neutral-700 underline"
            >
              Edit signal details
            </Link>
          </div>
        </div>
      </Card>

      {/* ── Part 2: Understand the culture ─────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
          Part 2 — Understand the culture
        </p>
        <BrandFitForm signal={signal} />
      </div>

      {/* ── Part 3: Fuel the creative (handoff brief) ───────────────────── */}
      {part2Complete && (
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
            Part 3 — Fuel the creative
          </p>
          <HandoffPanel
            signalId={signal.id}
            handoffBrief={signal.handoff_brief}
            generatedAt={signal.handoff_generated_at}
            brandFitStatus={signal.brand_fit_status}
            communityRespectCheck={signal.community_respect_check}
          />
        </div>
      )}

      {!part2Complete && (
        <div className="rounded-xl bg-neutral-50 border border-dashed border-neutral-200 px-5 py-5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
            Part 3 — Fuel the creative
          </p>
          <p className="text-sm text-neutral-400">
            Complete Part 2 first. The handoff brief cannot be generated until the brand fit assessment is done.
          </p>
        </div>
      )}

      {/* ── Archive ──────────────────────────────────────────────────────── */}
      {signal.status !== "archived" && (
        <div className="pt-2">
          <ArchiveButtonClient signalId={signal.id} />
        </div>
      )}

    </div>
  );
}
