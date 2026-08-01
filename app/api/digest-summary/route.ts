// app/api/digest-summary/route.ts
// Returns a structured plain-text digest of this week's open windows + pursue pipeline.
// Called by the weekly Claude scheduled task every Monday morning.
// No auth required — data is internal-only, no PII beyond company names.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const WINDOW_PRIORITY: Record<string, number> = {
  leadership_change:   1,
  funding_event:       2,
  rfp_cycle:           3,
  renewal_season:      4,
  conference_calendar: 5,
  campaign_season:     6,
  product_launch:      7,
  fiscal_cycle:        8,
};

function synthesizePitchAngle(windowTypes: string[], leadLabel: string): string {
  const has = (t: string) => windowTypes.includes(t);
  const n = windowTypes.length;

  if (has("leadership_change") && has("funding_event"))
    return "New leadership with fresh capital — audit their strategy before they lock in the roadmap. One conversation, two open doors.";
  if (has("leadership_change") && has("rfp_cycle"))
    return "Incoming leader triggering an agency review — get in before the brief is written, not after it is awarded.";
  if (has("leadership_change") && has("fiscal_cycle"))
    return "Leadership transition entering planning season — shape the new brief before anyone else is in the room.";
  if (has("leadership_change") && has("campaign_season"))
    return "New leader inheriting active campaigns — show them what is really performing before they make changes.";
  if (has("leadership_change") && has("conference_calendar"))
    return "New leader riding a recognition moment — enter on the win, not the pitch.";
  if (has("funding_event") && has("rfp_cycle"))
    return "Capital secured, vendor review open — lead with ROI clarity, not a capabilities deck.";
  if (has("funding_event") && has("campaign_season"))
    return "Investment secured with campaigns running — show exactly what their capital is doing right now.";
  if (has("funding_event") && has("fiscal_cycle"))
    return "Fresh funding entering annual planning — position Growth Intelligence as the foundation for how they deploy capital next year.";
  if (has("rfp_cycle") && has("fiscal_cycle"))
    return "Budget season + agency review — enter as the intelligence layer for the incoming brief, not another vendor to evaluate.";
  if (has("campaign_season") && has("fiscal_cycle"))
    return "Active campaign overlapping with planning — this campaign's data is the anchor for next year's strategy conversation.";
  if (has("conference_calendar") && has("campaign_season"))
    return "Award momentum with live campaigns — lead with the story behind the numbers.";
  if (has("product_launch") && has("campaign_season"))
    return "New product in market with campaigns active — one conversation on the full-cycle intelligence behind the launch.";
  if (n >= 3)
    return `${n} signals converging. Lead with the ${leadLabel.toLowerCase()} signal only — the others are context you deploy once you are in the room.`;
  return "One clear signal. Lead with this, open the conversation, and let them surface the rest.";
}

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
      const narrative = synthesizePitchAngle(windowTypes, leadLabel);
      const isB2B = alerts.some(a => (a.opportunity_windows as { engagement_model: string }).engagement_model === "B2B");
      const allLabels = alerts.map(a => (a.opportunity_windows as { label: string }).label).join(", ");

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
        (alerts[0]?.opportunity_windows as { label: string })?.label ?? ""
      ),
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
