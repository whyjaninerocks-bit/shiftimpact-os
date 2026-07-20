"use client";
// ReviewPlatformSection.tsx
// Review Platform Intelligence — Google Reviews + TripAdvisor
// Sprint 30 · 20 July 2026
//
// ACCESS RULES:
//   review_health_score + trend_direction + ai_narrative: shareable with client
//   dimension scores + action_recommendation: INTERNAL ONLY
//
// Sits after Social Currency Index in the Brand Intelligence layer.
// TripAdvisor panel is hidden when no TripAdvisor data is present.
// TripAdvisor applies to: Hospitality + F&B. Leave blank for all other categories.

import { useState } from "react";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";
import type { ReviewPlatformScore } from "@/lib/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReviewPlatformSectionProps {
  campaignId: string;
  lastScore: ReviewPlatformScore | null;
  currentWeek?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trendTone(dir: string | null): "green" | "amber" | "red" | "neutral" {
  if (dir === "Improving") return "green";
  if (dir === "Declining") return "red";
  return "neutral";
}

function trendIcon(dir: string | null): string {
  if (dir === "Improving") return "↑";
  if (dir === "Declining") return "↓";
  return "→";
}

function healthColor(score: number): string {
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function healthBarColor(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-emerald-400";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-400";
}

function healthLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "On Track";
  if (score >= 50) return "Building";
  return "Needs Focus";
}

function ratingStars(rating: number | null | undefined): string {
  if (rating == null) return "—";
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + " " + rating.toFixed(1);
}

function SentimentBar({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        <div
          className="bg-emerald-400 rounded-l-full"
          style={{ width: `${positive}%` }}
          title={`Positive: ${positive}%`}
        />
        <div
          className="bg-slate-300"
          style={{ width: `${neutral}%` }}
          title={`Neutral: ${neutral}%`}
        />
        <div
          className="bg-red-400 rounded-r-full"
          style={{ width: `${negative}%` }}
          title={`Negative: ${negative}%`}
        />
      </div>
      <div className="flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Positive {positive}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
          Neutral {neutral}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          Negative {negative}%
        </span>
      </div>
    </div>
  );
}

function ThemeChips({
  themes,
  tone,
}: {
  themes: string[];
  tone: "positive" | "negative";
}) {
  if (!themes || themes.length === 0) return <span className="text-xs text-neutral-400">None identified</span>;
  const chipClass =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-red-50 text-red-700 border-red-200";
  return (
    <div className="flex flex-wrap gap-1.5">
      {themes.map((t) => (
        <span
          key={t}
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${chipClass}`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewPlatformSection({
  campaignId,
  lastScore,
  currentWeek = 1,
}: ReviewPlatformSectionProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewPlatformScore | null>(lastScore);

  // Form state
  const [googleRating, setGoogleRating]               = useState("");
  const [googleCountTotal, setGoogleCountTotal]       = useState("");
  const [googleCountPeriod, setGoogleCountPeriod]     = useState("");
  const [googleAvgPeriod, setGoogleAvgPeriod]         = useState("");
  const [taRating, setTaRating]                       = useState("");
  const [taCountTotal, setTaCountTotal]               = useState("");
  const [taCountPeriod, setTaCountPeriod]             = useState("");
  const [taAvgPeriod, setTaAvgPeriod]                 = useState("");
  const [sentimentPos, setSentimentPos]               = useState("");
  const [sentimentNeu, setSentimentNeu]               = useState("");
  const [sentimentNeg, setSentimentNeg]               = useState("");
  const [responseRate, setResponseRate]               = useState("");
  const [positiveThemes, setPositiveThemes]           = useState("");
  const [negativeThemes, setNegativeThemes]           = useState("");

  const hasTA = taRating.trim() !== "";

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    try {
      const payload = {
        campaign_id:                 campaignId,
        week_number:                 currentWeek,
        google_rating:               parseFloat(googleRating) || null,
        google_review_count_total:   parseInt(googleCountTotal) || 0,
        google_review_count_period:  parseInt(googleCountPeriod) || 0,
        google_avg_rating_period:    parseFloat(googleAvgPeriod) || null,
        tripadvisor_rating:          hasTA ? parseFloat(taRating) : undefined,
        tripadvisor_review_count_total:  hasTA ? parseInt(taCountTotal) || 0 : undefined,
        tripadvisor_review_count_period: hasTA ? parseInt(taCountPeriod) || 0 : undefined,
        tripadvisor_avg_rating_period:   hasTA ? parseFloat(taAvgPeriod) || null : undefined,
        sentiment_positive_pct: parseInt(sentimentPos) || 0,
        sentiment_neutral_pct:  parseInt(sentimentNeu) || 0,
        sentiment_negative_pct: parseInt(sentimentNeg) || 0,
        management_response_rate_pct: parseInt(responseRate) || 0,
        top_positive_themes: positiveThemes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3),
        top_negative_themes: negativeThemes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3),
      };

      const res = await fetch("/api/review-platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "API error");
      }

      const data = await res.json();
      setResult(data as ReviewPlatformScore);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  }

  // ── Display mode (result exists) ─────────────────────────────────────────

  if (result && !showForm) {
    const score = result.review_health_score ?? 0;
    const hasTAData = result.tripadvisor_rating != null;

    return (
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <SectionTitle>Review Platform Intelligence</SectionTitle>
            <p className="text-xs text-neutral-500 mt-0.5">
              Customer trust signals from Google Reviews
              {hasTAData ? " + TripAdvisor" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone={trendTone(result.trend_direction)}>
              {trendIcon(result.trend_direction)} {result.trend_direction}
            </Badge>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-neutral-400 hover:text-neutral-600 underline"
            >
              Update
            </button>
          </div>
        </div>

        {/* Health score */}
        <div className="mb-5">
          <div className="flex items-end justify-between mb-1.5">
            <span className={`text-3xl font-bold ${healthColor(score)}`}>
              {score}
              <span className="text-base font-normal text-neutral-400">/100</span>
            </span>
            <span
              className={`text-sm font-semibold px-2.5 py-1 rounded-full border ${
                score >= 85
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : score >= 70
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : score >= 50
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {healthLabel(score)}
            </span>
          </div>
          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${healthBarColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Platform ratings */}
        <div className={`grid gap-3 mb-5 ${hasTAData ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
              Google Reviews
            </p>
            <p className="text-lg font-bold text-neutral-800">
              {ratingStars(result.google_rating)}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {result.google_review_count_total?.toLocaleString() ?? "—"} total ·{" "}
              {result.google_review_count_period ?? 0} new this week
            </p>
            {result.google_avg_rating_period != null && (
              <p className="text-xs text-neutral-500">
                New reviews avg: {result.google_avg_rating_period.toFixed(1)}/5.0
              </p>
            )}
          </div>

          {hasTAData && (
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                TripAdvisor
              </p>
              <p className="text-lg font-bold text-neutral-800">
                {ratingStars(result.tripadvisor_rating)}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {result.tripadvisor_review_count_total?.toLocaleString() ?? "—"} total ·{" "}
                {result.tripadvisor_review_count_period ?? 0} new this week
              </p>
              {result.tripadvisor_avg_rating_period != null && (
                <p className="text-xs text-neutral-500">
                  New reviews avg: {result.tripadvisor_avg_rating_period.toFixed(1)}/5.0
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sentiment */}
        {result.sentiment_positive_pct != null && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              Review Sentiment
            </p>
            <SentimentBar
              positive={result.sentiment_positive_pct}
              neutral={result.sentiment_neutral_pct ?? 0}
              negative={result.sentiment_negative_pct ?? 0}
            />
          </div>
        )}

        {/* Themes */}
        {((result.top_positive_themes?.length ?? 0) > 0 ||
          (result.top_negative_themes?.length ?? 0) > 0) && (
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                What customers love
              </p>
              <ThemeChips themes={result.top_positive_themes ?? []} tone="positive" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                Common complaints
              </p>
              <ThemeChips themes={result.top_negative_themes ?? []} tone="negative" />
            </div>
          </div>
        )}

        {/* Management response rate */}
        {result.management_response_rate_pct != null && (
          <div className="mb-5 flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-50 border border-neutral-100">
            <p className="text-xs text-neutral-600">Management response rate (last 30 days)</p>
            <span
              className={`text-sm font-bold ${
                result.management_response_rate_pct >= 70
                  ? "text-emerald-600"
                  : result.management_response_rate_pct >= 40
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {result.management_response_rate_pct}%
            </span>
          </div>
        )}

        {/* AI narrative */}
        {result.ai_narrative && (
          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              Review Intelligence
            </p>
            <p className="text-sm text-neutral-700 leading-relaxed">{result.ai_narrative}</p>
          </div>
        )}

        {/* Internal action recommendation */}
        {result.action_recommendation && (
          <div className="mt-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
              Action Recommendation — Internal
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              {result.action_recommendation}
            </p>
          </div>
        )}
      </Card>
    );
  }

  // ── Form mode ─────────────────────────────────────────────────────────────

  const inputClass =
    "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300";
  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div>
          <SectionTitle>Review Platform Intelligence</SectionTitle>
          <p className="text-xs text-neutral-500 mt-0.5">
            Google Reviews + TripAdvisor (hospitality) — Week {currentWeek}
          </p>
        </div>
        {lastScore && (
          <button
            onClick={() => setShowForm(false)}
            className="text-xs text-neutral-400 hover:text-neutral-600 underline"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="space-y-5">

        {/* Google Reviews */}
        <div>
          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wide mb-3">
            Google Reviews
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Overall rating</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                placeholder="e.g. 4.3"
                className={inputClass}
                value={googleRating}
                onChange={(e) => setGoogleRating(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Total reviews</label>
              <input
                type="number"
                placeholder="e.g. 1240"
                className={inputClass}
                value={googleCountTotal}
                onChange={(e) => setGoogleCountTotal(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>New reviews this week</label>
              <input
                type="number"
                placeholder="e.g. 12"
                className={inputClass}
                value={googleCountPeriod}
                onChange={(e) => setGoogleCountPeriod(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Avg rating of new reviews</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                placeholder="e.g. 4.1"
                className={inputClass}
                value={googleAvgPeriod}
                onChange={(e) => setGoogleAvgPeriod(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* TripAdvisor */}
        <div>
          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1">
            TripAdvisor
          </p>
          <p className="text-xs text-neutral-400 mb-3">
            Hospitality + F&B — leave blank if not applicable
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Overall rating</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                placeholder="e.g. 4.5"
                className={inputClass}
                value={taRating}
                onChange={(e) => setTaRating(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Total reviews</label>
              <input
                type="number"
                placeholder="e.g. 860"
                className={inputClass}
                value={taCountTotal}
                onChange={(e) => setTaCountTotal(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>New reviews this week</label>
              <input
                type="number"
                placeholder="e.g. 8"
                className={inputClass}
                value={taCountPeriod}
                onChange={(e) => setTaCountPeriod(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Avg rating of new reviews</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                placeholder="e.g. 4.4"
                className={inputClass}
                value={taAvgPeriod}
                onChange={(e) => setTaAvgPeriod(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Sentiment */}
        <div>
          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wide mb-3">
            Sentiment breakdown (%) — across all platforms
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Positive</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 72"
                className={inputClass}
                value={sentimentPos}
                onChange={(e) => setSentimentPos(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Neutral</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 18"
                className={inputClass}
                value={sentimentNeu}
                onChange={(e) => setSentimentNeu(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Negative</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 10"
                className={inputClass}
                value={sentimentNeg}
                onChange={(e) => setSentimentNeg(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Response rate + themes */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={labelClass}>Management response rate % (last 30 days)</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 65"
              className={inputClass}
              value={responseRate}
              onChange={(e) => setResponseRate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Top positive themes (comma-separated, max 3)
            </label>
            <input
              type="text"
              placeholder="e.g. Room cleanliness, Staff friendliness, Location"
              className={inputClass}
              value={positiveThemes}
              onChange={(e) => setPositiveThemes(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Top negative themes (comma-separated, max 3)
            </label>
            <input
              type="text"
              placeholder="e.g. Slow check-in, Wifi reliability, Noise levels"
              className={inputClass}
              value={negativeThemes}
              onChange={(e) => setNegativeThemes(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          onClick={handleRun}
          disabled={isRunning || !googleRating}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? "Analysing reviews…" : "Run Review Intelligence"}
        </button>
      </div>
    </Card>
  );
}
