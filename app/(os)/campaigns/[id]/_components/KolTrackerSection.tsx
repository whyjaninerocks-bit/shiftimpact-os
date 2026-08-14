"use client";

// KolTrackerSection — per-campaign KOL / Influencer registry
// Tracks creator name, platform, tier, follower count, brief status, performance note.
// Links to the KOL/Influencer active channel from the brief link.

import { useState, useCallback } from "react";
import {
  Card,
  SectionTitle,
  Badge,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";

type KolTracker = {
  id: string;
  campaign_id: string;
  name: string;
  platform: string;
  tier: string;
  follower_count: number | null;
  brief_status: string;
  performance_note: string | null;
  created_at: string;
};

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "X", "Other"];
const TIERS = ["Nano", "Micro", "Macro", "Mega"];
const BRIEF_STATUSES = ["Pending", "Briefed", "Content Live", "Complete"];

const TIER_TONE: Record<string, "neutral" | "blue" | "green" | "amber"> = {
  Nano:  "neutral",
  Micro: "blue",
  Macro: "green",
  Mega:  "amber",
};

const STATUS_TONE: Record<string, "neutral" | "blue" | "green" | "amber"> = {
  Pending:       "neutral",
  Briefed:       "blue",
  "Content Live": "amber",
  Complete:      "green",
};

function formatFollowers(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

// ─── KOL Row ──────────────────────────────────────────────────────────────────

function KolRow({ kol, campaignId, onUpdated, onDeleted }: {
  kol: KolTracker;
  campaignId: string;
  onUpdated: (updated: KolTracker) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(kol);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/kol-trackers/${kol.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          platform: draft.platform,
          tier: draft.tier,
          follower_count: draft.follower_count,
          brief_status: draft.brief_status,
          performance_note: draft.performance_note,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${kol.name}?`)) return;
    await fetch(`/api/kol-trackers/${kol.id}`, { method: "DELETE" });
    onDeleted(kol.id);
  }

  if (editing) {
    return (
      <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Name / Handle</label>
            <input className={inputClass} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Platform</label>
            <select className={inputClass} value={draft.platform} onChange={e => setDraft(d => ({ ...d, platform: e.target.value }))}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tier</label>
            <select className={inputClass} value={draft.tier} onChange={e => setDraft(d => ({ ...d, tier: e.target.value }))}>
              {TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Followers</label>
            <input type="number" className={inputClass} value={draft.follower_count ?? ""} onChange={e => setDraft(d => ({ ...d, follower_count: e.target.value ? parseInt(e.target.value) : null }))} placeholder="e.g. 125000" />
          </div>
          <div>
            <label className={labelClass}>Brief Status</label>
            <select className={inputClass} value={draft.brief_status} onChange={e => setDraft(d => ({ ...d, brief_status: e.target.value }))}>
              {BRIEF_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Performance Note</label>
          <textarea className={inputClass} rows={2} value={draft.performance_note ?? ""} onChange={e => setDraft(d => ({ ...d, performance_note: e.target.value || null }))} placeholder="Views, engagement rate, key result…" />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={handleSave} disabled={saving} className={buttonClass}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => { setDraft(kol); setEditing(false); }} className={buttonSecondaryClass}>Cancel</button>
          <button type="button" onClick={handleDelete} className="ml-auto text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-100 rounded-lg px-3 py-2.5 flex items-start gap-3 hover:bg-neutral-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-neutral-800">{kol.name}</span>
          <span className="text-xs text-neutral-400">{kol.platform}</span>
          <Badge tone={TIER_TONE[kol.tier] ?? "neutral"}>{kol.tier}</Badge>
          <Badge tone={STATUS_TONE[kol.brief_status] ?? "neutral"}>{kol.brief_status}</Badge>
          {kol.follower_count && (
            <span className="text-xs text-neutral-500">{formatFollowers(kol.follower_count)} followers</span>
          )}
        </div>
        {kol.performance_note && (
          <p className="text-xs text-neutral-500 truncate">{kol.performance_note}</p>
        )}
      </div>
      <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-xs text-neutral-400 hover:text-neutral-700 mt-0.5">
        Edit
      </button>
    </div>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddKolForm({ campaignId, onAdded }: { campaignId: string; onAdded: (kol: KolTracker) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", platform: "TikTok", tier: "Micro", follower_count: "", brief_status: "Pending", performance_note: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/kol-trackers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          name: form.name,
          platform: form.platform,
          tier: form.tier,
          follower_count: form.follower_count ? parseInt(form.follower_count) : null,
          brief_status: form.brief_status,
          performance_note: form.performance_note || null,
        }),
      });
      const kol = await res.json();
      if (!res.ok) throw new Error(kol.error);
      onAdded(kol);
      setForm({ name: "", platform: "TikTok", tier: "Micro", follower_count: "", brief_status: "Pending", performance_note: "" });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonSecondaryClass}>
        + Add Creator
      </button>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 space-y-2.5">
      <p className="text-xs font-semibold text-neutral-600">New KOL / Creator</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Name / Handle</label>
          <input className={inputClass} value={form.name} onChange={e => setForm(d => ({ ...d, name: e.target.value }))} placeholder="@handle or creator name" required />
        </div>
        <div>
          <label className={labelClass}>Platform</label>
          <select className={inputClass} value={form.platform} onChange={e => setForm(d => ({ ...d, platform: e.target.value }))}>
            {PLATFORMS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Tier</label>
          <select className={inputClass} value={form.tier} onChange={e => setForm(d => ({ ...d, tier: e.target.value }))}>
            {TIERS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Followers</label>
          <input type="number" className={inputClass} value={form.follower_count} onChange={e => setForm(d => ({ ...d, follower_count: e.target.value }))} placeholder="e.g. 125000" />
        </div>
        <div>
          <label className={labelClass}>Brief Status</label>
          <select className={inputClass} value={form.brief_status} onChange={e => setForm(d => ({ ...d, brief_status: e.target.value }))}>
            {BRIEF_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Performance Note</label>
        <textarea className={inputClass} rows={2} value={form.performance_note} onChange={e => setForm(d => ({ ...d, performance_note: e.target.value }))} placeholder="Views, engagement rate, key result…" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSubmit as (e: React.FormEvent) => void} disabled={saving || !form.name} className={buttonClass}>{saving ? "Adding…" : "Add Creator"}</button>
        <button type="button" onClick={() => setOpen(false)} className={buttonSecondaryClass}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function KolTrackerSection({ campaignId, initialKols }: {
  campaignId: string;
  initialKols: KolTracker[];
}) {
  const [kols, setKols] = useState<KolTracker[]>(initialKols);

  const handleAdded = useCallback((kol: KolTracker) => setKols(prev => [...prev, kol]), []);
  const handleUpdated = useCallback((updated: KolTracker) => setKols(prev => prev.map(k => k.id === updated.id ? updated : k)), []);
  const handleDeleted = useCallback((id: string) => setKols(prev => prev.filter(k => k.id !== id)), []);

  const byStatus: Record<string, KolTracker[]> = {
    Pending: kols.filter(k => k.brief_status === "Pending"),
    Briefed: kols.filter(k => k.brief_status === "Briefed"),
    "Content Live": kols.filter(k => k.brief_status === "Content Live"),
    Complete: kols.filter(k => k.brief_status === "Complete"),
  };
  const totalFollowers = kols.reduce((sum, k) => sum + (k.follower_count ?? 0), 0);

  return (
    <section id="kol-tracker">
      <SectionTitle>KOL / Influencer Tracker</SectionTitle>

      {kols.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500 mb-3">No creators tracked yet. Add KOLs selected for this campaign to track brief status and performance.</p>
          <AddKolForm campaignId={campaignId} onAdded={handleAdded} />
        </Card>
      ) : (
        <Card>
          {/* Summary strip */}
          <div className="flex items-center gap-4 flex-wrap mb-4 pb-3 border-b border-neutral-100 text-xs text-neutral-500">
            <span><span className="font-semibold text-neutral-800">{kols.length}</span> creators</span>
            {totalFollowers > 0 && (
              <span><span className="font-semibold text-neutral-800">{formatFollowers(totalFollowers)}</span> total reach</span>
            )}
            {BRIEF_STATUSES.map(s => {
              const count = byStatus[s]?.length ?? 0;
              if (!count) return null;
              return (
                <span key={s}>
                  <Badge tone={STATUS_TONE[s] ?? "neutral"}>{s}</Badge>
                  <span className="ml-1">{count}</span>
                </span>
              );
            })}
          </div>

          <div className="space-y-2">
            {kols.map(kol => (
              <KolRow key={kol.id} kol={kol} campaignId={campaignId} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-100">
            <AddKolForm campaignId={campaignId} onAdded={handleAdded} />
          </div>
        </Card>
      )}
    </section>
  );
}
