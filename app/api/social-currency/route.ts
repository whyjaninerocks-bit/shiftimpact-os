// app/api/social-currency/route.ts
// F23 Phase 2 — Social Currency Index (SCI)
// Sprint 20 · 17 July 2026
//
// INTERNAL run by Strategy Lead; ai_narrative is client-shareable.
//
// POST /api/social-currency
// Body: {
//   campaign_id: string,
//   week_number: number,
//   comment_depth_avg: number,   // avg comments per post this week
//   cross_platform_pct: number,  // % of content spreading to 2+ platforms
// }
//
// Scoring model (5 dimensions → sci_score 0–100):
//   D1 Save-to-Post Ratio  30%  from Signal 2 signal_2_actual_pct
//   D2 Share Velocity      25%  week-over-week Signal 2 trend
//   D3 Comment Depth       20%  manual input (comment_depth_avg)
//   D4 Cross-Platform      15%  manual input (cross_platform_pct)
//   D5 Sentiment Momentum  10%  Signal 3 demand_health
//
// Trend: Improving (+5 vs prior) · Stable · Declining (-5 vs prior)
//
// ACCESS RULES:
//   sci_score + trend_direction + ai_narrative: shareable with client
//   dimension scores + build_action: INTERNAL ONLY

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai-model";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Dimension scorers ────────────────────────────────────────────────────────

function scoreSaveRate(pct: number | null): number {
  if (pct === null || pct === undefined) return 30;
  if (pct >= 8) return 80;
  if (pct >= 5) return 60;
  if (pct >= 3) return 40;
  return 20;
}

function scoreShareVelocity(current: number | null, previous: number | null): number {
  if (current === null || previous === null) return 50; // insufficient data
  const delta = current - previous;
  if (delta > 1)  return 80; // improving
  if (delta < -1) return 20; // declining
  return 50; // flat
}

function scoreCommentDepth(avg: number): number {
  if (avg >= 50) return 80;
  if (avg >= 20) return 60;
  if (avg >= 5)  return 40;
  return 20;
}

function scoreCrossPlatform(pct: number): number {
  if (pct >= 30) return 80;
  if (pct >= 15) return 60;
  if (pct >= 5)  return 40;
  return 20;
}

function scoreSentimentMomentum(health: string | null): number {
  if (health === "Green") return 80;
  if (health === "Amber") return 50;
  if (health === "Red")   return 20;
  return 30; // no data
}

function computeSci(
  save: number,
  share: number,
  comment: number,
  cross: number,
  sentiment: number
): number {
  return Math.round(
    save      * 0.30 +
    share     * 0.25 +
    comment   * 0.20 +
    cross     * 0.15 +
    sentiment * 0.10
  );
}

function computeTrend(current: number, previous: number | null): "Improving" | "Stable" | "Declining" {
  if (previous === null) return "Stable";
  if (current >= previous + 5) return "Improving";
  if (current <= previous - 5) return "Declining";
  return "Stable";
}

// ─── AI tool schema ───────────────────────────────────────────────────────────

const SCI_TOOL = {
  name: "submit_social_currency_index",
  description: "Submit the Social Currency Index narrative and build action.",
  input_schema: {
    type: "object" as const,
    properties: {
      ai_narrative: {
        type: "string",
        description: "3–4 sentences. Plain-language assessment of the brand's social currency — how well content is generating genuine sharing and conversation. Written for a marketer. Directional language only, no scores or dimension names. May be shared with the client.",
      },
      build_action: {
        type: "string",
        description: "INTERNAL. 1–2 sentences. The single highest-leverage action the strategy team should prioritise in the next 2 weeks to improve Social Currency. Specific and actionable — not generic advice.",
      },
    },
    required: ["ai_narrative", "build_action"],
  },
} as const;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_id,
      week_number,
      comment_depth_avg = 0,
      cross_platform_pct = 0,
    } = body;

    if (!campaign_id || week_number === undefined || week_number === null) {
      return NextResponse.json(
        { error: "campaign_id and week_number are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Load campaign context
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, clients(name)")
      .eq("id", campaign_id)
      .single();

    const clientName = (campaign?.clients as { name: string } | null)?.name ?? "Brand";

    // 2. Load Signal 2 + Signal 3 data (last 2 weeks for trend)
    const { data: signalRows } = await supabase
      .from("signal_weekly_reports")
      .select("week_number, signal_2_actual_pct, demand_health")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(2);

    const currentWeekSignal = signalRows?.[0] ?? null;
    const previousWeekSignal = signalRows?.[1] ?? null;

    const currentSave2 = currentWeekSignal?.signal_2_actual_pct ?? null;
    const previousSave2 = previousWeekSignal?.signal_2_actual_pct ?? null;
    const demandHealth = currentWeekSignal?.demand_health ?? null;

    // 3. Score each dimension
    const saveScore      = scoreSaveRate(currentSave2);
    const shareScore     = scoreShareVelocity(currentSave2, previousSave2);
    const commentScore   = scoreCommentDepth(comment_depth_avg);
    const crossScore     = scoreCrossPlatform(cross_platform_pct);
    const sentimentScore = scoreSentimentMomentum(demandHealth);

    // 4. Compute composite
    const sciScore = computeSci(saveScore, shareScore, commentScore, crossScore, sentimentScore);

    // 5. Determine trend vs prior week's SCI
    const { data: priorScore } = await supabase
      .from("social_currency_scores")
      .select("sci_score")
      .eq("campaign_id", campaign_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const trendDirection = computeTrend(sciScore, priorScore?.sci_score ?? null);

    // 6. Run AI inference
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_social_currency", "claude-sonnet-4-6");

    const systemPrompt = `You are a social currency strategist embedded in ShiftImpact OS. Social currency is the degree to which a brand's content earns genuine sharing, saving, and conversation — as opposed to passive impressions.

Your role is to translate signal data into a clear picture of how much real social currency the brand is building, and what to do next. Write for an intelligent marketer, not a data analyst. Be specific to this brand and moment.`;

    const userPrompt = `BRAND: ${clientName}
CAMPAIGN: ${campaign?.name ?? "Campaign"}
WEEK: ${week_number}

── SOCIAL CURRENCY SIGNAL INPUTS ──
Signal 2 Save Rate (current week): ${currentSave2 !== null ? `${currentSave2}%` : "No data"}
Signal 2 Save Rate (previous week): ${previousSave2 !== null ? `${previousSave2}%` : "No data"}
Signal 3 Demand Health (UGC quality): ${demandHealth ?? "No data"}
Comment Depth (avg comments / post): ${comment_depth_avg}
Cross-Platform Propagation: ${cross_platform_pct}%

── DIMENSION SCORES ──
Save-to-Post Ratio Score: ${saveScore}/100 (weight 30%)
Share Velocity Score: ${shareScore}/100 (weight 25%)
Comment Depth Score: ${commentScore}/100 (weight 20%)
Cross-Platform Score: ${crossScore}/100 (weight 15%)
Sentiment Momentum Score: ${sentimentScore}/100 (weight 10%)

── COMPOSITE ──
Social Currency Index: ${sciScore}/100
Trend vs previous: ${trendDirection}

── TASK ──
Write a 3–4 sentence client-safe narrative on the brand's social currency posture this week.
Then identify the single most important build action the strategy team should prioritise.`;

    const aiResponse = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: systemPrompt,
      tools: [SCI_TOOL],
      tool_choice: { type: "tool", name: "submit_social_currency_index" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("AI did not return a tool_use block");
    }

    const aiResult = toolBlock.input as {
      ai_narrative: string;
      build_action: string;
    };

    // 7. Save to DB
    const { data: saved, error: saveErr } = await supabase
      .from("social_currency_scores")
      .insert({
        campaign_id,
        week_number,
        comment_depth_avg,
        cross_platform_pct,
        save_to_post_ratio_score: saveScore,
        share_velocity_score:     shareScore,
        comment_depth_score:      commentScore,
        cross_platform_score:     crossScore,
        sentiment_momentum_score: sentimentScore,
        sci_score:                sciScore,
        trend_direction:          trendDirection,
        ai_narrative:             aiResult.ai_narrative,
        build_action:             aiResult.build_action,
      })
      .select("id, created_at")
      .single();

    if (saveErr) {
      console.error("/api/social-currency save error:", saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      id:            saved?.id,
      campaign_id,
      week_number,
      // Dimension inputs (INTERNAL)
      comment_depth_avg,
      cross_platform_pct,
      // Dimension scores (INTERNAL)
      save_to_post_ratio_score: saveScore,
      share_velocity_score:     shareScore,
      comment_depth_score:      commentScore,
      cross_platform_score:     crossScore,
      sentiment_momentum_score: sentimentScore,
      // Composite (shareable)
      sci_score:       sciScore,
      trend_direction: trendDirection,
      // AI outputs
      ai_narrative:  aiResult.ai_narrative,
      build_action:  aiResult.build_action, // INTERNAL
      created_at:    saved?.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/social-currency error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
