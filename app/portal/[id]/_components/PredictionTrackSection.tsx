import type { PredictionAccuracyClientSafe } from "@/lib/data";
import { Card } from "@/app/_components/ui";
import { SectionHeading } from "./reportUi";
import { Collapse } from "@/app/portal/_components/Collapse";

// ─── Client-facing Prediction Track Record ───────────────────────────────────
// Read-only. No add/edit/delete controls — those stay in the internal
// PredictionAccuracySection (app/(os)/campaigns/[id]/_components). This is
// deliberately shown even when there's nothing to report yet: rather than
// hiding the section (the earlier recommendation in
// docs/client-portal-v2-report-audit.md), Janine asked for an honest,
// clearly-labeled "not active yet, here's what's needed" placeholder instead
// — same spirit as the sales demo showing what's possible, but truthful about
// the real campaign's actual state rather than fabricated numbers.

const VERDICT_STYLES: Record<string, string> = {
  Accurate: "bg-green-50 text-green-700 border-green-200",
  Close: "bg-amber-50 text-amber-700 border-amber-200",
  Off: "bg-red-50 text-red-700 border-red-200",
  Pending: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

const VERDICT_ICON: Record<string, string> = {
  Accurate: "✓",
  Close: "≈",
  Off: "✗",
  Pending: "⏳",
};

const VERDICT_ICON_TONE: Record<string, string> = {
  Accurate: "bg-emerald-500 text-white",
  Close: "bg-amber-400 text-white",
  Off: "bg-red-500 text-white",
  Pending: "bg-neutral-300 text-white",
};

function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${VERDICT_STYLES[verdict] ?? VERDICT_STYLES.Pending}`}
    >
      {verdict === "Pending" ? "Awaiting outcome" : verdict}
    </span>
  );
}

function SectionHeader() {
  return (
    <div className="mb-3">
      <SectionHeading
        title="Prediction track record"
        subtitle="Every target below was predicted and locked before we knew the outcome, then checked automatically against real results. Nothing is edited after the fact."
      />
    </div>
  );
}

// ─── Placeholder — data needed ────────────────────────────────────────────────
function NotActiveYet({ frameLocked }: { frameLocked: boolean }) {
  return (
    <div>
      <SectionHeader />
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-6 text-center">
        <p className="text-xs font-semibold text-neutral-600">Not active yet for this campaign</p>
        <p className="text-[11px] text-neutral-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
          {frameLocked
            ? "Your strategy brief is locked, but no measurable targets have been set for prediction tracking yet. Once they are, this section fills in automatically."
            : "Data needed: a locked strategy brief with measurable targets. Once your FRAME brief is locked, we automatically log the specific targets we're predicting — before we know if they're right."}
        </p>
        <p className="text-[10px] text-neutral-300 mt-3 max-w-sm mx-auto leading-relaxed">
          Once live, you&apos;ll see each prediction the moment it&apos;s made, and how it played out
          against real signal, outcome, and campaign data — checked weekly, nothing changed after
          the fact.
        </p>
      </div>
    </div>
  );
}

// ─── Populated state ──────────────────────────────────────────────────────────
function AccuracySummary({ records }: { records: PredictionAccuracyClientSafe[] }) {
  const resolved = records.filter((r) => r.verdict !== "Pending");
  const accurate = records.filter((r) => r.verdict === "Accurate").length;
  const pending = records.filter((r) => r.verdict === "Pending").length;
  const pct = resolved.length ? Math.round((accurate / resolved.length) * 100) : null;
  const smallSample = resolved.length > 0 && resolved.length < 5;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
        <span className="font-semibold text-neutral-700">{records.length}</span>
        <span className="text-neutral-500">predictions logged</span>
      </div>
      {pct !== null && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
          <span className="font-semibold text-green-700">{pct}%</span>
          <span className="text-green-600">accurate so far</span>
        </div>
      )}
      {pending > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
          <span className="font-semibold text-neutral-600">{pending}</span>
          <span className="text-neutral-400">awaiting outcome</span>
        </div>
      )}
      {smallSample && (
        <span className="text-[10px] text-neutral-400 italic">
          Based on {resolved.length} resolved prediction{resolved.length !== 1 ? "s" : ""} so far —
          more builds in as the campaign runs.
        </span>
      )}
    </div>
  );
}

function PredictionRow({ record }: { record: PredictionAccuracyClientSafe }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5">
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            VERDICT_ICON_TONE[record.verdict] ?? VERDICT_ICON_TONE.Pending
          }`}
        >
          {VERDICT_ICON[record.verdict] ?? "?"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
              {record.category}
            </span>
          </div>
          <p className="text-xs text-neutral-800 leading-snug">{record.prediction_text}</p>
          {(record.predicted_value != null || record.actual_value != null) && (
            <div className="flex items-center gap-3 mt-1">
              {record.predicted_value != null && (
                <span className="text-[10px] text-neutral-500">
                  Predicted <strong className="text-neutral-700">{record.predicted_value}{record.unit ?? ""}</strong>
                </span>
              )}
              {record.actual_value != null && (
                <span className="text-[10px] text-neutral-500">
                  Actual <strong className="text-neutral-700">{record.actual_value}{record.unit ?? ""}</strong>
                </span>
              )}
            </div>
          )}
        </div>
        <VerdictBadge verdict={record.verdict} />
      </div>
    </div>
  );
}

// ─── Methodology explainer — how a miss gets handled ─────────────────────────
// Static trust copy, not campaign data. Answers the natural next question a
// client asks the first time they see "Off" or "Close" on this list: does a
// miss mean we were wrong and did nothing? No — every miss follows the same
// four-step check. Collapsed by default so it doesn't compete with the
// records themselves; only worth reading once, not on every visit.
function MissMethodology() {
  return (
    <Collapse label="What happens when a prediction misses" variant="inline">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3 space-y-2">
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          A miss isn&apos;t hidden or re-scored after the fact. Every "Off" or "Close" verdict above
          goes through the same check before the next report:
        </p>
        <ol className="text-[11px] text-neutral-500 leading-relaxed space-y-1 list-decimal list-inside">
          <li>How far the actual result sat from the predicted target, and since when.</li>
          <li>Whether an external factor (seasonality, a platform change, a competitor move) explains the gap.</li>
          <li>Whether the target itself needs recalibrating, or the plan does.</li>
          <li>A revised outlook, logged before the next result comes in — not adjusted after.</li>
        </ol>
      </div>
    </Collapse>
  );
}

export function PredictionTrackSection({
  records,
  frameLocked,
}: {
  records: PredictionAccuracyClientSafe[];
  frameLocked: boolean;
}) {
  if (records.length === 0) {
    return <NotActiveYet frameLocked={frameLocked} />;
  }

  return (
    <div>
      <SectionHeader />
      <Card className="space-y-3">
        <AccuracySummary records={records} />
        <div className="space-y-2">
          {records.map((r) => (
            <PredictionRow key={r.id} record={r} />
          ))}
        </div>
        <MissMethodology />
      </Card>
    </div>
  );
}
