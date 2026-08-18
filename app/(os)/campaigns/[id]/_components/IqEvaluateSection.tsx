"use client";
// IqEvaluateSection.tsx
// INTERNAL ONLY — never shown to clients.
// Visible only when: frame.elevation_mode_enabled === true AND bip.topline_idea exists.
//
// Runs the 8-dimension Idea Quality evaluation via /api/iq-evaluate.
// Displays dimensions, red flags, and elevation brief.

import { useState } from "react";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type IqLevel = "Foundational" | "Developing" | "World-Class";

interface IqDimension {
  name: string;
  level: IqLevel;
  score: 1 | 2 | 3;
  rationale: string;
  elevation_move: string;
}

interface IqEvaluationResult {
  id: string;
  campaign_id: string;
  dimensions: IqDimension[];
  red_flags: string[];
  elevation_brief: string;
  overall_assessment: string;
  iq_score_pct: number | null;
  created_at: string;
}

interface IqEvaluateSectionProps {
  campaignId: string;
  bipToplineIdea: string;
  elevationModeEnabled: boolean;
  lastEvaluation: IqEvaluationResult | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function levelTone(level: IqLevel): "green" | "amber" | "red" | "neutral" {
  if (level === "World-Class") return "green";
  if (level === "Developing") return "amber";
  return "neutral";
}

function levelDot(level: IqLevel): string {
  if (level === "World-Class") return "🟢";
  if (level === "Developing") return "🟡";
  return "⚪";
}

function scorePctTone(pct: number): string {
  if (pct >= 80) return "text-emerald-700";
  if (pct >= 60) return "text-amber-700";
  return "text-neutral-500";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IqEvaluateSection({
  campaignId,
  bipToplineIdea,
  elevationModeEnabled,
  lastEvaluation: initialEval,
}: IqEvaluateSectionProps) {
  const [evaluation, setEvaluation] = useState<IqEvaluationResult | null>(initialEval);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDimensions, setShowDimensions] = useState(false);

  const canRun = elevationModeEnabled && !!bipToplineIdea.trim();

  async function runEvaluation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/iq-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Evaluation failed");
      setEvaluation(data as IqEvaluationResult);
      setShowDimensions(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="iq-evaluate">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>IQ Evaluate</SectionTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">INTERNAL</span>
            {elevationModeEnabled ? (
              <Badge tone="green">Elevation Mode ON</Badge>
            ) : (
              <Badge tone="neutral">Elevation Mode OFF</Badge>
            )}
          </div>
        </div>

        <p className="text-xs text-neutral-500 mb-4">
          8-dimension creative quality evaluation calibrated to Cannes Lions 2026 Grand Prix standard.
          Run after BIP is sufficiently developed. Results guide elevation, not gate governance.
        </p>

        {!canRun && (
          <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm text-neutral-500">
            {!elevationModeEnabled
              ? "Enable Elevation Mode in the FRAME Brief to run IQ Evaluate."
              : "Add a Topline Idea to the Big Idea Platform before running IQ Evaluate."}
          </div>
        )}

        {canRun && (
          <div className="flex items-center gap-3">
            <button
              onClick={runEvaluation}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {loading ? "Evaluating…" : evaluation ? "Re-run IQ Evaluate" : "Run IQ Evaluate"}
            </button>
            {evaluation && (
              <button
                onClick={() => setShowDimensions((v) => !v)}
                className="text-sm text-neutral-500 hover:text-neutral-900 underline"
              >
                {showDimensions ? "Hide dimensions" : "Show dimensions"}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {evaluation && (
          <div className="mt-5 space-y-5">
            {/* Score header */}
            <div className="flex items-center gap-4 py-3 border-t border-neutral-100">
              {evaluation.iq_score_pct !== null && (
                <div className="text-center">
                  <p className={`text-3xl font-bold ${scorePctTone(evaluation.iq_score_pct)}`}>
                    {evaluation.iq_score_pct}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">IQ Score</p>
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-neutral-700 leading-relaxed">{evaluation.overall_assessment}</p>
              </div>
            </div>

            {/* Elevation brief */}
            {evaluation.elevation_brief && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-xs font-medium text-blue-600 mb-1">ELEVATION BRIEF</p>
                <p className="text-sm text-blue-900 leading-relaxed">{evaluation.elevation_brief}</p>
              </div>
            )}

            {/* Red flags */}
            {evaluation.red_flags.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-medium text-red-600 mb-2">RED FLAGS DETECTED</p>
                <ul className="space-y-1">
                  {evaluation.red_flags.map((flag, i) => (
                    <li key={i} className="text-sm text-red-800 flex gap-2">
                      <span className="text-red-400 shrink-0">▸</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 8 dimensions */}
            {showDimensions && evaluation.dimensions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">8 Dimensions</p>
                {evaluation.dimensions.map((dim, i) => (
                  <div key={i} className="border border-neutral-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-medium text-sm text-neutral-900">
                        {levelDot(dim.level)} {i + 1}. {dim.name}
                      </p>
                      <Badge tone={levelTone(dim.level)}>{dim.level}</Badge>
                    </div>
                    <p className="text-sm text-neutral-700 leading-relaxed mb-2">{dim.rationale}</p>
                    {dim.elevation_move && (
                      <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 leading-relaxed">
                        → {dim.elevation_move}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-neutral-400 text-right">
              Last run: {new Date(evaluation.created_at).toLocaleDateString("en-MY", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
        )}
      </Card>
    </section>
  );
}
