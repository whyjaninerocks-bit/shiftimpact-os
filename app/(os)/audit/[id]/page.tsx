// app/(os)/audit/[id]/page.tsx — Campaign Intelligence Preview (public-signals version)
//
// GOVERNANCE — this report intentionally exposes gate_status and gate_conditions
// because this is a prospect-facing preview product built on public proxy signals,
// not a confirmed-data client report. Different exposure rules from /report/[id].
//
// GOVERNANCE — never exposes (fields exist in AuditResult type but are NOT rendered):
//   ics_score, ics_threshold, ics_scores, ics_reasoning — IQ Evaluate internal only
//   budget_* fields from CrossChannelReport (not applicable here — audit has its own budget_release_recommendation)
//   CMO / C-suite — stripped server-side by sanitise() before any render
//
// COPY RULES — no dashes or hyphens in hardcoded UI strings (locked July 2026)
//   traffic light colours only: emerald = performing, amber = caution, red = action needed

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalItem = {
  status: string;
  direction: "up" | "flat" | "down" | "unknown";
  value_label: string;
  benchmark_context: string;
  efficiency_read: string;
  include?: boolean;
  score_proxy?: number | null;
};

type AuditResult = {
  effectiveness_score: number;
  effectiveness_rating: string;
  effectiveness_headline: string;
  effectiveness_diagnosis: string;
  engine_type: string;
  engine_media_pct: number;
  engine_idea_pct: number;
  engine_diagnosis: string;
  engine_recommendation: string;
  consumer_state: number;
  consumer_state_name: string;
  consumer_state_diagnosis: string;
  consumer_state_recommendation: string;
  state_transition_risk: string;
  signals: {
    sov: SignalItem;
    save_rate: SignalItem;
    share_rate: SignalItem;
    branded_search: SignalItem;
    vcr: SignalItem & { include: boolean };
    kol_earned: SignalItem;
    pr_earned: SignalItem & { include: boolean };
    review_platform: SignalItem & { include: boolean; score_proxy: number | null };
    retail_signal: SignalItem & { include: boolean };
  };
  audience_intent: string;
  audience_acquisition_pct: number;
  audience_retention_pct: number;
  audience_diagnosis: string;
  audience_recommendation: string;
  ai_visibility_score: number;
  ai_visibility_label: string;
  ai_visibility_diagnosis: string;
  ai_visibility_recommendation: string;
  campaign_phase: string;
  estimated_campaign_week: string;
  gate_status: string;
  gate_conditions: { condition: string; met: boolean; evidence: string }[];
  gate_recommendation: string;
  budget_release_recommendation: string;
  frame_diagnosis: string;
  primary_risk: string;
  efficiency_opportunity: string;
  risk_level: string;
  recommendations: {
    priority: number;
    title: string;
    finding: string;
    action: string;
    business_impact: string;
  }[];
  intelligence_gaps: string[];
  ics_score: number;
  ics_threshold: string;
  ics_scores: Record<string, number>;
  ics_reasoning: Record<string, string>;
};

type QuickAudit = {
  id: string;
  brand_name: string;
  campaign_name: string;
  industry: string;
  campaign_phase: string | null;
  channels: string[] | null;
  result: AuditResult;
  created_at: string;
};

// ─── Sanitise AI output — strip disallowed terms ──────────────────────────────

function sanitise(r: AuditResult): AuditResult {
  const json = JSON.stringify(r)
    .replace(/\bCMOs?\b/g, "senior decision-makers")
    .replace(/\bC-suite\b/gi, "executive leadership");
  return JSON.parse(json) as AuditResult;
}

// ─── Colour helpers — traffic light system only: green / amber / red ──────────

function scoreRingColor(score: number) {
  if (score >= 75) return "#34d399";   // green
  if (score >= 50) return "#fbbf24";   // amber
  return "#f87171";                     // red
}

function scoreTextColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function ratingBadge(r: string) {
  if (r === "Strong")   return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (r === "On Track") return "bg-amber-50 border-amber-200 text-amber-700";
  if (r === "At Risk")  return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-red-50 border-red-200 text-red-700";
}

function priorityBadge(level: string) {
  if (level === "Low")    return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (level === "Medium") return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-red-50 border-red-200 text-red-700";
}

// Traffic light: green = performing, amber = caution, red = underperforming
function signalStatusColor(status: string) {
  const GREEN = ["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor", "Elevated"];
  const AMBER = ["On Par", "Stable", "At Benchmark", "Solid", "Moderate", "At Floor"];
  const RED   = ["Below Category", "Below Floor", "Passive", "Minimal", "Needs Attention", "Weak", "Declining", "Risk"];
  if (GREEN.includes(status)) return { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", dot: "bg-emerald-500", dotBg: "bg-emerald-50" };
  if (AMBER.includes(status)) return { badge: "bg-amber-50 text-amber-700 border-amber-200",       bar: "bg-amber-400",   dot: "bg-amber-400",   dotBg: "bg-amber-50" };
  if (RED.includes(status))   return { badge: "bg-red-50 text-red-600 border-red-200",             bar: "bg-red-400",     dot: "bg-red-500",     dotBg: "bg-red-50" };
  return { badge: "bg-slate-100 text-slate-500 border-slate-200", bar: "bg-slate-300", dot: "bg-slate-300", dotBg: "bg-slate-100" };
}

function signalBarWidth(status: string): number {
  const GREEN = ["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor", "Elevated"];
  const AMBER = ["On Par", "Stable", "At Benchmark", "Solid", "Moderate", "At Floor"];
  if (GREEN.includes(status)) return 85;
  if (AMBER.includes(status)) return 55;
  return 25;
}

function directionIcon(d: string) {
  if (d === "up")   return <span className="text-emerald-500 text-xs font-bold ml-1">↑</span>;
  if (d === "down") return <span className="text-red-500 text-xs font-bold ml-1">↓</span>;
  if (d === "flat") return <span className="text-slate-400 text-xs font-bold ml-1">→</span>;
  return null;
}

function gateStyle(g: string) {
  if (g === "Advance")             return { bg: "bg-emerald-500", text: "text-white", label: "✓ Advance" };
  if (g === "Conditional Release") return { bg: "bg-amber-500",   text: "text-white", label: "◐ Conditional" };
  if (g === "Hold")                return { bg: "bg-amber-600",   text: "text-white", label: "⏸ Hold" };
  return { bg: "bg-red-500", text: "text-white", label: "↺ Pivot" };
}

// ─── Components ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <div className="relative shrink-0 w-14 h-14">
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={scoreRingColor(score)} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white leading-none">{score}</span>
      </div>
    </div>
  );
}

function ConsumerStateArc({ currentState }: { currentState: number }) {
  const states = [
    { n: 1, label: "Unaware" },
    { n: 2, label: "Aware" },
    { n: 3, label: "Unconvinced" },
    { n: 4, label: "Consideration" },
    { n: 5, label: "Intent" },
    { n: 6, label: "Post-Purchase" },
  ];
  return (
    <div className="flex items-stretch gap-1 mb-4">
      {states.map((s, i) => {
        const isActive = s.n === currentState;
        const isPast   = s.n < currentState;
        return (
          <div key={s.n} className="flex items-center flex-1 min-w-0">
            <div className={`flex-1 px-1.5 py-2 rounded-lg border text-center
              ${isActive ? "bg-slate-900 text-white border-slate-900"
              : isPast   ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                         : "bg-slate-50 text-slate-400 border-slate-100"}`}>
              <p className="text-[9px] font-semibold leading-tight truncate">{s.label}</p>
            </div>
            {i < states.length - 1 && (
              <span className={`text-[10px] mx-0.5 shrink-0 ${isPast ? "text-emerald-400" : "text-slate-200"}`}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhaseTimeline({ phase, weekRange }: { phase: string; weekRange: string }) {
  const phases = ["Demand", "Conversion", "Retention"];
  const idx = phases.indexOf(phase);
  const widths = ["flex-[2]", "flex-[2]", "flex-[1]"];
  return (
    <div className="flex items-start gap-0 mb-4">
      {phases.map((p, i) => (
        <div key={p} className={`${widths[i]} flex flex-col`}>
          <div className={`h-1.5 rounded-sm mr-0.5 ${i === idx ? "bg-slate-900" : i < idx ? "bg-slate-400" : "bg-slate-100"}`} />
          <div className="flex items-center gap-1 mt-1.5">
            {i === idx && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0" />}
            <p className={`text-[10px] ${i === idx ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
              {p}{i === idx && weekRange ? ` · Wk ${weekRange}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StrategicPOV({ header, body }: { header: string; body: string }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{header}</p>
      <blockquote className="border-l-[3px] border-slate-900 pl-4 text-sm font-semibold text-slate-900 leading-snug">
        {body}
      </blockquote>
    </div>
  );
}

function StrategicCard({ title, finding, action, impact, priority }: {
  title: string; finding: string; action: string; impact: string; priority: number;
}) {
  return (
    <div className="px-6 py-5 flex gap-3.5">
      <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {priority}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 mb-1.5">{title}</p>
        <p className="text-sm text-slate-500 leading-relaxed mb-3">{finding}</p>
        <div className="pl-3 border-l-2 border-slate-200 mb-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Action</p>
          <p className="text-sm text-slate-800 font-medium leading-relaxed">{action}</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">Impact:</span>
          <span className="text-xs font-medium text-slate-600 leading-relaxed">{impact}</span>
        </div>
      </div>
    </div>
  );
}

function EfficiencyImpact({ items }: { items: { label: string; sig: SignalItem }[] }) {
  const WATCH = ["Below Category", "Below Floor", "Passive", "Minimal", "Needs Attention", "Weak", "Declining", "Risk"];
  const GOOD  = ["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor", "Elevated"];
  const rows = items
    .map(({ label, sig }) => ({
      label,
      read: sig.efficiency_read,
      isWatch: WATCH.includes(sig.status),
      isGood:  GOOD.includes(sig.status),
    }))
    .filter(i => i.isWatch || i.isGood)
    .sort((a, b) => Number(b.isWatch) - Number(a.isWatch))
    .slice(0, 5);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Efficiency Summary</p>
        <p className="text-xs text-slate-400 mt-1">Where budget is working and where attention is needed</p>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((item, i) => (
          <div key={i} className="px-6 py-5 flex items-start gap-3">
            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border shrink-0 mt-1
              ${item.isWatch ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
              {item.isWatch ? "↓ Watch" : "↑ Strong"}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 mb-1">{item.label}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{item.read}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: audit, error } = await supabase
    .from("quick_audits").select("*").eq("id", id).single();
  if (error || !audit) notFound();

  const a = audit as QuickAudit;
  const r = sanitise(a.result);
  const gate = gateStyle(r.gate_status);
  const generatedDate = new Date(a.created_at).toLocaleDateString("en-MY", {
    day: "numeric", month: "long", year: "numeric",
  });

  const CORE_SIGNALS: { key: keyof typeof r.signals; label: string; always: boolean }[] = [
    { key: "sov",             label: "Share of Voice",        always: true },
    { key: "save_rate",       label: "Save Rate",             always: true },
    { key: "share_rate",      label: "Share Rate",            always: true },
    { key: "branded_search",  label: "Branded Search Lift",   always: true },
    { key: "kol_earned",      label: "KOL Earned Media",      always: true },
    { key: "vcr",             label: "Video Completion Rate", always: false },
    { key: "pr_earned",       label: "PR Coverage",           always: false },
    { key: "review_platform", label: "Review Platform",       always: false },
    { key: "retail_signal",   label: "Retail and E-commerce", always: false },
  ];

  const visibleSignals = CORE_SIGNALS.filter(s => {
    if (s.always) return true;
    const sig = r.signals[s.key] as SignalItem & { include?: boolean };
    return sig?.include === true;
  });

  const GREEN_ST = ["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor", "Elevated"];
  const RED_ST   = ["Below Category", "Below Floor", "Passive", "Minimal", "Needs Attention", "Weak", "Declining", "Risk"];
  const strongCount = visibleSignals.filter(s => GREEN_ST.includes((r.signals[s.key] as SignalItem).status)).length;
  const watchCount  = visibleSignals.filter(s => RED_ST.includes((r.signals[s.key] as SignalItem).status)).length;
  const aiVisLabel  = r.ai_visibility_label.replace(/^AI-/, "");

  return (
    <div className="-mx-4 sm:-mx-6 -mt-8 bg-slate-50 min-h-screen">

      {/* ── DARK HEADER ── */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-7">

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm tracking-tight">
                ShiftImpact <span className="text-slate-400 font-normal">OS</span>
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Campaign Intelligence Preview
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{generatedDate}</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>
                Public signals only
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight mb-1">
                {a.brand_name}
              </h1>
              <p className="text-slate-400 text-sm">{a.campaign_name} · {a.industry}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
              <span className="text-xs text-slate-400 font-medium">{r.campaign_phase} Phase · Wk {r.estimated_campaign_week}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${gate.bg} ${gate.text}`}>
                {gate.label}
              </span>
            </div>
          </div>

          {/* 3 glass metric cards */}
          <div className="grid grid-cols-3 gap-3">

            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <ScoreRing score={r.effectiveness_score} />
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Score</p>
                <p className={`text-base font-bold ${scoreTextColor(r.effectiveness_score)}`}>
                  {r.effectiveness_rating}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{r.risk_level} Priority</p>
              </div>
            </div>

            <div className="px-4 py-3.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-2.5">Signal Diagnostic</p>
              <div className="space-y-1.5">
                {([
                  { label: "SoV",    sig: r.signals.sov },
                  { label: "Search", sig: r.signals.branded_search },
                  { label: "Save",   sig: r.signals.save_rate },
                  { label: "KOL",    sig: r.signals.kol_earned },
                  { label: "Share",  sig: r.signals.share_rate },
                ] as { label: string; sig: SignalItem }[]).map(({ label, sig }) => {
                  const col = signalStatusColor(sig.status);
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 w-10 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className={`${col.bar} h-1.5 rounded-full`}
                          style={{ width: `${signalBarWidth(sig.status)}%` }} />
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${col.badge}`}>
                        {sig.status.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-2 px-4 py-3.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Gate Status</p>
              <span className={`text-sm font-bold px-4 py-2 rounded-xl ${gate.bg} ${gate.text}`}>
                {gate.label}
              </span>
              <p className="text-[10px] text-slate-400 font-medium text-center">{r.budget_release_recommendation}</p>
            </div>

          </div>

          <div className="mt-3 flex items-center justify-between px-4 py-2.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Signal Health</span>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] text-slate-500">
                {strongCount} strong · {watchCount} need attention · public proxy reads
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
              style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}>
              {a.industry}
            </span>
          </div>

        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-3xl mx-auto px-6 py-7 space-y-5">

        {/* Executive Intelligence Summary */}
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Executive Intelligence</p>
          <blockquote className="border-l-[3px] border-slate-900 pl-4 text-base font-semibold text-slate-900 leading-snug mb-4">
            {r.effectiveness_headline}
          </blockquote>
          <p className="text-sm text-slate-700 leading-relaxed">{r.frame_diagnosis}</p>
        </div>

        {/* Campaign Effectiveness */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Campaign Effectiveness</p>
          </div>
          <div className="px-6 py-5">
            <StrategicPOV
              header={`${r.effectiveness_rating} · ${r.risk_level} Priority`}
              body={r.effectiveness_headline}
            />
            <p className="text-sm text-slate-700 leading-relaxed mb-4">{r.effectiveness_diagnosis}</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold border px-3 py-1 rounded-full ${ratingBadge(r.effectiveness_rating)}`}>
                {r.effectiveness_rating}
              </span>
              <span className={`text-xs font-semibold border px-3 py-1 rounded-full ${priorityBadge(r.risk_level)}`}>
                {r.risk_level} Priority
              </span>
            </div>
          </div>
        </div>

        {/* Campaign Engine */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Campaign Engine: Media and Idea</p>
          </div>
          <div className="px-6 py-5">
            <StrategicPOV
              header={`${r.engine_type} · ${r.engine_media_pct}% Media / ${r.engine_idea_pct}% Idea`}
              body={r.engine_recommendation}
            />
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Media-Compensated</span>
              <span className={`font-semibold px-2.5 py-1 rounded-full border ${
                r.engine_type === "Idea-Driven" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : r.engine_type === "Hybrid"    ? "bg-amber-50 border-amber-200 text-amber-700"
                :                                 "bg-red-50 border-red-200 text-red-700"
              }`}>{r.engine_type}</span>
              <span>Idea-Driven</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden mb-4">
              <div className="bg-slate-700 flex items-center justify-center" style={{ width: `${r.engine_media_pct}%` }}>
                {r.engine_media_pct > 15 && <span className="text-[9px] font-bold text-white">{r.engine_media_pct}%</span>}
              </div>
              <div className="bg-emerald-400 flex items-center justify-center" style={{ width: `${r.engine_idea_pct}%` }}>
                {r.engine_idea_pct > 15 && <span className="text-[9px] font-bold text-white">{r.engine_idea_pct}%</span>}
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{r.engine_diagnosis}</p>
          </div>
        </div>

        {/* Consumer State */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Consumer Behaviour State</p>
          </div>
          <div className="px-6 py-5">
            <StrategicPOV
              header={`${r.consumer_state_name} · ${r.state_transition_risk} Transition Watch`}
              body={r.consumer_state_recommendation}
            />
            <ConsumerStateArc currentState={r.consumer_state} />
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
              <p className="text-sm font-bold text-slate-900">Current Stage: {r.consumer_state_name}</p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{r.consumer_state_diagnosis}</p>
          </div>
        </div>

        {/* Signal Intelligence */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Signal Intelligence</p>
              <p className="text-xs text-slate-400 mt-1">{strongCount} strong · {watchCount} need attention · public proxy reads</p>
            </div>
          </div>
          <div className="px-6 pt-5 pb-2">
            <StrategicPOV
              header={`${strongCount} Strong · ${watchCount} Need Attention`}
              body={r.efficiency_opportunity}
            />
          </div>
          <div className="divide-y divide-slate-100">
            {visibleSignals.map(s => {
              const sig = r.signals[s.key] as SignalItem;
              if (!sig) return null;
              const sc = signalStatusColor(sig.status);
              return (
                <div key={s.key} className="px-6 py-5">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${sc.dotBg}`}>
                        <span className={`w-3 h-3 rounded-full ${sc.dot}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                          {directionIcon(sig.direction)}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{sig.value_label}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 ${sc.badge}`}>
                      {sig.status}
                    </span>
                  </div>
                  <div className="ml-[52px]">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full ${sc.bar}`}
                        style={{ width: `${signalBarWidth(sig.status)}%` }} />
                    </div>
                    <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs text-slate-400 font-medium shrink-0">MY Benchmark:</span>
                        <span className="text-xs text-slate-600">{sig.benchmark_context}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs text-slate-400 font-medium shrink-0">Read:</span>
                        <span className="text-xs text-slate-600">{sig.efficiency_read}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center">
              All reads derived from public sources. Confirmed client data unlocks 8 additional signal dimensions.
            </p>
          </div>
        </div>

        {/* Audience Intelligence */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Audience Intelligence</p>
          </div>
          <div className="px-6 py-5">
            <StrategicPOV
              header={`${r.audience_intent} · ${r.audience_acquisition_pct}% Acquisition Focus`}
              body={r.audience_recommendation}
            />
            <div className="mb-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span>Acquisition — {r.audience_acquisition_pct}%</span>
                <span>Retention — {r.audience_retention_pct}%</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden">
                <div className="bg-slate-700" style={{ width: `${r.audience_acquisition_pct}%` }} />
                <div className="bg-emerald-400" style={{ width: `${r.audience_retention_pct}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 mb-4">
              <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${
                r.audience_intent === "Balanced" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
              }`}>{r.audience_intent}</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{r.audience_diagnosis}</p>
          </div>
        </div>

        {/* AI Brand Visibility */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">AI Brand Visibility</p>
            <span className="text-xs font-bold text-slate-700">{r.ai_visibility_score}/10 · {r.ai_visibility_label}</span>
          </div>
          <div className="px-6 py-5">
            <StrategicPOV
              header={`${r.ai_visibility_score}/10 · ${aiVisLabel}`}
              body={r.ai_visibility_recommendation}
            />
            <div className="mb-3">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${
                  r.ai_visibility_score >= 7 ? "bg-emerald-500"
                  : r.ai_visibility_score >= 4 ? "bg-amber-400"
                  : "bg-red-400"
                }`} style={{ width: `${r.ai_visibility_score * 10}%` }} />
              </div>
              <p className="text-[10px] text-slate-400">
                How consistently AI assistants reference this brand in category discovery queries
              </p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{r.ai_visibility_diagnosis}</p>
          </div>
        </div>

        {/* Gate Intelligence */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Gate Intelligence: Budget Phase Decision</p>
          </div>
          <div className="px-6 py-5">
            <StrategicPOV
              header={`${r.gate_status}: ${r.budget_release_recommendation}`}
              body={r.gate_recommendation}
            />
            <PhaseTimeline phase={r.campaign_phase} weekRange={r.estimated_campaign_week} />
          </div>
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Gate Condition Progress</p>
              <span className="text-xs font-bold text-slate-700">
                {r.gate_conditions.filter(gc => gc.met).length}/{r.gate_conditions.length} conditions met
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full rounded-full transition-all ${
                  r.gate_conditions.filter(gc => gc.met).length === r.gate_conditions.length
                    ? "bg-emerald-500"
                    : r.gate_conditions.filter(gc => gc.met).length >= Math.ceil(r.gate_conditions.length * 0.6)
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
                style={{ width: `${r.gate_conditions.length > 0 ? (r.gate_conditions.filter(gc => gc.met).length / r.gate_conditions.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="px-6 pb-5 space-y-2">
            {r.gate_conditions.map((gc, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg px-4 py-3 ${
                gc.met ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-100"
              }`}>
                <span className={`text-sm font-bold shrink-0 mt-0.5 ${gc.met ? "text-emerald-600" : "text-slate-400"}`}>
                  {gc.met ? "✓" : "○"}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{gc.condition}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{gc.evidence}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-5 grid grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide mb-1">Key Watch</p>
              <p className="text-xs text-slate-700 leading-relaxed">{r.primary_risk}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Highest Leverage</p>
              <p className="text-xs text-slate-700 leading-relaxed">{r.efficiency_opportunity}</p>
            </div>
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Strategic Recommendations</p>
            <p className="text-xs text-slate-400 mt-1">Highest-leverage actions ranked by expected business impact</p>
          </div>
          <div className="px-6 pt-5 pb-2">
            <StrategicPOV
              header={`${r.risk_level} Priority · ${r.recommendations.length} Actions`}
              body={r.primary_risk}
            />
          </div>
          <div className="divide-y divide-slate-100">
            {r.recommendations.map(rec => (
              <StrategicCard
                key={rec.priority}
                priority={rec.priority}
                title={rec.title}
                finding={rec.finding}
                action={rec.action}
                impact={rec.business_impact}
              />
            ))}
          </div>
        </div>

        {/* Intelligence Gaps */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-6 py-5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Intelligence Gaps</p>
            <p className="text-sm font-semibold text-white mb-2">
              What public signals cannot tell us
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each gap below can be answered with confirmed client data. ShiftImpact OS builds this intelligence layer for active campaign partners using your spend records, platform analytics, and first-party campaign tracking.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {r.intelligence_gaps.map((gap, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-slate-400">?</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{gap}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Summary */}
        <EfficiencyImpact
          items={visibleSignals.map(s => ({ label: s.label, sig: r.signals[s.key] as SignalItem }))}
        />

        {/* CTA */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-7 text-center">
          <p className="text-sm font-semibold text-slate-900 mb-1.5">
            Get full campaign intelligence. Confirmed, weekly, with attribution.
          </p>
          <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto leading-relaxed">
            This preview used public signals only. ShiftImpact OS partnership unlocks all signal dimensions, gate convergence tracking, and confirmed attribution updated every week of your campaign flight.
          </p>
          <a
            href="https://wa.me/60122147085?text=Hi%2C%20I%20reviewed%20the%20Campaign%20Intelligence%20Preview%20and%20would%20like%20to%20explore%20a%20partnership."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#1ebe5d] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Book a Strategy Call →
          </a>
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">
              Powered by <span className="font-medium text-slate-500">ShiftImpact OS</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Confidential · Campaign Intelligence Preview
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
