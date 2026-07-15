// app/api/cross-channel-report/route.ts
// Feature 13 — Cross-Channel Campaign Intelligence Hub (Sprint 3)
// INTERNAL ONLY — never called from or exposed to Client Interface (/portal/*).
//
// POST /api/cross-channel-report
// Loads campaign channels + this week's metrics, calls Claude Haiku
// for cross-channel narrative, saves back to cross_channel_reports.
//
// Auth: service role (Supabase JWT) — strategy lead and Janine only.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase admin client ────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RagStatus = "Green" | "Amber" | "Red";
type FunnelRole = "Demand" | "Nurture" | "Conversion" | "Retention";

interface CrossChannelReportRequest {
  campaign_id: string;
  week_number: number;
}

interface ChannelWithProfile {
  id: string;
  channel_role: FunnelRole;
  is_primary: boolean;
  signal_proxy_label: string;
  budget_allocation_pct: number | null;
  channel_profiles: {
    channel_name: string;
    channel_class: string;
    attention_type: string;
    dwell_time_band: string;
    content_format: string;
    primary_funnel_stage: string;
  } | null;
}

interface ChannelMetric {
  campaign_channel_id: string;
  week_number: number;
  signal_proxy_value: number | null;
  signal_proxy_label: string;
  channel_health: RagStatus;
  engagement_rate_pct: number | null;
  notes: string;
}

interface CrossChannelReportRow {
  id: string;
  budget_allocated: number | null;
  budget_deployed: number | null;
  idea_integrity_note: string;
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the ShiftImpact OS Cross-Channel Intelligence engine — an internal tool for Janine and strategy leads only.

Your job is to synthesise the week's signal data ACROSS all active channels and produce a coherent cross-channel read: not individual channel assessments, but what the COMBINATION of channels tells us about how the campaign idea is travelling through the market.

CRITICAL RULES:
1. Write for strategy leads who understand FRAME methodology and the idea integrity concept.
2. Be direct and diagnostic. No motivational language.
3. Your primary lens is: Is the Big Idea being expressed distinctly and coherently through every channel, or is it fragmenting?
4. Idea Integrity is NOT about whether all channels are Green. It is about whether each channel is expressing the same campaign idea through a format appropriate to its attention type and funnel role.
5. A Demand channel (long dwell, passive) and a Conversion channel (short dwell, high action affordance) will LOOK different — that's correct. They should feel like the same idea wearing different clothes for different moments.
6. Flag funnel gaps: which funnel stage has the most critical shortfall based on channel health patterns across that stage's channels?
7. Recommended actions must be cross-channel in nature — not "fix TikTok's save rate" but "the Nurture stage is leaking: both TikTok and Instagram Reels show Red save rates while Search is Green — audience is converting before they've been nurtured."

OUTPUT FORMAT (JSON — no markdown fences):
{
  "narrative": "2-3 paragraphs. The cross-channel intelligence read. What does the combination of channel signals tell us this week?",
  "recommended_actions": ["cross-channel action 1", "cross-channel action 2", "cross-channel action 3"],
  "idea_integrity_score": <integer 1-5>,
  "dominant_funnel_gap": "<Demand|Nurture|Conversion|Retention|None>"
}

Idea Integrity scoring:
1 = Fragmented — channels appear to be running different campaigns
2 = Inconsistent — some coherence, significant drift in 1+ channels
3 = Mostly coherent — the idea is present but diluted in key channels
4 = Coherent — the idea is holding across all primary channels
5 = Fully coherent — every channel expresses the same idea in a format-appropriate way`;
}

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(
  campaignName: string,
  weekNumber: number,
  channels: ChannelWithProfile[],
  metricsByChannelId: Record<string, ChannelMetric>,
  budgetAllocated: number | null,
  budgetDeployed: number | null,
  ideaIntegrityNote: string
): string {
  const FUNNEL_ORDER: FunnelRole[] = ["Demand", "Nurture", "Conversion", "Retention"];

  // Build channel breakdown grouped by role
  const channelLines: string[] = [];
  for (const role of FUNNEL_ORDER) {
    const roleChannels = channels.filter(c => c.channel_role === role);
    if (roleChannels.length === 0) continue;

    channelLines.push(`\n[${role.toUpperCase()} CHANNELS]`);
    for (const ch of roleChannels) {
      const profile = ch.channel_profiles;
      const metric = metricsByChannelId[ch.id];
      const channelName = profile?.channel_name ?? "Unknown Channel";
      const health = metric?.channel_health ?? "No data";
      const spValue = metric?.signal_proxy_value != null
        ? `${metric.signal_proxy_value}`
        : "Not reported";
      const spLabel = ch.signal_proxy_label || metric?.signal_proxy_label || "Signal proxy";
      const engRate = metric?.engagement_rate_pct != null
        ? `${metric.engagement_rate_pct}% engagement`
        : null;
      const notes = metric?.notes || "";
      const budget = ch.budget_allocation_pct ? `${ch.budget_allocation_pct}% of budget` : null;

      channelLines.push(
        `  • ${channelName}${ch.is_primary ? " [PRIMARY]" : ""}` +
        ` | Class: ${profile?.channel_class ?? "—"}` +
        ` | Attention: ${profile?.attention_type ?? "—"}` +
        ` | Format: ${profile?.content_format ?? "—"}` +
        `\n    Health: ${health}` +
        ` | ${spLabel}: ${spValue}` +
        (engRate ? ` | ${engRate}` : "") +
        (budget ? ` | ${budget}` : "") +
        (notes ? `\n    Note: ${notes}` : "")
      );
    }
  }

  // Summarise health pattern
  const healthSummary: Record<string, { green: number; amber: number; red: number; noData: number }> = {};
  for (const role of FUNNEL_ORDER) {
    healthSummary[role] = { green: 0, amber: 0, red: 0, noData: 0 };
  }
  for (const ch of channels) {
    const metric = metricsByChannelId[ch.id];
    const role = ch.channel_role;
    if (!metric) {
      healthSummary[role].noData++;
    } else if (metric.channel_health === "Green") {
      healthSummary[role].green++;
    } else if (metric.channel_health === "Amber") {
      healthSummary[role].amber++;
    } else {
      healthSummary[role].red++;
    }
  }

  const healthSummaryLines = FUNNEL_ORDER
    .filter(r => channels.some(c => c.channel_role === r))
    .map(r => {
      const s = healthSummary[r];
      return `  ${r}: ${s.green}G / ${s.amber}A / ${s.red}R${s.noData > 0 ? ` / ${s.noData} no data` : ""}`;
    });

  // Budget utilisation
  const budgetLine =
    budgetAllocated && budgetDeployed
      ? `\nBUDGET: RM${budgetAllocated.toLocaleString()} allocated | RM${budgetDeployed.toLocaleString()} deployed | ${Math.round((budgetDeployed / budgetAllocated) * 100)}% utilisation`
      : "";

  // Strategy lead's integrity observation
  const integrityLine = ideaIntegrityNote
    ? `\nSTRATEGY LEAD OBSERVATION ON IDEA INTEGRITY: "${ideaIntegrityNote}"`
    : "";

  return `CAMPAIGN: ${campaignName}
WEEK: ${weekNumber}
${budgetLine}

FUNNEL HEALTH SUMMARY:
${healthSummaryLines.join("\n")}

CHANNEL DETAIL:
${channelLines.join("\n")}
${integrityLine}

Generate the cross-channel intelligence report for this week.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: CrossChannelReportRequest = await req.json();
    const { campaign_id, week_number } = body;

    if (!campaign_id || !week_number) {
      return NextResponse.json(
        { error: "campaign_id and week_number are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Load campaign name
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name")
      .eq("id", campaign_id)
      .single();
    const campaignName = campaign?.name ?? "Campaign";

    // 2. Load active campaign channels with profile data
    const { data: channels, error: chErr } = await supabase
      .from("campaign_channels")
      .select(`
        id, channel_role, is_primary, signal_proxy_label, budget_allocation_pct,
        channel_profiles (
          channel_name, channel_class, attention_type, dwell_time_band,
          content_format, primary_funnel_stage
        )
      `)
      .eq("campaign_id", campaign_id)
      .eq("active", true)
      .order("channel_role")
      .order("is_primary", { ascending: false });

    if (chErr) {
      return NextResponse.json({ error: chErr.message }, { status: 500 });
    }

    if (!channels || channels.length === 0) {
      return NextResponse.json(
        { error: "No active channels found for this campaign. Set up channels first." },
        { status: 404 }
      );
    }

    // 3. Load this week's channel metrics
    const { data: metrics, error: mErr } = await supabase
      .from("channel_weekly_metrics")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number);

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    // Index metrics by campaign_channel_id for O(1) lookup
    const metricsByChannelId: Record<string, ChannelMetric> = {};
    for (const m of metrics ?? []) {
      metricsByChannelId[m.campaign_channel_id] = m as ChannelMetric;
    }

    // 4. Load existing cross_channel_report (for budget and integrity note)
    const { data: existingReport } = await supabase
      .from("cross_channel_reports")
      .select("id, budget_allocated, budget_deployed, idea_integrity_note")
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number)
      .maybeSingle();

    const budgetAllocated = (existingReport as CrossChannelReportRow | null)?.budget_allocated ?? null;
    const budgetDeployed = (existingReport as CrossChannelReportRow | null)?.budget_deployed ?? null;
    const ideaIntegrityNote = (existingReport as CrossChannelReportRow | null)?.idea_integrity_note ?? "";

    // 5. Call Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(
            campaignName,
            week_number,
            channels as ChannelWithProfile[],
            metricsByChannelId,
            budgetAllocated,
            budgetDeployed,
            ideaIntegrityNote
          ),
        },
      ],
    });

    const rawContent = aiResponse.content[0];
    if (rawContent.type !== "text") {
      throw new Error("Unexpected AI response type");
    }

    // 6. Parse AI JSON output
    let narrative = "";
    let recommendedActions: string[] = [];
    let ideaIntegrityScore: number | null = null;
    let dominantFunnelGap: string | null = null;

    try {
      const cleaned = rawContent.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      narrative = parsed.narrative ?? "";
      recommendedActions = Array.isArray(parsed.recommended_actions)
        ? parsed.recommended_actions
        : [];
      ideaIntegrityScore =
        typeof parsed.idea_integrity_score === "number" &&
        parsed.idea_integrity_score >= 1 &&
        parsed.idea_integrity_score <= 5
          ? parsed.idea_integrity_score
          : null;
      const gap = parsed.dominant_funnel_gap;
      dominantFunnelGap =
        ["Demand", "Nurture", "Conversion", "Retention", "None"].includes(gap)
          ? gap
          : null;
    } catch {
      narrative = rawContent.text;
      recommendedActions = [];
    }

    // 7. Save AI outputs back to cross_channel_reports
    // Upsert in case the row doesn't exist yet (race condition)
    // The record was already created by the upsertCrossChannelReport server action
    // (called first in handleSubmitWeek and awaited). Use update() not upsert():
    // - upsert INSERT path would fail (week_of NOT NULL, no default, not in payload)
    // - update() is correct — record is guaranteed to exist at this point
    // - week_of, budget, idea_integrity_note are left untouched (set by the server action)
    const { error: updateErr } = await supabase
      .from("cross_channel_reports")
      .update({
        ai_narrative: narrative,
        ai_recommended_actions: JSON.stringify(recommendedActions),
        idea_integrity_score: ideaIntegrityScore,
        dominant_funnel_gap: dominantFunnelGap,
      })
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number);

    if (updateErr) {
      console.error("Failed to save cross-channel report:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 8. Return the full result
    return NextResponse.json({
      week_number,
      ai_narrative: narrative,
      ai_recommended_actions: recommendedActions,
      idea_integrity_score: ideaIntegrityScore,
      dominant_funnel_gap: dominantFunnelGap,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/cross-channel-report error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
