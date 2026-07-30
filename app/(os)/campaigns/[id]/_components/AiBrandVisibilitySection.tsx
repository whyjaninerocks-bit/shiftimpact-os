"use client";
// AiBrandVisibilitySection.tsx
// F23 Phase 1 + Phase 2 — AI Brand Visibility + Trust Gap Diagnosis
// Sprint 19–20 · 17–30 July 2026
//
// ACCESS RULES:
//   eligibility_score, all trust_gap_*, competitor gap: INTERNAL ONLY
//   trust_gap_competitor: INTERNAL ONLY — NEVER shared with client under any circumstances
//   ai_visibility_risk: INTERNAL — Risk Posture modifier
//   priority_action: INTERNAL — Janine decides when/how to share
//   ai_narrative: Client-shareable (plain language, no scores or competitor mention)
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

      {/* AI Visibility Risk (Phase 2) */}
      {score.ai_visibility_risk && (
        <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
          score.ai_visibility_risk === "Critical" ? "bg-red-50 border-red-200" :
          score.ai_visibility_risk === "High"     ? "bg-orange-50 border-orange-200" :
          score.ai_visibility_risk === "Moderate" ? "bg-amber-50 border-amber-200" :
          "bg-emerald-50 border-emerald-200"
        }`}>
          <div className="flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
              score.ai_visibility_risk === "Critical" ? "text-red-700" :
              score.ai_visibility_risk === "High"     ? "text-orange-700" :
              score.ai_visibility_risk === "Moderate" ? "text-amber-700" :
              "text-emerald-700"
            }`}>
              AI Visibility Risk: {score.ai_visibility_risk}
              <span className="font-normal normal-case ml-2 text-neutral-400">(INTERNAL — Risk Posture modifier)</span>
            </p>
            {score.trust_gap_priority_note && (
              <p className="text-xs text-neutral-700 mt-0.5">{score.trust_gap_priority_note}</p>
            )}
          </div>
          {score.trust_gap_priority && (
            <span className="text-[10px] rounded px-2 py-1 bg-white border border-neutral-200 text-neutral-600 font-medium shrink-0">
              Priority gap: {score.trust_gap_priority}
            </span>
          )}
        </div>
      )}

      {/* Trust Gaps — INTERNAL (Phase 1 + Phase 2) */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          Trust Gap Diagnosis <span className="font-normal normal-case text-neutral-400">(INTERNAL — all 5 gap types)</span>
        </p>

        {[
          { key: "Owned",     label: "Owned Content Gap",      val: score.trust_gap_owned,     clientSafe: false },
          { key: "Community", label: "Community Depth Gap",    val: score.trust_gap_community,  clientSafe: false },
          { key: "CEP",       label: "CEP Coverage Gap",       val: score.trust_gap_cep,        clientSafe: false },
          { key: "Platform",  label: "Platform Blind Spot",    val: score.trust_gap_platform,   clientSafe: false },
        ].map(({ key, label, val }) => val ? (
          <div key={key} className={`rounded-lg border px-3 py-2 ${
            score.trust_gap_priority === key
              ? "border-orange-300 bg-orange-50"
              : "border-amber-200 bg-amber-50"
          }`}>
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1 flex items-center gap-2">
              {label}
              {score.trust_gap_priority === key && (
                <span className="text-[9px] rounded px-1 py-0.5 bg-orange-200 text-orange-800 font-bold normal-case">Priority</span>
              )}
            </p>
            <p className="text-xs text-amber-900 leading-relaxed">{val}</p>
          </div>
        ) : null)}

        {/* Competitor Gap — DOUBLE-GATED INTERNAL */}
        {score.trust_gap_competitor && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1">
              Competitor AI Advantage
              <span className="ml-2 font-semibold rounded px-1 py-0.5 bg-red-200 text-red-900 text-[9px]">
                INTERNAL ONLY — NEVER SHARE WITH CLIENT
              </span>
            </p>
            <p className="text-xs text-red-900 leading-relaxed">{score.trust_gap_competitor}</p>
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
