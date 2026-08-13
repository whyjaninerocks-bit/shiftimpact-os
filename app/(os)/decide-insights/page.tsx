"use client";
// app/(os)/decide-insights/page.tsx
// Internal decision intelligence dashboard — powered by /decide session data.
// Shows decision pattern analysis for consulting positioning + prospecting.

import { useEffect, useState } from "react";

interface Summary {
  total: number;
  withEmail: number;
  withSynthesis: number;
  emailed: number;
  emailConversionRate: number;
  synthesisCompletionRate: number;
  avgProbeCount: number | null;
}

interface Breakdown { label: string; count: number; pct: number; }

interface TopSignal { industry: string; topSignal: string; count: number; }

interface RecentSession {
  id: string;
  created_at: string;
  industry: string | null;
  brand_category: string | null;
  decision_text: string | null;
  posture: string | null;
  campaign_stage: string | null;
  signal_gap_type: string | null;
  decision_gap_type: string | null;
  bridge_question: string | null;
  probe_count: number | null;
  has_email: boolean;
  emailed: boolean;
}

interface WeeklyPoint { week: string; count: number; }

interface InsightsData {
  summary: Summary;
  weekly: WeeklyPoint[];
  postureBreakdown: Breakdown[];
  stageBreakdown: Breakdown[];
  signalGapBreakdown: Breakdown[];
  decisionGapBreakdown: Breakdown[];
  industryBreakdown: Breakdown[];
  topSignalByIndustry: TopSignal[];
  recent: RecentSession[];
}

const POSTURE_COLOUR: Record<string, string> = {
  press: "#10b981",
  hold: "#f59e0b",
  pivot: "#8b5cf6",
  stop: "#ef4444",
  investigate: "#3b82f6",
};

const SIGNAL_LABEL: Record<string, string> = {
  "S1-Share of Search": "S1 Share of Search",
  "S2-Save Rate": "S2 Save Rate",
  "S3-UGC": "S3 UGC",
  "S4-OOH": "S4 OOH",
  "Multi-signal": "Multi-signal",
};

function Bar({ pct, color = "#3b82f6" }: { pct: number; color?: string }) {
  return (
    <div style={{ background: "#1e2235", borderRadius: 3, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{ background: color, height: "100%", width: `${pct}%`, borderRadius: 3, transition: "width 0.4s ease" }} />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "#13151e", border: "0.5px solid #2d3148", borderRadius: 10, padding: "18px 20px" }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, color: "#4b5563", letterSpacing: "0.1em" }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 600, color: "#f9fafb", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <p style={{ margin: "0 0 16px", fontSize: 11, color: "#4b5563", letterSpacing: "0.12em", borderBottom: "0.5px solid #1f2937", paddingBottom: 8 }}>{title}</p>
      {children}
    </div>
  );
}

function BreakdownRow({ label, count, pct, color }: Breakdown & { color?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "#e5e7eb" }}>{label}</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{count} &nbsp;·&nbsp; {pct}%</span>
      </div>
      <Bar pct={pct} color={color ?? POSTURE_COLOUR[label?.toLowerCase()] ?? "#3b82f6"} />
    </div>
  );
}

export default function DecideInsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/decide-insights")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load insights."); setLoading(false); });
  }, []);

  const s: React.CSSProperties = { fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#f9fafb" };

  if (loading) return <div style={{ ...s, padding: 48, color: "#4b5563" }}>Loading decision intelligence...</div>;
  if (error || !data) return <div style={{ ...s, padding: 48, color: "#ef4444" }}>{error || "No data"}</div>;

  const { summary, postureBreakdown, stageBreakdown, signalGapBreakdown, decisionGapBreakdown, industryBreakdown, topSignalByIndustry, recent, weekly } = data;

  // Consulting signal: most common posture + most misread signal
  const topPosture = postureBreakdown[0];
  const topSignal = signalGapBreakdown[0];
  const topStage = stageBreakdown[0];
  const topGap = decisionGapBreakdown[0];

  const consultingRead = [
    topPosture && `${topPosture.pct}% of decisions are ${topPosture.label.toUpperCase()} — your ICP is not stuck on action, they are stuck on confidence.`,
    topSignal && `The most misread signal is ${SIGNAL_LABEL[topSignal.label] ?? topSignal.label} (${topSignal.pct}% of sessions) — this is your sharpest diagnostic hook.`,
    topStage && `Most decisions sit at the ${topStage.label} gate — that is where ShiftImpact OS earns its keep.`,
    topGap && `The dominant decision gap is ${topGap.label} — your consulting pitch should open on this gap, not on the solution.`,
  ].filter(Boolean);

  return (
    <div style={{ ...s, minHeight: "100vh", background: "#0f1117", padding: "40px 48px" }}>
      <div style={{ maxWidth: 900 }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#374151", letterSpacing: "0.1em" }}>SHIFTIMPACT OS</p>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: "#f9fafb" }}>Decision Intelligence</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Pattern analysis across all /decide sessions. Use this to shape consulting positioning, service design, and prospect targeting.</p>
        </div>

        {/* Consulting read */}
        {consultingRead.length > 0 && (
          <div style={{ background: "#13151e", border: "0.5px solid #2d3148", borderRadius: 10, padding: "20px 24px", marginBottom: 32 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, color: "#3b82f6", letterSpacing: "0.12em" }}>WHAT THIS TELLS YOU</p>
            {consultingRead.map((line, i) => (
              <p key={i} style={{ margin: "0 0 8px", fontSize: 14, color: "#e5e7eb", lineHeight: 1.7 }}>— {line}</p>
            ))}
          </div>
        )}

        {/* Summary stats */}
        <Section title="VOLUME">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 8 }}>
            <StatCard label="TOTAL SESSIONS" value={summary.total} />
            <StatCard label="EMAIL CAPTURED" value={summary.withEmail} sub={`${summary.emailConversionRate}% conversion`} />
            <StatCard label="FULL DIAGNOSTIC" value={summary.withSynthesis} sub={`${summary.synthesisCompletionRate}% completion`} />
            <StatCard label="REPORTS SENT" value={summary.emailed} />
            {summary.avgProbeCount !== null && (
              <StatCard label="AVG PROBES" value={summary.avgProbeCount} sub="context depth" />
            )}
          </div>
        </Section>

        {/* Weekly volume */}
        {weekly.length > 0 && (
          <Section title="WEEKLY SESSIONS">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
              {weekly.map((w) => {
                const max = Math.max(...weekly.map((x) => x.count), 1);
                const h = Math.max(Math.round((w.count / max) * 70), 4);
                return (
                  <div key={w.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", height: h, background: "#3b82f6", borderRadius: "3px 3px 0 0", opacity: 0.8 }} title={`${w.count} sessions`} />
                    <span style={{ fontSize: 9, color: "#374151", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{w.week.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

          {/* Risk posture breakdown */}
          <Section title="RISK POSTURE DISTRIBUTION">
            {postureBreakdown.map((b) => (
              <BreakdownRow key={b.label} {...b} />
            ))}
          </Section>

          {/* Campaign stage */}
          <Section title="CAMPAIGN STAGE">
            {stageBreakdown.length > 0 ? stageBreakdown.map((b) => (
              <BreakdownRow key={b.label} {...b} color="#8b5cf6" />
            )) : <p style={{ fontSize: 13, color: "#4b5563" }}>No data yet</p>}
          </Section>

          {/* Signal gap */}
          <Section title="MOST MISREAD SIGNAL">
            {signalGapBreakdown.length > 0 ? signalGapBreakdown.map((b) => (
              <BreakdownRow key={b.label} {...b} color="#f59e0b" label={SIGNAL_LABEL[b.label] ?? b.label} />
            )) : <p style={{ fontSize: 13, color: "#4b5563" }}>No data yet</p>}
          </Section>

          {/* Decision gap */}
          <Section title="DECISION GAP TYPE">
            {decisionGapBreakdown.length > 0 ? decisionGapBreakdown.map((b) => (
              <BreakdownRow key={b.label} {...b} color="#10b981" />
            )) : <p style={{ fontSize: 13, color: "#4b5563" }}>No data yet</p>}
          </Section>

        </div>

        {/* Industry breakdown */}
        <Section title="INDUSTRY BREAKDOWN">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {industryBreakdown.length > 0 ? industryBreakdown.map((b) => (
              <BreakdownRow key={b.label} {...b} color="#6366f1" />
            )) : <p style={{ fontSize: 13, color: "#4b5563" }}>No data yet — industry data captured after benchmark step</p>}
          </div>
        </Section>

        {/* Top signal by industry */}
        {topSignalByIndustry.length > 0 && (
          <Section title="PRIMARY SIGNAL GAP BY INDUSTRY — PROSPECTING TARGETING">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {topSignalByIndustry.map((r) => (
                <div key={r.industry} style={{ background: "#13151e", border: "0.5px solid #2d3148", borderRadius: 8, padding: "14px 16px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>{r.industry}</p>
                  <p style={{ margin: "0 0 2px", fontSize: 14, color: "#f59e0b", fontWeight: 500 }}>{SIGNAL_LABEL[r.topSignal] ?? r.topSignal}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#374151" }}>{r.count} session{r.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Recent sessions */}
        <Section title="RECENT SESSIONS">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recent.length === 0 && <p style={{ fontSize: 13, color: "#4b5563" }}>No sessions yet.</p>}
            {recent.map((r) => (
              <div key={r.id} style={{ background: "#13151e", border: "0.5px solid #2d3148", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {r.posture && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600, letterSpacing: "0.06em", background: POSTURE_COLOUR[r.posture] + "22", color: POSTURE_COLOUR[r.posture] ?? "#9ca3af" }}>
                      {r.posture.toUpperCase()}
                    </span>
                  )}
                  {r.campaign_stage && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#1e2235", color: "#9ca3af" }}>{r.campaign_stage}</span>}
                  {r.signal_gap_type && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#1e2235", color: "#f59e0b" }}>{SIGNAL_LABEL[r.signal_gap_type] ?? r.signal_gap_type}</span>}
                  {r.decision_gap_type && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#1e2235", color: "#6b7280" }}>{r.decision_gap_type} gap</span>}
                  {r.industry && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#1e2235", color: "#6b7280" }}>{r.industry}</span>}
                  {r.brand_category && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#1e2235", color: "#6b7280" }}>{r.brand_category}</span>}
                  <span style={{ fontSize: 10, color: "#374151", marginLeft: "auto" }}>{new Date(r.created_at).toLocaleDateString("en-GB")}</span>
                </div>
                {r.decision_text && (
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "#9ca3af", lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{r.decision_text}&rdquo;</p>
                )}
                {r.bridge_question && (
                  <p style={{ margin: 0, fontSize: 12, color: "#4b5563", lineHeight: 1.55 }}>
                    <span style={{ color: "#374151" }}>Bridge: </span>{r.bridge_question}
                  </p>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                  {r.probe_count !== null && <span style={{ fontSize: 11, color: "#374151" }}>{r.probe_count} probe{r.probe_count !== 1 ? "s" : ""}</span>}
                  <span style={{ fontSize: 11, color: r.has_email ? "#10b981" : "#374151" }}>{r.has_email ? "Email captured" : "No email"}</span>
                  <span style={{ fontSize: 11, color: r.emailed ? "#10b981" : "#374151" }}>{r.emailed ? "Report sent" : "Not sent"}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}
