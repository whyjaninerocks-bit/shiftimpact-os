// ─── Portal report visual kit — client-facing only ───────────────────────────
// Shared visual primitives for the real client portal, styled to match the
// editorial, story-led tone of the sales demo (app/portal/demo/page.tsx)
// instead of the flat internal-report look the portal used before. Scoped
// entirely to app/portal/[id]/_components/ — never imported by, and never
// imports from, app/_components/ui.tsx, which is shared by ~20 internal OS
// admin pages and must not change shape for this redesign.

import type { GateSignalStatus } from "@/lib/types";

// ─── Section heading ──────────────────────────────────────────────────────────
// Replaces the old tiny gray-caps <h2> used everywhere in the portal. Bold
// and dark instead of small and quiet — every section now reads like part of
// a report someone wrote, not a data-table label.
export function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">{title}</h2>
      {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Gate / RAG status pill ───────────────────────────────────────────────────
const GATE_STYLES: Record<string, string> = {
  Green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "On Track": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Amber: "bg-amber-50 text-amber-700 border-amber-200",
  "At Risk": "bg-amber-50 text-amber-700 border-amber-200",
  Red: "bg-red-50 text-red-700 border-red-200",
  Blocked: "bg-red-50 text-red-700 border-red-200",
  Pending: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

const GATE_DOT_STYLES: Record<string, string> = {
  Green: "bg-emerald-500",
  "On Track": "bg-emerald-500",
  Amber: "bg-amber-400",
  "At Risk": "bg-amber-400",
  Red: "bg-red-500",
  Blocked: "bg-red-500",
  Pending: "bg-neutral-300",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
        GATE_STYLES[status] ?? "bg-neutral-100 text-neutral-600 border-neutral-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${GATE_DOT_STYLES[status] ?? "bg-neutral-300"}`} />
      {label ?? status}
    </span>
  );
}

// ─── Dark stat card (hero + Campaign Health) ─────────────────────────────────
const CONFIDENCE_TONE: Record<GateSignalStatus, string> = {
  "On Track": "text-emerald-400",
  "At Risk": "text-amber-400",
  Blocked: "text-red-400",
  Pending: "text-neutral-400",
};

export function CampaignHealthCard({
  confidenceScore,
  gateSignalStatus,
  businessOutcomeLabel,
  businessOutcomeActual,
  businessOutcomeTarget,
  retentionMetricLabel,
  retentionMetricActual,
  retentionMetricTarget,
}: {
  confidenceScore: number;
  gateSignalStatus: GateSignalStatus;
  businessOutcomeLabel: string;
  businessOutcomeActual: number | null;
  businessOutcomeTarget: number | null;
  retentionMetricLabel: string;
  retentionMetricActual: number | null;
  retentionMetricTarget: number | null;
}) {
  return (
    <div className="rounded-3xl bg-neutral-900 text-white p-5 sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
        Signal confidence
      </p>
      <div className="flex items-end gap-3 mt-1.5">
        <p className={`text-5xl font-black leading-none ${CONFIDENCE_TONE[gateSignalStatus]}`}>
          {Math.round(confidenceScore)}
        </p>
        <div className="pb-1">
          <StatusPill status={gateSignalStatus} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/10">
        <div>
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest truncate">
            {businessOutcomeLabel}
          </p>
          <p className="text-lg font-bold mt-0.5">
            {businessOutcomeActual ?? "—"}
            <span className="text-sm font-normal text-neutral-400"> / {businessOutcomeTarget ?? "—"}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest truncate">
            {retentionMetricLabel}
          </p>
          <p className="text-lg font-bold mt-0.5">
            {retentionMetricActual ?? "—"}
            <span className="text-sm font-normal text-neutral-400"> / {retentionMetricTarget ?? "—"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Health ring — circular progress gauge ───────────────────────────────────
const RING_TONE: Record<GateSignalStatus, string> = {
  "On Track": "#34d399", // emerald-400
  "At Risk": "#fbbf24", // amber-400
  Blocked: "#f87171", // red-400
  Pending: "#a3a3a3", // neutral-400
};

export function HealthRing({
  value,
  gateSignalStatus,
  size = 64,
}: {
  value: number;
  gateSignalStatus: GateSignalStatus;
  size?: number;
}) {
  const stroke = size * 0.11;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c * (1 - pct / 100);
  const color = RING_TONE[gateSignalStatus];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="white"
        fontSize={size * 0.28}
        fontWeight={800}
      >
        {Math.round(pct)}
      </text>
    </svg>
  );
}

// ─── Week-over-week delta tag ────────────────────────────────────────────────
// Small "▲ +2.3 vs last week" / "▼ -1.2" / "— flat" indicator, used anywhere
// a client-safe weekly number is compared against the prior week.
export function DeltaTag({
  current,
  previous,
  suffix = "",
}: {
  current: number | null;
  previous: number | null;
  suffix?: string;
}) {
  if (current == null || previous == null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) {
    return <span className="text-[10px] text-neutral-400">— flat vs last week</span>;
  }
  const up = diff > 0;
  return (
    <span className={`text-[10px] font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {diff}
      {suffix} vs last week
    </span>
  );
}

// ─── Posture dot — small colored dot for Gaining/Plateauing/etc, used in the
// nav week-picker and anywhere a compact posture indicator is needed. ────────
export const POSTURE_DOT: Record<string, string> = {
  Gaining: "bg-emerald-400",
  Plateauing: "bg-amber-400",
  "Under Threat": "bg-red-400",
  Fragile: "bg-red-400",
  "Eroding Slowly": "bg-red-400",
};

// ─── Editorial hero — identity strip + report title + clarity blockquote ────
export function ReportHero({
  clientName,
  campaignName,
  phaseLabel,
  kicker,
  clarityStatement,
  strategistReviewed,
}: {
  clientName: string;
  campaignName: string;
  phaseLabel: string;
  kicker: string;
  clarityStatement: string | null;
  strategistReviewed: boolean;
}) {
  return (
    <div>
      {/* Dark identity strip */}
      <div className="bg-neutral-900 text-white rounded-3xl px-5 py-4 sm:px-6 sm:py-5 mb-6">
        <p className="text-[11px] text-neutral-400">{clientName}</p>
        <div className="flex items-end justify-between gap-3 mt-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{campaignName}</h1>
          <span className="text-[11px] font-semibold text-neutral-300 shrink-0 pb-0.5">{phaseLabel}</span>
        </div>
      </div>

      {/* Editorial title block */}
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
        {kicker}
      </p>
      <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mb-3">
        Growth Intelligence Report
      </h2>
      {strategistReviewed && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 mb-3">
          ✓ Strategist reviewed
        </span>
      )}
      {clarityStatement && (
        <blockquote className="border-l-4 border-neutral-900 pl-4 text-sm text-neutral-700 leading-relaxed">
          {clarityStatement}
        </blockquote>
      )}
    </div>
  );
}
