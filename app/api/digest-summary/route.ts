// app/api/digest-summary/route.ts
// Returns a structured plain-text digest of this week's open windows + pursue pipeline.
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

  // Open windows
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

  // Pursue pipeline
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

  // Sort + group windows by company
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

  // New signals count this week
  const { count: signalCount } = await supabase
    .from("business_signals")
    .select("*", { count: "exact", head: true })
    .is("duplicate_of_id", null)
    .gte("detected_at", sevenDaysAgo);

  // ── Build plain-text brief ──────────────────────────────────────────────────
  const lines: string[] = [];

  lines.push(`SHIFTIMPACT OS — WEEKLY INTELLIGENCE DIGEST`);
  lines.push(`${today}`);
  lines.push(`${groups.length} companies with open windows · ${topPursue.length} pursue-ready · ${signalCount ?? 0} new signals this week`);
  lines.push(``);

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
      lines.push(`  Pitch angle: ${narrative}`);
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

  lines.push(`━━ END OF DIGEST ━━`);
  lines.push(`View full digest: /prospects/digest`);

  return NextResponse.json({
    date: today,
    summary: {
      open_windows: groups.length,
      pursue_ready: topPursue.length,
      new_signals: signalCount ?? 0,
    },
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
  });
}
