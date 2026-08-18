"use client";
// CulturalContextSection.tsx
// Shows cultural signals relevant to this client, by industry match or direct association.
// Surfaces within the client detail page — cultural intelligence feeds client work, not a
// separate tab.

import Link from "next/link";

type CulturalSignal = {
  id: string;
  signal_name: string;
  signal_type: string;
  is_trending: boolean;
  evidence: string;
  why_it_matters: string | null;
  brand_fit_status: string;
  status: string;
  geographic_scope: string;
  relevant_industries: string[];
  is_generic: boolean;
  client_id: string | null;
  created_at: string;
};

function fitTone(fit: string) {
  switch (fit) {
    case "strong":   return "bg-green-50 border-green-200 text-green-800";
    case "weak":     return "bg-amber-50 border-amber-200 text-amber-800";
    case "not_ours": return "bg-red-50 border-red-200 text-red-700";
    default:         return "bg-neutral-50 border-neutral-200 text-neutral-500";
  }
}

function typeBadge(type: string) {
  switch (type) {
    case "behavioural": return "bg-blue-100 text-blue-700";
    case "linguistic":  return "bg-green-100 text-green-700";
    case "ritual":      return "bg-amber-100 text-amber-700";
    case "community":   return "bg-purple-100 text-purple-700";
    default:            return "bg-neutral-100 text-neutral-500";
  }
}

export function CulturalContextSection({
  clientId,
  clientIndustry,
  signals,
}: {
  clientId: string;
  clientIndustry: string | null;
  signals: CulturalSignal[];
}) {
  if (signals.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-neutral-700 uppercase tracking-wider">Cultural Context</p>
          <Link
            href={`/cultural-radar/new?client_id=${clientId}`}
            className="text-xs text-neutral-500 hover:text-neutral-800 underline"
          >
            Log a signal →
          </Link>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <p className="text-sm text-neutral-400">
            No cultural signals logged for {clientIndustry ?? "this client"} yet.{" "}
            <Link href="/cultural-radar/new" className="underline hover:text-neutral-700">Log the first one</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-neutral-700 uppercase tracking-wider">
          Cultural Context{" "}
          <span className="text-neutral-400 font-normal normal-case">({signals.length})</span>
        </p>
        <Link
          href={`/cultural-radar/new?client_id=${clientId}`}
          className="text-xs text-neutral-500 hover:text-neutral-800 underline"
        >
          + Log signal →
        </Link>
      </div>

      <div className="space-y-2">
        {signals.map(s => (
          <Link key={s.id} href={`/cultural-radar/${s.id}`} className="block group">
            <div className={`rounded-xl border px-4 py-3 space-y-1.5 transition-colors group-hover:border-neutral-300 ${fitTone(s.brand_fit_status)}`}>
              <div className="flex items-start gap-2 flex-wrap">
                <p className="font-semibold text-sm flex-1 min-w-0">{s.signal_name}</p>
                {s.is_trending && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-wide shrink-0">
                    Trending
                  </span>
                )}
                {s.is_generic && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 uppercase tracking-wide shrink-0">
                    All brands
                  </span>
                )}
                {s.client_id === clientId && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-900 text-white uppercase tracking-wide shrink-0">
                    This client
                  </span>
                )}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${typeBadge(s.signal_type)}`}>
                  {s.signal_type}
                </span>
              </div>
              <p className="text-xs opacity-80 line-clamp-2">{s.evidence}</p>
              {s.why_it_matters && (
                <p className="text-xs font-medium opacity-70 line-clamp-1">Why it matters: {s.why_it_matters}</p>
              )}
              <div className="flex items-center gap-2 text-[10px] opacity-60">
                <span className="capitalize font-medium">{s.brand_fit_status} fit</span>
                <span>·</span>
                <span>{s.geographic_scope}</span>
                <span>·</span>
                <span className="capitalize">{s.status}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
