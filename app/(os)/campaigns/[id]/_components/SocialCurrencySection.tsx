"use client";
// SocialCurrencySection.tsx
// F23 Phase 2 — Social Currency Index (SCI)
// Sprint 20 · 17 July 2026
//
// ACCESS RULES:
//   sci_score + trend_direction + ai_narrative: shareable with client
//   dimension scores + build_action: INTERNAL ONLY
//
// Weekly cadence. Sits after AI Brand Visibility on the campaign page.

import { useState } from "react";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";
import type { SocialCurrencyScore } from "@/lib/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SocialCurrencySectionProps {
  campaignId: string;
  lastScore: SocialCurrencyScore | null;
  currentWeek?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function trendTone(dir: string | null): "green" | "amber" | "red" | "neutral" {
  if (dir === "Improving")  return "green";
  if (dir === "Stable")     return "neutral";
  if (dir === "Declining")  return "red";
  return "neutral";
}

function trendIcon(dir: string | null): string {
  if (dir === "Improving")  return "↑";
  if (dir === "Declining")  return "↓";
  return "→";
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-600";
}

function scoreBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-400";
}

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-neutral-500">{score}/100</span>
    </div>
  );
}

function DimRow({
  label,
  score,
  weight,
}: {
  label: string;
  score: number | null;
  weight: string;
}) {
  if (score == null) return null;
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-50">
      <span className="text-neutral-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-neutral-400">{weight}</span>
        <span className={`font-mono font-medium w-6 text-right ${scoreColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

// ─── Result display ───────────────────────────────────────────────────────────

function SciResult({ score }: { score: SocialCurrencyScore }) {
  const [showDims, setShowDims] = useState(false);

  return (
    <div className="space-y-4 mt-4">
      {/* SCI score header */}
      <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <div className="text-center min-w-[4.5rem]">
          <p className={`text-3xl font-bold ${scoreColor(score.sci_score)}`}>
            {score.sci_score}
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-wide">SCI</p>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={trendTone(score.trend_direction)}>
              {trendIcon(score.trend_direction)} {score.trend_direction}
            </Badge>
            <span className="text-xs text-neutral-400">vs previous week · Week {score.week_number}</span>
          </div>
          <ScoreBar score={score.sci_score} />
        </div>
      </div>

      {/* Dimension breakdown toggle */}
      <button
        onClick={() => setShowDims(v => !v)}
        className="text-xs text-neutral-500 hover:text-neutral-900 underline"
      >
        {showDims ? "Hide dimension breakdown" : "Show dimension breakdown"}
      </button>

      {showDims && (
        <div className="rounded-lg border border-neutral-200 p-3">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            5 Dimensions (INTERNAL ONLY)
          </p>
          <DimRow label="D1 — Save-to-Post Ratio"       score={score.save_to_post_ratio_score}  weight="30%" />
          <DimRow label="D2 — Share Velocity"            score={score.share_velocity_score}       weight="25%" />
          <DimRow label="D3 — Comment Depth"             score={score.comment_depth_score}        weight="20%" />
          <DimRow label="D4 — Cross-Platform Propagation" score={score.cross_platform_score}      weight="15%" />
          <DimRow label="D5 — Sentiment Momentum"        score={score.sentiment_momentum_score}   weight="10%" />
          <div className="mt-2 pt-2 border-t border-neutral-100 flex justify-between text-xs">
            <span className="text-neutral-500">Manual inputs used</span>
            <span className="text-neutral-400 font-mono">
              Avg comments/post: {score.comment_depth_avg} · Cross-platform: {score.cross_platform_pct}%
            </span>
          </div>
        </div>
      )}

      {/* AI narrative — client-shareable */}
      {score.ai_narrative && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-1">
            Social Currency Narrative · Client-Shareable
          </p>
          <p className="text-sm text-blue-900 leading-relaxed">{score.ai_narrative}</p>
        </div>
      )}

      {/* Build action — INTERNAL */}
      {score.build_action && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1">
            Build Action (Next 2 Weeks) · Internal
          </p>
          <p className="text-sm text-purple-900 leading-relaxed">→ {score.build_action}</p>
        </div>
      )}

      <p className="text-xs text-neutral-400 text-right">
        Last run:{" "}
        {new Date(score.created_at).toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SocialCurrencySection({
  campaignId,
  lastScore: initialScore,
  currentWeek = 1,
}: SocialCurrencySectionProps) {
  const [score, setScore] = useState<SocialCurrencyScore | null>(initialScore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(!initialScore);

  // Form state
  const [weekNumber, setWeekNumber] = useState(
    initialScore?.week_number ?? currentWeek
  );
  const [commentDepth, setCommentDepth] = useState(
    initialScore?.comment_depth_avg ?? 0
  );
  const [crossPlatform, setCrossPlatform] = useState(
    initialScore?.cross_platform_pct ?? 0
  );

  async function runSci() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/social-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id:       campaignId,
          week_number:       weekNumber,
          comment_depth_avg: commentDepth,
          cross_platform_pct: crossPlatform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "SCI run failed");
      setScore(data as SocialCurrencyScore);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
  const labelCls = "block text-xs font-medium text-neutral-600";

  return (
    <section id="social-currency">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Social Currency Index</SectionTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">INTERNAL</span>
            <Badge tone="purple">F23 ✦</Badge>
          </div>
        </div>

        <p className="text-xs text-neutral-500 mb-4">
          How well is the brand's content generating genuine sharing and conversation — not just
          impressions? Combines Signal 2 save rate, week-over-week trend, comment depth,
          cross-platform spread, and Signal 3 sentiment health. Weekly cadence.
          Score and dimensions are internal; narrative may be shared with client.
        </p>

        {/* Input form */}
        {showForm && (
          <div className="space-y-4 border border-neutral-200 rounded-lg p-4 bg-neutral-50">
            <p className="text-xs font-semibold text-neutral-600">Manual Inputs</p>

            {/* Week number */}
            <div>
              <label className={labelCls}>Week number</label>
              <input
                type="number"
                min={1}
                max={52}
                value={weekNumber}
                onChange={e => setWeekNumber(Number(e.target.value))}
                className={inputCls}
                placeholder="e.g. 4"
              />
            </div>

            {/* Comment depth */}
            <div>
              <label className={labelCls}>
                Average comments per post this week{" "}
                <span className="text-neutral-400 font-normal">
                  (D3 — Comment Depth, weight 20%)
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={commentDepth}
                onChange={e => setCommentDepth(Number(e.target.value))}
                className={inputCls}
                placeholder="e.g. 23"
              />
              <p className="mt-1 text-[10px] text-neutral-400">
                Scoring: ≥50 avg = 80 · ≥20 = 60 · ≥5 = 40 · &lt;5 = 20
              </p>
            </div>

            {/* Cross-platform propagation */}
            <div>
              <label className={labelCls}>
                Cross-platform propagation (%){" "}
                <span className="text-neutral-400 font-normal">
                  (D4 — % of content spreading organically to 2+ platforms, weight 15%)
                </span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={crossPlatform}
                onChange={e => setCrossPlatform(Number(e.target.value))}
                className={inputCls}
                placeholder="e.g. 18"
              />
              <p className="mt-1 text-[10px] text-neutral-400">
                Scoring: ≥30% = 80 · ≥15% = 60 · ≥5% = 40 · &lt;5% = 20
              </p>
            </div>

            <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <p className="text-[10px] text-neutral-500">
                <strong className="text-neutral-700">Auto-pulled from Signals:</strong>{" "}
                D1 Save-to-Post Ratio (Signal 2) · D2 Share Velocity (week-over-week Signal 2) · D5 Sentiment Momentum (Signal 3)
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={runSci}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {loading ? "Running…" : score ? "Re-run SCI" : "Run Social Currency Index"}
              </button>
              {score && (
                <button
                  onClick={() => setShowForm(false)}
                  className="text-sm text-neutral-400 hover:text-neutral-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toggle to re-run */}
        {score && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-neutral-500 hover:text-neutral-900 underline mb-3"
          >
            Re-run with updated inputs
          </button>
        )}

        {/* Result */}
        {score && <SciResult score={score} />}
      </Card>
    </section>
  );
}
