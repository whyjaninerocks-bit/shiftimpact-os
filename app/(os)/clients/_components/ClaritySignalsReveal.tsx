"use client";

import { useState } from "react";
import Link from "next/link";

interface Signal {
  id: string;
  brand_name: string;
  campaign_name: string | null;
  created_at: string;
}

interface Props {
  signals: Signal[];
}

export function ClaritySignalsReveal({ signals }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (signals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          Recent Clarity Signals
        </p>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-800 border border-neutral-200 rounded-full px-3 py-1 transition-colors"
        >
          {revealed ? "Hide" : `Show (${signals.length})`}
        </button>
      </div>

      {revealed && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-neutral-100 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{s.brand_name}</p>
                <p className="text-xs text-neutral-400 truncate">{s.campaign_name}</p>
                <p className="text-[10px] text-neutral-300 mt-1">
                  {new Date(s.created_at).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Link
                  href={`/clarity-signal/${s.id}`}
                  className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-800 border border-neutral-200 rounded px-2 py-1 transition-colors"
                >
                  View Signal
                </Link>
                <Link
                  href={`/audit?signal_id=${s.id}`}
                  className="text-[10px] font-semibold text-white bg-neutral-900 hover:bg-neutral-700 rounded px-2 py-1 transition-colors text-center"
                >
                  Generate Snapshot →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
