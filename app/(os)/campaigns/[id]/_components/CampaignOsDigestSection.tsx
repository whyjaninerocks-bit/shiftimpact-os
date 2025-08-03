"use client";

// CampaignOsDigestSection.tsx — Sprint 7
// Campaign OS Digest: cross-signal intelligence engine
// INTERNAL ONLY — Janine-operated. Not surfaced to client portal.
//
// Displays:
//   - Overall health traffic light
//   - Cross-signal narrative (4 paragraphs)
//   - Top action (highlighted)
//   - Contradiction flags (signal conflicts)
//   - Blindspot alerts (data / strategy gaps)
//   - Ranked recommendations with confidence + urgency
//   - Metadata: signal count, data weeks, model, generated at

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type HealthStatus = "Green" | "Amber" | "Red";
type ConfidenceBand = "High" | "Medium" | "Low" | "Speculative";
type Urgency = "Immediate" | "This week" | "Next sprint";
type Severity = "High" | "Medium" | "Low";

interface Contradiction {
  signal_a: string;
  signal_b: string;
  description: string;
  severity: Severity;
}

interface Blindspot {
  area: string;
  description: string;
  recommended_fix: string;
}

interface Recommendation {
  action: string;
  rationale: string;
  confidence: ConfidenceBand;
  urgency: Urgency;
  signal_source: string;
}

interface DigestData {
  id: string | null;
  campaign_id: string;
  week_number: number | null;
  overall_health: HealthStatus;
  narrative: string;
  top_action: string;
  contradictions: Contradiction[];
  blindspots: Blindspot[];
  recommendations: Recommendation[];
  signal_count: number;
  data_weeks: number;
  model_used: string;
  generated_at: string;
}

interface Props {
  campaignId: string;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function healthDot(status: HealthStatus) {
  const cls =
    status === "Green"
      ? "bg-green-500"
      : status === "Red"
      ? "bg-red-500"
      : "bg-amber-400";
  return <span className={`inline-block w-3 h-3 rounded-full ${cls} mr-2 flex-shrink-0`} />;
}

function healthBadge(status: HealthStatus) {
  const cls =
    status === "Green"
      ? "bg-green-100 text-green-800 border border-green-200"
      : status === "Red"
      ? "bg-red-100 text-red-800 border border-red-200"
      : "bg-amber-100 text-amber-800 border border-amber-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {healthDot(status)}{status}
    </span>
  );
}

function severityBadge(severity: Severity) {
  const cls =
    severity === "High"
      ? "bg-red-100 text-red-700"
      : severity === "Medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{severity}</span>
  );
}

function confidenceBadge(c: ConfidenceBand) {
  const cls =
    c === "High"
      ? "bg-green-100 text-green-700"
      : c === "Medium"
      ? "bg-amber-100 text-amber-700"
      : c === "Low"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{c}</span>
  );
}

function urgencyBadge(u: Urgency) {
  const cls =
    u === "Immediate"
      ? "bg-red-100 text-red-700 font-semibold"
      : u === "This week"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${cls}`}>{u}</span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CampaignOsDigestSection({ campaignId }: Props) {
  const router = useRouter();
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load latest saved digest on mount
  useEffect(() => {
    async function loadDigest() {
      try {
        const res = await fetch(`/api/campaign-digest?campaign_id=${campaignId}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setDigest({
              ...data,
              contradictions: data.contradictions_json ?? [],
              blindspots: data.blindspots_json ?? [],
              recommendations: data.recommendations_json ?? [],
            });
          }
        }
      } catch {
        // No saved digest — that's fine
      } finally {
        setLoading(false);
      }
    }
    loadDigest();
  }, [campaignId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setDigest(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section id="campaign-digest" className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">Campaign OS Digest</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium border border-purple-200">
              Cross-Signal Intelligence
            </span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200 font-medium">
              INTERNAL ONLY
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Reads all signal layers simultaneously and generates a strategic assessment with contradictions, blindspots, and ranked recommendations.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <span className="text-purple-300">✦</span>
          {generating ? "Generating…" : digest ? "Regenerate Digest" : "Generate Digest"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading placeholder */}
      {loading && !digest && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
          Loading…
        </div>
      )}

      {/* Empty state */}
      {!loading && !digest && !generating && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500 mb-1">No digest generated yet.</p>
          <p className="text-xs text-gray-400">Click Generate Digest to synthesise all signal layers into a strategic assessment.</p>
        </div>
      )}

      {/* Generating spinner */}
      {generating && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="animate-pulse text-sm text-gray-500">Reading all signal layers…</div>
        </div>
      )}

      {/* Digest output */}
      {digest && !generating && (
        <div className="space-y-5">

          {/* Overall Health + Top Action */}
          <div className="bg-gray-900 text-white rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">Overall Health</span>
              {healthBadge(digest.overall_health)}
              {digest.week_number && (
                <span className="text-xs text-gray-500">Week {digest.week_number}</span>
              )}
            </div>
            {digest.top_action && (
              <div className="border-t border-gray-700 pt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Top Action</p>
                <p className="text-base font-semibold text-white leading-snug">{digest.top_action}</p>
              </div>
            )}
          </div>

          {/* Narrative */}
          {digest.narrative && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Signal Narrative
              </h3>
              <div className="space-y-3">
                {digest.narrative.split(/\n\n+/).filter(Boolean).map((para, i) => (
                  <p key={i} className="text-sm text-gray-700 leading-relaxed">{para.trim()}</p>
                ))}
              </div>
            </div>
          )}

          {/* Contradictions */}
          {digest.contradictions.length > 0 && (
            <div className="bg-white border border-red-100 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-3">
                Signal Contradictions ({digest.contradictions.length})
              </h3>
              <div className="space-y-3">
                {digest.contradictions.map((c, i) => (
                  <div key={i} className="border border-red-100 rounded p-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {c.signal_a}
                      </span>
                      <span className="text-gray-400 text-xs">vs</span>
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {c.signal_b}
                      </span>
                      <span className="ml-auto">{severityBadge(c.severity)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blindspots */}
          {digest.blindspots.length > 0 && (
            <div className="bg-white border border-amber-100 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
                Blindspots ({digest.blindspots.length})
              </h3>
              <div className="space-y-3">
                {digest.blindspots.map((b, i) => (
                  <div key={i} className="border border-amber-100 rounded p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-amber-800">{b.area}</p>
                    <p className="text-sm text-gray-600">{b.description}</p>
                    {b.recommended_fix && (
                      <p className="text-xs text-gray-500 italic">Fix: {b.recommended_fix}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {digest.recommendations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Recommendations ({digest.recommendations.length})
              </h3>
              <div className="space-y-3">
                {digest.recommendations.map((r, i) => (
                  <div key={i} className="border border-gray-100 rounded p-3 space-y-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-400 flex-shrink-0 mt-0.5">#{i + 1}</span>
                      <p className="text-sm font-semibold text-gray-800 flex-1">{r.action}</p>
                    </div>
                    <p className="text-sm text-gray-600 pl-5">{r.rationale}</p>
                    <div className="flex items-center gap-2 flex-wrap pl-5">
                      {urgencyBadge(r.urgency)}
                      {confidenceBadge(r.confidence)}
                      {r.signal_source && (
                        <span className="text-xs text-gray-400">via {r.signal_source}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata footer */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400 pt-1">
            <span>{digest.signal_count} signals read</span>
            <span>·</span>
            <span>{digest.data_weeks} weeks of data</span>
            <span>·</span>
            <span>{digest.model_used}</span>
            <span>·</span>
            <span>Generated {formatDate(digest.generated_at)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
