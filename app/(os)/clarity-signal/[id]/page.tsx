// app/(os)/clarity-signal/[id]/page.tsx
// Clarity Signal™ — One-page executive snapshot output
// Designed for prospect outreach. Boardroom tone. No recommendations. Earns the next conversation.
//
// GOVERNANCE: never expose internal scoring, methodology, or ICS fields.
// COPY RULES: no dashes or hyphens in hardcoded copy. Traffic light colours only.

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type TopSignal = {
  signal: string;
  headline: string;
  status: string;
  business_read: string;
};

type ClaritySignalResult = {
  _clarity_signal: boolean;
  executive_observation: string;
  decision_status: "Ready" | "Watch" | "Attention" | "Intervention";
  decision_status_reason: string;
  top_signals: TopSignal[];
  biggest_opportunity: string;
  biggest_risk: string;
  questions_worth_asking: string[];
  intelligence_boundary: string;
  hidden_signal: string;
};

type QuickAuditRow = {
  id: string;
  brand_name: string;
  campaign_name: string;
  industry: string;
  result: ClaritySignalResult;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "Ready":
      return {
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Ready",
      };
    case "Watch":
      return {
        dot: "bg-amber-400",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Watch",
      };
    case "Attention":
      return {
        dot: "bg-orange-500",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
        label: "Attention",
      };
    case "Intervention":
      return {
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700 border-red-200",
        label: "Intervention Required",
      };
    default:
      return {
        dot: "bg-neutral-400",
        badge: "bg-neutral-50 text-neutral-700 border-neutral-200",
        label: status,
      };
  }
}

function signalStatusStyle(status: string) {
  const s = status.toLowerCase();
  if (
    s.includes("at risk") ||
    s.includes("declin") ||
    s.includes("absent") ||
    s.includes("weak") ||
    s.includes("critical")
  ) {
    return "text-red-600 bg-red-50 border-red-200";
  }
  if (
    s.includes("pass") ||
    s.includes("watch") ||
    s.includes("below") ||
    s.includes("moder") ||
    s.includes("hold")
  ) {
    return "text-amber-700 bg-amber-50 border-amber-200";
  }
  if (
    s.includes("active") ||
    s.includes("strong") ||
    s.includes("expand") ||
    s.includes("rising") ||
    s.includes("growing")
  ) {
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
  }
  return "text-neutral-600 bg-neutral-50 border-neutral-200";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export default async function ClaritySignalOutputPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quick_audits")
    .select("id, brand_name, campaign_name, industry, result, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return notFound();

  const row = data as QuickAuditRow;
  const r = row.result;

  if (!r._clarity_signal) return notFound();

  const status = statusConfig(r.decision_status);

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── WINDOW FRAME HERO ───────────────────────────────────────────── */}
      <div className="rounded-2xl bg-slate-900 text-white p-8 mb-6 overflow-hidden">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-7 pb-7 border-b border-slate-700">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Shift Impact™
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Clarity Signal™</h1>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Generated</p>
            <p className="text-sm text-slate-400">{formatDate(row.created_at)}</p>
          </div>
        </div>

        {/* Brand / Campaign */}
        <div className="mb-7 pb-7 border-b border-slate-700">
          <p className="text-xl font-semibold text-white mb-1">{row.brand_name}</p>
          <p className="text-sm text-slate-400">{row.campaign_name} · {row.industry}</p>
        </div>

        {/* Decision Status */}
        <div className="flex items-center gap-3 mb-7">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${status.dot}`} />
          <span className={`text-sm font-bold px-3 py-1 rounded-full border ${status.badge}`}>
            {status.label}
          </span>
          <span className="text-sm text-slate-400">{r.decision_status_reason}</span>
        </div>

        {/* Executive Observation */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Executive Observation
          </p>
          <p className="text-[15px] text-slate-200 leading-relaxed">
            {r.executive_observation}
          </p>
        </div>

      </div>

      {/* ── TOP 5 SIGNALS — Editorial POV Cards ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-8 mb-6 shadow-sm">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
          Signal Intelligence
        </p>
        <h2 className="text-lg font-bold text-neutral-900 mb-6">Top 5 Signals</h2>

        <div className="space-y-5">
          {(r.top_signals ?? []).slice(0, 5).map((sig, i) => (
            <div
              key={i}
              className="border border-neutral-100 rounded-xl p-5"
            >
              {/* Signal label + status badge */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  {sig.signal}
                </p>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${signalStatusStyle(
                    sig.status
                  )}`}
                >
                  {sig.status}
                </span>
              </div>

              {/* POV Headline — the opinion */}
              <p className="text-[15px] font-bold text-neutral-900 leading-snug mb-2">
                {sig.headline ?? sig.signal}
              </p>

              {/* Elaboration */}
              <p className="text-sm text-neutral-500 leading-relaxed">
                {sig.business_read}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── OPPORTUNITY + RISK ────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">

        <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3">
            Biggest Opportunity
          </p>
          <p className="text-sm text-neutral-700 leading-relaxed">{r.biggest_opportunity}</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">
            Biggest Risk
          </p>
          <p className="text-sm text-neutral-700 leading-relaxed">{r.biggest_risk}</p>
        </div>

      </div>

      {/* ── QUESTIONS WORTH ASKING ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-8 mb-6 shadow-sm">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
          Decision Intelligence
        </p>
        <h2 className="text-lg font-bold text-neutral-900 mb-5">Questions Worth Asking</h2>
        <div className="space-y-4">
          {(r.questions_worth_asking ?? []).map((q, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xs font-bold text-neutral-300 mt-0.5 pt-px flex-shrink-0 w-4">
                {i + 1}
              </span>
              <p className="text-sm text-neutral-700 leading-relaxed">{q}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── INTELLIGENCE BOUNDARY ─────────────────────────────────────── */}
      <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 mb-6">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
          Intelligence Boundary
        </p>
        <p className="text-sm text-neutral-600 leading-relaxed">{r.intelligence_boundary}</p>
      </div>

      {/* ── HIDDEN SIGNAL ─────────────────────────────────────────────── */}
      <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 mb-8">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
          Hidden Signal
        </p>
        <p className="text-sm text-neutral-600 leading-relaxed italic">{r.hidden_signal}</p>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
          Shift Impact™
        </p>
        <h3 className="text-lg font-bold text-neutral-900 mb-3">Ready to go deeper?</h3>
        <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto leading-relaxed">
          The Clarity Signal™ surfaces what is visible.{" "}
          <br className="hidden sm:block" />
          The Clarity Snapshot
          <br />
          reveals what is driving it.
        </p>
        <a
          href="https://wa.me/60122147085"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
        >
          Book a Strategy Conversation →
        </a>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-neutral-400 mt-8 pb-4">
        Shift Impact™ · Clarity Signal™ · Public signals only · {formatDate(row.created_at)}
      </p>

    </div>
  );
}
