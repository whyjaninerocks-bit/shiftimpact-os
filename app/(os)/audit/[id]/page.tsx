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
  inferred_big_idea: string;
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

// ─── Colour helpers ───────────────────────────────────────────────────────────

function ratingColor(r: string) {
  if (r === "Strong")   return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-50 border-emerald-200 text-emerald-700" };
  if (r === "On Track") return { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",   badge: "bg-blue-50 border-blue-200 text-blue-700" };
  if (r === "At Risk")  return { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",  badge: "bg-amber-50 border-amber-200 text-amber-700" };
  return                       { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",    badge: "bg-red-50 border-red-200 text-red-700" };
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-amber-500";
  return "text-red-500";
}

function scoreBarColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-400";
  return "bg-red-400";
}

function priorityColor(level: string) {
  if (level === "Low")      return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (level === "Medium")   return "text-amber-700 bg-amber-50 border-amber-200";
  if (level === "High")     return "text-red-700 bg-red-50 border-red-200";
  return "text-red-900 bg-red-100 border-red-300";
}

function signalStatusColor(status: string) {
  if (["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor"].includes(status))
    return { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" };
  if (["Elevated", "On Par", "At Floor", "Stable", "At Benchmark", "Solid", "Moderate"].includes(status))
    return { badge: "bg-sky-50 text-sky-700 border-sky-200", bar: "bg-sky-400" };
  if (["Below Category", "Below Floor", "Passive", "Minimal", "Needs Attention"].includes(status))
    return { badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-400" };
  if (["Weak", "Declining", "Risk"].includes(status))
    return { badge: "bg-red-50 text-red-600 border-red-200", bar: "bg-red-400" };
  return { badge: "bg-neutral-50 text-neutral-500 border-neutral-200", bar: "bg-neutral-300" };
}

function signalStatusScore(status: string): number {
  if (["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor"].includes(status)) return 85;
  if (["Elevated", "On Par", "At Floor", "Stable", "At Benchmark", "Solid", "Moderate"].includes(status)) return 60;
  if (["Below Category", "Below Floor", "Passive", "Minimal", "Needs Attention"].includes(status)) return 35;
  if (["Weak", "Declining", "Risk"].includes(status)) return 15;
  return 0;
}

function directionIcon(d: string) {
  if (d === "up")   return <span className="text-emerald-500 text-xs font-bold">↑</span>;
  if (d === "down") return <span className="text-red-500 text-xs font-bold">↓</span>;
  if (d === "flat") return <span className="text-neutral-400 text-xs font-bold">→</span>;
  return <span className="text-neutral-300 text-xs">–</span>;
}

function gateColor(g: string) {
  if (g === "Advance")             return { bg: "bg-emerald-500", text: "text-white", label: "✓ Advance" };
  if (g === "Conditional Release") return { bg: "bg-sky-500",     text: "text-white", label: "◐ Conditional" };
  if (g === "Hold")                return { bg: "bg-amber-500",   text: "text-white", label: "⏸ Hold" };
  return { bg: "bg-red-500", text: "text-white", label: "↺ Pivot" };
}

// ─── Visual components ────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 110 }: { score: number; size?: number }) {
  const r = 40;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const circumference = Math.PI * r;
  const filled = (score / 100) * circumference;
  const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`} />
    </svg>
  );
}

function ConsumerStateArc({ currentState }: { currentState: number }) {
  const states = [
    { n: 1, label: "Unaware" },
    { n: 2, label: "Aware\nPassive" },
    { n: 3, label: "Aware\nUnconvinced" },
    { n: 4, label: "In\nConsideration" },
    { n: 5, label: "Intent\nActive" },
    { n: 6, label: "Post\nPurchase" },
  ];
  return (
    <div className="flex items-center gap-0.5 w-full">
      {states.map((s, i) => {
        const isActive = s.n === currentState;
        const isPast   = s.n < currentState;
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${isActive ? "bg-neutral-900 border-neutral-900 text-white scale-110"
                : isPast   ? "bg-emerald-500 border-emerald-500 text-white"
                           : "bg-white border-neutral-200 text-neutral-400"}`}>
                {isPast ? "✓" : s.n}
              </div>
              <p className={`text-center mt-1 leading-tight whitespace-pre-line text-[9px]
                ${isActive ? "text-neutral-900 font-semibold" : "text-neutral-400"}`}>
                {s.label}
              </p>
            </div>
            {i < states.length - 1 && (
              <div className={`h-px w-full mx-0.5 ${s.n < currentState ? "bg-emerald-300" : "bg-neutral-200"}`} />
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
  return (
    <div className="flex items-start gap-0">
      {phases.map((p, i) => {
        const isActive = i === idx;
        const isPast   = i < idx;
        const widths   = ["flex-[2]", "flex-[2]", "flex-[1]"];
        return (
          <div key={p} className={`${widths[i]} flex flex-col`}>
            <div className={`h-1.5 rounded-sm mr-0.5
              ${isActive ? "bg-neutral-900" : isPast ? "bg-neutral-400" : "bg-neutral-100"}`} />
            <div className="flex items-center gap-1 mt-1.5">
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 shrink-0" />}
              <p className={`text-[10px] ${isActive ? "text-neutral-900 font-semibold" : "text-neutral-400"}`}>
                {p}{isActive && weekRange ? ` · Wk ${weekRange}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Two-layer: short header + narrative body ───────────────────────────────────
function StrategicPOV({ header, body }: { header: string; body: string }) {
  return (
    <div className="border-l-[3px] border-neutral-900 pl-4 mb-5">
      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.16em] mb-1.5">{header}</p>
      <p className="text-[13px] font-semibold text-neutral-900 leading-snug">{body}</p>
    </div>
  );
}

// ── EfficiencyImpact: cause → effect signal summary ────────────────────────────
function EfficiencyImpact({ items }: { items: { label: string; sig: SignalItem }[] }) {
  const WATCH = ["Below Category", "Below Floor", "Weak", "Declining", "Passive", "Minimal", "Needs Attention"];
  const STRONG = ["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor"];

  const impacts = items
    .map(({ label, sig }) => ({
      label,
      efficiency_read: sig.efficiency_read,
      isWatch:  WATCH.includes(sig.status),
      isStrong: STRONG.includes(sig.status),
    }))
    .filter(i => i.isWatch || i.isStrong)
    .sort((a, b) => Number(b.isWatch) - Number(a.isWatch))
    .slice(0, 5);

  if (!impacts.length) return null;

  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-neutral-100 bg-neutral-50">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Efficiency Summary</p>
        <p className="text-sm font-semibold text-neutral-900 mt-0.5">Where budget is working — and where attention is needed</p>
      </div>
      <div className="px-5 py-4 space-y-3 bg-white">
        {impacts.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`text-[9px] font-bold px-2 py-1 rounded-full border shrink-0 mt-0.5
              ${item.isWatch ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
              {item.isWatch ? "↓ Watch" : "↑ Strong"}
            </span>
            <p className="text-[11px] leading-relaxed text-neutral-600">
              <span className="font-semibold text-neutral-800">{item.label}</span> — {item.efficiency_read}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Strategic recommendation card — white, no dark boxes ──────────────────────
function StrategicCard({ title, finding, action, impact, priority }: {
  title: string; finding: string; action: string; impact: string; priority: number;
}) {
  const accent = priority === 1 ? "border-l-neutral-800"
               : priority === 2 ? "border-l-neutral-400"
               :                  "border-l-neutral-200";
  return (
    <div className={`bg-white rounded-xl border border-neutral-100 border-l-[3px] ${accent} p-4`}>
      <div className="flex items-start gap-2.5 mb-3">
        <span className="text-[9px] font-bold text-neutral-500 bg-neutral-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
          {priority}
        </span>
        <div>
          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Priority {priority}</p>
          <p className="text-sm font-bold text-neutral-900 leading-snug">{title}</p>
        </div>
      </div>
      <div className="pl-7 space-y-2.5">
        <p className="text-[11px] text-neutral-500 leading-relaxed">{finding}</p>
        <div className="border-t border-neutral-100 pt-2.5">
          <p className="text-[9px] font-bold text-neutral-800 uppercase tracking-widest mb-1">Action</p>
          <p className="text-[11px] font-semibold text-neutral-800 leading-relaxed">{action}</p>
        </div>
        <div className="border-t border-neutral-100 pt-2.5">
          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Business Impact</p>
          <p className="text-[10px] text-neutral-500 leading-relaxed">{impact}</p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.16em] mb-3">{children}</p>
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
  const r = a.result;
  const rating = ratingColor(r.effectiveness_rating);
  const gate   = gateColor(r.gate_status);
  const generatedDate = new Date(a.created_at).toLocaleDateString("en-MY", {
    day: "numeric", month: "long", year: "numeric",
  });

  const CORE_SIGNALS: { key: keyof typeof r.signals; label: string; always: boolean }[] = [
    { key: "sov",             label: "Share of Voice",        always: true },
    { key: "save_rate",       label: "Save Rate",             always: true },
    { key: "share_rate",      label: "Share Rate",            always: true },
    { key: "branded_search",  label: "Branded Search Lift",   always: true },
    { key: "kol_earned",      label: "KOL / Earned Media",    always: true },
    { key: "vcr",             label: "Video Completion Rate", always: false },
    { key: "pr_earned",       label: "PR Coverage",           always: false },
    { key: "review_platform", label: "Review Platform",       always: false },
    { key: "retail_signal",   label: "Retail / E-commerce",   always: false },
  ];

  const visibleSignals = CORE_SIGNALS.filter(s => {
    if (s.always) return true;
    const sig = r.signals[s.key] as SignalItem & { include?: boolean };
    return sig?.include === true;
  });

  const STRONG_ST = ["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor"];
  const WATCH_ST  = ["Below Category", "Below Floor", "Weak", "Declining", "Passive", "Minimal", "Needs Attention"];
  const strongCount = visibleSignals.filter(s => STRONG_ST.includes((r.signals[s.key] as SignalItem).status)).length;
  const watchCount  = visibleSignals.filter(s => WATCH_ST.includes((r.signals[s.key] as SignalItem).status)).length;

  const aiVisLabel = r.ai_visibility_label.replace(/^AI-/, "");

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">

      {/* ── Header — accent strip + clean card ── */}
      <div className="rounded-xl overflow-hidden border border-neutral-200 shadow-sm">
        <div className="h-1.5 bg-neutral-900" />
        <div className="bg-white px-6 pt-5 pb-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.18em] mb-2">
                ShiftImpact OS · Campaign Intelligence Preview
              </p>
              <h1 className="text-[28px] font-bold tracking-tight text-neutral-900 leading-none">{a.brand_name}</h1>
              <p className="text-sm text-neutral-400 mt-1.5">{a.campaign_name} · {a.industry}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-neutral-400">{generatedDate}</p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-medium text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0" />
                Public signals only
              </div>
            </div>
          </div>

          {/* ── 3 metric cards ── */}
          <div className="grid grid-cols-3 gap-3">

            {/* Effectiveness */}
            <div className={`rounded-xl border ${rating.border} ${rating.bg} p-4 flex flex-col items-center`}>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Effectiveness</p>
              <ScoreGauge score={r.effectiveness_score} size={110} />
              <p className={`text-3xl font-bold -mt-1 leading-none ${scoreColor(r.effectiveness_score)}`}>
                {r.effectiveness_score}
              </p>
              <div className="w-full mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div className={`h-1.5 rounded-full ${scoreBarColor(r.effectiveness_score)}`}
                  style={{ width: `${r.effectiveness_score}%` }} />
              </div>
              <p className={`text-[10px] font-bold mt-2 ${rating.text}`}>{r.effectiveness_rating}</p>
            </div>

            {/* Signal Diagnostic */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-3 text-center">Signal Diagnostic</p>
              <div className="space-y-2">
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
                      <span className="text-[9px] text-neutral-400 w-10 shrink-0">{label}</span>
                      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`${col.bar} h-2 rounded-full`}
                          style={{ width: `${signalStatusScore(sig.status)}%` }} />
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${col.badge}`}>
                        {sig.status.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gate */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col items-center justify-center gap-2">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Gate Status</p>
              <span className={`text-sm font-bold px-4 py-2 rounded-xl ${gate.bg} ${gate.text}`}>
                {gate.label}
              </span>
              <div className="text-center">
                <p className="text-[10px] text-neutral-500 font-semibold">{r.budget_release_recommendation}</p>
                <p className="text-[9px] text-neutral-400 mt-0.5">{r.campaign_phase} · Wk {r.estimated_campaign_week}</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Campaign Effectiveness ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
        <SectionLabel>Campaign Effectiveness</SectionLabel>
        <StrategicPOV
          header={`${r.effectiveness_rating} · ${r.risk_level} Priority`}
          body={r.effectiveness_headline}
        />
        <div className="flex items-start gap-5">
          <div className="shrink-0 text-center">
            <ScoreGauge score={r.effectiveness_score} size={120} />
            <p className={`text-3xl font-bold -mt-1 leading-none ${scoreColor(r.effectiveness_score)}`}>
              {r.effectiveness_score}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-600 leading-relaxed">{r.effectiveness_diagnosis}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-[10px] font-semibold border px-2.5 py-1 rounded-full ${rating.badge}`}>
                {r.effectiveness_rating}
              </span>
              <span className={`text-[10px] font-semibold border px-2.5 py-1 rounded-full ${priorityColor(r.risk_level)}`}>
                {r.risk_level} Priority
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Campaign Engine ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
        <SectionLabel>Campaign Engine — Media vs Idea</SectionLabel>
        <StrategicPOV
          header={`${r.engine_type} · ${r.engine_media_pct}% vs ${r.engine_idea_pct}%`}
          body={r.engine_recommendation}
        />
        <div className="flex h-3 rounded-full overflow-hidden mb-2">
          <div className="bg-neutral-800 flex items-center justify-center" style={{ width: `${r.engine_media_pct}%` }}>
            {r.engine_media_pct > 15 && <span className="text-[9px] font-bold text-white">{r.engine_media_pct}% Media</span>}
          </div>
          <div className="bg-emerald-400 flex items-center justify-center" style={{ width: `${r.engine_idea_pct}%` }}>
            {r.engine_idea_pct > 15 && <span className="text-[9px] font-bold text-white">{r.engine_idea_pct}% Idea</span>}
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-neutral-400 mb-4">
          <span>Media-Compensated</span>
          <span>Idea-Driven</span>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">{r.engine_diagnosis}</p>
      </div>

      {/* ── Consumer State ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
        <SectionLabel>Consumer Behaviour State</SectionLabel>
        <StrategicPOV
          header={`${r.consumer_state_name} · ${r.state_transition_risk} Transition Watch`}
          body={r.consumer_state_recommendation}
        />
        <div className="mb-4">
          <ConsumerStateArc currentState={r.consumer_state} />
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">{r.consumer_state_diagnosis}</p>
      </div>

      {/* ── Signal Intelligence ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
        <SectionLabel>Signal Intelligence — Public Proxy Reads</SectionLabel>
        <StrategicPOV
          header={`${strongCount} Strong · ${watchCount} Need Attention`}
          body={r.efficiency_opportunity}
        />
        <div className="space-y-3">
          {visibleSignals.map((s) => {
            const sig = r.signals[s.key] as SignalItem;
            if (!sig) return null;
            const sc       = signalStatusColor(sig.status);
            const barScore = signalStatusScore(sig.status);
            return (
              <div key={s.key} className="border border-neutral-100 rounded-xl p-3 bg-neutral-50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-800">{s.label}</span>
                      {directionIcon(sig.direction)}
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-0.5">{sig.value_label}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${sc.badge}`}>
                    {sig.status}
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden mb-2">
                  <div className={`${sc.bar} h-2 rounded-full`} style={{ width: `${barScore}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-neutral-100 rounded-lg px-2 py-1.5">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide mb-0.5">MY Benchmark</p>
                    <p className="text-[10px] text-neutral-600 leading-snug">{sig.benchmark_context}</p>
                  </div>
                  <div className="bg-white border border-neutral-100 rounded-lg px-2 py-1.5">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide mb-0.5">Efficiency Read</p>
                    <p className="text-[10px] text-neutral-600 leading-snug">{sig.efficiency_read}</p>
                  </div>
                </div>
                {s.key === "review_platform" && sig.score_proxy && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-500">Public Rating:</span>
                    <span className="text-sm font-bold text-neutral-800">{sig.score_proxy}/5.0</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-neutral-400 text-center mt-4">
          All reads from public sources. Confirmed client data unlocks 8 additional signal dimensions.
        </p>
      </div>

      {/* ── Audience Intelligence ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
        <SectionLabel>Audience Intelligence</SectionLabel>
        <StrategicPOV
          header={`${r.audience_intent} · ${r.audience_acquisition_pct}% Acquisition Focus`}
          body={r.audience_recommendation}
        />
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-semibold text-neutral-500 mb-1.5">
              <span>Acquisition {r.audience_acquisition_pct}%</span>
              <span>Retention {r.audience_retention_pct}%</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden">
              <div className="bg-neutral-700" style={{ width: `${r.audience_acquisition_pct}%` }} />
              <div className="bg-sky-400"     style={{ width: `${r.audience_retention_pct}%` }} />
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-1 rounded-full border shrink-0 ${
            r.audience_intent === "Balanced" ? "bg-sky-50 border-sky-200 text-sky-700" :
            "bg-amber-50 border-amber-200 text-amber-700"
          }`}>{r.audience_intent}</span>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">{r.audience_diagnosis}</p>
      </div>

      {/* ── AI Brand Visibility ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
        <SectionLabel>AI Brand Visibility</SectionLabel>
        <StrategicPOV
          header={`${r.ai_visibility_score}/10 · ${aiVisLabel}`}
          body={r.ai_visibility_recommendation}
        />
        <div className="flex items-center gap-4">
          <div className="text-center shrink-0">
            <p className={`text-4xl font-bold leading-none ${scoreColor(r.ai_visibility_score * 10)}`}>
              {r.ai_visibility_score}
            </p>
            <p className="text-neutral-300 text-sm font-light">/10</p>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-3">
              <div className={`h-2 rounded-full ${
                r.ai_visibility_score >= 7 ? "bg-emerald-500" :
                r.ai_visibility_score >= 4 ? "bg-amber-400" : "bg-red-400"
              }`} style={{ width: `${r.ai_visibility_score * 10}%` }} />
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">{r.ai_visibility_diagnosis}</p>
          </div>
        </div>
      </div>

      {/* ── Gate Intelligence ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
        <SectionLabel>Gate Intelligence — Budget Phase Decision</SectionLabel>
        <StrategicPOV
          header={`${r.gate_status} — ${r.budget_release_recommendation}`}
          body={r.gate_recommendation}
        />
        <div className="mb-5">
          <PhaseTimeline phase={r.campaign_phase} weekRange={r.estimated_campaign_week} />
        </div>
        <div className="flex items-start gap-4 mb-4">
          <div className={`px-3 py-2 rounded-xl ${gate.bg} shrink-0 text-center min-w-[90px]`}>
            <p className={`text-xs font-bold ${gate.text}`}>{gate.label}</p>
            <p className={`text-[9px] mt-0.5 ${gate.text} opacity-80`}>{r.budget_release_recommendation}</p>
          </div>
          <div className="flex-1 space-y-2">
            {r.gate_conditions.map((gc, i) => (
              <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 ${
                gc.met ? "bg-emerald-50 border border-emerald-100" : "bg-neutral-50 border border-neutral-100"
              }`}>
                <span className={`text-xs font-bold shrink-0 mt-0.5 ${gc.met ? "text-emerald-600" : "text-neutral-400"}`}>
                  {gc.met ? "✓" : "○"}
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-neutral-700">{gc.condition}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{gc.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5">
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mb-1">Key Watch</p>
            <p className="text-[11px] text-neutral-700 leading-snug">{r.primary_risk}</p>
          </div>
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Highest Leverage</p>
            <p className="text-[11px] text-neutral-700 leading-snug">{r.efficiency_opportunity}</p>
          </div>
        </div>
      </div>

      {/* ── Strategic Recommendations ── */}
      <div>
        <SectionLabel>Strategic Recommendations</SectionLabel>
        <StrategicPOV
          header={`${r.risk_level} Priority · ${r.recommendations.length} Actions`}
          body={r.primary_risk}
        />
        <div className="space-y-3">
          {r.recommendations.map((rec) => (
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

      {/* ── Intelligence Gaps ── */}
      <div className="rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="bg-neutral-900 px-5 py-4">
          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Intelligence Gaps</p>
          <p className="text-sm font-semibold text-white">What this preview cannot see — what ShiftImpact OS clients get every week</p>
        </div>
        <div className="bg-neutral-50 px-5 py-4 space-y-3">
          {r.intelligence_gaps.map((gap, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-4 h-4 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[8px] font-bold text-neutral-500">?</span>
              </span>
              <p className="text-xs text-neutral-600 leading-relaxed">{gap}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Efficiency Summary — before CTA ── */}
      <EfficiencyImpact
        items={visibleSignals.map(s => ({ label: s.label, sig: r.signals[s.key] as SignalItem }))}
      />

      {/* ── CTA ── */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm px-6 py-6 text-center">
        <p className="text-sm font-semibold text-neutral-900 mb-1">
          Get full campaign intelligence — confirmed, weekly, with attribution.
        </p>
        <p className="text-xs text-neutral-400 mb-5 max-w-sm mx-auto">
          This preview used public signals only. Partnership with ShiftImpact OS unlocks all signal dimensions, gate tracking, and confirmed attribution — updated every week of your campaign.
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
        <p className="text-[9px] text-neutral-400 mt-4">
          ShiftImpact OS · Malaysia&apos;s first campaign intelligence operating system · Built for marketing and business leaders
        </p>
      </div>

    </div>
  );
}
