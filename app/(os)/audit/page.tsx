"use client";

import { useState, useRef } from "react";
import { Card, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type AuditResult = {
  campaign_id: string;
  scores: Record<string, number>;
  reasoning: Record<string, string>;
  big_idea_read: string;
  overall_diagnosis: string;
  recommendation: string;
};

type FetchedSignal = { label: string; count: number; platform: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = {
  1: "Absent", 2: "Weak", 3: "Average", 4: "Strong", 5: "Exceptional",
};

const SCORE_COLORS: Record<number, string> = {
  1: "text-red-700 bg-red-50 border-red-200",
  2: "text-orange-700 bg-orange-50 border-orange-200",
  3: "text-amber-700 bg-amber-50 border-amber-200",
  4: "text-emerald-700 bg-emerald-50 border-emerald-200",
  5: "text-emerald-900 bg-emerald-100 border-emerald-300",
};

const ICS_DIMENSIONS = [
  { key: "cultural_fit",          label: "Cultural Fit",           weight: 20 },
  { key: "business_alignment",    label: "Business Alignment",     weight: 20 },
  { key: "audience_tension",      label: "Audience Tension",       weight: 20 },
  { key: "executional_coherence", label: "Executional Coherence",  weight: 15 },
  { key: "measurability",         label: "Measurability",          weight: 15 },
  { key: "scalability",           label: "Scalability",            weight: 10 },
];

const FETCH_PLATFORMS = [
  { value: "facebook_ads",      label: "Facebook Ads",          hint: "Brand page URL or name",        field: "page_url",    placeholder: "https://www.facebook.com/YeosMY or brand name" },
  { value: "instagram",         label: "Instagram Posts",       hint: "Brand handle",                   field: "handle",      placeholder: "@yeos.my" },
  { value: "tiktok",            label: "TikTok Posts",          hint: "Brand handle",                   field: "handle",      placeholder: "@yeos_official" },
  { value: "youtube",           label: "YouTube Channel",       hint: "Channel handle or URL",          field: "handle",      placeholder: "@YeosMalaysia or https://youtube.com/@YeosMY" },
  { value: "website",           label: "Brand Website",         hint: "Campaign landing page or site",  field: "website_url", placeholder: "https://www.yeos.com.my/campaign" },
  { value: "kol_hashtag",       label: "KOL / Hashtag Search",  hint: "Campaign hashtag",              field: "hashtag",     placeholder: "#ManisnyaBerbuka" },
  { value: "press",             label: "Press Coverage",        hint: "Searches news for brand",        field: "none",        placeholder: "" },
  { value: "radio_partnership", label: "Radio & Partnerships",  hint: "Searches partnership news",     field: "none",        placeholder: "" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeICS(scores: Record<string, number>): number {
  return Math.round(
    (scores.cultural_fit * 20 + scores.business_alignment * 20 + scores.audience_tension * 20 +
      scores.executional_coherence * 15 + scores.measurability * 15 + scores.scalability * 10) / 5
  );
}

function icsThreshold(total: number): string {
  if (total >= 85) return "Advance";
  if (total >= 70) return "Conditional";
  if (total >= 55) return "Rework";
  return "Stop";
}

function thresholdColor(threshold: string): string {
  if (threshold === "Advance")     return "text-emerald-700 bg-emerald-100";
  if (threshold === "Conditional") return "text-amber-700 bg-amber-100";
  if (threshold === "Rework")      return "text-orange-700 bg-orange-100";
  return "text-red-700 bg-red-100";
}

// ── Signal badges ─────────────────────────────────────────────────────────────

function SignalBadges({ signals }: { signals: FetchedSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {signals.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
          <span className="text-emerald-500">✓</span> {s.label}
          {s.count > 0 && <span className="text-emerald-500">({s.count})</span>}
        </span>
      ))}
    </div>
  );
}

// ── Result view ───────────────────────────────────────────────────────────────

function AuditResultView({ result, onReset }: { result: AuditResult; onReset: () => void }) {
  const icsTotal = computeICS(result.scores);
  const threshold = icsThreshold(icsTotal);

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Audit Complete</h1>
        <p className="text-sm text-neutral-500 mt-1">Your idea scored against the criteria you set in your FRAME brief — not an AI opinion, a mirror of your own standards.</p>
      </div>

      <Card className="mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <SectionTitle>Idea Certainty Score</SectionTitle>
            {result.big_idea_read && (
              <blockquote className="border-l-2 border-neutral-200 pl-3 text-sm italic text-neutral-600 mt-1.5">
                &ldquo;{result.big_idea_read}&rdquo;
                <p className="text-xs text-neutral-400 mt-0.5 not-italic">Your stated Big Idea — scored against your own FRAME criteria</p>
              </blockquote>
            )}
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="text-4xl font-bold tracking-tight">{icsTotal}</div>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded ${thresholdColor(threshold)}`}>
              {threshold}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {ICS_DIMENSIONS.map((dim) => {
            const score = result.scores[dim.key] ?? 3;
            const pct = score * 20;
            const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
            return (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-neutral-700">
                    {dim.label}
                    <span className="ml-1 text-xs font-normal text-neutral-400">({dim.weight}%)</span>
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${SCORE_COLORS[score]}`}>
                    {score}/5 — {SCORE_LABELS[score]}
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded overflow-hidden mb-1.5">
                  <div className={`${barColor} h-2 rounded transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">{result.reasoning[dim.key]}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {(result.overall_diagnosis || result.recommendation) && (
        <Card className="mb-4">
          <SectionTitle>What Your Brief Shows</SectionTitle>
          {result.overall_diagnosis && (
            <p className="text-sm text-neutral-700 mb-3 leading-relaxed">{result.overall_diagnosis}</p>
          )}
          {result.recommendation && (
            <div className="bg-neutral-900 text-white rounded px-3 py-2.5 text-sm">
              <span className="text-neutral-400 text-xs font-medium block mb-0.5">What to fix — based on your own brief criteria</span>
              {result.recommendation}
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-3">
        <a href={`/campaigns/${result.campaign_id}#diagnostics`} className={`${buttonClass} flex-1 text-center py-2.5`}>
          Open Full Diagnostic →
        </a>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2.5 border border-neutral-200 rounded-md text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          New Audit
        </button>
      </div>
      <p className="text-xs text-neutral-400 text-center mt-2">
        Full diagnostic shows gate status and budget release decisions based on the signals you pre-agreed.
      </p>
    </div>
  );
}

// ── Auto-fetch panel ──────────────────────────────────────────────────────────

function AutoFetchPanel({
  brandName,
  campaignName,
  onFetched,
}: {
  brandName: string;
  campaignName: string;
  onFetched: (content: string, signal: FetchedSignal) => void;
}) {
  const [platform, setPlatform] = useState("facebook_ads");
  const [handle, setHandle] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [kolPlatform, setKolPlatform] = useState<"instagram" | "tiktok">("instagram");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const cfg = FETCH_PLATFORMS.find((p) => p.value === platform)!;

  async function handleFetch() {
    if (!brandName.trim() && cfg.field === "none") {
      setFetchError("Fill in the brand name above first.");
      return;
    }
    setFetching(true);
    setFetchError(null);
    setSetupRequired(false);

    try {
      const res = await fetch("/api/audit-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle,
          hashtag,
          page_url: pageUrl,
          website_url: websiteUrl,
          brand_name: brandName,
          campaign_name: campaignName,
          kol_platform: kolPlatform,
        }),
      });
      const data = await res.json();

      if (data.setup_required) {
        setSetupRequired(true);
        setFetchError(null);
        return;
      }
      if (!res.ok || data.error) {
        setFetchError(data.error ?? "Fetch failed.");
        return;
      }

      onFetched(data.content, {
        label: `${cfg.label}${data.count > 0 ? "" : " (no results)"}`,
        count: data.count ?? 0,
        platform,
      });
    } catch {
      setFetchError("Network error — please try again.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
        Auto-fetch campaign signals
      </p>

      {setupRequired && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <strong>Apify not connected.</strong> To enable live signal fetching, add{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">APIFY_API_TOKEN</code> to your Vercel environment variables.{" "}
          <a href="https://apify.com" target="_blank" rel="noopener noreferrer" className="underline">
            Get a free token at apify.com
          </a>. Then redeploy. <em>Brand website fetching works without Apify.</em>
        </div>
      )}

      {fetchError && !setupRequired && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {fetchError}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        <div>
          <label className={labelClass}>Signal source</label>
          <select
            className={inputClass}
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setHandle(""); setHashtag(""); setPageUrl(""); setWebsiteUrl("");
            }}
          >
            {FETCH_PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-400 mt-0.5">{cfg.hint}</p>
        </div>

        {cfg.field === "handle" && (
          <div>
            <label className={labelClass}>Handle / URL</label>
            <input className={inputClass} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={cfg.placeholder} />
          </div>
        )}
        {cfg.field === "page_url" && (
          <div>
            <label className={labelClass}>Page URL or brand name</label>
            <input className={inputClass} value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder={cfg.placeholder} />
          </div>
        )}
        {cfg.field === "website_url" && (
          <div>
            <label className={labelClass}>Website URL</label>
            <input className={inputClass} type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder={cfg.placeholder} />
            <p className="text-xs text-neutral-400 mt-0.5">No Apify required — works immediately</p>
          </div>
        )}
        {cfg.field === "hashtag" && (
          <div>
            <label className={labelClass}>Hashtag</label>
            <div className="flex gap-2">
              <input className={`${inputClass} flex-1`} value={hashtag} onChange={(e) => setHashtag(e.target.value)} placeholder={cfg.placeholder} />
              <select className={inputClass} style={{ width: 110 }} value={kolPlatform} onChange={(e) => setKolPlatform(e.target.value as "instagram" | "tiktok")}>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
          </div>
        )}
        {cfg.field === "none" && (
          <div className="flex items-end">
            <p className="text-xs text-neutral-500">Uses brand name above — no extra input needed.</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleFetch}
        disabled={fetching}
        className="text-sm font-medium px-3 py-1.5 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {fetching ? "Fetching…" : `Fetch ${cfg.label} →`}
      </button>
      <span className="ml-2 text-xs text-neutral-400">Appends to context below — fetch multiple sources</span>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function QuickAuditPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [contextText, setContextText] = useState("");
  const [fetchedSignals, setFetchedSignals] = useState<FetchedSignal[]>([]);
  const [showFetch, setShowFetch] = useState(false);

  const brandRef = useRef<HTMLInputElement>(null);
  const campaignRef = useRef<HTMLInputElement>(null);

  function handleFetched(content: string, signal: FetchedSignal) {
    setContextText((prev) => (prev ? `${prev}\n\n${content}` : content));
    setFetchedSignals((prev) => [...prev, signal]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/audit-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: form.get("brand_name"),
          campaign_name: form.get("campaign_name"),
          industry: form.get("industry"),
          current_phase: form.get("current_phase"),
          business_outcome_label: form.get("business_outcome_label"),
          context_text: contextText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed — please try again.");
      } else {
        setResult(data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return <AuditResultView result={result} onReset={() => { setResult(null); setFetchedSignals([]); setContextText(""); }} />;
  }

  const brandName = brandRef.current?.value ?? "";
  const campaignName = campaignRef.current?.value ?? "";

  return (
    <div className="max-w-2xl">

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Brand & Campaign */}
        <Card>
          <SectionTitle>Brand & Campaign</SectionTitle>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="brand_name">Brand / Client Name</label>
                <input ref={brandRef} className={inputClass} id="brand_name" name="brand_name" placeholder="e.g. Yeos" required />
              </div>
              <div>
                <label className={labelClass} htmlFor="campaign_name">Campaign Name</label>
                <input ref={campaignRef} className={inputClass} id="campaign_name" name="campaign_name" placeholder="e.g. Caramel Ramadhan Push" required />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="industry">Industry</label>
                <select className={inputClass} id="industry" name="industry" defaultValue="Other">
                  <option value="QSR">QSR</option>
                  <option value="Retail">Retail</option>
                  <option value="B2B">B2B</option>
                  <option value="Other">Other / FMCG</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="current_phase">Campaign Phase</label>
                <select className={inputClass} id="current_phase" name="current_phase" defaultValue="Demand">
                  <option value="Demand">Demand (currently running)</option>
                  <option value="Conversion">Conversion</option>
                  <option value="Retention">Retention</option>
                  <option value="Complete">Complete / Post-campaign</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="business_outcome_label">
                Business Objective <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <input
                className={inputClass}
                id="business_outcome_label"
                name="business_outcome_label"
                placeholder="e.g. Sales volume lift, Market share gain, Trial purchase"
              />
            </div>
          </div>
        </Card>

        {/* Signal sources */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle className="mb-0">Campaign Signals</SectionTitle>
            <button
              type="button"
              onClick={() => setShowFetch((v) => !v)}
              className="text-xs font-medium text-neutral-500 border border-neutral-200 px-2.5 py-1 rounded hover:bg-neutral-50"
            >
              {showFetch ? "Hide auto-fetch" : "Auto-fetch from brand ↓"}
            </button>
          </div>

          {showFetch && (
            <div className="mb-4">
              <AutoFetchPanel
                brandName={brandRef.current?.value ?? ""}
                campaignName={campaignRef.current?.value ?? ""}
                onFetched={handleFetched}
              />
            </div>
          )}

          <SignalBadges signals={fetchedSignals} />

          <div>
            <label className={labelClass} htmlFor="context_text">
              Context{" "}
              <span className="font-normal text-neutral-400">
                — paste brief, social posts, KOL copy, press clippings, radio scripts, your own notes
              </span>
            </label>
            <textarea
              className={`${inputClass} font-mono text-xs mt-1`}
              id="context_text"
              name="context_text"
              rows={13}
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder={`Paste or auto-fetch above. Examples:

• Agency brief or creative rationale
• Social captions / TikTok scripts from the campaign
• KOL post copy or campaign hashtag posts
• Press coverage or news articles
• Radio scripts or partnership details
• Your own field notes: "Campaign ran on TikTok + in-store. KOL content showed family iftar moments. Tagline was 'Manisnya Berbuka'. Retailer sell-through not in yet."

The system scores this against the 6 ICS dimensions you set in your FRAME brief. You define the standard — this shows whether your idea clears it.`}
              required
            />
          </div>
        </Card>

        <button
          type="submit"
          disabled={loading}
          className={`${buttonClass} w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {loading ? "Scoring your idea against your FRAME criteria…" : "Run Campaign Audit →"}
        </button>

        {loading && (
          <p className="text-xs text-neutral-400 text-center">
            Scoring your idea against your FRAME brief across 6 dimensions… ~15 seconds.
          </p>
        )}
      </form>
    </div>
  );
}
