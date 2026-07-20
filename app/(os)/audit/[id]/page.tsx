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
  if (r === "Strong")    return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" };
  if (r === "On Track")  return { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    dot: "bg-blue-500" };
  if (r === "At Risk")   return { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-500" };
  return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" };
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-600";
}

function scoreBarColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-400";
  return "bg-red-400";
}

function signalStatusColor(status: string) {
  if (["Strong", "Lifting", "Active", "Above Benchmark", "Above Floor"].includes(status))
    return { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" };
  if (["Elevated", "On Par", "At Floor", "Stable", "At Benchmark", "Solid", "Moderate"].includes(status))
    return { badge: "bg-blue-50 text-blue-700 border-blue-200", bar: "bg-blue-400" };
  if (["Below Category", "Below Floor", "Passive", "Minimal", "Needs Attention"].includes(status))
    return { badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-400" };
  if (["Weak", "Declining", "Risk"].includes(status))
    return { badge: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-400" };
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
  if (g === "Conditional Release") return { bg: "bg-blue-500",    text: "text-white", label: "◐ Conditional" };
  if (g === "Hold")                return { bg: "bg-amber-500",   text: "text-white", label: "⏸ Hold" };
  return { bg: "bg-red-500", text: "text-white", label: "↺ Pivot" };
}

function riskColor(r: string) {
  if (r === "Low")      return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (r === "Medium")   return "text-amber-700 bg-amber-50 border-amber-200";
  if (r === "High")     return "text-red-700 bg-red-50 border-red-200";
  return "text-red-900 bg-red-100 border-red-300";
}

// ─── Visual components ────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = 45;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const circumference = Math.PI * r;
  const filled = (score / 100) * circumference;
  const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#f3f4f6" strokeWidth="10" strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
    </svg>
  );
}

function SignalBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
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
        const isPast = s.n < currentState;
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${isActive ? "bg-neutral-900 border-neutral-900 text-white scale-110" :
                  isPast  ? "bg-emerald-500 border-emerald-500 text-white" :
                            "bg-white border-neutral-200 text-neutral-400"}`}>
                {isPast ? "✓" : s.n}
              </div>
              <p className={`text-center mt-1 leading-tight whitespace-pre-line
                ${isActive ? "text-neutral-900 font-semibold" : "text-neutral-400"}
                text-[9px]`}>
                {s.label}
              </p>
            </div>
            {i < states.length - 1 && (
              <div className={`h-px w-full mx-0.5 ${s.n < currentState ? "bg-emerald-400" : "bg-neutral-200"}`} />
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
        const isPast = i < idx;
        const widths = ["flex-[2]", "flex-[2]", "flex-[1]"];
        return (
          <div key={p} className={`${widths[i]} flex flex-col`}>
            <div className={`h-2 rounded-sm mr-0.5
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

function CMBACard({ title, finding, action, impact, priority }: {
  title: string; finding: string; action: string; impact: string; priority: number;
}) {
  return (
    <div className="bg-neutral-900 rounded-xl p-4 text-white">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-white">{priority}</span>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-0.5">CMBA Priority {priority}</p>
          <p className="text-sm font-bold text-white leading-snug">{title}</p>
        </div>
      </div>
      <div className="space-y-2.5 pl-9">
        <div>
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Intelligence Read</p>
          <p className="text-xs text-neutral-300 leading-relaxed">{finding}</p>
        </div>
        <div className="border-t border-white/10 pt-2.5">
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Strategic Action</p>
          <p className="text-xs text-white leading-relaxed">{action}</p>
        </div>
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">Business Impact</p>
          <p className="text-xs text-neutral-200 leading-relaxed">{impact}</p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">{children}</p>
  );
}

function AssessmentBlock({ text }: { text: string }) {
  return (
    <div className="mt-3 bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5">
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">CMBA Assessment</p>
      <p className="text-xs text-neutral-700 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: audit, error } = await supabase
    .from("quick_audits")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !audit) notFound();

  const a = audit as QuickAudit;
  const r = a.result;
  const rating = ratingColor(r.effectiveness_rating);
  const gate = gateColor(r.gate_status);
  const generatedDate = new Date(a.created_at).toLocaleDateString("en-MY", {
    day: "numeric", month: "long", year: "numeric",
  });

  const ICS_DIMS = [
    { key: "cultural_fit",          label: "Cultural Fit",          weight: 20 },
    { key: "business_alignment",    label: "Business Alignment",    weight: 20 },
    { key: "audience_tension",      label: "Audience Tension",      weight: 20 },
    { key: "executional_coherence", label: "Executional Coherence", weight: 15 },
    { key: "measurability",         label: "Measurability",         weight: 15 },
    { key: "scalability",           label: "Scalability",           weight: 10 },
  ];

  const CORE_SIGNALS: { key: keyof typeof r.signals; label: string; always: boolean }[] = [
    { key: "sov",            label: "Share of Voice",        always: true },
    { key: "save_rate",      label: "Save Rate",             always: true },
    { key: "share_rate",     label: "Share Rate",            always: true },
    { key: "branded_search", label: "Branded Search Lift",   always: true },
    { key: "kol_earned",     label: "KOL / Earned Media",    always: true },
    { key: "vcr",            label: "Video Completion Rate", always: false },
    { key: "pr_earned",      label: "PR Coverage",           always: false },
    { key: "review_platform",label: "Review Platform",       always: false },
    { key: "retail_signal",  label: "Retail / E-commerce",   always: false },
  ];

  const visibleSignals = CORE_SIGNALS.filter(s => {
    if (s.always) return true;
    const sig = r.signals[s.key] as SignalItem & { include?: boolean };
    return sig?.include === true;
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">

      {/* ── Header ── */}
      <div className="border-b border-neutral-100 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
              ShiftImpact OS · Campaign Intelligence Preview
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{a.brand_name}</h1>
            <p className="text-sm text-neutral-500 mt-0.5">{a.campaign_name} · {a.industry}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-neutral-400">{generatedDate}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold text-neutral-400 border border-neutral-200 rounded px-2 py-0.5 bg-neutral-50">
              Public signals only
            </span>
          </div>
        </div>

        {/* ── Top 3 scores ── */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {/* Effectiveness */}
          <div className={`rounded-xl border ${rating.border} ${rating.bg} p-3 text-center`}>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-1">Effectiveness</p>
            <p className={`text-3xl font-bold ${scoreColor(r.effectiveness_score)}`}>{r.effectiveness_score}</p>
            <span className={`text-[10px] font-semibold ${rating.text}`}>{r.effectiveness_rating}</span>
          </div>
          {/* ICS */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-1">Idea Certainty</p>
            <p className={`text-3xl font-bold ${scoreColor(r.ics_score)}`}>{r.ics_score}</p>
            <span className={`text-[10px] font-semibold ${
              r.ics_threshold === "Advance" ? "text-emerald-700" :
              r.ics_threshold === "Conditional" ? "text-amber-700" : "text-red-700"
            }`}>{r.ics_threshold}</span>
          </div>
          {/* Gate */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-1">Gate Status</p>
            <div className="mt-1.5">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${gate.bg} ${gate.text}`}>
                {gate.label}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1.5">{r.campaign_phase} · Wk {r.estimated_campaign_week}</p>
          </div>
        </div>
      </div>

      {/* ── Campaign Effectiveness ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5">
        <SectionLabel>Campaign Effectiveness Diagnosis</SectionLabel>
        <div className="flex items-start gap-5">
          <div className="shrink-0 text-center">
            <ScoreGauge score={r.effectiveness_score} size={130} />
            <p className={`text-3xl font-bold -mt-2 ${scoreColor(r.effectiveness_score)}`}>{r.effectiveness_score}</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-neutral-900 leading-snug mb-2">{r.effectiveness_headline}</p>
            <p className="text-xs text-neutral-600 leading-relaxed">{r.effectiveness_diagnosis}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-[10px] font-semibold border px-2 py-1 rounded-full ${ratingColor(r.effectiveness_rating).badge ?? "bg-neutral-50 border-neutral-200 text-neutral-600"}`}>
                {r.effectiveness_rating}
              </span>
              <span className={`text-[10px] font-semibold border px-2 py-1 rounded-full ${riskColor(r.risk_level)}`}>
                {r.risk_level} Risk
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Campaign Engine ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5">
        <SectionLabel>Campaign Engine — Media vs Idea</SectionLabel>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-700">
            {r.engine_type}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            r.engine_type === "Idea-Driven" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
            r.engine_type === "Hybrid"      ? "bg-blue-50 border-blue-200 text-blue-700" :
                                              "bg-amber-50 border-amber-200 text-amber-700"
          }`}>{r.engine_type}</span>
        </div>

        {/* Split bar */}
        <div className="flex h-4 rounded-lg overflow-hidden mb-2">
          <div
            className="bg-neutral-900 flex items-center justify-center"
            style={{ width: `${r.engine_media_pct}%` }}
          >
            {r.engine_media_pct > 15 && (
              <span className="text-[9px] font-bold text-white">{r.engine_media_pct}% Media</span>
            )}
          </div>
          <div
            className="bg-emerald-400 flex items-center justify-center"
            style={{ width: `${r.engine_idea_pct}%` }}
          >
            {r.engine_idea_pct > 15 && (
              <span className="text-[9px] font-bold text-white">{r.engine_idea_pct}% Idea</span>
            )}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-neutral-400 mb-3">
          <span>Media-Compensated</span>
          <span>Idea-Driven</span>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">{r.engine_diagnosis}</p>
        <AssessmentBlock text={r.engine_recommendation} />
      </div>

      {/* ── Consumer State ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5">
        <SectionLabel>Consumer Behaviour State</SectionLabel>
        <div className="mb-4">
          <ConsumerStateArc currentState={r.consumer_state} />
        </div>
        <div className="flex items-start gap-3">
          <div className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border ${
            r.state_transition_risk === "Low"    ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
            r.state_transition_risk === "Medium" ? "bg-amber-50 border-amber-200 text-amber-700" :
                                                   "bg-red-50 border-red-200 text-red-700"
          }`}>
            {r.state_transition_risk} transition risk
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">State {r.consumer_state} — {r.consumer_state_name}</p>
          </div>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed mt-2">{r.consumer_state_diagnosis}</p>
        <AssessmentBlock text={r.consumer_state_recommendation} />
      </div>

      {/* ── Signal Health ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5">
        <SectionLabel>Signal Intelligence — Public Proxy Reads</SectionLabel>
        <div className="space-y-4">
          {visibleSignals.map((s) => {
            const sig = r.signals[s.key] as SignalItem;
            if (!sig) return null;
            const sc = signalStatusColor(sig.status);
            const barScore = signalStatusScore(sig.status);

            return (
              <div key={s.key} className="border border-neutral-100 rounded-xl p-3 bg-neutral-50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-800">{s.label}</span>
                      {directionIcon(sig.direction)}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{sig.value_label}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${sc.badge}`}>
                    {sig.status}
                  </span>
                </div>
                <SignalBar score={barScore} color={sc.bar} />
                <div className="mt-2 grid grid-cols-2 gap-2">
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
        <p className="text-[10px] text-neutral-400 text-center mt-3">
          All signal reads derived from public sources. Confirmed client data unlocks 8 additional signal dimensions.
        </p>
      </div>

      {/* ── Audience Intelligence ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5">
        <SectionLabel>Audience Intelligence — Acquisition vs Retention</SectionLabel>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-[10px] font-semibold text-neutral-600 mb-1">
              <span>Acquisition {r.audience_acquisition_pct}%</span>
              <span>Retention {r.audience_retention_pct}%</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div className="bg-neutral-700" style={{ width: `${r.audience_acquisition_pct}%` }} />
              <div className="bg-blue-400" style={{ width: `${r.audience_retention_pct}%` }} />
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${
            r.audience_intent === "Balanced" ? "bg-blue-50 border-blue-200 text-blue-700" :
            "bg-amber-50 border-amber-200 text-amber-700"
          }`}>{r.audience_intent}</span>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">{r.audience_diagnosis}</p>
        <AssessmentBlock text={r.audience_recommendation} />
      </div>

      {/* ── AI Brand Visibility ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5">
        <SectionLabel>AI Brand Visibility (F23)</SectionLabel>
        <div className="flex items-center gap-4 mb-3">
          <div className="text-center shrink-0">
            <p className={`text-4xl font-bold ${scoreColor(r.ai_visibility_score * 10)}`}>
              {r.ai_visibility_score}<span className="text-lg text-neutral-400 font-normal">/10</span>
            </p>
            <p className={`text-[10px] font-semibold mt-0.5 ${
              r.ai_visibility_score >= 7 ? "text-emerald-700" :
              r.ai_visibility_score >= 4 ? "text-amber-700" : "text-red-700"
            }`}>{r.ai_visibility_label}</p>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-3">
              <div
                className={`h-2 rounded-full ${r.ai_visibility_score >= 7 ? "bg-emerald-500" : r.ai_visibility_score >= 4 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${r.ai_visibility_score * 10}%` }}
              />
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">{r.ai_visibility_diagnosis}</p>
          </div>
        </div>
        <AssessmentBlock text={r.ai_visibility_recommendation} />
      </div>

      {/* ── Gate Intelligence ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5">
        <SectionLabel>Gate Intelligence — Budget Phase Decision</SectionLabel>

        {/* Phase timeline */}
        <div className="mb-5">
          <PhaseTimeline phase={r.campaign_phase} weekRange={r.estimated_campaign_week} />
        </div>

        {/* Gate status + conditions */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`px-3 py-2 rounded-xl ${gate.bg} shrink-0 text-center min-w-[90px]`}>
            <p className={`text-xs font-bold ${gate.text}`}>{gate.label}</p>
            <p className={`text-[10px] mt-0.5 ${gate.text} opacity-80`}>{r.budget_release_recommendation}</p>
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

        <p className="text-xs text-neutral-600 leading-relaxed mb-2">{r.gate_recommendation}</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5">
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide mb-1">Primary Risk</p>
            <p className="text-[11px] text-neutral-700 leading-snug">{r.primary_risk}</p>
          </div>
          <div className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Efficiency Opportunity</p>
            <p className="text-[11px] text-neutral-700 leading-snug">{r.efficiency_opportunity}</p>
          </div>
        </div>
      </div>

      {/* ── ICS Breakdown ── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <SectionLabel>Idea Certainty Score — Brief Architecture</SectionLabel>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-bold ${scoreColor(r.ics_score)}`}>{r.ics_score}</p>
            <p className={`text-[10px] font-semibold ${
              r.ics_threshold === "Advance"     ? "text-emerald-700" :
              r.ics_threshold === "Conditional" ? "text-amber-700" : "text-red-700"
            }`}>{r.ics_threshold}</p>
          </div>
        </div>

        {/* Inferred big idea */}
        {r.inferred_big_idea && (
          <div className="border-l-2 border-neutral-300 pl-3 mb-4">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-0.5">Inferred Campaign Idea</p>
            <p className="text-xs text-neutral-700 italic">&ldquo;{r.inferred_big_idea}&rdquo;</p>
          </div>
        )}

        <div className="space-y-3">
          {ICS_DIMS.map((dim) => {
            const score = r.ics_scores[dim.key] ?? 3;
            const pct = score * 20;
            const barCol = scoreBarColor(pct);
            return (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-neutral-700">
                    {dim.label}
                    <span className="ml-1 text-[10px] font-normal text-neutral-400">({dim.weight}%)</span>
                  </span>
                  <span className={`text-[10px] font-bold ${scoreColor(pct)}`}>{score}/5</span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-1">
                  <div className={`${barCol} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed">{r.ics_reasoning[dim.key]}</p>
              </div>
            );
          })}
        </div>
        {r.frame_diagnosis && (
          <AssessmentBlock text={r.frame_diagnosis} />
        )}
      </div>

      {/* ── CMBA Strategic Recommendations ── */}
      <div>
        <SectionLabel>CMBA Strategic Recommendations</SectionLabel>
        <div className="space-y-3">
          {r.recommendations.map((rec) => (
            <CMBACard
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

      {/* ── Intelligence Gaps (sales section) ── */}
      <div className="rounded-xl border border-neutral-200 overflow-hidden">
        <div className="bg-neutral-900 px-5 py-4">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Intelligence Gaps</p>
          <p className="text-sm font-semibold text-white">What this preview cannot see — what ShiftImpact OS clients get every week</p>
        </div>
        <div className="bg-neutral-50 px-5 py-4 space-y-3">
          {r.intelligence_gaps.map((gap, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-neutral-500">?</span>
              </span>
              <p className="text-xs text-neutral-700 leading-relaxed">{gap}</p>
            </div>
          ))}
        </div>
        <div className="bg-white border-t border-neutral-100 px-5 py-5 text-center">
          <p className="text-sm font-semibold text-neutral-900 mb-1">
            Get this intelligence for your next campaign — confirmed, weekly, with full attribution.
          </p>
          <p className="text-xs text-neutral-500 mb-4">
            This preview used public signals only. Partnership with ShiftImpact OS unlocks all signal dimensions, gate convergence tracking, and confirmed attribution — updated every week of your campaign flight.
          </p>
          <a
            href="mailto:whyjaninerocks@gmail.com?subject=ShiftImpact OS — Campaign Intelligence Partnership&body=Hi Janine,%0A%0AI reviewed the Campaign Intelligence Preview for [Brand] and would like to explore a partnership.%0A%0A"
            className="inline-block bg-neutral-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            Book a Strategy Call →
          </a>
          <p className="text-[10px] text-neutral-400 mt-3">
            ShiftImpact OS · Malaysia&apos;s first campaign intelligence operating system · Built for CMO-level decisions
          </p>
        </div>
      </div>

    </div>
  );
}
