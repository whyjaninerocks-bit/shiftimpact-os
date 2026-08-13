// app/api/decide-insights/route.ts
// Internal API — aggregated decision intelligence from /decide sessions.
// Powers the /decide/insights dashboard for Janine's consulting and prospecting.
// Auth-gated: requires valid Supabase session (middleware enforces).

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function countBy<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T
): { label: string; count: number; pct: number }[] {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const v = (r[key] as string) ?? "Unknown";
    map[v] = (map[v] ?? 0) + 1;
  }
  const total = rows.length;
  return Object.entries(map)
    .map(([label, count]) => ({ label, count, pct: pct(count, total) }))
    .sort((a, b) => b.count - a.count);
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();

  // All sessions with at least a decision text
  const { data: all, error } = await supabase
    .from("widget_leads")
    .select(
      "id, session_id, decision_text, industry, brand_category, assumption_category, campaign_stage, signal_gap_type, decision_gap_type, stage_read, signal_gap_text, gate_condition, next_action, bridge_question, probe_count, email, emailed_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = all ?? [];
  const total = rows.length;
  const withEmail = rows.filter((r) => r.email).length;
  const withSynthesis = rows.filter((r) => r.assumption_category).length;
  const emailed = rows.filter((r) => r.emailed_at).length;

  // Weekly volume — last 12 weeks
  const weeklyMap: Record<string, number> = {};
  for (const r of rows) {
    const d = new Date(r.created_at);
    // ISO week label
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const label = monday.toISOString().slice(0, 10);
    weeklyMap[label] = (weeklyMap[label] ?? 0) + 1;
  }
  const weekly = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, count]) => ({ week, count }));

  // Synthesis rows only (have been through full probe + benchmark flow)
  const synthesisRows = rows.filter((r) => r.assumption_category);

  // Breakdowns
  const postureBreakdown   = countBy(synthesisRows, "assumption_category");
  const stageBreakdown     = countBy(synthesisRows, "campaign_stage");
  const signalGapBreakdown = countBy(synthesisRows, "signal_gap_type");
  const decisionGapBreakdown = countBy(synthesisRows, "decision_gap_type");
  const industryBreakdown  = countBy(synthesisRows, "industry");

  // Cross-tab: posture × industry (top combinations)
  const crossTab: Record<string, Record<string, number>> = {};
  for (const r of synthesisRows) {
    const p = (r.assumption_category as string) ?? "Unknown";
    const i = (r.industry as string) ?? "Unknown";
    if (!crossTab[p]) crossTab[p] = {};
    crossTab[p][i] = (crossTab[p][i] ?? 0) + 1;
  }

  // Average probe count
  const probeCounts = synthesisRows
    .map((r) => r.probe_count)
    .filter((n): n is number => typeof n === "number");
  const avgProbeCount =
    probeCounts.length === 0
      ? null
      : Math.round((probeCounts.reduce((a, b) => a + b, 0) / probeCounts.length) * 10) / 10;

  // Most common signal gap by industry (for consulting pitch targeting)
  const signalByIndustry: Record<string, Record<string, number>> = {};
  for (const r of synthesisRows) {
    const ind = (r.industry as string) ?? "Unknown";
    const sig = (r.signal_gap_type as string) ?? "Unknown";
    if (!signalByIndustry[ind]) signalByIndustry[ind] = {};
    signalByIndustry[ind][sig] = (signalByIndustry[ind][sig] ?? 0) + 1;
  }
  // Flatten to top signal per industry
  const topSignalByIndustry = Object.entries(signalByIndustry).map(([industry, signals]) => {
    const top = Object.entries(signals).sort(([, a], [, b]) => b - a)[0];
    return { industry, topSignal: top?.[0] ?? "Unknown", count: top?.[1] ?? 0 };
  }).sort((a, b) => b.count - a.count);

  // ── Bridge question library ─────────────────────────────────────────────────
  // Aggregate all bridge questions, count patterns, surface top ones.
  const bridgeMap: Record<string, number> = {};
  for (const r of synthesisRows) {
    if (!r.bridge_question) continue;
    // Normalise slightly — trim + lowercase for grouping, but return original case
    const key = r.bridge_question.trim();
    bridgeMap[key] = (bridgeMap[key] ?? 0) + 1;
  }
  const bridgeLibrary = Object.entries(bridgeMap)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── Gate friction map ───────────────────────────────────────────────────────
  // Cross-tab: campaign_stage × decision_gap_type
  // Shows where in the funnel friction is highest, and what kind of gap it is.
  const gateMap: Record<string, Record<string, number>> = {};
  const STAGE_ORDER = ["Demand", "Conversion", "Retention", "Scale"];
  for (const r of synthesisRows) {
    const stage = (r.campaign_stage as string) ?? "Unknown";
    const gap   = (r.decision_gap_type as string) ?? "Unknown";
    if (!gateMap[stage]) gateMap[stage] = {};
    gateMap[stage][gap] = (gateMap[stage][gap] ?? 0) + 1;
  }
  // Flatten to sorted gate friction entries
  const gateFriction = STAGE_ORDER
    .filter((s) => gateMap[s])
    .map((stage) => {
      const gaps = Object.entries(gateMap[stage])
        .map(([gap, count]) => ({ gap, count }))
        .sort((a, b) => b.count - a.count);
      const total = gaps.reduce((sum, g) => sum + g.count, 0);
      return { stage, total, gaps };
    });

  // ── Prospect matches — decide_session window alerts ─────────────────────────
  const { data: prospectMatches } = await supabase
    .from("window_alerts")
    .select(`
      id, trigger_reason, detected_at, is_open,
      companies:company_id ( id, name, industry, status ),
      opportunity_windows:window_id ( window_type )
    `)
    .eq("is_open", true)
    .order("detected_at", { ascending: false })
    .limit(20);

  // Filter to decide_session alerts only
  const decideAlerts = (prospectMatches ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.opportunity_windows?.window_type === "decide_session"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((a: any) => ({
    id:             a.id,
    detected_at:    a.detected_at,
    trigger_reason: a.trigger_reason,
    company_id:     a.companies?.id,
    company_name:   a.companies?.name,
    industry:       a.companies?.industry,
    status:         a.companies?.status,
  }));

  // Recent sessions (for qualitative review)
  const recent = rows.slice(0, 20).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    industry: r.industry,
    brand_category: r.brand_category,
    decision_text: r.decision_text
      ? r.decision_text.length > 160
        ? r.decision_text.slice(0, 157) + "…"
        : r.decision_text
      : null,
    posture: r.assumption_category,
    campaign_stage: r.campaign_stage,
    signal_gap_type: r.signal_gap_type,
    decision_gap_type: r.decision_gap_type,
    bridge_question: r.bridge_question,
    probe_count: r.probe_count,
    has_email: !!r.email,
    emailed: !!r.emailed_at,
  }));

  return NextResponse.json({
    summary: {
      total,
      withEmail,
      withSynthesis,
      emailed,
      emailConversionRate: pct(withEmail, total),
      synthesisCompletionRate: pct(withSynthesis, total),
      avgProbeCount,
    },
    weekly,
    postureBreakdown,
    stageBreakdown,
    signalGapBreakdown,
    decisionGapBreakdown,
    industryBreakdown,
    crossTab,
    topSignalByIndustry,
    bridgeLibrary,
    gateFriction,
    prospectMatches: decideAlerts,
    recent,
  });
}
