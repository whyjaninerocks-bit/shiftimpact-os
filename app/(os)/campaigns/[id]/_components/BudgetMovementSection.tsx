"use client";

// BudgetMovementSection — channel-level planned vs actual spend tracker
// Surfaces variance (over/under) per channel per week.
// Fills the gap: campaign workspace had no spend tracking vs plan.

import { useState, useCallback } from "react";
import { Card, SectionTitle, Badge, buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";

type BudgetMovement = {
  id: string;
  campaign_id: string;
  channel: string;
  week_number: number;
  planned_spend: number | null;
  actual_spend: number | null;
  currency: string;
  note: string | null;
  created_at: string;
};

function fmt(n: number | null, currency: string): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-MY", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function varianceTone(planned: number | null, actual: number | null): "green" | "amber" | "red" | "neutral" {
  if (planned == null || actual == null) return "neutral";
  const pct = (actual - planned) / planned;
  if (pct <= 0.05) return "green";
  if (pct <= 0.15) return "amber";
  return "red";
}

function varianceLabel(planned: number | null, actual: number | null): string {
  if (planned == null || actual == null) return "—";
  const diff = actual - planned;
  const pct = Math.abs((diff / planned) * 100).toFixed(0);
  return diff >= 0 ? `+${pct}% over` : `${pct}% under`;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function BudgetRow({ row, onUpdated, onDeleted }: {
  row: BudgetMovement;
  onUpdated: (r: BudgetMovement) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(row);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/budget-movements/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: draft.channel,
          week_number: draft.week_number,
          planned_spend: draft.planned_spend,
          actual_spend: draft.actual_spend,
          currency: draft.currency,
          note: draft.note,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      onUpdated(updated);
      setEditing(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Remove this budget entry?`)) return;
    await fetch(`/api/budget-movements/${row.id}`, { method: "DELETE" });
    onDeleted(row.id);
  }

  if (editing) {
    return (
      <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Channel</label>
            <input className={inputClass} value={draft.channel} onChange={e => setDraft(d => ({ ...d, channel: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Week</label>
            <input type="number" min={1} className={inputClass} value={draft.week_number} onChange={e => setDraft(d => ({ ...d, week_number: parseInt(e.target.value) || 1 }))} />
          </div>
          <div>
            <label className={labelClass}>Planned ({draft.currency})</label>
            <input type="number" className={inputClass} value={draft.planned_spend ?? ""} onChange={e => setDraft(d => ({ ...d, planned_spend: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Actual ({draft.currency})</label>
            <input type="number" className={inputClass} value={draft.actual_spend ?? ""} onChange={e => setDraft(d => ({ ...d, actual_spend: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Note</label>
          <input className={inputClass} value={draft.note ?? ""} onChange={e => setDraft(d => ({ ...d, note: e.target.value || null }))} placeholder="Reason for variance, reallocation note…" />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={handleSave} disabled={saving} className={buttonClass}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => { setDraft(row); setEditing(false); }} className={buttonSecondaryClass}>Cancel</button>
          <button type="button" onClick={handleDelete} className="ml-auto text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
      </div>
    );
  }

  const tone = varianceTone(row.planned_spend, row.actual_spend);
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5 border border-neutral-100 rounded-lg hover:bg-neutral-50 text-sm">
      <div>
        <span className="font-medium text-neutral-800">{row.channel}</span>
        <span className="ml-2 text-xs text-neutral-400">Wk {row.week_number}</span>
        {row.note && <p className="text-xs text-neutral-400 mt-0.5 truncate">{row.note}</p>}
      </div>
      <span className="text-xs text-neutral-500 text-right">{fmt(row.planned_spend, row.currency)}</span>
      <span className="text-xs text-neutral-700 font-medium text-right">{fmt(row.actual_spend, row.currency)}</span>
      {tone !== "neutral" ? (
        <Badge tone={tone}>{varianceLabel(row.planned_spend, row.actual_spend)}</Badge>
      ) : (
        <span className="text-xs text-neutral-400">—</span>
      )}
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">Edit</button>
    </div>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

const DEFAULT_CHANNELS = ["Digital / Social", "KOL / Influencer", "PR / Earned Media", "Radio", "Retail / In-Store", "Other"];

function AddBudgetForm({ campaignId, onAdded, activeChannels }: {
  campaignId: string;
  onAdded: (r: BudgetMovement) => void;
  activeChannels: string[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const channels = activeChannels.length > 0 ? activeChannels : DEFAULT_CHANNELS;
  const [form, setForm] = useState({ channel: channels[0], week_number: "1", planned_spend: "", actual_spend: "", currency: "MYR", note: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/budget-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          channel: form.channel,
          week_number: parseInt(form.week_number) || 1,
          planned_spend: form.planned_spend ? parseFloat(form.planned_spend) : null,
          actual_spend: form.actual_spend ? parseFloat(form.actual_spend) : null,
          currency: form.currency,
          note: form.note || null,
        }),
      });
      const row = await res.json();
      if (!res.ok) throw new Error(row.error);
      onAdded(row);
      setForm(f => ({ ...f, planned_spend: "", actual_spend: "", note: "" }));
      setOpen(false);
    } finally { setSaving(false); }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className={buttonSecondaryClass}>+ Add Budget Entry</button>;

  return (
    <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 space-y-2.5">
      <p className="text-xs font-semibold text-neutral-600">New Budget Entry</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Channel</label>
          <select className={inputClass} value={form.channel} onChange={e => setForm(d => ({ ...d, channel: e.target.value }))}>
            {channels.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Week</label>
          <input type="number" min={1} className={inputClass} value={form.week_number} onChange={e => setForm(d => ({ ...d, week_number: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>Planned (MYR)</label>
          <input type="number" className={inputClass} value={form.planned_spend} onChange={e => setForm(d => ({ ...d, planned_spend: e.target.value }))} placeholder="0.00" />
        </div>
        <div>
          <label className={labelClass}>Actual (MYR)</label>
          <input type="number" className={inputClass} value={form.actual_spend} onChange={e => setForm(d => ({ ...d, actual_spend: e.target.value }))} placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Note</label>
        <input className={inputClass} value={form.note} onChange={e => setForm(d => ({ ...d, note: e.target.value }))} placeholder="Reallocation reason, channel note…" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleSubmit as (e: React.FormEvent) => void} disabled={saving} className={buttonClass}>{saving ? "Adding…" : "Add"}</button>
        <button type="button" onClick={() => setOpen(false)} className={buttonSecondaryClass}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function BudgetMovementSection({ campaignId, initialRows, activeChannels }: {
  campaignId: string;
  initialRows: BudgetMovement[];
  activeChannels: string[];
}) {
  const [rows, setRows] = useState<BudgetMovement[]>(initialRows);

  const handleAdded   = useCallback((r: BudgetMovement) => setRows(prev => [...prev, r].sort((a, b) => a.week_number - b.week_number || a.channel.localeCompare(b.channel))), []);
  const handleUpdated = useCallback((u: BudgetMovement) => setRows(prev => prev.map(r => r.id === u.id ? u : r)), []);
  const handleDeleted = useCallback((id: string) => setRows(prev => prev.filter(r => r.id !== id)), []);

  // Totals
  const totalPlanned = rows.reduce((s, r) => s + (r.planned_spend ?? 0), 0);
  const totalActual  = rows.reduce((s, r) => s + (r.actual_spend ?? 0), 0);
  const currency = rows[0]?.currency ?? "MYR";

  return (
    <section id="budget-movement">
      <SectionTitle>Budget Movement</SectionTitle>
      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500 mb-3">No budget entries yet. Track planned vs actual spend per channel to surface variance in real time.</p>
          <AddBudgetForm campaignId={campaignId} onAdded={handleAdded} activeChannels={activeChannels} />
        </Card>
      ) : (
        <Card>
          {/* Totals strip */}
          <div className="flex items-center gap-6 flex-wrap mb-4 pb-3 border-b border-neutral-100 text-xs">
            <div>
              <span className="text-neutral-400">Total planned</span>
              <span className="ml-2 font-semibold text-neutral-800">{fmt(totalPlanned, currency)}</span>
            </div>
            <div>
              <span className="text-neutral-400">Total actual</span>
              <span className="ml-2 font-semibold text-neutral-800">{fmt(totalActual, currency)}</span>
            </div>
            {totalPlanned > 0 && (
              <Badge tone={varianceTone(totalPlanned, totalActual)}>
                {varianceLabel(totalPlanned, totalActual)}
              </Badge>
            )}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 mb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            <span>Channel / Week</span>
            <span className="text-right">Planned</span>
            <span className="text-right">Actual</span>
            <span>Variance</span>
            <span></span>
          </div>

          <div className="space-y-1.5">
            {rows.map(row => (
              <BudgetRow key={row.id} row={row} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-100">
            <AddBudgetForm campaignId={campaignId} onAdded={handleAdded} activeChannels={activeChannels} />
          </div>
        </Card>
      )}
    </section>
  );
}
