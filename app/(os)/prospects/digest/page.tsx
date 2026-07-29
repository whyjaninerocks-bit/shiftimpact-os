// app/(os)/prospects/digest/page.tsx
// Weekly Intelligence Digest — signals from the last 7 days across all tracked companies.
// What to open Monday morning: who moved, who to call, who to watch.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, SectionTitle } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

function daysSince(date: string | null): string {
  if (!date) return "never";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function recTone(rec: string | null): "green" | "amber" | "red" {
  if (rec === "Pursue") return "green";
  if (rec === "Watch")  return "amber";
  return "red";
}

function categoryTone(cat: string): "blue" | "green" | "purple" | "amber" | "neutral" {
  switch (cat) {
    case "Growth":      return "blue";
    case "Recognition": return "green";
    case "Leadership":  return "purple";
    case "Activation":  return "amber";
    default:            return "neutral";
  }
}

function spendTone(s: string | null): string {
  if (s === "Budget likely available") return "bg-green-50 border-green-200 text-green-700";
  if (s === "Budget possibly frozen")  return "bg-red-50 border-red-200 text-red-700";
  return "bg-neutral-50 border-neutral-200 text-neutral-500";
}

export default async function DigestPage() {
  const supabase = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const today = new Date().toLocaleDateString("en-MY", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // 1. New signals this week — grouped by company
  const { data: newSignals } = await supabase
    .from("business_signals")
    .select(`
      id, signal_category, signal_type, signal_text, detected_at,
      company_id,
      companies!inner ( id, name, industry, market_code, status, prospect_tier, partner_tag )
    `)
    .is("duplicate_of_id", null)
    .gte("detected_at", sevenDaysAgo)
    .order("detected_at", { ascending: false })
    .limit(40);

  // Group signals by company
  type CompanySignalGroup = {
    company: { id: string; name: string; industry: string | null; market_code: string | null; status: string | null; prospect_tier: string | null; partner_tag: string | null };
    signals: typeof newSignals;
  };
  const groupedMap = new Map<string, CompanySignalGroup>();

  for (const s of newSignals ?? []) {
    const co = s.companies as { id: string; name: string; industry: string | null; market_code: string | null; status: string | null; prospect_tier: string | null; partner_tag: string | null };
    if (!groupedMap.has(co.id)) {
      groupedMap.set(co.id, { company: co, signals: [] });
    }
    groupedMap.get(co.id)!.signals!.push(s);
  }
  const grouped = Array.from(groupedMap.values());

  // 2. Top Pursue recommendations (latest topline insight per company, Pursue only)
  const { data: pursueInsights } = await supabase
    .from("prospect_insights")
    .select(`
      company_id, recommendation, best_entry_angle, decision_window_weeks,
      spend_signal, first_engagement_offer, partner_lens, aoai_recommended_offer, created_at,
      companies!inner ( id, name, industry, market_code, status )
    `)
    .eq("depth_level", "topline")
    .eq("recommendation", "Pursue")
    .order("created_at", { ascending: false })
    .limit(20);

  // Deduplicate — latest per company
  const seenPursue = new Set<string>();
  const topPursue = (pursueInsights ?? []).filter(r => {
    if (seenPursue.has(r.company_id)) return false;
    seenPursue.add(r.company_id);
    return true;
  }).slice(0, 5);

  // 3. Watch list — latest topline insight per company, Watch only
  const { data: watchInsights } = await supabase
    .from("prospect_insights")
    .select(`
      company_id, recommendation, market_context, decision_window_weeks, created_at,
      companies!inner ( id, name, industry, market_code, status )
    `)
    .eq("depth_level", "topline")
    .eq("recommendation", "Watch")
    .order("created_at", { ascending: false })
    .limit(20);

  const seenWatch = new Set<string>();
  const topWatch = (watchInsights ?? []).filter(r => {
    if (seenWatch.has(r.company_id)) return false;
    seenWatch.add(r.company_id);
    return true;
  }).slice(0, 5);

  // 4. Pipeline summary
  const { data: allCompanies } = await supabase
    .from("companies")
    .select("status, prospect_tier, partner_tag")
    .eq("is_suppressed", false);

  const pipeline = {
    total:     allCompanies?.length ?? 0,
    pursuing:  allCompanies?.filter(c => c.status === "Pursuing").length ?? 0,
    qualified: allCompanies?.filter(c => c.status === "Qualified").length ?? 0,
    hot:       allCompanies?.filter(c => c.prospect_tier === "Tier 1 Hot").length ?? 0,
    aoai:      allCompanies?.filter(c => c.partner_tag === "AOAI" || c.partner_tag === "Both").length ?? 0,
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 bg-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Weekly Intelligence Digest</p>
          <p className="text-sm font-semibold text-neutral-900">{today}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Signals from the last 7 days · {grouped.length} compan{grouped.length === 1 ? "y" : "ies"} moved</p>
        </div>
        <Link href="/prospects" className="text-sm text-neutral-500 hover:text-neutral-800 underline shrink-0">
          Back to Prospects
        </Link>
      </div>

      {/* ── Pipeline snapshot ────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Tracked",   value: pipeline.total },
          { label: "Pursuing",  value: pipeline.pursuing },
          { label: "Qualified", value: pipeline.qualified },
          { label: "Tier 1 Hot", value: pipeline.hot },
          { label: "AOAI Fit",  value: pipeline.aoai },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-lg px-3 py-2.5 text-center">
            <p className="text-xl font-bold text-neutral-900">{s.value}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Call this week ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionTitle>Call This Week ({topPursue.length})</SectionTitle>
        {topPursue.length === 0 && (
          <Card><p className="text-sm text-neutral-500">No Pursue recommendations yet. Run assessments on your top signals.</p></Card>
        )}
        {topPursue.map(r => {
          const co = r.companies as { id: string; name: string; industry: string | null; market_code: string | null };
          const ri = r as Record<string, unknown>;
          return (
            <Link key={r.company_id} href={`/prospects/${co.id}`} className="block group">
              <Card className="group-hover:border-neutral-300 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-neutral-900 group-hover:text-neutral-700">{co.name}</p>
                        <Badge tone="green">Pursue</Badge>
                        {ri.partner_lens && (ri.partner_lens as string) !== "ShiftImpact" && (
                          <Badge tone={(ri.partner_lens as string) === "Both" ? "purple" : "green"}>
                            {ri.partner_lens as string}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{[co.industry, co.market_code].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ri.decision_window_weeks && (
                        <span className="px-2 py-0.5 rounded-md border border-neutral-200 bg-neutral-50 text-xs text-neutral-600 font-medium">
                          ⏱ {ri.decision_window_weeks as number}w
                        </span>
                      )}
                      {ri.spend_signal && (
                        <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${spendTone(ri.spend_signal as string)}`}>
                          {ri.spend_signal as string}
                        </span>
                      )}
                    </div>
                  </div>
                  {r.best_entry_angle && (
                    <p className="text-sm text-neutral-700 italic">&ldquo;{r.best_entry_angle}&rdquo;</p>
                  )}
                  {ri.first_engagement_offer && (
                    <div className="bg-neutral-900 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">First Offer</p>
                      <p className="text-xs text-white">{ri.first_engagement_offer as string}</p>
                    </div>
                  )}
                  {ri.aoai_recommended_offer && (ri.aoai_recommended_offer as string) !== "Not a fit" && (
                    <p className="text-xs text-green-700 font-medium">
                      AOAI: {ri.aoai_recommended_offer as string}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* ── New signals this week ────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionTitle>New Signals This Week ({grouped.length} companies · {newSignals?.length ?? 0} signals)</SectionTitle>
        {grouped.length === 0 && (
          <Card>
            <p className="text-sm text-neutral-500">No new signals in the last 7 days. Run Batch Scan to refresh.</p>
          </Card>
        )}
        {grouped.map(({ company: co, signals }) => (
          <Link key={co.id} href={`/prospects/${co.id}`} className="block group">
            <Card className="group-hover:border-neutral-300 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-neutral-900 group-hover:text-neutral-700">{co.name}</p>
                    {co.prospect_tier && (
                      <Badge tone={co.prospect_tier === "Tier 1 Hot" ? "red" : co.prospect_tier === "Tier 2 Warm" ? "amber" : "neutral"}>
                        {co.prospect_tier}
                      </Badge>
                    )}
                    {co.partner_tag && co.partner_tag !== "ShiftImpact" && (
                      <Badge tone={co.partner_tag === "Both" ? "purple" : "green"}>{co.partner_tag}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mb-2">{[co.industry, co.market_code].filter(Boolean).join(" · ")}</p>
                  <div className="space-y-1.5">
                    {(signals ?? []).slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-start gap-2">
                        <Badge tone={categoryTone(s.signal_category)}>{s.signal_category}</Badge>
                        <p className="text-sm text-neutral-700 flex-1 min-w-0 truncate">{s.signal_text}</p>
                        <span className="text-[10px] text-neutral-400 shrink-0">{daysSince(s.detected_at)}</span>
                      </div>
                    ))}
                    {(signals?.length ?? 0) > 3 && (
                      <p className="text-xs text-neutral-400">+{(signals?.length ?? 0) - 3} more signals</p>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Watch list ───────────────────────────────────────────────────── */}
      {topWatch.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>Keep Warm ({topWatch.length})</SectionTitle>
          {topWatch.map(r => {
            const co = r.companies as { id: string; name: string; industry: string | null; market_code: string | null };
            const ri = r as Record<string, unknown>;
            return (
              <Link key={r.company_id} href={`/prospects/${co.id}`} className="block group">
                <Card className="group-hover:border-neutral-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-neutral-900 group-hover:text-neutral-700">{co.name}</p>
                        <Badge tone="amber">Watch</Badge>
                        {ri.decision_window_weeks && (
                          <span className="text-xs text-neutral-500">⏱ {ri.decision_window_weeks as number}w window</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mb-1">{[co.industry, co.market_code].filter(Boolean).join(" · ")}</p>
                      {r.market_context && (
                        <p className="text-sm text-neutral-600 line-clamp-2">{r.market_context}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
