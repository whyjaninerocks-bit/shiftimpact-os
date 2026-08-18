"use client";

// /portal/demo-partner — Partner access demo portal
// Partners (creative studios, media agencies, KOL managers) see only what
// is within their scope of service. No client business financials, no full
// competitive intelligence, no budget decisions.
//
// Scope shown in this demo: Creative + Content Partner
// (the studio delivering the weekly brief output — recipe content, TikTok, Reels)

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red";
type DeliveryStatus = "delivered" | "partial" | "pending" | null;

// ─── Data (partner-scoped — same campaign, narrower view) ─────────────────────

const CAMPAIGN = {
  brand: "Cooks",
  campaign: "Jadikan Caramu",
  phase: "Phase 1 — Demand",
  week: 6,
  weekDate: "17 Aug 2026",
};

const PARTNER = {
  name: "Studio Partner",
  role: "Creative & Content Partner",
  scope: "Recipe content production · TikTok + Instagram Reels",
  color: "#10b981", // emerald-500
};

// Active brief assigned to this partner
const ACTIVE_BRIEF = {
  number: 7,
  issued: "14 Aug 2026",
  due: "22 Aug 2026",
  title: "Recipe-led creative refresh — Merdeka window",
  context: "Save rate is 6.1% against a gate threshold of 8%. Recipe content is saving at 2.3× the rate of lifestyle content. The brief this week is to shift to 70% recipe-led output before the Merdeka window closes on 31 Aug.",
  deliverables: [
    { id: 1, task: "2 × TikTok process videos — Ayam Percik or Rendang Tok using Cooks paste", format: "TikTok · 45–60 sec", due: "19 Aug" },
    { id: 2, task: "1 × Instagram Reel — 'your version of the dish' framing, no direct product close-up", format: "Reel · 30–45 sec", due: "20 Aug" },
    { id: 3, task: "Caption copy for all 3 pieces — Malay-language primary, English subtitle", format: "Copy · 150 words max per piece", due: "20 Aug" },
    { id: 4, task: "Thumbnail stills — 3 hero frames per video for scheduler review", format: "JPEG · 1080×1920", due: "21 Aug" },
  ],
  notes: "Patriotic heritage frame is active through 31 Aug. 'Masakan Malaysia Asli' messaging is getting elevated reach on TikTok. Anchor the dish names to this. Do NOT use 'shortcut' or 'easy' framing — it depresses save rate.",
};

// Partner's content performance (only their deliverables, not full campaign)
const MY_CONTENT = [
  { week: "Wk 6", piece: "Ayam Percik Challenge · TikTok",  saveRate: 8.4, views: "48K", tone: "green" as Tone, note: "Above gate" },
  { week: "Wk 5", piece: "Rendang Tok Weeknight · TikTok",  saveRate: 7.1, views: "34K", tone: "amber" as Tone, note: "Building" },
  { week: "Wk 5", piece: "Cooks Kitchen Series · Reel",     saveRate: 6.8, views: "22K", tone: "amber" as Tone, note: "Building" },
  { week: "Wk 4", piece: "Lifestyle Cooking Reel (Meta)",   saveRate: 4.2, views: "41K", tone: "red"   as Tone, note: "Below gate — format shifted" },
  { week: "Wk 3", piece: "Product Hero · TikTok",           saveRate: 3.9, views: "19K", tone: "red"   as Tone, note: "Below gate — format discontinued" },
];

// Partner compliance record
const COMPLIANCE_HISTORY = [
  { week: "Wk 6 brief", status: "In progress", color: "amber" as Tone },
  { week: "Wk 5 brief", status: "Delivered on time", color: "green" as Tone },
  { week: "Wk 4 brief", status: "Delivered on time", color: "green" as Tone },
  { week: "Wk 3 brief", status: "1 day late — approved", color: "amber" as Tone },
  { week: "Wk 2 brief", status: "Delivered on time", color: "green" as Tone },
];

// Upcoming scope
const UPCOMING = [
  { phase: "Week 7–8", label: "Gate 1 window", note: "If gate fires, Phase 2 brief drops immediately. Plan for accelerated turnaround (3-day brief cycle)." },
  { phase: "Week 9+", label: "Phase 2 scope", note: "TikTok Shop mechanics activate. Content will shift to recipe-to-purchase format. Briefing details to follow on gate confirmation." },
  { phase: "Sep–Oct", label: "Merdeka wind-down + new phase", note: "Heritage frame ends 31 Aug. New activation theme to be briefed in Phase 2 onboarding." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toneDot(t: Tone) {
  return t === "green" ? "#34d399" : t === "amber" ? "#f59e0b" : "#f87171";
}
function toneText(t: Tone) {
  return t === "green" ? "text-emerald-700" : t === "amber" ? "text-amber-700" : "text-red-600";
}
function toneBg(t: Tone) {
  return t === "green" ? "bg-emerald-50 border-emerald-200" : t === "amber" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
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

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionQ({ q, label, id, children }: { q: string; label: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8">
      <div className="bg-neutral-900 px-5 py-3 flex items-baseline gap-3 rounded-t">
        <span className="text-xs font-bold text-emerald-400 font-mono">{q}</span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      <div className="border border-neutral-200 border-t-0 rounded-b bg-white p-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

// ─── Deliverable row ──────────────────────────────────────────────────────────
function DeliverableRow({
  d, status, onStatus
}: {
  d: typeof ACTIVE_BRIEF.deliverables[0];
  status: DeliveryStatus;
  onStatus: (s: DeliveryStatus) => void;
}) {
  return (
    <div className={`border rounded p-4 ${status === "delivered" ? "border-emerald-200 bg-emerald-50" : status === "partial" ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-800 leading-snug">{d.task}</p>
          <p className="text-xs text-neutral-500 mt-1">{d.format} · Due {d.due}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {(["delivered", "partial", "pending"] as DeliveryStatus[]).map(s => (
            <button key={s as string} onClick={() => onStatus(s)}
              className={`px-3 py-1 text-xs rounded border font-medium transition-all ${
                status === s
                  ? s === "delivered" ? "bg-emerald-600 border-emerald-600 text-white"
                  : s === "partial"   ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-red-500 border-red-500 text-white"
                  : "bg-white border-neutral-300 text-neutral-500 hover:border-neutral-400"
              }`}>
              {s === "delivered" ? "Delivered" : s === "partial" ? "Partial" : "Pending"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerDemoPage() {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus[]>(
    ACTIVE_BRIEF.deliverables.map(() => null)
  );
  const [submitted, setSubmitted] = useState(false);

  const allMarked = deliveryStatus.every(s => s !== null);
  const deliveredCount = deliveryStatus.filter(s => s === "delivered").length;

  const circumference = 138.23;
  const arcLen = (deliveredCount / ACTIVE_BRIEF.deliverables.length) * circumference;

  return (
    <>
      <ViewSwitcher current="partner" />
      <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex" style={{ paddingTop: 40 }}>

        {/* ═══════════════════════════════════════ SIDEBAR ════════════════════════════════════ */}
        <aside className="hidden lg:flex flex-col w-[380px] xl:w-[440px] shrink-0 fixed left-0 bg-neutral-900 text-white overflow-y-auto z-20"
          style={{ top: 40, height: "calc(100vh - 40px)" }}>

          <div className="px-5 pt-5 pb-3 border-b border-white/10">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: PARTNER.color }}>
              Partner access
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">Illustrative data · ShiftImpact OS</p>
          </div>

          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-medium text-neutral-400 mb-1">{CAMPAIGN.brand} · {CAMPAIGN.phase}</p>
            <p className="text-lg font-bold leading-tight text-white">{CAMPAIGN.campaign}</p>
            <p className="text-sm text-neutral-400 mt-1.5">{CAMPAIGN.weekDate} · Week {CAMPAIGN.week} of 12</p>
          </div>

          {/* Partner context */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Your role</p>
            <p className="text-sm font-semibold text-white">{PARTNER.role}</p>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{PARTNER.scope}</p>
          </div>

          {/* Delivery ring */}
          <div className="px-5 py-5 border-b border-white/10 flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="44" fill="none" stroke="#262626" strokeWidth="6" />
                <circle cx="48" cy="48" r="44" fill="none"
                  stroke={PARTNER.color} strokeWidth="6"
                  strokeDasharray={`${arcLen} ${circumference}`}
                  strokeLinecap="round"
                  transform="rotate(-90 48 48)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white">{deliveredCount}/{ACTIVE_BRIEF.deliverables.length}</span>
                <span className="text-[10px] text-neutral-400 font-medium">delivered</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Wk {CAMPAIGN.week} brief</p>
              <p className="text-sm font-semibold text-white leading-snug">{ACTIVE_BRIEF.title}</p>
              <p className="text-xs text-neutral-400 mt-1">Due {ACTIVE_BRIEF.due}</p>
            </div>
          </div>

          {/* Active brief quick nav */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">This report</p>
            <nav className="space-y-1">
              {[
                { href: "#q1", label: "Q01 Active brief" },
                { href: "#q2", label: "Q02 Your delivery status" },
                { href: "#q3", label: "Q03 Content performance" },
                { href: "#q4", label: "Q04 Compliance record" },
                { href: "#q5", label: "Q05 Upcoming scope" },
              ].map(n => (
                <a key={n.href} href={n.href}
                  className="block text-xs text-neutral-400 hover:text-white transition-colors py-0.5">
                  {n.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Save rate signal — scoped to partner's content */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">Your save rate</p>
            <p className="text-3xl font-black text-white">6.1<span className="text-lg text-neutral-400">%</span></p>
            <p className="text-xs text-amber-400 mt-1">↑ +0.4% · 1.9pp below gate</p>
            <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${(6.1 / 10) * 100}%` }} />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Gate: 8.0% · Recipe format is approaching</p>
          </div>

          {/* Access boundary notice */}
          <div className="px-5 py-4 mt-auto">
            <div className="bg-neutral-800 rounded p-3">
              <p className="text-xs font-semibold text-neutral-300 mb-1">Your access scope</p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                You see briefs, delivery status, and performance for content you produced.
                Budget, competitive intelligence, and client business data are not visible in partner access.
              </p>
            </div>
          </div>

        </aside>

        {/* ═══════════════════════════════════════ MAIN ════════════════════════════════════ */}
        <main className="lg:ml-[380px] xl:ml-[440px] flex-1 px-5 sm:px-8 lg:px-10 xl:px-14 pt-8 pb-20 max-w-4xl">

          {/* Page header */}
          <div className="mb-8 pb-6 border-b border-neutral-200">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">
                  ShiftImpact OS · {CAMPAIGN.weekDate} · Week {CAMPAIGN.week} of 12
                </p>
                <h1 className="text-2xl font-black text-neutral-900 leading-tight">
                  {PARTNER.role}
                </h1>
                <p className="text-base text-neutral-500 mt-1">
                  {CAMPAIGN.campaign} · {CAMPAIGN.brand} · {CAMPAIGN.phase}
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded text-xs font-semibold border bg-amber-50 border-amber-200 text-amber-700 shrink-0`}>
                Brief active · Due {ACTIVE_BRIEF.due}
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-800">
              <strong>Partner access:</strong> This view is scoped to your deliverables for {CAMPAIGN.campaign}. You can see your brief, your content's performance signals, your compliance record, and upcoming scope. Campaign-level business data is not included in this view.
            </div>
          </div>

          {/* ── Q01: Active Brief ── */}
          <SectionQ q="Q01" label="Your active brief" id="q1">
            <div className="bg-neutral-900 rounded p-4 text-white">
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <p className="text-sm font-bold">Week {ACTIVE_BRIEF.number} brief · Issued {ACTIVE_BRIEF.issued}</p>
                <p className="text-xs text-amber-400 shrink-0">Due {ACTIVE_BRIEF.due}</p>
              </div>
              <p className="text-base font-semibold text-white mb-3">{ACTIVE_BRIEF.title}</p>
              <p className="text-sm text-neutral-300 leading-relaxed">{ACTIVE_BRIEF.context}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 leading-relaxed">
              <strong>Direction note:</strong> {ACTIVE_BRIEF.notes}
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Deliverables this week</p>
              <div className="space-y-2">
                {ACTIVE_BRIEF.deliverables.map(d => (
                  <div key={d.id} className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded">
                    <span className="text-xs font-mono text-neutral-400 shrink-0 mt-0.5">{String(d.id).padStart(2, "0")}</span>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-800 leading-snug">{d.task}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{d.format} · Due {d.due}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionQ>

          {/* ── Q02: Delivery Status ── */}
          <SectionQ q="Q02" label="Mark your delivery status" id="q2">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Mark each deliverable as you complete it. Partial delivery triggers an automatic flag to the strategist for brief adjustment.
            </p>

            <div className="space-y-3">
              {ACTIVE_BRIEF.deliverables.map((d, i) => (
                <DeliverableRow
                  key={d.id}
                  d={d}
                  status={deliveryStatus[i]}
                  onStatus={s => {
                    const next = [...deliveryStatus];
                    next[i] = s;
                    setDeliveryStatus(next);
                  }}
                />
              ))}
            </div>

            {allMarked && !submitted && (
              <div className="pt-2">
                <button
                  onClick={() => setSubmitted(true)}
                  className="w-full py-3 bg-neutral-900 text-white text-sm font-semibold rounded hover:bg-neutral-800 transition-colors">
                  Submit delivery report
                </button>
              </div>
            )}

            {submitted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-4">
                <p className="text-sm font-semibold text-emerald-800">
                  Delivery report submitted · {deliveredCount} of {ACTIVE_BRIEF.deliverables.length} delivered
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  {deliveredCount === ACTIVE_BRIEF.deliverables.length
                    ? "All deliverables confirmed. Strategist notified."
                    : "Partial delivery logged. Strategist will follow up on outstanding items."}
                </p>
              </div>
            )}
          </SectionQ>

          {/* ── Q03: Content Performance ── */}
          <SectionQ q="Q03" label="Your content performance" id="q3">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Save rate performance for content you produced across the campaign. Save rate is the primary gate signal — this is your direct contribution to Phase 2 unlock.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-neutral-900 text-white">
                    <th className="px-3 py-2 text-left text-xs font-semibold rounded-tl">Week</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Content piece</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold">Save rate</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold">Views</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold rounded-tr">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {MY_CONTENT.map((c, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                      <td className="px-3 py-2.5 border-b border-neutral-100 text-xs font-mono text-neutral-500">{c.week}</td>
                      <td className="px-3 py-2.5 border-b border-neutral-100 text-sm text-neutral-800 font-medium">{c.piece}</td>
                      <td className="px-3 py-2.5 border-b border-neutral-100 text-right">
                        <span className={`font-bold text-sm ${c.tone === "green" ? "text-emerald-600" : c.tone === "amber" ? "text-amber-600" : "text-red-600"}`}>
                          {c.saveRate}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-neutral-100 text-right text-xs text-neutral-500">{c.views}</td>
                      <td className="px-3 py-2.5 border-b border-neutral-100">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${toneText(c.tone)}`}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: toneDot(c.tone) }} />
                          {c.note}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded p-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">What the signal means for your brief</p>
              <div className="space-y-2 text-sm text-neutral-700 leading-relaxed">
                <p>Recipe-format content (Wk 6 piece) is saving at <strong>8.4%</strong> — above the gate threshold of 8%. Lifestyle format (Wk 4) was at 4.2% before it was phased out.</p>
                <p>Your Wk 7 brief is directly addressed at sustaining this recipe-led format. Maintaining ≥8% save rate across Wk 7 output is what triggers Phase 2 budget release.</p>
              </div>
            </div>
          </SectionQ>

          {/* ── Q04: Compliance Record ── */}
          <SectionQ q="Q04" label="Your compliance record" id="q4">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Your delivery history across the campaign. On-time delivery is a condition of the partner relationship and feeds the weekly brief compliance report seen by the client.
            </p>

            <div className="space-y-2">
              {COMPLIANCE_HISTORY.map((c, i) => (
                <div key={i} className={`flex items-center justify-between p-3 border rounded ${toneBg(c.color)}`}>
                  <span className="text-xs font-mono text-neutral-500">{c.week}</span>
                  <span className={`text-sm font-medium ${toneText(c.color)}`}>{c.status}</span>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
              <p className="text-xs font-semibold text-emerald-700">On-time delivery rate: 4/5 weeks · 80%</p>
              <p className="text-xs text-emerald-600 mt-0.5">Week 3 delay was flagged and approved. No open compliance issues.</p>
            </div>
          </SectionQ>

          {/* ── Q05: Upcoming Scope ── */}
          <SectionQ q="Q05" label="What is coming your way" id="q5">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Scope visibility for the next 4–8 weeks so you can plan production capacity. This is directional — formal briefs will be issued when gates fire.
            </p>

            <div className="space-y-3">
              {UPCOMING.map((u, i) => (
                <div key={i} className="border border-neutral-200 rounded p-4">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-xs font-mono font-bold text-neutral-900">{u.phase}</span>
                    <span className="text-sm font-semibold text-neutral-700">{u.label}</span>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed">{u.note}</p>
                </div>
              ))}
            </div>

            <div className="bg-neutral-900 rounded p-4">
              <p className="text-xs font-semibold text-neutral-300 mb-2">Phase 2 trigger condition</p>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Phase 2 brief drops when save rate ≥8% holds for 3 consecutive days. Current: 6.1%. Your Wk 7 recipe content is the key input to this gate. If the brief is actioned this week, gate probability is 78% by Week 7.
              </p>
              <div className="mt-3 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: "61%" }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-neutral-500">6.1% current</span>
                <span className="text-xs text-neutral-500">8.0% gate</span>
              </div>
            </div>
          </SectionQ>

          <div className="pt-6 border-t border-neutral-200 text-xs text-neutral-400">
            ShiftImpact OS · Partner access · Illustrative data · {CAMPAIGN.brand} · {CAMPAIGN.campaign} · Week {CAMPAIGN.week} of 12
          </div>

        </main>
      </div>
    </>
  );
}
