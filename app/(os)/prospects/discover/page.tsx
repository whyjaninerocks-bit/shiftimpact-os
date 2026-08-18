// app/(os)/prospects/discover/page.tsx
// Market Discovery Engine — AI scans a sector and surfaces companies with active
// business signals that aren't yet in the pipeline.
//
// Signal Focus mode: search by signal type (Award Winners, Leadership Changes,
// Hiring Campaigns, etc.) in addition to sector-based discovery.
// All 7 KB signal categories supported.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, SectionTitle } from "@/app/_components/ui";

type Discovered = {
  name: string;
  industry: string;
  market_code: string;
  signal_type: string;
  signal_text: string;
  source_url?: string;
  why_now: string;
  shiftimpact_angle?: string;
  relevance_score: number;
};

// ─── Presets ─────────────────────────────────────────────────────────────────

const SECTOR_PRESETS = [
  { label: "FMCG & Food", value: "FMCG food beverage consumer goods" },
  { label: "Financial Services", value: "banking financial services insurance" },
  { label: "Technology", value: "technology software fintech" },
  { label: "Retail & E-commerce", value: "retail ecommerce fashion lifestyle" },
  { label: "Healthcare", value: "healthcare pharmaceutical medical" },
  { label: "Property & Construction", value: "property real estate construction" },
];

const MARKET_PRESETS = [
  { label: "Malaysia", value: "Malaysia", code: "MY" },
  { label: "Singapore", value: "Singapore", code: "SG" },
  { label: "Philippines", value: "Philippines", code: "PH" },
  { label: "Thailand", value: "Thailand", code: "TH" },
  { label: "Indonesia", value: "Indonesia", code: "ID" },
];

// 7 KB signal categories
const SIGNAL_FOCUS_PRESETS = [
  {
    value: "",
    label: "All signals",
    description: "Find companies across any signal type",
    icon: "🔍",
  },
  {
    value: "Growth",
    label: "Growth moments",
    description: "Funding, expansion, new partnerships",
    icon: "📈",
  },
  {
    value: "Recognition",
    label: "Award winners",
    description: "Awards, ESG recognition, employer rankings",
    icon: "🏆",
  },
  {
    value: "Milestone",
    label: "Milestones",
    description: "Anniversaries, customer milestones, achievements",
    icon: "🎯",
  },
  {
    value: "Activation",
    label: "Launches & events",
    description: "Product launches, rebranding, sponsorships",
    icon: "🚀",
  },
  {
    value: "Leadership",
    label: "Leadership changes",
    description: "New CEO/CMO, founder transitions",
    icon: "👤",
  },
  {
    value: "Competitive",
    label: "Market disruption",
    description: "New entrants, regulation shifts, category change",
    icon: "⚡",
  },
  {
    value: "Talent",
    label: "Hiring campaigns",
    description: "Marketing, brand, digital, growth roles",
    icon: "🧲",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreTone(score: number): string {
  if (score >= 75) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 55) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-neutral-50 text-neutral-600 border-neutral-200";
}

function signalTone(type: string): string {
  switch (type) {
    case "Growth":      return "bg-blue-50 text-blue-700";
    case "Recognition": return "bg-purple-50 text-purple-700";
    case "Leadership":  return "bg-orange-50 text-orange-700";
    case "Activation":  return "bg-green-50 text-green-700";
    case "Competitive": return "bg-red-50 text-red-700";
    case "Talent":      return "bg-teal-50 text-teal-700";
    case "Milestone":   return "bg-indigo-50 text-indigo-700";
    default:            return "bg-neutral-50 text-neutral-600";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();

  const [sector, setSector]           = useState("");
  const [market, setMarket]           = useState("Malaysia");
  const [marketCode, setMarketCode]   = useState("MY");
  const [signalFocus, setSignalFocus] = useState("");
  const [scanning, setScanning]       = useState(false);
  const [results, setResults]         = useState<Discovered[] | null>(null);
  const [warning, setWarning]         = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [adding, setAdding]           = useState<Record<string, boolean>>({});
  const [added, setAdded]             = useState<Record<string, boolean>>({});

  async function runDiscover(e: React.FormEvent) {
    e.preventDefault();
    if (!sector.trim()) return;
    setScanning(true);
    setResults(null);
    setWarning(null);
    setError(null);

    try {
      const res = await fetch("/api/market-discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector,
          market,
          market_code: marketCode,
          signal_focus: signalFocus || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Discovery failed."); return; }
      setResults(json.companies ?? []);
      if (json.warning) setWarning(json.warning);
    } catch (err) {
      setError(`Discovery error: ${String(err)}`);
    } finally {
      setScanning(false);
    }
  }

  async function addToPipeline(company: Discovered) {
    setAdding(prev => ({ ...prev, [company.name]: true }));
    try {
      const res = await fetch("/api/prospect-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        company.name,
          industry:    company.industry,
          market_code: company.market_code,
          status:      "Watching",
          source_notes: `Discovered via Market Discovery Engine. Signal: ${company.signal_text}`,
        }),
      });
      if (res.ok) {
        setAdded(prev => ({ ...prev, [company.name]: true }));
        router.refresh();
      }
    } finally {
      setAdding(prev => ({ ...prev, [company.name]: false }));
    }
  }

  const focusLabel = SIGNAL_FOCUS_PRESETS.find(f => f.value === signalFocus)?.label ?? "All signals";

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 bg-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Market Discovery Engine</p>
          <p className="text-sm text-neutral-500">
            Find companies with active business signals — by sector, market, and signal type.
          </p>
        </div>
        <Link href="/prospects" className="text-sm text-neutral-500 hover:text-neutral-800 underline shrink-0">
          Back to Prospects
        </Link>
      </div>

      {/* ── Search form ────────────────────────────────────────────────── */}
      <Card>
        <form onSubmit={runDiscover} className="space-y-5">

          {/* Sector */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Sector</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {SECTOR_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSector(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    sector === p.value
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              value={sector}
              onChange={e => setSector(e.target.value)}
              placeholder="Or type a custom sector…"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>

          {/* Signal Focus — all 7 KB categories */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Signal Focus
              <span className="ml-2 font-normal normal-case text-neutral-400">
                — narrow to a specific type of business moment
              </span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SIGNAL_FOCUS_PRESETS.map(p => (
                <button
                  key={p.value || "all"}
                  type="button"
                  onClick={() => setSignalFocus(p.value)}
                  className={`px-3 py-2 rounded-lg text-left border transition-colors ${
                    signalFocus === p.value
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <span className="block text-xs font-medium mb-0.5">{p.icon} {p.label}</span>
                  <span className={`text-[10px] leading-tight ${signalFocus === p.value ? "text-neutral-300" : "text-neutral-400"}`}>
                    {p.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Market */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Market</p>
            <div className="flex flex-wrap gap-2">
              {MARKET_PRESETS.map(p => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => { setMarket(p.value); setMarketCode(p.code); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    marketCode === p.code
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={scanning || !sector.trim()}
            className="w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-40 transition-colors"
          >
            {scanning
              ? `Scanning for ${focusLabel.toLowerCase()} in ${sector}…`
              : "Discover Companies"}
          </button>
        </form>
      </Card>

      {/* ── Error / warning ────────────────────────────────────────────── */}
      {error   && <Card><p className="text-sm text-red-600">{error}</p></Card>}
      {warning && <Card><p className="text-sm text-amber-600">{warning}</p></Card>}

      {/* ── Results ────────────────────────────────────────────────────── */}
      {results !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SectionTitle>
              {results.length > 0
                ? `${results.length} compan${results.length === 1 ? "y" : "ies"} discovered`
                : "No companies discovered"}
            </SectionTitle>
            {signalFocus && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${signalTone(signalFocus)}`}>
                {SIGNAL_FOCUS_PRESETS.find(f => f.value === signalFocus)?.icon} {signalFocus} focus
              </span>
            )}
          </div>

          {results.length === 0 && (
            <Card>
              <p className="text-sm text-neutral-500">
                No companies with active signals found. Try a broader sector, different market, or change the signal focus.
              </p>
            </Card>
          )}

          {results.map(company => (
            <Card key={company.name}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">

                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-neutral-900">{company.name}</p>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${scoreTone(company.relevance_score)}`}>
                      {company.relevance_score}% fit
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${signalTone(company.signal_type)}`}>
                      {company.signal_type}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400">{company.industry} · {company.market_code}</p>

                  {/* Signal */}
                  <p className="text-sm text-neutral-700">{company.signal_text}</p>

                  {/* Why now */}
                  <div className="bg-neutral-50 rounded-lg px-3 py-2 border border-neutral-100">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Why now</p>
                    <p className="text-xs text-neutral-600">{company.why_now}</p>
                  </div>

                  {/* ShiftImpact angle */}
                  {company.shiftimpact_angle && (
                    <div className="bg-neutral-900 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">ShiftImpact angle</p>
                      <p className="text-xs text-white">{company.shiftimpact_angle}</p>
                    </div>
                  )}

                  {/* Source */}
                  {company.source_url && (
                    <a
                      href={company.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-neutral-400 hover:text-neutral-600 underline inline-block truncate max-w-xs"
                    >
                      {company.source_url}
                    </a>
                  )}
                </div>

                {/* Add to pipeline */}
                <div className="shrink-0">
                  {added[company.name] ? (
                    <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                      Added ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => addToPipeline(company)}
                      disabled={adding[company.name]}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {adding[company.name] ? "Adding…" : "+ Add to Pipeline"}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
