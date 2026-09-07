import type { CategorySignalFramework } from "@/lib/data";

// ─── Category Signal Framework — client-facing ───────────────────────────────
// Replaces the fixed, FMCG-shaped "Demand/Nurture/Conversion" framing with
// whatever this specific campaign's category actually tracks (a B2B client
// sees pipeline-stage signals, an FMCG client sees sell-through signals,
// etc.) — the core fix requested for v2.
//
// Deliberately does NOT try to attach real weekly numbers to these signal
// groups. There is currently no link in the schema between a signal_vocabulary
// key (e.g. "product_search") and the fixed signal_1_actual_pct-style columns
// on signal_weekly_reports — signal_thresholds still uses free-text labels
// typed by a strategist, unconnected to this newer, validated-key system.
// Forcing a match between the two here would risk mislabeling a number with
// a signal it doesn't actually measure. So this section shows the honest
// framework — what's being tracked, in the client's own category language,
// and whether each signal currently has data behind it — separately from the
// existing "Latest weekly update" / "Signal health" sections below, which
// keep showing whatever real weekly numbers already exist. See the git commit
// this shipped in for the fuller writeup of this gap.

const CONFIDENCE_COPY: Record<string, { tone: string; line: string }> = {
  "Conversion Measured": {
    tone: "bg-green-50 text-green-800 border-green-200",
    line: "We have direct conversion-tier data for this campaign — this isn't a likelihood estimate.",
  },
  "Conversion Partially Supported": {
    tone: "bg-amber-50 text-amber-800 border-amber-200",
    line: "We have leading/intent data, but not yet confirmed conversion-tier data — treat outcome as directionally supported, not fully measured.",
  },
  "Conversion Likelihood Only": {
    tone: "bg-neutral-100 text-neutral-600 border-neutral-200",
    line: "None of our current data matches this category's leading or conversion signals yet — any outcome read today is a likelihood estimate, not a measured result.",
  },
};

function SignalGroup({
  title,
  signals,
  availableData,
}: {
  title: string;
  signals: { key: string; label: string }[];
  availableData: string[];
}) {
  if (signals.length === 0) return null;
  const available = new Set(availableData);
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {signals.map((s) => {
          const isLive = available.has(s.key);
          return (
            <span
              key={s.key}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${
                isLive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-neutral-50 text-neutral-400 border-neutral-200"
              }`}
              title={isLive ? "Currently tracked" : "Not yet tracked"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-500" : "bg-neutral-300"}`}
              />
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function CategorySignalSection({ framework }: { framework: CategorySignalFramework | null }) {
  // No active signal map for this campaign yet — say nothing rather than
  // show an empty/half-built section. Unlike the Prediction section (where
  // "no data yet" is itself meaningful to a client watching for results),
  // an unset signal framework is an internal setup step, not something the
  // client is waiting on.
  if (!framework) return null;

  const confidence = CONFIDENCE_COPY[framework.confidence_label] ?? CONFIDENCE_COPY["Conversion Likelihood Only"];

  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
        How we&apos;re measuring success
      </h2>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
        <div>
          <p className="text-xs text-neutral-400">
            {framework.category_name ? `${framework.category_name} framework` : "What this campaign is built to move"}
          </p>
          <p className="text-base font-semibold text-neutral-900">{framework.business_outcome_label}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SignalGroup title="Early signals" signals={framework.leading_signals} availableData={framework.available_data} />
          <SignalGroup title="Conversion signals" signals={framework.conversion_signals} availableData={framework.available_data} />
          <SignalGroup title="Downstream signals" signals={framework.lagging_signals} availableData={framework.available_data} />
        </div>

        <div className={`px-3 py-2 rounded-lg border text-[11px] leading-relaxed ${confidence.tone}`}>
          <span className="font-semibold">{framework.confidence_label}.</span> {confidence.line}
        </div>

        {framework.missing_data.length > 0 && (
          <div className="pt-2 border-t border-neutral-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
              Not yet available
            </p>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              {framework.missing_data.map((m) => m.label).join(", ")} — sharing this data would move
              the confidence rating above.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
