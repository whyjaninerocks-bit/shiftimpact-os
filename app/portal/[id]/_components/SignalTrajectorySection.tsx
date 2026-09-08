import type { SignalWeeklyReport } from "@/lib/types";
import type { SignalThresholdsClientSafe } from "@/lib/data";
import { SignalSparkline } from "./SignalSparkline";
import { DeltaTag } from "./reportUi";

// ─── Signal Trajectory — client-facing ───────────────────────────────────────
// Week-over-week view instead of a single-week snapshot: a gate-status dot
// per week, plus a sparkline per signal against its own threshold. All from
// data the portal already fetches (getSignalWeeklyReports returns every week
// for this campaign, not just the latest) — this only renders it as a trend.
// Only shows once there are 2+ weeks of real data; a single week is already
// covered by the topline card above it.

const GATE_DOT: Record<string, string> = {
  Green: "bg-emerald-500",
  Amber: "bg-amber-400",
  Red: "bg-red-500",
};

export function SignalTrajectorySection({
  reports,
  thresholds,
}: {
  reports: SignalWeeklyReport[];
  thresholds: SignalThresholdsClientSafe | null;
}) {
  if (reports.length < 2) return null;

  const chronological = [...reports].sort((a, b) => a.week_number - b.week_number);
  const latest = chronological[chronological.length - 1];
  const previous = chronological.length > 1 ? chronological[chronological.length - 2] : null;

  return (
    <div className="space-y-4 pt-3 border-t border-neutral-100">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
          Gate status over time
        </p>
        <div className="flex items-center gap-2">
          {chronological.map((r) => (
            <div key={r.week_number} className="flex flex-col items-center gap-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${GATE_DOT[r.gate_status ?? "Red"] ?? "bg-neutral-300"}`}
                title={`Week ${r.week_number}: ${r.gate_status ?? "—"}`}
              />
              <span className="text-[9px] text-neutral-400">W{r.week_number}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {thresholds?.signal_1_label && (
          <div>
            <p className="text-[10px] text-neutral-500 mb-1 truncate">{thresholds.signal_1_label}</p>
            <SignalSparkline
              values={chronological.map((r) => r.signal_1_actual_pct)}
              threshold={thresholds.signal_1_threshold_pct}
              color="#f59e0b"
              height={70}
            />
            <p className="text-xs font-semibold text-neutral-700 mt-1">
              {latest.signal_1_actual_pct ?? "—"}%
              {thresholds.signal_1_threshold_pct != null && (
                <span className="text-neutral-400 font-normal"> / {thresholds.signal_1_threshold_pct}% gate</span>
              )}
            </p>
            {previous && (
              <DeltaTag current={latest.signal_1_actual_pct} previous={previous.signal_1_actual_pct} suffix="%" />
            )}
          </div>
        )}
        {thresholds?.signal_2_label && (
          <div>
            <p className="text-[10px] text-neutral-500 mb-1 truncate">{thresholds.signal_2_label}</p>
            <SignalSparkline
              values={chronological.map((r) => r.signal_2_actual_pct)}
              threshold={thresholds.signal_2_threshold_pct}
              color="#6366f1"
              height={70}
            />
            <p className="text-xs font-semibold text-neutral-700 mt-1">
              {latest.signal_2_actual_pct ?? "—"}%
              {thresholds.signal_2_threshold_pct != null && (
                <span className="text-neutral-400 font-normal"> / {thresholds.signal_2_threshold_pct}% gate</span>
              )}
            </p>
            {previous && (
              <DeltaTag current={latest.signal_2_actual_pct} previous={previous.signal_2_actual_pct} suffix="%" />
            )}
          </div>
        )}
        {thresholds?.signal_3_label && (
          <div>
            <p className="text-[10px] text-neutral-500 mb-1 truncate">{thresholds.signal_3_label}</p>
            <SignalSparkline
              values={chronological.map((r) => r.signal_3_actual_count)}
              threshold={thresholds.signal_3_threshold_count}
              color="#10b981"
              height={70}
            />
            <p className="text-xs font-semibold text-neutral-700 mt-1">
              {latest.signal_3_actual_count ?? "—"}
              {thresholds.signal_3_threshold_count != null && (
                <span className="text-neutral-400 font-normal"> / {thresholds.signal_3_threshold_count} gate</span>
              )}
            </p>
            {previous && (
              <DeltaTag current={latest.signal_3_actual_count} previous={previous.signal_3_actual_count} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
