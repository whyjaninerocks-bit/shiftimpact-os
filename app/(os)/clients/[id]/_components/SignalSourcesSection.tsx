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

export function SignalSourcesSection({ sources = [] }: Props) {
  const [local, setLocal] = useState<ClientSignalSource[]>(sources);
  const [toggling, setToggling] = useState<string | null>(null);

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

  const activeCount = local.filter(s => s.active).length;

  if (local.length === 0) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold text-neutral-900 mb-2">Signal Sources</h2>
        <p className="text-sm text-neutral-400">No signal sources configured.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-semibold text-neutral-900">Signal Sources</h2>
        <span className="text-xs text-neutral-400">{activeCount} of {local.length} active</span>
      </div>

      <div className="space-y-2">
        {local.map(src => {
          const typeCls = TYPE_COLOR[src.source_type.toLowerCase()] ?? "bg-neutral-100 text-neutral-600 border-neutral-200";
          return (
            <div
              key={src.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-opacity ${
                src.active ? "border-neutral-100 bg-neutral-50 opacity-100" : "border-neutral-50 bg-white opacity-40"
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
