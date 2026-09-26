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
  { value: "B2B SaaS",            label: "B2B SaaS / Technology" },
  { value: "Other",               label: "Other" },
];

// Industries whose Signal Diagnostic depends on a sub-category we can't
// infer from the top-level value alone (e.g. "FMCG" could be Food &
// Beverage or Personal Care, each with a different behaviour chain and
// signal set in category_attributes). Shown as a follow-up picker only when
// the selected industry is one of these keys — every other industry either
// maps 1:1 to a category or falls back to the generic panel.
// See lib/data.ts resolveCategorySlug / SUBCATEGORY_TO_SLUG (must match).
const INDUSTRY_SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  FMCG: [
    { value: "Food & Beverage", label: "Food & Beverage" },
    { value: "Personal Care",   label: "Personal Care" },
  ],
  Retail: [
    { value: "Electronics", label: "Electronics" },
    { value: "Fashion",     label: "Fashion" },
  ],
  "E-commerce": [
    { value: "Electronics", label: "Electronics" },
    { value: "Fashion",     label: "Fashion" },
  ],
};

const MARKETS = [
  { value: "Malaysia",    label: "Malaysia" },
  { value: "Singapore",   label: "Singapore" },
  { value: "Indonesia",   label: "Indonesia" },
  { value: "Philippines", label: "Philippines" },
  { value: "Thailand",    label: "Thailand" },
  { value: "Vietnam",     label: "Vietnam" },
  { value: "Other",       label: "Other" },
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
  { value: "kol_hashtag",      label: "KOL / Hashtag",        hint: "One or more hashtags and/or @handles, comma-separated", field: "hashtag",     placeholder: "#ManisnyaBerbuka, @creator1, @creator2" },
  { value: "press",            label: "Google News",          hint: "Mainstream news index — limited trade press coverage", field: "none", placeholder: "" },
];

// Maps an "Active Campaign Channel" selection to the matching auto-fetch platform,
// so selecting a channel can drive a batch fetch instead of one-at-a-time manual fetches.
const CHANNEL_TO_PLATFORM: Record<string, string> = {
  "Facebook":           "facebook_ads",
  "Instagram":          "instagram",
  "TikTok":             "tiktok",
  "YouTube":            "youtube",
  "KOL / Influencer":   "kol_hashtag",
  "PR / Earned Media":  "press",
};

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

  // Batch fetch — one input per matched channel, fired together
  const [batchValues, setBatchValues] = useState<Record<string, string>>({});
  const [fetchAllLoading, setFetchAllLoading] = useState(false);
  const [fetchAllErrors, setFetchAllErrors] = useState<string[]>([]);

  // "brand_commerce" (default) — five-layer Brand-Commerce prospect read.
  // "general" — the original Campaign Intelligence Preview (effectiveness
  // score, engine type, gate status, ICS). Not every prospect fits the
  // Brand-Commerce frame — this toggle picks which /api/audit-analyze
  // generates. See read_mode in app/api/audit-analyze/route.ts.
  const [readMode, setReadMode] = useState<"brand_commerce" | "general">("brand_commerce");

  // Multiple markets can be selected at once — one full analysis run per
  // market, since MARKET_PROFILES/benchmarks are market-specific and can't
  // be blended into a single read. See handleSubmit's multi-market branch.
  const [countries, setCountries] = useState<string[]>(["Malaysia"]);
  // Populated only when >1 market was run — shows a "reports generated"
  // list instead of navigating away, since there's no single result to
  // redirect to. Cleared on a fresh single-market submit.
  const [multiResults, setMultiResults] = useState<{ country: string; id?: string; error?: string }[] | null>(null);
  // Tracked in state (alongside the uncontrolled industryRef) purely so the
  // sub-category picker can show/hide reactively. See INDUSTRY_SUBCATEGORIES.
  const [industry, setIndustry] = useState("FMCG");
  const [subcategory, setSubcategory] = useState("");

  // Ranked (multi) Campaign Phase + Business Objective — click/add order is
  // the priority rank, index 0 = primary. See migration 0102.
  const [phases, setPhases] = useState<string[]>(["Demand"]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [objectiveInput, setObjectiveInput] = useState("");
  // Carries forward the Signal's AI intelligence so Snapshot can extend rather than re-derive
  const [signalIntelligence, setSignalIntelligence] = useState<Record<string, unknown> | null>(null);

  const brandRef = useRef<HTMLInputElement>(null);
  const campaignRef = useRef<HTMLInputElement>(null);
  const industryRef = useRef<HTMLSelectElement>(null);
  const budgetRef = useRef<HTMLSelectElement>(null);

  // Pre-fill form on load from any of:
  //   ?signal_id=xxx  → fetch stored context from a Clarity Signal (brand + campaign + full context)
  //   ?rerun=xxx      → fetch a past audit's full request_snapshot and reload EVERY field
  //                     (see migration 0103 / app/api/audit-context/[id]/route.ts) — the
  //                     "Rerun this audit" link on the report page uses this.
  //   ?brand=&campaign=&industry= → simple URL params (manual deep link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const signalId = params.get("signal_id");
    const rerunId = params.get("rerun");

    if (rerunId) {
      fetch(`/api/audit-context/${rerunId}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) { setError(data.error); return; }
          if (data.brand_name && brandRef.current) brandRef.current.value = data.brand_name;
          if (data.campaign_name && campaignRef.current) campaignRef.current.value = data.campaign_name;
          if (data.industry && industryRef.current) { industryRef.current.value = data.industry; setIndustry(data.industry); }
          if (data.industry_subcategory) setSubcategory(data.industry_subcategory);
          if (data.country) setCountries([data.country]);
          if (Array.isArray(data.campaign_phases) && data.campaign_phases.length > 0) setPhases(data.campaign_phases);
          if (Array.isArray(data.business_objectives)) setObjectives(data.business_objectives);
          if (Array.isArray(data.channels)) setSelectedChannels(data.channels);
          if (data.budget_range !== undefined && budgetRef.current) budgetRef.current.value = data.budget_range;
          if (data.context_text) setContextText(data.context_text);
          if (data.read_mode) setReadMode(data.read_mode);
          if (data.signal_intelligence) setSignalIntelligence(data.signal_intelligence);
        })
        .catch(() => {
          setError("Could not load that audit for rerun — please fill the form manually.");
        });
      return;
    }

    if (signalId) {
      fetch(`/api/signal-context/${signalId}`)
        .then(r => r.json())
        .then(data => {
          if (data.brand_name && brandRef.current) brandRef.current.value = data.brand_name;
          if (data.campaign_name && campaignRef.current) campaignRef.current.value = data.campaign_name;
          if (data.industry && industryRef.current) { industryRef.current.value = data.industry; setIndustry(data.industry); }
          if (data.country) setCountries([data.country]);
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
    if (ind && industryRef.current) { industryRef.current.value = ind; setIndustry(ind); }
  }, []);

  const cfg = FETCH_PLATFORMS.find(p => p.value === platform)!;

  // Which auto-fetchable platforms are implied by the selected channels, minus
  // whatever has already been fetched (single or batch) this session.
  const alreadyFetchedPlatforms = new Set(fetchedSignals.map(s => s.platform));
  const pendingPlatforms = Array.from(new Set(
    selectedChannels.map(c => CHANNEL_TO_PLATFORM[c]).filter((p): p is string => Boolean(p))
  )).filter(p => !alreadyFetchedPlatforms.has(p));

  function toggleChannel(v: string) {
    setSelectedChannels(prev =>
      prev.includes(v) ? prev.filter(c => c !== v) : [...prev, v]
    );
  }

  function toggleCountry(v: string) {
    setCountries(prev => {
      const next = prev.includes(v) ? prev.filter(c => c !== v) : [...prev, v];
      // Never allow zero markets selected — falls back to the toggled one.
      return next.length > 0 ? next : [v];
    });
  }

  // Click order = priority rank (first click = primary / index 0).
  // Clicking an already-selected phase removes it; the rest keep their order.
  function togglePhase(v: string) {
    setPhases(prev =>
      prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]
    );
  }

  function addObjective() {
    const val = objectiveInput.trim();
    if (!val || objectives.includes(val)) { setObjectiveInput(""); return; }
    setObjectives(prev => [...prev, val]);
    setObjectiveInput("");
  }

  function removeObjective(i: number) {
    setObjectives(prev => prev.filter((_, idx) => idx !== i));
  }

  function moveObjective(i: number, dir: -1 | 1) {
    setObjectives(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
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

  async function handleFetchAll() {
    setFetchAllLoading(true);
    const errors: string[] = [];
    for (const p of pendingPlatforms) {
      const c = FETCH_PLATFORMS.find(f => f.value === p)!;
      const val = (batchValues[p] ?? "").trim();
      if (c.field !== "none" && !val) {
        errors.push(`${c.label}: skipped — no handle/URL entered`);
        continue;
      }
      try {
        const res = await fetch("/api/audit-fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: p,
            handle: c.field === "handle" ? val : "",
            hashtag: c.field === "hashtag" ? val : "",
            page_url: c.field === "page_url" ? val : "",
            website_url: c.field === "website_url" ? val : "",
            brand_name: brandRef.current?.value ?? "",
            campaign_name: campaignRef.current?.value ?? "",
            kol_platform: kolPlatform,
          }),
        });
        const data = await res.json();
        if (data.setup_required) { errors.push(`${c.label}: Apify not configured`); continue; }
        if (!res.ok || data.error) { errors.push(`${c.label}: ${data.error ?? "fetch failed"}`); continue; }
        setContextText(prev => prev ? `${prev}\n\n${data.content}` : data.content);
        setFetchedSignals(prev => [...prev, { label: c.label, count: data.count ?? 0, platform: p }]);
      } catch {
        errors.push(`${c.label}: network error`);
      }
    }
    setFetchAllErrors(errors);
    setFetchAllLoading(false);
  }

  // One market's worth of the shared payload — everything except country,
  // which varies per run in the multi-market loop below.
  function buildRequestBody(marketCountry: string) {
    return {
      brand_name: brandRef.current?.value,
      campaign_name: campaignRef.current?.value,
      industry: industryRef.current?.value,
      industry_subcategory: subcategory || undefined,
      country: marketCountry,
      signal_intelligence: signalIntelligence ?? undefined,
      campaign_phases: phases,
      business_objectives: objectives,
      channels: selectedChannels,
      budget_range: budgetRef.current?.value,
      context_text: contextText,
      read_mode: readMode,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phases.length === 0) { setError("Select at least one campaign phase."); return; }
    if (countries.length === 0) { setError("Select at least one market."); return; }
    setLoading(true);
    setError(null);
    setMultiResults(null);

    // Single market — unchanged behaviour: generate, then navigate straight
    // to the report.
    if (countries.length === 1) {
      try {
        const res = await fetch("/api/audit-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequestBody(countries[0])),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Analysis failed."); return; }
        router.push(`/audit/${data.id}`);
      } catch {
        setError("Network error — please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Multiple markets — one full analysis run per market (MARKET_PROFILES
    // and benchmarks are market-specific and can't be blended into a single
    // read). Run sequentially rather than in parallel to stay well inside
    // any Anthropic rate limit, and so partial failures are per-market, not
    // all-or-nothing. There's no single result to redirect to, so list every
    // market's report link instead of navigating away.
    const results: { country: string; id?: string; error?: string }[] = [];
    for (const marketCountry of countries) {
      try {
        const res = await fetch("/api/audit-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequestBody(marketCountry)),
        });
        const data = await res.json();
        if (!res.ok) { results.push({ country: marketCountry, error: data.error ?? "Analysis failed." }); continue; }
        results.push({ country: marketCountry, id: data.id });
      } catch {
        results.push({ country: marketCountry, error: "Network error." });
      }
    }
    setMultiResults(results);
    setLoading(false);
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

      {/* ── Read Mode Toggle ── */}
      <div className="mb-6 bg-white border border-neutral-100 rounded-xl p-4">
        <p className={labelCls}>Read Type</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={() => setReadMode("brand_commerce")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              readMode === "brand_commerce"
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
            }`}
          >
            Brand-Commerce Read
          </button>
          <button
            type="button"
            onClick={() => setReadMode("general")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              readMode === "general"
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
            }`}
          >
            General Campaign Intelligence
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          {readMode === "brand_commerce"
            ? "Diagnoses whether demand is being built, borrowed, leaked, or blocked across five layers — leakage pattern, no numeric score. Best when brand and commerce health is the real question."
            : "The original effectiveness score, engine type, consumer state, and gate status read across the full signal set. Best for a general campaign health snapshot when Brand-Commerce framing isn't the fit."}
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

          <div>
            <label className={labelCls}>Industry *</label>
            <select
              ref={industryRef}
              className={inputCls}
              defaultValue="FMCG"
              onChange={e => { setIndustry(e.target.value); setSubcategory(""); }}
            >
              {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              Market(s) * <span className="font-normal text-neutral-400 normal-case">(select more than one to run a separate report per market)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MARKETS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => toggleCountry(m.value)}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
                    countries.includes(m.value)
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {countries.length > 1 && (
              <p className="text-[10px] text-neutral-400 mt-1.5">
                {countries.length} markets selected — Generate will run {countries.length} separate reports, one per market, using the same brand/campaign/context/channels for each.
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>
              Campaign Phase <span className="font-normal text-neutral-400 normal-case">(click to select, in priority order — first click is primary)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PHASES.map(p => {
                const rank = phases.indexOf(p.value);
                const selected = rank !== -1;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePhase(p.value)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
                      selected
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {selected && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px] font-bold">
                        {rank + 1}
                      </span>
                    )}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {INDUSTRY_SUBCATEGORIES[industry] && (
            <div>
              <label className={labelCls}>
                {industry} Sub-category * <span className="font-normal text-neutral-400 normal-case">(determines which signal model the diagnostic uses)</span>
              </label>
              <select className={inputCls} value={subcategory} onChange={e => setSubcategory(e.target.value)} required>
                <option value="" disabled>Select a sub-category…</option>
                {INDUSTRY_SUBCATEGORIES[industry].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Business Objective(s) <span className="font-normal text-neutral-400 normal-case">(add in priority order — first added is primary)</span>
              </label>
              <div className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  value={objectiveInput}
                  onChange={e => setObjectiveInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addObjective(); } }}
                  placeholder="e.g. Trial purchase, Market share lift"
                />
                <button
                  type="button"
                  onClick={addObjective}
                  className="shrink-0 text-xs font-medium px-3 py-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Add
                </button>
              </div>
              {objectives.length > 0 && (
                <div className="mt-2 space-y-1">
                  {objectives.map((o, i) => (
                    <div key={o} className="flex items-center gap-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-neutral-700">{o}</span>
                      <button type="button" onClick={() => moveObjective(i, -1)} disabled={i === 0} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 px-1">↑</button>
                      <button type="button" onClick={() => moveObjective(i, 1)} disabled={i === objectives.length - 1} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 px-1">↓</button>
                      <button type="button" onClick={() => removeObjective(i)} className="text-neutral-400 hover:text-red-600 px-1">×</button>
                    </div>
                  ))}
                </div>
              )}
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

        {/* ── Batch Fetch Selected Channels ── */}
        {pendingPlatforms.length > 0 && (
          <div className={sectionCls}>
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Fetch All Selected Channels</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Enter a handle or URL for each matched channel below, then fetch them all in one go. Leave a field blank to skip that channel.
              </p>
            </div>
            <div className="space-y-2">
              {pendingPlatforms.map(p => {
                const c = FETCH_PLATFORMS.find(f => f.value === p)!;
                return (
                  <div key={p} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-600 w-28 shrink-0">{c.label}</span>
                    {c.field === "none" ? (
                      <span className="text-xs text-neutral-400">Uses brand name above — no input needed.</span>
                    ) : (
                      <input
                        className={`${inputCls} flex-1`}
                        value={batchValues[p] ?? ""}
                        onChange={e => setBatchValues(prev => ({ ...prev, [p]: e.target.value }))}
                        placeholder={c.placeholder}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {fetchAllErrors.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 space-y-0.5">
                {fetchAllErrors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <button
              type="button"
              onClick={handleFetchAll}
              disabled={fetchAllLoading}
              className="text-sm font-medium px-3 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50"
            >
              {fetchAllLoading ? "Fetching all…" : `Fetch All (${pendingPlatforms.length}) →`}
            </button>
          </div>
        )}

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
          {loading
            ? (countries.length > 1 ? `Generating ${countries.length} market reports…` : "Generating Intelligence Preview…")
            : (countries.length > 1 ? `Generate ${countries.length} Market Reports →` : "Generate Campaign Intelligence Preview →")}
        </button>

        {loading && (
          <div className="text-center space-y-1">
            <p className="text-xs text-neutral-500">
              {countries.length > 1
                ? "Running one full signal stack analysis per market, one at a time — this will take longer than a single-market run."
                : "Running full signal stack analysis — typically 20–30 seconds."}
            </p>
            <p className="text-[10px] text-neutral-400">
              {readMode === "brand_commerce"
                ? "Five-layer diagnostic · Sales-quality read · Leakage pattern · Consumer state"
                : "Evaluating effectiveness · Engine type · Consumer state · Signal health · Gate intelligence"}
            </p>
          </div>
        )}

        {multiResults && (
          <div className={sectionCls}>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              {multiResults.filter(r => r.id).length} of {multiResults.length} market reports generated
            </p>
            <div className="space-y-1.5">
              {multiResults.map(r => (
                <div key={r.country} className="flex items-center justify-between text-sm bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                  <span className="font-medium text-neutral-700">{r.country}</span>
                  {r.id ? (
                    <a href={`/audit/${r.id}`} className="text-xs font-semibold text-neutral-900 underline hover:no-underline">
                      View report →
                    </a>
                  ) : (
                    <span className="text-xs text-red-600">{r.error ?? "Failed"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
