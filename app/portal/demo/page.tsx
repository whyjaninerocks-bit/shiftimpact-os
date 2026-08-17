// /portal/demo — Cooks FMCG full portal showcase
// Fully responsive (mobile + desktop). Static demo with illustrative data.
// Reflects all live features: ICS, signal health with deltas, gate status,
// market context, KOL tracker, competitor benchmark, phase roadmap,
// approved weekly intelligence report with findings.

export const dynamic = "force-static";

// ─── Types ────────────────────────────────────────────────────────────────────

type RagTone = "green" | "amber" | "red" | "neutral";

// ─── Data ─────────────────────────────────────────────────────────────────────

const SIGNALS = [
  {
    id: "s1",
    label: "Brand search share",
    description: "How much of the cooking category search Cooks owns this week",
    actual: "14.2%",
    target: "18%",
    pct: 79,
    delta: "+1.8%",
    deltaDir: "up" as const,
    tone: "amber" as RagTone,
    status: "Building — 3.8pp to gate",
    detail:
      "Branded search share is accelerating week-on-week. At the current growth rate of +1.8pp per week, Gate 1 threshold is achievable by Week 8 without additional paid spend. Do not pull back search investment this week.",
  },
  {
    id: "s2",
    label: "Content save rate",
    description: "Hero content save rate — gate trigger for Phase 2 budget release",
    actual: "6.1%",
    target: "≥8%",
    pct: 76,
    delta: "+0.4%",
    deltaDir: "up" as const,
    tone: "amber" as RagTone,
    status: "Below gate — 1.9pp remaining",
    detail:
      "Save rate is growing but has not held the 8% threshold for 3 consecutive days — the condition required to release Phase 2 (Conversion) budget. Recipe-format content is outperforming lifestyle content 2.3× in saves. Brief creative to shift format mix before Week 7.",
  },
  {
    id: "s3",
    label: "User-created content",
    description: "Organic UGC volume — brand advocacy signal",
    actual: "28 pieces",
    target: "40 pieces",
    pct: 70,
    delta: "+6 pieces",
    deltaDir: "up" as const,
    tone: "amber" as RagTone,
    status: "On track — 12 pieces to monthly target",
    detail:
      "UGC is growing steadily. The current seeded micro-KOL programme is producing 4–6 pieces per week. At this rate the monthly target of 40 pieces is achievable. Quality is high — avg engagement rate on UGC pieces is 4.2% vs 1.8% on branded content.",
  },
];

const KOLS = [
  { handle: "@masakdenganaishah", tier: "Micro", saveRate: "8.4%", tone: "green" as RagTone, status: "At gate" },
  { handle: "@eatwithzafran", tier: "Micro", saveRate: "7.1%", tone: "amber" as RagTone, status: "Below gate" },
  { handle: "@dapurrumahkuofficial", tier: "Micro", saveRate: "6.8%", tone: "amber" as RagTone, status: "Below gate" },
  { handle: "@chefhanamariana", tier: "Mid", saveRate: "5.2%", tone: "red" as RagTone, status: "Underperforming" },
  { handle: "@rawlinsganics", tier: "Mid", saveRate: "5.6%", tone: "red" as RagTone, status: "Underperforming" },
];

const COMPETITORS = [
  { brand: "MAGGI", campaign: "Masak Sama-Sama", ics: 81, rating: "CONDITIONAL", gap: "Retention signals weak" },
  { brand: "Cooks", campaign: "Jadikan Caramu", ics: 76, rating: "CONDITIONAL", gap: "Save rate gate not yet fired", isSelf: true },
  { brand: "Knorr", campaign: "Resepi Warisan", ics: 74, rating: "CONDITIONAL", gap: "Generic audience tension" },
  { brand: "Adabi", campaign: "Dapur Kita", ics: 59, rating: "REWORK", gap: "Scattered channel execution" },
];

const FINDINGS = [
  {
    headline: "Brand search interest is outpacing category growth by 2.1×",
    implication:
      "Consumers are actively seeking Cooks — not just browsing the category. This is earned demand, not paid-for reach. It converts at a 40–60% higher rate than category-average traffic.",
    recommendation: "Protect search spend and add branded keyword coverage this week. Do not reallocate search budget to social even if social CPMs look cheaper.",
  },
  {
    headline: "Save rate on recipe content is 2.3× higher than lifestyle content",
    implication:
      "Audiences are bookmarking recipe-format posts for later action — a pre-purchase signal that typically precedes conversion spikes by 10 to 14 days. The current creative mix is 60% lifestyle, 40% recipe. This is the inverse of what the data shows works.",
    recommendation: "Brief creative team to shift to 70% recipe-led formats for Week 7. Specifically: Ayam Percik, Rendang Tok, and Sup Tulang — dishes with strong search intent this season.",
  },
  {
    headline: "Micro-KOL content is outperforming mid-tier by 1.6× on save rate",
    implication:
      "Two mid-tier KOLs are generating high reach but below-gate save rates (5.2% and 5.6% vs 8% gate). Micro-KOLs are delivering 7–8% save rates with 38% of the budget.",
    recommendation: "Do not renew mid-tier KOL contracts for Phase 2. Reallocate their budget to the top 3 micro-KOLs and add 2 new micro-food creators identified in the Klang Valley.",
  },
];

// ─── UI helpers ───────────────────────────────────────────────────────────────

function ragBg(tone: RagTone) {
  return {
    green: "bg-green-50 text-green-800 border-green-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    red: "bg-red-50 text-red-800 border-red-200",
    neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
  }[tone];
}

function ragDot(tone: RagTone) {
  return { green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500", neutral: "bg-neutral-400" }[tone];
}

function ragBar(tone: RagTone) {
  return { green: "bg-green-500", amber: "bg-amber-400", red: "bg-red-400", neutral: "bg-neutral-300" }[tone];
}

function Badge({ tone, children }: { tone: RagTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${ragBg(tone)}`}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">{children}</p>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-neutral-100 p-4 sm:p-5 shadow-sm ${className}`}>{children}</div>;
}

function IcsRating({ ics }: { ics: number }) {
  if (ics >= 85) return <span className="text-emerald-600 font-bold">ADVANCE</span>;
  if (ics >= 70) return <span className="text-violet-600 font-bold">CONDITIONAL</span>;
  if (ics >= 55) return <span className="text-amber-600 font-bold">REWORK</span>;
  return <span className="text-red-600 font-bold">STOP</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortalDemoPage() {
  // Ring arc: circumference = 2π × 22 ≈ 138.23
  const healthScore = 74;
  const circumference = 138.23;
  const arcLen = (healthScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">

      {/* ── Demo banner ── */}
      <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 flex items-start sm:items-center justify-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1 sm:mt-0" />
        <p className="text-xs font-medium text-amber-800">
          ShiftImpact OS · Capabilities Showcase — illustrative data showing what your portal looks like when your campaign is live
        </p>
      </div>

      {/* ── Dark header ── */}
      <div className="bg-neutral-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-5">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">ShiftImpact <span className="text-neutral-400 font-normal">OS</span></span>
              <span className="text-neutral-700 hidden sm:inline">·</span>
              <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium hidden sm:inline">Campaign Intelligence Report</span>
            </div>
            <span className="text-xs text-neutral-500">17 Aug 2026</span>
          </div>

          {/* Campaign identity */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Cooks</p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">Jadikan Caramu</h1>
              <p className="text-xs text-neutral-400 mt-1">FMCG · Cooking Sauces · Demand Phase</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-neutral-400">Week 6 · 17 Aug 2026</p>
              <p className="text-xs text-neutral-400 mt-0.5">Phase 1 — Demand</p>
              <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-white">Active</span>
            </div>
          </div>

          {/* Health grid */}
          <div className="grid grid-cols-2 gap-3">

            {/* Health ring */}
            <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="5"
                    strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-bold text-emerald-400">{healthScore}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide font-medium">Campaign Health</p>
                <p className="text-sm font-bold text-emerald-400">Building</p>
                <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">↑ +5 pts vs last week</p>
              </div>
            </div>

            {/* Signal status + progress */}
            <div className="flex flex-col justify-between px-3 sm:px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm font-semibold text-white">Gate not yet fired</span>
                </div>
                <p className="text-xs text-neutral-400">0 of 3 signals at gate · 3 building</p>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Campaign progress</span>
                  <span>Wk 6/12 · 6w left</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full bg-white/50" style={{ width: "50%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Brand posture strip */}
          <div className="mt-3 flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wide shrink-0">Brand posture</span>
              <span className="text-neutral-700 hidden sm:inline">·</span>
              <span className="text-[11px] text-neutral-500 truncate hidden sm:inline">Gaining momentum — signals trending positive</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border" style={{ background: "rgba(52,211,153,0.15)", borderColor: "rgba(52,211,153,0.3)", color: "#6ee7b7" }}>
                Gaining
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Clarity statement */}
        <div className="rounded-2xl bg-neutral-900 text-white px-4 sm:px-6 py-4">
          <SectionLabel>What we&apos;re here to do</SectionLabel>
          <p className="text-sm leading-relaxed">
            Build household brand search preference in the Klang Valley among families who cook at home 3 or more times a week — measured by a 15% lift in branded search share by Week 12, with Gate 1 (save rate ≥8%) triggering Phase 2 budget release.
          </p>
        </div>

        {/* ICS Score */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <SectionLabel>Idea Certainty Score</SectionLabel>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-neutral-900">76</span>
                <div>
                  <p className="text-sm font-bold text-violet-600">CONDITIONAL</p>
                  <p className="text-xs text-neutral-400">Industry avg: 67 · Top quartile: 80+</p>
                </div>
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-2">↑ +13 pts vs original audit (63) after FRAME fixes</p>
            </div>
            <div className="sm:text-right sm:shrink-0">
              <p className="text-[11px] text-neutral-400 mb-2 uppercase tracking-wider font-medium">Dimension scores</p>
              <div className="space-y-1.5">
                {[
                  { label: "Cultural Fit ×20", score: 78, vs: "+11 vs avg" },
                  { label: "Business Alignment ×20", score: 74, vs: "+7 vs avg" },
                  { label: "Audience Tension ×20", score: 72, vs: "+5 vs avg" },
                  { label: "Executional Coherence ×15", score: 76, vs: "+9 vs avg" },
                  { label: "Measurability ×15", score: 71, vs: "+4 vs avg" },
                  { label: "Scalability ×10", score: 70, vs: "+3 vs avg" },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500 w-40 text-right hidden sm:block">{d.label}</span>
                    <span className="text-[10px] text-neutral-500 sm:hidden">{d.label}</span>
                    <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${d.score}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-neutral-800 w-5">{d.score}</span>
                    <span className="text-[10px] text-emerald-600 font-medium hidden sm:inline">{d.vs}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Campaign objective + big idea */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Card>
            <SectionLabel>Campaign objective</SectionLabel>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Cooks Jadikan Caramu targets home cooks aged 25–45 in the Klang Valley — families who cook traditional Malaysian dishes 3+ times a week but rely on convenience sauces. The objective is to own the &apos;cooking confidence&apos; territory by making Cooks sauces the brand that believes you can cook Ayam Percik like your grandmother.
            </p>
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-1">Primary KPI</p>
              <p className="text-xs text-neutral-800 font-semibold">+15% branded search share lift by Week 12</p>
            </div>
          </Card>
          <Card>
            <SectionLabel>Campaign idea</SectionLabel>
            <blockquote className="text-sm font-semibold text-neutral-900 leading-snug border-l-[3px] border-neutral-900 pl-3">
              Jadikan Caramu — Make It Yours. Your grandmother&apos;s recipe. Your kitchen. Your version. Cooks gives you the confidence, not the shortcut.
            </blockquote>
            <p className="text-xs text-neutral-400 mt-3">
              <span className="font-medium text-neutral-500">Brand role: </span>
              Cooks as the brand that trusts you — not the brand that does it for you. Tension: GenZ home cooks who know the dish but fear getting it wrong.
            </p>
          </Card>
        </div>

        {/* This week's performance */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>This week&apos;s signal performance</SectionLabel>
            <span className="text-[11px] text-neutral-400">Week 6 · 17 Aug 2026</span>
          </div>

          {/* Phase context */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 mb-3 flex items-start gap-3">
            <div className="w-1 h-full rounded-full bg-amber-400 shrink-0 self-stretch" />
            <div>
              <p className="text-xs font-semibold text-neutral-700 mb-1">Phase 1 — Demand · Week 6 of 12</p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Week 6 is the midpoint of Demand — the window where audience signals should be compounding and brand consideration visibly strengthening. No gate has fired yet. The next 3 weeks are the critical window to push save rate over the 8% threshold before Phase 2 budget is locked.
              </p>
            </div>
          </div>

          {/* Market context */}
          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 mb-3">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide mb-2.5">Market context this week</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="text-xs shrink-0">🎌</span>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  <span className="font-semibold">Merdeka approaching (31 Aug) — Medium festive window.</span> Patriotic heritage frame is live. Recipe content anchored to &apos;Masakan Malaysia Asli&apos; is getting elevated reach. This is a 2-week window to push Ayam Percik and Rendang content — do not let it pass unused.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xs shrink-0">📱</span>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  <span className="font-semibold">TikTok algorithm update.</span> Recipe-format videos with cooking process shots are receiving 1.4× distribution boost this week. Lifestyle content with product close-ups is being deprioritised. The OS flags this as the primary reason to shift creative mix this week.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xs shrink-0">⚡</span>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  <span className="font-semibold">MAGGI launched &apos;Masak Sama-Sama&apos; paid amplification this week.</span> Their share of cooking category search increased by 2.1pp. This is not a threat to your gate signal — but monitor branded search share weekly to detect erosion early.
                </p>
              </div>
            </div>
          </div>

          {/* Signal rows */}
          <div className="space-y-3">
            {SIGNALS.map((s) => (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${s.tone === "green" ? "bg-green-50" : s.tone === "amber" ? "bg-amber-50" : "bg-red-50"}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${ragDot(s.tone)}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800">{s.label}</p>
                      <p className="text-xs text-neutral-400 mt-0.5 leading-snug">{s.description}</p>
                    </div>
                  </div>
                  <Badge tone={s.tone}>{s.status}</Badge>
                </div>

                {/* Metric row */}
                <div className="flex items-end justify-between mb-1.5 ml-11 sm:ml-12">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-black text-neutral-900 leading-none">{s.actual}</span>
                    <span className="text-xs text-neutral-400">/ {s.target} gate</span>
                    <span className={`text-xs font-semibold ${s.deltaDir === "up" ? "text-emerald-600" : "text-red-600"}`}>
                      {s.deltaDir === "up" ? "↑" : "↓"} {s.delta} vs last week
                    </span>
                  </div>
                  <span className="text-xs font-bold text-neutral-500">{s.pct}%</span>
                </div>

                {/* Progress bar */}
                <div className="ml-11 sm:ml-12">
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${ragBar(s.tone)}`} style={{ width: `${s.pct}%` }} />
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{s.detail}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* KOL tracker */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>KOL tracker</SectionLabel>
            <div className="flex gap-2 text-[11px] text-neutral-500">
              <span className="font-semibold">{KOLS.length} active</span>
              <span>·</span>
              <span>32% macro/mega spend</span>
              <span>·</span>
              <span className="text-amber-600 font-semibold">Avg save 6.3% (gate ≥8%)</span>
            </div>
          </div>
          <div className="space-y-2">
            {KOLS.map((k) => (
              <div key={k.handle} className="flex items-center justify-between gap-3 py-1.5 border-b border-neutral-50 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ragDot(k.tone)}`} />
                  <span className="text-xs font-medium text-neutral-700 truncate">{k.handle}</span>
                  <span className="text-[10px] text-neutral-400 shrink-0 hidden sm:inline">{k.tier}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold ${k.tone === "green" ? "text-emerald-600" : k.tone === "amber" ? "text-amber-600" : "text-red-600"}`}>
                    {k.saveRate}
                  </span>
                  <Badge tone={k.tone}>{k.status}</Badge>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-3 pt-2 border-t border-neutral-100">
            Recommendation: do not renew mid-tier contracts for Phase 2. Reallocate to top micro-KOLs and add 2 new Klang Valley food creators.
          </p>
        </Card>

        {/* Competitor ICS benchmark */}
        <Card>
          <SectionLabel>Competitor ICS benchmark</SectionLabel>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left text-neutral-400 font-semibold pb-2 pr-3">Brand</th>
                  <th className="text-left text-neutral-400 font-semibold pb-2 pr-3">Campaign</th>
                  <th className="text-left text-neutral-400 font-semibold pb-2 pr-3">ICS</th>
                  <th className="text-left text-neutral-400 font-semibold pb-2 pr-3">Rating</th>
                  <th className="text-left text-neutral-400 font-semibold pb-2">Primary gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {COMPETITORS.map((c) => (
                  <tr key={c.brand} className={c.isSelf ? "bg-violet-50/50" : ""}>
                    <td className={`py-2 pr-3 font-semibold ${c.isSelf ? "text-violet-700" : "text-neutral-800"}`}>{c.brand}</td>
                    <td className="py-2 pr-3 text-neutral-600">{c.campaign}</td>
                    <td className={`py-2 pr-3 font-black text-base leading-none ${c.isSelf ? "text-violet-700" : "text-neutral-900"}`}>{c.ics}</td>
                    <td className="py-2 pr-3"><IcsRating ics={c.ics} /></td>
                    <td className="py-2 text-neutral-500">{c.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Gate signal status */}
        <Card>
          <SectionLabel>Gate signal status</SectionLabel>
          <div className="space-y-3">
            {[
              {
                phase: "Gate 1 — Phase 2 unlock",
                condition: "Save Rate ≥8% held 3 consecutive days + Branded search +40%",
                status: "NOT YET FIRED",
                tone: "amber" as RagTone,
                note: "Save rate at 6.1% (+0.4pp wk-on-wk). Need 1.9pp more and 3 consecutive days to trigger. On track at current growth rate by Week 8.",
              },
              {
                phase: "Gate 2 — Phase 3 unlock",
                condition: "TikTok Shop CVR ≥4% + Cart abandonment <25% held 7 days",
                status: "LOCKED",
                tone: "neutral" as RagTone,
                note: "Requires Gate 1 to fire first. Phase 2 budget has not been released.",
              },
              {
                phase: "Gate 3 — Scale",
                condition: "Repeat purchase ≥30% + organic UGC growing MoM, held 2 weeks",
                status: "LOCKED",
                tone: "neutral" as RagTone,
                note: "Requires Gates 1 and 2 to fire. Nov–Dec window.",
              },
            ].map((g) => (
              <div key={g.phase} className="border border-neutral-100 rounded-xl p-3.5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-xs font-semibold text-neutral-800">{g.phase}</p>
                  <Badge tone={g.tone}>{g.status}</Badge>
                </div>
                <p className="text-[11px] text-violet-700 font-medium mb-1.5 border-l-2 border-violet-300 pl-2">{g.condition}</p>
                <p className="text-xs text-neutral-500">{g.note}</p>
              </div>
            ))}
          </div>

          {/* The ShiftImpact Rule */}
          <div className="mt-4 rounded-xl bg-neutral-900 px-4 py-3 text-center">
            <p className="text-xs font-bold text-white mb-1">The ShiftImpact Rule</p>
            <p className="text-[11px] text-neutral-400">Budget does not move because a date arrived.</p>
            <p className="text-[11px] text-neutral-400">Budget moves because a consumer behaviour signal fired — and held.</p>
          </div>
        </Card>

        {/* Weekly intelligence report (strategist-approved) */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Growth Intelligence — Week 6</p>
              <p className="text-xs text-neutral-400 mt-0.5">Week 6 · Reviewed by your strategist</p>
            </div>
            <Badge tone="green">Ready</Badge>
          </div>

          {/* Executive summary */}
          <div className="bg-neutral-50 rounded-xl p-3.5">
            <SectionLabel>Summary</SectionLabel>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Week 6 shows the campaign is building correctly. Brand search interest is accelerating at +1.8pp week-on-week — the strongest sustained growth since launch. Content saves are rising on recipe formats. The one watch area is the save-rate gate: at 6.1% it is 1.9pp short of the 8% threshold required to release Phase 2 budget. A creative mix shift to recipe-led formats this week is the single highest-leverage action available. No gate has fired. No Phase 2 budget has been released. This is the right state for Week 6.
            </p>
          </div>

          {/* Signal health */}
          <div>
            <SectionLabel>Signal health this week</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Demand", tone: "amber" as RagTone },
                { label: "Nurture", tone: "green" as RagTone },
                { label: "Conversion", tone: "green" as RagTone },
              ].map((s) => (
                <div key={s.label} className="text-center bg-neutral-50 rounded-xl p-2.5">
                  <p className="text-[10px] text-neutral-400 mb-1.5">{s.label}</p>
                  <Badge tone={s.tone}>{s.tone === "green" ? "Green" : s.tone === "amber" ? "Amber" : "Red"}</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Demand signal is Amber — building but not yet at gate. Nurture and Conversion are Green. Gate: Amber overall.
            </p>
          </div>

          {/* Risk posture */}
          <div>
            <SectionLabel>Brand posture this week</SectionLabel>
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full border bg-green-50 text-green-800 border-green-200">
              Gaining
            </span>
          </div>

          {/* Findings */}
          <div>
            <SectionLabel>What the data is telling us</SectionLabel>
            <div className="space-y-3">
              {FINDINGS.map((f, i) => (
                <div key={i} className="border-l-2 border-neutral-200 pl-3">
                  <p className="text-xs font-semibold text-neutral-800 mb-1">{f.headline}</p>
                  <p className="text-xs text-neutral-500 leading-relaxed">{f.implication}</p>
                  <p className="text-xs text-emerald-700 mt-1.5 font-medium">→ {f.recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-100">
            Published 17 August 2026 · Questions? Reply to the notification email.
          </p>
        </Card>

        {/* Phase roadmap */}
        <Card>
          <SectionLabel>Signal-led phase roadmap · Jul – Dec 2026</SectionLabel>
          <p className="text-[11px] text-neutral-500 mb-4">Budget moves when your Gate Signal fires — not when the calendar says so.</p>
          <div className="space-y-3">
            {[
              {
                phase: "Phase 1 — Demand",
                dates: "Jul – Aug 2026",
                active: true,
                desc: "Build cultural tension first. Hero content seeded via micro-KOL UGC (cooking confidence angle). No paid amplification until Gate 1 fires and holds.",
                gate: "Save Rate ≥8% held 3 consecutive days + Branded search +40%",
                festive: "Merdeka 31 Aug · Medium → leverage patriotic heritage frame",
              },
              {
                phase: "Phase 2 — Conversion",
                dates: "Sep – Oct 2026",
                active: false,
                desc: "Introduce purchase mechanic. TikTok Shop bundle + recipe challenge. Budget releases only when Gate 1 holds 3 consecutive days.",
                gate: "TikTok Shop CVR ≥4% + Cart abandonment <25% held 7 days",
                festive: "Deepavali Oct · High · 11.11 · High → idea must lead, not discounts",
              },
              {
                phase: "Phase 3 — Retention + Scale",
                dates: "Nov – Dec 2026",
                active: false,
                desc: "Repeat purchase engine. UGC advocacy. Scale only when NPS ≥45 and repeat purchase interval is decreasing.",
                gate: "Repeat purchase ≥30% + organic UGC growing MoM held 2 weeks",
                festive: "12.12 · High · Year-End Dec · Medium → do not add spend; let signal justify it",
              },
            ].map((p) => (
              <div key={p.phase} className={`rounded-xl border p-3.5 ${p.active ? "border-violet-200 bg-violet-50/30" : "border-neutral-100 bg-white"}`}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className={`text-sm font-bold ${p.active ? "text-violet-800" : "text-neutral-700"}`}>{p.phase}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.active && <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Current</span>}
                    <span className="text-[11px] text-neutral-400">{p.dates}</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-2">{p.desc}</p>
                <p className={`text-[11px] font-medium border-l-2 pl-2 mb-2 ${p.active ? "text-violet-700 border-violet-400" : "text-neutral-500 border-neutral-200"}`}>
                  Gate: {p.gate}
                </p>
                <p className="text-[10px] text-neutral-400">🗓 {p.festive}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Active channels */}
        <Card>
          <SectionLabel>Active channels</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {["Meta (Facebook & Instagram)", "TikTok", "Google Search (Branded)", "Shopee Ads", "KOL — Micro-tier (5 active)"].map((ch) => (
              <span key={ch} className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium">{ch}</span>
            ))}
          </div>
        </Card>

        {/* Channel briefs */}
        <Card>
          <SectionLabel>Channel briefs</SectionLabel>
          <div className="divide-y divide-neutral-100">
            {[
              { name: "Meta — Social Content Brief", status: "Approved", tone: "green" as RagTone },
              { name: "TikTok — Creator + Recipe Brief", status: "Approved", tone: "green" as RagTone },
              { name: "Google Search — Branded Keyword Brief", status: "Ready", tone: "green" as RagTone },
              { name: "KOL — Micro Creator Brief (Week 7)", status: "Ready", tone: "green" as RagTone },
            ].map((b) => (
              <div key={b.name} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-sm text-neutral-700">{b.name}</span>
                <Badge tone={b.tone}>{b.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Campaign milestones */}
        <Card>
          <SectionLabel>Campaign milestones</SectionLabel>
          <div className="space-y-2">
            {[
              { label: "FRAME Brief locked — ICS 76 (CONDITIONAL)", done: true },
              { label: "Campaign launch — Go", done: true },
              { label: "Week 4 signal gate — On track", done: true },
              { label: "Week 8 phase review", done: false },
              { label: "Gate 1 — Phase 2 budget release", done: false },
            ].map((m) => (
              <div key={m.label} className={`flex items-center gap-2.5 ${!m.done ? "pt-2 border-t border-neutral-100 first:border-0" : ""}`}>
                <span className={m.done ? "text-emerald-500" : "text-neutral-300"}>{m.done ? "✓" : "○"}</span>
                <span className={`text-sm ${m.done ? "text-neutral-600" : "text-neutral-400"}`}>{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-200 text-xs text-neutral-400">
          <span>ShiftImpact OS</span>
        </div>

      </div>
    </div>
  );
}
