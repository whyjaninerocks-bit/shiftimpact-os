"use client";

// SignalMovementSection — FRAME-aware Signal Movement Engine
// Shows per-signal diagnosis + 3-horizon movement plan
// Horizon 2 output can be piped directly into a new Stage Brief

import { useState } from "react";

interface Horizon1 {
  label: string;
  action: string;
  platform: string;
  mechanic: string;
  expected_movement: string;
}

interface Horizon2 {
  label: string;
  format: string;
  hook_direction: string;
  platform: string;
  mechanic: string;
  brief_body: string;
  department: string;
}

interface Horizon3 {
  label: string;
  issue: string;
  recommendation: string;
  flag: "STRUCTURAL_PROBLEM" | "NEXT_CAMPAIGN" | "PHASE_SHIFT" | null;
}

interface MovementSignal {
  signal_id: string;
  signal_label: string;
  status: "Amber" | "Red";
  weeks_stagnant: number;
  diagnosis: string;
  horizon_1: Horizon1;
  horizon_2: Horizon2;
  horizon_3: Horizon3;
}

interface MovementResult {
  all_green?: boolean;
  message?: string;
  signals: MovementSignal[];
  phase: number;
  phase_label: string;
  market_code: string;
  generated_at: string;
}

const STATUS_COLOUR: Record<string, string> = {
  Amber: "#b45309",
  Red:   "#b91c1c",
  Green: "#15803d",
};

const STATUS_BG: Record<string, string> = {
  Amber: "#fffbeb",
  Red:   "#fef2f2",
  Green: "#f0fdf4",
};

const FLAG_LABEL: Record<string, string> = {
  STRUCTURAL_PROBLEM: "⚠ Structural Problem",
  NEXT_CAMPAIGN:      "→ Next Campaign",
  PHASE_SHIFT:        "↗ Phase Shift Required",
};

const s = {
  section: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 24,
    marginTop: 24,
  } as React.CSSProperties,

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  } as React.CSSProperties,

  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  } as React.CSSProperties,

  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  } as React.CSSProperties,

  btn: {
    padding: "8px 18px",
    borderRadius: 7,
    border: "none",
    background: "#111827",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,

  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  } as React.CSSProperties,

  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    marginBottom: 20,
    overflow: "hidden",
  } as React.CSSProperties,

  cardHeader: {
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid #e5e7eb",
  } as React.CSSProperties,

  statusBadge: (status: string) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: STATUS_BG[status] ?? "#f3f4f6",
    color: STATUS_COLOUR[status] ?? "#374151",
    border: `1px solid ${STATUS_COLOUR[status] ?? "#d1d5db"}22`,
  } as React.CSSProperties),

  signalLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  } as React.CSSProperties,

  stuckLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginLeft: "auto",
  } as React.CSSProperties,

  cardBody: {
    padding: "14px 16px",
  } as React.CSSProperties,

  diagnosis: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 1.6,
    background: "#f9fafb",
    borderRadius: 6,
    padding: "10px 12px",
    marginBottom: 16,
    borderLeft: "3px solid #6b7280",
  } as React.CSSProperties,

  horizonTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#6b7280",
    marginBottom: 8,
    marginTop: 14,
  } as React.CSSProperties,

  horizonCard: (color: string) => ({
    border: `1px solid ${color}33`,
    background: `${color}08`,
    borderRadius: 8,
    padding: "12px 14px",
  } as React.CSSProperties),

  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9ca3af",
    marginBottom: 2,
    marginTop: 8,
  } as React.CSSProperties,

  fieldValue: {
    fontSize: 13,
    color: "#1f2937",
    lineHeight: 1.5,
  } as React.CSSProperties,

  briefBody: {
    fontSize: 13,
    color: "#1f2937",
    lineHeight: 1.6,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "10px 12px",
    marginTop: 8,
  } as React.CSSProperties,

  createBriefBtn: {
    marginTop: 12,
    padding: "7px 14px",
    borderRadius: 6,
    border: "1px solid #2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  } as React.CSSProperties,

  flagBadge: (flag: string) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: flag === "STRUCTURAL_PROBLEM" ? "#fef3c7" : "#f3f4f6",
    color: flag === "STRUCTURAL_PROBLEM" ? "#92400e" : "#374151",
    border: "1px solid " + (flag === "STRUCTURAL_PROBLEM" ? "#fcd34d" : "#d1d5db"),
    marginBottom: 8,
    marginRight: 6,
  } as React.CSSProperties),

  emptyState: {
    textAlign: "center" as const,
    padding: "32px 16px",
    color: "#6b7280",
    fontSize: 13,
  } as React.CSSProperties,

  allGreen: {
    textAlign: "center" as const,
    padding: "20px 16px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    color: "#15803d",
    fontSize: 13,
    fontWeight: 600,
  } as React.CSSProperties,

  meta: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 16,
  } as React.CSSProperties,
};

export default function SignalMovementSection({
  campaignId,
  weekNumber,
}: {
  campaignId: string;
  weekNumber: number;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MovementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingBrief, setCreatingBrief] = useState<string | null>(null);
  const [briefCreated, setBriefCreated] = useState<Set<string>>(new Set());

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/signal-movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, week_number: weekNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate movement plan.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function createStageBrief(signal: MovementSignal) {
    const key = signal.signal_id;
    setCreatingBrief(key);
    try {
      const h2 = signal.horizon_2;
      // Map campaign phase number to stage_briefs stage name
      const phaseToStage: Record<number, string> = {
        1: "Demand",
        2: "Nurture",
        3: "Conversion",
        4: "Retention",
      };
      const stage = phaseToStage[result?.phase ?? 2] ?? "Nurture";

      const res = await fetch("/api/signal-movement/stage-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          stage: stage,
          channel: h2.platform,
          department: h2.department,
          brief_body: `[Signal Movement Brief — ${signal.signal_label}]\n\nFormat: ${h2.format}\nHook: ${h2.hook_direction}\nMechanic: ${h2.mechanic}\n\n${h2.brief_body}`,
          propagation_mechanism: h2.mechanic,
          idea_led_vs_spend_led: "Idea-led",
        }),
      });
      if (res.ok) {
        setBriefCreated((prev) => new Set([...prev, key]));
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to create Stage Brief. Ensure FRAME Brief is Locked.");
      }
    } catch {
      alert("Network error creating Stage Brief.");
    } finally {
      setCreatingBrief(null);
    }
  }

  return (
    <div style={s.section}>
      <div style={s.header}>
        <div>
          <p style={s.title}>Signal Movement Engine</p>
          <p style={s.subtitle}>
            FRAME-aware movement plans for stagnant signals — Week {weekNumber}
          </p>
        </div>
        <button
          style={loading ? { ...s.btn, ...s.btnDisabled } : s.btn}
          onClick={generate}
          disabled={loading}
        >
          {loading ? "Generating…" : result ? "Regenerate Plan" : "Generate Movement Plan"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 14px", background: "#fef2f2", borderRadius: 8, color: "#b91c1c", fontSize: 13, border: "1px solid #fecaca" }}>
          {error}
        </div>
      )}

      {!result && !loading && !error && (
        <div style={s.emptyState}>
          Generate a FRAME-grounded movement plan for any signal below target this week.
          <br />
          AI reads your brief anchor, market context, and MDH data before recommending.
        </div>
      )}

      {result?.all_green && (
        <div style={s.allGreen}>
          ✓ {result.message}
        </div>
      )}

      {result && !result.all_green && result.signals?.length > 0 && (
        <>
          {result.signals.map((signal) => (
            <div key={signal.signal_id} style={s.card}>
              {/* Card header */}
              <div style={{ ...s.cardHeader, background: STATUS_BG[signal.status] ?? "#f9fafb" }}>
                <span style={s.statusBadge(signal.status)}>{signal.status}</span>
                <span style={s.signalLabel}>{signal.signal_label}</span>
                <span style={s.stuckLabel}>
                  {signal.weeks_stagnant > 0
                    ? `${signal.weeks_stagnant} week${signal.weeks_stagnant !== 1 ? "s" : ""} below target`
                    : "Below target this week"}
                </span>
              </div>

              <div style={s.cardBody}>
                {/* Diagnosis */}
                <p style={{ ...s.fieldLabel, marginTop: 0 }}>Diagnosis</p>
                <p style={s.diagnosis}>{signal.diagnosis}</p>

                {/* Horizon 1 */}
                <p style={s.horizonTitle}>H1 — Immediate (0-5 days, existing assets)</p>
                <div style={s.horizonCard("#6b7280")}>
                  <p style={{ ...s.fieldLabel, marginTop: 0 }}>Action</p>
                  <p style={s.fieldValue}>{signal.horizon_1.action}</p>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" as const }}>
                    <div>
                      <p style={s.fieldLabel}>Platform</p>
                      <p style={s.fieldValue}>{signal.horizon_1.platform}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={s.fieldLabel}>Mechanic</p>
                      <p style={s.fieldValue}>{signal.horizon_1.mechanic}</p>
                    </div>
                  </div>
                  <p style={s.fieldLabel}>Expected movement</p>
                  <p style={s.fieldValue}>{signal.horizon_1.expected_movement}</p>
                </div>

                {/* Horizon 2 */}
                <p style={s.horizonTitle}>H2 — Brief-Ready (6-14 days, new production)</p>
                <div style={s.horizonCard("#2563eb")}>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" as const }}>
                    <div>
                      <p style={{ ...s.fieldLabel, marginTop: 0 }}>Format</p>
                      <p style={s.fieldValue}>{signal.horizon_2.format}</p>
                    </div>
                    <div>
                      <p style={{ ...s.fieldLabel, marginTop: 0 }}>Platform</p>
                      <p style={s.fieldValue}>{signal.horizon_2.platform}</p>
                    </div>
                    <div>
                      <p style={{ ...s.fieldLabel, marginTop: 0 }}>Department</p>
                      <p style={s.fieldValue}>{signal.horizon_2.department}</p>
                    </div>
                  </div>
                  <p style={s.fieldLabel}>Hook direction</p>
                  <p style={s.fieldValue}>{signal.horizon_2.hook_direction}</p>
                  <p style={s.fieldLabel}>Creative brief</p>
                  <p style={s.briefBody}>{signal.horizon_2.brief_body}</p>

                  {briefCreated.has(signal.signal_id) ? (
                    <div style={{ marginTop: 12, fontSize: 12, color: "#15803d", fontWeight: 600 }}>
                      ✓ Stage Brief created — find it in the Stage Briefs tab
                    </div>
                  ) : (
                    <button
                      style={
                        creatingBrief === signal.signal_id
                          ? { ...s.createBriefBtn, opacity: 0.6, cursor: "not-allowed" }
                          : s.createBriefBtn
                      }
                      onClick={() => createStageBrief(signal)}
                      disabled={creatingBrief === signal.signal_id}
                    >
                      {creatingBrief === signal.signal_id ? "Creating…" : "+ Create Stage Brief"}
                    </button>
                  )}
                </div>

                {/* Horizon 3 */}
                <p style={s.horizonTitle}>H3 — Structural (15-30 days)</p>
                <div style={s.horizonCard("#7c3aed")}>
                  {signal.horizon_3.flag && (
                    <span style={s.flagBadge(signal.horizon_3.flag)}>
                      {FLAG_LABEL[signal.horizon_3.flag] ?? signal.horizon_3.flag}
                    </span>
                  )}
                  <p style={{ ...s.fieldLabel, marginTop: signal.horizon_3.flag ? 8 : 0 }}>Root issue</p>
                  <p style={s.fieldValue}>{signal.horizon_3.issue}</p>
                  <p style={s.fieldLabel}>Recommendation</p>
                  <p style={s.fieldValue}>{signal.horizon_3.recommendation}</p>
                </div>
              </div>
            </div>
          ))}

          <p style={s.meta}>
            Generated {new Date(result.generated_at).toLocaleString()} · Phase {result.phase}: {result.phase_label} · Market: {result.market_code}
          </p>
        </>
      )}
    </div>
  );
}
