"use client";

// /portal/demo — Cooks · Jadikan Caramu
// Client portal showcase. Three-question UX: Is it working? What do I do? Are we on track?
// Web: fixed left sidebar + main panel. Mobile: sticky header + horizontal week pills + scroll.

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red" | "neutral";

// ─── Week timeline data ───────────────────────────────────────────────────────

const WEEKS = [
  { n: 1, date: "7 Jul",  health: 52, posture: "Fragile",    dot: "red"     },
  { n: 2, date: "14 Jul", health: 59, posture: "Fragile",    dot: "red"     },
  { n: 3, date: "21 Jul", health: 63, posture: "Plateauing", dot: "amber"   },
  { n: 4, date: "28 Jul", health: 67, posture: "Plateauing", dot: "amber"   },
  { n: 5, date: "4 Aug",  health: 69, posture: "Gaining",    dot: "green"   },
  { n: 6, date: "17 Aug", health: 74, posture: "Gaining",    dot: "green", current: true },
];

// ─── Current week content (Week 6) ───────────────────────────────────────────

const W6 = {
  health: 74,
  healthDelta: "+5",
  posture: "Gaining",
  verdict:
    "The campaign is building correctly at the midpoint. Brand demand is accelerating. The only open item is pushing save rate over the gate threshold in the next 2 weeks.",

  // Q2: What do I need to do?
  actions: [
    {
      finding: "Recipe content saves at 2.3× the rate of lifestyle content",
      implication:
        "Audiences are bookmarking Cooks recipes for later — a pre-purchase signal. Current creative mix is 60% lifestyle, 40% recipe. This is the wrong way around.",
      brief: {
        label: "Creative brief — Week 7",
        lines: [
          "Format: Recipe-led process video (not product close-up)",
          "Dishes: Ayam Percik, Rendang Tok, Sup Tulang — high Merdeka search intent",
          "Frame: Cooking confidence (your version, not the shortcut)",
          "Mix target: 70% recipe / 30% lifestyle",
          "Channels: TikTok + Instagram Reels first, Meta feed second",
        ],
      },
    },
    {
      finding: "Brand search interest is growing 2.1× faster than category",
      implication:
        "Consumers are actively looking for Cooks — not just browsing cooking sauce brands. Earned demand converts 40–60% better than paid-for reach. Do not pull search spend.",
      brief: {
        label: "Media brief — Week 7",
        lines: [
          "Protect branded search budget — no reallocation to social this week",
          "Add 3 branded keyword variants: 'Cooks sos ayam', 'Cooks rendang', 'Cooks resipi'",
          "Negative-match competitor brand terms to protect share",
        ],
      },
    },
    {
      finding: "2 of 5 KOLs are below the save-rate gate",
      implication:
        "Mid-tier KOLs are generating reach but not saves. Micro-KOLs are delivering 7–8% save rates with 38% of the budget. Phase 2 contracts should not repeat the mid-tier split.",
      brief: {
        label: "KOL brief — Phase 2 planning",
        lines: [
          "Do not renew mid-tier KOL contracts for Phase 2",
          "Reallocate their budget to the top 3 micro-KOLs (@masakdenganaishah, 2 new)",
          "Recruit 2 new Klang Valley food micro-creators before Week 8",
          "Briefing criteria: save rate history ≥7%, recipe-format content, 25–40k followers",
        ],
      },
    },
  ],

  // Q3: Are we on track for the gate?
  horizon: {
    gateLabel: "Gate 1 — Phase 2 budget release",
    gateCondition: "Save Rate ≥8% held 3 consecutive days + Branded search +40%",
    fired: false,
    prediction:
      "At current save-rate growth (+0.4pp per week), Gate 1 is achievable by Week 8. If the creative mix shifts to recipe-led this week as briefed, the rate of growth should accelerate — Gate 1 in Week 7–8 is the realistic target. If the brief is not actioned, Gate 1 slips to Week 10 and Phase 2 budget is at risk.",
    horizonItems: [
      { timeframe: "This week", note: "Action the creative brief. Shift to 70% recipe-led." },
      { timeframe: "Week 7–8", note: "Gate 1 fires if save rate holds ≥8% for 3 days." },
      { timeframe: "Week 9+", note: "Phase 2 (Conversion) budget releases. TikTok Shop mechanics activate." },
    ],
    budgetStatus: "Phase 2 budget is locked until Gate 1 fires and holds.",
  },

  // Supporting detail (collapsed)
  ics: { score: 76, rating: "CONDITIONAL", note: "Campaign idea is well-matched to audience. Execution coherence is the gap — what the creative fixes above are addressing. Industry avg: 67." },

  relativePosition: [
    { label: "Category leader",  pct: 81 },
    { label: "Cooks",            pct: 76, isSelf: true },
    { label: "Challenger 2",     pct: 74 },
    { label: "Challenger 3",     pct: 59 },
  ],

  kolTopline: { active: 5, atGate: 1, attention: 2, underperforming: 2, avgSave: "6.3%", gateSave: "≥8%" },

  signals: [
    { label: "Brand search share", actual: "14.2%", target: "18%", pct: 79, delta: "+1.8%", tone: "amber" as Tone },
    { label: "Content save rate",  actual: "6.1%",  target: "≥8%", pct: 76, delta: "+0.4%", tone: "amber" as Tone },
    { label: "UGC volume",         actual: "28",    target: "40",  pct: 70, delta: "+6 pcs", tone: "amber" as Tone },
  ],

  roadmap: [
    { phase: "Phase 1 — Demand",            dates: "Jul–Aug",  active: true,  gated: false, note: "Build demand. Gate 1 fires on save rate." },
    { phase: "Phase 2 — Conversion",        dates: "Sep–Oct",  active: false, gated: true,  note: "Locked. Releases when Gate 1 fires." },
    { phase: "Phase 3 — Retention + Scale", dates: "Nov–Dec",  active: false, gated: true,  note: "Locked. Releases when Gate 2 fires." },
  ],

  marketContext: [
    { icon: "🎌", note: "Merdeka 31 Aug — patriotic heritage frame is live. Recipe content anchored to 'Masakan Malaysia Asli' is getting elevated reach. 2-week window." },
    { icon: "📱", note: "TikTok algorithm update this week: recipe-format videos getting 1.4× distribution. Lifestyle + product close-up is being deprioritised." },
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

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone | "blue" }) {
  const cls =
    tone === "green"  ? "bg-green-50 text-green-800 border-green-200" :
    tone === "amber"  ? "bg-amber-50 text-amber-800 border-amber-200" :
    tone === "red"    ? "bg-red-50 text-red-800 border-red-200" :
    tone === "blue"   ? "bg-blue-50 text-blue-800 border-blue-200" :
                        "bg-neutral-100 text-neutral-600 border-neutral-200";
  return <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>{children}</span>;
}

function SectionQ({ q, label, children }: { q: string; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{q}</span>
        <h2 className="text-base font-bold text-neutral-900">{label}</h2>
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
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        <span>{label}</span>
        <svg className={`w-4 h-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-neutral-100 px-4 py-4">{children}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortalDemoPage() {
  const [selectedWeek, setSelectedWeek] = useState(6);
  const [detailOpen, setDetailOpen] = useState(false);

  const week = W6; // in production, keyed by selectedWeek
  const circumference = 138.23;
  const arcLen = (week.health / 100) * circumference;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex">

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR — desktop only (lg+)
      ═══════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 fixed top-0 left-0 h-screen bg-neutral-900 text-white overflow-y-auto z-20">

        {/* Demo label */}
        <div className="px-4 pt-4 pb-3 border-b border-white/10">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">Capabilities showcase</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Illustrative data · ShiftImpact OS</p>
        </div>

        {/* Campaign identity */}
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-[10px] text-neutral-400 mb-0.5">Cooks · FMCG</p>
          <p className="text-sm font-bold leading-tight">Jadikan Caramu</p>
          <p className="text-[11px] text-neutral-400 mt-1">Phase 1 — Demand · Jul–Aug 2026</p>
        </div>

        {/* Health ring */}
        <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="5"
                strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-400">{week.health}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-neutral-400">Campaign health</p>
            <p className={`text-sm font-bold ${postureColor(week.posture)}`}>{week.posture}</p>
            <p className="text-[10px] text-emerald-400 font-semibold">{week.healthDelta} pts this week</p>
          </div>
        </div>

        {/* Week timeline */}
        <div className="px-3 py-3 border-b border-white/10">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold px-1 mb-2">Timeline</p>
          <div className="space-y-0.5">
            {WEEKS.map(w => (
              <button
                key={w.n}
                onClick={() => setSelectedWeek(w.n)}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                  selectedWeek === w.n ? "bg-white/15" : "hover:bg-white/8"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${toneDot(w.dot)}`} />
                <span className={`text-xs ${selectedWeek === w.n ? "font-semibold text-white" : "text-neutral-400"}`}>
                  Week {w.n} · {w.date}
                </span>
                {w.current && (
                  <span className="ml-auto text-[9px] font-bold text-emerald-400 border border-emerald-400/50 rounded px-1">NOW</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="px-3 py-3 flex-1">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold px-1 mb-2">This report</p>
          {[
            { href: "#q1", label: "Is it working?" },
            { href: "#q2", label: "What do I do now?" },
            { href: "#q3", label: "Are we on track?" },
            { href: "#detail", label: "Deep dive" },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/8 transition-colors">
              {item.label}
            </a>
          ))}
        </div>

        {/* The ShiftImpact Rule */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-[10px] font-bold text-white mb-1">The ShiftImpact Rule</p>
          <p className="text-[10px] text-neutral-400 leading-relaxed">Budget moves because a signal fired and held — not because a date arrived.</p>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE HEADER — visible below lg
      ═══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-neutral-900 text-white shadow-lg">

        {/* Demo banner */}
        <div className="bg-amber-900/60 px-4 py-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <p className="text-[10px] font-medium text-amber-200">ShiftImpact OS · Capabilities showcase · illustrative data</p>
        </div>

        {/* Campaign strip */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-neutral-400">Cooks · Jadikan Caramu</p>
            <p className="text-sm font-bold">Week {selectedWeek} · 17 Aug 2026</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-9 h-9">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="6"
                  strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold text-emerald-400">{week.health}</span>
              </div>
            </div>
            <div>
              <p className={`text-sm font-bold ${postureColor(week.posture)}`}>{week.posture}</p>
              <p className="text-[10px] text-emerald-400">{week.healthDelta} pts</p>
            </div>
          </div>
        </div>

        {/* Horizontal week pills */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {WEEKS.map(w => (
            <button key={w.n} onClick={() => setSelectedWeek(w.n)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border shrink-0 transition-colors ${
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

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <main className="lg:ml-60 xl:ml-64 flex-1 min-w-0">

        {/* Desktop: demo banner */}
        <div className="hidden lg:flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-6 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <p className="text-xs font-medium text-amber-800">
            ShiftImpact OS · Capabilities showcase — illustrative data. This is what your campaign portal looks like when live.
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

          {/* Date + week label */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-neutral-400">17 August 2026</p>
              <h1 className="text-lg font-bold text-neutral-900 mt-0.5">Week 6 Growth Intelligence Report</h1>
            </div>
            <Pill tone="green">Strategist reviewed</Pill>
          </div>

          {/* ── Q1: Is it working? ────────────────────────────────── */}
          <div id="q1">
            <SectionQ q="01" label="Is it working?">
              <div className="rounded-2xl bg-neutral-900 text-white px-5 py-5 space-y-4">

                {/* Verdict */}
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">This week's verdict</p>
                  <p className="text-sm leading-relaxed text-neutral-100">{week.verdict}</p>
                </div>

                {/* Health + posture */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-neutral-400 mb-1">Campaign health</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">{week.health}</span>
                      <span className="text-sm text-emerald-400 font-semibold">{week.healthDelta} pts</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${week.health}%` }} />
                      </div>
                      <span className="text-[10px] text-neutral-400">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 mb-1">Brand posture</p>
                    <p className={`text-2xl font-black ${postureColor(week.posture)}`}>{week.posture}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">Signals trending positive</p>
                  </div>
                </div>

                {/* Market context */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Market context</p>
                  {week.marketContext.map((m, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-sm shrink-0">{m.icon}</span>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">{m.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SectionQ>
          </div>

          {/* ── Q2: What do I need to do? ─────────────────────────── */}
          <div id="q2">
            <SectionQ q="02" label="What do I need to do this week?">
              <div className="space-y-4">
                {week.actions.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">

                    {/* Finding */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 leading-snug">{a.finding}</p>
                          <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{a.implication}</p>
                        </div>
                      </div>
                    </div>

                    {/* Creative brief — attached to finding */}
                    <div className="mx-4 mb-4 rounded-xl bg-neutral-900 px-4 py-3.5">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2.5">
                        → {a.brief.label}
                      </p>
                      <ul className="space-y-1.5">
                        {a.brief.lines.map((line, j) => (
                          <li key={j} className="flex items-start gap-2 text-[11px] text-neutral-300 leading-relaxed">
                            <span className="text-emerald-500 shrink-0 mt-0.5">·</span>
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

          {/* ── Q3: Are we on track for the gate? ────────────────── */}
          <div id="q3">
            <SectionQ q="03" label="Are we on track for the gate?">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 space-y-4">

                {/* Gate answer */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">{week.horizon.gateLabel}</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <p className="text-lg font-black text-neutral-900">Gate not yet fired</p>
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1 font-medium border-l-2 border-amber-400 pl-2">{week.horizon.gateCondition}</p>
                  </div>
                </div>

                {/* Prediction */}
                <div className="pt-3 border-t border-amber-200">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Signal horizon — next 4 weeks</p>
                  <p className="text-xs text-neutral-700 leading-relaxed mb-3">{week.horizon.prediction}</p>
                  <div className="space-y-2">
                    {week.horizon.horizonItems.map((h, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-[11px] font-bold text-amber-700 shrink-0 w-20">{h.timeframe}</span>
                        <p className="text-[11px] text-neutral-600">{h.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget status */}
                <div className="pt-3 border-t border-amber-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-xs font-semibold text-neutral-800">{week.horizon.budgetStatus}</p>
                </div>
              </div>
            </SectionQ>
          </div>

          {/* ── Deep dive (collapsed) ─────────────────────────────── */}
          <div id="detail">
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">04</span>
                <h2 className="text-base font-bold text-neutral-900">Deep dive</h2>
              </div>
              <p className="text-xs text-neutral-400">Supporting evidence behind the findings above.</p>
            </div>

            <div className="space-y-2">

              {/* Signal detail */}
              <Collapsible label="Signal performance · Week 6">
                <div className="space-y-4">
                  {week.signals.map(s => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-neutral-700">{s.label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900">{s.actual}</span>
                          <span className="text-[10px] text-neutral-400">/ {s.target}</span>
                          <span className="text-[10px] font-semibold text-emerald-600">↑ {s.delta}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${toneBar(s.tone)}`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Collapsible>

              {/* Idea quality */}
              <Collapsible label="Idea quality score">
                <div className="flex items-start gap-4">
                  <div className="text-center shrink-0">
                    <span className="text-4xl font-black text-violet-700">{week.ics.score}</span>
                    <p className="text-[11px] font-bold text-violet-600">{week.ics.rating}</p>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed pt-1">{week.ics.note}</p>
                </div>
              </Collapsible>

              {/* Relative position */}
              <Collapsible label="Category positioning">
                <div className="space-y-2.5">
                  {week.relativePosition.map(p => (
                    <div key={p.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${p.isSelf ? "font-bold text-neutral-900" : "text-neutral-500"}`}>{p.label}</span>
                        <span className={`text-xs font-bold ${p.isSelf ? "text-violet-700" : "text-neutral-500"}`}>{p.pct}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.isSelf ? "bg-violet-500" : "bg-neutral-300"}`} style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-neutral-400 pt-1">Idea Certainty Score — comparable campaigns, same category.</p>
                </div>
              </Collapsible>

              {/* KOL topline */}
              <Collapsible label="KOL programme">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Active", val: week.kolTopline.active },
                    { label: "At gate", val: week.kolTopline.atGate, tone: "green" as Tone },
                    { label: "Needs attention", val: week.kolTopline.attention, tone: "amber" as Tone },
                  ].map(k => (
                    <div key={k.label} className="bg-neutral-50 rounded-xl p-3">
                      <p className="text-xl font-black text-neutral-900">{k.val}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Avg save rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-700">{week.kolTopline.avgSave}</span>
                    <span className="text-neutral-400">vs gate {week.kolTopline.gateSave}</span>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 mt-2 pt-2 border-t border-neutral-100">
                  Brief: do not renew mid-tier contracts for Phase 2. See creative brief 3 above.
                </p>
              </Collapsible>

              {/* Phase roadmap */}
              <Collapsible label="Phase roadmap · Jul–Dec 2026">
                <div className="space-y-2">
                  {week.roadmap.map((r, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${r.active ? "border-violet-200 bg-violet-50/40" : "border-neutral-100 bg-neutral-50/50"}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${r.active ? "bg-violet-500" : "bg-neutral-200"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs font-semibold ${r.active ? "text-violet-800" : "text-neutral-500"}`}>{r.phase}</p>
                          <span className="text-[10px] text-neutral-400">{r.dates}</span>
                          {r.gated && <span className="text-[9px] font-bold bg-neutral-200 text-neutral-500 px-1.5 py-0.5 rounded">LOCKED</span>}
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{r.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-neutral-900 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-bold text-white">The ShiftImpact Rule</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Budget moves because a signal fired and held — not because a date arrived.</p>
                </div>
              </Collapsible>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-4 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-400">
            <span>ShiftImpact OS</span>
            <span>Week 6 · 17 Aug 2026 · Reviewed by your strategist</span>
          </div>

        </div>
      </main>
    </div>
  );
}
