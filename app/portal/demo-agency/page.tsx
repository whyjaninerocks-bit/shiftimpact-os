"use client";

// /portal/demo-agency — Agency client portal
//
// Architecture: intelligence first, execution beneath, consulting overlay at end.
//
// Intelligence layer (Q01–Q03): mirrors the brand client view exactly.
//   Agencies need this to consult, not just execute.
//
// Execution layer (Q04–Q08): what the agency issues and tracks internally.
//   Briefs, compliance, creative battery, KOL, competitive.
//
// Consulting overlay (Q09): agency narrative + client readout preview.
//   This is where the agency adds their layer before releasing to the client.

import { useState, useRef, useEffect } from "react";

// ─── Data: Intelligence layer ─────────────────────────────────────────────────

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

const PREDICTIONS = [
  { label: "Gate 1 fire probability", wk: "Wk 7",  pct: 56, condition: "if recipe brief actioned this week", confidence: 78 },
  { label: "Gate 1 fire probability", wk: "Wk 8",  pct: 78, condition: "rises to this if brief actioned",    confidence: 72 },
  { label: "Save rate if brief actioned", wk: "Wk 7", pct: null, range: "7.0–7.6%", confidence: 81 },
  { label: "Health score if brief actioned", wk: "Wk 8", pct: null, range: "77–80", confidence: 69 },
];

// ─── Data: Execution layer ────────────────────────────────────────────────────

const ACTIONS = [
  {
    week: 7,
    type: "Creative brief",
    title: "Shift to recipe-led creative mix",
    signal: "Save rate 6.1% vs gate 8.0% — recipe content saving at 2.3×",
    direction: "Shift to 70% recipe-led content. Merdeka window closes 31 Aug — patriotic heritage frame is getting elevated distribution. Anchor dish names to 'Masakan Malaysia Asli'. Do NOT use shortcut or easy framing — depresses save rate.",
    deliverables: ["2 × TikTok process videos — Ayam Percik or Rendang Tok", "1 × Instagram Reel — 'your version of the dish' framing", "Caption copy — Malay primary, English subtitle"],
    urgency: "This week — gate window closes in 2 weeks",
    tone: "green" as const,
  },
  {
    week: 7,
    type: "Media brief",
    title: "Hold brand search spend — do not pull",
    signal: "Search share growing 2.1× faster than category",
    direction: "Branded search is earned demand — do not reduce spend here. Consumers are actively looking for Cooks, not just browsing. Pulling search at this stage would be the costliest error. Maintain current allocation through gate.",
    deliverables: ["Confirm media plan: no search budget reduction", "Flag to client if platform is recommending rebalance — override it"],
    urgency: "Confirm before next media cycle",
    tone: "amber" as const,
  },
  {
    week: 7,
    type: "KOL brief",
    title: "Phase 2 KOL planning — recruit micro tier",
    signal: "Micro-KOLs: 7–8% save rate · Mid-tier: 5.2–5.6% save rate",
    direction: "Mid-tier KOLs are generating reach but not saves. 38% of KOL budget is producing 68% of save outcomes via micro-tier. For Phase 2, shift budget concentration to micro-tier performers and recruit 2 new Klang Valley food creators matching @masakdenganaishah profile.",
    deliverables: ["Identify 2 Klang Valley micro-food creators (10K–80K, recipe-led)", "Draft Phase 2 KOL brief for gate confirmation", "Issue rebalance memo to client for Phase 2 approval"],
    urgency: "Plan now — brief issues on gate confirmation",
    tone: "amber" as const,
  },
];

const KOLS = [
  { handle: "@masakdenganaishah",    tier: "Micro", saveRate: 8.4, views: "48K", tone: "green" as const, status: "Above gate" },
  { handle: "@eatwithzafran",        tier: "Micro", saveRate: 7.1, views: "34K", tone: "amber" as const, status: "Building" },
  { handle: "@dapurrumahkuofficial", tier: "Micro", saveRate: 6.8, views: "22K", tone: "amber" as const, status: "Building" },
  { handle: "@chefhanamariana",      tier: "Mid",   saveRate: 5.2, views: "61K", tone: "red"   as const, status: "Below gate" },
  { handle: "@rawlinsganics",        tier: "Mid",   saveRate: 5.6, views: "44K", tone: "red"   as const, status: "Below gate" },
];

const COMPETITORS = [
  { brand: "MAGGI",  ics: 81, rating: "CONDITIONAL", gap: "Strong reach, retention signals weak" },
  { brand: "Knorr",  ics: 68, rating: "NOT READY",   gap: "UGC authenticity below threshold" },
  { brand: "Cooks",  ics: 76, rating: "CONDITIONAL", gap: "Save rate 1.9pp below gate — on track" },
  { brand: "Adabi",  ics: 59, rating: "NOT READY",   gap: "Search share declining, no recovery signal" },
];

const COMPLIANCE_ITEMS = [
  "Recruit 2 Klang Valley food creators (recipe-led, 10K–80K followers)",
  "Activate Rendang Tok or Ayam Percik dish using Cooks paste",
  "Deliver 2 × TikTok process videos + 1 × Instagram Reel per creator",
  "Content uses 'your version of the dish' framing — not brand shortcut positioning",
];

const COMPLIANCE_REASONS = [
  "Creator not available",
  "Brief revised",
  "Format changed",
  "Creative shifted",
  "Planned for next activation",
] as const;

type ComplianceReason = typeof COMPLIANCE_REASONS[number];
type ComplianceStatus = "done" | "partial" | "skipped" | null;

const CREATIVE_ASSETS = [
  { format: "TikTok · Recipe process",    endurance: "4–5 wks",  health: 84, trend: "Stable",   priority: "Primary" },
  { format: "Instagram Reels · Recipe",   endurance: "3–4 wks",  health: 71, trend: "Stable",   priority: "Primary" },
  { format: "Meta Feed · Lifestyle",      endurance: "~1 wk",    health: 32, trend: "Declining", priority: "Refresh" },
  { format: "TikTok · Product close-up",  endurance: "Depleted", health: 18, trend: "Declining", priority: "Pause"   },
];

type Tone = "green" | "amber" | "red";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toneDot(t: string) {
  return t === "green" ? "#34d399" : t === "amber" ? "#f59e0b" : "#f87171";
}
function toneText(t: Tone) {
  return t === "green" ? "text-emerald-700" : t === "amber" ? "text-amber-700" : "text-red-600";
}
function toneBg(t: Tone) {
  return t === "green" ? "bg-emerald-50 border-emerald-200"
    : t === "amber"    ? "bg-amber-50 border-amber-200"
    :                    "bg-red-50 border-red-200";
}
function barColor(pct: number) {
  return pct >= 70 ? "#34d399" : pct >= 50 ? "#f59e0b" : "#f87171";
}

// ─── View Switcher ────────────────────────────────────────────────────────────

function ViewSwitcher({ current }: { current: "brand" | "agency" | "partner" }) {
  const views = [
    { label: "Brand client",  href: "/portal/demo",         key: "brand"   as const },
    { label: "Agency client", href: "/portal/demo-agency",  key: "agency"  as const },
    { label: "Partner",       href: "/portal/demo-partner", key: "partner" as const },
  ];
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      background: "#0a0a0a", borderBottom: "1px solid #262626",
      display: "flex", alignItems: "center", gap: 6, padding: "0 20px", height: 40 }}>
      <span style={{ color: "#525252", fontSize: 11, letterSpacing: "0.08em",
        textTransform: "uppercase" as const, fontFamily: "monospace", marginRight: 8 }}>
        Portal view
      </span>
      {views.map(v => (
        <a key={v.key} href={v.href} style={{
          padding: "3px 12px", borderRadius: 4, fontSize: 12, fontWeight: 500,
          textDecoration: "none",
          background: current === v.key ? "#f5f5f4" : "transparent",
          color:      current === v.key ? "#1c1917"  : "#737373",
          border:     `1px solid ${current === v.key ? "#e5e5e4" : "#404040"}`,
        }}>
          {v.label}
        </a>
      ))}
      <span style={{ color: "#404040", fontSize: 11, marginLeft: "auto" }}>
        Demo · illustrative data
      </span>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, gate, color = "#34d399", height = 56 }: {
  values: number[]; gate?: number; color?: string; height?: number;
}) {
  const w = 200; const h = height;
  const min = Math.min(...values, gate ?? Infinity) * 0.92;
  const max = Math.max(...values, gate ?? -Infinity) * 1.05;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / (max - min)) * h * 0.85 - h * 0.075;
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const gateY = gate !== undefined ? y(gate) : null;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {gateY !== null && (
        <line x1="0" y1={gateY} x2={w} y2={gateY} stroke="#f59e0b" strokeWidth="1"
          strokeDasharray="3 3" opacity="0.6" />
      )}
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3" fill={color} />
    </svg>
  );
}

// ─── Collapsible ──────────────────────────────────────────────────────────────

function Collapsible({ label, children, defaultOpen = false }: {
  label: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-neutral-200 rounded">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-neutral-50 transition-colors">
        <span className="text-xs font-semibold text-neutral-600">{label}</span>
        <span className="text-neutral-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionQ({ q, label, id, children }: {
  q: string; label: string; id?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-8">
      <div className="bg-neutral-900 px-5 py-3 flex items-baseline gap-3 rounded-t">
        <span className="text-xs font-bold text-blue-400 font-mono">{q}</span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      <div className="border border-neutral-200 border-t-0 rounded-b bg-white p-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

// ─── Layer divider ────────────────────────────────────────────────────────────

function LayerDivider({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-8 mt-2">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-neutral-300" />
        <div className="text-center">
          <p className="text-xs font-black text-neutral-900 uppercase tracking-widest">{label}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
        </div>
        <div className="flex-1 h-px bg-neutral-300" />
      </div>
    </div>
  );
}

// ─── Action card ──────────────────────────────────────────────────────────────

function AgencyActionCard({ action }: { action: typeof ACTIONS[number] }) {
  const [open, setOpen] = useState(true);
  const toneBar = action.tone === "green" ? "bg-emerald-500" : action.tone === "amber" ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="border border-neutral-200 rounded overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors">
        <div className={`w-1 h-10 rounded-full shrink-0 ${toneBar}`} />
        <div className="flex-1">
          <p className="text-xs text-neutral-400 font-medium">{action.type} · Week {action.week}</p>
          <p className="text-sm font-semibold text-neutral-900">{action.title}</p>
        </div>
        <span className="text-neutral-400 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 pt-3 space-y-3">
          <div className="bg-neutral-900 rounded px-3 py-2 text-xs text-neutral-300">
            <span className="text-neutral-500 font-mono">Signal: </span>{action.signal}
          </div>
          <p className="text-sm text-neutral-700 leading-relaxed">{action.direction}</p>
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1.5">Deliverables</p>
            <ul className="space-y-1">
              {action.deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className="text-neutral-400 shrink-0 font-mono text-xs mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className={`px-3 py-1.5 rounded text-xs font-medium border ${toneBg(action.tone)} ${toneText(action.tone)}`}>
            {action.urgency}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI widget ────────────────────────────────────────────────────────────────

function AskWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, demo: true }),
      });
      if (!res.ok || !res.body) throw new Error("No response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let ai = "";
      setMessages(m => [...m, { role: "ai", text: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        ai += decoder.decode(value, { stream: true });
        setMessages(m => {
          const next = [...m];
          next[next.length - 1] = { role: "ai", text: ai };
          return next;
        });
      }
    } catch {
      setMessages(m => [...m, { role: "ai", text: "Unable to connect. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors text-lg">
        {open ? "×" : "?"}
      </button>

      {open && (
        <div className="fixed bottom-22 right-6 z-50 w-[340px] rounded-xl border border-neutral-200 bg-white shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "60vh" }}>
          <div className="px-4 py-3 bg-neutral-900 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Ask the intelligence</p>
              <p className="text-xs text-neutral-400">Agency access · Jadikan Caramu</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <p className="text-neutral-400 text-xs leading-relaxed">
                Ask anything about this campaign — gate timing, brief rationale, competitive position, signal trends, or what to tell the client.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 ${m.role === "user" ? "bg-blue-50 text-blue-900 ml-4" : "bg-neutral-100 text-neutral-800 mr-4"}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="bg-neutral-100 rounded-lg px-3 py-2 text-neutral-500 mr-4 text-xs animate-pulse">Thinking…</div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="px-3 py-2 border-t border-neutral-100 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask anything…"
              className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button onClick={send} disabled={loading || !input.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors">
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgencyDemoPage() {
  const [selectedWeek, setSelectedWeek] = useState(6);

  // Compliance state
  const [complianceStatus, setComplianceStatus]   = useState<ComplianceStatus[]>(COMPLIANCE_ITEMS.map(() => null));
  const [complianceReasons, setComplianceReasons] = useState<(ComplianceReason | null)[]>(COMPLIANCE_ITEMS.map(() => null));
  const [complianceSubmitted, setComplianceSubmitted] = useState(false);

  const allAnswered   = complianceStatus.every(s => s !== null);
  const needsReason   = (i: number) => complianceStatus[i] === "partial" || complianceStatus[i] === "skipped";
  const readyToSubmit = allAnswered && complianceStatus.every((s, i) => s === "done" || complianceReasons[i] !== null);

  const complianceScore  = complianceSubmitted
    ? Math.round(complianceStatus.reduce((sum, s) => sum + (s === "done" ? 100 : s === "partial" ? 50 : 0), 0) / complianceStatus.length)
    : 0;
  const complianceRating = complianceScore >= 80 ? "High" : complianceScore >= 50 ? "Medium" : "Low";
  const complianceRatingColor = complianceRating === "High"   ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : complianceRating === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";

  // Agency narrative
  const [agencyNote, setAgencyNote] = useState("");
  const [noteSubmitted, setNoteSubmitted] = useState(false);
  const [releaseSimulated, setReleaseSimulated] = useState(false);

  const circumference = 138.23;
  const arcLen = (74 / 100) * circumference;

  const currentWeek = WEEKS.find(w => w.n === selectedWeek) ?? WEEKS[0];

  return (
    <>
      <ViewSwitcher current="agency" />
      <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex" style={{ paddingTop: 40 }}>

        {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
        <aside className="hidden lg:flex flex-col w-[380px] xl:w-[440px] shrink-0 fixed left-0 bg-neutral-900 text-white overflow-y-auto z-20"
          style={{ top: 40, height: "calc(100vh - 40px)" }}>

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
          <div className="px-5 py-5 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">Campaign health · Week 6</p>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 shrink-0">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="44" fill="none" stroke="#262626" strokeWidth="6" />
                  <circle cx="48" cy="48" r="44" fill="none" stroke="#34d399" strokeWidth="6"
                    strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round"
                    transform="rotate(-90 48 48)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white">74</span>
                  <span className="text-[10px] text-neutral-400 font-medium">/ 100</span>
                </div>
              </div>
              <div>
                <p className="text-emerald-400 font-bold text-sm">Gaining</p>
                <p className="text-xs text-neutral-400 mt-1 leading-snug">↑ +5 pts this week<br />5 consecutive weeks positive</p>
                <p className="text-xs text-neutral-500 mt-2">Gate: 1.9pp from save rate threshold</p>
              </div>
            </div>
          </div>

          {/* Signal readings */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">Signal readings · Week 6</p>
            <div className="space-y-3">
              {[
                { label: "Save rate",      val: "6.1%",  delta: "+0.4%",  gate: "8.0%",  tone: "amber", series: SERIES.save   },
                { label: "Brand search",   val: "14.2%", delta: "+1.8%",  gate: "18.0%", tone: "amber", series: SERIES.search },
                { label: "UGC auth ratio", val: "72%",   delta: "+8%",    gate: "65%",   tone: "green", series: SERIES.ugc    },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-neutral-400">{s.label}</span>
                    <span className={`text-xs font-bold ${s.tone === "green" ? "text-emerald-400" : "text-amber-400"}`}>
                      {s.val} <span className="text-neutral-500 font-normal">/ {s.gate}</span>
                    </span>
                  </div>
                  <div className="h-8">
                    <Sparkline values={s.series.values} gate={"gate" in s.series ? s.series.gate : undefined}
                      color={s.series.color} height={32} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Week navigator */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Week navigator</p>
            <div className="flex gap-1.5 flex-wrap">
              {WEEKS.map(w => (
                <button key={w.n} onClick={() => setSelectedWeek(w.n)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${
                    selectedWeek === w.n
                      ? "bg-white text-neutral-900 border-white"
                      : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500"
                  }`}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-px"
                    style={{ background: toneDot(w.dot), display: "inline-block" }} />
                  Wk {w.n}
                </button>
              ))}
            </div>
          </div>

          {/* Two-stage release status */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Release status</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-neutral-300">Agency preview</span>
                <span className="text-neutral-500 ml-auto">17 Aug · 09:00</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-neutral-600 shrink-0" />
                <span className="text-neutral-500">Client release</span>
                <span className="text-neutral-600 ml-auto">Pending</span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              Add your narrative in Q09 before releasing.
            </p>
          </div>

          {/* Navigation */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">This report</p>
            <nav className="space-y-0.5">
              {[
                { href: "#q1", label: "Q01  Signal health + gate",        layer: "intelligence" },
                { href: "#q2", label: "Q02  Strategic direction",          layer: "intelligence" },
                { href: "#q3", label: "Q03  Prediction horizon",           layer: "intelligence" },
                { href: "#q4", label: "Q04  Briefs to issue",              layer: "execution"    },
                { href: "#q5", label: "Q05  Brief compliance",             layer: "execution"    },
                { href: "#q6", label: "Q06  Creative battery",             layer: "execution"    },
                { href: "#q7", label: "Q07  KOL performance",              layer: "execution"    },
                { href: "#q8", label: "Q08  Competitive ICS",              layer: "execution"    },
                { href: "#q9", label: "Q09  Client readout + narrative",   layer: "consulting"   },
              ].map(n => (
                <a key={n.href} href={n.href}
                  className={`block text-xs py-0.5 transition-colors font-mono ${
                    n.layer === "intelligence" ? "text-blue-400 hover:text-blue-300"
                    : n.layer === "execution"  ? "text-neutral-400 hover:text-white"
                    :                            "text-amber-400 hover:text-amber-300"
                  }`}>
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ═══════════════════════ MAIN ═══════════════════════ */}
        <main className="lg:ml-[380px] xl:ml-[440px] flex-1 px-5 sm:px-8 lg:px-10 xl:px-14 pt-8 pb-20 max-w-4xl">

          {/* Page header */}
          <div className="mb-8 pb-6 border-b border-neutral-200">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">
              ShiftImpact OS · 17 Aug 2026 · Week 6 of 12
            </p>
            <h1 className="text-2xl font-black text-neutral-900">Agency Intelligence Report</h1>
            <p className="text-base text-neutral-500 mt-1">Jadikan Caramu · Cooks · Phase 1 — Demand</p>
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
              <strong>Agency view:</strong> You see the full client intelligence (Q01–Q03) plus your execution layer (Q04–Q08). Add your consulting narrative in Q09 before releasing to the client.
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━ INTELLIGENCE LAYER ━━━━━━━━━━━━━━━ */}

          {/* ── Q01: Signal health + gate ── */}
          <SectionQ q="Q01" label="Signal health + gate status" id="q1">

            {/* Health row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Health score", val: "74", sub: "↑ +5 pts · Gaining", tone: "green" as Tone },
                { label: "Gate distance", val: "1.9pp", sub: "Save rate below threshold", tone: "amber" as Tone },
                { label: "Weeks to gate", val: "Wk 7–8", sub: "78% confidence if brief actioned", tone: "amber" as Tone },
              ].map(s => (
                <div key={s.label} className={`border rounded p-3 ${toneBg(s.tone)}`}>
                  <p className="text-xs text-neutral-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-black ${toneText(s.tone)}`}>{s.val}</p>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-snug">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Signal vs gate table */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Signal vs gate · Week {selectedWeek}</p>
              <div className="space-y-3">
                {[
                  { label: "Save rate",       val: 6.1,  gate: 8,  unit: "%",  status: "−1.9pp to gate", trend: "5 consecutive weeks positive",       tone: "amber" as Tone, primary: true  },
                  { label: "Brand search share", val: 14.2, gate: 18, unit: "%",  status: "−3.8pp to gate", trend: "Growing 2.1× faster than category",   tone: "amber" as Tone, primary: false },
                  { label: "UGC authenticity", val: 72,  gate: 65, unit: "%",   status: "7pp above ✓",    trend: "Above threshold, holding",           tone: "green" as Tone, primary: false },
                ].map(s => (
                  <div key={s.label} className={`border rounded p-3 ${s.primary ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">{s.label}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{s.trend}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-black ${toneText(s.tone)}`}>{s.val}{s.unit}</p>
                        <p className="text-xs text-neutral-400">gate {s.gate}{s.unit}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min((s.val / (s.gate * 1.15)) * 100, 100)}%`, background: toneDot(s.tone) }} />
                    </div>
                    <p className={`text-xs font-medium mt-1 ${toneText(s.tone)}`}>{s.status}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Health trajectory chart */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Health trajectory · Wk 1 → 6</p>
              <div className="h-16 bg-neutral-900 rounded px-3 py-2">
                <Sparkline values={SERIES.health.values} color="#34d399" height={48} />
              </div>
              <div className="flex justify-between mt-1 text-xs text-neutral-400">
                {WEEKS.map(w => <span key={w.n}>Wk {w.n}</span>)}
              </div>
            </div>

            {/* What is working / not */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-emerald-200 bg-emerald-50 rounded p-3">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">What is working</p>
                <ul className="space-y-1 text-xs text-emerald-800">
                  {["Micro-KOL save rate avg: 7.4% — above gate", "Brand search growing 2.1× faster than category", "UGC authenticity 72% — above 65% threshold", "Save rate: 5 consecutive weeks positive"].map(s => (
                    <li key={s} className="flex items-start gap-1.5"><span className="text-emerald-500 shrink-0">↑</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-red-200 bg-red-50 rounded p-3">
                <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2">Not yet working</p>
                <ul className="space-y-1 text-xs text-red-800">
                  {["Gate 1 not fired — 1.9pp from save rate gate", "Creative mix: 60% lifestyle suppressing save rate", "Mid-tier KOL avg 5.4% — below gate · 62% of budget", "Meta save rate/impression: −3% WoW"].map(s => (
                    <li key={s} className="flex items-start gap-1.5"><span className="text-red-400 shrink-0">↓</span>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionQ>

          {/* ── Q02: Strategic direction ── */}
          <SectionQ q="Q02" label="Strategic direction this week" id="q2">
            <div className="bg-neutral-900 rounded p-4 text-white mb-2">
              <p className="text-xs text-neutral-400 mb-1 font-mono">Strategist verdict · Week 6</p>
              <p className="text-sm text-neutral-200 leading-relaxed">
                The campaign is building correctly at the midpoint. Brand demand is accelerating ahead of Merdeka. The only open item is pushing save rate over the gate threshold in the next 2 weeks — and this week's creative brief is the lever. Gate probability rises from 56% to 78% if the recipe brief is actioned this week.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  n: "01", signal: "Recipe content saves at 2.3× the rate of lifestyle content",
                  brief: "Shift to 70% recipe-led creative mix. Merdeka window: 2 weeks remaining.",
                  link: "Creative brief — Week 7", tone: "green" as Tone,
                },
                {
                  n: "02", signal: "Brand search interest growing 2.1× faster than the cooking category",
                  brief: "Do not reduce search spend. Earned demand converts 40–60% better than paid reach.",
                  link: "Media brief — Week 7", tone: "amber" as Tone,
                },
                {
                  n: "03", signal: "Micro-KOLs delivering 1.6× better save rates than mid-tier activations",
                  brief: "Phase 2 planning: shift budget concentration to micro-tier. Mid-tier spend is not moving the gate signal.",
                  link: "KOL brief — Phase 2 planning", tone: "amber" as Tone,
                },
              ].map(r => (
                <div key={r.n} className={`border rounded p-4 ${toneBg(r.tone)}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-black text-neutral-300 font-mono shrink-0 leading-none">{r.n}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-800 leading-snug">{r.signal}</p>
                      <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{r.brief}</p>
                      <p className={`text-xs font-medium mt-2 ${toneText(r.tone)}`}>See brief → {r.link}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Critical watch · Meta Feed</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Meta Feed save rate per impression is declining 3% WoW even as total impressions grow. Reach is increasing but content resonance is decreasing — early creative fatigue signal. Unaddressed, this will pull overall save rate down before the gate is reached. The creative brief issued this week directly targets this.
              </p>
            </div>
          </SectionQ>

          {/* ── Q03: Prediction horizon ── */}
          <SectionQ q="Q03" label="Prediction horizon + gate timing" id="q3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Gate 1 · Wk 7",   pct: 56, condition: "Brief actioned this week",     confidence: 78, tone: "amber" as Tone },
                { label: "Gate 1 · Wk 8",   pct: 78, condition: "Brief + KOL brief actioned",   confidence: 72, tone: "green" as Tone },
                { label: "Gate 1 · Wk 9+",  pct: 22, condition: "Brief not actioned this week", confidence: 65, tone: "red"   as Tone },
              ].slice(0, 3).map(p => (
                <div key={p.label} className={`border rounded p-3 ${toneBg(p.tone)}`}>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">{p.label}</p>
                  <p className={`text-2xl font-black ${toneText(p.tone)}`}>{p.pct}%</p>
                  <div className="h-1.5 bg-white/60 rounded-full mt-1.5 mb-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: toneDot(p.tone) }} />
                  </div>
                  <p className="text-xs text-neutral-500 leading-snug">{p.condition}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{p.confidence}% confidence</p>
                </div>
              ))}
              <div className="border border-neutral-200 bg-neutral-50 rounded p-3">
                <p className="text-xs font-semibold text-neutral-500 mb-1">Save rate · Wk 7 forecast</p>
                <p className="text-2xl font-black text-neutral-700">7.0–7.6%</p>
                <p className="text-xs text-neutral-500 mt-1 leading-snug">If recipe brief actioned</p>
                <p className="text-xs text-neutral-400 mt-0.5">81% confidence</p>
              </div>
            </div>

            <div className="border border-neutral-200 rounded p-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Gate unlock horizon</p>
              <div className="relative">
                {[
                  { label: "This week",  action: "Action creative brief — shift to 70% recipe-led", dot: "amber" },
                  { label: "Weeks 7–8", action: "Gate 1 fires if save rate holds ≥8% for 3 consecutive days", dot: "amber" },
                  { label: "Week 9+",   action: "Phase 2 budget releases — TikTok Shop mechanics activate", dot: "green" },
                ].map((s, i) => (
                  <div key={i} className="flex gap-3 mb-3 last:mb-0">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ background: toneDot(s.dot) }} />
                      {i < 2 && <div className="w-px flex-1 bg-neutral-200 mt-1" />}
                    </div>
                    <div className="pb-3 last:pb-0">
                      <p className="text-xs font-mono font-bold text-neutral-500">{s.label}</p>
                      <p className="text-sm text-neutral-700 mt-0.5 leading-snug">{s.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Collapsible label="Full prediction accuracy record (Weeks 1–5)">
              <div className="space-y-2 pt-1">
                {[
                  { wk: "Wk 5→6", pred: "Campaign health will reach 72–76 if KOL rebalancing actioned", actual: "74 — centre of range", verified: true },
                  { wk: "Wk 4→5", pred: "Recipe content will outperform lifestyle at 2×+ save rate ratio", actual: "2.3× — confirmed", verified: true },
                  { wk: "Wk 3→4", pred: "Mid-tier KOLs will underperform micro-tier (below 6%)", actual: "5.2–5.6% — confirmed", verified: true },
                  { wk: "Wk 2→3", pred: "UGC authenticity ratio will lift +3–5pp if seeding actioned", actual: "+3pp — bottom of range", verified: true },
                  { wk: "Wk 1→2", pred: "Save rate will reach 4.6–4.9% as UGC seeding kicks in", actual: "4.8% — within range", verified: true },
                ].map(p => (
                  <div key={p.wk} className="flex gap-3 text-xs border border-neutral-200 rounded p-2.5">
                    <span className="font-mono text-neutral-400 shrink-0 w-12">{p.wk}</span>
                    <div className="flex-1">
                      <p className="text-neutral-600">{p.pred}</p>
                      <p className="text-emerald-600 font-medium mt-0.5">✓ {p.actual}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
          </SectionQ>

          {/* ━━━━━━━━━━━━━━━ EXECUTION LAYER ━━━━━━━━━━━━━━━ */}
          <LayerDivider
            label="Execution layer"
            description="Briefs, compliance, and creative management — for your team"
          />

          {/* ── Q04: Briefs to issue ── */}
          <SectionQ q="Q04" label="Briefs to issue to your team" id="q4">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Three briefs this week. All grounded in the signal intelligence above — the brief direction is the implementation of what Q01–Q03 is telling us.
            </p>
            <div className="space-y-3">
              {ACTIONS.map((a, i) => <AgencyActionCard key={i} action={a} />)}
            </div>
          </SectionQ>

          {/* ── Q05: Brief compliance ── */}
          <SectionQ q="Q05" label="Brief compliance — Week 5 brief executed in Week 6" id="q5">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Mark delivery status for each action in the Week 5 brief. This feeds the compliance record visible in the client report.
            </p>

            {!complianceSubmitted ? (
              <div className="space-y-3">
                {COMPLIANCE_ITEMS.map((item, i) => (
                  <div key={i} className={`border rounded p-3 transition-all ${
                    complianceStatus[i] === "done" ? "border-emerald-200 bg-emerald-50"
                    : complianceStatus[i] === "partial" ? "border-amber-200 bg-amber-50"
                    : complianceStatus[i] === "skipped" ? "border-red-200 bg-red-50"
                    : "border-neutral-200 bg-white"}`}>
                    <p className="text-sm text-neutral-800 mb-2 leading-snug">{item}</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["done", "partial", "skipped"] as ComplianceStatus[]).map(s => (
                        <button key={s as string} onClick={() => {
                          const next = [...complianceStatus]; next[i] = s; setComplianceStatus(next);
                          if (s === "done") { const nextR = [...complianceReasons]; nextR[i] = null; setComplianceReasons(nextR); }
                        }} className={`px-3 py-1 text-xs rounded border font-medium transition-all ${
                          complianceStatus[i] === s
                            ? s === "done" ? "bg-emerald-600 border-emerald-600 text-white"
                            : s === "partial" ? "bg-amber-500 border-amber-500 text-white"
                            : "bg-red-500 border-red-500 text-white"
                            : "bg-white border-neutral-300 text-neutral-500 hover:border-neutral-400"
                        }`}>
                          {s === "done" ? "Done in full" : s === "partial" ? "Done partially" : "Not done"}
                        </button>
                      ))}
                    </div>
                    {needsReason(i) && (
                      <div className="mt-2">
                        <p className="text-xs text-neutral-500 mb-1">Reason:</p>
                        <div className="flex gap-2 flex-wrap">
                          {COMPLIANCE_REASONS.map(r => (
                            <button key={r} onClick={() => {
                              const nextR = [...complianceReasons]; nextR[i] = r; setComplianceReasons(nextR);
                            }} className={`px-2.5 py-1 text-xs rounded border transition-all ${
                              complianceReasons[i] === r ? "bg-neutral-900 border-neutral-900 text-white" : "bg-white border-neutral-200 text-neutral-600"
                            }`}>{r}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button disabled={!readyToSubmit} onClick={() => setComplianceSubmitted(true)}
                  className="w-full py-3 bg-neutral-900 text-white text-sm font-semibold rounded hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Submit compliance report
                </button>
              </div>
            ) : (
              <div className={`border rounded p-4 ${complianceRatingColor}`}>
                <p className="font-bold text-sm">Compliance submitted · {complianceRating} ({complianceScore}%)</p>
                <p className="text-xs mt-1 opacity-80">Recorded. This will appear in the client report under Brief Compliance.</p>
              </div>
            )}
          </SectionQ>

          {/* ── Q06: Creative battery ── */}
          <SectionQ q="Q06" label="Creative battery — endurance by format" id="q6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              How long each format can sustain its engagement trajectory before audiences stop responding. This is not about the campaign idea — it is about whether the way you are executing it is still working.
            </p>
            <div className="space-y-2">
              {CREATIVE_ASSETS.map((a, i) => {
                const pct = Math.max(0, Math.min(100, a.health));
                return (
                  <div key={i} className="border border-neutral-200 rounded p-3 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-neutral-800">{a.format}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium border ${
                            a.priority === "Primary" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : a.priority === "Refresh" ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-red-50 border-red-200 text-red-600"}`}>
                            {a.priority}
                          </span>
                          <span className="text-xs text-neutral-400">{a.endurance}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor(pct) }} />
                      </div>
                      <p className={`text-xs mt-1 font-medium ${a.trend === "Declining" ? "text-red-500" : "text-emerald-600"}`}>
                        {a.trend}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">
              <strong>Priority action:</strong> Meta feed lifestyle format is at 32% health and declining 3% WoW. A creative refresh brief has been issued (Q04 Creative brief). Recipe-led formats remain healthy — prioritise these in the mix shift.
            </div>
          </SectionQ>

          {/* ── Q07: KOL performance ── */}
          <SectionQ q="Q07" label="KOL performance — save rate by creator" id="q7">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-neutral-900 text-white">
                    {["Creator", "Tier", "Save rate", "Views", "vs gate", "Status"].map((h, i) => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-left ${i === 0 ? "rounded-tl" : ""} ${i === 5 ? "rounded-tr" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KOLS.map((k, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                      <td className="px-3 py-2.5 border-b border-neutral-100 text-xs font-mono text-neutral-700">{k.handle}</td>
                      <td className="px-3 py-2.5 border-b border-neutral-100">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${k.tier === "Micro" ? "bg-blue-50 text-blue-700" : "bg-neutral-100 text-neutral-600"}`}>{k.tier}</span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-neutral-100 font-bold" style={{ color: toneDot(k.tone) }}>{k.saveRate}%</td>
                      <td className="px-3 py-2.5 border-b border-neutral-100 text-xs text-neutral-500">{k.views}</td>
                      <td className="px-3 py-2.5 border-b border-neutral-100">
                        <span className={`text-xs font-medium ${toneText(k.tone)}`}>
                          {k.saveRate >= 8 ? `+${(k.saveRate - 8).toFixed(1)}pp ✓` : `−${(8 - k.saveRate).toFixed(1)}pp`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-neutral-100">
                        <span className={`text-xs font-medium flex items-center gap-1.5 ${toneText(k.tone)}`}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: toneDot(k.tone) }} />
                          {k.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
              <strong>Phase 2 recommendation:</strong> Shift mid-tier budget (RM 12,000) to micro-tier. Mid-tier is generating reach but not saves — spending budget that is not moving the gate signal. Micro-KOLs are delivering 7–8% save rates with 38% of total KOL budget. Formal brief issues on gate confirmation.
            </div>
          </SectionQ>

          {/* ── Q08: Competitive ICS ── */}
          <SectionQ q="Q08" label="Competitive ICS benchmark" id="q8">
            <p className="text-sm text-neutral-600 leading-relaxed">
              ICS (Idea Certainty Score) benchmarks the campaign idea quality relative to category. Cooks at 76 is CONDITIONAL — the idea is strong but gate conditions haven't fired. MAGGI at 81 is the primary competitive reference.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-neutral-900 text-white">
                    {["Brand", "ICS", "Rating", "Gap"].map((h, i) => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-left ${i === 0 ? "rounded-tl" : i === 3 ? "rounded-tr" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPETITORS.map((c, i) => (
                    <tr key={i} className={c.brand === "Cooks" ? "bg-blue-50" : i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                      <td className="px-3 py-2.5 border-b border-neutral-100 font-semibold text-sm">
                        {c.brand}{c.brand === "Cooks" && <span className="ml-1.5 text-xs text-blue-600">(your client)</span>}
                      </td>
                      <td className="px-3 py-2.5 border-b border-neutral-100 font-black text-base">{c.ics}</td>
                      <td className="px-3 py-2.5 border-b border-neutral-100">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                          c.rating === "CONDITIONAL" ? "bg-amber-50 border-amber-200 text-amber-700"
                          : c.rating === "NOT READY" ? "bg-red-50 border-red-200 text-red-600"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                          {c.rating}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-neutral-100 text-xs text-neutral-500">{c.gap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionQ>

          {/* ━━━━━━━━━━━━━━━ CONSULTING OVERLAY ━━━━━━━━━━━━━━━ */}
          <LayerDivider
            label="Consulting overlay"
            description="Your narrative layer — add this before releasing to the client"
          />

          {/* ── Q09: Client readout + agency narrative ── */}
          <SectionQ q="Q09" label="Client readout + agency narrative" id="q9">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
              <strong>Before you release:</strong> Add your narrative below. This appears as a highlighted callout at the top of the client's report — your interpretation of what the data means, in your voice. The client then sees everything in Q01–Q03 below it.
            </div>

            {/* Agency note field */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Your narrative to the client</p>
              {!noteSubmitted ? (
                <>
                  <textarea
                    value={agencyNote}
                    onChange={e => setAgencyNote(e.target.value)}
                    placeholder="Week 6 is the inflection point. The save rate signal has been compounding for five weeks and the data is now telling us clearly which lever moves it. We're recommending the recipe-led brief this week not as a creative preference, but as a signal-backed direction with a 78% probability of firing the Phase 2 gate by Week 8..."
                    rows={5}
                    className="w-full border border-neutral-200 rounded p-3 text-sm text-neutral-800 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 leading-relaxed"
                  />
                  <button
                    disabled={!agencyNote.trim()}
                    onClick={() => setNoteSubmitted(true)}
                    className="mt-2 px-4 py-2 bg-neutral-900 text-white text-sm font-semibold rounded hover:bg-neutral-800 transition-colors disabled:opacity-30">
                    Save narrative
                  </button>
                </>
              ) : (
                <div className="border border-blue-200 bg-blue-50 rounded p-4">
                  <p className="text-xs font-mono text-blue-400 mb-1.5">Agency narrative · saved</p>
                  <p className="text-sm text-blue-900 leading-relaxed">{agencyNote}</p>
                  <button onClick={() => setNoteSubmitted(false)} className="text-xs text-blue-500 mt-2 hover:underline">Edit</button>
                </div>
              )}
            </div>

            {/* Client readout preview */}
            <Collapsible label="Preview — what the client will see (Q01 summary)" defaultOpen={false}>
              <div className="space-y-3 pt-1">
                <div className="bg-neutral-900 rounded p-3 text-white text-xs font-mono text-neutral-400">
                  CLIENT VIEW · Q01 — Signal health + gate status
                </div>
                <div className="border border-neutral-200 rounded p-3 bg-neutral-50">
                  <p className="text-xs font-semibold text-neutral-500 mb-1">Health score</p>
                  <p className="text-2xl font-black text-neutral-900">74 <span className="text-emerald-500 text-sm font-semibold">↑ Gaining</span></p>
                  <p className="text-xs text-neutral-500 mt-0.5">Phase 2 gate: 1.9pp from save rate threshold · Wk 7–8 if brief actioned</p>
                </div>
                <p className="text-xs text-neutral-400 italic">
                  The client sees the same signal data and verdict you see in Q01–Q03. Your narrative in the field above appears as a highlighted callout before Q01.
                </p>
              </div>
            </Collapsible>

            {/* Release action */}
            <div className="border-2 border-dashed border-neutral-300 rounded p-4">
              <p className="text-sm font-semibold text-neutral-700 mb-1">Release report to client</p>
              <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                Once released, the client can access the full portal. Your narrative appears first. The two-stage release timestamp is logged.
              </p>
              {!releaseSimulated ? (
                <button
                  onClick={() => setReleaseSimulated(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors">
                  Release to client
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                  <p className="text-sm font-semibold text-emerald-800">Released · 17 Aug 2026 · 11:42 MYT</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Client portal is now live. Notification sent.</p>
                </div>
              )}
            </div>
          </SectionQ>

          <div className="pt-6 border-t border-neutral-200 text-xs text-neutral-400">
            ShiftImpact OS · Agency intelligence view · Illustrative data · Cooks · Jadikan Caramu · Week 6 of 12
          </div>
        </main>

        <AskWidget />
      </div>
    </>
  );
}
