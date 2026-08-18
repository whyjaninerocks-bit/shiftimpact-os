"use client";

// /portal/demo-agency — Agency client demo portal
// Same visual language as /portal/demo (dark sidebar, sparklines, Q sections).
// Section order is agency-first:
//   → signals & gate first (agencies read data, don't need plain-language summary first)
//   → briefs to action (agencies brief their teams — this is the core output)
//   → brief compliance (close the loop on last week before moving forward)
//   → creative battery (agencies manage creative fatigue)
//   → gate horizon (budget unlock — agencies track this for planning)
//   → competitive intelligence (agencies need this for positioning)
//   → KOL programme (agencies own KOL relationships)

import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red";
type ComplianceStatus = "done" | "partial" | "skipped" | null;
type ComplianceReason = typeof COMPLIANCE_REASONS[number];
type Message = { role: "user" | "ai"; text: string };

// ─── Data ─────────────────────────────────────────────────────────────────────

const WEEKS = [
  { n: 6, date: "17 Aug", health: 74, posture: "Gaining",    dot: "green", current: true },
  { n: 5, date: "4 Aug",  health: 69, posture: "Gaining",    dot: "green" },
  { n: 4, date: "28 Jul", health: 67, posture: "Plateauing", dot: "amber" },
  { n: 3, date: "21 Jul", health: 63, posture: "Plateauing", dot: "amber" },
  { n: 2, date: "14 Jul", health: 59, posture: "Fragile",    dot: "red"   },
  { n: 1, date: "7 Jul",  health: 52, posture: "Fragile",    dot: "red"   },
];

const SERIES = {
  health: { values: [52, 59, 63, 67, 69, 74], color: "#34d399" },
  save:   { values: [4.2, 4.8, 5.1, 5.5, 5.7, 6.1], gate: 8,  color: "#f59e0b" },
  search: { values: [9.8, 10.5, 11.3, 12.0, 12.9, 14.2], gate: 18, color: "#818cf8" },
  ugc:    { values: [14, 17, 20, 22, 26, 28], gate: 40, color: "#3b82f6" },
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

const ACTIONS = [
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
];

const COMPLIANCE_ITEMS = [
  "Recruit 2 Klang Valley food creators (recipe-led, 10K–80K followers)",
  "Activate Rendang Tok or Ayam Percik dish using Cooks paste",
  "Deliver 2 × TikTok process videos + 1 × Instagram Reel per creator",
  "Content uses 'your version of the dish' framing — not brand shortcut positioning",
];

const COMPLIANCE_REASONS = [
  "Budget constraint",
  "Timeline pressure",
  "Client override",
  "Format changed",
  "Creative shifted",
  "Planned for next activation",
] as const;

const CREATIVE_ASSETS = [
  { label: "TikTok · Micro-KOL recipe activations", format: "Creator video", pct: 82, est: "5–6 wks", status: "Holding", tone: "green" as Tone },
  { label: "Meta Feed · Lifestyle product content", format: "Lifestyle/product", pct: 24, est: "~2 wks", status: "Fatigue risk", tone: "red" as Tone },
  { label: "Instagram Reels · UGC seeded content", format: "UGC / seeded", pct: 68, est: "3–4 wks", status: "Stable", tone: "green" as Tone },
  { label: "Google Search · Branded keywords", format: "Search copy", pct: 91, est: "Stable", status: "No decay", tone: "green" as Tone },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toneDot(t: string) {
  return t === "green" ? "bg-green-500" : t === "amber" ? "bg-amber-500" : t === "red" ? "bg-red-500" : "bg-neutral-400";
}
function postureColor(p: string) {
  return p === "Gaining" ? "text-emerald-400" : p === "Plateauing" ? "text-amber-300" : "text-red-400";
}
function toneText(t: Tone) {
  return t === "green" ? "text-emerald-600" : t === "amber" ? "text-amber-600" : "text-red-600";
}
function toneBg(t: Tone) {
  return t === "green" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : t === "amber" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-red-50 text-red-800 border-red-200";
}
function barColor(pct: number) {
  return pct > 60 ? "#34d399" : pct > 30 ? "#f59e0b" : "#f87171";
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, gate, color = "#34d399", height = 56 }: { values: number[]; gate?: number; color?: string; height?: number }) {
  if (values.length < 2) return null;
  const allVals = [...values, ...(gate !== undefined ? [gate] : [])];
  const min = Math.min(...allVals) * 0.92;
  const max = Math.max(...allVals) * 1.08;
  const range = max - min || 1;
  const W = 200, H = height, px = 6, py = height > 80 ? 14 : 8;
  const x = (i: number) => px + (i / (values.length - 1)) * (W - px * 2);
  const y = (v: number) => H - py - ((v - min) / range) * (H - py * 2);
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L ${x(values.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`;
  const gateY = gate !== undefined ? y(gate) : null;
  const gradId = `g-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
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

// ─── Collapsible ─────────────────────────────────────────────────────────────

function Collapsible({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
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

// ─── SectionQ ─────────────────────────────────────────────────────────────────

function SectionQ({ q, label, id, children }: { q: string; label: string; id?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12" id={id}>
      <div className="bg-neutral-900 rounded-2xl px-5 py-4 mb-6 flex items-center gap-4">
        <span className="text-3xl sm:text-5xl font-black text-white/15 leading-none shrink-0">{q}</span>
        <div className="w-px h-8 sm:h-10 bg-white/15 shrink-0" />
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">{label}</h2>
      </div>
      {children}
    </section>
  );
}

// ─── Action card with brief open by default for agencies ──────────────────────

function AgencyActionCard({ index, action }: { index: number; action: typeof ACTIONS[number] }) {
  const [open, setOpen] = useState(true); // open by default — agencies need to action briefs
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-4">
          <span className="w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{index + 1}</span>
          <div className="flex-1">
            <p className="text-base font-bold text-neutral-900 leading-snug">{action.finding}</p>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{action.implication}</p>
          </div>
        </div>
      </div>
      <div className="px-6 pb-5">
        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors">
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {open ? "Hide brief" : `See brief → ${action.brief.label}`}
        </button>
        {open && (
          <div className="mt-3 rounded-xl bg-neutral-900 px-5 py-4">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">→ {action.brief.label}</p>
            <ul className="space-y-2">
              {action.brief.lines.map((line, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-neutral-200 leading-relaxed">
                  <span className="text-emerald-500 shrink-0 mt-0.5 font-bold">·</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI chat widget ───────────────────────────────────────────────────────────

function AskWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Ask me anything about this report — signal health, gate status, KOL performance, creative battery, or any number you want to unpack." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(question: string) {
    if (!question.trim() || streaming) return;
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setInput("");
    setStreaming(true);
    setMessages(prev => [...prev, { role: "ai", text: "" }]);
    try {
      const res = await fetch("/api/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true, question }),
      });
      if (!res.ok || !res.body) {
        setMessages(prev => { const m = [...prev]; m[m.length - 1] = { role: "ai", text: "Something went wrong. Please try again." }; return m; });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => { const m = [...prev]; m[m.length - 1] = { role: "ai", text: fullText }; return m; });
      }
    } catch {
      setMessages(prev => { const m = [...prev]; m[m.length - 1] = { role: "ai", text: "Unable to reach the intelligence layer." }; return m; });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />}
      {open && (
        <div className="fixed z-50 bg-white shadow-2xl border border-neutral-100 flex flex-col bottom-0 left-0 right-0 rounded-t-2xl max-h-[75vh] lg:bottom-24 lg:right-6 lg:left-auto lg:rounded-2xl lg:w-[480px] lg:max-h-[600px]">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100">
            <div>
              <p className="text-sm font-bold text-neutral-900">Ask the intelligence</p>
              <p className="text-xs text-neutral-400">Jadikan Caramu · Week 6</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-neutral-900 text-white rounded-br-sm" : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
                }`}>{m.text || (streaming ? "·  ·  ·" : "")}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-neutral-100 px-3 py-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef} rows={1} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask about save rate, gate, KOL performance…"
                className="flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
              />
              <button onClick={() => send(input)} disabled={streaming || !input.trim()}
                className="px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-40">
                →
              </button>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(v => !v)}
        className="fixed z-40 bottom-6 right-6 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold hover:bg-neutral-700 transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 10a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1h10a1 1 0 011 1v7z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Ask the intelligence
      </button>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgencyDemoPage() {
  const [selectedWeek, setSelectedWeek] = useState(6);

  // Compliance state
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>(COMPLIANCE_ITEMS.map(() => null));
  const [complianceReasons, setComplianceReasons] = useState<(ComplianceReason | null)[]>(COMPLIANCE_ITEMS.map(() => null));
  const [complianceSubmitted, setComplianceSubmitted] = useState(false);

  const allAnswered = complianceStatus.every(s => s !== null);
  const needsReason = (i: number) => complianceStatus[i] === "partial" || complianceStatus[i] === "skipped";
  const readyToSubmit = allAnswered && complianceStatus.every((s, i) => s === "done" || complianceReasons[i] !== null);
  const complianceScore = complianceSubmitted
    ? Math.round(complianceStatus.reduce((sum, s) => sum + (s === "done" ? 100 : s === "partial" ? 50 : 0), 0) / complianceStatus.length)
    : 0;
  const complianceRating = complianceScore >= 80 ? "High" : complianceScore >= 50 ? "Medium" : "Low";
  const complianceRatingColor = complianceRating === "High" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : complianceRating === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";

  const circumference = 138.23;
  const arcLen = (74 / 100) * circumference;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex">

      {/* ═══════════════════════════════════════ SIDEBAR ════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[380px] xl:w-[440px] shrink-0 fixed top-0 left-0 h-screen bg-neutral-900 text-white overflow-y-auto z-20">

        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Agency intelligence view</p>
          <p className="text-xs text-neutral-400 mt-0.5">Illustrative data · ShiftImpact OS</p>
        </div>

        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-medium text-neutral-400 mb-1">Cooks · FMCG · Cooking Sauces</p>
          <p className="text-lg font-bold leading-tight text-white">Jadikan Caramu</p>
          <p className="text-sm text-neutral-400 mt-1.5">Phase 1 — Demand · Jul–Aug 2026</p>
        </div>

        {/* Health ring */}
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="6" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="#34d399" strokeWidth="6"
                strokeDasharray={`${(74 / 100) * (2 * Math.PI * 32)} ${2 * Math.PI * 32}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-emerald-400">74</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">Campaign health</p>
            <p className="text-2xl font-black text-emerald-400">Gaining</p>
            <p className="text-sm text-emerald-400 font-semibold mt-1">+5 pts this week</p>
          </div>
        </div>

        {/* Week navigator */}
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold px-1 mb-2">Report history</p>
          <div className="space-y-0.5">
            {WEEKS.map(w => (
              <button key={w.n} onClick={() => setSelectedWeek(w.n)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${selectedWeek === w.n ? "bg-white/15" : "hover:bg-white/8"}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${toneDot(w.dot)}`} />
                <span className={`text-sm flex-1 truncate ${selectedWeek === w.n ? "font-semibold text-white" : "text-neutral-300"}`}>
                  Week {w.n} · {w.date}
                </span>
                <span className={`text-sm font-semibold shrink-0 ${postureColor(w.posture)}`}>{w.health}</span>
                {w.current && <span className="text-[10px] font-bold text-emerald-400 border border-emerald-400/40 rounded px-1.5 py-0.5 shrink-0">NOW</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar nav — agency order */}
        <div className="px-4 py-4 flex-1">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold px-1 mb-2">This report</p>
          {[
            { href: "#signals",    label: "Signal health" },
            { href: "#gate",       label: "Gate status" },
            { href: "#briefs",     label: "Briefs to action" },
            { href: "#compliance", label: "Brief compliance" },
            { href: "#battery",    label: "Creative battery" },
            { href: "#horizon",    label: "Gate horizon" },
            { href: "#competitive",label: "Competitive" },
            { href: "#kol",        label: "KOL performance" },
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
        <div className="bg-blue-900/60 px-4 py-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          <p className="text-xs font-medium text-blue-200">ShiftImpact OS · Agency intelligence view · illustrative data</p>
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
                <span className="text-xs font-bold text-emerald-400">74</span>
              </div>
            </div>
            <div>
              <p className="text-base font-bold text-emerald-400">Gaining</p>
              <p className="text-sm text-emerald-400 font-medium">+5 pts</p>
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
      <main className="lg:ml-[380px] xl:ml-[440px] flex-1 min-w-0">

        {/* Agency context banner */}
        <div className="hidden lg:flex items-center gap-2 bg-blue-50 border-b border-blue-200 px-8 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <p className="text-sm font-medium text-blue-900">
            ShiftImpact OS · Agency intelligence view — illustrative data. This is what your agency team sees each week.
          </p>
        </div>

        <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 pb-32">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">ShiftImpact · Agency Intelligence Report · 17 Aug 2026 · Week 6 of 12</p>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 leading-tight">Agency Intelligence Report</h1>
                <p className="text-sm sm:text-base text-neutral-500 mt-1">Jadikan Caramu · Phase 1 — Demand · Cooks</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-blue-50 text-blue-800 border-blue-300 shrink-0">
                Agency view
              </span>
            </div>
            <p className="text-sm sm:text-base lg:text-lg font-semibold text-neutral-700 border-l-4 border-neutral-900 pl-4 leading-snug">
              Signal readings, open briefs, and compliance status — everything your team needs before the weekly debrief.
            </p>
          </div>

          {/* ── Campaign health hero ──────────────────── */}
          <div className="mb-8">
            <div className="bg-neutral-900 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                {/* Score + trajectory */}
                <div className="px-6 py-6">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Health score</p>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-7xl font-black text-emerald-400 leading-none">74</span>
                    <div>
                      <p className="text-xl font-black text-emerald-400">↑ +5 pts</p>
                      <p className="text-sm text-neutral-500">this week</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base font-black text-emerald-400 border border-emerald-400/40 rounded-full px-3 py-1">Gaining</span>
                    <span className="text-sm text-neutral-500">Week 5 of consecutive improvement</span>
                  </div>
                  <Sparkline values={SERIES.health.values} color="#34d399" height={80} />
                  <div className="flex items-center justify-between text-xs mt-1.5">
                    <span className="text-neutral-600">52 · Fragile</span>
                    <span className="text-emerald-400 font-semibold">74 · Gaining</span>
                  </div>
                </div>

                {/* Agency strategist verdict */}
                <div className="px-6 py-6">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Strategist verdict</p>
                  <p className="text-base text-white leading-relaxed">The campaign is building correctly at the midpoint. Brand demand is accelerating ahead of Merdeka. The only open item is pushing save rate over the gate threshold in the next 2 weeks — and this week&apos;s creative brief is the lever.</p>
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0">🎌</span>
                      <p className="text-sm text-neutral-400 leading-relaxed">Merdeka 31 Aug — recipe content anchored to &apos;Masakan Malaysia Asli&apos; is getting elevated reach. 2-week window remaining.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0">📱</span>
                      <p className="text-sm text-neutral-400 leading-relaxed">TikTok algorithm: recipe-format videos getting 1.4× distribution boost. Lifestyle + product close-up is being deprioritised.</p>
                    </div>
                  </div>
                </div>

                {/* Gate status */}
                <div className="px-6 py-6">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Phase 2 gate</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black text-amber-400 leading-none">1.9pp</span>
                    <span className="text-base text-neutral-400">remaining</span>
                  </div>
                  <p className="text-sm text-neutral-400 mb-4">Save rate ≥8% · currently 6.1%</p>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: "76%" }} />
                  </div>
                  <div className="flex items-center justify-between text-sm text-neutral-500 mb-5">
                    <span>6.1% current</span>
                    <span>8.0% gate</span>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-neutral-500 mb-1">Gate fires</p>
                    <p className="text-lg font-black text-white">Week 7–8</p>
                    <p className="text-sm text-neutral-400 mt-0.5">if brief actioned this week · 78% confidence</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Q1: Signal health ─────────────────────── */}
          <SectionQ q="01" label="What does the data say?" id="signals">
            <div className="space-y-5">

              {/* Signal cards — 4 up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="gate">
                {/* Save Rate */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-bold text-neutral-600">Save rate</p>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Gate ≥8%</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-neutral-900">6.1%</span>
                    <span className="text-sm font-bold text-amber-600">↑ +0.4%</span>
                  </div>
                  <Sparkline values={SERIES.save.values} gate={8} color="#f59e0b" height={72} />
                  <p className="text-xs text-amber-700 font-semibold mt-2">1.9pp below gate · primary condition</p>
                </div>

                {/* Brand Search */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-bold text-neutral-600">Brand search share</p>
                    <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">Target 18%</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-neutral-900">14.2%</span>
                    <span className="text-sm font-bold text-violet-600">↑ +1.8%</span>
                  </div>
                  <Sparkline values={SERIES.search.values} gate={18} color="#818cf8" height={72} />
                  <p className="text-xs text-violet-700 font-semibold mt-2">3.8pp below target</p>
                </div>

                {/* UGC */}
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm px-5 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-bold text-neutral-600">UGC volume</p>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Above threshold</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-neutral-900">28</span>
                    <span className="text-sm font-bold text-emerald-600">↑ +6 pcs</span>
                  </div>
                  <Sparkline values={SERIES.ugc.values} gate={40} color="#3b82f6" height={72} />
                  <p className="text-xs text-emerald-700 font-semibold mt-2">72% authenticity ratio · above 65% threshold</p>
                </div>

                {/* ICS */}
                <div className="bg-white rounded-2xl border border-violet-200 shadow-sm px-5 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-bold text-neutral-600">Idea quality</p>
                    <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">CONDITIONAL</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-black text-neutral-900">76</span>
                    <span className="text-sm font-bold text-violet-600">ICS</span>
                  </div>
                  <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: "76%" }} />
                  </div>
                  <p className="text-xs text-violet-700 font-semibold">Industry avg 67 · Cooks at 76</p>
                </div>
              </div>

              {/* Signal vs gate comparison */}
              <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Signal vs gate threshold · Week 6</p>
                </div>
                <div className="px-6 py-5 space-y-5">
                  {[
                    { label: "Content save rate", current: 6.1, gate: 8.0, unit: "%", color: "bg-amber-400", gap: "−1.9pp to gate", note: "Primary gate condition · 5 consecutive weeks positive" },
                    { label: "Brand search share", current: 14.2, gate: 18.0, unit: "%", color: "bg-blue-400", gap: "−3.8pp to gate", note: "Growing 2.1× faster than cooking category" },
                    { label: "UGC authenticity ratio", current: 72, gate: 65, unit: "%", color: "bg-emerald-500", gap: "7pp above gate ✓", note: "Above threshold · holding" },
                  ].map(sig => {
                    const aboveGate = sig.current >= sig.gate;
                    const pct = Math.min((sig.current / sig.gate) * 100, 100);
                    return (
                      <div key={sig.label}>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-sm font-semibold text-neutral-800">{sig.label}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${aboveGate ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{sig.gap}</span>
                        </div>
                        <div className="relative h-2 bg-neutral-100 rounded-full">
                          <div className={`h-full rounded-full ${sig.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-neutral-500">{sig.note}</span>
                          <span className="text-[11px] font-bold text-neutral-700">{sig.current}{sig.unit} / {sig.gate}{sig.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* What's working / not working */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3">What&apos;s driving Gaining</p>
                  <ul className="space-y-2.5">
                    {[
                      { label: "Micro-KOL save rate avg", value: "7.4%", sub: "Above gate threshold" },
                      { label: "Brand search growth", value: "2.1×", sub: "Faster than cooking category" },
                      { label: "UGC authenticity ratio", value: "72%", sub: "Above 65% threshold, holding" },
                      { label: "Save rate trend", value: "+5 wks", sub: "Consecutive weeks positive" },
                    ].map(item => (
                      <li key={item.label} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm text-emerald-900 font-medium">{item.label}</span>
                            <span className="text-sm font-black text-emerald-700">{item.value}</span>
                          </div>
                          <p className="text-[11px] text-emerald-600">{item.sub}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Open items for your team</p>
                  <ul className="space-y-2.5">
                    {[
                      { label: "Gate 1", value: "Not fired", sub: "1.9pp from save rate gate" },
                      { label: "Creative mix", value: "60% lifestyle", sub: "Suppressing save rate signal" },
                      { label: "Mid-tier KOL avg", value: "5.4%", sub: "Below gate · 62% of budget" },
                      { label: "Meta save rate/impression", value: "−3% WoW", sub: "Fatigue risk — brief issued" },
                    ].map(item => (
                      <li key={item.label} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm text-neutral-700 font-medium">{item.label}</span>
                            <span className="text-sm font-black text-neutral-900">{item.value}</span>
                          </div>
                          <p className="text-[11px] text-neutral-500">{item.sub}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Critical watch signal */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-amber-500 mt-0.5 shrink-0"><path d="M9 2L1.5 15h15L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7v4M9 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Watch signal — brief your creative team now</p>
                    <p className="text-sm text-amber-900 leading-relaxed">Meta Feed save rate <span className="font-bold">per impression</span> is declining 3% week-on-week even as total impressions grow. Content resonance is falling even as reach grows — early creative fatigue. The creative brief below directly targets this.</p>
                  </div>
                </div>
              </div>
            </div>
          </SectionQ>

          {/* ── Q2: Briefs to action ──────────────────── */}
          <SectionQ q="02" label="What briefs are going out this week?" id="briefs">
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-600 shrink-0"><path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p className="text-sm font-semibold text-blue-900">3 briefs ready to issue · All confirmed by strategist · Week 7 activation window</p>
              </div>
              {ACTIONS.map((a, i) => (
                <AgencyActionCard key={i} index={i} action={a} />
              ))}
              {/* Delivery & acknowledgement record */}
              <Collapsible label="Delivery & acknowledgement record — 2 of 3 acknowledged">
                <div className="rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                    <p className="text-xs font-bold text-neutral-600 uppercase tracking-widest">Report delivery status</p>
                    <span className="text-xs font-semibold text-amber-700">2 of 3 acknowledged</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-4 py-2.5">Recipient</th>
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-3 py-2.5 hidden sm:table-cell">Role</th>
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-3 py-2.5">Read</th>
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "Farah Nabilah", role: "Brand Marketing Lead", read: "17 Aug · 09:14", ack: "Acknowledged", tone: "green" as Tone },
                        { name: "Azlan Razak", role: "Agency Account Director", read: "17 Aug · 11:42", ack: "Acknowledged", tone: "green" as Tone },
                        { name: "Priya Menon", role: "Media Planner", read: "—", ack: "Awaiting", tone: "amber" as Tone },
                      ].map(r => (
                        <tr key={r.name} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                          <td className="px-4 py-3 font-semibold text-neutral-800">{r.name}</td>
                          <td className="px-3 py-3 text-neutral-600 hidden sm:table-cell">{r.role}</td>
                          <td className="px-3 py-3 text-neutral-600">{r.read}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 border ${toneBg(r.tone)}`}>
                              {r.tone === "green" ? "✓ " : "⏳ "}{r.ack}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapsible>
            </div>
          </SectionQ>

          {/* ── Q3: Brief compliance ──────────────────── */}
          <SectionQ q="03" label="Did last week&apos;s brief get executed?" id="compliance">
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              <div className="flex items-start justify-between px-5 py-3.5 bg-neutral-50 border-b border-neutral-200 flex-wrap gap-2">
                <div>
                  <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest mb-0.5">Brief compliance — Week 5 brief</p>
                  <p className="text-[11px] text-neutral-500">Executed in Week 6 · Submit before this report closes</p>
                </div>
                {complianceSubmitted ? (
                  <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 ${complianceRatingColor}`}>
                    <span className="text-xs font-black">{complianceRating}</span>
                    <span className="text-xs font-semibold">{complianceScore}% compliance</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-semibold text-amber-700">Pending your submission</span>
                  </div>
                )}
              </div>

              {complianceSubmitted ? (
                <div className="divide-y divide-neutral-100">
                  {COMPLIANCE_ITEMS.map((item, i) => {
                    const s = complianceStatus[i];
                    const r = complianceReasons[i];
                    return (
                      <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          s === "done" ? "bg-emerald-100" : s === "partial" ? "bg-amber-100" : "bg-red-100"
                        }`}>
                          {s === "done"
                            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : s === "partial"
                            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          }
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-neutral-800">{item}</p>
                          {r && <span className="inline-block mt-1 text-[10px] font-semibold bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5">{r}</span>}
                        </div>
                        <span className={`text-[11px] font-bold whitespace-nowrap ${s === "done" ? "text-emerald-600" : s === "partial" ? "text-amber-600" : "text-red-500"}`}>
                          {s === "done" ? "Done in full" : s === "partial" ? "Done partially" : "Not done"}
                        </span>
                      </div>
                    );
                  })}
                  <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100">
                    <p className="text-[10px] text-neutral-400">Submitted · Compliance score informs prediction variance analysis</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="divide-y divide-neutral-100">
                    {COMPLIANCE_ITEMS.map((item, i) => (
                      <div key={i} className="px-5 py-4">
                        <p className="text-sm font-medium text-neutral-800 mb-3">{item}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(["done", "partial", "skipped"] as ComplianceStatus[]).map(opt => (
                            <button key={opt}
                              onClick={() => {
                                const next = [...complianceStatus];
                                next[i] = opt;
                                setComplianceStatus(next);
                                if (opt === "done") {
                                  const nextR = [...complianceReasons];
                                  nextR[i] = null;
                                  setComplianceReasons(nextR);
                                }
                              }}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                complianceStatus[i] === opt
                                  ? opt === "done" ? "bg-emerald-600 border-emerald-600 text-white"
                                    : opt === "partial" ? "bg-amber-500 border-amber-500 text-white"
                                    : "bg-red-500 border-red-500 text-white"
                                  : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400"
                              }`}>
                              {opt === "done" ? "Done in full" : opt === "partial" ? "Done partially" : "Not done"}
                            </button>
                          ))}
                        </div>
                        {needsReason(i) && (
                          <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                            <span className="text-[10px] text-neutral-400 font-semibold self-center mr-1">Why?</span>
                            {COMPLIANCE_REASONS.map(r => (
                              <button key={r}
                                onClick={() => {
                                  const next = [...complianceReasons];
                                  next[i] = r;
                                  setComplianceReasons(next);
                                }}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                                  complianceReasons[i] === r ? "bg-neutral-800 border-neutral-800 text-white" : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400"
                                }`}>
                                {r}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] text-neutral-400">
                      {readyToSubmit ? "Ready to submit — this closes the compliance record for Week 5 brief." : "Select a status for each brief item. If partial or not done, select a reason."}
                    </p>
                    <button
                      onClick={() => { if (readyToSubmit) setComplianceSubmitted(true); }}
                      disabled={!readyToSubmit}
                      className={`text-sm font-bold px-5 py-2 rounded-xl transition-all ${
                        readyToSubmit ? "bg-neutral-900 text-white hover:bg-neutral-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                      }`}>
                      Submit compliance report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SectionQ>

          {/* ── Q4: Creative battery ──────────────────── */}
          <SectionQ q="04" label="How long does the creative have?" id="battery">
            <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Anchored to</span>
                <span className="text-sm font-bold text-violet-700">Jadikan Caramu</span>
                <span className="text-xs font-bold text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-2 py-0.5">ICS 76 · CONDITIONAL</span>
              </div>
              <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">What this tells your team</p>
                    <p className="text-sm text-neutral-700 leading-relaxed">Creative Battery measures how many more weeks the current execution format can sustain performance before audiences stop responding. The idea (Jadikan Caramu) is intact — it is the <em>expression</em> of the idea that needs refreshing.</p>
                  </div>
                  <div className="pt-3 border-t border-neutral-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-amber-600">~3 wks</span>
                      <span className="text-sm text-neutral-500">campaign average · weighted by spend</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1.5 font-medium">⚠ Meta feed refresh is priority — brief issued this week</p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Endurance by format</p>
                  <div className="space-y-5">
                    {CREATIVE_ASSETS.map(a => {
                      const bc = barColor(a.pct);
                      const tc = toneText(a.tone);
                      return (
                        <div key={a.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bc }} />
                              <span className="text-xs font-semibold text-neutral-700 truncate">{a.label}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className={`text-xs font-bold ${tc}`}>{a.est}</span>
                              <span className="text-xs text-neutral-400">{a.status}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 rounded-md bg-neutral-100 border border-neutral-200 overflow-hidden">
                              <div className="h-full rounded-l-md" style={{ width: `${a.pct}%`, background: bc, opacity: 0.85 }} />
                            </div>
                            <span className="text-xs font-bold text-neutral-500 w-8 text-right">{a.pct}%</span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5 pl-4">{a.format}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </SectionQ>

          {/* ── Q5: Gate horizon ─────────────────────── */}
          <SectionQ q="05" label="Where is the gate?" id="horizon">
            <div className="space-y-3">
              {/* Gate banner */}
              <div className="rounded-2xl bg-neutral-900 px-6 py-5">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Gate 1 — Phase 2 budget release</p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-3xl font-black text-white leading-tight">Gate not yet fired</p>
                    <p className="text-sm text-neutral-400 mt-1">1.9pp below threshold · Phase 2 budget locked</p>
                  </div>
                  <div className="shrink-0 w-14 h-14 rounded-full border-4 border-amber-400 flex items-center justify-center bg-amber-400/10">
                    <span className="text-amber-400 text-xl font-black">!</span>
                  </div>
                </div>
              </div>
              {/* Gate conditions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Save rate</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-black text-neutral-900">6.1%</span>
                    <span className="text-sm text-neutral-400 font-medium">/ ≥8%</span>
                  </div>
                  <div className="h-2 bg-amber-200 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "76%" }} />
                  </div>
                  <p className="text-xs font-semibold text-amber-800">−1.9pp to gate · primary condition</p>
                </div>
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Brand search share</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-black text-neutral-900">14.2%</span>
                    <span className="text-sm text-neutral-400 font-medium">/ ≥18%</span>
                  </div>
                  <div className="h-2 bg-amber-200 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: "79%" }} />
                  </div>
                  <p className="text-xs font-semibold text-amber-800">−3.8pp to gate · secondary condition</p>
                </div>
              </div>
              {/* Timeline */}
              <div className="rounded-2xl bg-neutral-900 px-5 py-5">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">Signal horizon · planning view</p>
                <div className="space-y-0">
                  {[
                    { timeframe: "This week", note: "Action creative brief — shift to 70% recipe-led content", dot: "bg-amber-400", line: true },
                    { timeframe: "Weeks 7–8", note: "Gate 1 fires if save rate holds ≥8% for 3 consecutive days", dot: "bg-amber-300", line: true },
                    { timeframe: "Week 9+",   note: "Phase 2 budget releases — TikTok Shop mechanics activate · KOL brief reactivates", dot: "bg-emerald-400", line: false },
                  ].map((h, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${h.dot}`} />
                        {h.line && <div className="w-px flex-1 bg-neutral-700 my-1" style={{ minHeight: "28px" }} />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-0.5">{h.timeframe}</p>
                        <p className="text-sm text-white font-medium leading-snug">{h.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Budget lock */}
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-400 px-5 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-neutral-900 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-black text-neutral-900">Phase 2 budget is locked until Gate 1 fires and holds.</p>
              </div>
            </div>
          </SectionQ>

          {/* ── Q6: Competitive intelligence ─────────── */}
          <SectionQ q="06" label="What is the competition doing?" id="competitive">
            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Category ICS benchmark · Cooking Sauces</p>
                  <span className="text-xs font-semibold text-violet-700">Cooks ranked 2nd</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left text-xs font-semibold text-neutral-500 pb-3 pt-4 px-6">Brand</th>
                        <th className="text-left text-xs font-semibold text-neutral-500 pb-3 pt-4 px-4">Campaign</th>
                        <th className="text-left text-xs font-semibold text-neutral-500 pb-3 pt-4 px-4">ICS</th>
                        <th className="text-left text-xs font-semibold text-neutral-500 pb-3 pt-4 px-4">Rating</th>
                        <th className="text-left text-xs font-semibold text-neutral-500 pb-3 pt-4 px-4">Gap to address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {COMPETITORS.map(c => (
                        <tr key={c.brand} className={c.isSelf ? "bg-violet-50" : ""}>
                          <td className={`py-4 px-6 font-bold ${c.isSelf ? "text-violet-800" : "text-neutral-800"}`}>{c.brand} {c.isSelf && <span className="text-[10px] font-bold text-violet-600 border border-violet-300 rounded-full px-1.5 py-0.5 ml-1">your client</span>}</td>
                          <td className="py-4 px-4 text-neutral-700">{c.campaign}</td>
                          <td className={`py-4 px-4 text-2xl font-black leading-none ${c.isSelf ? "text-violet-700" : "text-neutral-800"}`}>{c.ics}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-bold ${c.rating === "REWORK" ? "text-amber-700" : "text-violet-700"}`}>{c.rating}</span>
                          </td>
                          <td className="py-4 px-4 text-sm text-neutral-600">{c.gap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-900 px-6 py-5">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">What this means for your brief</p>
                <p className="text-sm text-neutral-200 leading-relaxed">The gap to MAGGI (81 vs 76) is not budget or idea quality — it is <span className="text-white font-semibold">executional consistency</span>. MAGGI runs the same idea coherently across every format. Cooks is running two different ideas depending on format (recipe vs lifestyle). Tightening to recipe-led this week closes that gap. By Week 8, ICS should reach 79–81 range.</p>
              </div>
            </div>
          </SectionQ>

          {/* ── Q7: KOL performance ──────────────────── */}
          <SectionQ q="07" label="How are your KOLs performing?" id="kol">
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                <p className="text-sm font-semibold text-blue-900">KOL performance measured on save rate only — not reach or follower count. Save rate is the only KOL metric that directly moves the gate signal.</p>
              </div>
              {KOLS.map(k => (
                <div key={k.handle} className={`rounded-2xl border p-4 ${
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
                      <p className="text-sm text-neutral-600 ml-4">Activation: <span className="font-semibold text-neutral-800">{k.activation}</span></p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xl font-black ${toneText(k.tone)}`}>{k.saveRate}%</p>
                      <p className="text-xs text-neutral-500">save rate</p>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 border ${toneBg(k.tone)}`}>{k.status}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl bg-neutral-900 px-5 py-4">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Phase 2 KOL recommendation</p>
                <p className="text-sm text-neutral-200 leading-relaxed">Do not renew <span className="text-white font-semibold">@chefhanamariana</span> or <span className="text-white font-semibold">@rawlinsganics</span> for Phase 2. Concentrate all KOL budget on micro-tier performers and recruit 2 new Klang Valley food creators. Recruitment criteria: save rate history ≥7%, recipe-format, 25–40k followers.</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-3.5">
                <span className="text-sm text-neutral-600">Programme avg save rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-amber-700">6.3%</span>
                  <span className="text-sm text-neutral-500">vs gate ≥8%</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">1.7pp gap</span>
                </div>
              </div>
            </div>
          </SectionQ>

          {/* Footer */}
          <div className="pt-6 border-t border-neutral-200 text-xs text-neutral-400">
            ShiftImpact OS · Agency intelligence view · Illustrative data · Cooks · Jadikan Caramu · Week 6 of 12
          </div>
        </div>
      </main>

      <AskWidget />
    </div>
  );
}
