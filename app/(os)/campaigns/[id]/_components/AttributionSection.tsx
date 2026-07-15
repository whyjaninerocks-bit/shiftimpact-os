"use client";

// app/campaigns/[id]/_components/AttributionSection.tsx
// Feature 14B — Universal Business Outcome Attribution Framework (Sprint 4)
// Data capture layer only. AI-assisted MMM analysis: Sprint 5+.
//
// Three-lens methodology:
//   MMM      — Marketing Mix Modelling (quarterly, cross-channel aggregate)
//   Holdout  — Incrementality / Holdout Testing (per-channel, per-campaign)
//   Proxy    — Proxy Correlation (weekly signal-to-sales estimation)
//
// Strategy lead adds one record per channel per week.
// Minimum 12 weeks of MMM data before AI analysis is viable.
// INTERNAL ONLY.

import { useState, useTransition } from "react";
import { addAttributionRecord, deleteAttributionRecord } from "@/lib/actions";
import type { AttributionRecord } from "@/lib/types";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_TYPE_META: Record<string, { label: string; tone: "neutral" | "blue" | "purple" }> = {
  MMM:     { label: "MMM",     tone: "neutral" },
  Holdout: { label: "Holdout", tone: "blue"    },
  Proxy:   { label: "Proxy",   tone: "purple"  },
};

function fmtRM(val: number | null) {
  if (val == null) return "—";
  return `RM ${val.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Add record form ──────────────────────────────────────────────────────────

interface AddRecordFormProps {
  campaignId: string;
  suggestedWeek: number;
}

function AddRecordForm({ campaignId, suggestedWeek }: AddRecordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [weekNum, setWeekNum] = useState(String(suggestedWeek));
  const todayStr = new Date().toISOString().slice(0, 10);
  const [weekOf, setWeekOf] = useState(todayStr);
  const [channelName, setChannelName] = useState("");
  const [spendRm, setSpendRm] = useState("");
  const [salesUnits, setSalesUnits] = useState("");
  const [salesRm, setSalesRm] = useState("");
  const [liftPct, setLiftPct] = useState("");
  const [testType, setTestType] = useState("MMM");
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (!channelName.trim() || !weekNum) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("week_number",          weekNum);
      fd.append("week_of",              weekOf);
      fd.append("channel_name",         channelName.trim());
      fd.append("spend_rm",             spendRm);
      fd.append("sales_units",          salesUnits);
      fd.append("sales_rm",             salesRm);
      fd.append("incremental_lift_pct", liftPct);
      fd.append("test_type",            testType);
      fd.append("notes",                notes);
      await addAttributionRecord(campaignId, fd);
      // Reset form
      setChannelName("");
      setSpendRm("");
      setSalesUnits("");
      setSalesRm("");
      setLiftPct("");
      setNotes("");
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={buttonClass}>
        + Add Record
      </button>
    );
  }

  return (
    <Card className="mt-3 border-blue-200 bg-blue-50/30">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-neutral-700">New Attribution Record</p>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-700">Cancel</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Week #</label>
          <input type="number" min={1} value={weekNum} onChange={e => setWeekNum(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Week of</label>
          <input type="date" value={weekOf} onChange={e => setWeekOf(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Channel name *</label>
          <input value={channelName} onChange={e => setChannelName(e.target.value)}
            placeholder="e.g. Meta Paid Social, TikTok TopView, OOH Klang Valley"
            className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Spend (RM)</label>
          <input type="number" step="0.01" value={spendRm} onChange={e => setSpendRm(e.target.value)} className={inputClass} placeholder="0.00" />
        </div>
        <div>
          <label className={labelClass}>Incremental lift %</label>
          <input type="number" step="0.1" value={liftPct} onChange={e => setLiftPct(e.target.value)} className={inputClass} placeholder="Holdout result" />
        </div>
        <div>
          <label className={labelClass}>Sales units</label>
          <input type="number" value={salesUnits} onChange={e => setSalesUnits(e.target.value)} className={inputClass} placeholder="Total / sample" />
        </div>
        <div>
          <label className={labelClass}>Sales value (RM)</label>
          <input type="number" step="0.01" value={salesRm} onChange={e => setSalesRm(e.target.value)} className={inputClass} placeholder="0.00" />
        </div>
        <div>
          <label className={labelClass}>Data type</label>
          <select value={testType} onChange={e => setTestType(e.target.value)} className={inputClass}>
            <option value="MMM">MMM — weekly spend/sales for regression model</option>
            <option value="Holdout">Holdout — incrementality test result</option>
            <option value="Proxy">Proxy — signal-to-sales correlation estimate</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional context" className={inputClass} />
        </div>
      </div>

      <button onClick={handleAdd} disabled={isPending || !channelName.trim()} className={buttonClass + " mt-3"}>
        {isPending ? "Adding…" : "Add Record"}
      </button>
    </Card>
  );
}

// ─── Records table ────────────────────────────────────────────────────────────

interface RecordsTableProps {
  campaignId: string;
  records: AttributionRecord[];
}

function RecordsTable({ campaignId, records }: RecordsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (records.length === 0) return null;

  // Group by week
  const byWeek: Record<number, AttributionRecord[]> = {};
  for (const r of records) {
    if (!byWeek[r.week_number]) byWeek[r.week_number] = [];
    byWeek[r.week_number].push(r);
  }
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => b - a);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      await deleteAttributionRecord(id, campaignId);
      setDeletingId(null);
    });
  };

  return (
    <div className="mt-4 space-y-4">
      {weeks.map(w => (
        <Card key={w}>
          <p className="text-xs font-semibold text-neutral-500 mb-2">Week {w}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-1 pr-3 font-medium text-neutral-500">Channel</th>
                  <th className="text-left py-1 pr-3 font-medium text-neutral-500">Type</th>
                  <th className="text-right py-1 pr-3 font-medium text-neutral-500">Spend</th>
                  <th className="text-right py-1 pr-3 font-medium text-neutral-500">Sales (RM)</th>
                  <th className="text-right py-1 pr-3 font-medium text-neutral-500">Lift %</th>
                  <th className="text-left py-1 pr-3 font-medium text-neutral-500">Notes</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {byWeek[w].map(r => {
                  const ttm = TEST_TYPE_META[r.test_type] ?? TEST_TYPE_META.MMM;
                  return (
                    <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                      <td className="py-1.5 pr-3 font-medium text-neutral-800 whitespace-nowrap">{r.channel_name}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        <Badge tone={ttm.tone}>{ttm.label}</Badge>
                      </td>
                      <td className="py-1.5 pr-3 text-right whitespace-nowrap">{fmtRM(r.spend_rm)}</td>
                      <td className="py-1.5 pr-3 text-right whitespace-nowrap">{fmtRM(r.sales_rm)}</td>
                      <td className="py-1.5 pr-3 text-right whitespace-nowrap">
                        {r.incremental_lift_pct != null ? `${r.incremental_lift_pct}%` : "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-neutral-500 max-w-xs truncate">{r.notes || "—"}</td>
                      <td className="py-1.5">
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={isPending && deletingId === r.id}
                          className="text-neutral-300 hover:text-red-500 text-xs"
                          title="Remove"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── MMM readiness indicator ──────────────────────────────────────────────────

function MmmReadiness({ weekCount }: { weekCount: number }) {
  const pct = Math.min(100, Math.round((weekCount / 12) * 100));
  const ready = weekCount >= 12;
  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-neutral-600">MMM Data Readiness</p>
        <Badge tone={ready ? "green" : weekCount >= 6 ? "amber" : "neutral"}>
          {ready ? "Ready" : weekCount >= 6 ? "Building" : "Early"}
        </Badge>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${ready ? "bg-emerald-500" : weekCount >= 6 ? "bg-amber-400" : "bg-neutral-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-neutral-400 mt-1">
        {weekCount} of 12 weeks collected — {ready ? "MMM analysis viable in Sprint 5+." : `${12 - weekCount} more weeks needed before MMM regression is viable.`}
      </p>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AttributionSectionProps {
  campaignId: string;
  attributionRecords: AttributionRecord[];
}

export function AttributionSection({
  campaignId,
  attributionRecords,
}: AttributionSectionProps) {
  // Count distinct weeks that have records
  const weekCount = new Set(attributionRecords.map(r => r.week_number)).size;
  const latestWeek = attributionRecords[0]?.week_number ?? 0;
  const suggestedWeek = latestWeek + 1 || 1;

  return (
    <section id="attribution">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle id="attribution">Attribution Data Capture</SectionTitle>
        <Badge tone="neutral">F14B ⚿</Badge>
      </div>

      <p className="text-xs text-neutral-500 mb-4">
        Three-lens attribution framework (MMM / Holdout / Proxy). Enter weekly spend and sales data
        per channel. AI-assisted MMM analysis requires minimum 12 weeks — Sprint 5+.
      </p>

      <MmmReadiness weekCount={weekCount} />

      <AddRecordForm campaignId={campaignId} suggestedWeek={suggestedWeek} />

      <RecordsTable campaignId={campaignId} records={attributionRecords} />
    </section>
  );
}
