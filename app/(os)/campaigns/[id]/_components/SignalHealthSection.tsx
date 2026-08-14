"use client";
// SignalHealthSection.tsx
// F16B — Simplified Signal Health Model
//
// SPEC (PRD Addendum v2.2):
//   Three traffic lights: S0 (MDH), S1 (Share of Voice), S2 (Save Rate).
//   Each light shows status, confidence band, data weeks, and latest value.
//   Optional AI narrative button calls /api/signal-health to generate
//   a cross-signal synthesis with single top action.
//
// Confidence band per light:
//   High        4+ weeks, ≥2 signals, all agree
//   Medium      2-3 weeks data
//   Low         1 week only
//   Speculative no data
//
// ACCESS: INTERNAL ONLY.

import { useState, useMemo } from "react";
import { Badge, Card, SectionTitle } from "@/app/_components/ui";
import { computeConfidenceBand, confidenceTone, confidenceLabel } from "@/lib/confidence";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrafficLight = "Green" | "Amber" | "Red" | "No Data";
type ConfidenceBand = "High" | "Medium" | "Low" | "Speculative";

interface MdhRecord {
  week_number: number;
  mdh_status: "Green" | "Amber" | "Red" | null;
  avg_frequency: number | null;
  quarantine_active: boolean;
}

interface SignalReport {
  week_number: number;
  signal_1_actual_pct: number | null;
  signal_2_actual_pct: number | null;
}

interface SignalThreshold {
  signal_1_label: string;
  signal_1_threshold_pct: number;
  signal_1_amber_pct: number;
  signal_2_label: string;
  signal_2_threshold_pct: number;
  signal_2_amber_pct: number;
}

interface LightResult {
  status: TrafficLight;
  confidence: ConfidenceBand;
  dataWeeks: number;
  latestValue: string;
  label: string;
  sublabel: string;
}

interface AiNarrative {
  s0_narrative: string;
  s1_narrative: string;
  s2_narrative: string;
  combined_narrative: string;
  top_action: string;
}

interface Props {
  campaignId: string;
  mdhRecords: MdhRecord[];
  signalReports: SignalReport[];
  signalThreshold: SignalThreshold | null;
}

// ─── Computation ──────────────────────────────────────────────────────────────

function computeS0(records: MdhRecord[]): LightResult {
  const valid = records.filter((r) => r.mdh_status !== null);
  const latest = valid[0] ?? null;
  const dataWeeks = valid.length;

  const status: TrafficLight = !latest
    ? "No Data"
    : latest.mdh_status === "Green" ? "Green"
    : latest.mdh_status === "Amber"  ? "Amber" : "Red";

  const confidence = computeConfidenceBand({
    dataWeeks,
    signalCount: dataWeeks > 0 ? 1 : 0,
    agreement: latest?.quarantine_active ? "none" : "full",
  });

  const latestValue = latest?.avg_frequency
    ? `${latest.avg_frequency.toFixed(1)}x freq`
    : dataWeeks > 0 ? "No frequency data" : "";

  return {
    status,
    confidence,
    dataWeeks,
    latestValue,
    label: "S0 — Media Delivery",
    sublabel: latest?.quarantine_active ? "Quarantine active" : "MDH",
  };
}

function computeS1(
  reports: SignalReport[],
  threshold: SignalThreshold | null
): LightResult {
  const valid = reports.filter((r) => r.signal_1_actual_pct !== null);
  const latest = valid[0] ?? null;
  const dataWeeks = valid.length;

  let status: TrafficLight = "No Data";
  if (latest && threshold) {
    const v = latest.signal_1_actual_pct!;
    status = v >= threshold.signal_1_threshold_pct ? "Green"
           : v >= threshold.signal_1_amber_pct      ? "Amber" : "Red";
  }

  const confidence = computeConfidenceBand({
    dataWeeks,
    signalCount: dataWeeks > 0 ? 1 : 0,
  });

  const latestValue = latest?.signal_1_actual_pct != null
    ? `${latest.signal_1_actual_pct.toFixed(1)}%`
    : "";

  return {
    status,
    confidence,
    dataWeeks,
    latestValue,
    label: `S1 — ${threshold?.signal_1_label ?? "Share of Voice"}`,
    sublabel: threshold
      ? `Target: ${threshold.signal_1_threshold_pct}%`
      : "Set thresholds to activate",
  };
}

function computeS2(
  reports: SignalReport[],
  threshold: SignalThreshold | null
): LightResult {
  const valid = reports.filter((r) => r.signal_2_actual_pct !== null);
  const latest = valid[0] ?? null;
  const dataWeeks = valid.length;

  let status: TrafficLight = "No Data";
  if (latest && threshold) {
    const v = latest.signal_2_actual_pct!;
    status = v >= threshold.signal_2_threshold_pct ? "Green"
           : v >= threshold.signal_2_amber_pct      ? "Amber" : "Red";
  }

  const confidence = computeConfidenceBand({
    dataWeeks,
    signalCount: dataWeeks > 0 ? 1 : 0,
  });

  const latestValue = latest?.signal_2_actual_pct != null
    ? `${latest.signal_2_actual_pct.toFixed(1)}%`
    : "";

  return {
    status,
    confidence,
    dataWeeks,
    latestValue,
    label: `S2 — ${threshold?.signal_2_label ?? "Save Rate"}`,
    sublabel: threshold
      ? `Target: ${threshold.signal_2_threshold_pct}%`
      : "Set thresholds to activate",
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function lightDot(status: TrafficLight) {
  const cls =
    status === "Green" ? "bg-emerald-500" :
    status === "Amber" ? "bg-amber-400"   :
    status === "Red"   ? "bg-red-500"     : "bg-neutral-300";
  return <span className={`inline-block w-3 h-3 rounded-full ${cls} shrink-0`} />;
}

function lightBg(status: TrafficLight) {
  if (status === "Green") return "border-emerald-200 bg-emerald-50/40";
  if (status === "Amber") return "border-amber-200 bg-amber-50/40";
  if (status === "Red")   return "border-red-200 bg-red-50/40";
  return "border-neutral-200 bg-neutral-50";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SignalHealthSection({
  campaignId,
  mdhRecords,
  signalReports,
  signalThreshold,
}: Props) {
  const [narrative, setNarrative] = useState<AiNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const s0 = useMemo(() => computeS0(mdhRecords), [mdhRecords]);
  const s1 = useMemo(() => computeS1(signalReports, signalThreshold), [signalReports, signalThreshold]);
  const s2 = useMemo(() => computeS2(signalReports, signalThreshold), [signalReports, signalThreshold]);

  const lights: LightResult[] = [s0, s1, s2];
  const hasAnyData = lights.some((l) => l.dataWeeks > 0);

  // Overall campaign health = worst of the three
  const overallStatus: TrafficLight = lights.reduce<TrafficLight>((worst, l) => {
    if (l.status === "Red")                          return "Red";
    if (l.status === "Amber" && worst !== "Red")     return "Amber";
    if (l.status === "No Data" && worst === "No Data") return "No Data";
    if (worst === "No Data" && l.status !== "No Data") return l.status;
    return worst;
  }, "No Data");

  async function generateNarrative() {
    setLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/signal-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setNarrative(data as AiNarrative);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to generate narrative");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <SectionTitle id="signal-health">Signal Health</SectionTitle>
        <Badge tone="neutral">F16B ⚿</Badge>
        <Badge tone="neutral">Expert Arch ⚿</Badge>
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        Three-signal health snapshot: S0 Media Delivery, S1 Share of Voice, S2 Save Rate.
        Confidence band reflects data depth. INTERNAL ONLY.
      </p>

      {/* Overall status */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Campaign Signal Health
        </span>
        <div className="flex items-center gap-1.5">
          {lightDot(overallStatus)}
          <span className="text-sm font-semibold text-neutral-700">
            {overallStatus === "No Data" ? "No Data" : overallStatus}
          </span>
        </div>
        {!hasAnyData && (
          <span className="text-xs text-neutral-400">
            Enter MDH and Signal data to activate
          </span>
        )}
      </div>

      {/* Three lights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {lights.map((light) => (
          <div
            key={light.label}
            className={`rounded-lg border p-3 ${lightBg(light.status)}`}
          >
            <div className="flex items-start justify-between gap-1 mb-2">
              <div className="flex items-center gap-1.5">
                {lightDot(light.status)}
                <span className="text-xs font-semibold text-neutral-700">{light.label}</span>
              </div>
              <Badge tone={confidenceTone(light.confidence)} className="text-[9px] shrink-0">
                {light.confidence}
              </Badge>
            </div>

            <p className="text-[11px] text-neutral-500 mb-1.5">{light.sublabel}</p>

            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${
                light.status === "Green" ? "text-emerald-700" :
                light.status === "Amber" ? "text-amber-700"   :
                light.status === "Red"   ? "text-red-700"     : "text-neutral-400"
              }`}>
                {light.latestValue || (light.dataWeeks === 0 ? "No data" : light.status)}
              </span>
              <span className="text-[10px] text-neutral-400">
                {light.dataWeeks > 0 ? `${light.dataWeeks}w data` : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI narrative */}
      {!narrative && (
        <button
          onClick={generateNarrative}
          disabled={loading || !hasAnyData}
          className="text-xs text-neutral-500 border border-neutral-200 rounded px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Generating narrative…" : "Generate Signal Narrative ✦"}
        </button>
      )}

      {aiError && (
        <p className="text-xs text-red-500 mt-2">{aiError}</p>
      )}

      {narrative && (
        <div className="mt-4 space-y-3">
          {/* Per-signal narratives */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: "s0_narrative", label: "S0 MDH", val: narrative.s0_narrative },
              { key: "s1_narrative", label: "S1 SoV",  val: narrative.s1_narrative },
              { key: "s2_narrative", label: "S2 Save", val: narrative.s2_narrative },
            ].map(({ key, label, val }) => (
              <div key={key} className="rounded border border-neutral-100 bg-neutral-50 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  {label}
                </p>
                <p className="text-xs text-neutral-600">{val || "No narrative."}</p>
              </div>
            ))}
          </div>

          {/* Combined synthesis */}
          {narrative.combined_narrative && (
            <div className="rounded border border-neutral-200 bg-white px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Signal Synthesis
              </p>
              <p className="text-xs text-neutral-700">{narrative.combined_narrative}</p>
            </div>
          )}

          {/* Top action */}
          {narrative.top_action && (
            <div className="rounded bg-neutral-900 px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Top Action
              </p>
              <p className="text-sm font-semibold text-white">{narrative.top_action}</p>
            </div>
          )}

          <button
            onClick={generateNarrative}
            disabled={loading}
            className="text-[11px] text-neutral-400 hover:text-neutral-600 underline"
          >
            Regenerate
          </button>
        </div>
      )}
    </Card>
  );
}
