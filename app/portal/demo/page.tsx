"use client";

// /portal/demo — Cooks · Jadikan Caramu
// v4: sparkline trackers, latest week first, larger fonts, wider sidebar, full-width main content

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red" | "neutral";

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({
  values,
  gate,
  color = "#34d399",
  gateColor = "#f87171",
}: {
  values: number[];
  gate?: number;
  color?: string;
  gateColor?: string;
}) {
  const min = Math.min(...values, gate ?? Infinity) * 0.97;
  const max = Math.max(...values, gate ?? -Infinity) * 1.03;
  const range = max - min || 1;
  const W = 200, H = 56, px = 6, py = 8;

  const x = (i: number) => px + (i / (values.length - 1)) * (W - px * 2);
  const y = (v: number) => H - py - ((v - min) / range) * (H - py * 2);

  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${x(values.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`;

  const gateY = gate !== undefined ? y(gate) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }}>
      {/* Area fill */}
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace("#", "")})`} />

      {/* Gate line */}
      {gateY !== null && (
        <line x1={px} y1={gateY} x2={W - px} y2={gateY}
          stroke={gateColor} strokeWidth="1.5" strokeDasharray="5 3" strokeOpacity="0.7" />
      )}

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4 : 2.5}
          fill={i === values.length - 1 ? color : "white"}
          stroke={color} strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// ─── Weekly data ──────────────────────────────────────────────────────────────

// Latest week first (descending)
const WEEKS = [
  { n: 6, date: "17 Aug", health: 74, posture: "Gaining",    dot: "green", current: true },
  { n: 5, date: "4 Aug",  health: 69, posture: "Gaining",    dot: "green" },
  { n: 4, date: "28 Jul", health: 67, posture: "Plateauing", dot: "amber" },
  { n: 3, date: "21 Jul", health: 63, posture: "Plateauing", dot: "amber" },
  { n: 2, date: "14 Jul", health: 59, posture: "Fragile",    dot: "red"   },
  { n: 1, date: "7 Jul",  health: 52, posture: "Fragile",    dot: "red"   },
];

// Sparkline series (Wk 1 → 6, ascending for chart rendering)
const SERIES = {
  health:  { values: [52, 59, 63, 67, 69, 74],               label: "Campaign health",     unit: "",    current: "74",   delta: "+5",   tone: "green" as Tone, color: "#34d399" },
  save:    { values: [4.2, 4.8, 5.1, 5.5, 5.7, 6.1], gate: 8, label: "Content save rate",  unit: "%",   current: "6.1%", delta: "+0.4%", tone: "amber" as Tone, color: "#f59e0b", gateLabel: "Gate ≥8%" },
  search:  { values: [9.8, 10.5, 11.3, 12.0, 12.9, 14.2], gate: 18, label: "Brand search share", unit: "%", current: "14.2%", delta: "+1.8%", tone: "amber" as Tone, color: "#818cf8", gateLabel: "Target 18%" },
};

// ─── Current week content (Week 6) ───────────────────────────────────────────

const W6 = {
  health: 74, healthDelta: "+5", posture: "Gaining",
  verdict:
    "The campaign is building correctly at the midpoint. Brand demand is accelerating ahead of Merdeka. The only open item is pushing save rate over the gate threshold in the next 2 weeks — and this week's creative brief is the lever.",

  actions: [
    {
      finding: "Recipe content saves at 2.3× the rate of lifestyle content",
      implication:
        "Audiences are bookmarking Cooks recipes for later use — a pre-purchase signal that precedes conversion spikes by 10–14 days. The current creative mix is 60% lifestyle, 40% recipe. This is the wrong way around.",
      brief: {
        label: "Creative brief — Week 7",
        lines: [
          "Format: Recipe-led process video — cooking steps, not product close-up",
          "Dishes: Ayam Percik, Rendang Tok, Sup Tulang — high Merdeka search intent",
          "Frame: Cooking confidence (your version, not the shortcut)",
          "Mix target: 70% recipe / 30% lifestyle for this week",
          "Channels: TikTok + Instagram Reels first, Meta feed second",
        ],
      },
    },
    {
      finding: "Brand search interest is growing 2.1× faster than the cooking category",
      implication:
        "Consumers are actively looking for Cooks — not just browsing cooking sauce brands. Earned demand converts 40–60% better than paid-for reach. Pulling search spend now would be the single costliest error at this stage.",
      brief: {
        label: "Media brief — Week 7",
        lines: [
          "Protect branded search budget — no reallocation to social this week",
          "Add 3 branded keyword variants: 'Cooks sos ayam', 'Cooks rendang', 'Cooks resipi'",
          "Negative-match competitor brand terms to protect share gains",
        ],
      },
    },
    {
      finding: "Micro-KOLs are delivering 1.6× better save rates than mid-tier",
      implication:
        "Two mid-tier KOLs are generating reach but not saves — they are spending budget that is not moving the gate signal. Micro-KOLs are delivering 7–8% save rates with 38% of the total KOL budget.",
      brief: {
        label: "KOL brief — Phase 2 planning",
        lines: [
          "Do not renew mid-tier KOL contracts for Phase 2",
          "Reallocate budget to the top 3 micro-KOLs and 2 new Klang Valley food creators",
          "Recruitment criteria: save rate history ≥7%, recipe-format, 25–40k followers",
        ],
      },
    },
  ],

  horizon: {
    gateLabel: "Gate 1 — Phase 2 budget release",
    gateCondition: "Save Rate ≥8% held 3 consecutive days + Branded search +40%",
    prediction:
      "At current save-rate growth (+0.4pp per week), Gate 1 is achievable by Week 8. If the creative brief is actioned this week and the mix shifts to recipe-led, the growth rate should accelerate — Gate 1 in Week 7–8 is realistic. If the brief is not actioned, Gate 1 slips to Week 10 and Phase 2 budget is locked for an additional 2 weeks.",
    horizonItems: [
      { timeframe: "This week",  note: "Action the creative brief. Shift to 70% recipe-led." },
      { timeframe: "Weeks 7–8", note: "Gate 1 fires if save rate holds ≥8% for 3 consecutive days." },
      { timeframe: "Week 9+",   note: "Phase 2 (Conversion) budget releases. TikTok Shop mechanics activate." },
    ],
    budgetStatus: "Phase 2 budget is locked until Gate 1 fires and holds.",
  },

  ics: { score: 76, rating: "CONDITIONAL", note: "Campaign idea is well-matched to this audience. Execution coherence is the gap — the creative fixes above are addressing it directly. Industry avg: 67." },

  relativePosition: [
    { label: "Category leader",  pct: 81 },
    { label: "Cooks",            pct: 76, isSelf: true },
    { label: "Challenger 2",     pct: 74 },
    { label: "Challenger 3",     pct: 59 },
  ],

  kolTopline: { active: 5, atGate: 1, attention: 2, underperforming: 2, avgSave: "6.3%", gateSave: "≥8%" },

  signals: [
    { label: "Brand search share", actual: "14.2%", target: "18%",  pct: 79, delta: "+1.8%",  tone: "amber" as Tone },
    { label: "Content save rate",  actual: "6.1%",  target: "≥8%",  pct: 76, delta: "+0.4%",  tone: "amber" as Tone },
    { label: "UGC volume",         actual: "28",    target: "40",   pct: 70, delta: "+6 pcs",  tone: "amber" as Tone },
  ],

  roadmap: [
    { phase: "Phase 1 — Demand",            dates: "Jul–Aug",  active: true,  gated: false, note: "Build demand. Gate 1 fires on save rate." },
    { phase: "Phase 2 — Conversion",        dates: "Sep–Oct",  active: false, gated: true,  note: "Locked. Releases when Gate 1 fires." },
    { phase: "Phase 3 — Retention + Scale", dates: "Nov–Dec",  active: false, gated: true,  note: "Locked. Releases when Gate 2 fires." },
  ],

  marketContext: [
    { icon: "🎌", note: "Merdeka 31 Aug — patriotic heritage frame live. Recipe content anchored to 'Masakan Malaysia Asli' getting elevated reach. 2-week window remaining." },
    { icon: "📱", note: "TikTok algorithm update: recipe-format videos getting 1.4× distribution boost. Lifestyle + product close-up is being deprioritised." },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toneDot(t: string) {
  return t === "green" ? "bg-green-500" : t === "amber" ? "bg-amber-400" : t === "red" ? "bg-red-500" : "bg-neutral-400";
}
function toneBar(t: Tone) {
  return t === "green" ? "bg-green-500" : t === "amber" ? "bg-amber-400" : "bg-red-400";
}
function postureColor(p: string) {
  return p === "Gaining" ? "text-emerald-400" : p === "Plateauing" ? "text-amber-400" : "text-red-400";
}

function SectionQ({ q, label, children }: { q: string; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{q}</span>
        <h2 className="text-xl font-bold text-neutral-900">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-base font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
      >
        <span>{label}</span>
        <svg className={`w-5 h-5 text-neutral-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-neutral-100 px-5 py-5">{children}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortalDemoPage() {
  const [selectedWeek, setSelectedWeek] = useState(6);
  const week = W6;
  const circumference = 138.23;
  const arcLen = (week.health / 100) * circumference;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex">

      {/* ═══════════════════════════════════════════════════════
          SIDEBAR — desktop (lg+), w-80
      ═══════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-[340px] shrink-0 fixed top-0 left-0 h-screen bg-neutral-900 text-white overflow-y-auto z-20">

        {/* Demo label */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Capabilities showcase</p>
          <p className="text-xs text-neutral-500 mt-0.5">Illustrative data · ShiftImpact OS</p>
        </div>

        {/* Campaign identity */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs text-neutral-400 mb-1">Cooks · FMCG · Cooking Sauces</p>
          <p className="text-lg font-bold leading-tight">Jadikan Caramu</p>
          <p className="text-xs text-neutral-400 mt-1.5">Phase 1 — Demand · Jul–Aug 2026</p>
        </div>

        {/* Health ring */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="5"
                strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-emerald-400">{week.health}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Campaign health</p>
            <p className={`text-xl font-bold ${postureColor(week.posture)}`}>{week.posture}</p>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5">{week.healthDelta} pts this week</p>
          </div>
        </div>

        {/* Health sparkline in sidebar */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs text-neutral-400 mb-2">Health trajectory · Wk 1 → 6</p>
          <Sparkline values={SERIES.health.values} color="#34d399" />
          <div className="flex items-center justify-between text-xs text-neutral-500 mt-1">
            <span>Wk 1 · 52</span>
            <span className="text-emerald-400 font-semibold">Wk 6 · 74 ↑</span>
          </div>
        </div>

        {/* Week timeline — latest first */}
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold px-1 mb-2">Report history</p>
          <div className="space-y-0.5">
            {WEEKS.map(w => (
              <button key={w.n} onClick={() => setSelectedWeek(w.n)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  selectedWeek === w.n ? "bg-white/15" : "hover:bg-white/8"
                }`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${toneDot(w.dot)}`} />
                <span className={`text-sm flex-1 ${selectedWeek === w.n ? "font-semibold text-white" : "text-neutral-300"}`}>
                  Week {w.n} · {w.date}
                </span>
                <span className={`text-xs ${postureColor(w.posture)}`}>{w.health}</span>
                {w.current && (
                  <span className="text-[10px] font-bold text-emerald-400 border border-emerald-400/40 rounded px-1.5 py-0.5">NOW</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="px-4 py-4 flex-1">
          <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold px-1 mb-2">This report</p>
          {[
            { href: "#glance", label: "At a glance" },
            { href: "#q1",     label: "Is it working?" },
            { href: "#q2",     label: "What do I do now?" },
            { href: "#q3",     label: "Are we on track?" },
            { href: "#detail", label: "Deep dive" },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-white/8 transition-colors">
              {item.label}
            </a>
          ))}
        </div>

        {/* Rule */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-sm font-bold text-white mb-1">The ShiftImpact Rule</p>
          <p className="text-xs text-neutral-400 leading-relaxed">Budget moves because a signal fired and held — not because a date arrived.</p>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════
          MOBILE HEADER
      ═══════════════════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-neutral-900 text-white shadow-lg">
        <div className="bg-amber-900/60 px-4 py-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <p className="text-xs font-medium text-amber-200">ShiftImpact OS · Capabilities showcase · illustrative data</p>
        </div>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-neutral-400">Cooks · Jadikan Caramu</p>
            <p className="text-base font-bold">Week {selectedWeek} · 17 Aug 2026</p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-10 h-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="6"
                  strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400">{week.health}</span>
              </div>
            </div>
            <div>
              <p className={`text-base font-bold ${postureColor(week.posture)}`}>{week.posture}</p>
              <p className="text-xs text-emerald-400">{week.healthDelta} pts</p>
            </div>
          </div>
        </div>
        {/* Week pills — latest first */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {WEEKS.map(w => (
            <button key={w.n} onClick={() => setSelectedWeek(w.n)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-colors ${
                selectedWeek === w.n
                  ? "bg-white text-neutral-900 border-white"
                  : "bg-transparent text-neutral-400 border-white/20 hover:border-white/40"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${toneDot(w.dot)}`} />
              Wk {w.n}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════ */}
      <main className="lg:ml-80 xl:ml-[340px] flex-1 min-w-0">

        {/* Desktop demo banner */}
        <div className="hidden lg:flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-8 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            ShiftImpact OS · Capabilities showcase — illustrative data. This is what your campaign portal looks like when live.
          </p>
        </div>

        <div className="px-5 sm:px-8 lg:px-10 py-7 lg:py-8">

          {/* Report header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-sm text-neutral-400">17 August 2026 · Week 6 of 12</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mt-1">Growth Intelligence Report</h1>
              <p className="text-base text-neutral-500 mt-1">Jadikan Caramu · Phase 1 — Demand</p>
            </div>
            <span className="inline-flex items-center text-sm font-semibold px-3 py-1 rounded-full border bg-green-50 text-green-800 border-green-200 shrink-0">
              Strategist reviewed
            </span>
          </div>

          {/* ── At a glance — sparkline tracker cards ─────────── */}
          <div id="glance" className="mb-10">
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="text-xl font-bold text-neutral-900">At a glance</h2>
              <span className="text-sm text-neutral-400">Week-on-week · Weeks 1–6</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(SERIES).map(([key, s]) => (
                <div key={key} className="bg-white rounded-2xl border border-neutral-100 shadow-sm px-5 py-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-semibold text-neutral-600">{s.label}</p>
                    {("gateLabel" in s) && (
                      <span className="text-[11px] text-red-500 font-semibold shrink-0 ml-2">{(s as typeof SERIES.save).gateLabel}</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-neutral-900">{s.current}</span>
                    <span className={`text-sm font-bold ${s.tone === "green" ? "text-emerald-600" : s.tone === "amber" ? "text-amber-600" : "text-red-600"}`}>
                      ↑ {s.delta}
                    </span>
                  </div>
                  <Sparkline
                    values={s.values}
                    gate={"gate" in s ? (s as typeof SERIES.save).gate : undefined}
                    color={s.color}
                  />
                  <p className="text-xs text-neutral-400 mt-2">
                    {"gateLabel" in s
                      ? `Dashed line = gate threshold`
                      : `Wk 1 → Wk 6 progression`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Q1: Is it working? ────────────────────────────── */}
          <div id="q1">
            <SectionQ q="01" label="Is it working?">
              <div className="rounded-2xl bg-neutral-900 text-white px-6 py-6 space-y-5">

                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">This week&apos;s verdict</p>
                  <p className="text-base leading-relaxed text-neutral-100">{week.verdict}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-xs text-neutral-400 mb-1.5">Campaign health</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">{week.health}</span>
                      <span className="text-base text-emerald-400 font-semibold">{week.healthDelta} pts</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${week.health}%` }} />
                      </div>
                      <span className="text-xs text-neutral-400">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 mb-1.5">Brand posture</p>
                    <p className={`text-4xl font-black ${postureColor(week.posture)}`}>{week.posture}</p>
                    <p className="text-xs text-neutral-400 mt-1.5">Signals trending positive</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Market context</p>
                  {week.marketContext.map((m, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-base shrink-0">{m.icon}</span>
                      <p className="text-sm text-neutral-300 leading-relaxed">{m.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SectionQ>
          </div>

          {/* ── Q2: What do I need to do? ─────────────────────── */}
          <div id="q2">
            <SectionQ q="02" label="What do I need to do this week?">
              <div className="space-y-5">
                {week.actions.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">

                    <div className="px-6 pt-6 pb-4">
                      <div className="flex items-start gap-4">
                        <span className="w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-base font-bold text-neutral-900 leading-snug">{a.finding}</p>
                          <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{a.implication}</p>
                        </div>
                      </div>
                    </div>

                    {/* Creative brief — attached */}
                    <div className="mx-5 mb-5 rounded-xl bg-neutral-900 px-5 py-4">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
                        → {a.brief.label}
                      </p>
                      <ul className="space-y-2">
                        {a.brief.lines.map((line, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-sm text-neutral-300 leading-relaxed">
                            <span className="text-emerald-500 shrink-0 mt-0.5 font-bold">·</span>
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </SectionQ>
          </div>

          {/* ── Q3: Are we on track? ──────────────────────────── */}
          <div id="q3">
            <SectionQ q="03" label="Are we on track for the gate?">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6 space-y-5">

                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">{week.horizon.gateLabel}</p>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-2xl font-black text-neutral-900">Gate not yet fired</p>
                  </div>
                  <p className="text-sm text-amber-700 font-medium border-l-2 border-amber-400 pl-3">
                    {week.horizon.gateCondition}
                  </p>
                </div>

                <div className="pt-4 border-t border-amber-200">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">Signal horizon — next 4 weeks</p>
                  <p className="text-sm text-neutral-700 leading-relaxed mb-4">{week.horizon.prediction}</p>
                  <div className="space-y-3">
                    {week.horizon.horizonItems.map((h, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <span className="text-sm font-bold text-amber-700 shrink-0 w-24">{h.timeframe}</span>
                        <p className="text-sm text-neutral-600">{h.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-amber-200 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-sm font-semibold text-neutral-800">{week.horizon.budgetStatus}</p>
                </div>
              </div>
            </SectionQ>
          </div>

          {/* ── Deep dive ─────────────────────────────────────── */}
          <div id="detail">
            <div className="mb-5">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">04</span>
                <h2 className="text-xl font-bold text-neutral-900">Deep dive</h2>
              </div>
              <p className="text-sm text-neutral-400">Supporting evidence behind the findings above.</p>
            </div>

            <div className="space-y-3">

              <Collapsible label="Signal performance · Week 6">
                <div className="space-y-5">
                  {week.signals.map(s => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-neutral-700">{s.label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-neutral-900">{s.actual}</span>
                          <span className="text-sm text-neutral-400">/ {s.target}</span>
                          <span className="text-sm font-semibold text-emerald-600">↑ {s.delta}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${toneBar(s.tone)}`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Collapsible>

              <Collapsible label="Idea quality score">
                <div className="flex items-start gap-5">
                  <div className="text-center shrink-0">
                    <span className="text-5xl font-black text-violet-700">{week.ics.score}</span>
                    <p className="text-sm font-bold text-violet-600 mt-0.5">{week.ics.rating}</p>
                  </div>
                  <p className="text-sm text-neutral-500 leading-relaxed pt-1">{week.ics.note}</p>
                </div>
              </Collapsible>

              <Collapsible label="Category positioning">
                <div className="space-y-3">
                  {week.relativePosition.map(p => (
                    <div key={p.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm ${p.isSelf ? "font-bold text-neutral-900" : "text-neutral-500"}`}>{p.label}</span>
                        <span className={`text-sm font-bold ${p.isSelf ? "text-violet-700" : "text-neutral-400"}`}>{p.pct}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.isSelf ? "bg-violet-500" : "bg-neutral-200"}`}
                          style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-neutral-400 pt-1">Idea Certainty Score — comparable campaigns, same category.</p>
                </div>
              </Collapsible>

              <Collapsible label="KOL programme">
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  {[
                    { label: "Active",           val: week.kolTopline.active },
                    { label: "At gate",          val: week.kolTopline.atGate,        color: "text-emerald-700" },
                    { label: "Needs attention",  val: week.kolTopline.attention,     color: "text-amber-700" },
                  ].map(k => (
                    <div key={k.label} className="bg-neutral-50 rounded-xl p-3">
                      <p className={`text-2xl font-black ${k.color ?? "text-neutral-900"}`}>{k.val}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm border-t border-neutral-100 pt-3">
                  <span className="text-neutral-500">Avg save rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-700">{week.kolTopline.avgSave}</span>
                    <span className="text-neutral-400">vs gate {week.kolTopline.gateSave}</span>
                  </div>
                </div>
                <p className="text-sm text-neutral-400 mt-3 pt-3 border-t border-neutral-100">
                  Brief: do not renew mid-tier contracts for Phase 2. See creative brief 3 above.
                </p>
              </Collapsible>

              <Collapsible label="Phase roadmap · Jul–Dec 2026">
                <div className="space-y-3">
                  {week.roadmap.map((r, i) => (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
                      r.active ? "border-violet-200 bg-violet-50/40" : "border-neutral-100 bg-neutral-50/50"}`}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${r.active ? "bg-violet-500" : "bg-neutral-200"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className={`text-sm font-semibold ${r.active ? "text-violet-800" : "text-neutral-500"}`}>{r.phase}</p>
                          <span className="text-xs text-neutral-400">{r.dates}</span>
                          {r.gated && <span className="text-[10px] font-bold bg-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded">LOCKED</span>}
                        </div>
                        <p className="text-sm text-neutral-500">{r.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-neutral-900 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-white">The ShiftImpact Rule</p>
                  <p className="text-sm text-neutral-400 mt-0.5">Budget moves because a signal fired and held — not because a date arrived.</p>
                </div>
              </Collapsible>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-5 border-t border-neutral-200 flex items-center justify-between text-sm text-neutral-400">
            <span>ShiftImpact OS</span>
            <span>Week 6 · 17 Aug 2026 · Reviewed by your strategist</span>
          </div>

        </div>
      </main>
    </div>
  );
}
