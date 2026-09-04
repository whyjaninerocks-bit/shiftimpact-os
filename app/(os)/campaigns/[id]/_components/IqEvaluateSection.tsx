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

// Stage 1 — SEA Marketing Effectiveness Intelligence KB groundwork (3 Sept 2026).
// Rubric-only fields. claim_type tags how certain each value is; confidence_model
// stays at its lowest tier until a verified case corpus is actually connected.
type ClaimType = "source_supported" | "inference" | "hypothesis" | "recommendation" | "not_claimable_yet";

interface DecisionReadinessField {
  value: string;
  claim_type: ClaimType;
}

interface ExtendedEvaluation {
  business_challenge_clarity: DecisionReadinessField;
  behaviour_to_move: DecisionReadinessField;
  market_category_tension: DecisionReadinessField;
  proof_logic: DecisionReadinessField;
  signal_plan: DecisionReadinessField;
  execution_risk: DecisionReadinessField;
  decision_recommendation: DecisionReadinessField;
}

interface ConfidenceModel {
  evidence_confidence: string;
  result_confidence: string;
  causal_confidence: string;
  market_confidence: string;
  transferability_score: string;
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
  extended_evaluation?: ExtendedEvaluation;
  confidence_model?: ConfidenceModel;
  kb_grounded?: boolean;
  schema_version?: number;
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

const DECISION_READINESS_FIELDS: { key: keyof ExtendedEvaluation; label: string }[] = [
  { key: "business_challenge_clarity", label: "Business Challenge Clarity" },
  { key: "behaviour_to_move", label: "Behaviour to Move" },
  { key: "market_category_tension", label: "Market / Category Tension" },
  { key: "proof_logic", label: "Proof Logic" },
  { key: "signal_plan", label: "Signal Plan" },
  { key: "execution_risk", label: "Execution Risk" },
  { key: "decision_recommendation", label: "Decision Recommendation" },
];

function claimTypeLabel(claimType: ClaimType): string {
  switch (claimType) {
    case "source_supported": return "Source-supported";
    case "inference": return "Inference";
    case "hypothesis": return "Hypothesis";
    case "recommendation": return "Recommendation";
    case "not_claimable_yet": return "Not claimable yet";
  }
}

function claimTypeTone(claimType: ClaimType): "green" | "amber" | "red" | "neutral" {
  if (claimType === "source_supported") return "green";
  if (claimType === "hypothesis" || claimType === "not_claimable_yet") return "amber";
  return "neutral";
}

function confidenceTone(value: string): "green" | "amber" | "red" | "neutral" {
  if (value === "High") return "green";
  if (value === "Medium") return "amber";
  return "neutral"; // Low / Not Stated / Not Claimable / Not Tested
}

const CONFIDENCE_MODEL_FIELDS: { key: keyof ConfidenceModel; label: string }[] = [
  { key: "evidence_confidence", label: "Evidence Confidence" },
  { key: "result_confidence", label: "Result Confidence" },
  { key: "causal_confidence", label: "Causal Confidence" },
  { key: "market_confidence", label: "Market Confidence" },
  { key: "transferability_score", label: "Transferability Score" },
];

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
          8-dimension creative quality evaluation using ShiftImpact&apos;s strategic evaluation rubric.
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

            {/* Decision Readiness — Stage 1 SEA Marketing Effectiveness Intelligence KB groundwork */}
            {evaluation.extended_evaluation && evaluation.confidence_model && (
              <div className="rounded-lg border border-neutral-200 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Decision Readiness</p>
                  <Badge tone="neutral">{evaluation.kb_grounded ? "KB-grounded" : "Rubric-only"}</Badge>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Rubric-only evaluation. Not grounded in the SEA Marketing Effectiveness KB yet.
                </p>

                <div className="space-y-2">
                  {DECISION_READINESS_FIELDS.map(({ key, label }) => {
                    const field = evaluation.extended_evaluation?.[key];
                    if (!field) return null;
                    return (
                      <div key={key} className="border border-neutral-100 rounded-md p-2.5">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-medium text-neutral-700">{label}</p>
                          <Badge tone={claimTypeTone(field.claim_type)}>{claimTypeLabel(field.claim_type)}</Badge>
                        </div>
                        <p className="text-sm text-neutral-700 leading-relaxed">{field.value || "—"}</p>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1.5">Confidence Model</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONFIDENCE_MODEL_FIELDS.map(({ key, label }) => {
                      const value = evaluation.confidence_model?.[key];
                      if (!value) return null;
                      return (
                        <span key={key} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                          {label}
                          <Badge tone={confidenceTone(value)}>{value}</Badge>
                        </span>
                      );
                    })}
                  </div>
                </div>
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
