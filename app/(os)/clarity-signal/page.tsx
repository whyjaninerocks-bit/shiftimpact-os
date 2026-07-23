"use client";

// app/(os)/clarity-signal/page.tsx
// Clarity Signal™ — Executive prospect outreach snapshot
// Input form: Brand, Campaign, Industry, Country, Social Channels, Competitors, Context

import { useState } from "react";
import { useRouter } from "next/navigation";

const INDUSTRIES = [
  { value: "FMCG",                label: "FMCG / Consumer Goods" },
  { value: "F&B",                 label: "F&B / Food & Beverage" },
  { value: "QSR",                 label: "QSR / Quick Service Restaurant" },
  { value: "Hospitality",         label: "Hospitality / Hotel" },
  { value: "Retail",              label: "Retail" },
  { value: "Telco",               label: "Telco / Telecommunications" },
  { value: "E-commerce",          label: "E-commerce / Marketplace" },
  { value: "Financial Services",  label: "Financial Services / Insurance" },
  { value: "Healthcare",          label: "Healthcare / Wellness" },
  { value: "Automotive",          label: "Automotive" },
  { value: "B2B",                 label: "B2B / Professional Services" },
  { value: "Other",               label: "Other" },
];

const COUNTRIES = [
  { value: "Malaysia",     label: "Malaysia" },
  { value: "Singapore",    label: "Singapore" },
  { value: "Indonesia",    label: "Indonesia" },
  { value: "Philippines",  label: "Philippines" },
  { value: "Thailand",     label: "Thailand" },
  { value: "Vietnam",      label: "Vietnam" },
  { value: "Other",        label: "Other" },
];

export default function ClaritySignalPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brand, setBrand] = useState("");
  const [campaign, setCampaign] = useState("");
  const [industry, setIndustry] = useState("FMCG");
  const [country, setCountry] = useState("Malaysia");
  const [website, setWebsite] = useState("");
  const [socialChannels, setSocialChannels] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [contextText, setContextText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clarity-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          campaign,
          industry,
          country,
          website,
          social_channels: socialChannels,
          competitors,
          context_text: contextText,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Analysis failed."); return; }
      router.push(`/clarity-signal/${data.id}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300";
  const labelCls = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";
  const sectionCls = "bg-white border border-neutral-100 rounded-xl p-5 space-y-4";

  return (
    <div className="max-w-2xl">

      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Shift Impact™</p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Clarity Signal™</h1>
        <p className="text-sm text-neutral-500 mt-1">
          A one-page executive snapshot built from publicly available signals. Designed to create clarity and earn the next strategic conversation.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Brand & Campaign */}
        <div className={sectionCls}>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Brand and Campaign</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Brand *</label>
              <input
                className={inputCls}
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Public Bank, Maxis, Yeo's"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Campaign *</label>
              <input
                className={inputCls}
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
                placeholder="e.g. 60th Diamond Jubilee, Raya 2025"
                required
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Industry *</label>
              <select className={inputCls} value={industry} onChange={e => setIndustry(e.target.value)}>
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Country *</label>
              <select className={inputCls} value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Channels and Competitors */}
        <div className={sectionCls}>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Market Context</p>
          <div>
            <label className={labelCls}>Brand Website</label>
            <input
              className={inputCls}
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://www.brand.com.my"
            />
          </div>
          <div>
            <label className={labelCls}>Social Channels</label>
            <input
              className={inputCls}
              value={socialChannels}
              onChange={e => setSocialChannels(e.target.value)}
              placeholder="e.g. Facebook: /publicbankmy, Instagram: @publicbankmy, TikTok: @publicbank"
            />
          </div>
          <div>
            <label className={labelCls}>Key Competitors</label>
            <input
              className={inputCls}
              value={competitors}
              onChange={e => setCompetitors(e.target.value)}
              placeholder="e.g. Maybank, CIMB, RHB"
            />
          </div>
        </div>

        {/* Context */}
        <div className={sectionCls}>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Signal Context</p>
            <p className="text-xs text-neutral-500 mt-0.5">Paste any publicly available campaign information — social posts, press coverage, campaign copy, observations</p>
          </div>
          <div>
            <label className={labelCls}>
              Campaign Information <span className="font-normal text-neutral-400 normal-case">(paste anything known)</span>
            </label>
            <textarea
              className={`${inputCls} font-mono text-xs`}
              rows={10}
              value={contextText}
              onChange={e => setContextText(e.target.value)}
              placeholder={`Paste publicly available campaign information here. Include any of:
• Campaign tagline, key message, or creative direction
• Social media posts or captions observed
• Press coverage or news mentions
• Prize mechanics, promotional details, or offers
• Observed channel activity (e.g. running Facebook ads, TikTok KOL posts)
• Competitor context if relevant
• Any business observations from public sources

The more context provided, the sharper the signal snapshot.`}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-neutral-900 text-white text-sm font-bold hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Generating Clarity Signal™…" : "Generate Clarity Signal™ →"}
        </button>

        {loading && (
          <div className="text-center space-y-1">
            <p className="text-xs text-neutral-500">Analysing public signals — typically 15 to 20 seconds.</p>
            <p className="text-[10px] text-neutral-400">Extracting decision intelligence from observable data only.</p>
          </div>
        )}

      </form>
    </div>
  );
}
