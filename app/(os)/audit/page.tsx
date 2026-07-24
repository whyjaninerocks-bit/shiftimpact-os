"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type FetchedSignal = { label: string; count: number; platform: string };

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
  { value: "Other",               label: "Other" },
];

const PHASES = [
  { value: "Demand",     label: "Demand — Building awareness and reach" },
  { value: "Conversion", label: "Conversion — Driving purchase intent" },
  { value: "Retention",  label: "Retention — Loyalty and repeat behaviour" },
];

const BUDGET_RANGES = [
  { value: "",               label: "Prefer not to disclose" },
  { value: "Under RM500K",   label: "Under RM 500K" },
  { value: "RM500K–RM1M",    label: "RM 500K – RM 1M" },
  { value: "RM1M–RM3M",      label: "RM 1M – RM 3M" },
  { value: "RM3M–RM10M",     label: "RM 3M – RM 10M" },
  { value: "Above RM10M",    label: "Above RM 10M" },
];

const CHANNELS = [
  { value: "TikTok",             label: "TikTok" },
  { value: "Instagram",          label: "Instagram" },
  { value: "Facebook",           label: "Facebook" },
  { value: "YouTube",            label: "YouTube" },
  { value: "Google Search",      label: "Google Search / SEO" },
  { value: "KOL / Influencer",   label: "KOL / Influencer" },
  { value: "Programmatic",       label: "Programmatic / Display" },
  { value: "Radio",              label: "Radio" },
  { value: "OOH",                label: "OOH / Outdoor" },
  { value: "Retail / In-Store",  label: "Retail / In-Store" },
  { value: "PR / Earned Media",  label: "PR / Earned Media" },
  { value: "GrabAds",            label: "GrabAds / GrabFood" },
  { value: "Shopee / Lazada",    label: "Shopee / Lazada" },
  { value: "WhatsApp / CRM",     label: "WhatsApp / CRM" },
  { value: "Email",              label: "Email" },
];

const FETCH_PLATFORMS = [
  { value: "twitter",           label: "Twitter / X Posts",    hint: "Brand handle or campaign hashtag",          field: "handle",      placeholder: "@nikefootball or #NikeChamber" },
  { value: "podcast",          label: "Podcast Search",       hint: "Apple Podcasts — branded podcast series and episode descriptions (free, no Apify)", field: "none",        placeholder: "" },
  { value: "trade_press_deep", label: "Trade Press Search",  hint: "APAC + global trade media — Marketing Interactive, Campaign Brief Asia, Mumbrella, The Drum, AdWeek", field: "none",        placeholder: "" },
  { value: "article_url",      label: "Article URL",          hint: "Paste specific article URL — headless browser extracts full content", field: "website_url", placeholder: "https://marketinginteractive.com/article/..." },
  { value: "facebook_ads",     label: "Facebook Ad Library",  hint: "Brand page URL or name",    field: "page_url",    placeholder: "https://www.facebook.com/YeosMY or brand name" },
  { value: "instagram",        label: "Instagram Posts",      hint: "Brand handle",               field: "handle",      placeholder: "@yeos.my" },
  { value: "tiktok",           label: "TikTok Posts",         hint: "Brand handle",               field: "handle",      placeholder: "@yeos_official" },
  { value: "youtube",          label: "YouTube Channel",      hint: "Channel handle or URL",      field: "handle",      placeholder: "@YeosMalaysia" },
  { value: "website",          label: "Brand Website",        hint: "Campaign landing page — headless browser when Apify configured", field: "website_url", placeholder: "https://www.yeos.com.my/campaign" },
  { value: "kol_hashtag",      label: "KOL / Hashtag",        hint: "Campaign hashtag",           field: "hashtag",     placeholder: "#ManisnyaBerbuka" },
  { value: "press",            label: "Google News",          hint: "Mainstream news index — limited trade press coverage", field: "none", placeholder: "" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: FetchedSignal }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">
      <span className="text-emerald-500 text-[10px]">✓</span>
      {signal.label}
      {signal.count > 0 && <span className="text-emerald-500">({signal.count})</span>}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuickAuditPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextText, setContextText] = useState("");
  const [fetchedSignals, setFetchedSignals] = useState<FetchedSignal[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [showFetch, setShowFetch] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Fetch panel state
  const [platform, setPlatform] = useState("facebook_ads");
  const [handle, setHandle] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [kolPlatform, setKolPlatform] = useState<"instagram" | "tiktok">("instagram");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [country, setCountry] = useState("Malaysia");
  // Carries forward the Signal's AI intelligence so Snapshot can extend rather than re-derive
  const [signalIntelligence, setSignalIntelligence] = useState<Record<string, unknown> | null>(null);

  const brandRef = useRef<HTMLInputElement>(null);
  const campaignRef = useRef<HTMLInputElement>(null);
  const industryRef = useRef<HTMLSelectElement>(null);
  const phaseRef = useRef<HTMLSelectElement>(null);
  const objectiveRef = useRef<HTMLInputElement>(null);
  const budgetRef = useRef<HTMLSelectElement>(null);

  // Pre-fill form on load from either:
  //   ?signal_id=xxx  → fetch stored context from a Clarity Signal (brand + campaign + full context)
  //   ?brand=&campaign=&industry= → simple URL params (manual deep link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const signalId = params.get("signal_id");

    if (signalId) {
      fetch(`/api/signal-context/${signalId}`)
        .then(r => r.json())
        .then(data => {
          if (data.brand_name && brandRef.current) brandRef.current.value = data.brand_name;
          if (data.campaign_name && campaignRef.current) campaignRef.current.value = data.campaign_name;
          if (data.industry && industryRef.current) industryRef.current.value = data.industry;
          if (data.country) setCountry(data.country);
          if (data.context_text) setContextText(data.context_text);
          if (data.signal_intelligence) setSignalIntelligence(data.signal_intelligence);
        })
        .catch(() => {
          // Signal not found or fetch failed — form stays empty for manual input
        });
      return;
    }

    // Fallback: plain URL params (brand/campaign/industry only, no context)
    const b = params.get("brand");
    const c = params.get("campaign");
    const ind = params.get("industry");
    if (b && brandRef.current) brandRef.current.value = b;
    if (c && campaignRef.current) campaignRef.current.value = c;
    if (ind && industryRef.current) industryRef.current.value = ind;
  }, []);

  const cfg = FETCH_PLATFORMS.find(p => p.value === platform)!;

  function toggleChannel(v: string) {
    setSelectedChannels(prev =>
      prev.includes(v) ? prev.filter(c => c !== v) : [...prev, v]
    );
  }

  async function handleFetch() {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/audit-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform, handle, hashtag,
          page_url: pageUrl,
          website_url: websiteUrl,
          brand_name: brandRef.current?.value ?? "",
          campaign_name: campaignRef.current?.value ?? "",
          kol_platform: kolPlatform,
        }),
      });
      const data = await res.json();
      if (data.setup_required) {
        setFetchError("Apify not configured. Add APIFY_API_TOKEN to Vercel environment variables. Brand website fetching works without Apify.");
        return;
      }
      if (!res.ok || data.error) { setFetchError(data.error ?? "Fetch failed."); return; }
      setContextText(prev => prev ? `${prev}\n\n${data.content}` : data.content);
      setFetchedSignals(prev => [...prev, {
        label: cfg.label,
        count: data.count ?? 0,
        platform,
      }]);
    } catch {
      setFetchError("Network error — please try again.");
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandRef.current?.value,
          campaign_name: campaignRef.current?.value,
          industry: industryRef.current?.value,
          country,
          signal_intelligence: signalIntelligence ?? undefined,
          campaign_phase: phaseRef.current?.value,
          business_objective: objectiveRef.current?.value,
          channels: selectedChannels,
          budget_range: budgetRef.current?.value,
          context_text: contextText,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Analysis failed."); return; }
      router.push(`/audit/${data.id}`);
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
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">ShiftImpact OS</p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Campaign Intelligence Preview</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Enter a prospect&apos;s live campaign. The system runs it through the full ShiftImpact OS intelligence stack using public signals — and shows them what they&apos;re blind to.
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Step 1: Brand & Campaign ── */}
        <div className={sectionCls}>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Brand & Campaign</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Brand / Client Name *</label>
                <input ref={brandRef} className={inputCls} placeholder="e.g. Yeo's, Drypers, Maxis" required />
              </div>
              <div>
                <label className={labelCls}>Campaign Name *</label>
                <input ref={campaignRef} className={inputCls} placeholder="e.g. Raya 2025, CaraMu Launch" required />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Industry *</label>
              <select ref={industryRef} className={inputCls} defaultValue="FMCG">
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Market *</label>
              <select className={inputCls} value={country} onChange={e => setCountry(e.target.value)}>
                <option value="Malaysia">Malaysia</option>
                <option value="Singapore">Singapore</option>
                <option value="Indonesia">Indonesia</option>
                <option value="Philippines">Philippines</option>
                <option value="Thailand">Thailand</option>
                <option value="Vietnam">Vietnam</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Campaign Phase</label>
              <select ref={phaseRef} className={inputCls} defaultValue="Demand">
                {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Business Objective</label>
              <input ref={objectiveRef} className={inputCls} placeholder="e.g. Trial purchase, Market share lift" />
            </div>
            <div>
              <label className={labelCls}>Approximate Media Budget</label>
              <select ref={budgetRef} className={inputCls}>
                {BUDGET_RANGES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Channel Mix ── */}
        <div className={sectionCls}>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Active Campaign Channels</p>
          <p className="text-xs text-neutral-500 -mt-2">Select all channels this campaign is currently running on</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleChannel(c.value)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  selectedChannels.includes(c.value)
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Signal Context ── */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Campaign Signals</p>
              <p className="text-xs text-neutral-500 mt-0.5">Auto-fetch from public sources or paste known campaign information</p>
            </div>
            <button
              type="button"
              onClick={() => setShowFetch(v => !v)}
              className="shrink-0 text-xs font-medium border border-neutral-200 rounded-lg px-3 py-1.5 hover:bg-neutral-50"
            >
              {showFetch ? "Hide fetch" : "Auto-fetch ↓"}
            </button>
          </div>

          {showFetch && (
            <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50">
              {fetchError && (
                <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{fetchError}</div>
              )}
              <div className="grid sm:grid-cols-2 gap-2 mb-3">
                <div>
                  <label className={labelCls}>Signal source</label>
                  <select className={inputCls} value={platform} onChange={e => { setPlatform(e.target.value); setHandle(""); setHashtag(""); setPageUrl(""); setWebsiteUrl(""); }}>
                    {FETCH_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{cfg.hint}</p>
                </div>
                <div>
                  {cfg.field === "handle" && (
                    <>
                      <label className={labelCls}>Handle / URL</label>
                      <input className={inputCls} value={handle} onChange={e => setHandle(e.target.value)} placeholder={cfg.placeholder} />
                    </>
                  )}
                  {cfg.field === "page_url" && (
                    <>
                      <label className={labelCls}>Page URL or brand name</label>
                      <input className={inputCls} value={pageUrl} onChange={e => setPageUrl(e.target.value)} placeholder={cfg.placeholder} />
                    </>
                  )}
                  {cfg.field === "website_url" && (
                    <>
                      <label className={labelCls}>Website URL</label>
                      <input className={inputCls} type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder={cfg.placeholder} />
                    </>
                  )}
                  {cfg.field === "hashtag" && (
                    <>
                      <label className={labelCls}>Hashtag</label>
                      <div className="flex gap-2">
                        <input className={`${inputCls} flex-1`} value={hashtag} onChange={e => setHashtag(e.target.value)} placeholder={cfg.placeholder} />
                        <select className="border border-neutral-200 rounded-lg px-2 py-2 text-sm bg-white" style={{ width: 110 }} value={kolPlatform} onChange={e => setKolPlatform(e.target.value as "instagram" | "tiktok")}>
                          <option value="instagram">Instagram</option>
                          <option value="tiktok">TikTok</option>
                        </select>
                      </div>
                    </>
                  )}
                  {cfg.field === "none" && (
                    <div className="flex items-end h-full">
                      <p className="text-xs text-neutral-500">Uses brand name above — no extra input needed.</p>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleFetch}
                disabled={fetching}
                className="text-sm font-medium px-3 py-1.5 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
              >
                {fetching ? "Fetching…" : `Fetch ${cfg.label} →`}
              </button>
              <span className="ml-2 text-[10px] text-neutral-400">Fetch multiple sources — all append to context below</span>
            </div>
          )}

          {fetchedSignals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {fetchedSignals.map((s, i) => <SignalBadge key={i} signal={s} />)}
            </div>
          )}

          <div>
            <label className={labelCls}>
              Campaign Context <span className="font-normal text-neutral-400 normal-case">(paste anything known — brief, social copy, press coverage, field notes)</span>
            </label>
            <textarea
              className={`${inputCls} font-mono text-xs`}
              rows={10}
              value={contextText}
              onChange={e => setContextText(e.target.value)}
              placeholder={`Paste campaign context here or use Auto-fetch above. Include any of:
• Campaign brief or creative rationale
• Social captions, TikTok scripts, KOL posts
• Press coverage or announcement copy
• Radio scripts or partnership details
• Field notes: which channels are running, what the tagline is, who the audience is
• Any known results or observations

The more context provided, the more precise the intelligence preview.`}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-neutral-900 text-white text-sm font-bold hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Generating Intelligence Preview…" : "Generate Campaign Intelligence Preview →"}
        </button>

        {loading && (
          <div className="text-center space-y-1">
            <p className="text-xs text-neutral-500">Running full signal stack analysis — typically 20–30 seconds.</p>
            <p className="text-[10px] text-neutral-400">Evaluating effectiveness · Engine type · Consumer state · Signal health · Gate intelligence</p>
          </div>
        )}

      </form>
    </div>
  );
}
