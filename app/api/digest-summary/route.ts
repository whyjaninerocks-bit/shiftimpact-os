// app/api/digest-summary/route.ts
// Returns a structured plain-text digest of this week's open windows + pursue pipeline
// + cultural signals matched to active clients.
// Called by the weekly Claude scheduled task every Monday morning.
// No auth required — data is internal-only, no PII beyond company names.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { synthesizePitchAngle } from "@/lib/window-synthesis";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const supabase = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const today = new Date().toLocaleDateString("en-MY", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // ── Open windows ──────────────────────────────────────────────────────────
  const { data: openWindows } = await supabase
    .from("window_alerts")
    .select(`
      id, trigger_reason, detected_at,
      company_id,
      companies!inner ( id, name, industry, market_code, business_model ),
      opportunity_windows!inner ( id, window_type, label, engagement_model )
    `)
    .eq("is_open", true)
    .order("detected_at", { ascending: false })
    .limit(30);

  // ── Pursue pipeline ───────────────────────────────────────────────────────
  const { data: pursueInsights } = await supabase
    .from("prospect_insights")
    .select(`
      company_id, best_entry_angle, first_engagement_offer, decision_window_weeks, spend_signal,
      companies!inner ( id, name, industry, market_code )
    `)
    .eq("depth_level", "topline")
    .eq("recommendation", "Pursue")
    .order("created_at", { ascending: false })
    .limit(20);

  // Deduplicate pursue — latest per company
  const seenPursue = new Set<string>();
  const topPursue = (pursueInsights ?? []).filter(r => {
    if (seenPursue.has(r.company_id)) return false;
    seenPursue.add(r.company_id);
    return true;
  }).slice(0, 5);

  // ── Sort + group windows by company ──────────────────────────────────────
  const sorted = (openWindows ?? []).sort((a, b) => {
    const wa = a.opportunity_windows as { window_type: string };
    const wb = b.opportunity_windows as { window_type: string };
    return (WINDOW_PRIORITY[wa.window_type] ?? 9) - (WINDOW_PRIORITY[wb.window_type] ?? 9);
  });

  type WinGroup = {
    company: { id: string; name: string; industry: string | null; market_code: string | null; business_model: string | null };
    alerts: typeof sorted;
    topPriority: number;
  };
  const groupMap = new Map<string, WinGroup>();
  for (const alert of sorted) {
    const co = alert.companies as { id: string; name: string; industry: string | null; market_code: string | null; business_model: string | null };
    const win = alert.opportunity_windows as { window_type: string };
    const p = WINDOW_PRIORITY[win.window_type] ?? 9;
    if (!groupMap.has(co.id)) groupMap.set(co.id, { company: co, alerts: [], topPriority: p });
    const g = groupMap.get(co.id)!;
    g.alerts.push(alert);
    if (p < g.topPriority) g.topPriority = p;
  }
  const groups = Array.from(groupMap.values()).sort((a, b) => a.topPriority - b.topPriority);

  // ── Active campaign signal health ────────────────────────────────────────
  const { data: activeCampaigns } = await supabase
    .from("campaigns")
    .select("id, name, client_name, current_phase, gate_signal_status")
    .not("current_phase", "is", null)
    .order("client_name");

  const { data: allWeeklyReports } = await supabase
    .from("signal_weekly_reports")
    .select("campaign_id, week_number, gate_status, demand_health, nurture_health, conversion_health, pipeline_risk_detected, flags_suppressed")
    .order("week_number", { ascending: false });

  const { data: failingLogs } = await supabase
    .from("gate_signal_log")
    .select("campaign_id, signal_label")
    .eq("pass", false);

  const latestReportMap = new Map<string, {
    week_number: number; gate_status: string | null; demand_health: string | null;
    nurture_health: string | null; conversion_health: string | null;
    pipeline_risk_detected: boolean | null; flags_suppressed: boolean;
  }>();
  for (const r of allWeeklyReports ?? []) {
    if (!latestReportMap.has(r.campaign_id)) latestReportMap.set(r.campaign_id, r);
  }
  const breachCountMap = new Map<string, number>();
  for (const log of failingLogs ?? []) {
    breachCountMap.set(log.campaign_id, (breachCountMap.get(log.campaign_id) ?? 0) + 1);
  }

  type CampaignPulseEntry = {
    id: string; name: string; client_name: string | null; current_phase: string | null;
    latest_week: number | null; gate_status: string | null;
    demand_health: string | null; nurture_health: string | null; conversion_health: string | null;
    pipeline_risk: boolean; breach_count: number;
  };
  const campaignPulse: CampaignPulseEntry[] = (activeCampaigns ?? []).map(c => {
    const report = latestReportMap.get(c.id);
    return {
      id: c.id, name: c.name, client_name: c.client_name ?? null, current_phase: c.current_phase ?? null,
      latest_week: report?.week_number ?? null,
      gate_status: report?.flags_suppressed ? null : (report?.gate_status ?? null),
      demand_health: report?.flags_suppressed ? null : (report?.demand_health ?? null),
      nurture_health: report?.flags_suppressed ? null : (report?.nurture_health ?? null),
      conversion_health: report?.flags_suppressed ? null : (report?.conversion_health ?? null),
      pipeline_risk: report?.pipeline_risk_detected ?? false,
      breach_count: breachCountMap.get(c.id) ?? 0,
    };
  }).filter(c => c.latest_week !== null || c.breach_count > 0);

  // ── New signals count this week ───────────────────────────────────────────
  const { count: signalCount } = await supabase
    .from("business_signals")
    .select("*", { count: "exact", head: true })
    .is("duplicate_of_id", null)
    .gte("detected_at", sevenDaysAgo);

  // ── Cultural signals this week ────────────────────────────────────────────
  // Fetch active clients first so we can match cultural signals to them
  const { data: activeClients } = await supabase
    .from("companies")
    .select("id, name, industry")
    .eq("is_suppressed", false)
    .neq("status", "Archived");

  // Build industry → client map
  const industryToClients = new Map<string, { id: string; name: string }[]>();
  for (const c of activeClients ?? []) {
    if (!c.industry) continue;
    if (!industryToClients.has(c.industry)) industryToClients.set(c.industry, []);
    industryToClients.get(c.industry)!.push({ id: c.id, name: c.name });
  }
  const allActiveClientList = (activeClients ?? []).map(c => ({ id: c.id, name: c.name }));

  // Fetch recent cultural signals — use try/catch in case columns don't exist yet
  let culturalSignals: Array<{
    id: string;
    signal_name: string;
    signal_type: string;
    evidence: string | null;
    is_generic: boolean;
    is_trending: boolean;
    relevant_industries: string[];
    created_at: string;
  }> = [];

  try {
    const { data: cs } = await supabase
      .from("cultural_signals")
      .select("id, signal_name, signal_type, evidence, is_generic, is_trending, relevant_industries, created_at")
      .gte("created_at", sevenDaysAgo)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(20);
    culturalSignals = (cs ?? []) as typeof culturalSignals;
  } catch {
    // Columns not yet migrated — skip cultural section gracefully
  }

  // Match cultural signals to relevant clients for display
  type CulturalEntry = {
    signal: typeof culturalSignals[number];
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
    if (matched.length > 0 || sig.is_generic) {
      culturalEntries.push({ signal: sig, matchedClients: matched });
    }
  }

  // ── Build plain-text brief ────────────────────────────────────────────────
  const lines: string[] = [];

  const totalBreaches = campaignPulse.reduce((sum, c) => sum + c.breach_count, 0);

  lines.push(`SHIFTIMPACT OS — WEEKLY INTELLIGENCE DIGEST`);
  lines.push(`${today}`);
  lines.push(`${groups.length} companies with open windows · ${topPursue.length} pursue-ready · ${signalCount ?? 0} new signals this week · ${culturalEntries.length} cultural signals · ${campaignPulse.length} active campaigns${totalBreaches > 0 ? ` · ⚠ ${totalBreaches} breach alerts` : ""}`);
  lines.push(``);

  // ── Campaign signal health section ───────────────────────────────────────
  if (campaignPulse.length > 0) {
    lines.push(`━━ ACTIVE CAMPAIGN SIGNAL HEALTH ━━`);
    lines.push(``);
    for (const c of campaignPulse) {
      const gate = c.gate_status ?? (c.latest_week !== null ? "Baseline" : "No data");
      const health = c.latest_week !== null
        ? `D:${c.demand_health ?? "—"} N:${c.nurture_health ?? "—"} C:${c.conversion_health ?? "—"}`
        : "No weekly data yet";
      lines.push(`${c.name}${c.client_name ? ` (${c.client_name})` : ""} — Phase: ${c.current_phase ?? "Unknown"}${c.latest_week !== null ? ` · Wk ${c.latest_week}` : ""}`);
      lines.push(`  Gate: ${gate} · ${health}${c.pipeline_risk ? " · ⚠ Pipeline Risk" : ""}${c.breach_count > 0 ? ` · 🔴 ${c.breach_count} breach alert${c.breach_count !== 1 ? "s" : ""}` : ""}`);
      lines.push(``);
    }
  }

  if (groups.length > 0) {
    lines.push(`━━ OPEN OPPORTUNITY WINDOWS ━━`);
    lines.push(``);
    for (const { company: co, alerts } of groups) {
      const windowTypes = alerts.map(a => (a.opportunity_windows as { window_type: string }).window_type);
      const leadWin = alerts[0]?.opportunity_windows as { label: string };
      const leadLabel = leadWin?.label ?? windowTypes[0];
      const { narrative } = synthesizePitchAngle(windowTypes, leadLabel, alerts.map(a => a.trigger_reason));
      const isB2B = alerts.some(a => (a.opportunity_windows as { engagement_model: string }).engagement_model === "B2B");

      lines.push(`${co.name}${isB2B ? " [B2B]" : ""} — ${[co.industry, co.market_code].filter(Boolean).join(", ")}`);
      lines.push(`  Lead with: ${leadLabel}`);
      if (alerts.length > 1) {
        const supporting = alerts.slice(1).map(a => (a.opportunity_windows as { label: string }).label).join(", ");
        lines.push(`  Context windows: ${supporting}`);
      }
      lines.push(`  Engagement angle: ${narrative}`);
      lines.push(`  Signals: ${alerts.map(a => a.trigger_reason).join(" · ")}`);
      lines.push(``);
    }
  }

  if (topPursue.length > 0) {
    lines.push(`━━ CALL THIS WEEK ━━`);
    lines.push(``);
    for (const r of topPursue) {
      const co = r.companies as { id: string; name: string; industry: string | null; market_code: string | null };
      const ri = r as Record<string, unknown>;
      lines.push(`${co.name} — ${[co.industry, co.market_code].filter(Boolean).join(", ")}`);
      if (ri.best_entry_angle) lines.push(`  Entry angle: "${ri.best_entry_angle}"`);
      if (ri.first_engagement_offer) lines.push(`  First offer: ${ri.first_engagement_offer}`);
      if (ri.decision_window_weeks) lines.push(`  Decision window: ${ri.decision_window_weeks} weeks`);
      if (ri.spend_signal) lines.push(`  Spend signal: ${ri.spend_signal}`);
      lines.push(``);
    }
  }

  // ── Cultural signals section ──────────────────────────────────────────────
  if (culturalEntries.length > 0) {
    lines.push(`━━ CULTURAL CONTEXT THIS WEEK ━━`);
    lines.push(``);

    for (const { signal: sig, matchedClients } of culturalEntries) {
      const scope = sig.is_generic ? "GENERIC — all active clients" : `Industry-specific`;
      const trending = sig.is_trending ? " · Trending" : "";
      lines.push(`[${sig.signal_type.toUpperCase()}${trending}] ${sig.signal_name}`);
      lines.push(`  ${scope}`);

      if (!sig.is_generic && matchedClients.length > 0) {
        const names = matchedClients.map(c => c.name).slice(0, 5).join(", ");
        const more = matchedClients.length > 5 ? ` +${matchedClients.length - 5} more` : "";
        lines.push(`  Relevant to: ${names}${more}`);
      }

      if (sig.evidence) {
        const ev = sig.evidence.length > 120 ? sig.evidence.slice(0, 120) + "…" : sig.evidence;
        lines.push(`  Evidence: ${ev}`);
      }
      lines.push(``);
    }
  }

  lines.push(`━━ END OF DIGEST ━━`);
  lines.push(`View full digest: /prospects/digest`);

  return NextResponse.json({
    date: today,
    summary: {
      open_windows: groups.length,
      pursue_ready: topPursue.length,
      new_signals: signalCount ?? 0,
      cultural_signals: culturalEntries.length,
      active_campaigns: campaignPulse.length,
      breach_alerts: totalBreaches,
    },
    campaign_pulse: campaignPulse.map(c => ({
      name: c.name,
      client: c.client_name,
      phase: c.current_phase,
      latest_week: c.latest_week,
      gate: c.gate_status,
      demand: c.demand_health,
      nurture: c.nurture_health,
      conversion: c.conversion_health,
      pipeline_risk: c.pipeline_risk,
      breach_count: c.breach_count,
    })),
    text: lines.join("\n"),
    windows: groups.map(({ company: co, alerts }) => ({
      company: co.name,
      industry: co.industry,
      market: co.market_code,
      is_b2b: alerts.some(a => (a.opportunity_windows as { engagement_model: string }).engagement_model === "B2B"),
      lead_window: (alerts[0]?.opportunity_windows as { label: string })?.label,
      all_windows: alerts.map(a => (a.opportunity_windows as { label: string }).label),
      pitch_angle: synthesizePitchAngle(
        alerts.map(a => (a.opportunity_windows as { window_type: string }).window_type),
        (alerts[0]?.opportunity_windows as { label: string })?.label ?? "",
        alerts.map(a => a.trigger_reason)
      ).narrative,
      signals: alerts.map(a => a.trigger_reason),
    })),
    pursue: topPursue.map(r => {
      const co = r.companies as { name: string; industry: string | null; market_code: string | null };
      const ri = r as Record<string, unknown>;
      return {
        company: co.name,
        entry_angle: ri.best_entry_angle,
        first_offer: ri.first_engagement_offer,
        decision_window_weeks: ri.decision_window_weeks,
        spend_signal: ri.spend_signal,
      };
    }),
    cultural_signals: culturalEntries.map(({ signal: sig, matchedClients }) => ({
      name: sig.signal_name,
      type: sig.signal_type,
      is_generic: sig.is_generic,
      is_trending: sig.is_trending,
      evidence: sig.evidence,
      matched_clients: matchedClients.map(c => c.name),
    })),
  });
}
