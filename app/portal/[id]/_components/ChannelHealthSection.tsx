import type { ChannelHealthClientSafe } from "@/lib/data";
import { SectionHeading, StatusPill, DeltaTag } from "./reportUi";

// ─── Channel Health — client-facing ──────────────────────────────────────────
// Per-channel RAG status + the one signal each channel is judged on, latest
// week only. See getChannelHealthClientSafe for the ACCESS RULES boundary —
// no spend split, no raw delivery numbers.

export function ChannelHealthSection({ channels }: { channels: ChannelHealthClientSafe[] }) {
  if (channels.length === 0) return null;

  const latestWeek = Math.max(...channels.map((c) => c.week_number));

  return (
    <section className="space-y-3">
      <SectionHeading title="Channel health" subtitle={`Week ${latestWeek} — how each active channel is performing`} />
      <div className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100">
        {channels.map((c) => (
          <div key={c.campaign_channel_id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800 truncate">{c.channel_name}</p>
              <p className="text-xs text-neutral-400">{c.channel_role}</p>
            </div>
            <div className="text-right shrink-0">
              {c.signal_proxy_value != null && (
                <p className="text-xs text-neutral-500 mb-0.5">
                  {c.signal_proxy_label}: <span className="font-semibold text-neutral-700">{c.signal_proxy_value}</span>
                </p>
              )}
              <div className="mb-1">
                <DeltaTag current={c.signal_proxy_value} previous={c.previous_value} />
              </div>
              <StatusPill status={c.channel_health} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
