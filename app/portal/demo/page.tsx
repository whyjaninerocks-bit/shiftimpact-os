"use client";

// /portal/demo — Cooks · Jadikan Caramu
// v6: floating AI assistant widget, no inline IP-revealing rationale, improved font contrast

import { useState, useRef, useEffect } from "react";

// ─── AI assistant responses ───────────────────────────────────────────────────

const QA: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ["health", "score", "74", "calculated", "derived", "composite"],
    answer: "Your health score is a weekly read of how well your live signals are tracking toward their targets. A score of 74 at Week 6 of Phase 1 is in the upper range for a campaign at this stage — signals are moving in the right direction and nothing has deteriorated. It updates every Monday from your live platform data.",
  },
  {
    keywords: ["gate", "fire", "fired", "phase 2", "budget", "release", "unlock"],
    answer: "The gate is a consumer behaviour threshold that must be reached and held — not just touched once — before Phase 2 budget releases. The hold requirement is there to confirm a genuine shift in how your audience is responding, not a single spike from a viral post. You're 1.9 percentage points away. The creative brief this week is the most direct path to triggering it.",
  },
  {
    keywords: ["save", "rate", "6.1", "8%", "threshold", "content"],
    answer: "Save rate measures how many people who see your content choose to bookmark it for later. In your category, saves are the strongest forward indicator of purchase intent — people save recipes they intend to cook. Your save rate has grown every week since launch. The brief in Section 02 is specifically designed to accelerate that growth by shifting to recipe-led formats that are already outperforming your current mix.",
  },
  {
    keywords: ["conditional", "ics", "76", "idea", "quality", "certainty"],
    answer: "CONDITIONAL means your campaign idea is structurally sound and performing above the category average. It signals that one area has room to improve — how consistently your idea is being expressed across your content. That's a tactical fix, not a strategic one. The brief this week addresses it directly. If it's actioned, you should see the score move by Week 8.",
  },
  {
    keywords: ["maggi", "knorr", "adabi", "competitor", "benchmark", "category", "comparison"],
    answer: "The benchmark shows where your campaign idea sits relative to comparable campaigns running in your category right now. The gap between you and the category leader is in executional consistency — not budget, reach, or idea quality. That gap narrows as your creative execution tightens. You're ahead of two of the four brands in this benchmark and closing on the leader.",
  },
  {
    keywords: ["posture", "gaining", "brand", "momentum"],
    answer: "'Gaining' means your signals are trending upward and nothing has meaningfully deteriorated in the past 7 days. It's reviewed weekly. Two consecutive weeks of Gaining at a save rate approaching the gate threshold is a strong position at this point in the campaign arc.",
  },
  {
    keywords: ["kol", "influencer", "creator", "activation", "micro", "mid", "programme"],
    answer: "KOL performance is evaluated on save rate — not follower count or reach — because saves are what drive your gate signal. Your micro-KOLs are delivering 7–8% save rates at 38% of the total KOL budget. The two mid-tier KOLs are generating reach but not saves. Phase 2 recommendation: concentrate budget on what is already at gate, recruit 2 new Klang Valley food creators to the same profile. Save rate is the only metric that moves the gate.",
  },
  {
    keywords: ["battery", "creative", "fatigue", "endurance", "refresh", "weeks remaining", "runway"],
    answer: "Creative Battery measures how many more weeks the current creative execution can sustain its performance trajectory before engagement plateaus. At Week 6, your lifestyle-heavy mix (60% lifestyle, 40% recipe) has roughly 2 weeks before diminishing returns set in — this is why the brief to shift to recipe-led formats is timed now, not next month. Actioning it extends your creative runway by 4–6 weeks and prevents a mid-campaign performance dip ahead of the Merdeka window.",
  },
  {
    keywords: ["business", "revenue", "sales", "roi", "return", "outcome", "performance", "spend"],
    answer: "Business outcome tracking — linking campaign signals to actual sales, revenue lift, and media ROI — activates when you share business performance data with your strategist. The Full Intelligence Suite at the bottom of this report shows exactly what becomes visible when that data is connected. Signal intelligence tells you what the market is doing. Business data tells you what it is worth.",
  },
  {
    keywords: ["ai", "visibility", "search", "gemini", "chatgpt", "recommendation", "brand appear"],
    answer: "AI Brand Visibility tracks whether your brand appears in AI-generated product recommendations — Google AI Overview, ChatGPT, Gemini. In FMCG and cooking categories, 23% of purchase-intent queries are now going to AI assistants first. If your brand is not showing up in those answers, you are invisible to a growing share of high-intent buyers. This is a premium signal available in the Full Intelligence Suite.",
  },
  {
    keywords: ["horizon", "predict", "week 7", "week 8", "forecast", "next"],
    answer: "The horizon signal is a directional projection based on your current growth trajectory. It tells you what to expect if present conditions hold. The key variable is whether this week's creative brief is actioned — if it is, the timeline improves; if it isn't, it extends. It's designed to give you a decision window, not a guarantee.",
  },
  {
    keywords: ["merdeka", "market", "context", "tiktok", "algorithm", "seasonal"],
    answer: "Market context flags external conditions affecting your campaign this week — platform algorithm shifts, seasonal windows, competitor activity. These are real signals from the market that change what the data means and what you should prioritise. Merdeka on 31 August is a live window right now. Acting this week captures it; acting next week doesn't.",
  },
  {
    keywords: ["phase", "roadmap", "conversion", "retention", "scale"],
    answer: "Your campaign runs in three phases, each gated by consumer behaviour signals. Phase 1 builds demand. Phase 2 converts it. Phase 3 scales what worked. No phase releases on a calendar date — each releases when the data confirms the audience is ready. That's what protects your budget from being spent before the market is primed.",
  },
  {
    keywords: ["signal", "track", "measure", "source", "data"],
    answer: "Every metric in this report comes directly from your campaign's live data — platform analytics, search data, and content performance combined. Nothing is modelled or estimated. If you'd like to see the specific source for any number, your strategist can walk you through the data trail at your next session.",
  },
];

const SUGGESTIONS = [
  "How is the health score derived?",
  "Why hasn't the gate fired yet?",
  "How is the KOL programme evaluated?",
  "What does the creative battery mean?",
];

const FALLBACK =
  "Good question — and one worth taking to your next strategy session. Every classification and number in this report is grounded in your live campaign data and a structured methodology. Your ShiftImpact strategist can walk you through the specific reasoning behind any figure in detail.";

function matchAnswer(q: string): string {
  const lower = q.toLowerCase();
  let bestScore = 0;
  let bestAnswer = FALLBACK;
  for (const item of QA) {
    let score = 0;
    for (let i = 0; i < item.keywords.length; i++) {
      if (lower.includes(item.keywords[i])) {
        // First keyword (most topic-specific) worth 3 pts, second 2, rest 1
        score += i === 0 ? 3 : i === 1 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = item.answer;
    }
  }
  return bestAnswer;
}

// ─── Floating assistant widget ────────────────────────────────────────────────

type Message = { role: "user" | "ai"; text: string };

function AskWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi — I can explain any part of this report. Ask me about the health score, the gate, KOL performance, or anything else you'd like to understand better." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function send(text: string) {
    if (!text.trim() || thinking) return;
    const q = text.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setThinking(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "ai", text: matchAnswer(q) }]);
      setThinking(false);
    }, 750);
  }

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Panel */}
      {open && (
        <div className={`
          fixed z-50 bg-white shadow-2xl border border-neutral-100 flex flex-col
          bottom-0 left-0 right-0 rounded-t-2xl max-h-[72vh]
          lg:bottom-24 lg:right-6 lg:left-auto lg:rounded-2xl lg:w-[360px] lg:max-h-[520px]
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-neutral-900 rounded-t-2xl lg:rounded-t-2xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-bold text-white">Ask about this report</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 pt-3 pb-0 shrink-0">
              <p className="text-xs font-semibold text-neutral-400 mb-2">Suggested questions</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-full px-3 py-1.5 transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-neutral-900 text-white rounded-br-sm"
                    : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-neutral-100 shrink-0">
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything about this report…"
                className="flex-1 text-sm bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
              />
              <button type="submit" disabled={!input.trim() || thinking}
                className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-neutral-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => { setOpen(v => !v); setTimeout(() => inputRef.current?.focus(), 100); }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-xl font-semibold text-sm transition-all ${
          open ? "bg-neutral-700 text-white" : "bg-neutral-900 text-white hover:bg-neutral-700"
        }`}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span className="hidden sm:inline">{open ? "Close" : "Ask anything"}</span>
        {!open && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </button>
    </>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, gate, color = "#34d399" }: { values: number[]; gate?: number; color?: string }) {
  const allVals = [...values, ...(gate !== undefined ? [gate] : [])];
  const min = Math.min(...allVals) * 0.95;
  const max = Math.max(...allVals) * 1.05;
  const range = max - min || 1;
  const W = 200, H = 56, px = 6, py = 8;
  const x = (i: number) => px + (i / (values.length - 1)) * (W - px * 2);
  const y = (v: number) => H - py - ((v - min) / range) * (H - py * 2);
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L ${x(values.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`;
  const gateY = gate !== undefined ? y(gate) : null;
  const gradId = `grad-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      {gateY !== null && (
        <line x1={px} y1={gateY} x2={W - px} y2={gateY} stroke="#f87171" strokeWidth="1.5" strokeDasharray="5 3" strokeOpacity="0.9" />
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4.5 : 3}
          fill={i === values.length - 1 ? color : "white"} stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

// ─── Battery gauge ────────────────────────────────────────────────────────────

function BatteryBar({ pct, label, sublabel }: { pct: number; label: string; sublabel: string }) {
  const color = pct > 60 ? "#34d399" : pct > 30 ? "#f59e0b" : "#f87171";
  const textColor = pct > 60 ? "text-emerald-600" : pct > 30 ? "text-amber-600" : "text-red-600";
  return (
    <div className="space-y-3 mt-1">
      <div className="flex items-center gap-2">
        {/* Battery body */}
        <div className="flex-1 h-5 rounded-md bg-neutral-100 border border-neutral-200 relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-l-md transition-all" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-neutral-800 mix-blend-multiply">{pct}%</span>
        </div>
        {/* Battery cap */}
        <div className="w-1.5 h-3 rounded-r-sm shrink-0" style={{ background: color }} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-black ${textColor}`}>{label}</span>
      </div>
      <p className="text-xs text-neutral-500 leading-snug">{sublabel}</p>
    </div>
  );
}

// ─── Types & Data ─────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red";

const WEEKS = [
  { n: 6, date: "17 Aug", health: 74, posture: "Gaining",    dot: "green", current: true },
  { n: 5, date: "4 Aug",  health: 69, posture: "Gaining",    dot: "green" },
  { n: 4, date: "28 Jul", health: 67, posture: "Plateauing", dot: "amber" },
  { n: 3, date: "21 Jul", health: 63, posture: "Plateauing", dot: "amber" },
  { n: 2, date: "14 Jul", health: 59, posture: "Fragile",    dot: "red"   },
  { n: 1, date: "7 Jul",  health: 52, posture: "Fragile",    dot: "red"   },
];

const SERIES = {
  health: { values: [52, 59, 63, 67, 69, 74],               label: "Campaign health",      current: "74",   delta: "+5",   color: "#34d399", tone: "green" as Tone },
  save:   { values: [4.2, 4.8, 5.1, 5.5, 5.7, 6.1], gate: 8,  label: "Content save rate",   current: "6.1%", delta: "+0.4%", color: "#f59e0b", tone: "amber" as Tone, gateLabel: "Gate ≥8%" },
  search: { values: [9.8, 10.5, 11.3, 12.0, 12.9, 14.2], gate: 18, label: "Brand search share", current: "14.2%", delta: "+1.8%", color: "#818cf8", tone: "amber" as Tone, gateLabel: "Target 18%" },
};

const KOLS = [
  { handle: "@masakdenganaishah",    activation: "Ayam Percik Challenge",  tier: "Micro", saveRate: 8.4, tone: "green" as Tone, status: "At gate" },
  { handle: "@eatwithzafran",        activation: "Rendang Tok Weeknight",  tier: "Micro", saveRate: 7.1, tone: "amber" as Tone, status: "Building" },
  { handle: "@dapurrumahkuofficial", activation: "Cooks Kitchen Series",   tier: "Micro", saveRate: 6.8, tone: "amber" as Tone, status: "Building" },
  { handle: "@chefhanamariana",      activation: "Lifestyle Recipe Reel",  tier: "Mid",   saveRate: 5.2, tone: "red"   as Tone, status: "Below gate" },
  { handle: "@rawlinsganics",        activation: "Weekend Cooking Vibes",  tier: "Mid",   saveRate: 5.6, tone: "red"   as Tone, status: "Below gate" },
];

const COMPETITORS = [
  { brand: "MAGGI",  campaign: "Masak Sama-Sama",  ics: 81, rating: "CONDITIONAL", gap: "Strong reach, retention signals weak" },
  { brand: "Cooks",  campaign: "Jadikan Caramu",   ics: 76, rating: "CONDITIONAL", gap: "Save rate gate not yet fired",          isSelf: true },
  { brand: "Knorr",  campaign: "Resepi Warisan",   ics: 74, rating: "CONDITIONAL", gap: "Generic audience tension" },
  { brand: "Adabi",  campaign: "Dapur Kita",       ics: 59, rating: "REWORK",      gap: "Scattered channel execution" },
];

const W6 = {
  health: 74, healthDelta: "+5", posture: "Gaining",
  verdict: "The campaign is building correctly at the midpoint. Brand demand is accelerating ahead of Merdeka. The only open item is pushing save rate over the gate threshold in the next 2 weeks — and this week's creative brief is the lever.",
  actions: [
    {
      finding: "Recipe content saves at 2.3× the rate of lifestyle content",
      implication: "Audiences are bookmarking Cooks recipes for later use — a pre-purchase signal that precedes conversion spikes by 10–14 days. The current creative mix is 60% lifestyle, 40% recipe. This is the wrong way around.",
      brief: {
        label: "Creative brief — Week 7",
        lines: [
          "Format: Recipe-led process video — cooking steps, not product close-up",
          "Dishes: Ayam Percik, Rendang Tok, Sup Tulang — high Merdeka search intent",
          "Frame: Cooking confidence (your version, not the shortcut)",
          "Mix target: 70% recipe / 30% lifestyle",
          "Channels: TikTok + Instagram Reels first, Meta feed second",
        ],
      },
    },
    {
      finding: "Brand search interest is growing 2.1× faster than the cooking category",
      implication: "Consumers are actively looking for Cooks — not just browsing. Earned demand converts 40–60% better than paid-for reach. Pulling search spend now would be the single costliest error at this stage.",
      brief: {
        label: "Media brief — Week 7",
        lines: [
          "Protect branded search budget — no reallocation to social this week",
          "Add keyword variants: 'Cooks sos ayam', 'Cooks rendang', 'Cooks resipi'",
          "Negative-match competitor brand terms to protect share gains",
        ],
      },
    },
    {
      finding: "Micro-KOLs are delivering 1.6× better save rates than mid-tier activations",
      implication: "Two mid-tier KOLs are generating reach but not saves — spending budget that is not moving the gate signal. Micro-KOLs are delivering 7–8% save rates with 38% of the total KOL budget.",
      brief: {
        label: "KOL brief — Phase 2 planning",
        lines: [
          "Do not renew @chefhanamariana or @rawlinsganics for Phase 2",
          "Reallocate their budget to @masakdenganaishah + 2 new Klang Valley food creators",
          "Recruitment criteria: save rate history ≥7%, recipe-format, 25–40k followers",
        ],
      },
    },
  ],
  horizon: {
    gateLabel: "Gate 1 — Phase 2 budget release",
    gateCondition: "Save Rate ≥8% held 3 consecutive days + Branded search +40% from campaign start",
    prediction: "At current save-rate growth (+0.4pp per week), Gate 1 is achievable by Week 8. If this week's creative brief is actioned and the mix shifts to recipe-led, growth rate should accelerate — Gate 1 in Week 7–8 is realistic. If not actioned, Gate 1 slips to Week 10 and Phase 2 budget is locked for an additional 2 weeks.",
    horizonItems: [
      { timeframe: "This week",  note: "Action the creative brief. Shift to 70% recipe-led content." },
      { timeframe: "Weeks 7–8", note: "Gate 1 fires if save rate holds ≥8% for 3 consecutive days." },
      { timeframe: "Week 9+",   note: "Phase 2 (Conversion) budget releases. TikTok Shop mechanics activate." },
    ],
    budgetStatus: "Phase 2 budget is locked until Gate 1 fires and holds.",
  },
  ics: { score: 76, rating: "CONDITIONAL", note: "Campaign idea is well-matched to this audience. Execution coherence is the gap — the creative fixes above are addressing it directly. Industry avg: 67." },
  signals: [
    { label: "Brand search share", actual: "14.2%", target: "18%",  pct: 79, delta: "+1.8%",  tone: "amber" as Tone },
    { label: "Content save rate",  actual: "6.1%",  target: "≥8%",  pct: 76, delta: "+0.4%",  tone: "amber" as Tone },
    { label: "UGC volume",         actual: "28",    target: "40",   pct: 70, delta: "+6 pcs",  tone: "amber" as Tone },
  ],
  roadmap: [
    { phase: "Phase 1 — Demand",            dates: "Jul–Aug",  active: true,  note: "Build demand. Gate 1 fires on save rate." },
    { phase: "Phase 2 — Conversion",        dates: "Sep–Oct",  active: false, note: "Locked. Releases when Gate 1 fires." },
    { phase: "Phase 3 — Retention + Scale", dates: "Nov–Dec",  active: false, note: "Locked. Releases when Gate 2 fires." },
  ],
  marketContext: [
    { icon: "🎌", note: "Merdeka 31 Aug — patriotic heritage frame live. Recipe content anchored to 'Masakan Malaysia Asli' is getting elevated reach. 2-week window remaining." },
    { icon: "📱", note: "TikTok algorithm update: recipe-format videos getting 1.4× distribution boost. Lifestyle + product close-up is being deprioritised." },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toneDot(t: string) {
  return t === "green" ? "bg-green-500" : t === "amber" ? "bg-amber-500" : t === "red" ? "bg-red-500" : "bg-neutral-400";
}
function toneBar(t: Tone) {
  return t === "green" ? "bg-green-500" : t === "amber" ? "bg-amber-400" : "bg-red-500";
}
function postureColor(p: string) {
  return p === "Gaining" ? "text-emerald-400" : p === "Plateauing" ? "text-amber-300" : "text-red-400";
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
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-base font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors text-left">
        <span>{label}</span>
        <svg className={`w-5 h-5 text-neutral-500 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-neutral-200 px-5 py-5 bg-white">{children}</div>}
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

      {/* ═══════════════════════════════════════ SIDEBAR ════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-[340px] shrink-0 fixed top-0 left-0 h-screen bg-neutral-900 text-white overflow-y-auto z-20">

        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Capabilities showcase</p>
          <p className="text-xs text-neutral-400 mt-0.5">Illustrative data · ShiftImpact OS</p>
        </div>

        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-medium text-neutral-400 mb-1">Cooks · FMCG · Cooking Sauces</p>
          <p className="text-lg font-bold leading-tight text-white">Jadikan Caramu</p>
          <p className="text-sm text-neutral-400 mt-1.5">Phase 1 — Demand · Jul–Aug 2026</p>
        </div>

        {/* Health ring */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="5"
                strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-emerald-400">{week.health}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Campaign health</p>
            <p className={`text-xl font-bold ${postureColor(week.posture)}`}>{week.posture}</p>
            <p className="text-sm text-emerald-400 font-semibold mt-0.5">{week.healthDelta} pts this week</p>
          </div>
        </div>

        {/* Sparkline */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-sm text-neutral-400 mb-2">Health trajectory · Wk 1 → 6</p>
          <Sparkline values={SERIES.health.values} color="#34d399" />
          <div className="flex items-center justify-between text-sm text-neutral-400 mt-1.5">
            <span>Wk 1 · 52</span>
            <span className="text-emerald-400 font-semibold">Wk 6 · 74 ↑</span>
          </div>
        </div>

        {/* Week timeline */}
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold px-1 mb-2">Report history</p>
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
                <span className={`text-sm font-semibold ${postureColor(w.posture)}`}>{w.health}</span>
                {w.current && <span className="text-[10px] font-bold text-emerald-400 border border-emerald-400/40 rounded px-1.5 py-0.5">NOW</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="px-4 py-4 flex-1">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold px-1 mb-2">This report</p>
          {[
            { href: "#glance",  label: "At a glance" },
            { href: "#q1",      label: "Is it working?" },
            { href: "#q2",      label: "What do I do now?" },
            { href: "#q3",      label: "Are we on track?" },
            { href: "#detail",  label: "Deep dive" },
            { href: "#premium", label: "Full intelligence suite" },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-neutral-300 hover:text-white hover:bg-white/8 transition-colors">
              {item.label}
            </a>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-sm font-bold text-white mb-1">The ShiftImpact Rule</p>
          <p className="text-sm text-neutral-300 leading-relaxed">Budget moves because a signal fired and held — not because a date arrived.</p>
        </div>
      </aside>

      {/* ═══════════════════════════════════════ MOBILE HEADER ══════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-neutral-900 text-white shadow-lg">
        <div className="bg-amber-900/60 px-4 py-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <p className="text-xs font-medium text-amber-200">ShiftImpact OS · Capabilities showcase · illustrative data</p>
        </div>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-300">Cooks · Jadikan Caramu</p>
            <p className="text-base font-bold text-white">Week {selectedWeek} · 17 Aug 2026</p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-10 h-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="6"
                  strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400">{week.health}</span>
              </div>
            </div>
            <div>
              <p className={`text-base font-bold ${postureColor(week.posture)}`}>{week.posture}</p>
              <p className="text-sm text-emerald-400 font-medium">{week.healthDelta} pts</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {WEEKS.map(w => (
            <button key={w.n} onClick={() => setSelectedWeek(w.n)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-colors ${
                selectedWeek === w.n ? "bg-white text-neutral-900 border-white" : "text-neutral-300 border-white/25"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${toneDot(w.dot)}`} />
              Wk {w.n}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════ MAIN CONTENT ═══════════════════════════════ */}
      <main className="lg:ml-80 xl:ml-[340px] flex-1 min-w-0">

        <div className="hidden lg:flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-8 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-900">
            ShiftImpact OS · Capabilities showcase — illustrative data. This is what your campaign portal looks like when live.
          </p>
        </div>

        <div className="px-5 sm:px-8 lg:px-10 py-7 lg:py-8 pb-24">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-sm font-medium text-neutral-500">17 August 2026 · Week 6 of 12</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mt-1">Growth Intelligence Report</h1>
              <p className="text-base text-neutral-600 mt-1">Jadikan Caramu · Phase 1 — Demand</p>
            </div>
            <span className="inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full border bg-green-50 text-green-800 border-green-300 shrink-0">
              Strategist reviewed
            </span>
          </div>

          {/* ── At a glance ──────────────────────────── */}
          <div id="glance" className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold text-neutral-900">At a glance</h2>
                <span className="text-sm text-neutral-500">Weeks 1–6</span>
              </div>
              <p className="text-xs text-neutral-500 hidden sm:block">Dashed line = gate threshold · ask the widget to learn more</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(SERIES).map(([key, s]) => (
                <div key={key} className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5 py-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-semibold text-neutral-700">{s.label}</p>
                    {"gateLabel" in s && (
                      <span className="text-xs text-red-600 font-semibold shrink-0 ml-2">{(s as typeof SERIES.save).gateLabel}</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-neutral-900">{s.current}</span>
                    <span className={`text-sm font-bold ${s.tone === "green" ? "text-emerald-600" : s.tone === "amber" ? "text-amber-600" : "text-red-600"}`}>
                      ↑ {s.delta}
                    </span>
                  </div>
                  <Sparkline values={s.values} gate={"gate" in s ? (s as typeof SERIES.save).gate : undefined} color={s.color} />
                  <p className="text-xs text-neutral-500 mt-2">{"gateLabel" in s ? "Dashed = gate threshold" : "Wk 1 → 6 progression"}</p>
                </div>
              ))}

              {/* Creative Battery card */}
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm px-5 py-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-semibold text-neutral-700">Creative Battery</p>
                  <span className="text-xs text-amber-600 font-semibold shrink-0 ml-2">Action needed</span>
                </div>
                <BatteryBar
                  pct={28}
                  label="~2 wks remaining"
                  sublabel="Current 60/40 lifestyle mix is losing effectiveness vs recipe-led content. Refresh brief issued this week."
                />
              </div>
            </div>
          </div>

          {/* ── Q1: Is it working? ────────────────────── */}
          <div id="q1">
            <SectionQ q="01" label="Is it working?">
              <div className="rounded-2xl bg-neutral-900 px-6 py-6 space-y-5">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">This week&apos;s verdict</p>
                  <p className="text-base leading-relaxed text-white">{week.verdict}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/15">
                  <div>
                    <p className="text-sm font-medium text-neutral-400 mb-1.5">Campaign health</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">{week.health}</span>
                      <span className="text-base text-emerald-400 font-semibold">{week.healthDelta} pts</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex-1 h-2 bg-white/15 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${week.health}%` }} />
                      </div>
                      <span className="text-sm text-neutral-400">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-400 mb-1.5">Brand posture</p>
                    <p className={`text-4xl font-black ${postureColor(week.posture)}`}>{week.posture}</p>
                    <p className="text-sm text-neutral-400 mt-1.5">Signals trending positive</p>
                  </div>
                </div>

                <div className="pt-5 border-t border-white/15 space-y-3">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Market context</p>
                  {week.marketContext.map((m, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-base shrink-0">{m.icon}</span>
                      <p className="text-sm text-neutral-200 leading-relaxed">{m.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SectionQ>
          </div>

          {/* ── Q2: What do I need to do? ─────────────── */}
          <div id="q2">
            <SectionQ q="02" label="What do I need to do this week?">
              <div className="space-y-5">
                {week.actions.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 pt-6 pb-4">
                      <div className="flex items-start gap-4">
                        <span className="w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-base font-bold text-neutral-900 leading-snug">{a.finding}</p>
                          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{a.implication}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mx-5 mb-5 rounded-xl bg-neutral-900 px-5 py-4">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">→ {a.brief.label}</p>
                      <ul className="space-y-2">
                        {a.brief.lines.map((line, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-sm text-neutral-200 leading-relaxed">
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

          {/* ── Q3: Are we on track? ──────────────────── */}
          <div id="q3">
            <SectionQ q="03" label="Are we on track for the gate?">
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-6 py-6 space-y-5">
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">{week.horizon.gateLabel}</p>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-2xl font-black text-neutral-900">Gate not yet fired</p>
                  </div>
                  <p className="text-sm font-semibold text-amber-900 border-l-2 border-amber-500 pl-3 bg-amber-100/60 py-2 pr-3 rounded-r-lg">
                    {week.horizon.gateCondition}
                  </p>
                </div>

                <div className="pt-4 border-t border-amber-300">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3">Signal horizon — next 4 weeks</p>
                  <p className="text-sm text-neutral-800 leading-relaxed mb-4">{week.horizon.prediction}</p>
                  <div className="space-y-3">
                    {week.horizon.horizonItems.map((h, i) => (
                      <div key={i} className="flex items-start gap-4 bg-white/60 rounded-xl px-4 py-3">
                        <span className="text-sm font-bold text-amber-800 shrink-0 w-24">{h.timeframe}</span>
                        <p className="text-sm text-neutral-700 font-medium">{h.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-amber-300 flex items-center gap-3 bg-amber-100/50 rounded-xl px-4 py-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                  <p className="text-sm font-bold text-neutral-900">{week.horizon.budgetStatus}</p>
                </div>
              </div>
            </SectionQ>
          </div>

          {/* ── Deep dive ─────────────────────────────── */}
          <div id="detail">
            <div className="mb-5">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">04</span>
                <h2 className="text-xl font-bold text-neutral-900">Deep dive</h2>
              </div>
              <p className="text-sm text-neutral-600">Supporting evidence behind the findings above.</p>
            </div>

            <div className="space-y-3">

              <Collapsible label="Signal performance · Week 6">
                <div className="space-y-5">
                  {week.signals.map(s => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-neutral-800">{s.label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-neutral-900">{s.actual}</span>
                          <span className="text-sm text-neutral-500">/ {s.target}</span>
                          <span className="text-sm font-semibold text-emerald-700">↑ {s.delta}</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${toneBar(s.tone)}`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Collapsible>

              <Collapsible label="KOL programme · 5 active">
                <div className="space-y-3 mb-2">
                  {KOLS.map(k => (
                    <div key={k.handle} className={`rounded-xl border p-4 ${
                      k.tone === "green" ? "border-green-200 bg-green-50" :
                      k.tone === "amber" ? "border-amber-200 bg-amber-50/50" :
                      "border-red-200 bg-red-50/40"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${toneDot(k.tone)}`} />
                            <span className="text-sm font-bold text-neutral-900">{k.handle}</span>
                            <span className="text-xs font-medium text-neutral-500 border border-neutral-300 rounded-full px-2 py-0.5">{k.tier}</span>
                          </div>
                          <p className="text-sm text-neutral-600 ml-4.5">
                            Activation: <span className="font-semibold text-neutral-800">{k.activation}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xl font-black ${k.tone === "green" ? "text-emerald-700" : k.tone === "amber" ? "text-amber-700" : "text-red-700"}`}>
                            {k.saveRate}%
                          </p>
                          <p className="text-xs text-neutral-500">save rate</p>
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                            k.tone === "green" ? "bg-green-100 text-green-900" :
                            k.tone === "amber" ? "bg-amber-100 text-amber-900" :
                            "bg-red-100 text-red-900"
                          }`}>{k.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm border-t border-neutral-200 pt-4">
                  <span className="text-neutral-600">Programme avg save rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-700">6.3%</span>
                    <span className="text-neutral-500">vs gate ≥8%</span>
                  </div>
                </div>
              </Collapsible>

              <Collapsible label="Category benchmark · ICS comparison">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3 pr-4">Brand</th>
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3 pr-4">Campaign</th>
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3 pr-4">ICS</th>
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3 pr-4">Rating</th>
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3">Key gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {COMPETITORS.map(c => (
                        <tr key={c.brand} className={c.isSelf ? "bg-violet-50" : ""}>
                          <td className={`py-3 pr-4 text-sm font-bold ${c.isSelf ? "text-violet-800" : "text-neutral-800"}`}>{c.brand}</td>
                          <td className="py-3 pr-4 text-sm text-neutral-700">{c.campaign}</td>
                          <td className={`py-3 pr-4 text-2xl font-black leading-none ${c.isSelf ? "text-violet-700" : "text-neutral-800"}`}>{c.ics}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs font-bold ${c.rating === "REWORK" ? "text-amber-700" : "text-violet-700"}`}>{c.rating}</span>
                          </td>
                          <td className="py-3 text-sm text-neutral-600">{c.gap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapsible>

              <Collapsible label="Idea quality score · Jadikan Caramu">
                <div className="flex items-start gap-5">
                  <div className="text-center shrink-0">
                    <span className="text-5xl font-black text-violet-700">{week.ics.score}</span>
                    <p className="text-sm font-bold text-violet-600 mt-0.5">{week.ics.rating}</p>
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed pt-1">{week.ics.note}</p>
                </div>
              </Collapsible>

              <Collapsible label="Phase roadmap · Jul–Dec 2026">
                <div className="space-y-3">
                  {week.roadmap.map((r, i) => (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${r.active ? "border-violet-200 bg-violet-50" : "border-neutral-200 bg-neutral-50"}`}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${r.active ? "bg-violet-500" : "bg-neutral-300"}`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className={`text-sm font-bold ${r.active ? "text-violet-900" : "text-neutral-500"}`}>{r.phase}</p>
                          <span className="text-xs text-neutral-500">{r.dates}</span>
                          {!r.active && <span className="text-[10px] font-bold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded">LOCKED</span>}
                        </div>
                        <p className="text-sm text-neutral-600">{r.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-neutral-900 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-white">The ShiftImpact Rule</p>
                  <p className="text-sm text-neutral-300 mt-0.5">Budget moves because a signal fired and held — not because a date arrived.</p>
                </div>
              </Collapsible>

            </div>
          </div>

          {/* ── Full Intelligence Suite ───────────────── */}
          <div id="premium" className="mt-12">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">05</span>
              <h2 className="text-xl font-bold text-neutral-900">Full Intelligence Suite</h2>
            </div>
            <p className="text-sm text-neutral-600 mb-6">What activates when the client connects business performance data. Each layer below is live in ShiftImpact OS — this shows the maximum picture when all data is shared.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Business Outcome Tracking */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm px-5 py-5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Requires: sales data</span>
                </div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Business Outcome Tracking</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-700">Revenue lift vs pre-campaign baseline</p>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">+12.4%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-700">Sales velocity (units/week)</p>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">+8.1%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-700">Customer acquisition cost</p>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">RM 4.20 → RM 3.61</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-700">Market share (cooking sauces, MY)</p>
                    <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">14.2% → 15.1%</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-400">Signal → sales lag is 10–14 days. Health score at 74 predicts revenue lift 2 weeks forward.</p>
                </div>
              </div>

              {/* Media ROI Waterfall */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm px-5 py-5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Requires: media spend data</span>
                </div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Media ROI by Channel</p>
                <div className="space-y-2.5">
                  {[
                    { channel: "TikTok Creator", roas: "4.8×", bar: 95, tone: "green" },
                    { channel: "Meta Feed", roas: "3.2×", bar: 64, tone: "green" },
                    { channel: "Google Search", roas: "6.1×", bar: 100, tone: "green" },
                    { channel: "Shopee Ads", roas: "1.8×", bar: 36, tone: "amber" },
                    { channel: "KOL (Mid-tier)", roas: "0.9×", bar: 18, tone: "red" },
                  ].map(r => (
                    <div key={r.channel}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-neutral-700">{r.channel}</p>
                        <span className={`text-xs font-bold ${r.tone === "green" ? "text-emerald-600" : r.tone === "amber" ? "text-amber-600" : "text-red-600"}`}>{r.roas} ROAS</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.tone === "green" ? "bg-emerald-400" : r.tone === "amber" ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${r.bar}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-400">Mid-tier KOL ROAS below 1.0× confirms Phase 2 budget reallocation recommendation above.</p>
                </div>
              </div>

              {/* AI Brand Visibility */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm px-5 py-5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">AI monitoring</span>
                </div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">AI Brand Visibility</p>
                <p className="text-xs text-neutral-500 mb-4">Is Cooks appearing in AI-generated answers when consumers ask about cooking sauces?</p>
                <div className="space-y-3">
                  {[
                    { query: '"best cooking sauce Malaysia"', result: "Cooks mentioned · Position 3", tone: "amber" },
                    { query: '"resipi ayam percik sauce"', result: "Not mentioned · Competitor gap", tone: "red" },
                    { query: '"Cooks sos review"', result: "Brand results · Full control", tone: "green" },
                    { query: '"halal cooking sauce brand"', result: "Cooks mentioned · Position 2", tone: "green" },
                  ].map(v => (
                    <div key={v.query} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${v.tone === "green" ? "bg-emerald-400" : v.tone === "amber" ? "bg-amber-400" : "bg-red-400"}`} />
                      <div>
                        <p className="text-xs font-mono text-neutral-600">{v.query}</p>
                        <p className={`text-xs font-medium mt-0.5 ${v.tone === "green" ? "text-emerald-700" : v.tone === "amber" ? "text-amber-700" : "text-red-700"}`}>{v.result}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">AI Eligibility Score</p>
                    <span className="text-sm font-bold text-amber-600">61 / 100</span>
                  </div>
                </div>
              </div>

              {/* Social Currency + Creative Fatigue */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm px-5 py-5">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Advanced Signals</p>
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-neutral-800">Social Currency Index</p>
                      <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">Tier 2 of 5</span>
                    </div>
                    <p className="text-xs text-neutral-600">Earned amplification rate: content is being saved and shared but not yet voluntarily advocated. UGC seeding this week is the trigger for Tier 3.</p>
                  </div>
                  <div className="pt-4 border-t border-neutral-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-neutral-800">Predictive Gate Timing</p>
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">78% confidence</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Gate fires Week 7</span>
                        <span className="font-bold text-neutral-800">22%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Gate fires Week 8</span>
                        <span className="font-bold text-emerald-700">56%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Gate fires Week 9+</span>
                        <span className="font-bold text-amber-700">22%</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">Shifts if brief is actioned this week. Week 7 probability rises to 48%.</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-6 rounded-2xl bg-neutral-900 px-6 py-5">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">What this means for the conversation</p>
              <p className="text-sm text-white leading-relaxed">This dashboard is not reporting on what happened. It is telling you what to do next and why — in time to act. Business outcome data closes the loop between signal intelligence and revenue. When both are running together, every budget decision has a number behind it.</p>
            </div>
          </div>

          <div className="mt-12 pt-5 border-t border-neutral-200 flex items-center justify-between text-sm text-neutral-500">
            <span>ShiftImpact OS</span>
            <span>Week 6 · 17 Aug 2026 · Reviewed by your strategist</span>
          </div>

        </div>
      </main>

      {/* ═══════════════════════════════════════ AI ASSISTANT ════════════════════════════════ */}
      <AskWidget />

    </div>
  );
}
