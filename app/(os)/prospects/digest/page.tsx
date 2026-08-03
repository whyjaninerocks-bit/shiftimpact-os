// app/(os)/prospects/digest/page.tsx
// Weekly Intelligence Digest — signals from the last 7 days across all tracked companies.
// What to open Monday morning: who moved, who to call, who to watch.

import React from "react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, SectionTitle } from "@/app/_components/ui";
import { synthesizePitchAngle, type SynthesisResult } from "@/lib/window-synthesis";
import { getAOAIScope } from "@/lib/aoai-scope";

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

  // 4. Open opportunity windows (B2B + B2C) — the proactive signal
  const { data: openWindows } = await supabase
    .from("window_alerts")
    .select(`
      id, trigger_reason, detected_at, is_open,
      company_id,
      companies!inner ( id, name, industry, market_code, status, business_model, partner_tag ),
      opportunity_windows!inner ( id, window_type, label, engagement_model )
    `)
    .eq("is_open", true)
    .order("detected_at", { ascending: false })
    .limit(20);

  // Sort by window urgency: leadership + funding first (highest conversion probability)
  const WINDOW_PRIORITY: Record<string, number> = {
    leadership_change:   1,
    funding_event:       2,
    strategic_move:      3,
    rfp_cycle:           4,
    renewal_season:      5,
    conference_calendar: 6,
    campaign_season:     7,
    product_launch:      8,
    fiscal_cycle:        9,
  };

  const sortedWindows = (openWindows ?? []).sort((a, b) => {
    const wa = a.opportunity_windows as { window_type: string };
    const wb = b.opportunity_windows as { window_type: string };
    return (WINDOW_PRIORITY[wa.window_type] ?? 9) - (WINDOW_PRIORITY[wb.window_type] ?? 9);
  });

  // Group window alerts by company, preserving priority sort within each group
  type WindowAlertRow = typeof sortedWindows[number];
  type CompanyWindowGroup = {
    company: { id: string; name: string; industry: string | null; market_code: string | null; status: string | null; business_model: string | null; partner_tag: string | null };
    alerts: WindowAlertRow[];
    topPriority: number;
  };
  const windowsByCompanyMap = new Map<string, CompanyWindowGroup>();
  for (const alert of sortedWindows) {
    const co = alert.companies as { id: string; name: string; industry: string | null; market_code: string | null; status: string | null; business_model: string | null; partner_tag: string | null };
    const win = alert.opportunity_windows as { window_type: string };
    const priority = WINDOW_PRIORITY[win.window_type] ?? 9;
    if (!windowsByCompanyMap.has(co.id)) {
      windowsByCompanyMap.set(co.id, { company: co, alerts: [], topPriority: priority });
    }
    const group = windowsByCompanyMap.get(co.id)!;
    group.alerts.push(alert);
    if (priority < group.topPriority) group.topPriority = priority;
  }
  // Sort company groups so highest-priority-window company comes first
  const windowsByCompany = Array.from(windowsByCompanyMap.values()).sort(
    (a, b) => a.topPriority - b.topPriority
  );

  // 5. Pipeline summary
  const { data: allCompanies } = await supabase
    .from("companies")
    .select("status, prospect_tier, partner_tag")
    .eq("is_suppressed", false);

  // 6. Cultural signals this week — auto-tagged to client industries
  const { data: activeClients } = await supabase
    .from("companies")
    .select("id, name, industry")
    .eq("is_suppressed", false)
    .neq("status", "Archived");

  // industry → client list for matching
  const industryToClients = new Map<string, { id: string; name: string }[]>();
  for (const c of activeClients ?? []) {
    if (!c.industry) continue;
    if (!industryToClients.has(c.industry)) industryToClients.set(c.industry, []);
    industryToClients.get(c.industry)!.push({ id: c.id, name: c.name });
  }
  const allActiveClientList = (activeClients ?? []).map(c => ({ id: c.id, name: c.name }));

  type CulturalSignalRow = {
    id: string;
    signal_name: string;
    signal_type: string;
    evidence: string | null;
    is_generic: boolean;
    is_trending: boolean;
    relevant_industries: string[];
    created_at: string;
  };

  let culturalSignals: CulturalSignalRow[] = [];
  try {
    const { data: cs } = await supabase
      .from("cultural_signals")
      .select("id, signal_name, signal_type, evidence, is_generic, is_trending, relevant_industries, created_at")
      .gte("created_at", sevenDaysAgo)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(20);
    culturalSignals = (cs ?? []) as CulturalSignalRow[];
  } catch {
    // Columns not yet migrated — skip gracefully
  }

  type CulturalEntry = {
    signal: CulturalSignalRow;
    matchedClients: { id: string; name: string }[];
  };

  const culturalEntries: CulturalEntry[] = [];
  for (const sig of culturalSignals) {
    let matched: { id: string; name: string }[] = [];
    if (sig.is_generic) {
      matched = allActiveClientList;
    } else {
      const seen = new Set<string>();
      for (const ind of (sig.relevant_industries ?? [])) {
        const clients = industryToClients.get(ind) ?? [];
        for (const c of clients) {
          if (!seen.has(c.id)) { seen.add(c.id); matched.push(c); }
        }
      }
    }
    // Only include if at least one active client is impacted (or it's generic)
    if (sig.is_generic || matched.length > 0) {
      culturalEntries.push({ signal: sig, matchedClients: matched });
    }
  }

  const pipeline = {
    total:     allCompanies?.length ?? 0,
    pursuing:  allCompanies?.filter(c => c.status === "Pursuing").length ?? 0,
    qualified: allCompanies?.filter(c => c.status === "Qualified").length ?? 0,
    hot:       allCompanies?.filter(c => c.prospect_tier === "Tier 1 Hot").length ?? 0,
    aoai:      allCompanies?.filter(c => c.partner_tag === "AOAI" || c.partner_tag === "Both").length ?? 0,
    windows:   sortedWindows.length,
    cultural:  culturalEntries.length,
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
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {[
          { label: "Tracked",    value: pipeline.total },
          { label: "Pursuing",   value: pipeline.pursuing },
          { label: "Qualified",  value: pipeline.qualified },
          { label: "Tier 1 Hot", value: pipeline.hot },
          { label: "AOAI Fit",   value: pipeline.aoai },
          { label: "Open Windows", value: pipeline.windows, highlight: pipeline.windows > 0 },
          { label: "Cultural Signals", value: pipeline.cultural, highlight: pipeline.cultural > 0, teal: true },
        ].map(s => (
          <div key={s.label} className={`border rounded-lg px-3 py-2.5 text-center ${
            (s as { teal?: boolean }).teal && (s as { highlight?: boolean }).highlight
              ? "bg-teal-50 border-teal-200"
              : (s as { highlight?: boolean }).highlight
              ? "bg-amber-50 border-amber-200"
              : "bg-white border-neutral-200"
          }`}>
            <p className={`text-xl font-bold ${
              (s as { teal?: boolean }).teal && (s as { highlight?: boolean }).highlight
                ? "text-teal-700"
                : (s as { highlight?: boolean }).highlight
                ? "text-amber-700"
                : "text-neutral-900"
            }`}>
              {s.value}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Open opportunity windows ─────────────────────────────────────── */}
      {windowsByCompany.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <SectionTitle>
              Open Opportunity Windows ({sortedWindows.length} across {windowsByCompany.length} {windowsByCompany.length === 1 ? "client" : "clients"})
            </SectionTitle>
            <span className="text-xs text-neutral-400">Act before the window closes</span>
          </div>

          <div className="space-y-2">
            {windowsByCompany.map(({ company: co, alerts, topPriority }) => {
              const hasHighPriority = topPriority <= 2;
              const hasB2B = alerts.some(a => {
                const w = a.opportunity_windows as { engagement_model: string };
                return w.engagement_model === "B2B";
              });

              // Derive ordered window types + labels for synthesis
              const orderedWindowTypes = alerts.map(a => (a.opportunity_windows as { window_type: string }).window_type);
              const triggerReasons    = alerts.map(a => a.trigger_reason);
              const leadAlertWin = alerts[0]?.opportunity_windows as { window_type: string; label: string };
              const leadLabel = leadAlertWin?.label ?? "";
              const synthesis = synthesizePitchAngle(orderedWindowTypes, leadLabel, triggerReasons);

              // AOAI scope — shown when company is tagged AOAI or Both
              const isAOAI = co.partner_tag === "AOAI" || co.partner_tag === "Both";
              const aoaiScope = isAOAI ? getAOAIScope(synthesis.leadWindowType) : null;

              return (
                <div key={co.id} className={`rounded-xl border p-4 ${
                  hasHighPriority ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white"
                }`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-2.5">

                      {/* ── Company header ── */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/prospects/${co.id}`}
                          className="font-semibold text-neutral-900 hover:underline"
                        >
                          {co.name}
                        </Link>
                        {hasB2B && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-700 uppercase tracking-wide">
                            B2B
                          </span>
                        )}
                        {co.partner_tag === "AOAI" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-green-50 border-green-200 text-green-700 uppercase tracking-wide">
                            AOAI
                          </span>
                        )}
                        {co.partner_tag === "Both" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 border-purple-200 text-purple-700 uppercase tracking-wide">
                            ShiftImpact + AOAI
                          </span>
                        )}
                        <span className="text-xs text-neutral-400">
                          {[co.industry, co.market_code].filter(Boolean).join(" · ")}
                        </span>
                      </div>

                      {/* ── Window badges: lead (dark) + supporting (muted) ── */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-0.5">Lead with</span>
                        {alerts.map((alert, idx) => {
                          const win = alert.opportunity_windows as { window_type: string; label: string };
                          const isLead = win.window_type === synthesis.leadWindowType && idx === alerts.findIndex(
                            a => (a.opportunity_windows as { window_type: string }).window_type === synthesis.leadWindowType
                          );
                          return isLead ? (
                            <span key={alert.id} className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-900 text-white uppercase tracking-wide">
                              {win.label}
                            </span>
                          ) : null;
                        })}
                        {alerts.length > 1 && (
                          <>
                            <span className="text-[10px] text-neutral-300 mx-0.5">·</span>
                            <span className="text-[10px] text-neutral-400 uppercase tracking-wider mr-0.5">Context</span>
                            {alerts.map((alert, idx) => {
                              const win = alert.opportunity_windows as { window_type: string; label: string };
                              const isLead = win.window_type === synthesis.leadWindowType && idx === alerts.findIndex(
                                a => (a.opportunity_windows as { window_type: string }).window_type === synthesis.leadWindowType
                              );
                              return !isLead ? (
                                <span key={alert.id} className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500 uppercase tracking-wide">
                                  {win.label}
                                </span>
                              ) : null;
                            })}
                          </>
                        )}
                      </div>

                      {/* ── Pitch angle synthesis ── */}
                      <div className={`rounded-lg px-3 py-2 text-xs ${
                        hasHighPriority
                          ? "bg-amber-100 border border-amber-200 text-amber-900"
                          : "bg-neutral-900 text-neutral-200"
                      }`}>
                        <span className={`font-bold uppercase tracking-wider text-[10px] block mb-0.5 ${
                          hasHighPriority ? "text-amber-600" : "text-neutral-400"
                        }`}>Pitch angle</span>
                        {synthesis.narrative}
                      </div>

                      {/* ── AOAI scope block ── */}
                      {aoaiScope && (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">AOAI — AcquisitionOS™</span>
                            <div className="flex flex-wrap gap-1">
                              {aoaiScope.pillars.map(p => (
                                <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-800 uppercase tracking-wide">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">AOAI executes</p>
                            <p className="text-xs text-green-900">{aoaiScope.aoaiExecutes}</p>
                          </div>
                          <div className="border-t border-green-200 pt-2">
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Janine preps AOAI on</p>
                            <p className="text-xs text-green-800">{aoaiScope.janinePrepAOAI}</p>
                          </div>
                        </div>
                      )}

                      {/* ── Trigger reasons (compact) ── */}
                      <p className="text-[11px] text-neutral-400">
                        Signals: {alerts.map(a => a.trigger_reason).join(" · ")}
                      </p>

                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-neutral-400">{daysSince(alerts[0]?.detected_at ?? null)}</span>
                      <Link
                        href={`/prospects/${co.id}`}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
                      >
                        Assess →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-neutral-400 pt-1">
            Windows are auto-detected from weekly scans. Run Batch Scan or wait for Monday cron to refresh.
          </p>
        </div>
      )}

      {/* ── Cultural signals this week ───────────────────────────────────── */}
      {culturalEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <SectionTitle>
              Cultural Context This Week ({culturalEntries.length} signal{culturalEntries.length === 1 ? "" : "s"})
            </SectionTitle>
            <Link href="/cultural-radar" className="text-xs text-neutral-400 hover:text-neutral-700 underline">
              Cultural Radar →
            </Link>
          </div>

          <div className="space-y-2">
            {culturalEntries.map(({ signal: sig, matchedClients }) => (
              <div key={sig.id} className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-2">

                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide
                        bg-teal-100 border-teal-300 text-teal-800">
                        {sig.signal_type}
                      </span>
                      {sig.is_generic && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide
                          bg-teal-700 border-teal-700 text-white">
                          Generic — All Clients
                        </span>
                      )}
                      {sig.is_trending && (
                        <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">Trending</span>
                      )}
                    </div>

                    {/* Signal name */}
                    <p className="font-semibold text-neutral-900">{sig.signal_name}</p>

                    {/* Relevant industries */}
                    {!sig.is_generic && (sig.relevant_industries?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sig.relevant_industries.map(ind => (
                          <span key={ind} className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-teal-200 bg-white text-teal-700">
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Matched clients */}
                    {matchedClients.length > 0 && (
                      <p className="text-xs text-teal-800">
                        <span className="font-semibold">Relevant to: </span>
                        {matchedClients.slice(0, 4).map(c => c.name).join(", ")}
                        {matchedClients.length > 4 && ` +${matchedClients.length - 4} more`}
                      </p>
                    )}

                    {/* Evidence */}
                    {sig.evidence && (
                      <p className="text-xs text-neutral-600 line-clamp-2">{sig.evidence}</p>
                    )}
                  </div>

                  <Link
                    href={`/cultural-radar/${sig.id}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors shrink-0"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-neutral-400 pt-1">
            Cultural signals are auto-tagged to client industries and generic consumer culture.
            <Link href="/cultural-radar/new" className="ml-2 text-neutral-500 underline hover:text-neutral-700">
              Log a signal →
            </Link>
          </p>
        </div>
      )}

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
