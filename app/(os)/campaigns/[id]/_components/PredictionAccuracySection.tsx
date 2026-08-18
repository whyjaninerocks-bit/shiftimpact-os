"use client";

import { useState, useTransition } from "react";
import type { PredictionAccuracy } from "@/lib/data";

// ─── Verdict badge ────────────────────────────────────────────────────────────
const VERDICT_STYLES: Record<string, string> = {
  Accurate: "bg-green-50 text-green-700 border-green-200",
  Close: "bg-amber-50 text-amber-700 border-amber-200",
  Off: "bg-red-50 text-red-700 border-red-200",
  Pending: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${VERDICT_STYLES[verdict] ?? VERDICT_STYLES.Pending}`}
    >
      {verdict}
    </span>
  );
}

const CATEGORY_OPTIONS = ["Signal", "Outcome", "Gate", "Behaviour"] as const;

// ─── Accuracy strip ───────────────────────────────────────────────────────────
function AccuracyStrip({ records }: { records: PredictionAccuracy[] }) {
  const resolved = records.filter((r) => r.verdict !== "Pending");
  const accurate = records.filter((r) => r.verdict === "Accurate").length;
  const close = records.filter((r) => r.verdict === "Close").length;
  const off = records.filter((r) => r.verdict === "Off").length;
  const pending = records.filter((r) => r.verdict === "Pending").length;
  const pct = resolved.length ? Math.round((accurate / resolved.length) * 100) : null;

  return (
    <div className="flex flex-wrap gap-3 text-xs mb-4">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
        <span className="font-semibold text-neutral-700">{records.length}</span>
        <span className="text-neutral-500">total</span>
      </div>
      {pct !== null && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
          <span className="font-semibold text-green-700">{pct}%</span>
          <span className="text-green-600">accuracy rate</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-100">
        <span className="font-semibold text-green-700">{accurate}</span>
        <span className="text-green-600">accurate</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
        <span className="font-semibold text-amber-700">{close}</span>
        <span className="text-amber-600">close</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
        <span className="font-semibold text-red-700">{off}</span>
        <span className="text-red-600">off</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
        <span className="font-semibold text-neutral-600">{pending}</span>
        <span className="text-neutral-400">pending</span>
      </div>
    </div>
  );
}

// ─── Record outcome inline form ───────────────────────────────────────────────
function RecordOutcomeForm({
  record,
  onSaved,
}: {
  record: PredictionAccuracy;
  onSaved: (updated: PredictionAccuracy) => void;
}) {
  const [open, setOpen] = useState(false);
  const [actualValue, setActualValue] = useState(
    record.actual_value != null ? String(record.actual_value) : ""
  );
  const [outcomeWeek, setOutcomeWeek] = useState(
    record.outcome_week != null ? String(record.outcome_week) : ""
  );
  const [outcomeNote, setOutcomeNote] = useState(record.outcome_note ?? "");
  const [verdict, setVerdict] = useState<string>(record.verdict);
  const [saving, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await fetch(`/api/prediction-accuracy/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_value: actualValue !== "" ? parseFloat(actualValue) : null,
          outcome_week: outcomeWeek !== "" ? parseInt(outcomeWeek) : null,
          outcome_note: outcomeNote || null,
          verdict,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSaved(updated);
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] text-neutral-400 hover:text-indigo-600 underline underline-offset-2 transition-colors"
      >
        {record.verdict === "Pending" ? "Record outcome" : "Edit outcome"}
      </button>
    );
  }

  return (
    <div className="mt-2 p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
            Actual value{record.unit ? ` (${record.unit})` : ""}
          </label>
          <input
            type="number"
            step="any"
            value={actualValue}
            onChange={(e) => setActualValue(e.target.value)}
            className="w-full border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
            placeholder="e.g. 7.4"
          />
        </div>
        <div className="w-20">
          <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
            Outcome wk
          </label>
          <input
            type="number"
            value={outcomeWeek}
            onChange={(e) => setOutcomeWeek(e.target.value)}
            className="w-full border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
            placeholder="4"
          />
        </div>
        <div className="w-28">
          <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
            Override verdict
          </label>
          <select
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
            className="w-full border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
          >
            {["Accurate", "Close", "Off", "Pending"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
          Note (why it hit or missed)
        </label>
        <input
          type="text"
          value={outcomeNote}
          onChange={(e) => setOutcomeNote(e.target.value)}
          className="w-full border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
          placeholder="e.g. Save rate suppressed by competitor campaign in week 3"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1 rounded border border-neutral-200 text-xs text-neutral-500 hover:bg-neutral-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PredictionAccuracySection({
  campaignId,
  initialRecords,
}: {
  campaignId: string;
  initialRecords: PredictionAccuracy[];
}) {
  const [records, setRecords] = useState<PredictionAccuracy[]>(initialRecords);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, startAdd] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{ reconciled: number; verdicts: Record<string, number> } | null>(null);

  async function handleReconcile() {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await fetch("/api/prediction-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const data = await res.json();
      if (res.ok) {
        setReconcileResult(data);
        // Reload records to show updated verdicts
        const reloadRes = await fetch(`/api/prediction-accuracy?campaign_id=${campaignId}`);
        if (reloadRes.ok) {
          const reloaded = await reloadRes.json();
          if (Array.isArray(reloaded)) setRecords(reloaded);
        }
      }
    } catch {
      // silent
    } finally {
      setReconciling(false);
    }
  }

  // Add form state
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("Signal");
  const [predictionText, setPredictionText] = useState("");
  const [predictedValue, setPredictedValue] = useState("");
  const [unit, setUnit] = useState("");
  const [predictionWeek, setPredictionWeek] = useState("");

  function handleAdd() {
    if (!predictionText.trim()) return;
    startAdd(async () => {
      const res = await fetch("/api/prediction-accuracy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          category,
          prediction_text: predictionText.trim(),
          predicted_value: predictedValue !== "" ? parseFloat(predictedValue) : null,
          unit: unit.trim() || null,
          prediction_week: predictionWeek !== "" ? parseInt(predictionWeek) : null,
        }),
      });
      if (res.ok) {
        const row = await res.json();
        setRecords((prev) => [row, ...prev]);
        setPredictionText("");
        setPredictedValue("");
        setUnit("");
        setPredictionWeek("");
        setShowAdd(false);
      }
    });
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const res = await fetch(`/api/prediction-accuracy/${id}`, { method: "DELETE" });
      if (res.ok) setRecords((prev) => prev.filter((r) => r.id !== id));
    });
  }

  function handleOutcomeSaved(updated: PredictionAccuracy) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  return (
    <section id="prediction-log">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Prediction Accuracy Log</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Blind Mirror Test — record predictions before outcomes are known, then log actuals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReconcile}
            disabled={reconciling}
            className="flex items-center gap-1 px-3 py-1 rounded-full border border-neutral-200 bg-white text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-60 transition-colors"
          >
            <span className="text-purple-500">✦</span>
            {reconciling ? "Reconciling…" : "Auto-Reconcile"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((p) => !p)}
            className="px-3 py-1 rounded-full border border-neutral-200 bg-white text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
          >
            {showAdd ? "Cancel" : "+ Add prediction"}
          </button>
        </div>
      </div>
      {reconcileResult && (
        <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          Reconciled {reconcileResult.reconciled} prediction{reconcileResult.reconciled !== 1 ? "s" : ""}.
          {Object.entries(reconcileResult.verdicts ?? {}).map(([v, n]) => ` ${n} ${v}`).join(",")}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Prediction week
              </label>
              <input
                type="number"
                value={predictionWeek}
                onChange={(e) => setPredictionWeek(e.target.value)}
                placeholder="e.g. 1"
                className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Prediction (plain language)
            </label>
            <input
              type="text"
              value={predictionText}
              onChange={(e) => setPredictionText(e.target.value)}
              placeholder="e.g. Save rate will reach 8% by week 4"
              className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Predicted value (optional)
              </label>
              <input
                type="number"
                step="any"
                value={predictedValue}
                onChange={(e) => setPredictedValue(e.target.value)}
                placeholder="e.g. 8"
                className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Unit (optional)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. %, x, units"
                className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !predictionText.trim()}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {adding ? "Saving…" : "Log prediction"}
          </button>
        </div>
      )}

      {/* Stats strip */}
      {records.length > 0 && <AccuracyStrip records={records} />}

      {/* Records list */}
      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 py-10 text-center">
          <p className="text-xs text-neutral-400">No predictions logged yet.</p>
          <p className="text-[10px] text-neutral-300 mt-1">
            Add a prediction before the outcome is known — record the actual when results are in.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-3"
            >
              <div className="flex items-start gap-3">
                {/* Category pill */}
                <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-500 border border-neutral-200">
                  {record.category}
                </span>

                {/* Prediction content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-800 leading-snug">{record.prediction_text}</p>

                  {/* Predicted vs actual row */}
                  {(record.predicted_value != null || record.actual_value != null) && (
                    <div className="flex items-center gap-3 mt-1.5">
                      {record.predicted_value != null && (
                        <span className="text-[10px] text-neutral-500">
                          Predicted:{" "}
                          <strong className="text-neutral-700">
                            {record.predicted_value}{record.unit ?? ""}
                          </strong>
                        </span>
                      )}
                      {record.actual_value != null && (
                        <span className="text-[10px] text-neutral-500">
                          Actual:{" "}
                          <strong className="text-neutral-700">
                            {record.actual_value}{record.unit ?? ""}
                          </strong>
                        </span>
                      )}
                      {record.accuracy_pct != null && (
                        <span className="text-[10px] text-neutral-400">
                          ({record.accuracy_pct}% deviation)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-1">
                    {record.prediction_week != null && (
                      <span className="text-[10px] text-neutral-400">Wk {record.prediction_week}</span>
                    )}
                    {record.outcome_week != null && (
                      <span className="text-[10px] text-neutral-400">→ outcome wk {record.outcome_week}</span>
                    )}
                    {record.outcome_note && (
                      <span className="text-[10px] text-neutral-400 italic truncate max-w-xs">
                        "{record.outcome_note}"
                      </span>
                    )}
                  </div>

                  {/* Outcome form */}
                  <RecordOutcomeForm record={record} onSaved={handleOutcomeSaved} />
                </div>

                {/* Right side — verdict + delete */}
                <div className="shrink-0 flex items-center gap-2">
                  <VerdictBadge verdict={record.verdict} />
                  <button
                    type="button"
                    onClick={() => handleDelete(record.id)}
                    disabled={deleting}
                    className="text-xs text-neutral-300 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
