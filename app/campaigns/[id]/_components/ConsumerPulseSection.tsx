"use client";

// app/campaigns/[id]/_components/ConsumerPulseSection.tsx
// Feature 34 — Consumer Intelligence Layer (Sprint 12)
//
// Manual-trigger consumer pulse: pulls TikTok trending MY, Google Trends MY,
// The Star Malaysia headlines via Apify actors, then synthesises with Claude Haiku.
//
// Trigger: "Generate Consumer Pulse" button — user-initiated at brief time or campaign close.
// Display: AI synthesis (primary), TikTok hashtags, Google Trends topics, news headlines.
// Cost: ~RM1.50 per run in Apify credits. Run at brief initiation + campaign end only.
//
// INTERNAL ONLY. Never exposed to /brief/[id] or the client portal.

import { useState } from "react";
import type { ConsumerIntelligenceSnapshot } from "@/lib/types";
import { Badge, Card, SectionTitle, buttonClass } from "@/app/_components/ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerBadgeTone(t: string) {
  if (t === "campaign_start") return "green" as const;
  if (t === "campaign_end")   return "amber" as const;
  return "neutral" as const;
}

function triggerLabel(t: string) {
  if (t === "campaign_start") return "Campaign Start";
  if (t === "campaign_end")   return "Campaign End";
  return "Manual";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── TikTok hashtag chips ────────────────────────────────────────────────────

function TikTokHashtagsPanel({ data }: { data: unknown[] }) {
  if (!data || data.length === 0) return null;

  // Common field names across TikTok trending actors
  const hashtags = data.slice(0, 12).map((item) => {
    const r = item as Record<string, unknown>;
    const name = (r.hashtag ?? r.name ?? r.title ?? r.tag ?? "") as string;
    const views = (r.viewCount ?? r.views ?? r.videoCount ?? r.count ?? "") as string | number;
    return { name: name.startsWith("#") ? name : `#${name}`, views };
  }).filter(h => h.name.length > 1);

  if (hashtags.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
        TikTok Trending — Malaysia
      </p>
      <div className="flex flex-wrap gap-1.5">
        {hashtags.map((h, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-xs text-pink-700 font-medium"
          >
            {h.name}
            {h.views ? (
              <span className="text-pink-400 font-normal">
                {typeof h.views === "number"
                  ? h.views > 1_000_000
                    ? `${(h.views / 1_000_000).toFixed(1)}M`
                    : h.views > 1000
                      ? `${(h.views / 1000).toFixed(0)}K`
                      : h.views
                  : h.views}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Google Trends topics ────────────────────────────────────────────────────

function GoogleTrendsPanel({ data }: { data: unknown[] }) {
  if (!data || data.length === 0) return null;

  const topics = data.slice(0, 8).map((item) => {
    const r = item as Record<string, unknown>;
    const keyword = (r.keyword ?? r.query ?? r.term ?? r.title ?? "") as string;
    const value   = (r.value ?? r.interest ?? r.relativeValue ?? "") as string | number;
    return { keyword, value };
  }).filter(t => t.keyword.length > 0);

  if (topics.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
        Google Trends — Malaysia (7 days)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium"
          >
            {t.keyword}
            {t.value ? (
              <span className="text-blue-400 font-normal">{t.value}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── The Star news headlines ─────────────────────────────────────────────────

function TheStarPanel({ data }: { data: unknown[] }) {
  if (!data || data.length === 0) return null;

  const articles = data.slice(0, 6).map((item) => {
    const r = item as Record<string, unknown>;
    const title = (r.title ?? r.headline ?? r.heading ?? "") as string;
    const url   = (r.url ?? r.link ?? r.href ?? "") as string;
    const date  = (r.date ?? r.publishedAt ?? r.published ?? "") as string;
    return { title, url, date };
  }).filter(a => a.title.length > 0);

  if (articles.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
        The Star — Malaysia Headlines
      </p>
      <ul className="space-y-1">
        {articles.map((a, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="text-neutral-300 mt-0.5 shrink-0">—</span>
            {a.url ? (
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-700 hover:text-neutral-900 hover:underline leading-snug"
              >
                {a.title}
              </a>
            ) : (
              <span className="text-neutral-700 leading-snug">{a.title}</span>
            )}
            {a.date && (
              <span className="text-neutral-400 shrink-0 ml-1">
                {a.date.slice(0, 10)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Snapshot display ────────────────────────────────────────────────────────

function SnapshotDisplay({ snapshot }: { snapshot: ConsumerIntelligenceSnapshot }) {
  const hasTikTok  = Array.isArray(snapshot.tiktok_trends)  && snapshot.tiktok_trends.length  > 0;
  const hasTrends  = Array.isArray(snapshot.google_trends)  && snapshot.google_trends.length  > 0;
  const hasThestar = Array.isArray(snapshot.thestar_news)   && snapshot.thestar_news.length   > 0;
  const hasAny     = hasTikTok || hasTrends || hasThestar;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge tone={triggerBadgeTone(snapshot.trigger_type)}>
            {triggerLabel(snapshot.trigger_type)}
          </Badge>
          {snapshot.cultural_context && (
            <span className="text-xs text-neutral-500">{snapshot.cultural_context}</span>
          )}
          {snapshot.industry_category && (
            <span className="text-xs text-neutral-400">· {snapshot.industry_category}</span>
          )}
        </div>
        <span className="text-xs text-neutral-400">{formatDate(snapshot.created_at)}</span>
      </div>

      {/* AI synthesis — most prominent */}
      {snapshot.ai_synthesis && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
            Consumer Intelligence — AI Synthesis
          </p>
          <p className="text-sm text-neutral-800 leading-relaxed">
            {snapshot.ai_synthesis}
          </p>
        </div>
      )}

      {/* Raw signal panels */}
      {hasAny ? (
        <div className="grid gap-4">
          {hasTikTok  && <TikTokHashtagsPanel data={snapshot.tiktok_trends  as unknown[]} />}
          {hasTrends  && <GoogleTrendsPanel   data={snapshot.google_trends  as unknown[]} />}
          {hasThestar && <TheStarPanel        data={snapshot.thestar_news   as unknown[]} />}
        </div>
      ) : (
        <p className="text-xs text-neutral-400">
          {snapshot.error_detail ?? "No signal data returned for this pull."}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
  culturalContext?: string | null;
  industryCategory?: string | null;
  initialSnapshot: ConsumerIntelligenceSnapshot | null;
}

export function ConsumerPulseSection({
  campaignId,
  culturalContext,
  industryCategory,
  initialSnapshot,
}: Props) {
  const [snapshot, setSnapshot]   = useState<ConsumerIntelligenceSnapshot | null>(initialSnapshot);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/consumer-pulse/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id:      campaignId,
          trigger_type:     "manual",
          cultural_context: culturalContext  ?? undefined,
          industry_category: industryCategory ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Pulse trigger failed");
      setSnapshot(json.snapshot as ConsumerIntelligenceSnapshot);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="consumer-pulse" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SectionTitle>Consumer Pulse ⚿</SectionTitle>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={buttonClass + (loading ? " opacity-60 cursor-not-allowed" : "")}
        >
          {loading
            ? "Pulling live data… (15–40s)"
            : snapshot
              ? "Refresh Consumer Pulse"
              : "Generate Consumer Pulse"}
        </button>
      </div>

      {error && (
        <Card>
          <p className="text-xs text-red-600">{error}</p>
        </Card>
      )}

      {loading && (
        <Card>
          <div className="flex items-center gap-3 py-2">
            <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />
            <p className="text-sm text-neutral-600">
              Pulling TikTok trending, Google Trends and The Star Malaysia…
            </p>
          </div>
        </Card>
      )}

      {!loading && snapshot && (
        <Card>
          <SnapshotDisplay snapshot={snapshot} />
        </Card>
      )}

      {!loading && !snapshot && !error && (
        <Card>
          <p className="text-sm text-neutral-500">
            No consumer pulse data yet. Click <strong>Generate Consumer Pulse</strong> to pull live
            TikTok trending topics, Google search interest and Malaysia news signals for this
            campaign&apos;s category.
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Run at brief initiation and at campaign close. Each run uses your existing Apify
            subscription (~RM1.50 per pull).
          </p>
        </Card>
      )}
    </section>
  );
}
