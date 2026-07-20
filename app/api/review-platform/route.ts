// app/api/review-platform/route.ts
// Review Platform Intelligence — Google Reviews + TripAdvisor
// Sprint 30 · 20 July 2026
//
// INTERNAL run by Strategy Lead; ai_narrative is client-shareable.
//
// POST /api/review-platform
// Body: {
//   campaign_id: string,
//   week_number: number,
//   google_rating: number,                  // current overall (e.g. 4.3)
//   google_review_count_total: number,
//   google_review_count_period: number,     // new reviews this week
//   google_avg_rating_period: number,       // avg rating of new reviews
//   tripadvisor_rating?: number,            // hospitality + F&B — omit if not applicable
//   tripadvisor_review_count_total?: number,
//   tripadvisor_review_count_period?: number,
//   tripadvisor_avg_rating_period?: number,
//   sentiment_positive_pct: number,         // % positive across both platforms
//   sentiment_neutral_pct: number,
//   sentiment_negative_pct: number,
//   management_response_rate_pct: number,   // % reviews responded to in last 30 days
//   top_positive_themes: string[],          // max 3
//   top_negative_themes: string[],          // max 3
// }
//
// Scoring model:
//   If TripAdvisor present:
//     Google rating score     35%
//     TripAdvisor score       25%
//     Sentiment score         25%
//     Response rate score     15%
//   If Google only:
//     Google rating score     45%
//     Sentiment score         30%
//     Response rate score     25%
//
// Rating normalisation: score = ((rating - 1) / 4) × 100
//   5.0 → 100 · 4.5 → 87.5 · 4.0 → 75 · 3.5 → 62.5 · 3.0 → 50 · <3.0 → red zone
//
// Trend: Improving (+5 vs prior) · Stable · Declining (-5 vs prior)
//
// ACCESS RULES:
//   review_health_score + trend_direction + ai_narrative: shareable with client
//   dimension scores + action_recommendation: INTERNAL ONLY

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

// ─── Scorers ──────────────────────────────────────────────────────────────────

function scoreRating(rating: number | null | undefined): number {
  if (rating == null) return 0;
  // Normalise 1–5 scale to 0–100
  return Math.round(((rating - 1) / 4) * 100);
}

function scoreSentiment(positivePct: number): number {
  // Positive sentiment directly maps: 80%+ positive → 80 score, etc.
  if (positivePct >= 85) return 90;
  if (positivePct >= 75) return 75;
  if (positivePct >= 65) return 60;
  if (positivePct >= 50) return 45;
  return 25;
}

function scoreResponseRate(rate: number): number {
  if (rate >= 90) return 90;
  if (rate >= 70) return 75;
  if (rate >= 50) return 55;
  if (rate >= 30) return 35;
  return 15;
}

function computeHealthScore(
  googleScore: number,
  taScore: number | null,
  sentimentScore: number,
  responseScore: number
): number {
  if (taScore !== null) {
    return Math.round(
      googleScore    * 0.35 +
      taScore        * 0.25 +
      sentimentScore * 0.25 +
      responseScore  * 0.15
    );
  }
  return Math.round(
    googleScore    * 0.45 +
    sentimentScore * 0.30 +
    responseScore  * 0.25
  );
}

function computeTrend(
  current: number,
  previous: number | null
): "Improving" | "Stable" | "Declining" {
  if (previous === null) return "Stable";
  if (current >= previous + 5) return "Improving";
  if (current <= previous - 5) return "Declining";
  return "Stable";
}

function healthLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "On Track";
  if (score >= 50) return "Building";
  return "Needs Focus";
}

// ─── AI tool schema ───────────────────────────────────────────────────────────

const REVIEW_TOOL = {
  name: "submit_review_intelligence",
  description: "Submit the Review Platform Intelligence narrative and action recommendation.",
  input_schema: {
    type: "object" as const,
    properties: {
      ai_narrative: {
        type: "string",
        description:
          "3–4 sentences. Plain-language assessment of the brand's review health this week — what the reviews are telling us about customer experience, what's driving sentiment, and how review performance connects to the campaign's business objectives. Written for a brand marketer. Directional language. No scores or technical metric names. May be shared with the client.",
      },
      action_recommendation: {
        type: "string",
        description:
          "INTERNAL. 1–2 sentences. The single highest-leverage action the strategy or client team should prioritise in the next 2 weeks to improve review health. Be specific about what to do, who should do it, and why it will move the score.",
      },
    },
    required: ["ai_narrative", "action_recommendation"],
  },
} as const;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_id,
      week_number,
      google_rating,
      google_review_count_total = 0,
      google_review_count_period = 0,
      google_avg_rating_period,
      tripadvisor_rating,
      tripadvisor_review_count_total,
      tripadvisor_review_count_period,
      tripadvisor_avg_rating_period,
      sentiment_positive_pct = 0,
      sentiment_neutral_pct = 0,
      sentiment_negative_pct = 0,
      management_response_rate_pct = 0,
      top_positive_themes = [],
      top_negative_themes = [],
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

    const clientName =
      (campaign?.clients as { name: string } | null)?.name ?? "Brand";

    // 2. Score each dimension
    const googleScore    = scoreRating(google_rating);
    const taScore        = tripadvisor_rating != null ? scoreRating(tripadvisor_rating) : null;
    const sentimentScore = scoreSentiment(sentiment_positive_pct);
    const responseScore  = scoreResponseRate(management_response_rate_pct);

    // 3. Composite health score
    const reviewHealthScore = computeHealthScore(
      googleScore,
      taScore,
      sentimentScore,
      responseScore
    );

    // 4. Trend vs prior week
    const { data: priorRow } = await supabase
      .from("review_platform_scores")
      .select("review_health_score")
      .eq("campaign_id", campaign_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const trendDirection = computeTrend(
      reviewHealthScore,
      priorRow?.review_health_score ?? null
    );

    // 5. Run AI inference
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_review_platform", "claude-sonnet-4-6");

    const hasTripAdvisor = tripadvisor_rating != null;

    const systemPrompt = `You are a brand reputation strategist embedded in ShiftImpact OS. You specialise in translating structured customer review data into clear, actionable intelligence for brand and marketing teams.

Your role: explain what the reviews are telling us about the customer experience, how sentiment and themes connect to the campaign's objectives, and what the most important next action is. Be specific to this brand and category. Do not summarise data — interpret it.`;

    const userPrompt = `BRAND: ${clientName}
CAMPAIGN: ${campaign?.name ?? "Campaign"}
WEEK: ${week_number}
CATEGORY: ${hasTripAdvisor ? "Hospitality / F&B" : "General"}

── REVIEW PLATFORM INPUTS ──
Google Rating: ${google_rating ?? "Not provided"}/5.0
Google Reviews (total): ${google_review_count_total}
Google Reviews (this week): ${google_review_count_period}
Google Avg Rating (this week): ${google_avg_rating_period ?? "Not provided"}/5.0

${hasTripAdvisor ? `TripAdvisor Rating: ${tripadvisor_rating}/5.0
TripAdvisor Reviews (total): ${tripadvisor_review_count_total ?? 0}
TripAdvisor Reviews (this week): ${tripadvisor_review_count_period ?? 0}
TripAdvisor Avg Rating (this week): ${tripadvisor_avg_rating_period ?? "Not provided"}/5.0` : "TripAdvisor: Not provided for this campaign"}

── SENTIMENT BREAKDOWN ──
Positive: ${sentiment_positive_pct}%
Neutral: ${sentiment_neutral_pct}%
Negative: ${sentiment_negative_pct}%

── MANAGEMENT RESPONSE RATE ──
${management_response_rate_pct}% of reviews responded to in last 30 days

── TOP THEMES (from review content) ──
Positive: ${top_positive_themes.length > 0 ? top_positive_themes.join(", ") : "None identified"}
Negative: ${top_negative_themes.length > 0 ? top_negative_themes.join(", ") : "None identified"}

── COMPOSITE ──
Review Health Score: ${reviewHealthScore}/100 (${healthLabel(reviewHealthScore)})
Trend vs previous: ${trendDirection}

── TASK ──
Write a 3–4 sentence client-safe narrative interpreting the review intelligence this week.
Then identify the single most important action to improve review health in the next 2 weeks.`;

    const aiResponse = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: systemPrompt,
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "submit_review_intelligence" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("AI did not return a tool_use block");
    }

    const aiResult = toolBlock.input as {
      ai_narrative: string;
      action_recommendation: string;
    };

    // 6. Save to DB
    const { data: saved, error: saveErr } = await supabase
      .from("review_platform_scores")
      .upsert(
        {
          campaign_id,
          week_number,
          google_rating,
          google_review_count_total,
          google_review_count_period,
          google_avg_rating_period,
          tripadvisor_rating:              tripadvisor_rating ?? null,
          tripadvisor_review_count_total:  tripadvisor_review_count_total ?? null,
          tripadvisor_review_count_period: tripadvisor_review_count_period ?? null,
          tripadvisor_avg_rating_period:   tripadvisor_avg_rating_period ?? null,
          sentiment_positive_pct,
          sentiment_neutral_pct,
          sentiment_negative_pct,
          management_response_rate_pct,
          top_positive_themes,
          top_negative_themes,
          review_health_score: reviewHealthScore,
          trend_direction:     trendDirection,
          ai_narrative:        aiResult.ai_narrative,
          action_recommendation: aiResult.action_recommendation,
        },
        { onConflict: "campaign_id,week_number" }
      )
      .select("id, created_at")
      .single();

    if (saveErr) {
      console.error("/api/review-platform save error:", saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      id:          saved?.id,
      campaign_id,
      week_number,
      // Scores (INTERNAL)
      google_score:     googleScore,
      ta_score:         taScore,
      sentiment_score:  sentimentScore,
      response_score:   responseScore,
      // Composite (shareable)
      review_health_score: reviewHealthScore,
      health_label:        healthLabel(reviewHealthScore),
      trend_direction:     trendDirection,
      // AI outputs
      ai_narrative:          aiResult.ai_narrative,
      action_recommendation: aiResult.action_recommendation, // INTERNAL
      created_at:            saved?.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/review-platform error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
