// app/(os)/prospects/discover/page.tsx
// Market Discovery Engine — AI scans a sector and surfaces companies with active
// business signals that aren't yet in the pipeline.

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
  relevance_score: number;
};

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

function scoreTone(score: number): string {
  if (score >= 75) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 55) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-neutral-50 text-neutral-600 border-neutral-200";
}

function signalTone(type: string): string {
  if (type === "Growth")      return "bg-blue-50 text-blue-700";
  if (type === "Recognition") return "bg-purple-50 text-purple-700";
  if (type === "Leadership")  return "bg-orange-50 text-orange-700";
  if (type === "Activation")  return "bg-green-50 text-green-700";
  return "bg-neutral-50 text-neutral-600";
}

export default function DiscoverPage() {
  const router = useRouter();
  const [sector, setSector]       = useState("");
  const [market, setMarket]       = useState("Malaysia");
  const [marketCode, setMarketCode] = useState("MY");
  const [scanning, setScanning]   = useState(false);
  const [results, setResults]     = useState<Discovered[] | null>(null);
  const [warning, setWarning]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [adding, setAdding]       = useState<Record<string, boolean>>({});
  const [added, setAdded]         = useState<Record<string, boolean>>({});

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
        body: JSON.stringify({ sector, market, market_code: marketCode }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Discovery failed."); return; }
      setResults(json.companies ?? []);
      if (json.warning) setWarning(json.warning);
    } catch (e) {
      setError(`Discovery error: ${String(e)}`);
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

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 bg-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Market Discovery Engine</p>
          <p className="text-sm text-neutral-500">AI scans a sector and surfaces companies with active business signals.</p>
        </div>
        <Link href="/prospects" className="text-sm text-neutral-500 hover:text-neutral-800 underline shrink-0">
          Back to Prospects
        </Link>
      </div>

      {/* ── Search form ──────────────────────────────────────────────────── */}
      <Card>
        <form onSubmit={runDiscover} className="space-y-4">
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
            {scanning ? "Scanning market…" : "Discover Companies"}
          </button>
        </form>
      </Card>

      {/* ── Error / warning ──────────────────────────────────────────────── */}
      {error   && <Card><p className="text-sm text-red-600">{error}</p></Card>}
      {warning && <Card><p className="text-sm text-amber-600">{warning}</p></Card>}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {results !== null && (
        <div className="space-y-3">
          <SectionTitle>
            {results.length > 0
              ? `${results.length} compan${results.length === 1 ? "y" : "ies"} discovered`
              : "No companies discovered"}
          </SectionTitle>

          {results.length === 0 && (
            <Card>
              <p className="text-sm text-neutral-500">
                No companies with active signals found for this sector and market. Try a broader sector or different market.
              </p>
            </Card>
          )}

          {results.map(company => (
            <Card key={company.name}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-neutral-900">{company.name}</p>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${scoreTone(company.relevance_score)}`}>
                      {company.relevance_score}% fit
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${signalTone(company.signal_type)}`}>
                      {company.signal_type}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mb-2">{company.industry} · {company.market_code}</p>
                  <p className="text-sm text-neutral-700 mb-2">{company.signal_text}</p>
                  <div className="bg-neutral-50 rounded-lg px-3 py-2 border border-neutral-100">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Why now</p>
                    <p className="text-xs text-neutral-600">{company.why_now}</p>
                  </div>
                  {company.source_url && (
                    <a
                      href={company.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-neutral-400 hover:text-neutral-600 underline mt-1.5 inline-block truncate max-w-xs"
                    >
                      {company.source_url}
                    </a>
                  )}
                </div>
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
