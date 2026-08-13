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

interface BridgeEntry { question: string; count: number; }

interface GateFrictionEntry {
  stage: string;
  total: number;
  gaps: { gap: string; count: number; }[];
}

interface ProspectMatch {
  id: string;
  detected_at: string;
  trigger_reason: string;
  company_id: string;
  company_name: string;
  industry: string | null;
  status: string | null;
}

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
  bridgeLibrary: BridgeEntry[];
  gateFriction: GateFrictionEntry[];
  prospectMatches: ProspectMatch[];
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

  const { summary, postureBreakdown, stageBreakdown, signalGapBreakdown, decisionGapBreakdown, industryBreakdown, topSignalByIndustry, bridgeLibrary, gateFriction, prospectMatches, recent, weekly } = data;

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

  // ── Selling pitch synthesis ────────────────────────────────────────────────
  // Derived from the dominant pattern across sessions.
  // Usable in a meeting, cold email, or LinkedIn post.
  const sellingPitch = (() => {
    if (!summary.withSynthesis || summary.withSynthesis < 2) return null;
    const signalName = topSignal ? (SIGNAL_LABEL[topSignal.label] ?? topSignal.label) : "growth signals";
    const industryCtx = topIndustry ? ` in the ${topIndustry.label} category` : "";
    const stageLabel = topStage?.label ?? "growth";
    const gapLabel = topGap?.label ?? "Evidence";
    const postureLabel = topPosture?.label?.toUpperCase() ?? "HOLD";
    const postureCount = topPosture?.pct ?? 0;

    const pattern = `Across ${summary.withSynthesis} decision sessions${industryCtx}, ${postureCount}% resolve to ${postureLabel}. Not because the brand is failing — because the decision-maker cannot read the signal that controls the ${stageLabel} gate.`;

    const bottleneck = `The specific bottleneck is ${gapLabel.toLowerCase()} interpretation. ${signalName} is the most misread signal (${topSignal?.pct ?? 0}% of sessions). The data exists. The framework to read it under pressure does not.`;

    const angle = `ShiftImpact OS names the posture, locates the gate, and identifies the exact signal gap. ${postureLabel} stops being a feeling and becomes a diagnostic output — with a specific next move and a bridge question that unlocks the decision.`;

    return { pattern, bottleneck, angle };
  })();

  // ── Case study emerging ────────────────────────────────────────────────────
  // The most complete recent session: has posture, stage, signal gap, bridge question, decision text.
  const caseStudySession = recent.find(
    (r) => r.posture && r.campaign_stage && r.signal_gap_type && r.bridge_question && r.decision_text
  ) ?? null;

  // Sharper ICP sub-segment (Feature 1)
  // Derive the specific ICP archetype from the top posture + stage + signal combination.
  const topIndustry = industryBreakdown[0];
  const icpSubSegment = (() => {
    if (!topPosture || !topStage || !topSignal) return null;
    const industryLabel = topIndustry ? ` in ${topIndustry.label}` : "";
    const signalName = SIGNAL_LABEL[topSignal.label] ?? topSignal.label;
    return `Your ICP is not "a marketer${industryLabel}." It is a marketer${industryLabel} at the ${topStage.label} gate who cannot read ${signalName} signals and defaults to ${topPosture.label.toUpperCase()} when confidence drops.`;
  })();

  // Gate signal thresholds for friction context
  const GATE_THRESHOLDS: Record<string, string> = {
    Demand:     "S2 Save Rate ≥ 8%, S1 Search +40% vs benchmark",
    Conversion: "CVR ≥ 4%, abandonment rate < 25%",
    Retention:  "NPS ≥ 45, UGC volume 3× baseline",
    Scale:      "Multi-signal convergence across S1, S2, S3",
  };

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

        {/* Selling pitch synthesis */}
        {sellingPitch && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, color: "#10b981", letterSpacing: "0.12em", borderBottom: "0.5px solid #1f2937", paddingBottom: 8 }}>YOUR SELLING PITCH — DERIVED FROM LIVE SESSION PATTERNS</p>
            <div style={{ background: "#0a0f0a", border: "1px solid #10b981", borderRadius: 10, padding: "22px 26px" }}>
              <div style={{ marginBottom: 18 }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "#10b981", letterSpacing: "0.12em" }}>THE PATTERN</p>
                <p style={{ margin: 0, fontSize: 14, color: "#f9fafb", lineHeight: 1.75 }}>{sellingPitch.pattern}</p>
              </div>
              <div style={{ marginBottom: 18, paddingTop: 16, borderTop: "0.5px solid #1a2e1a" }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "#10b981", letterSpacing: "0.12em" }}>THE BOTTLENECK</p>
                <p style={{ margin: 0, fontSize: 14, color: "#f9fafb", lineHeight: 1.75 }}>{sellingPitch.bottleneck}</p>
              </div>
              <div style={{ paddingTop: 16, borderTop: "0.5px solid #1a2e1a" }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "#10b981", letterSpacing: "0.12em" }}>WHAT SHIFTIMPACT OS DOES</p>
                <p style={{ margin: 0, fontSize: 14, color: "#f9fafb", lineHeight: 1.75 }}>{sellingPitch.angle}</p>
              </div>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#374151" }}>
              This pitch refreshes live as sessions accumulate. Benchmarks are ShiftImpact methodology baselines — calibration from client campaign outcome data is on the sprint plan.
            </p>
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

        {/* Feature 1: Sharper ICP sub-segment */}
        {icpSubSegment && (
          <Section title="YOUR ACTUAL ICP — SHARPENED">
            <div style={{ background: "#0d1117", border: "0.5px solid #3b82f6", borderRadius: 10, padding: "20px 24px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#3b82f6", letterSpacing: "0.1em" }}>ICP SUB-SEGMENT · DERIVED FROM SESSION PATTERNS</p>
              <p style={{ margin: "0 0 14px", fontSize: 15, color: "#f9fafb", lineHeight: 1.75, fontStyle: "italic" }}>&ldquo;{icpSubSegment}&rdquo;</p>
              <p style={{ margin: 0, fontSize: 12, color: "#4b5563", lineHeight: 1.6 }}>
                This is the positioning precision your outreach should use. Not the broad category — the specific configuration of stage, signal, and posture that your sessions reveal. This is who is finding you right now.
              </p>
            </div>
          </Section>
        )}

        {/* Feature 2: Gate friction map */}
        {gateFriction.length > 0 && (
          <Section title="GATE FRICTION MAP — WHERE DECISIONS BREAK DOWN">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {gateFriction.map((entry) => (
                <div key={entry.stage} style={{ background: "#13151e", border: "0.5px solid #2d3148", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 500 }}>{entry.stage} gate</span>
                    <span style={{ fontSize: 11, color: "#374151" }}>{entry.total} session{entry.total !== 1 ? "s" : ""}</span>
                  </div>
                  {GATE_THRESHOLDS[entry.stage] && (
                    <p style={{ margin: "0 0 10px", fontSize: 10, color: "#374151", lineHeight: 1.5 }}>
                      Threshold: {GATE_THRESHOLDS[entry.stage]}
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {entry.gaps.slice(0, 3).map((g) => (
                      <div key={g.gap} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#10b981" }}>{g.gap} gap</span>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{g.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
              Where friction clusters around Evidence or Logic gaps at the same stage your signal threshold lives — that is your sharpest consulting entry point. The prospect cannot read the signal that controls the gate they are stuck behind.
            </p>
          </Section>
        )}

        {/* Feature 2: Bridge question library */}
        {bridgeLibrary.length > 0 && (
          <Section title="BRIDGE QUESTION LIBRARY — QUESTIONS THAT MOVE DECISIONS">
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#4b5563", lineHeight: 1.6 }}>
              These are the exact questions the OS generated to bridge each session from diagnosis to action. Recurring patterns reveal the consulting angles your ICP finds most useful.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bridgeLibrary.map((b, i) => (
                <div key={i} style={{ background: "#13151e", border: "0.5px solid #2d3148", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, color: "#374151", minWidth: 20, paddingTop: 2 }}>×{b.count}</span>
                  <p style={{ margin: 0, fontSize: 13, color: "#e5e7eb", lineHeight: 1.65, flex: 1 }}>{b.question}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Feature 3: Prospect matches from /decide sessions */}
        {prospectMatches.length > 0 && (
          <Section title="PROSPECT MATCHES — KNOWN COMPANIES IN YOUR /DECIDE SESSIONS">
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#4b5563", lineHeight: 1.6 }}>
              Email domains matched to tracked companies. These prospects engaged with the diagnostic — the highest-intent signal before a conversation.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prospectMatches.map((m) => (
                <div key={m.id} style={{ background: "#0d1117", border: "1px solid #10b981", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <a
                        href={`/prospects/${m.company_id}`}
                        style={{ fontSize: 14, color: "#10b981", fontWeight: 600, textDecoration: "none" }}
                      >
                        {m.company_name}
                      </a>
                      {m.industry && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>{m.industry}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {m.status && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#1e2235", color: "#9ca3af" }}>{m.status}</span>}
                      <span style={{ fontSize: 11, color: "#374151" }}>{new Date(m.detected_at).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{m.trigger_reason}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Case study emerging */}
        {caseStudySession && (
          <Section title="CASE STUDY EMERGING — THE STORY IN YOUR DATA">
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#4b5563", lineHeight: 1.65 }}>
              The most complete session in your data. This is what a ShiftImpact OS diagnostic looks like as a consulting case study — the decision they brought, what the OS read, and what it means for your pitch.
            </p>
            <div style={{ background: "#13151e", border: "0.5px solid #2d3148", borderRadius: 10, overflow: "hidden" }}>
              {/* Header bar */}
              <div style={{ background: "#1a1d2a", padding: "14px 20px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {caseStudySession.posture && (
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.08em", background: (POSTURE_COLOUR[caseStudySession.posture] ?? "#9ca3af") + "33", color: POSTURE_COLOUR[caseStudySession.posture] ?? "#9ca3af" }}>
                    {caseStudySession.posture.toUpperCase()}
                  </span>
                )}
                {caseStudySession.campaign_stage && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "#2d3148", color: "#9ca3af" }}>{caseStudySession.campaign_stage} gate</span>}
                {caseStudySession.signal_gap_type && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "#2d3148", color: "#f59e0b" }}>{SIGNAL_LABEL[caseStudySession.signal_gap_type] ?? caseStudySession.signal_gap_type}</span>}
                {caseStudySession.decision_gap_type && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "#2d3148", color: "#6b7280" }}>{caseStudySession.decision_gap_type} gap</span>}
                {caseStudySession.industry && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: "#2d3148", color: "#6b7280" }}>{caseStudySession.industry}</span>}
              </div>
              {/* Body */}
              <div style={{ padding: "20px 22px" }}>
                <div style={{ marginBottom: 18 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, color: "#4b5563", letterSpacing: "0.1em" }}>THE DECISION THEY BROUGHT</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#e5e7eb", lineHeight: 1.7, fontStyle: "italic" }}>&ldquo;{caseStudySession.decision_text}&rdquo;</p>
                </div>
                {caseStudySession.bridge_question && (
                  <div style={{ marginBottom: 18, paddingTop: 14, borderTop: "0.5px solid #1f2937" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 10, color: "#4b5563", letterSpacing: "0.1em" }}>THE BRIDGE QUESTION THE OS ASKED</p>
                    <p style={{ margin: 0, fontSize: 13, color: "#d1d5db", lineHeight: 1.7 }}>{caseStudySession.bridge_question}</p>
                  </div>
                )}
                <div style={{ paddingTop: 14, borderTop: "0.5px solid #1f2937" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 10, color: "#4b5563", letterSpacing: "0.1em" }}>WHAT THIS MEANS FOR YOUR PITCH</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", lineHeight: 1.7 }}>
                    A {caseStudySession.industry ?? "brand"} marketer brought a {caseStudySession.campaign_stage ?? "growth"} gate decision. The OS identified a{" "}
                    <span style={{ color: "#f59e0b" }}>{SIGNAL_LABEL[caseStudySession.signal_gap_type ?? ""] ?? caseStudySession.signal_gap_type ?? "signal"}</span>{" "}
                    reading gap — an {caseStudySession.decision_gap_type?.toLowerCase() ?? "evidence"} problem, not a strategy problem. The posture resolved to{" "}
                    <span style={{ color: POSTURE_COLOUR[caseStudySession.posture ?? ""] ?? "#9ca3af", fontWeight: 600 }}>{(caseStudySession.posture ?? "").toUpperCase()}</span>.
                    {" "}That is the ShiftImpact OS value in one session: precision language where there was stall.
                  </p>
                </div>
              </div>
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
