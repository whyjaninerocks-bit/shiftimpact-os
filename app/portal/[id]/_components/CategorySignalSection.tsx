import type { CategorySignalFramework } from "@/lib/data";
import { SectionHeading } from "./reportUi";
import { Collapse } from "@/app/portal/_components/Collapse";

// ─── Category Signal Framework — client-facing, top-of-report ────────────────
// This is deliberately the FIRST thing anyone sees on the report (rendered
// above the hero in page.tsx, and mirrored at the top of AgencyPortalView).
// The reason: when a commercial director or CFO opens this, the first thing
// they need to see — before any single number — is that this campaign is
// being read through ITS OWN category's behaviour chain toward ITS OWN named
// business outcome, not a generic one-size-fits-all dashboard. That claim
// has to be demonstrably true, not just asserted in a sales deck, so this
// renders real data: the category, the named outcome, and the actual
// Discover→...→Outcome stage sequence from category_attributes.behaviour_chain
// (e.g. FMCG: Awareness→Consideration→Trial→Purchase→Repeat→Advocacy).
//
// Deliberately does NOT try to attach real weekly numbers to the signal
// chips below the journey. There is currently no link in the schema between
// a signal_vocabulary key (e.g. "product_search") and the fixed
// signal_1_actual_pct-style columns on signal_weekly_reports —
// signal_thresholds still uses free-text labels typed by a strategist,
// unconnected to this newer, validated-key system. Forcing a match here
// would risk mislabeling a number with a signal it doesn't actually
// measure. So this section shows the honest framework — what's being
// tracked, in the client's own category language, and whether each signal
// currently has data behind it — separately from "Latest weekly update" /
// "Signal health" below, which keep showing whatever real weekly numbers
// already exist.

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

function BehaviourChain({ stages }: { stages: string[] }) {
  if (stages.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stages.map((stage, i) => (
        <div key={stage} className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full px-2.5 py-1">
            {stage}
          </span>
          {i < stages.length - 1 && <span className="text-neutral-300 text-xs">→</span>}
        </div>
      ))}
    </div>
  );
}

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

// Recap strip — the actual-vs-target numbers behind the business outcome
// named above. This is deliberately just a recap (same numbers Campaign
// Health shows further down), not a new metric — the point is a CFO/
// commercial director scanning only the top of the report still sees where
// the campaign actually stands against its own named KPI, not just the
// label.
function OutcomeRecap({
  businessOutcomeLabel,
  businessOutcomeActual,
  businessOutcomeTarget,
  retentionMetricLabel,
  retentionMetricActual,
  retentionMetricTarget,
}: {
  businessOutcomeLabel: string;
  businessOutcomeActual?: number | null;
  businessOutcomeTarget?: number | null;
  retentionMetricLabel?: string | null;
  retentionMetricActual?: number | null;
  retentionMetricTarget?: number | null;
}) {
  const hasOutcome = businessOutcomeActual != null || businessOutcomeTarget != null;
  const hasRetention =
    retentionMetricLabel != null && (retentionMetricActual != null || retentionMetricTarget != null);
  if (!hasOutcome && !hasRetention) return null;

  return (
    <div className="grid grid-cols-2 gap-3 pt-1">
      {hasOutcome && (
        <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 truncate">
            {businessOutcomeLabel}
          </p>
          <p className="text-lg font-black text-neutral-900 mt-0.5">
            {businessOutcomeActual ?? "—"}
            <span className="text-xs font-semibold text-neutral-400"> / {businessOutcomeTarget ?? "—"}</span>
          </p>
        </div>
      )}
      {hasRetention && (
        <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 truncate">
            {retentionMetricLabel}
          </p>
          <p className="text-lg font-black text-neutral-900 mt-0.5">
            {retentionMetricActual ?? "—"}
            <span className="text-xs font-semibold text-neutral-400"> / {retentionMetricTarget ?? "—"}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export function CategorySignalSection({
  framework,
  businessOutcomeActual = null,
  businessOutcomeTarget = null,
  retentionMetricLabel = null,
  retentionMetricActual = null,
  retentionMetricTarget = null,
}: {
  framework: CategorySignalFramework | null;
  businessOutcomeActual?: number | null;
  businessOutcomeTarget?: number | null;
  retentionMetricLabel?: string | null;
  retentionMetricActual?: number | null;
  retentionMetricTarget?: number | null;
}) {
  // No active signal map for this campaign yet — say nothing rather than
  // show an empty/half-built section. Unlike the Prediction section (where
  // "no data yet" is itself meaningful to a client watching for results),
  // an unset signal framework is an internal setup step, not something the
  // client is waiting on.
  if (!framework) return null;

  const confidence = CONFIDENCE_COPY[framework.confidence_label] ?? CONFIDENCE_COPY["Conversion Likelihood Only"];

  return (
    <section className="space-y-3">
      <SectionHeading
        title="How we're measuring success"
        subtitle="This campaign is read through its own category's path to outcome — not a generic dashboard."
      />
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold text-neutral-900">{framework.business_outcome_label}</p>
          {framework.category_name && (
            <span className="shrink-0 text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
              {framework.category_name}
            </span>
          )}
        </div>

        <OutcomeRecap
          businessOutcomeLabel={framework.business_outcome_label}
          businessOutcomeActual={businessOutcomeActual}
          businessOutcomeTarget={businessOutcomeTarget}
          retentionMetricLabel={retentionMetricLabel}
          retentionMetricActual={retentionMetricActual}
          retentionMetricTarget={retentionMetricTarget}
        />

        {framework.behaviour_chain.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
              The path we're tracking, for this category
            </p>
            <BehaviourChain stages={framework.behaviour_chain} />
          </div>
        )}

        <div className={`px-3 py-2 rounded-lg border text-[11px] leading-relaxed ${confidence.tone}`}>
          <span className="font-semibold">{framework.confidence_label}.</span> {confidence.line}
        </div>

        <Collapse label="Show signal breakdown" variant="inline">
          <div className="space-y-4 pt-1">
            <div className="grid gap-3 sm:grid-cols-3">
              <SignalGroup title="Early signals" signals={framework.leading_signals} availableData={framework.available_data} />
              <SignalGroup title="Conversion signals" signals={framework.conversion_signals} availableData={framework.available_data} />
              <SignalGroup title="Downstream signals" signals={framework.lagging_signals} availableData={framework.available_data} />
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
        </Collapse>
      </div>
    </section>
  );
}
