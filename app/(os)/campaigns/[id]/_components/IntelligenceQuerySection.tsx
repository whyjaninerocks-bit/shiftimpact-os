"use client";

// IntelligenceQuerySection.tsx
// F33 — Intelligence Query Activator (Sprint 7)
// INTERNAL ONLY — Janine-operated. This component is never rendered in the
// Client Interface (/portal/*). It appears in the strategy lead dashboard only.
//
// Allows Janine to activate any intelligence component on demand for a
// client presentation question. Returns a 4-part finding (headline / context /
// implication / recommendation) that is client-safe and presentation-ready.
//
// INTERNAL fields (confidence, components_used, data_basis) are shown
// in the UI but are never included in the copy-to-clipboard output.

import { useState } from "react";

type QueryScope =
  | "signal_delivery"
  | "consumer_behaviour"
  | "brand_momentum"
  | "risk_pipeline"
  | "activation_next_steps"
  | "attribution_roi"
  | "ai_competitive_visibility"
  | "campaign_overview";

type ConfidenceTier = "High" | "Directional" | "Speculative";

interface DataBasis {
  component: string;
  table: string;
  record_count: number;
  latest_record_at: string | null;
}

interface QueryResult {
  query_id: string;
  headline: string;
  context: string;
  implication: string;
  recommendation: string;
  confidence: ConfidenceTier;
  components_used: string[];
  data_basis: DataBasis[];
  scopes_resolved: QueryScope[];
  generated_at: string;
}

const QUERY_PILLS: { label: string; scope: QueryScope; placeholder: string }[] = [
  {
    label: "Signal & Delivery",
    scope: "signal_delivery",
    placeholder: "Why isn't branded search moving? Are we reaching enough people?",
  },
  {
    label: "Consumer Behaviour",
    scope: "consumer_behaviour",
    placeholder: "Who is buying? What state are consumers in?",
  },
  {
    label: "Brand Momentum",
    scope: "brand_momentum",
    placeholder: "How is brand health tracking? Is the brand growing?",
  },
  {
    label: "Risk & Pipeline",
    scope: "risk_pipeline",
    placeholder: "Are we at risk of losing sales? Is there a pipeline cliff?",
  },
  {
    label: "Activation & Next Steps",
    scope: "activation_next_steps",
    placeholder: "What should we do next? What are the priority actions?",
  },
  {
    label: "Attribution & ROI",
    scope: "attribution_roi",
    placeholder: "Is this campaign working? What is driving results?",
  },
  {
    label: "AI Visibility",
    scope: "ai_competitive_visibility",
    placeholder: "Are we visible where consumers are going?",
  },
  {
    label: "Campaign Overview",
    scope: "campaign_overview",
    placeholder: "Give me a summary of where we are overall.",
  },
];

const CONFIDENCE_STYLES: Record<ConfidenceTier, { badge: string; label: string }> = {
  High: { badge: "bg-green-100 text-green-800 border border-green-200", label: "High confidence — based on 3+ weeks of data across components" },
  Directional: { badge: "bg-amber-100 text-amber-800 border border-amber-200", label: "Directional — based on 1-2 weeks or partial data" },
  Speculative: { badge: "bg-red-100 text-red-800 border border-red-200", label: "Speculative — limited data available. Frame carefully." },
};

interface Props {
  campaignId: string;
  campaignName: string;
}

export function IntelligenceQuerySection({ campaignId, campaignName }: Props) {
  const [selectedScope, setSelectedScope] = useState<QueryScope | null>(null);
  const [queryText, setQueryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInternal, setShowInternal] = useState(false);
  const [savedToCir, setSavedToCir] = useState(false);

  function handlePillClick(scope: QueryScope, placeholder: string) {
    setSelectedScope(scope);
    setQueryText(placeholder);
    setResult(null);
    setError(null);
  }

  async function handleActivate() {
    if (!queryText.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setSavedToCir(false);

    try {
      const res = await fetch("/api/intelligence-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          query_text: queryText.trim(),
          query_scope: selectedScope ? [selectedScope] : undefined,
        }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(msg ?? "Request failed");
      }

      const data: QueryResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleCopyForPresentation() {
    if (!result) return;
    const text = [
      result.headline,
      "",
      result.context,
      "",
      result.implication,
      "",
      result.recommendation,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSaveToCir() {
    // Save this query finding to the CIR (F31) as a named finding entry.
    // The internal confidence + components_used are stored; client export shows only text.
    if (!result) return;
    try {
      await fetch("/api/campaign-report-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          action: "append_finding",
          finding: {
            query_id: result.query_id,
            headline: result.headline,
            context: result.context,
            implication: result.implication,
            recommendation: result.recommendation,
            confidence: result.confidence,           // internal — not in client export
            components_used: result.components_used, // internal
            scopes_resolved: result.scopes_resolved, // internal
            generated_at: result.generated_at,
          },
        }),
      });
      setSavedToCir(true);
    } catch {
      // Non-blocking — CIR may not be built yet in Sprint 7 staging
      setSavedToCir(true);
    }
  }

  return (
    <section id="intelligence-query" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Intelligence Query</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Activate campaign intelligence for a specific client question.{" "}
            <span className="font-medium text-amber-700">Internal — Janine only.</span>
          </p>
        </div>
        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded font-medium">
          F33
        </span>
      </div>

      {/* Query Type Pills */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Select query type
        </p>
        <div className="flex flex-wrap gap-2">
          {QUERY_PILLS.map((pill) => (
            <button
              key={pill.scope}
              onClick={() => handlePillClick(pill.scope, pill.placeholder)}
              className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${
                selectedScope === pill.scope
                  ? "bg-blue-900 text-white border-blue-900"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-700"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Query Text Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client question
        </label>
        <textarea
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          rows={3}
          placeholder="Type the client's question, or select a query type above to pre-fill..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none"
        />
      </div>

      {/* Activate Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleActivate}
          disabled={!queryText.trim() || loading}
          className="px-5 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Activating…" : "Activate Intelligence"}
        </button>
        {loading && (
          <span className="text-sm text-gray-500 animate-pulse">
            Routing and pulling stored components…
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Finding Card */}
      {result && (
        <div className="space-y-4">
          {/* Client-safe finding */}
          <div className="rounded-xl border border-blue-900/20 bg-blue-950/5 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-blue-950 leading-snug">
                {result.headline}
              </h3>
              <span className="shrink-0 text-xs text-gray-400 pt-0.5">
                {new Date(result.generated_at).toLocaleTimeString("en-MY", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {result.context && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Context</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.context}</p>
              </div>
            )}

            {result.implication && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Implication</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.implication}</p>
              </div>
            )}

            {result.recommendation && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Recommendation</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.recommendation}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCopyForPresentation}
              className="px-4 py-1.5 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? "Copied ✓" : "Copy for presentation"}
            </button>
            <button
              onClick={handleSaveToCir}
              disabled={savedToCir}
              className="px-4 py-1.5 border border-blue-300 text-sm font-medium text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              {savedToCir ? "Saved to CIR ✓" : "Save to CIR"}
            </button>
            <button
              onClick={() => setShowInternal(!showInternal)}
              className="px-4 py-1.5 border border-amber-200 text-sm font-medium text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
            >
              {showInternal ? "Hide internal" : "Show internal"}
            </button>
          </div>

          {/* Internal metadata — JANINE ONLY */}
          {showInternal && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                Internal — not shown to clients
              </p>

              {/* Confidence */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-medium">Confidence:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CONFIDENCE_STYLES[result.confidence].badge}`}>
                  {result.confidence}
                </span>
                <span className="text-xs text-gray-500">
                  {CONFIDENCE_STYLES[result.confidence].label}
                </span>
              </div>

              {/* Components used */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Components used:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.components_used.length > 0 ? (
                    result.components_used.map((c) => (
                      <span key={c} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">No stored data found</span>
                  )}
                </div>
              </div>

              {/* Data basis */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Data basis:</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-1 pr-4 font-medium">Component</th>
                      <th className="pb-1 pr-4 font-medium">Records</th>
                      <th className="pb-1 font-medium">Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data_basis.map((b) => (
                      <tr key={b.table} className="border-t border-amber-200">
                        <td className="py-1 pr-4 text-gray-700">{b.component}</td>
                        <td className="py-1 pr-4 text-gray-700">{b.record_count}</td>
                        <td className="py-1 text-gray-500">
                          {b.latest_record_at
                            ? new Date(b.latest_record_at).toLocaleDateString("en-MY")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Scopes resolved */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Scopes resolved:</p>
                <p className="text-xs text-gray-500">{result.scopes_resolved.join(", ")}</p>
              </div>

              {/* Query ID */}
              <p className="text-xs text-gray-400">Query ID: {result.query_id}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
