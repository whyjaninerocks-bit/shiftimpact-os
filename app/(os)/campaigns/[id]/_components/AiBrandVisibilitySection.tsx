"use client";
// AiBrandVisibilitySection.tsx
// F23 Phase 1 — AI Brand Visibility Layer
// Sprint 19 · 17 July 2026
//
// ACCESS RULES:
//   eligibility_score (number): INTERNAL — shown here, never in client portal
//   eligibility_band (label):   INTERNAL — use directional language with client
//   trust_gap_owned / _cep:     INTERNAL ONLY
//   priority_action:            INTERNAL — Janine decides when/how to share
//   ai_narrative:               Client-shareable (plain language)
//
// Visible on campaign page after IQ Evaluate section.
// Monthly cadence recommended — not weekly.

import { useState } from "react";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";
import type { AiBrandVisibilityScore } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiBrandVisibilitySectionProps {
  campaignId: string;
  lastScore: AiBrandVisibilityScore | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bandTone(band: string | null): "green" | "amber" | "red" | "neutral" {
  if (band === "AI-Ready")    return "green";
  if (band === "Developing")  return "amber";
  if (band === "Emerging")    return "amber";
  if (band === "At Risk")     return "red";
  return "neutral";
}

function bandIcon(band: string | null): string {
  if (band === "AI-Ready")   return "🟢";
  if (band === "Developing") return "🟡";
  if (band === "Emerging")   return "🟠";
  if (band === "At Risk")    return "🔴";
  return "○";
}

function scoreBar(score: number | null) {
  if (score == null) return null;
  const col =
    score >= 70 ? "bg-emerald-500" :
    score >= 50 ? "bg-amber-400"   :
    "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full ${col}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-neutral-500">{score}/100</span>
    </div>
  );
}

// ─── Dimension breakdown row ──────────────────────────────────────────────────

function DimRow({ label, score, weight }: { label: string; score: number | null; weight: string }) {
  if (score == null) return null;
  const col =
    score >= 70 ? "text-emerald-700" :
    score >= 50 ? "text-amber-700"   :
    "text-red-600";
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-neutral-50">
      <span className="text-neutral-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-neutral-400">{weight}</span>
        <span className={`font-mono font-medium ${col}`}>{score}</span>
      </div>
    </div>
  );
}

// ─── Result display ───────────────────────────────────────────────────────────

function VisibilityResult({ score }: { score: AiBrandVisibilityScore }) {
  const [showDims, setShowDims] = useState(false);

  return (
    <div className="space-y-4 mt-4">
      {/* Score header */}
      <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <div className="text-center min-w-[4rem]">
          <p className="text-3xl font-bold text-neutral-900">{score.eligibility_score}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-wide">AI Score</p>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone={bandTone(score.eligibility_band)}>
              {bandIcon(score.eligibility_band)} {score.eligibility_band}
            </Badge>
            <span className="text-xs text-neutral-400">AI Recommendation Eligibility</span>
          </div>
          {scoreBar(score.eligibility_score)}
        </div>
      </div>

      {/* Dimension breakdown (toggle) */}
      <button
        onClick={() => setShowDims(v => !v)}
        className="text-xs text-neutral-500 hover:text-neutral-900 underline"
      >
        {showDims ? "Hide dimension breakdown" : "Show dimension breakdown"}
      </button>

      {showDims && (
        <div className="rounded-lg border border-neutral-200 p-3">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            5 Dimensions (INTERNAL)
          </p>
          <DimRow label="D1 — UGC Depth"              score={score.ugc_depth_score}         weight="30%" />
          <DimRow label="D2 — Sentiment Clarity"       score={score.sentiment_clarity_score}  weight="25%" />
          <DimRow label="D3 — CEP Breadth"             score={score.cep_breadth_score}        weight="20%" />
          <DimRow label="D4 — Search Intent Alignment" score={score.search_intent_score}      weight="15%" />
          <DimRow label="D5 — Information Consistency" score={score.information_consistency_score} weight="10%" />
        </div>
      )}

      {/* AI narrative — client shareable */}
      {score.ai_narrative && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-1">
            AI Visibility Narrative · Client-Shareable
          </p>
          <p className="text-sm text-blue-900 leading-relaxed">{score.ai_narrative}</p>
        </div>
      )}

      {/* Trust gaps — INTERNAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {score.trust_gap_owned && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">
              Owned Content Gap · Internal
            </p>
            <p className="text-xs text-amber-900 leading-relaxed">{score.trust_gap_owned}</p>
          </div>
        )}
        {score.trust_gap_cep && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">
              CEP Coverage Gap · Internal
            </p>
            <p className="text-xs text-amber-900 leading-relaxed">{score.trust_gap_cep}</p>
          </div>
        )}
      </div>

      {/* Priority action */}
      {score.priority_action && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
          <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1">
            Priority Action (Next 30 Days) · Internal
          </p>
          <p className="text-sm text-purple-900 leading-relaxed">→ {score.priority_action}</p>
        </div>
      )}

      <p className="text-xs text-neutral-400 text-right">
        Last run: {new Date(score.created_at).toLocaleDateString("en-MY", {
          day: "numeric", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiBrandVisibilitySection({
  campaignId,
  lastScore: initialScore,
}: AiBrandVisibilitySectionProps) {
  const [score, setScore] = useState<AiBrandVisibilityScore | null>(initialScore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(!initialScore);

  // Form state
  const [cepCount, setCepCount] = useState(initialScore?.cep_count ?? 0);
  const [consistency, setConsistency] = useState(initialScore?.information_consistency_score ?? 50);
  const [observations, setObservations] = useState(initialScore?.ai_visibility_observations ?? "");

  async function runAssessment() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-brand-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          cep_count: cepCount,
          information_consistency_score: consistency,
          ai_visibility_observations: observations,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Assessment failed");
      setScore(data as AiBrandVisibilityScore);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "mt-1 block w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
  const labelCls = "block text-xs font-medium text-neutral-600";

  return (
    <section id="ai-brand-visibility">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>AI Brand Visibility</SectionTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">INTERNAL</span>
            <Badge tone="purple">F23 ✦</Badge>
          </div>
        </div>

        <p className="text-xs text-neutral-500 mb-4">
          How eligible is this brand to be recommended by AI tools — ChatGPT, Google AI Overviews,
          Perplexity, Gemini, TikTok Search. Monthly cadence. Score and trust gaps are internal;
          narrative may be shared with client.
        </p>

        {/* Input form */}
        {showForm && (
          <div className="space-y-4 border border-neutral-200 rounded-lg p-4 bg-neutral-50">
            <p className="text-xs font-semibold text-neutral-600">Assessment Inputs</p>

            {/* CEP count */}
            <div>
              <label className={labelCls}>
                Category Entry Points mapped{" "}
                <span className="text-neutral-400 font-normal">(how many buying situations does this brand show up in?)</span>
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={cepCount}
                onChange={e => setCepCount(Number(e.target.value))}
                className={inputCls}
                placeholder="e.g. 3"
              />
            </div>

            {/* Information consistency */}
            <div>
              <label className={labelCls}>
                Information Consistency Score: <strong>{consistency}/100</strong>{" "}
                <span className="text-neutral-400 font-normal">(accuracy of brand info across website, Google Business, social bios)</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={consistency}
                onChange={e => setConsistency(Number(e.target.value))}
                className="mt-2 w-full accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>Inconsistent (0)</span>
                <span>Fully consistent (100)</span>
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className={labelCls}>
                AI Visibility Observations{" "}
                <span className="text-neutral-400 font-normal">(what have you noticed about this brand appearing — or not — in AI responses?)</span>
              </label>
              <textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                rows={3}
                placeholder="e.g. Brand doesn't appear when asking ChatGPT for 'best Malaysian canned food brands'. Google AI Overview shows a competitor instead."
                className={inputCls + " resize-none"}
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={runAssessment}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {loading ? "Assessing…" : score ? "Re-run Assessment" : "Run AI Visibility Assessment"}
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

        {/* Show form toggle when result exists */}
        {score && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-neutral-500 hover:text-neutral-900 underline mb-3"
          >
            Re-run with updated inputs
          </button>
        )}

        {/* Result */}
        {score && <VisibilityResult score={score} />}
      </Card>
    </section>
  );
}
