import Link from "next/link";

// ─── Needs-attention strip — client-facing ───────────────────────────────────
// Auto-aggregates anything red/amber already computed elsewhere on this page
// (a triggered guardrail, a compliance item logged "Not done", an at-risk or
// blocked gate) into one glanceable strip right under the hero, so the client
// doesn't have to scroll the whole report to find what actually needs a
// decision. Purely a summary/index of state that already exists on the page
// — it renders nothing new, just points at it. Returns null when everything
// is clean, matching the graceful-degradation pattern used everywhere else in
// this portal (no "all clear!" banner clutter on a good week).

type Flag = { href: string; label: string; detail: string };

export function NeedsAttentionStrip({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
        Needs your attention
      </p>
      <div className="space-y-1.5">
        {flags.map((f, i) => (
          <Link
            key={i}
            href={f.href}
            className="flex items-center justify-between gap-3 group hover:bg-amber-100/60 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
          >
            <div className="min-w-0">
              <span className="text-xs font-semibold text-amber-900">{f.label}</span>
              <span className="text-xs text-amber-700 ml-1.5">{f.detail}</span>
            </div>
            <span className="shrink-0 text-amber-500 group-hover:translate-x-0.5 transition-transform text-xs">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
