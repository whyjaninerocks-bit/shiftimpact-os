// /portal/demo — Cooks FMCG showcase portal
// Static mock-up demonstrating the full client portal experience.
// Use this page when presenting ShiftImpact OS to prospects.

export const dynamic = "force-static";

const FINDINGS = [
  {
    headline: "Brand search interest is outpacing category growth by 2.1×",
    implication:
      "Consumers are actively seeking out this brand, not just stumbling across it in-category. This is a demand signal that converts more efficiently than paid reach.",
    recommendation:
      "Protect and amplify search intent with branded content that answers high-intent queries — do not pull back spend here.",
  },
  {
    headline: "Save rate on social content has risen 18% over three weeks",
    implication:
      "Audiences are bookmarking content for later action. This is a strong pre-purchase signal that typically precedes conversion spikes by 10 to 14 days.",
    recommendation:
      "Brief content team to produce more 'how to use' and 'recipe' formats — these generate the highest save rates in this category.",
  },
  {
    headline: "User-created content volumes are flat while branded content engagement has risen",
    implication:
      "The brand is doing well but has not yet crossed the threshold where consumers spontaneously advocate. Organic UGC is the next unlock.",
    recommendation:
      "Activate a seeded UGC programme targeting micro-creators in the Klang Valley — target 30 to 40 pieces over the next four weeks.",
  },
];

const MILESTONES = [
  { label: "FRAME Brief locked", done: true },
  { label: "Campaign launch — Go", done: true },
  { label: "Week 4 signal gate — Pass", done: true },
  { label: "Week 8 phase review", done: false },
];

const CHANNELS = ["Meta (Facebook & Instagram)", "TikTok", "Google Search", "Shopee Ads", "KOL (Micro-tier)"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "neutral"; children: React.ReactNode }) {
  const cls = {
    green: "bg-green-50 text-green-800 border-green-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    red:   "bg-red-50 text-red-800 border-red-200",
    neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
  }[tone];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {children}
    </span>
  );
}

export default function PortalDemoPage() {
  return (
    <div className="min-h-screen bg-neutral-50">

      {/* Demo banner */}
      <div className="bg-amber-50 border-b border-amber-200 py-2 px-6 flex items-center justify-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        <p className="text-xs font-medium text-amber-800 text-center">
          ShiftImpact OS · Capabilities Showcase — illustrative data showing what your client portal looks like when campaign information is live
        </p>
      </div>

      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
        <span className="font-bold tracking-tight">
          ShiftImpact <span className="text-neutral-400 font-normal text-sm">OS</span>
        </span>
        <span className="text-xs text-neutral-400">Cooks</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Title */}
        <div>
          <p className="text-xs text-neutral-400 mb-0.5">Cooks</p>
          <h1 className="text-2xl font-bold tracking-tight">Jadikan Caramu</h1>
        </div>

        {/* ── What we're here to do ── */}
        <Section title="Where things stand">
          <div className="px-4 py-3 rounded-xl bg-neutral-900 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">What we&apos;re here to do</p>
            <p className="text-sm leading-relaxed">
              Build household brand search preference in the Klang Valley among families who cook at home 3 or more times a week — measured by a 15% lift in branded search share by Week 12.
            </p>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-neutral-400">Current phase</p>
                <p className="text-lg font-semibold">Getting Noticed</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-400">Signal confidence</p>
                <p className="text-2xl font-bold">74</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 rounded-md p-3">
                <p className="text-xs text-neutral-400">Same-Store Sales Lift</p>
                <p className="text-base font-semibold">
                  +8.2%
                  <span className="text-sm font-normal text-neutral-400"> / +15% target</span>
                </p>
              </div>
              <div className="bg-neutral-50 rounded-md p-3">
                <p className="text-xs text-neutral-400">Repeat Purchase Rate (60-day)</p>
                <p className="text-base font-semibold">
                  34%
                  <span className="text-sm font-normal text-neutral-400"> / 40% target</span>
                </p>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Active channels ── */}
        <Section title="Active channels">
          <Card>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <span
                  key={ch}
                  className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium"
                >
                  {ch}
                </span>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── Latest weekly update ── */}
        <Section title="Latest weekly update">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Week 6 — 11 Aug 2026</p>
              <div className="flex gap-1">
                <Badge tone="amber">Demand</Badge>
                <Badge tone="green">Conv.</Badge>
                <Badge tone="green">Ret.</Badge>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                Decision needed
              </p>
              <p className="text-sm text-neutral-700">
                Brand search share is rising but social save rate growth suggests content format needs refreshing — recommend a brief pivot to recipe-led formats before Week 8 phase gate.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                Strategy note
              </p>
              <p className="text-sm text-neutral-700">
                Idea integrity is holding — the core &apos;Jadikan Caramu&apos; territory remains uncontested by competitors. This is the window to push harder before the festive season dilutes share of voice.
              </p>
            </div>
            <p className="text-xs text-neutral-400 pt-2 border-t border-neutral-100">
              Signal data through week 6
            </p>
          </Card>
        </Section>

        {/* ── Signal health ── */}
        <Section title="Signal health">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-neutral-500">Week 6 — measured signals</p>
              <Badge tone="amber">Gate: Amber</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-neutral-50 rounded-md p-2">
                <p className="text-[10px] text-neutral-400 mb-1">Demand</p>
                <Badge tone="amber">Amber</Badge>
              </div>
              <div className="text-center bg-neutral-50 rounded-md p-2">
                <p className="text-[10px] text-neutral-400 mb-1">Nurture</p>
                <Badge tone="green">Green</Badge>
              </div>
              <div className="text-center bg-neutral-50 rounded-md p-2">
                <p className="text-[10px] text-neutral-400 mb-1">Conversion</p>
                <Badge tone="green">Green</Badge>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-3 pt-2 border-t border-neutral-100">
              Demand signal is building but has not yet crossed the Green threshold. No action required — on track for Week 8 review.
            </p>
          </Card>
        </Section>

        {/* ── Weekly intelligence report (approved) ── */}
        <Section title="Weekly intelligence report">
          <Card className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">Growth Intelligence — Week 6</p>
                <p className="text-xs text-neutral-400 mt-0.5">Week 6 · Reviewed by your strategist</p>
              </div>
              <Badge tone="green">Ready</Badge>
            </div>

            {/* Executive summary */}
            <div className="bg-neutral-50 rounded-lg p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Summary</p>
              <p className="text-sm text-neutral-700 leading-relaxed">
                Week 6 shows the campaign is building correctly. Brand search interest is accelerating, content saves are rising, and repeat purchase intent among the core audience has strengthened. The one watch area is demand-signal velocity — it is growing but needs one more week of consistent input before it clears the Green gate threshold. No course corrections are required this week. The recommended focus is to brief creative on recipe-led content formats to extend the save-rate momentum into Week 7.
              </p>
            </div>

            {/* Risk posture */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Brand posture this week</p>
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full border bg-green-50 text-green-800 border-green-200">
                Gaining
              </span>
            </div>

            {/* Findings */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">What the data is telling us</p>
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
        </Section>

        {/* ── Channel briefs ── */}
        <Section title="Channel briefs">
          <Card className="divide-y divide-neutral-100">
            {[
              { name: "Meta — Social Content", status: "Approved" },
              { name: "TikTok — Creator Brief", status: "Ready" },
              { name: "Google Search — Keyword Brief", status: "Approved" },
            ].map((b) => (
              <div key={b.name} className="py-2.5 flex items-center justify-between">
                <span className="text-sm text-neutral-700">{b.name}</span>
                <Badge tone="green">{b.status}</Badge>
              </div>
            ))}
          </Card>
        </Section>

        {/* ── Campaign milestones ── */}
        <Section title="Campaign milestones">
          <Card className="space-y-2">
            {MILESTONES.filter((m) => m.done).map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                <span className="text-sm text-neutral-600">{m.label}</span>
              </div>
            ))}
            {MILESTONES.filter((m) => !m.done).map((m) => (
              <div key={m.label} className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                <span className="text-neutral-300">○</span>
                <span className="text-sm text-neutral-400">Next: {m.label}</span>
              </div>
            ))}
          </Card>
        </Section>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-200 text-xs text-neutral-400">
          <span>ShiftImpact OS</span>
        </div>

      </main>
    </div>
  );
}
