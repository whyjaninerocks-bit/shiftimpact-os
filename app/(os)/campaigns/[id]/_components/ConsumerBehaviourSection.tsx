"use client";

// app/campaigns/[id]/_components/ConsumerBehaviourSection.tsx
// Feature 18A — Consumer Behaviour State Diagnostic (Sprint 3)
//
// INTERNAL ONLY. State names, numbers, and classification system
// are NEVER shown to clients. This section is for strategy lead + Janine.
//
// Flow:
//   1. Strategy lead optionally enters strategy notes for the week.
//   2. "Run Diagnostic" → saves observation row → calls /api/behaviour-state.
//   3. AI classifies state → result displayed.
//   4. History table shows all past weeks.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveConsumerBehaviourObservation } from "@/lib/actions";
import type { ConsumerBehaviourState } from "@/lib/types";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";

// ─── State colour mapping ──────────────────────────────────────────────────────

const STATE_META: Record<
  number,
  { label: string; tone: "red" | "amber" | "blue" | "green" | "purple" | "neutral" }
> = {
  1: { label: "Unaware",               tone: "red" },
  2: { label: "Aware but Passive",     tone: "amber" },
  3: { label: "Aware but Unconvinced", tone: "amber" },
  4: { label: "In Consideration",      tone: "blue" },
  5: { label: "Intent-Active",         tone: "green" },
  6: { label: "Post-Purchase",         tone: "purple" },
};

const CONFIDENCE_TONE: Record<string, "green" | "blue" | "neutral"> = {
  High:        "green",
  Medium:      "blue",
  Directional: "neutral",
};

function StateBadge({ state }: { state: number | null }) {
  if (!state) {
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 text-lg font-bold">
        ?
      </span>
    );
  }
  const meta = STATE_META[state] ?? { tone: "neutral" };
  const bg: Record<string, string> = {
    red:     "bg-red-100 text-red-800",
    amber:   "bg-amber-100 text-amber-800",
    blue:    "bg-blue-100 text-blue-800",
    green:   "bg-emerald-100 text-emerald-800",
    purple:  "bg-purple-100 text-purple-800",
    neutral: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${bg[meta.tone]}`}
      title={`State ${state}`}
    >
      {state}
    </span>
  );
}

// ─── Current state display ────────────────────────────────────────────────────

function CurrentStateCard({ report }: { report: ConsumerBehaviourState }) {
  const meta = report.diagnosed_state ? STATE_META[report.diagnosed_state] : null;

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <StateBadge state={report.diagnosed_state} />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {report.state_name || (report.diagnosed_state ? meta?.label : "Pending diagnostic")}
            </span>
            {report.confidence_level && (
              <Badge tone={CONFIDENCE_TONE[report.confidence_level] ?? "neutral"}>
                {report.confidence_level} confidence
              </Badge>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">Week {report.week_number}</p>
        </div>
      </div>

      {report.signal_pattern_read && (
        <div className="mb-3">
          <p className="text-xs font-medium text-neutral-500 mb-1">Signal read</p>
          <p className="text-sm text-neutral-700">{report.signal_pattern_read}</p>
        </div>
      )}

      {report.activation_direction && (
        <div className="rounded-md bg-neutral-50 border border-neutral-200 px-3 py-2 mb-3">
          <p className="text-xs font-medium text-neutral-500 mb-0.5">Activation direction</p>
          <p className="text-sm text-neutral-800">{report.activation_direction}</p>
        </div>
      )}

      {report.low_involvement_note && (
        <p className="text-xs text-neutral-500 italic">{report.low_involvement_note}</p>
      )}

      {!report.diagnosed_state && (
        <p className="text-sm text-neutral-400">
          Observation logged for Week {report.week_number}. Run the diagnostic to classify this week's state.
        </p>
      )}
    </Card>
  );
}

// ─── History table ────────────────────────────────────────────────────────────

function HistoryTable({ reports }: { reports: ConsumerBehaviourState[] }) {
  if (reports.length === 0) return null;

  const sorted = [...reports].sort((a, b) => a.week_number - b.week_number);

  return (
    <Card className="mt-4">
      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
        State History
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-1.5 pr-3 font-medium text-neutral-500 whitespace-nowrap">Week</th>
              <th className="text-left py-1.5 pr-3 font-medium text-neutral-500 whitespace-nowrap">State</th>
              <th className="text-left py-1.5 pr-3 font-medium text-neutral-500 whitespace-nowrap">Confidence</th>
              <th className="text-left py-1.5 font-medium text-neutral-500">Signal Read (excerpt)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const meta = r.diagnosed_state ? STATE_META[r.diagnosed_state] : null;
              return (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-1.5 pr-3 whitespace-nowrap font-medium">W{r.week_number}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {r.diagnosed_state ? (
                      <span className="flex items-center gap-1.5">
                        <StateBadge state={r.diagnosed_state} />
                        <span className="text-neutral-700">{r.state_name || meta?.label}</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400 italic">Pending</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {r.confidence_level ? (
                      <Badge tone={CONFIDENCE_TONE[r.confidence_level] ?? "neutral"}>
                        {r.confidence_level}
                      </Badge>
                    ) : "—"}
                  </td>
                  <td className="py-1.5 text-neutral-600 max-w-xs truncate">
                    {r.signal_pattern_read
                      ? r.signal_pattern_read.slice(0, 100) + (r.signal_pattern_read.length > 100 ? "…" : "")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Log / Run form ──────────────────────────────────────────────────────────

interface LogFormProps {
  campaignId: string;
  nextWeek: number;
  onResult: (data: Partial<ConsumerBehaviourState>, week: number) => void;
}

function LogForm({ campaignId, nextWeek, onResult }: LogFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [weekOf, setWeekOf] = useState(todayStr);
  const [strategyNotes, setStrategyNotes] = useState("");
  const [apiError, setApiError] = useState("");

  const handleRun = () => {
    setApiError("");
    startTransition(async () => {
      // Step 1: save the observation row
      const fd = new FormData();
      fd.append("week_of", weekOf);
      fd.append("strategy_notes", strategyNotes);
      await saveConsumerBehaviourObservation(campaignId, nextWeek, fd);

      // Step 2: call the AI diagnostic
      const res = await fetch("/api/behaviour-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, week_number: nextWeek }),
      });
      const result = await res.json();

      if (!res.ok) {
        setApiError(result.error ?? "Diagnostic failed. Try again.");
        return;
      }

      onResult(result, nextWeek);
      router.refresh();
    });
  };

  return (
    <Card>
      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
        Log Week {nextWeek}
      </h3>

      <div className="space-y-3">
        <div>
          <label className={labelClass}>Week of</label>
          <input
            type="date"
            value={weekOf}
            onChange={(e) => setWeekOf(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Strategy notes (optional)</label>
          <textarea
            value={strategyNotes}
            onChange={(e) => setStrategyNotes(e.target.value)}
            rows={3}
            placeholder="Qualitative context, market observations, or campaign events this week…"
            className={inputClass + " resize-none"}
          />
        </div>

        {apiError && (
          <p className="text-xs text-red-600">{apiError}</p>
        )}

        <button
          onClick={handleRun}
          disabled={isPending || !weekOf}
          className={buttonClass}
        >
          {isPending ? "Running diagnostic…" : "Run Behaviour Diagnostic"}
        </button>
      </div>
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ConsumerBehaviourSectionProps {
  campaignId: string;
  behaviourStates: ConsumerBehaviourState[];
}

export function ConsumerBehaviourSection({
  campaignId,
  behaviourStates,
}: ConsumerBehaviourSectionProps) {
  // Most recent first from server; latest = behaviourStates[0]
  const latestReport = behaviourStates[0] ?? null;
  const nextWeek = latestReport ? latestReport.week_number + 1 : 1;

  // In-session result overlay: shows the AI result immediately after "Run Diagnostic"
  // without requiring a full page refresh. router.refresh() then syncs server state.
  const [inSessionResult, setInSessionResult] = useState<Partial<ConsumerBehaviourState> | null>(null);

  // The week number that was just diagnosed in this session
  const [inSessionWeek, setInSessionWeek] = useState<number | null>(null);

  // Merge in-session result onto a synthetic report for display
  const displayReport: ConsumerBehaviourState | null = inSessionResult && inSessionWeek != null
    ? { ...(latestReport ?? ({} as ConsumerBehaviourState)), ...inSessionResult, week_number: inSessionWeek }
    : latestReport;

  return (
    <section id="behaviour-state">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle id="behaviour-state">Consumer Behaviour State</SectionTitle>
        <Badge tone="neutral">Internal ⚿</Badge>
      </div>

      <p className="text-xs text-neutral-500 mb-4">
        AI-classified from weekly signal data. State classification is internal only — not shown to clients.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: current state */}
        <div>
          {displayReport ? (
            <CurrentStateCard report={displayReport} />
          ) : (
            <Card>
              <p className="text-sm text-neutral-400">
                No behaviour states logged yet. Log the first week to run the diagnostic.
              </p>
            </Card>
          )}
        </div>

        {/* Right: log new week */}
        <div>
          <LogForm
            campaignId={campaignId}
            nextWeek={nextWeek}
            onResult={(data, week) => { setInSessionResult(data); setInSessionWeek(week); }}
          />
        </div>
      </div>

      {behaviourStates.length > 0 && (
        <HistoryTable reports={behaviourStates} />
      )}
    </section>
  );
}
