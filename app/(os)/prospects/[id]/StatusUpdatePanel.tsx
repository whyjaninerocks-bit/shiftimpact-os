"use client";
// StatusUpdatePanel.tsx
// Inline pipeline controls: status, tier, partner tag.
// All updates call PATCH /api/prospect-companies and refresh the page.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Status  = "Watching" | "Qualified" | "Pursuing" | "Client" | "Archived";
type Tier    = "Tier 1 Hot" | "Tier 2 Warm" | "Tier 3 Watch" | null;
type Partner = "ShiftImpact" | "AOAI" | "Both" | null;

interface Props {
  companyId: string;
  currentStatus:  Status;
  currentTier:    Tier;
  currentPartner: Partner;
}

const STATUSES: { label: Status; colors: string; activeColors: string }[] = [
  { label: "Watching",  colors: "border-neutral-200 text-neutral-500 hover:border-neutral-400", activeColors: "border-neutral-700 bg-neutral-100 text-neutral-900 font-semibold" },
  { label: "Qualified", colors: "border-blue-200 text-blue-500 hover:border-blue-400",           activeColors: "border-blue-600 bg-blue-50 text-blue-800 font-semibold" },
  { label: "Pursuing",  colors: "border-amber-200 text-amber-600 hover:border-amber-400",        activeColors: "border-amber-500 bg-amber-50 text-amber-800 font-semibold" },
  { label: "Client",    colors: "border-green-200 text-green-600 hover:border-green-400",         activeColors: "border-green-600 bg-green-50 text-green-800 font-semibold" },
  { label: "Archived",  colors: "border-neutral-200 text-neutral-400 hover:border-neutral-300",  activeColors: "border-neutral-400 bg-neutral-50 text-neutral-600 font-semibold" },
];

const TIERS: { label: Tier; colors: string; activeColors: string }[] = [
  { label: "Tier 1 Hot",   colors: "border-red-200 text-red-500 hover:border-red-400",           activeColors: "border-red-500 bg-red-50 text-red-800 font-semibold" },
  { label: "Tier 2 Warm",  colors: "border-amber-200 text-amber-500 hover:border-amber-400",     activeColors: "border-amber-500 bg-amber-50 text-amber-800 font-semibold" },
  { label: "Tier 3 Watch", colors: "border-neutral-200 text-neutral-400 hover:border-neutral-300", activeColors: "border-neutral-400 bg-neutral-50 text-neutral-600 font-semibold" },
];

const PARTNERS: { label: Partner; colors: string; activeColors: string }[] = [
  { label: "ShiftImpact", colors: "border-blue-200 text-blue-500 hover:border-blue-400",       activeColors: "border-blue-600 bg-blue-50 text-blue-800 font-semibold" },
  { label: "AOAI",        colors: "border-green-200 text-green-600 hover:border-green-400",    activeColors: "border-green-600 bg-green-50 text-green-800 font-semibold" },
  { label: "Both",        colors: "border-purple-200 text-purple-600 hover:border-purple-400", activeColors: "border-purple-600 bg-purple-50 text-purple-800 font-semibold" },
];

export function StatusUpdatePanel({ companyId, currentStatus, currentTier, currentPartner }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status,  setStatus]  = useState<Status>(currentStatus);
  const [tier,    setTier]    = useState<Tier>(currentTier);
  const [partner, setPartner] = useState<Partner>(currentPartner);
  const [error,   setError]   = useState<string | null>(null);

  async function patch(fields: Record<string, string | null>) {
    setError(null);
    const res = await fetch("/api/prospect-companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: companyId, ...fields }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Update failed");
      return false;
    }
    return true;
  }

  async function handleStatus(next: Status) {
    if (next === status) return;
    setStatus(next);
    const ok = await patch({ status: next });
    if (!ok) setStatus(status); // revert on error
    else startTransition(() => router.refresh());
  }

  async function handleTier(next: Tier) {
    // Toggle off if clicking active tier
    const newTier = next === tier ? null : next;
    setTier(newTier);
    const ok = await patch({ prospect_tier: newTier });
    if (!ok) setTier(tier);
    else startTransition(() => router.refresh());
  }

  async function handlePartner(next: Partner) {
    const newPartner = next === partner ? null : next;
    setPartner(newPartner);
    const ok = await patch({ partner_tag: newPartner });
    if (!ok) setPartner(partner);
    else startTransition(() => router.refresh());
  }

  return (
    <div className={`rounded-xl border border-neutral-200 bg-white px-4 py-3 space-y-3 shadow-sm ${isPending ? "opacity-70" : ""}`}>
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Pipeline</p>

      {/* Status */}
      <div className="space-y-1">
        <p className="text-xs text-neutral-400">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(s => (
            <button
              key={s.label}
              onClick={() => handleStatus(s.label)}
              disabled={isPending}
              className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                status === s.label ? s.activeColors : s.colors
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tier */}
      <div className="space-y-1">
        <p className="text-xs text-neutral-400">Tier <span className="text-neutral-300">(click to toggle)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map(t => (
            <button
              key={t.label}
              onClick={() => handleTier(t.label)}
              disabled={isPending}
              className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                tier === t.label ? t.activeColors : t.colors
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Partner */}
      <div className="space-y-1">
        <p className="text-xs text-neutral-400">Partner lens <span className="text-neutral-300">(click to toggle)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {PARTNERS.map(p => (
            <button
              key={p.label}
              onClick={() => handlePartner(p.label)}
              disabled={isPending}
              className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                partner === p.label ? p.activeColors : p.colors
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
