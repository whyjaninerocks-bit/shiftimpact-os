import type { SignalWeeklyReport, SignalHealth } from "@/lib/types";
import type { SignalThresholdsClientSafe } from "@/lib/data";
import { SignalSparkline } from "./SignalSparkline";
import { DeltaTag } from "./reportUi";

// ─── Signal Trajectory — client-facing ───────────────────────────────────────
// Rebuilt to match the agency view's "Signal readings" cards exactly (same
// card shell, label/subtitle/value/badge layout, sparkline treatment with a
// dashed benchmark line) so the two portals present the same intelligence
// with the same visual weight — previously this was a much smaller, denser
// layout than its agency-view equivalent, which read as an inconsistent,
// "lesser" version of the same data. Week-over-week gate-status dots are
// kept above the signal cards; a single week is already covered by the
// gate-status card above this component in page.tsx.

const GATE_DOT: Record<string, string> = {
  Green: "bg-emerald-500",
  Amber: "bg-amber-400",
  Red: "bg-red-500",
};

function healthBadgeColor(h: SignalHealth | null | undefined) {
  return h === "Green" ? "text-emerald-600" : h === "Amber" ? "text-amber-600" : "text-red-600";
}

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
    <div className="space-y-4 pt-4 mt-4 border-t border-neutral-100">
      <div>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">
          Gate status over time
        </p>
        <div className="flex items-center gap-2">
          {chronological.map((r) => (
            <div key={r.week_number} className="flex flex-col items-center gap-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${GATE_DOT[r.gate_status ?? "Red"] ?? "bg-neutral-300"}`}
                title={`Week ${r.week_number}: ${r.gate_status ?? "—"}`}
              />
              <span className="text-[10px] text-neutral-400">W{r.week_number}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {thresholds?.signal_1_label && latest.signal_1_actual_pct !== null && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-4">
            <p className="text-xs font-semibold text-neutral-700 truncate">{thresholds.signal_1_label}</p>
            <p className="text-[10px] text-neutral-400 mb-2 leading-snug">Demand signal</p>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-neutral-900">{latest.signal_1_actual_pct}%</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${healthBadgeColor(latest.demand_health)}`}>
                {latest.demand_health ?? "—"}
              </span>
            </div>
            <SignalSparkline
              values={chronological.map((r) => r.signal_1_actual_pct)}
              threshold={thresholds.signal_1_threshold_pct}
              color="#6366f1"
              height={72}
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              {thresholds.signal_1_threshold_pct != null && (
                <span>Gate ≥{thresholds.signal_1_threshold_pct}% · </span>
              )}
              {previous && (
                <DeltaTag current={latest.signal_1_actual_pct} previous={previous.signal_1_actual_pct} suffix="%" />
              )}
            </p>
          </div>
        )}
        {thresholds?.signal_2_label && latest.signal_2_actual_pct !== null && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-4">
            <p className="text-xs font-semibold text-neutral-700 truncate">{thresholds.signal_2_label}</p>
            <p className="text-[10px] text-neutral-400 mb-2 leading-snug">Nurture signal</p>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-neutral-900">{latest.signal_2_actual_pct}%</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${healthBadgeColor(latest.nurture_health)}`}>
                {latest.nurture_health ?? "—"}
              </span>
            </div>
            <SignalSparkline
              values={chronological.map((r) => r.signal_2_actual_pct)}
              threshold={thresholds.signal_2_threshold_pct}
              color="#d97706"
              height={72}
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              {thresholds.signal_2_threshold_pct != null && (
                <span>Gate ≥{thresholds.signal_2_threshold_pct}% · </span>
              )}
              {previous && (
                <DeltaTag current={latest.signal_2_actual_pct} previous={previous.signal_2_actual_pct} suffix="%" />
              )}
            </p>
          </div>
        )}
        {thresholds?.signal_3_label && latest.signal_3_actual_count !== null && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-4">
            <p className="text-xs font-semibold text-neutral-700 truncate">{thresholds.signal_3_label}</p>
            <p className="text-[10px] text-neutral-400 mb-2 leading-snug">Conversion signal</p>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-neutral-900">{latest.signal_3_actual_count}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${healthBadgeColor(latest.conversion_health)}`}>
                {latest.conversion_health ?? "—"}
              </span>
            </div>
            <SignalSparkline
              values={chronological.map((r) => r.signal_3_actual_count)}
              threshold={thresholds.signal_3_threshold_count}
              color="#059669"
              height={72}
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              {thresholds.signal_3_threshold_count != null && (
                <span>Gate ≥{thresholds.signal_3_threshold_count} · </span>
              )}
              {previous && (
                <DeltaTag current={latest.signal_3_actual_count} previous={previous.signal_3_actual_count} />
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
