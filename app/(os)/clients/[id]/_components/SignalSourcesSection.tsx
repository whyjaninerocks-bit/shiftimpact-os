"use client";

import { useState } from "react";
import type { ClientSignalSource } from "@/lib/types";

interface Props {
  clientId: string;
  sources?: ClientSignalSource[];
}

const TYPE_COLOR: Record<string, string> = {
  quantitative: "bg-blue-50 text-blue-700 border-blue-200",
  qualitative:  "bg-purple-50 text-purple-700 border-purple-200",
  behavioral:   "bg-amber-50 text-amber-700 border-amber-200",
  media:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  social:       "bg-pink-50 text-pink-700 border-pink-200",
};

export function SignalSourcesSection({ clientId, sources = [] }: Props) {
  const [local, setLocal] = useState<ClientSignalSource[]>(sources);
  const [toggling, setToggling] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  async function toggle(id: string, current: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/signal-sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });
      if (res.ok) {
        setLocal(prev => prev.map(s => s.id === id ? { ...s, active: !current } : s));
      }
    } finally {
      setToggling(null);
    }
  }

  async function seedDefaults() {
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch(`/api/signal-sources/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSeedError(d.error ?? "Failed to seed signal sources");
        return;
      }
      const { sources: seeded } = await res.json();
      setLocal(seeded);
    } finally {
      setSeeding(false);
    }
  }

  const activeCount = local.filter(s => s.active).length;

  if (local.length === 0) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold text-neutral-900 mb-1">Signal Sources</h2>
        <p className="text-sm text-neutral-400 mb-4">
          Signal sources define which metrics you track to confirm campaign health.
          These feed the BMS dimensions and weekly digest.
        </p>
        {seedError && <p className="text-xs text-red-600 mb-2">{seedError}</p>}
        <button
          onClick={seedDefaults}
          disabled={seeding}
          className="text-sm font-semibold text-neutral-700 border border-neutral-300 rounded-lg px-4 py-2 hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          {seeding ? "Setting up…" : "Set up 13 standard signal sources"}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6" id="signal-sources">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-semibold text-neutral-900">Signal Sources</h2>
        <span className="text-xs text-neutral-400">{activeCount} of {local.length} active</span>
      </div>
      <p className="text-xs text-neutral-400 mb-3">
        Toggle sources you're actively tracking. Active sources appear in the BMS form and weekly digest.
      </p>

      <div className="space-y-2">
        {local.map(src => {
          const typeCls = TYPE_COLOR[src.source_type?.toLowerCase()] ?? "bg-neutral-100 text-neutral-600 border-neutral-200";
          return (
            <div
              key={src.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-opacity ${
                src.active ? "border-neutral-100 bg-neutral-50 opacity-100" : "border-dashed border-neutral-200 bg-white opacity-50"
              }`}
            >
              <button
                onClick={() => toggle(src.id, src.active)}
                disabled={toggling === src.id}
                aria-label={src.active ? "Deactivate" : "Activate"}
                className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border transition-colors ${
                  src.active ? "bg-neutral-900 border-neutral-900" : "bg-white border-neutral-300"
                } disabled:opacity-40`}
              >
                {src.active && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-neutral-800">{src.source_name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeCls}`}>
                    {src.source_type}
                  </span>
                  {src.unit && (
                    <span className="text-[10px] text-neutral-400">({src.unit})</span>
                  )}
                </div>
                {src.description && (
                  <p className="mt-0.5 text-xs text-neutral-400 leading-relaxed">{src.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
