"use client";

// CampaignReportSection.tsx
// F31 — Campaign Intelligence Report (Sprint 7)
// INTERNAL ONLY — strategy lead and Janine. Never rendered in Client Interface.
//
// Allows Janine to generate a full Campaign Intelligence Report from all stored
// component data. Shows two views:
//   INTERNAL: full structured intelligence (report_data sections + findings with confidence)
//   CLIENT EXPORT: executive summary + finding text only (confidence stripped)
//
// "Generate Report" → POST /api/campaign-report-generate (action: generate)
// "Export for Client" → copies or downloads client-safe text
// F33 findings appear in the findings section after "Save to CIR"

import { useState, useEffect, useCallback } from "react";

interface ReportData {
  signal_summary?: string;
  consumer_state_summary?: string;
  bms_summary?: string;
  risk_summary?: string;
  activation_summary?: string;
  attribution_summary?: string;
  generated_components?: {
    signal_weeks: number;
    consumer_state_weeks: number;
    bms_periods: number;
    attribution_records: number;
  };
}

interface Finding {
  query_id: string;
  headline: string;
  context: string;
  implication: string;
  recommendation: string;
  confidence: string;        // INTERNAL ONLY
  components_used: string[]; // INTERNAL ONLY
  scopes_resolved: string[]; // INTERNAL ONLY
  generated_at: string;
}

interface CampaignReport {
  id: string;
  report_label: string;
  executive_summary: string;
  report_data: ReportData;
  findings: Finding[];
  status: "draft" | "ready" | "exported";
  report_week: number;
  created_at: string;
  updated_at: string;
}

interface DataCoverage {
  signal_weeks: number;
  consumer_state_weeks: number;
  bms_periods: number;
  attribution_records: number;
}

const CONFIDENCE_BADGE: Record<string, string> = {
  High: "bg-green-100 text-green-800 border border-green-200",
  Directional: "bg-amber-100 text-amber-800 border border-amber-200",
  Speculative: "bg-red-100 text-red-800 border border-red-200",
};

const SECTION_LABELS: Record<keyof ReportData, string> = {
  signal_summary: "Signal & Delivery",
  consumer_state_summary: "Consumer Behaviour",
  bms_summary: "Brand Momentum",
  risk_summary: "Risk Posture",
  activation_summary: "Activation",
  attribution_summary: "Attribution & ROI",
  generated_components: "Coverage",
};

interface Props {
  campaignId: string;
  campaignName: string;
}

export function CampaignReportSection({ campaignId, campaignName }: Props) {
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [coverage, setCoverage] = useState<DataCoverage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"internal" | "client">("internal");
  const [copied, setCopied] = useState(false);
  const [showFindings, setShowFindings] = useState(true);

  const fetchLatestReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaign-report-generate?campaign_id=${campaignId}`);
      const { report: r } = await res.json();
      setReport(r ?? null);
    } catch {
      // No report yet — that's fine
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchLatestReport();
  }, [fetchLatestReport]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign-report-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, action: "generate" }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(msg ?? "Generation failed");
      }

      const data = await res.json();
      setCoverage(data.data_coverage);
      await fetchLatestReport();
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  function buildClientExportText(): string {
    if (!report) return "";
    const lines: string[] = [
      `CAMPAIGN INTELLIGENCE REPORT`,
      `${campaignName} — ${report.report_label}`,
      `Generated: ${new Date(report.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}`,
      "",
      "EXECUTIVE SUMMARY",
      "─".repeat(40),
      report.executive_summary,
    ];

    if (report.findings.length > 0) {
      lines.push("", "INTELLIGENCE FINDINGS", "─".repeat(40));
      report.findings.forEach((f, i) => {
        lines.push("", `Finding ${i + 1}`, f.headline, "", f.context, "", f.implication, "", `Recommendation: ${f.recommendation}`);
      });
    }

    lines.push("", "─".repeat(40), "Prepared by ShiftImpact OS — Confidential");
    return lines.join("\n");
  }

  function handleCopyClientExport() {
    navigator.clipboard.writeText(buildClientExportText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section id="campaign-report" className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Campaign Intelligence Report</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Full intelligence synthesis across all campaign components.{" "}
            <span className="font-medium text-amber-700">Internal — Janine only.</span>
          </p>
        </div>
        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded font-medium">
          F31
        </span>
      </div>

      {/* Generate + view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-5 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? "Generating…" : report ? "Regenerate Report" : "Generate Report"}
        </button>

        {report && (
          <>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setView("internal")}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  view === "internal"
                    ? "bg-blue-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Internal
              </button>
              <button
                onClick={() => setView("client")}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  view === "client"
                    ? "bg-blue-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Client view
              </button>
            </div>

            {view === "client" && (
              <button
                onClick={handleCopyClientExport}
                className="px-4 py-1.5 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? "Copied ✓" : "Copy for client"}
              </button>
            )}
          </>
        )}

        {generating && (
          <span className="text-sm text-gray-500 animate-pulse">
            Pulling components and synthesising…
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* No report yet */}
      {!loading && !report && !generating && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-gray-600">No report generated yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Enter signal data for at least 1 week, then generate a report.
          </p>
        </div>
      )}

      {/* Report — INTERNAL VIEW */}
      {report && view === "internal" && (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium text-gray-700">{report.report_label}</span>
            <span>
              Generated {new Date(report.created_at).toLocaleString("en-MY", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })}
            </span>
          </div>

          {/* Coverage bar */}
          {coverage && (
            <div className="flex gap-4 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-2">
              <span>Signal: <strong className="text-gray-800">{coverage.signal_weeks}w</strong></span>
              <span>Consumer: <strong className="text-gray-800">{coverage.consumer_state_weeks}w</strong></span>
              <span>BMS: <strong className="text-gray-800">{coverage.bms_periods} periods</strong></span>
              <span>Attribution: <strong className="text-gray-800">{coverage.attribution_records} records</strong></span>
            </div>
          )}

          {/* Report data sections */}
          <div className="grid grid-cols-1 gap-3">
            {(["signal_summary", "consumer_state_summary", "bms_summary",
               "risk_summary", "activation_summary", "attribution_summary"] as const).map((key) => {
              const text = report.report_data?.[key];
              if (!text) return null;
              return (
                <div key={key} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                    {SECTION_LABELS[key]}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                </div>
              );
            })}
          </div>

          {/* Findings from F33 */}
          {report.findings.length > 0 && (
            <div>
              <button
                onClick={() => setShowFindings(!showFindings)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3"
              >
                <span>{showFindings ? "▾" : "▸"}</span>
                <span>Intelligence Findings ({report.findings.length})</span>
                <span className="text-xs text-gray-400 font-normal">from Intelligence Query</span>
              </button>

              {showFindings && (
                <div className="space-y-3">
                  {report.findings.map((f, i) => (
                    <div key={f.query_id ?? i} className="rounded-xl border border-blue-900/15 bg-blue-50/40 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-900">Finding {i + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          CONFIDENCE_BADGE[f.confidence] ?? CONFIDENCE_BADGE["Directional"]
                        }`}>
                          {f.confidence} — INTERNAL
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(f.generated_at).toLocaleDateString("en-MY")}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{f.headline}</p>
                      {f.context && <p className="text-sm text-gray-700">{f.context}</p>}
                      {f.implication && <p className="text-sm text-gray-600 italic">{f.implication}</p>}
                      {f.recommendation && (
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Recommendation:</span> {f.recommendation}
                        </p>
                      )}
                      {f.components_used?.length > 0 && (
                        <p className="text-xs text-gray-400">
                          Components: {f.components_used.join(" · ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {report.findings.length === 0 && (
            <p className="text-xs text-gray-400">
              No findings yet. Use Intelligence Query → "Save to CIR" to append findings here.
            </p>
          )}
        </div>
      )}

      {/* Report — CLIENT VIEW */}
      {report && view === "client" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Campaign Intelligence Report — {campaignName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(report.created_at).toLocaleDateString("en-MY", {
                  day: "numeric", month: "long", year: "numeric"
                })}
              </p>
            </div>

            {report.executive_summary && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Executive Summary
                </p>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                  {report.executive_summary}
                </p>
              </div>
            )}

            {report.findings.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Intelligence Findings
                </p>
                {report.findings.map((f, i) => (
                  <div key={f.query_id ?? i} className="space-y-1.5">
                    <p className="text-sm font-semibold text-gray-900">{f.headline}</p>
                    {f.context && <p className="text-sm text-gray-700">{f.context}</p>}
                    {f.implication && <p className="text-sm text-gray-600">{f.implication}</p>}
                    {f.recommendation && (
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">Recommendation:</span> {f.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Prepared by ShiftImpact OS — Confidential
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
