"use client";

// Feature 12 — Signal Intelligence Reporting Module (Sprint 2)
// Sprint 24 — Signal 2B (Share Rate) + Gate Signal Convergence Module
// Internal only. Not shown to clients.
//
// Two panels:
// 1. Threshold Setup — set & lock pre-committed thresholds before campaign launch
// 2. Weekly Signal Entry — log actuals, trigger AI inference, view traffic lights + narrative

import { useState, useTransition } from "react";
import {
  upsertSignalThresholds,
  lockSignalThresholds,
  saveWeeklySignalInputs,
} from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import type { SignalThreshold, SignalWeeklyReport, SignalHealth } from "@/lib/types";

// ─── Traffic Light ────────────────────────────────────────────────────────────

const HEALTH_STYLE: Record<SignalHealth, { bg: string; text: string; dot: string; label: string }> = {
  Green: { bg: "bg-emerald-50",  text: "text-emerald-800", dot: "bg-emerald-500", label: "Green"  },
  Amber: { bg: "bg-amber-50",   text: "text-amber-800",   dot: "bg-amber-400",   label: "Amber"  },
  Red:   { bg: "bg-red-50",     text: "text-red-800",     dot: "bg-red-500",     label: "Red"    },
};

function TrafficLight({
  stage,
  health,
  signal,
}: {
  stage: "Demand" | "Nurture" | "Conversion";
  health: SignalHealth;
  signal: string;
}) {
  const s = HEALTH_STYLE[health];
  return (
    <div className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border ${s.bg} ${
      health === "Green" ? "border-emerald-200" : health === "Amber" ? "border-amber-200" : "border-red-200"
    }`}>
      {/* Traffic light circles */}
      <div className="flex flex-col gap-1">
        {(["Red", "Amber", "Green"] as SignalHealth[]).map((h) => (
          <div
            key={h}
            className={`w-5 h-5 rounded-full transition-all ${
              health === h ? HEALTH_STYLE[h].dot : "bg-neutral-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-bold ${s.text}`}>{stage}</p>
      <p className="text-xs text-neutral-400 text-center leading-tight">{signal}</p>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text} border ${
        health === "Green" ? "border-emerald-300" : health === "Amber" ? "border-amber-300" : "border-red-300"
      }`}>
        {s.label}
      </span>
    </div>
  );
}


// ─── Gate Signal Badge ────────────────────────────────────────────────────────

const GATE_STYLE: Record<string, { bg: string; border: string; text: string; icon: string; label: string }> = {
  Green: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", icon: "⚡", label: "Gate Open"   },
  Amber: { bg: "bg-amber-50",   border: "border-amber-300",   text: "text-amber-800",   icon: "⏸", label: "Gate Watch"  },
  Red:   { bg: "bg-red-50",     border: "border-red-300",     text: "text-red-800",     icon: "🔴", label: "Gate Closed" },
};

function GateBadge({
  gateStatus,
  gateNote,
  gateSignalsConverging,
  flagsSuppressed,
}: {
  gateStatus: string;
  gateNote: string;
  gateSignalsConverging: number;
  flagsSuppressed: boolean;
}) {
  if (flagsSuppressed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-400">
        <span>⏳</span>
        <span>Gate inactive — baseline phase. Gate assessment begins in Phase 2.</span>
      </div>
    );
  }

  const s = GATE_STYLE[gateStatus] ?? GATE_STYLE["Red"];
  return (
    <div className={`rounded-lg border ${s.bg} ${s.border} px-3 py-2.5 space-y-1`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{s.icon}</span>
        <span className={`text-xs font-bold ${s.text}`}>
          {s.label}
        </span>
        {gateStatus === "Green" && gateSignalsConverging > 0 && (
          <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
            {gateSignalsConverging} signal{gateSignalsConverging !== 1 ? "s" : ""} converging
          </span>
        )}
        {gateStatus === "Amber" && gateSignalsConverging > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
            {gateSignalsConverging} at Green
          </span>
        )}
        {gateStatus === "Green" && (
          <span className="ml-auto text-xs bg-emerald-700 text-white px-2 py-0.5 rounded font-semibold">
            Budget release eligible
          </span>
        )}
        {gateStatus !== "Green" && (
          <span className="ml-auto text-xs text-neutral-400 font-medium">Budget hold</span>
        )}
      </div>
      {gateNote && (
        <p className={`text-xs ${s.text} opacity-80 leading-snug`}>{gateNote}</p>
      )}
    </div>
  );
}

// ─── Phase Progress Bar ───────────────────────────────────────────────────────

function PhaseBar({ weekNumber, durationWeeks, phase }: { weekNumber: number; durationWeeks: number; phase: number }) {
  const pct = Math.round((weekNumber / durationWeeks) * 100);
  const phaseLabels = ["Baseline", "Emergence", "Diagnostic", "Optimisation"];
  const phaseColor = ["bg-neutral-300", "bg-blue-400", "bg-amber-400", "bg-emerald-500"];
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-500">
        <span>Week {weekNumber} of {durationWeeks}</span>
        <span>Phase {phase} — {phaseLabels[phase - 1]} ({pct}%)</span>
      </div>
      <div className="w-full bg-neutral-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${phaseColor[phase - 1]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex text-xs text-neutral-300">
        <span className="w-1/4 text-center">P1 (0–25%)</span>
        <span className="w-[35%] text-center">P2 (25–60%)</span>
        <span className="w-[20%] text-center">P3 (60–80%)</span>
        <span className="w-[20%] text-center">P4 (80–100%)</span>
      </div>
    </div>
  );
}

// ─── Threshold Setup Panel ────────────────────────────────────────────────────

function ThresholdSetupPanel({
  campaignId,
  threshold,
}: {
  campaignId: string;
  threshold: SignalThreshold | null;
}) {
  const [isPending, startTransition] = useTransition();
  const locked = threshold?.locked ?? false;
  const upsertAction = upsertSignalThresholds.bind(null, campaignId);

  const DURATIONS = [
    { value: 8, label: "8 weeks (Short-form: seasonal, activation, festive burst)" },
    { value: 12, label: "12 weeks (Mid-form: brand refresh, product launch, GTM)" },
    { value: 26, label: "6 months / 26 weeks (Sustained brand build, market entry)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
          Your Signal Targets
        </p>
        {locked && (
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
            ⚿ Locked
          </span>
        )}
        {!locked && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
            Not locked yet — lock before going live
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-400">
        Set your targets before the campaign launches. Once locked, they can't be changed — this keeps everyone honest about what success looks like.
      </p>

      <form action={upsertAction} className="space-y-5">
        {/* Campaign Duration */}
        <div>
          <label className={labelClass}>Campaign Duration</label>
          <select
            name="campaign_duration_weeks"
            className={inputClass}
            defaultValue={threshold?.campaign_duration_weeks ?? 12}
            disabled={locked}
            required
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-400 mt-1">
            Sets the 4 campaign phases and when health alerts kick in.
          </p>
        </div>

        {/* Signal 1 — Branded Search Lift */}
        <div className="border border-blue-100 rounded-md p-3 bg-blue-50/30">
          <p className="text-xs font-semibold text-blue-800 mb-2">
            Signal 1 — Branded Search Lift (Conversion)
          </p>
          <p className="text-xs text-blue-600 mb-3">
            From Google Search Console. Tracks how many more people are searching for your brand compared to last period — a sign the campaign is driving real purchase intent.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Green threshold (%)</label>
              <input
                type="number" name="signal_1_threshold_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_1_threshold_pct ?? 20} disabled={locked} required
              />
              <p className="text-xs text-neutral-400 mt-0.5">Lift % = Green</p>
            </div>
            <div>
              <label className={labelClass}>Amber threshold (%)</label>
              <input
                type="number" name="signal_1_amber_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_1_amber_pct ?? 10} disabled={locked} required
              />
              <p className="text-xs text-neutral-400 mt-0.5">Lift % = Amber</p>
            </div>
            <div>
              <label className={labelClass}>Red threshold (%)</label>
              <input
                type="number" name="signal_1_red_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_1_red_pct ?? 0} disabled={locked} required
              />
              <p className="text-xs text-neutral-400 mt-0.5">At/below = Red</p>
            </div>
          </div>
        </div>

        {/* Signal 2 — Content Save Rate */}
        <div className="border border-purple-100 rounded-md p-3 bg-purple-50/30">
          <p className="text-xs font-semibold text-purple-800 mb-2">
            Signal 2 — Content Save Rate (Nurture)
          </p>
          <p className="text-xs text-purple-600 mb-3">
            From Meta and TikTok. When people save your content, they're saying "I'll come back to this" — a strong sign of genuine interest.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Green threshold (%)</label>
              <input
                type="number" name="signal_2_threshold_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_2_threshold_pct ?? 8} disabled={locked} required
              />
            </div>
            <div>
              <label className={labelClass}>Amber threshold (%)</label>
              <input
                type="number" name="signal_2_amber_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_2_amber_pct ?? 4} disabled={locked} required
              />
            </div>
            <div>
              <label className={labelClass}>Red threshold (%)</label>
              <input
                type="number" name="signal_2_red_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_2_red_pct ?? 2} disabled={locked} required
              />
            </div>
          </div>
        </div>

        {/* Signal 2B — Share Rate */}
        <div className="border border-rose-100 rounded-md p-3 bg-rose-50/30">
          <p className="text-xs font-semibold text-rose-800 mb-2">
            Signal 2B — TikTok Share Rate (Advocacy)
          </p>
          <p className="text-xs text-rose-600 mb-3">
            When people share your content, they&apos;re actively vouching for it to their network. Share rate is a stronger social-proof signal than saves — it means your brand is spreading through trusted peer relationships, not just bookmarked intent.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Green threshold (%)</label>
              <input
                type="number" name="signal_2b_target_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_2b_target_pct ?? 5} disabled={locked} required
              />
              <p className="text-xs text-neutral-400 mt-0.5">Share rate % = Green</p>
            </div>
            <div>
              <label className={labelClass}>Amber threshold (%)</label>
              <input
                type="number" name="signal_2b_amber_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_2b_amber_pct ?? 3} disabled={locked} required
              />
              <p className="text-xs text-neutral-400 mt-0.5">Approaching = Amber</p>
            </div>
            <div>
              <label className={labelClass}>Red threshold (%)</label>
              <input
                type="number" name="signal_2b_red_pct" className={inputClass} step="0.1"
                defaultValue={threshold?.signal_2b_red_pct ?? 1} disabled={locked} required
              />
              <p className="text-xs text-neutral-400 mt-0.5">At/below = Red</p>
            </div>
          </div>
        </div>

        {/* Signal 3 — UGC Volume via Apify */}
        <div className="border border-emerald-100 rounded-md p-3 bg-emerald-50/30">
          <p className="text-xs font-semibold text-emerald-800 mb-2">
            Signal 3 — Organic Posts About Your Brand (Demand)
          </p>
          <p className="text-xs text-emerald-600 mb-3">
            Tracked via social listening (TikTok, Instagram, X). Counts unprompted posts and mentions — organic buzz your campaign is generating.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Green threshold (posts/wk)</label>
              <input
                type="number" name="signal_3_threshold_count" className={inputClass}
                defaultValue={threshold?.signal_3_threshold_count ?? 100} disabled={locked} required
              />
            </div>
            <div>
              <label className={labelClass}>Amber threshold (posts/wk)</label>
              <input
                type="number" name="signal_3_amber_count" className={inputClass}
                defaultValue={threshold?.signal_3_amber_count ?? 50} disabled={locked} required
              />
            </div>
            <div>
              <label className={labelClass}>Red threshold (posts/wk)</label>
              <input
                type="number" name="signal_3_red_count" className={inputClass}
                defaultValue={threshold?.signal_3_red_count ?? 20} disabled={locked} required
              />
            </div>
          </div>
        </div>

        {!locked && (
          <div className="flex items-center gap-3">
            <button type="submit" className={buttonSecondaryClass} disabled={isPending}>
              Save Thresholds
            </button>
          </div>
        )}
      </form>

      {/* Lock button */}
      {!locked && threshold && (
        <form action={lockSignalThresholds.bind(null, threshold.id, campaignId)}>
          <div className="flex items-center gap-3 pt-3 border-t border-neutral-100">
            <button type="submit" className={buttonClass}>
              ⚿ Lock Targets Before Launch
            </button>
            <p className="text-xs text-neutral-400">
              Once locked, targets can't be changed. This is intentional.
            </p>
          </div>
        </form>
      )}

      {locked && threshold?.locked_at && (
        <p className="text-xs text-neutral-400">
          Locked {new Date(threshold.locked_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

// ─── Weekly Signal Entry + Report ────────────────────────────────────────────

function WeeklySignalPanel({
  campaignId,
  threshold,
  reports,
}: {
  campaignId: string;
  threshold: SignalThreshold;
  reports: SignalWeeklyReport[];
}) {
  const [isPending, startTransition] = useTransition();
  const [activeWeek, setActiveWeek] = useState<SignalWeeklyReport | null>(
    reports.length > 0 ? reports[0] : null
  );
  const [runningAI, setRunningAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const saveAction = saveWeeklySignalInputs.bind(null, campaignId);

  const latestWeek = reports.length > 0 ? reports[0].week_number : 0;
  const nextWeek = latestWeek + 1;

  // Call AI signal report after saving inputs
  async function handleSubmitAndRunAI(formData: FormData) {
    startTransition(async () => {
      // Save inputs via server action first
      await saveAction(formData);
      // Then call AI inference
      setRunningAI(true);
      setAiError(null);
      try {
        const res = await fetch("/api/signal-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaign_id: campaignId,
            week_number: Number(formData.get("week_number")),
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          setAiError(errData.error ?? "AI inference failed");
        }
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "Network error");
      } finally {
        setRunningAI(false);
      }
    });
  }

  const actions: string[] = activeWeek
    ? (() => {
        try {
          return JSON.parse(activeWeek.ai_recommended_actions);
        } catch {
          return activeWeek.ai_recommended_actions
            ? activeWeek.ai_recommended_actions.split("\n").filter(Boolean)
            : [];
        }
      })()
    : [];

  return (
    <div className="space-y-6">
      {/* ── Log new week ── */}
      <div>
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          Log Week {nextWeek} Signal Data
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitAndRunAI(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="week_number" value={nextWeek} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Week of (date)</label>
              <input
                type="date"
                name="week_of"
                className={inputClass}
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Signal 2 — Save Rate (%)</label>
              <input
                type="number" name="signal_2_actual_pct" className={inputClass}
                step="0.1" placeholder={`Target ≥${threshold.signal_2_threshold_pct}%`}
              />
              <p className="text-xs text-purple-600 mt-0.5">Nurture — content save rate</p>
            </div>
            <div>
              <label className={labelClass}>Signal 2B — TikTok Share Rate (%)</label>
              <input
                type="number" name="signal_2b_actual_pct" className={inputClass}
                step="0.1" placeholder={`Target ≥${threshold.signal_2b_target_pct ?? 5}%`}
              />
              <p className="text-xs text-rose-600 mt-0.5">Nurture — share rate (advocacy)</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Signal 3 — UGC Posts (count)</label>
              <input
                type="number" name="signal_3_actual_count" className={inputClass}
                placeholder={`Target ≥${threshold.signal_3_threshold_count} posts`}
              />
              <p className="text-xs text-emerald-600 mt-0.5">Demand — organic brand mentions</p>
            </div>
            <div>
              <label className={labelClass}>Signal 1 — Search Lift (%)</label>
              <input
                type="number" name="signal_1_actual_pct" className={inputClass}
                step="0.1" placeholder={`Target ≥${threshold.signal_1_threshold_pct}%`}
              />
              <p className="text-xs text-blue-600 mt-0.5">Conversion — branded search lift (SoS)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className={buttonClass}
              disabled={isPending || runningAI}
            >
              {runningAI ? "Generating report…" : isPending ? "Saving…" : "Save & Run Signal Report"}
            </button>
            <p className="text-xs text-neutral-400">
              Saves your numbers and runs an AI health check on the campaign
            </p>
          </div>
          {aiError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              Couldn't generate report: {aiError}
            </p>
          )}
        </form>
      </div>

      {/* ── Historical reports ── */}
      {reports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
              Weekly Reports
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveWeek(r)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    activeWeek?.id === r.id
                      ? "bg-neutral-800 text-white border-neutral-800"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  W{r.week_number}
                </button>
              ))}
            </div>
          </div>

          {activeWeek && (
            <div className="space-y-4">
              {/* Phase bar */}
              <PhaseBar
                weekNumber={activeWeek.week_number}
                durationWeeks={threshold.campaign_duration_weeks}
                phase={activeWeek.campaign_phase}
              />

              {/* Pipeline Risk alert */}
              {activeWeek.pipeline_risk_detected && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <span className="text-red-600 font-bold text-sm shrink-0">⚠</span>
                  <div>
                    <p className="text-xs font-semibold text-red-800">Pipeline Risk Detected</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      Conversion is performing but Demand/Nurture are not being replenished.
                      Current audience is being drawn down. Expect a post-campaign sales cliff
                      in 8–12 weeks if not addressed now.
                    </p>
                  </div>
                </div>
              )}

              {/* Gate Signal Status — primary decision indicator */}
              <GateBadge
                gateStatus={activeWeek.gate_status ?? "Red"}
                gateNote={activeWeek.gate_note ?? ""}
                gateSignalsConverging={activeWeek.gate_signals_converging ?? 0}
                flagsSuppressed={activeWeek.flags_suppressed}
              />

              {/* Traffic lights */}
              {activeWeek.flags_suppressed ? (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md text-xs text-neutral-500">
                  Still in the early phase — building a baseline. No alerts yet. Check back next week.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <TrafficLight
                    stage="Demand"
                    health={activeWeek.demand_health as SignalHealth}
                    signal="Signal 3 (UGC)"
                  />
                  <TrafficLight
                    stage="Nurture"
                    health={activeWeek.nurture_health as SignalHealth}
                    signal="Signal 2 (Save Rate)"
                  />
                  <TrafficLight
                    stage="Nurture"
                    health={(activeWeek.signal_2b_health ?? "Green") as SignalHealth}
                    signal="Signal 2B (Share Rate)"
                  />
                  <TrafficLight
                    stage="Conversion"
                    health={activeWeek.conversion_health as SignalHealth}
                    signal="Signal 1 (Search Lift)"
                  />
                </div>
              )}

              {/* AI narrative */}
              {activeWeek.ai_narrative && (
                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                    <p className="text-xs font-semibold text-neutral-600 mb-1.5">
                      Campaign Health Read — Week {activeWeek.week_number}
                    </p>
                    <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                      {activeWeek.ai_narrative}
                    </p>
                    {activeWeek.ai_phase_context && (
                      <p className="text-xs text-neutral-400 mt-2 italic">
                        {activeWeek.ai_phase_context}
                      </p>
                    )}
                  </div>

                  {actions.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                      <p className="text-xs font-semibold text-blue-800 mb-2">
                        Recommended Actions
                      </p>
                      <ol className="space-y-1.5 text-xs text-blue-900">
                        {actions.map((action: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="shrink-0 font-mono font-semibold text-blue-500">
                              {i + 1}.
                            </span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Raw signal data */}
              <details className="text-xs text-neutral-500">
                <summary className="cursor-pointer hover:text-neutral-700 font-medium">
                  Raw signal data — Week {activeWeek.week_number}
                </summary>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-100">
                  <div>
                    <p className="text-neutral-400">S2 — Save Rate</p>
                    <p className="font-mono text-neutral-700">
                      {activeWeek.signal_2_actual_pct !== null
                        ? `${activeWeek.signal_2_actual_pct}%`
                        : "—"}
                    </p>
                    <p className="text-neutral-300">
                      Target: ≥{threshold.signal_2_threshold_pct}%
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">S2B — Share Rate</p>
                    <p className="font-mono text-neutral-700">
                      {activeWeek.signal_2b_actual_pct !== null
                        ? `${activeWeek.signal_2b_actual_pct}%`
                        : "—"}
                    </p>
                    <p className="text-neutral-300">
                      Target: ≥{threshold.signal_2b_target_pct ?? 5}%
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">S3 — UGC Count</p>
                    <p className="font-mono text-neutral-700">
                      {activeWeek.signal_3_actual_count !== null
                        ? activeWeek.signal_3_actual_count
                        : "—"}
                    </p>
                    <p className="text-neutral-300">
                      Target: ≥{threshold.signal_3_threshold_count} posts
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">S1 — Search Lift</p>
                    <p className="font-mono text-neutral-700">
                      {activeWeek.signal_1_actual_pct !== null
                        ? `${activeWeek.signal_1_actual_pct}%`
                        : "—"}
                    </p>
                    <p className="text-neutral-300">
                      Target: ≥{threshold.signal_1_threshold_pct}%
                    </p>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Timeline Panel ───────────────────────────────────────────────────────────
// F16B — All-weeks health grid. Trend view: spots creative fatigue, pipeline risk
// patterns, and phase transitions at a glance.

const PHASE_LABEL: Record<number, string> = {
  1: "P1 Baseline",
  2: "P2 Emerge",
  3: "P3 Diagnose",
  4: "P4 Optimise",
};

const PHASE_COLOR: Record<number, string> = {
  1: "text-neutral-400",
  2: "text-blue-500",
  3: "text-amber-600",
  4: "text-emerald-600",
};

function HealthDot({ health }: { health: string }) {
  const h = health as SignalHealth;
  const color =
    h === "Green" ? "bg-emerald-500" : h === "Amber" ? "bg-amber-400" : "bg-red-500";
  const title = h;
  return (
    <span
      title={title}
      className={`inline-block w-3 h-3 rounded-full ${color}`}
    />
  );
}

function TimelinePanel({
  reports,
  threshold,
}: {
  reports: SignalWeeklyReport[];
  threshold: SignalThreshold;
}) {
  if (reports.length === 0) {
    return (
      <p className="text-sm text-neutral-400 text-center py-4">
        No weekly reports yet. Log your first week to see the health timeline.
      </p>
    );
  }

  // Oldest first so timeline reads left-to-right chronologically
  const sorted = [...reports].sort((a, b) => a.week_number - b.week_number);

  // Count weeks in each health state for the summary row
  const totals = sorted.reduce(
    (acc, r) => {
      if (!r.flags_suppressed) {
        if (r.demand_health === "Green") acc.dG++;
        else if (r.demand_health === "Amber") acc.dA++;
        else acc.dR++;
        if (r.nurture_health === "Green") acc.nG++;
        else if (r.nurture_health === "Amber") acc.nA++;
        else acc.nR++;
        if (r.conversion_health === "Green") acc.cG++;
        else if (r.conversion_health === "Amber") acc.cA++;
        else acc.cR++;
      }
      acc.risk += r.pipeline_risk_detected ? 1 : 0;
      return acc;
    },
    { dG: 0, dA: 0, dR: 0, nG: 0, nA: 0, nR: 0, cG: 0, cA: 0, cR: 0, risk: 0 }
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        Campaign health week-by-week — {sorted.length} weeks logged of {threshold.campaign_duration_weeks} total.
        Dots = <span className="text-emerald-600 font-medium">Green</span> / <span className="text-amber-500 font-medium">Amber</span> / <span className="text-red-500 font-medium">Red</span>. ⚠ = Pipeline Risk.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-400 text-left">
              <th className="py-1.5 pr-3 font-medium w-14">Week</th>
              <th className="py-1.5 pr-3 font-medium w-24">Phase</th>
              <th className="py-1.5 pr-3 font-medium text-center w-16">Demand</th>
              <th className="py-1.5 pr-3 font-medium text-center w-16">Save</th>
              <th className="py-1.5 pr-3 font-medium text-center w-16">Share</th>
              <th className="py-1.5 pr-3 font-medium text-center w-20">Conversion</th>
              <th className="py-1.5 pr-3 font-medium text-center w-20">Gate</th>
              <th className="py-1.5 pr-3 font-medium text-center w-14">Risk</th>
              <th className="py-1.5 font-medium">AI Read (excerpt)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              // Truncate AI narrative to first sentence for the table
              const excerpt = r.ai_narrative
                ? r.ai_narrative.split(/[.!?]/)[0].trim().slice(0, 80) +
                  (r.ai_narrative.length > 80 ? "…" : "")
                : r.flags_suppressed
                ? "Baseline phase — building signal."
                : "—";

              return (
                <tr
                  key={r.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                >
                  <td className="py-2 pr-3 font-mono font-semibold text-neutral-700">
                    W{r.week_number}
                  </td>
                  <td className={`py-2 pr-3 font-medium ${PHASE_COLOR[r.campaign_phase] ?? "text-neutral-400"}`}>
                    {PHASE_LABEL[r.campaign_phase] ?? `P${r.campaign_phase}`}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    {r.flags_suppressed ? (
                      <span className="text-neutral-300">—</span>
                    ) : (
                      <HealthDot health={r.demand_health} />
                    )}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    {r.flags_suppressed ? (
                      <span className="text-neutral-300">—</span>
                    ) : (
                      <HealthDot health={r.nurture_health} />
                    )}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    {r.flags_suppressed ? (
                      <span className="text-neutral-300">—</span>
                    ) : r.signal_2b_health ? (
                      <HealthDot health={r.signal_2b_health} />
                    ) : (
                      <span className="text-neutral-200">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    {r.flags_suppressed ? (
                      <span className="text-neutral-300">—</span>
                    ) : (
                      <HealthDot health={r.conversion_health} />
                    )}
                  </td>
                  <td className="py-2 pr-3 text-center" title={r.gate_note ?? ""}>
                    {r.flags_suppressed ? (
                      <span className="text-neutral-300">—</span>
                    ) : r.gate_status === "Green" ? (
                      <span className="text-emerald-600 font-bold text-xs">⚡ Open</span>
                    ) : r.gate_status === "Amber" ? (
                      <span className="text-amber-500 font-bold text-xs">⏸ Watch</span>
                    ) : (
                      <span className="text-red-400 text-xs">Closed</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    {r.pipeline_risk_detected ? (
                      <span className="text-red-500 font-bold" title="Pipeline Risk Detected">⚠</span>
                    ) : (
                      <span className="text-neutral-200">—</span>
                    )}
                  </td>
                  <td className="py-2 text-neutral-500 max-w-xs">{excerpt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      {sorted.some(r => !r.flags_suppressed) && (
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-100 text-xs">
          <div>
            <p className="text-neutral-400 mb-0.5">Demand</p>
            <p>
              <span className="text-emerald-600 font-semibold">{totals.dG}G</span>
              {" / "}
              <span className="text-amber-500 font-semibold">{totals.dA}A</span>
              {" / "}
              <span className="text-red-500 font-semibold">{totals.dR}R</span>
            </p>
          </div>
          <div>
            <p className="text-neutral-400 mb-0.5">Nurture</p>
            <p>
              <span className="text-emerald-600 font-semibold">{totals.nG}G</span>
              {" / "}
              <span className="text-amber-500 font-semibold">{totals.nA}A</span>
              {" / "}
              <span className="text-red-500 font-semibold">{totals.nR}R</span>
            </p>
          </div>
          <div>
            <p className="text-neutral-400 mb-0.5">Conversion</p>
            <p>
              <span className="text-emerald-600 font-semibold">{totals.cG}G</span>
              {" / "}
              <span className="text-amber-500 font-semibold">{totals.cA}A</span>
              {" / "}
              <span className="text-red-500 font-semibold">{totals.cR}R</span>
            </p>
          </div>
          <div>
            <p className="text-neutral-400 mb-0.5">Pipeline Risk</p>
            <p className={totals.risk > 0 ? "text-red-500 font-semibold" : "text-neutral-400"}>
              {totals.risk > 0 ? `⚠ ${totals.risk} week${totals.risk !== 1 ? "s" : ""}` : "None detected"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SignalIntelligenceSection({
  campaignId,
  threshold,
  reports,
}: {
  campaignId: string;
  threshold: SignalThreshold | null;
  reports: SignalWeeklyReport[];
}) {
  const locked = threshold?.locked ?? false;
  const hasReports = reports.length > 0;
  // Default to timeline if we have 3+ weeks of data — gives the most useful view on re-open
  const defaultTab = !locked ? "thresholds" : reports.length >= 3 ? "timeline" : "weekly";
  const [tab, setTab] = useState<"thresholds" | "weekly" | "timeline">(defaultTab);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <SectionTitle id="signal-intelligence">Signal Intelligence</SectionTitle>
          <p className="text-xs text-neutral-400 mt-0.5">
            Weekly signal check-in. Log your actuals and get an AI read on campaign health. Internal only.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {locked && <Badge tone="green">Targets Locked</Badge>}
          {!locked && <Badge tone="amber">Targets Not Set</Badge>}
          {hasReports && (
            <Badge tone="neutral">
              {reports.length} week{reports.length !== 1 ? "s" : ""} logged
            </Badge>
          )}
        </div>
      </div>

      {/* Internal-only notice */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-amber-50 border border-amber-100 mb-4 text-xs text-amber-700">
        <span>⚿</span>
        <span>ShiftImpact team only — not visible to clients.</span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 border-b border-neutral-100 pb-2">
        <button
          type="button"
          onClick={() => setTab("thresholds")}
          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
            tab === "thresholds"
              ? "bg-neutral-800 text-white"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Set Targets {locked ? "⚿" : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("weekly")}
          disabled={!locked}
          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            tab === "weekly"
              ? "bg-neutral-800 text-white"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Weekly Reports {hasReports ? `(${reports.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("timeline")}
          disabled={!hasReports}
          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            tab === "timeline"
              ? "bg-neutral-800 text-white"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Timeline {hasReports ? `(${reports.length}w)` : ""}
        </button>
        {!locked && (
          <p className="text-xs text-neutral-400 self-center ml-2">
            Lock your targets first to start weekly check-ins
          </p>
        )}
      </div>

      {tab === "thresholds" && (
        <ThresholdSetupPanel campaignId={campaignId} threshold={threshold} />
      )}
      {tab === "weekly" && locked && threshold && (
        <WeeklySignalPanel
          campaignId={campaignId}
          threshold={threshold}
          reports={reports}
        />
      )}
      {tab === "timeline" && threshold && (
        <TimelinePanel reports={reports} threshold={threshold} />
      )}
    </Card>
  );
}
