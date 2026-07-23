"use client";

// app/(os)/clarity-signal/page.tsx
// Clarity Signal™ — Executive prospect outreach snapshot
// Input form with auto-fetch from public signals (website, press, social)

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

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

// Signal sources for auto-fetch — reuses /api/audit-fetch
const SIGNAL_SOURCES = [
  {
    value: "podcast",
    label: "Podcast Search",
    hint: "Searches Apple Podcasts for branded or campaign podcast series — returns show info and episode descriptions (free, no Apify required)",
    field: "none",
    placeholder: "",
  },
  {
    value: "trade_press_deep",
    label: "Trade Press Search",
    hint: "Searches APAC + global trade media — Marketing Interactive, Campaign Brief Asia, Mumbrella, The Drum, AdWeek and more",
    field: "none",
    placeholder: "",
  },
  {
    value: "article_url",
    label: "Article URL",
    hint: "Paste a specific article URL — fully extracts content even from JS-rendered pages",
    field: "website_url",
    placeholder: "https://marketinginteractive.com/article/...",
  },
  {
    value: "website",
    label: "Brand Website",
    hint: "Scrapes homepage or campaign landing page — now uses headless browser when Apify is configured",
    field: "website_url",
    placeholder: "https://www.brand.com.my",
  },
  {
    value: "press",
    label: "Google News",
    hint: "Google News index — good for mainstream media, limited for trade press",
    field: "none",
    placeholder: "",
  },
  {
    value: "facebook_ads",
    label: "Facebook Ad Library",
    hint: "Active paid ads — brand page URL or name",
    field: "page_url",
    placeholder: "https://www.facebook.com/brandmy or brand name",
  },
  {
    value: "instagram",
    label: "Instagram Posts",
    hint: "Brand Instagram handle",
    field: "handle",
    placeholder: "@brandmy",
  },
  {
    value: "tiktok",
    label: "TikTok Posts",
    hint: "Brand TikTok handle",
    field: "handle",
    placeholder: "@brandmy",
  },
];

type FetchedSource = { label: string; count: number };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClaritySignalPage() {
  const router = useRouter();

  // Form state
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

  // Auto-fetch state
  const [showFetch, setShowFetch] = useState(false);
  const [fetchSource, setFetchSource] = useState("website");
  const [fetchHandle, setFetchHandle] = useState("");
  const [fetchPageUrl, setFetchPageUrl] = useState("");
  const [fetchWebsiteUrl, setFetchWebsiteUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedSources, setFetchedSources] = useState<FetchedSource[]>([]);

  const srcCfg = SIGNAL_SOURCES.find(s => s.value === fetchSource)!;

  // ─── Auto-fetch handler ──────────────────────────────────────────────────────

  async function handleFetch() {
    setFetching(true);
    setFetchError(null);
    try {
      // For website platform, fall back to the website field from the form
      const wsUrl = fetchWebsiteUrl || website;

      const res = await fetch("/api/audit-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: fetchSource,
          handle: fetchHandle,
          page_url: fetchPageUrl,
          website_url: wsUrl,
          brand_name: brand,
          campaign_name: campaign,
        }),
      });

      const data = await res.json();

      if (data.setup_required) {
        setFetchError(
          "Apify is not configured. Brand website fetching works without Apify. Add APIFY_API_TOKEN to Vercel to enable press and social fetching."
        );
        return;
      }

      if (!res.ok || data.error) {
        setFetchError(data.error ?? "Fetch failed. Please try again.");
        return;
      }

      setContextText(prev => (prev ? `${prev}\n\n${data.content}` : data.content));
      setFetchedSources(prev => [...prev, { label: srcCfg.label, count: data.count ?? 0 }]);

      // Reset handle/URL fields after fetch
      setFetchHandle("");
      setFetchPageUrl("");
      setFetchWebsiteUrl("");

    } catch {
      setFetchError("Network error. Please try again.");
    } finally {
      setFetching(false);
    }
  }

  // ─── Form submit ─────────────────────────────────────────────────────────────

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
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const inputCls = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300";
  const labelCls = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";
  const sectionCls = "bg-white border border-neutral-100 rounded-xl p-5 space-y-4";

  // ─── Render ──────────────────────────────────────────────────────────────────

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

        {/* ── Brand and Campaign ──────────────────────────────────────────────── */}
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

        {/* ── Market Context ──────────────────────────────────────────────────── */}
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

        {/* ── Auto Fetch Panel ────────────────────────────────────────────────── */}
        <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">

          {/* Toggle */}
          <button
            type="button"
            onClick={() => setShowFetch(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">
                Auto Fetch Public Signals
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pull live data from website, press, and social channels
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {fetchedSources.length > 0 && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                  {fetchedSources.length} fetched
                </span>
              )}
              <span className="text-neutral-400 text-sm">{showFetch ? "▲" : "▼"}</span>
            </div>
          </button>

          {/* Fetch panel — visible when toggled */}
          {showFetch && (
            <div className="border-t border-neutral-100 p-5 space-y-4 bg-neutral-50">

              {/* Fetched sources badges */}
              {fetchedSources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {fetchedSources.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">
                      <span className="text-emerald-500 text-[10px]">✓</span>
                      {s.label}
                      {s.count > 0 && <span className="text-emerald-500">({s.count})</span>}
                    </span>
                  ))}
                </div>
              )}

              {/* Source selector */}
              <div>
                <label className={labelCls}>Signal Source</label>
                <select
                  className={inputCls}
                  value={fetchSource}
                  onChange={e => {
                    setFetchSource(e.target.value);
                    setFetchHandle("");
                    setFetchPageUrl("");
                    setFetchWebsiteUrl("");
                    setFetchError(null);
                  }}
                >
                  {SIGNAL_SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-400 mt-1">{srcCfg.hint}</p>
              </div>

              {/* Dynamic input based on source */}
              {srcCfg.field === "handle" && (
                <div>
                  <label className={labelCls}>Handle</label>
                  <input
                    className={inputCls}
                    value={fetchHandle}
                    onChange={e => setFetchHandle(e.target.value)}
                    placeholder={srcCfg.placeholder}
                  />
                </div>
              )}

              {srcCfg.field === "page_url" && (
                <div>
                  <label className={labelCls}>Facebook Page URL or Brand Name</label>
                  <input
                    className={inputCls}
                    value={fetchPageUrl}
                    onChange={e => setFetchPageUrl(e.target.value)}
                    placeholder={srcCfg.placeholder}
                  />
                </div>
              )}

              {srcCfg.field === "website_url" && (
                <div>
                  <label className={labelCls}>
                    URL
                    {website && (
                      <span className="font-normal text-neutral-400 normal-case ml-1">
                        — or leave blank to use the brand website above
                      </span>
                    )}
                  </label>
                  <input
                    className={inputCls}
                    value={fetchWebsiteUrl}
                    onChange={e => setFetchWebsiteUrl(e.target.value)}
                    placeholder={website || srcCfg.placeholder}
                  />
                </div>
              )}

              {srcCfg.field === "none" && brand && (
                <p className="text-xs text-neutral-500">
                  Will search Google News for <strong>{brand}</strong>{campaign ? ` and "${campaign}"` : ""}.
                </p>
              )}

              {/* Fetch button and error */}
              {fetchError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {fetchError}
                </p>
              )}

              <button
                type="button"
                onClick={handleFetch}
                disabled={fetching || !brand.trim()}
                className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-700 disabled:opacity-40 transition-colors"
              >
                {fetching ? "Fetching…" : `Fetch ${srcCfg.label} →`}
              </button>

              {!brand.trim() && (
                <p className="text-xs text-neutral-400">Enter a brand name above to enable fetching.</p>
              )}

            </div>
          )}
        </div>

        {/* ── Signal Context ──────────────────────────────────────────────────── */}
        <div className={sectionCls}>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Signal Context</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Paste any publicly available campaign information — or use Auto Fetch above to pull live signals
            </p>
          </div>
          <div>
            <label className={labelCls}>
              Campaign Information{" "}
              <span className="font-normal text-neutral-400 normal-case">(paste anything known)</span>
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
