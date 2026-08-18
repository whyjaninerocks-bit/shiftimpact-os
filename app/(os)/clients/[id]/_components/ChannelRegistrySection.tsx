"use client";

import { useState } from "react";
import type { ClientChannel } from "@/lib/types";

interface Props {
  clientId: string;
  channels?: ClientChannel[];
}

const CAT_COLOR: Record<string, string> = {
  Radio:   "bg-purple-50 text-purple-700 border-purple-200",
  KOL:     "bg-pink-50 text-pink-700 border-pink-200",
  Retail:  "bg-amber-50 text-amber-700 border-amber-200",
  Digital: "bg-blue-50 text-blue-700 border-blue-200",
  PR:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  CRM:     "bg-indigo-50 text-indigo-700 border-indigo-200",
  Custom:  "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export function ChannelRegistrySection({ channels = [] }: Props) {
  const [local, setLocal] = useState<ClientChannel[]>(channels);
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggle(id: string, current: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/client-channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });
      if (res.ok) {
        setLocal(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c));
      }
    } finally {
      setToggling(null);
    }
  }

  const activeCount = local.filter(c => c.active).length;

  if (local.length === 0) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold text-neutral-900 mb-2">Channel Registry</h2>
        <p className="text-sm text-neutral-400">No channels configured.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-semibold text-neutral-900">Channel Registry</h2>
        <span className="text-xs text-neutral-400">{activeCount} of {local.length} active</span>
      </div>

      <div className="space-y-2">
        {local.map(ch => {
          const catCls = CAT_COLOR[ch.channel_category] ?? CAT_COLOR.Custom;
          return (
            <div
              key={ch.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-opacity ${
                ch.active ? "border-neutral-100 bg-neutral-50 opacity-100" : "border-neutral-50 bg-white opacity-40"
              }`}
            >
              <button
                onClick={() => toggle(ch.id, ch.active)}
                disabled={toggling === ch.id}
                aria-label={ch.active ? "Deactivate" : "Activate"}
                className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border transition-colors ${
                  ch.active ? "bg-neutral-900 border-neutral-900" : "bg-white border-neutral-300"
                } disabled:opacity-40`}
              >
                {ch.active && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-neutral-800">{ch.channel_name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catCls}`}>
                    {ch.channel_category}
                  </span>
                </div>
                {ch.translation_hint && (
                  <p className="mt-0.5 text-xs text-neutral-400 leading-relaxed">{ch.translation_hint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
