// app/(os)/cultural-radar/page.tsx
// Cultural Radar & Instigation Engine — signal log index
// GA3 prototype: deliberately minimal. Three-part loop per signal.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, SectionTitle, buttonClass } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

type CulturalSignal = {
  id: string;
  signal_name: string;
  signal_type: string;
  is_trending: boolean;
  geographic_scope: string;
  brand_fit_status: string;
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

function statusLabel(status: string): string {
  switch (status) {
    case "logged":   return "Logged";
    case "assessed": return "Assessed";
    case "briefed":  return "Briefed";
    case "archived": return "Archived";
    default: return status;
  }
}

function statusDot(status: string): string {
  switch (status) {
    case "logged":   return "bg-neutral-300";
    case "assessed": return "bg-amber-400";
    case "briefed":  return "bg-emerald-500";
    case "archived": return "bg-neutral-200";
    default:         return "bg-neutral-300";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function CulturalRadarPage() {
  const supabase = createAdminClient();
  const { data: signals } = await supabase
    .from("cultural_signals")
    .select("id, signal_name, signal_type, is_trending, geographic_scope, brand_fit_status, status, created_at")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const { data: archived } = await supabase
    .from("cultural_signals")
    .select("id", { count: "exact", head: false })
    .eq("status", "archived");

  const counts = {
    total:    signals?.length ?? 0,
    logged:   signals?.filter(s => s.status === "logged").length   ?? 0,
    assessed: signals?.filter(s => s.status === "assessed").length ?? 0,
    briefed:  signals?.filter(s => s.status === "briefed").length  ?? 0,
    archived: archived?.length ?? 0,
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionTitle>Cultural Radar</SectionTitle>
          <p className="text-sm text-neutral-500 mt-1">
            Log what you see in culture. Understand it. Hand it to the creative team.
          </p>
        </div>
        <Link href="/cultural-radar/new" className={buttonClass}>
          + Log signal
        </Link>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total active", value: counts.total },
          { label: "Logged", value: counts.logged },
          { label: "Assessed", value: counts.assessed },
          { label: "Briefed", value: counts.briefed },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm">
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Signal list ──────────────────────────────────────────────────── */}
      {!signals || signals.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-neutral-400 text-sm mb-1">No signals logged yet.</p>
            <p className="text-neutral-300 text-xs mb-4">
              Start by logging something you noticed in culture — a phrase, a habit, a community behaviour.
            </p>
            <Link href="/cultural-radar/new" className={buttonClass}>
              Log your first signal
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-neutral-50">
            {(signals as CulturalSignal[]).map((sig) => (
              <Link
                key={sig.id}
                href={`/cultural-radar/${sig.id}`}
                className="flex items-start gap-4 px-6 py-4 hover:bg-neutral-50 transition-colors group"
              >
                {/* Status dot */}
                <div className="flex-shrink-0 pt-1.5">
                  <div className={`w-2 h-2 rounded-full ${statusDot(sig.status)}`} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-sm text-neutral-900 group-hover:text-neutral-700 leading-snug">
                      {sig.signal_name}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sig.is_trending && (
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                          Moving
                        </span>
                      )}
                      <Badge tone={typeTone(sig.signal_type)}>
                        {sig.signal_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-neutral-400">{sig.geographic_scope}</span>
                    <span className="text-xs text-neutral-200">·</span>
                    <span className="text-xs text-neutral-400">{formatDate(sig.created_at)}</span>
                    {sig.brand_fit_status !== "pending" && (
                      <>
                        <span className="text-xs text-neutral-200">·</span>
                        <Badge tone={fitTone(sig.brand_fit_status)}>
                          {sig.brand_fit_status === "not_ours" ? "Not ours" : sig.brand_fit_status}
                        </Badge>
                      </>
                    )}
                    <span className="text-xs text-neutral-200">·</span>
                    <span className="text-xs text-neutral-400">{statusLabel(sig.status)}</span>
                  </div>
                </div>

                <div className="text-neutral-300 group-hover:text-neutral-400 flex-shrink-0 pt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* ── Principle reminder ───────────────────────────────────────────── */}
      <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-5 py-4">
        <p className="text-xs text-neutral-500 leading-relaxed">
          <span className="font-semibold text-neutral-700">One principle above all of it:</span>{" "}
          culture has no fixed formula. There are two equally valid ways in — catching something moving before
          anyone else notices, or simply listening closely to something people have always said and never
          thought to use. What matters is the judgment to know which one fits the brand and the moment.
          That part stays human.
        </p>
      </div>

    </div>
  );
}
