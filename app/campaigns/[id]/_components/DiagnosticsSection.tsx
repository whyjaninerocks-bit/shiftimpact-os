import { Badge, Card, SectionTitle } from "@/app/_components/ui";
import type {
  CampaignOverview,
  FrameBrief,
  GateSignalLog,
  KillSwitch,
  PhaseGate,
  StageBrief,
  CampaignDashboard,
} from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function BarRow({ label, score, weight }: { label: string; score: number; weight: number }) {
  const pct = Math.round(score * 20); // score 1-5 → 0-100%
  const color = pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-44 text-neutral-600 shrink-0">{label} ({weight}%)</span>
      <div className="flex-1 bg-neutral-100 rounded h-2 overflow-hidden">
        <div className={`${color} h-2 rounded`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-right font-mono text-neutral-500">{pct}</span>
    </div>
  );
}

function RiskRow({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "red" | "neutral" }) {
  const toneClasses = { green: "text-emerald-700", amber: "text-amber-700", red: "text-red-700", neutral: "text-neutral-500" };
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-100 last:border-0 text-sm">
      <span className="text-neutral-600">{label}</span>
      <span className={`font-medium ${toneClasses[tone]}`}>{value}</span>
    </div>
  );
}

// ── budget weighting ──────────────────────────────────────────────────────────

function computeBudgetWeighting(
  phaseGates: PhaseGate[],
  signalLogs: GateSignalLog[],
): { gate: string; recommendation: string; tone: "green" | "amber" | "red" | "neutral" }[] {
  return phaseGates.map((gate) => {
    const gateLogs = signalLogs.filter((l) => l.gate_id === gate.id);
    const recentPasses = gateLogs.slice(0, 4).filter((l) => l.pass === true).length;
    const totalRecent = Math.min(gateLogs.length, 4);

    if (gate.gate_decision === "Open") {
      return { gate: gate.gate_type, recommendation: "Gate open — budget released", tone: "green" };
    }
    if (gate.gate_decision === "Stop") {
      return { gate: gate.gate_type, recommendation: "Gate stopped — hold all spend", tone: "red" };
    }
    if (totalRecent === 0) {
      return { gate: gate.gate_type, recommendation: "No signal data — log readings to enable recommendation", tone: "neutral" };
    }
    const passRate = recentPasses / totalRecent;
    if (passRate >= 0.75) {
      return { gate: gate.gate_type, recommendation: `${recentPasses}/${totalRecent} recent signals passing — hold for threshold hold period, then open`, tone: "amber" };
    }
    if (passRate >= 0.5) {
      return { gate: gate.gate_type, recommendation: `${recentPasses}/${totalRecent} recent signals passing — approaching threshold`, tone: "amber" };
    }
    return { gate: gate.gate_type, recommendation: `${recentPasses}/${totalRecent} recent signals passing — hold spend, review idea`, tone: "red" };
  });
}

// ── main component ────────────────────────────────────────────────────────────

export function DiagnosticsSection({
  campaign,
  frame,
  phaseGates,
  stageBriefs,
  killSwitches,
  signalLogs,
  dashboards,
}: {
  campaign: CampaignOverview;
  frame: FrameBrief;
  phaseGates: PhaseGate[];
  stageBriefs: StageBrief[];
  killSwitches: KillSwitch[];
  signalLogs: GateSignalLog[];
  dashboards: CampaignDashboard[];
}) {
  // ── ICS dimension breakdown ──
  const icsDimensions = [
    { label: "Cultural Fit", score: frame.ics_cultural_fit, weight: 20 },
    { label: "Business Alignment", score: frame.ics_business_alignment, weight: 20 },
    { label: "Audience Tension", score: frame.ics_audience_tension, weight: 20 },
    { label: "Executional Coherence", score: frame.ics_executional_coherence, weight: 15 },
    { label: "Measurability", score: frame.ics_measurability, weight: 15 },
    { label: "Scalability", score: frame.ics_scalability, weight: 10 },
  ];
  const weakestDimension = [...icsDimensions].sort((a, b) => a.score - b.score)[0];

  // ── idea integrity drift ──
  const totalBriefs = stageBriefs.length;
  const spendLedBriefs = stageBriefs.filter((b) => b.idea_led_vs_spend_led === "Spend-Led").length;
  const spendLedGates = phaseGates.filter((g) => g.idea_led_vs_spend_led === "Spend-Led").length;
  const driftScore = totalBriefs > 0 ? Math.round(((totalBriefs - spendLedBriefs) / totalBriefs) * 100) : 100;
  const driftTone: "green" | "amber" | "red" = driftScore >= 80 ? "green" : driftScore >= 60 ? "amber" : "red";

  // ── kill switch risk ──
  const ksTriggered = killSwitches.filter((k) => k.trigger_status === "Triggered").length;
  const ksMonitoring = killSwitches.filter((k) => k.trigger_status === "Monitoring").length;
  const ksTone: "green" | "amber" | "red" | "neutral" =
    ksTriggered > 0 ? "red" : ksMonitoring > 0 ? "amber" : "green";

  // ── confidence score velocity ──
  const recentDashboards = dashboards.slice(0, 4);
  let confidenceTrend = "No dashboard history";
  let confidenceTone: "green" | "amber" | "red" | "neutral" = "neutral";
  if (recentDashboards.length >= 2) {
    // We use campaign confidence_score as the current value;
    // dashboards don't store it directly, so we compare campaign vs a static message
    confidenceTrend = `Current: ${campaign.confidence_score} / 100`;
    confidenceTone = campaign.confidence_score >= 70 ? "green" : campaign.confidence_score >= 55 ? "amber" : "red";
  } else {
    confidenceTrend = `Current: ${campaign.confidence_score} / 100`;
    confidenceTone = campaign.confidence_score >= 70 ? "green" : campaign.confidence_score >= 55 ? "amber" : "red";
  }

  // ── gate hold duration ──
  const heldGates = phaseGates
    .filter((g) => g.gate_decision === "Hold" || g.gate_decision === "Pending")
    .map((g) => {
      const created = new Date(g.created_at);
      const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      return { name: g.gate_type, days, decision: g.gate_decision };
    });

  // ── signal pass rate ──
  const totalSignals = signalLogs.length;
  const passedSignals = signalLogs.filter((l) => l.pass === true).length;
  const signalPassRate = totalSignals > 0 ? Math.round((passedSignals / totalSignals) * 100) : null;
  const signalTone: "green" | "amber" | "red" | "neutral" =
    signalPassRate === null ? "neutral" : signalPassRate >= 70 ? "green" : signalPassRate >= 40 ? "amber" : "red";

  // ── budget weighting ──
  const budgetRecs = computeBudgetWeighting(phaseGates, signalLogs);

  return (
    <Card>
      <SectionTitle id="diagnostics">Campaign Diagnostics</SectionTitle>
      <p className="text-xs text-neutral-400 mb-4">
        Read-only health scorecard derived from all live campaign data. No new input required.
      </p>

      <div className="grid gap-4 md:grid-cols-2">

        {/* ICS Dimension Breakdown */}
        <div className="border border-neutral-100 rounded-md p-3">
          <p className="text-xs font-semibold text-neutral-700 mb-2">ICS Dimension Breakdown</p>
          <div className="space-y-1.5">
            {icsDimensions.map((d) => (
              <BarRow key={d.label} label={d.label} score={d.score} weight={d.weight} />
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Weakest dimension: <span className="font-medium text-amber-700">{weakestDimension.label}</span> — score {Math.round(weakestDimension.score * 20)}
          </p>
        </div>

        {/* Idea Health Snapshot */}
        <div className="border border-neutral-100 rounded-md p-3">
          <p className="text-xs font-semibold text-neutral-700 mb-2">Idea Health Snapshot</p>
          <RiskRow
            label="Confidence Score"
            value={confidenceTrend}
            tone={confidenceTone}
          />
          <RiskRow
            label={`Idea Integrity (${totalBriefs - spendLedBriefs}/${totalBriefs} briefs Idea-Led)`}
            value={`${driftScore}% clean`}
            tone={driftTone}
          />
          <RiskRow
            label={`Spend-Led Phase Gates`}
            value={spendLedGates > 0 ? `${spendLedGates} gate${spendLedGates > 1 ? "s" : ""} Spend-Led` : "None"}
            tone={spendLedGates > 0 ? "amber" : "green"}
          />
          <RiskRow
            label="Kill Switch Risk"
            value={
              ksTriggered > 0
                ? `${ksTriggered} triggered`
                : ksMonitoring > 0
                ? `${ksMonitoring} monitoring`
                : "All inactive"
            }
            tone={ksTone}
          />
          <RiskRow
            label={`Signal Pass Rate (${totalSignals} readings)`}
            value={signalPassRate !== null ? `${signalPassRate}% passing` : "No signal data yet"}
            tone={signalTone}
          />
        </div>

        {/* Gate Hold Status */}
        <div className="border border-neutral-100 rounded-md p-3">
          <p className="text-xs font-semibold text-neutral-700 mb-2">Gate Hold Duration</p>
          {heldGates.length === 0 ? (
            <p className="text-xs text-neutral-500">No gates currently on Hold or Pending.</p>
          ) : (
            <div className="space-y-1">
              {heldGates.map((g) => (
                <div key={g.name} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">{g.name}</span>
                  <span className={`font-medium ${g.days > 14 ? "text-red-700" : g.days > 7 ? "text-amber-700" : "text-neutral-600"}`}>
                    {g.days}d on {g.decision}
                    {g.days > 14 ? " ⚠ stalled" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          {heldGates.length > 0 && (
            <p className="mt-2 text-xs text-neutral-400">
              Gates held &gt;14 days without signal movement indicate idea or execution gap.
            </p>
          )}
        </div>

        {/* Budget Weighting Recommendation */}
        <div className="border border-neutral-100 rounded-md p-3">
          <p className="text-xs font-semibold text-neutral-700 mb-2">Budget Release Recommendation</p>
          <div className="space-y-2">
            {budgetRecs.map((rec) => {
              const toneClasses = {
                green: "bg-emerald-50 border-emerald-200 text-emerald-800",
                amber: "bg-amber-50 border-amber-200 text-amber-800",
                red: "bg-red-50 border-red-200 text-red-800",
                neutral: "bg-neutral-50 border-neutral-200 text-neutral-600",
              };
              return (
                <div key={rec.gate} className={`rounded border px-2 py-1.5 text-xs ${toneClasses[rec.tone]}`}>
                  <span className="font-semibold">{rec.gate}:</span> {rec.recommendation}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Based on recent signal log readings vs gate thresholds. Log more readings for higher accuracy.
          </p>
        </div>

      </div>

      {/* Diagnostics Summary */}
      <div className="mt-4 pt-3 border-t border-neutral-100">
        <p className="text-xs font-semibold text-neutral-700 mb-2">OS Diagnosis</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={frame.ics_threshold === "Advance" ? "green" : frame.ics_threshold === "Conditional" ? "amber" : "red"}>
            ICS: {frame.ics_threshold} ({frame.ics_weighted_total})
          </Badge>
          <Badge tone={driftTone}>Integrity: {driftScore}%</Badge>
          <Badge tone={ksTone}>
            Kill Switches: {ksTriggered > 0 ? `${ksTriggered} triggered` : ksMonitoring > 0 ? `${ksMonitoring} monitoring` : "clean"}
          </Badge>
          <Badge tone={signalTone}>
            Signals: {signalPassRate !== null ? `${signalPassRate}% pass` : "no data"}
          </Badge>
          <Badge tone={campaign.gate_signal_status === "On Track" ? "green" : campaign.gate_signal_status === "At Risk" ? "amber" : campaign.gate_signal_status === "Blocked" ? "red" : "neutral"}>
            {campaign.gate_signal_status}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
