"use client";

// /portal/demo-agency — Agency execution portal
//
// What this is:
//   The implementation layer for the agency. Intelligence lives in the client
//   report — agencies get a direct link to it. This page is execution-only.
//
// Compliance architecture:
//   Each agency is assigned disciplines (creative, media, KOL, PR, etc.).
//   Compliance items are tagged by discipline.
//   Non-lead agencies see ONLY their assigned disciplines.
//   Lead/paying agency sees ALL disciplines with a "Handled by" label per item.
//   This demo shows the lead agency view.
//
// Real OS wiring (future sprint):
//   - report_recipients.discipline[] — which disciplines this recipient owns
//   - report_recipients.is_lead_agency — full visibility flag
//   - compliance_items.discipline — which agency is responsible
//   - Portal filters compliance_items by recipient.discipline[] at query time
//   - Lead agency: no filter, renders all with "Handled by" column

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red";
type Discipline = "creative" | "media" | "kol" | "pr";

// ─── Data: Briefs ─────────────────────────────────────────────────────────────

const ACTIONS = [
  {
    week: 7,
    type: "Creative brief",
    discipline: "creative" as Discipline,
    title: "Shift to recipe-led creative mix",
    signal: "Save rate 6.1% vs gate 8.0% — recipe content saving at 2.3×",
    direction:
      "Shift to 70% recipe-led content. Merdeka window closes 31 Aug — patriotic heritage frame is getting elevated distribution. Anchor dish names to 'Masakan Malaysia Asli'. Do NOT use shortcut or easy framing — depresses save rate.",
    deliverables: [
      "2 × TikTok process videos — Ayam Percik or Rendang Tok",
      "1 × Instagram Reel — 'your version of the dish' framing",
      "Caption copy — Malay primary, English subtitle",
    ],
    urgency: "This week — gate window closes in 2 weeks",
    tone: "green" as Tone,
  },
  {
    week: 7,
    type: "Media brief",
    discipline: "media" as Discipline,
    title: "Hold brand search spend — do not pull",
    signal: "Search share growing 2.1× faster than category",
    direction:
      "Branded search is earned demand — do not reduce spend here. Consumers are actively looking for Cooks, not just browsing. Pulling search at this stage would be the costliest error. Maintain current allocation through gate.",
    deliverables: [
      "Confirm media plan: no search budget reduction",
      "Flag to client if platform is recommending rebalance — override it",
    ],
    urgency: "Confirm before next media cycle",
    tone: "amber" as Tone,
  },
  {
    week: 7,
    type: "KOL brief",
    discipline: "kol" as Discipline,
    title: "Phase 2 KOL planning — recruit micro tier",
    signal: "Micro-KOLs: 7–8% save rate · Mid-tier: 5.2–5.6% save rate",
    direction:
      "Mid-tier KOLs are generating reach but not saves. 38% of KOL budget is producing 68% of save outcomes via micro-tier. For Phase 2, shift budget concentration to micro-tier performers and recruit 2 new Klang Valley food creators matching @masakdenganaishah profile.",
    deliverables: [
      "Identify 2 Klang Valley micro-food creators (10K–80K, recipe-led)",
      "Draft Phase 2 KOL brief for gate confirmation",
      "Issue rebalance memo to client for Phase 2 approval",
    ],
    urgency: "Plan now — brief issues on gate confirmation",
    tone: "amber" as Tone,
  },
];

// ─── Data: Compliance ─────────────────────────────────────────────────────────
//
// In the real OS: compliance_items rows with discipline + handled_by_agency fields.
// Lead agency sees all rows. Non-lead sees only rows where discipline ∈ their assigned set.

const COMPLIANCE_ITEMS = [
  {
    id: "c1",
    discipline: "creative" as Discipline,
    handledBy: "This agency",
    isOwned: true,
    item: "Recruit 2 Klang Valley food creators (recipe-led, 10K–80K followers)",
  },
  {
    id: "c2",
    discipline: "creative" as Discipline,
    handledBy: "This agency",
    isOwned: true,
    item: "Activate Rendang Tok or Ayam Percik dish using Cooks paste",
  },
  {
    id: "c3",
    discipline: "creative" as Discipline,
    handledBy: "This agency",
    isOwned: true,
    item: "Deliver 2 × TikTok process videos + 1 × Instagram Reel per creator",
  },
  {
    id: "c4",
    discipline: "creative" as Discipline,
    handledBy: "This agency",
    isOwned: true,
    item: "Content uses 'your version of the dish' framing — not brand shortcut positioning",
  },
  {
    id: "c5",
    discipline: "media" as Discipline,
    handledBy: "This agency",
    isOwned: true,
    item: "Confirm no search budget reduction in next media cycle",
  },
  {
    id: "c6",
    discipline: "kol" as Discipline,
    handledBy: "KOL Agency",
    isOwned: false,
    item: "Identify 2 micro-food creators — Klang Valley, 10K–80K followers",
  },
  {
    id: "c7",
    discipline: "kol" as Discipline,
    handledBy: "KOL Agency",
    isOwned: false,
    item: "Issue Phase 2 KOL rebalance brief on gate confirmation",
  },
];

const DISCIPLINE_LABELS: Record<Discipline, string> = {
  creative: "Creative",
  media: "Media",
  kol: "KOL",
  pr: "PR",
};

const DISCIPLINE_COLORS: Record<Discipline, string> = {
  creative: "bg-blue-50 border-blue-200 text-blue-700",
  media: "bg-purple-50 border-purple-200 text-purple-700",
  kol: "bg-emerald-50 border-emerald-200 text-emerald-700",
  pr: "bg-amber-50 border-amber-200 text-amber-700",
};

// ─── Data: KOLs ───────────────────────────────────────────────────────────────

const KOLS = [
  { handle: "@masakdenganaishah",    tier: "Micro", saveRate: 8.4, views: "48K", tone: "green" as Tone, status: "Above gate" },
  { handle: "@eatwithzafran",        tier: "Micro", saveRate: 7.1, views: "34K", tone: "amber" as Tone, status: "Building"   },
  { handle: "@dapurrumahkuofficial", tier: "Micro", saveRate: 6.8, views: "22K", tone: "amber" as Tone, status: "Building"   },
  { handle: "@chefhanamariana",      tier: "Mid",   saveRate: 5.2, views: "61K", tone: "red"   as Tone, status: "Below gate" },
  { handle: "@rawlinsganics",        tier: "Mid",   saveRate: 5.6, views: "44K", tone: "red"   as Tone, status: "Below gate" },
];

// ─── Data: Creative battery ───────────────────────────────────────────────────

const CREATIVE_ASSETS = [
  { format: "TikTok · Recipe process",   endurance: "4–5 wks",  health: 84, trend: "Stable",   priority: "Primary" },
  { format: "Instagram Reels · Recipe",  endurance: "3–4 wks",  health: 71, trend: "Stable",   priority: "Primary" },
  { format: "Meta Feed · Lifestyle",     endurance: "~1 wk",    health: 32, trend: "Declining", priority: "Refresh" },
  { format: "TikTok · Product close-up", endurance: "Depleted", health: 18, trend: "Declining", priority: "Pause"   },
];

// ─── Data: Competitive ────────────────────────────────────────────────────────

const COMPETITORS = [
  { brand: "MAGGI",  ics: 81, rating: "CONDITIONAL", gap: "Strong reach, retention signals weak" },
  { brand: "Knorr",  ics: 68, rating: "NOT READY",   gap: "UGC authenticity below threshold"     },
  { brand: "Cooks",  ics: 76, rating: "CONDITIONAL", gap: "Save rate 1.9pp below gate — on track" },
  { brand: "Adabi",  ics: 59, rating: "NOT READY",   gap: "Search share declining, no recovery signal" },
];

// ─── Compliance types ─────────────────────────────────────────────────────────

const COMPLIANCE_REASONS = [
  "Creator not available",
  "Brief revised",
  "Format changed",
  "Creative shifted",
  "Planned for next activation",
] as const;

type ComplianceReason = typeof COMPLIANCE_REASONS[number];
type ComplianceStatus = "done" | "partial" | "skipped" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toneDot(t: Tone | string) {
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

// ─── Action card ──────────────────────────────────────────────────────────────

function AgencyActionCard({ action }: { action: typeof ACTIONS[number] }) {
  const [open, setOpen] = useState(true);
  const toneBar = action.tone === "green" ? "bg-emerald-500"
    : action.tone === "amber" ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="border border-neutral-200 rounded overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors">
        <div className={`w-1 h-10 rounded-full shrink-0 ${toneBar}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${DISCIPLINE_COLORS[action.discipline]}`}>
              {DISCIPLINE_LABELS[action.discipline]}
            </span>
            <span className="text-xs text-neutral-400">Week {action.week}</span>
          </div>
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

// ─── Compliance row ───────────────────────────────────────────────────────────

function ComplianceRow({ item, status, reason, onStatus, onReason }: {
  item: typeof COMPLIANCE_ITEMS[number];
  status: ComplianceStatus;
  reason: ComplianceReason | null;
  onStatus: (s: ComplianceStatus) => void;
  onReason: (r: ComplianceReason) => void;
}) {
  const needsReason = status === "partial" || status === "skipped";
  const bgClass = status === "done" ? "border-emerald-200 bg-emerald-50"
    : status === "partial" ? "border-amber-200 bg-amber-50"
    : status === "skipped" ? "border-red-200 bg-red-50"
    : "border-neutral-200 bg-white";

  return (
    <div className={`border rounded p-3 transition-all ${item.isOwned ? bgClass : "border-neutral-100 bg-neutral-50"}`}>
      <div className="flex items-start gap-2 mb-2">
        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 mt-0.5 ${DISCIPLINE_COLORS[item.discipline]}`}>
          {DISCIPLINE_LABELS[item.discipline]}
        </span>
        {!item.isOwned && (
          <span className="text-xs px-2 py-0.5 rounded border border-neutral-200 bg-white text-neutral-400 font-medium shrink-0 mt-0.5">
            {item.handledBy}
          </span>
        )}
        <p className={`text-sm leading-snug ${item.isOwned ? "text-neutral-800" : "text-neutral-400"}`}>
          {item.item}
        </p>
      </div>

      {item.isOwned ? (
        <>
          <div className="flex gap-2 flex-wrap">
            {(["done", "partial", "skipped"] as ComplianceStatus[]).map(s => (
              <button key={s as string} onClick={() => onStatus(s)}
                className={`px-3 py-1 text-xs rounded border font-medium transition-all ${
                  status === s
                    ? s === "done" ? "bg-emerald-600 border-emerald-600 text-white"
                      : s === "partial" ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-red-500 border-red-500 text-white"
                    : "bg-white border-neutral-300 text-neutral-500 hover:border-neutral-400"
                }`}>
                {s === "done" ? "Done in full" : s === "partial" ? "Done partially" : "Not done"}
              </button>
            ))}
          </div>
          {needsReason && (
            <div className="mt-2">
              <p className="text-xs text-neutral-500 mb-1">Reason:</p>
              <div className="flex gap-2 flex-wrap">
                {COMPLIANCE_REASONS.map(r => (
                  <button key={r} onClick={() => onReason(r)}
                    className={`px-2.5 py-1 text-xs rounded border transition-all ${
                      reason === r ? "bg-neutral-900 border-neutral-900 text-white" : "bg-white border-neutral-200 text-neutral-600"
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        // Lead agency sees other agency's items as view-only with status indicator
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 italic">Compliance recorded by {item.handledBy}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-400">View only</span>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgencyDemoPage() {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>(
    COMPLIANCE_ITEMS.map(() => null)
  );
  const [complianceReasons, setComplianceReasons] = useState<(ComplianceReason | null)[]>(
    COMPLIANCE_ITEMS.map(() => null)
  );
  const [complianceSubmitted, setComplianceSubmitted] = useState(false);

  const ownedItems  = COMPLIANCE_ITEMS.filter(c => c.isOwned);
  const ownedCount  = ownedItems.length;
  const allAnswered = complianceStatus
    .filter((_, i) => COMPLIANCE_ITEMS[i].isOwned)
    .every(s => s !== null);
  const readyToSubmit = allAnswered && COMPLIANCE_ITEMS.every((item, i) => {
    if (!item.isOwned) return true;
    const s = complianceStatus[i];
    return s === "done" || complianceReasons[i] !== null;
  });

  const ownedStatuses = COMPLIANCE_ITEMS
    .map((item, i) => item.isOwned ? complianceStatus[i] : null)
    .filter(s => s !== null);
  const complianceScore = complianceSubmitted
    ? Math.round(ownedStatuses.reduce((sum, s) => sum + (s === "done" ? 100 : s === "partial" ? 50 : 0), 0) / ownedCount)
    : 0;

  const [agencyNote, setAgencyNote] = useState("");
  const [noteSubmitted, setNoteSubmitted] = useState(false);
  const [releaseSimulated, setReleaseSimulated] = useState(false);

  const circumference = 138.23;
  const arcLen = (74 / 100) * circumference;

  return (
    <>
      <ViewSwitcher current="agency" />
      <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex" style={{ paddingTop: 40 }}>

        {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
        <aside className="hidden lg:flex flex-col w-[340px] xl:w-[380px] shrink-0 fixed left-0 bg-neutral-900 text-white overflow-y-auto z-20"
          style={{ top: 40, height: "calc(100vh - 40px)" }}>

          {/* Client + campaign */}
          <div className="px-5 pt-5 pb-3 border-b border-white/10">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Agency execution view</p>
            <p className="text-xs text-neutral-400 mt-0.5">Illustrative data · ShiftImpact OS</p>
          </div>
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-medium text-neutral-400 mb-1">Cooks · FMCG · Cooking Sauces</p>
            <p className="text-lg font-bold leading-tight text-white">Jadikan Caramu</p>
            <p className="text-sm text-neutral-400 mt-1">Phase 1 — Demand · Jul–Aug 2026</p>
          </div>

          {/* Health — compact, no sparklines */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">Campaign health · Week 6</p>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg width="80" height="80" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="44" fill="none" stroke="#262626" strokeWidth="6" />
                  <circle cx="48" cy="48" r="44" fill="none" stroke="#34d399" strokeWidth="6"
                    strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round"
                    transform="rotate(-90 48 48)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">74</span>
                  <span className="text-[10px] text-neutral-400">/ 100</span>
                </div>
              </div>
              <div>
                <p className="text-emerald-400 font-bold text-sm">Gaining</p>
                <p className="text-xs text-neutral-400 mt-1 leading-snug">↑ +5 pts this week</p>
                <p className="text-xs text-neutral-500 mt-0.5">Save rate: 1.9pp from gate</p>
                <a href="/portal/demo" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  View full client report →
                </a>
              </div>
            </div>
          </div>

          {/* Discipline assignment */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Your disciplines</p>
            <div className="flex flex-wrap gap-1.5">
              {(["creative", "media"] as Discipline[]).map(d => (
                <span key={d} className={`text-xs px-2 py-0.5 rounded border font-medium ${DISCIPLINE_COLORS[d]}`}>
                  {DISCIPLINE_LABELS[d]}
                </span>
              ))}
              <span className="text-xs px-2 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-500 font-medium">
                KOL — KOL Agency
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              Lead agency access — you can see all disciplines. KOL items are managed by KOL Agency.
            </p>
          </div>

          {/* Two-stage release */}
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
          </div>

          {/* Navigation */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">This report</p>
            <nav className="space-y-0.5">
              {[
                { href: "#q1", label: "Q01  Briefs to issue"             },
                { href: "#q2", label: "Q02  Brief compliance"            },
                { href: "#q3", label: "Q03  Creative battery"            },
                { href: "#q4", label: "Q04  KOL performance"             },
                { href: "#q5", label: "Q05  Competitive ICS"             },
                { href: "#q6", label: "Q06  Client readout + narrative"  },
              ].map(n => (
                <a key={n.href} href={n.href}
                  className="block text-xs py-0.5 text-neutral-400 hover:text-white transition-colors font-mono">
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ═══════════════════════ MAIN ═══════════════════════ */}
        <main className="lg:ml-[340px] xl:ml-[380px] flex-1 px-5 sm:px-8 lg:px-10 xl:px-14 pt-8 pb-20 max-w-4xl">

          {/* Page header */}
          <div className="mb-8 pb-6 border-b border-neutral-200">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">
              ShiftImpact OS · 17 Aug 2026 · Week 6 of 12
            </p>
            <h1 className="text-2xl font-black text-neutral-900">Agency Execution Report</h1>
            <p className="text-base text-neutral-500 mt-1">Jadikan Caramu · Cooks · Phase 1 — Demand</p>
          </div>

          {/* Client report callout */}
          <div className="mb-8 bg-neutral-900 rounded-lg p-5 flex items-center justify-between gap-6">
            <div>
              <p className="text-xs text-neutral-400 font-mono mb-1">Intelligence layer</p>
              <p className="text-sm font-semibold text-white leading-snug">
                Health 74 · Gaining · Gate: 1.9pp to save rate threshold
              </p>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                Signal health, strategic direction, and prediction horizon are in the client intelligence report. This page covers your execution layer — briefs, compliance, creative, and KOL.
              </p>
            </div>
            <a href="/portal/demo"
              className="shrink-0 px-4 py-2.5 bg-white text-neutral-900 text-sm font-semibold rounded hover:bg-neutral-100 transition-colors whitespace-nowrap">
              View client report →
            </a>
          </div>

          {/* ── Q01: Briefs to issue ── */}
          <SectionQ q="Q01" label="Briefs to issue to your team" id="q1">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Three briefs this week across creative, media, and KOL. All are grounded in the signal intelligence — the brief direction is implementation of what the data is telling us.
            </p>
            <div className="space-y-3">
              {ACTIONS.map((a, i) => <AgencyActionCard key={i} action={a} />)}
            </div>
          </SectionQ>

          {/* ── Q02: Brief compliance ── */}
          <SectionQ q="Q02" label="Brief compliance" id="q2">

            {/* Discipline scope notice */}
            <div className="flex items-start gap-3 bg-neutral-50 border border-neutral-200 rounded p-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-neutral-700 mb-1">Compliance scope for this report</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["creative", "media"] as Discipline[]).map(d => (
                    <span key={d} className={`text-xs px-2 py-0.5 rounded border font-medium ${DISCIPLINE_COLORS[d]}`}>
                      {DISCIPLINE_LABELS[d]} — you submit
                    </span>
                  ))}
                  <span className="text-xs px-2 py-0.5 rounded border border-neutral-200 text-neutral-400 font-medium">
                    KOL — KOL Agency submits
                  </span>
                </div>
              </div>
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium shrink-0">
                Lead agency
              </span>
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Mark delivery status for each action from the Week 5 brief. KOL items are managed by KOL Agency — shown here for your visibility as lead agency.
            </p>

            {!complianceSubmitted ? (
              <div className="space-y-3">
                {COMPLIANCE_ITEMS.map((item, i) => (
                  <ComplianceRow
                    key={item.id}
                    item={item}
                    status={complianceStatus[i]}
                    reason={complianceReasons[i]}
                    onStatus={s => {
                      const next = [...complianceStatus]; next[i] = s; setComplianceStatus(next);
                      if (s === "done") {
                        const nextR = [...complianceReasons]; nextR[i] = null; setComplianceReasons(nextR);
                      }
                    }}
                    onReason={r => {
                      const nextR = [...complianceReasons]; nextR[i] = r; setComplianceReasons(nextR);
                    }}
                  />
                ))}
                <button disabled={!readyToSubmit} onClick={() => setComplianceSubmitted(true)}
                  className="w-full py-3 bg-neutral-900 text-white text-sm font-semibold rounded hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Submit compliance report ({ownedCount} items — Creative + Media)
                </button>
              </div>
            ) : (
              <div className={`border rounded p-4 ${
                complianceScore >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : complianceScore >= 50 ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-red-50 border-red-200 text-red-800"}`}>
                <p className="font-bold text-sm">Compliance submitted · {complianceScore}%</p>
                <p className="text-xs mt-1 opacity-80">Recorded against Creative + Media disciplines for Week 5 brief.</p>
              </div>
            )}
          </SectionQ>

          {/* ── Q03: Creative battery ── */}
          <SectionQ q="Q03" label="Creative battery — endurance by format" id="q3">
            <p className="text-sm text-neutral-600 leading-relaxed">
              How long each format can sustain its engagement trajectory before audiences stop responding. Recipe formats are healthy. Meta Feed lifestyle is in decline — the Week 7 creative brief directly targets this.
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
          </SectionQ>

          {/* ── Q04: KOL performance ── */}
          <SectionQ q="Q04" label="KOL performance — save rate by creator" id="q4">
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700 mb-1">
              KOL management is assigned to KOL Agency. This data is shared with you as lead agency for visibility.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-neutral-900 text-white">
                    {["Creator", "Tier", "Save rate", "Views", "vs gate (8%)", "Status"].map((h, i) => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-left ${i === 0 ? "rounded-tl" : ""} ${i === 5 ? "rounded-tr" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KOLS.map((k, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                      <td className="px-3 py-2.5 border-b border-neutral-100 text-xs font-mono text-neutral-700">{k.handle}</td>
                      <td className="px-3 py-2.5 border-b border-neutral-100">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${k.tier === "Micro" ? "bg-blue-50 text-blue-700" : "bg-neutral-100 text-neutral-600"}`}>
                          {k.tier}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-neutral-100 font-bold" style={{ color: toneDot(k.tone) }}>
                        {k.saveRate}%
                      </td>
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
            <p className="text-xs text-neutral-500 leading-relaxed">
              Phase 2 recommendation in KOL brief (Q01): shift budget from mid-tier to micro-tier. Formal brief issues on gate confirmation.
            </p>
          </SectionQ>

          {/* ── Q05: Competitive ICS ── */}
          <SectionQ q="Q05" label="Competitive ICS benchmark" id="q5">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Cooks at 76 is CONDITIONAL — idea quality is strong but gate conditions haven't fired. MAGGI at 81 is the primary reference to beat.
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

          {/* ── Q06: Client readout + narrative ── */}
          <SectionQ q="Q06" label="Client readout + agency narrative" id="q6">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
              <strong>Before you release:</strong> Add your narrative below. It appears as a highlighted callout at the top of the client's portal — your interpretation, in your voice. The client then sees the full intelligence report below it.
            </div>

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
                  <button disabled={!agencyNote.trim()} onClick={() => setNoteSubmitted(true)}
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

            <div className="border-2 border-dashed border-neutral-300 rounded p-4">
              <p className="text-sm font-semibold text-neutral-700 mb-1">Release report to client</p>
              <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
                Once released, the client can access the full portal. Your narrative appears first. The two-stage release timestamp is logged.
              </p>
              {!releaseSimulated ? (
                <button onClick={() => setReleaseSimulated(true)}
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
            ShiftImpact OS · Agency execution view · Illustrative data · Cooks · Jadikan Caramu · Week 6 of 12
          </div>
        </main>
      </div>
    </>
  );
}
