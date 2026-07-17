// app/api/ai-brand-visibility/route.ts
// F23 Phase 1 — AI Brand Visibility Layer
// Sprint 19 · 17 July 2026
//
// INTERNAL ONLY — never expose eligibility_score, trust gap matrix,
// or competitor data to any client-facing route.
//
// POST /api/ai-brand-visibility
// Body: { campaign_id, cep_count, information_consistency_score, ai_visibility_observations }
//
// Scoring model (Phase 1):
//   D1 UGC Depth         30% — derived from most recent demand_health (Signal 3)
//   D2 Sentiment Clarity 25% — derived from overall signal health average
//   D3 CEP Breadth       20% — derived from cep_count manual input
//   D4 Search Intent     15% — derived from most recent conversion_health (Signal 1)
//   D5 Info Consistency  10% — manual input (0–100)
//
// Band thresholds: 90–100 AI-Ready · 70–89 Developing · 50–69 Emerging · <50 At Risk
//
// Returns: AiBrandVisibilityScore saved to DB

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

// ─── Health → Score mapping ───────────────────────────────────────────────────

function healthToScore(health: string | null | undefined): number {
  if (health === "Green") return 80;
  if (health === "Amber") return 50;
  if (health === "Red")   return 20;
  return 30; // no data / not assessed
}

// ─── CEP count → breadth score ───────────────────────────────────────────────

function cepToScore(count: number): number {
  if (count === 0)       return 10;
  if (count <= 2)        return 40;
  if (count <= 4)        return 65;
  return 85;
}

// ─── Eligibility computation ─────────────────────────────────────────────────

function computeEligibility(
  ugc: number,
  sentiment: number,
  cep: number,
  search: number,
  consistency: number
): { score: number; band: string } {
  const score = Math.round(
    ugc        * 0.30 +
    sentiment  * 0.25 +
    cep        * 0.20 +
    search     * 0.15 +
    consistency * 0.10
  );

  let band: string;
  if (score >= 90)      band = "AI-Ready";
  else if (score >= 70) band = "Developing";
  else if (score >= 50) band = "Emerging";
  else                  band = "At Risk";

  return { score, band };
}

// ─── AI Tool Schema ───────────────────────────────────────────────────────────

const AI_VISIBILITY_TOOL = {
  name: "submit_ai_visibility_assessment",
  description: "Submit the AI Brand Visibility trust gap diagnosis and narrative.",
  input_schema: {
    type: "object" as const,
    properties: {
      trust_gap_owned: {
        type: "string",
        description: "The most significant gap in owned content or brand information that reduces AI recommendation eligibility. 1–2 sentences. Specific to this brand/campaign.",
      },
      trust_gap_cep: {
        type: "string",
        description: "The most significant gap in Category Entry Point coverage that limits when and how AI tools recommend this brand. 1–2 sentences. Specific to this brand/category.",
      },
      priority_action: {
        type: "string",
        description: "The single highest-leverage action the brand should take in the next 30 days to improve AI recommendation eligibility. Concrete and specific — not generic advice.",
      },
      ai_narrative: {
        type: "string",
        description: "3–4 sentences. Plain-language assessment of the brand's current AI visibility posture. Written for a marketer, not a technologist. No scores or band labels — directional language only. May be shared with the client.",
      },
    },
    required: ["trust_gap_owned", "trust_gap_cep", "priority_action", "ai_narrative"],
  },
} as const;

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the AI Brand Visibility Intelligence embedded in ShiftImpact OS.

Your job is to assess a brand's current readiness to be recommended by AI tools — ChatGPT, Google AI Overviews, Perplexity, Gemini, and TikTok Search.

## CONTEXT ON AI RECOMMENDATION ELIGIBILITY

Brands are recommended by AI tools when they have:
1. **UGC Depth**: Rich, authentic user-generated content that AI tools can reference (Signal 3 — organic UGC volume)
2. **Sentiment Clarity**: Consistent, unambiguous brand sentiment across social content (Signal 2 — save rate as sentiment proxy)
3. **CEP Breadth**: Coverage of multiple Category Entry Points — the buying situations consumers use when they'd reach for this category
4. **Search Intent Alignment**: Strong branded search signals that tell AI tools the brand is top-of-mind for its category (Signal 1)
5. **Information Consistency**: Accurate, consistent brand information across owned platforms (website, Google Business, social bios, product descriptions)

## TRUST GAP DIAGNOSIS

Two types of gaps reduce AI recommendation eligibility:
- **Owned Gap**: Brand's own content, website, or information architecture fails to give AI tools enough to work with
- **CEP Gap**: Brand is missing from key buying moments that consumers use as mental shortcuts when reaching for the category

## OUTPUT RULES
- trust_gap_owned and trust_gap_cep must be SPECIFIC to this brand and campaign — not generic
- priority_action must be concrete: what exactly to do, not "create more content"
- ai_narrative is client-shareable: write it for a marketer, use directional language only, no score numbers or band labels
- Never mention competitors in any output field`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_id,
      cep_count = 0,
      information_consistency_score = 50,
      ai_visibility_observations = "",
    } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Load campaign + client
    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("name, clients(name)")
      .eq("id", campaign_id)
      .maybeSingle();

    if (cErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const clientName = (campaign.clients as { name: string } | null)?.name ?? "Unknown Brand";

    // 2. Load most recent signal weekly report (for health statuses)
    const { data: signalReports } = await supabase
      .from("signal_weekly_reports")
      .select("week_number, demand_health, nurture_health, conversion_health, ai_narrative")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(1);

    const latestReport = signalReports?.[0] ?? null;

    // 3. Load BIP for context
    const { data: bip } = await supabase
      .from("big_idea_platforms")
      .select("topline_idea, cultural_tension, brand_role")
      .eq("campaign_id", campaign_id)
      .single();

    // 4. Compute dimension scores
    const ugcDepthScore      = healthToScore(latestReport?.demand_health);
    const sentimentScore     = latestReport
      ? Math.round(
          (healthToScore(latestReport.demand_health)    +
           healthToScore(latestReport.nurture_health)   +
           healthToScore(latestReport.conversion_health)) / 3
        )
      : 30;
    const cepBreadthScore    = cepToScore(cep_count);
    const searchIntentScore  = healthToScore(latestReport?.conversion_health);

    // 5. Compute eligibility
    const { score: eligibilityScore, band: eligibilityBand } = computeEligibility(
      ugcDepthScore,
      sentimentScore,
      cepBreadthScore,
      searchIntentScore,
      information_consistency_score
    );

    // 6. Build AI prompt
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_ai_visibility", "claude-sonnet-4-6");

    const userPrompt = `BRAND: ${clientName}
CAMPAIGN: ${campaign.name}
INDUSTRY: Not specified

── BIG IDEA PLATFORM ──
Topline Idea: ${bip?.topline_idea ?? "Not filled"}
Cultural Tension: ${bip?.cultural_tension ?? "Not filled"}
Brand Role: ${bip?.brand_role ?? "Not filled"}

── AI VISIBILITY INPUTS ──
UGC Depth Score: ${ugcDepthScore}/100 (Signal 3 health: ${latestReport?.demand_health ?? "No data"})
Sentiment Clarity Score: ${sentimentScore}/100 (avg of signal health statuses)
CEP Breadth Score: ${cepBreadthScore}/100 (${cep_count} Category Entry Points mapped)
Search Intent Score: ${searchIntentScore}/100 (Signal 1 health: ${latestReport?.conversion_health ?? "No data"})
Information Consistency: ${information_consistency_score}/100 (manual assessment)

── OVERALL ELIGIBILITY ──
Score: ${eligibilityScore}/100
Band: ${eligibilityBand}

── STRATEGY LEAD OBSERVATIONS ──
${ai_visibility_observations || "No observations noted."}

── CURRENT SIGNAL NARRATIVE ──
${latestReport?.ai_narrative ?? "No signal report available yet."}

── TASK ──
Diagnose the two trust gaps (owned and CEP) specific to this brand and its campaign context.
Identify the single highest-leverage action for the next 30 days.
Write a 3–4 sentence client-friendly narrative about AI visibility posture.`;

    const aiResponse = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      tools: [AI_VISIBILITY_TOOL],
      tool_choice: { type: "tool", name: "submit_ai_visibility_assessment" },
      messages: [{ role: "user", content: userPrompt }],
    });

    // 7. Extract tool use result
    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("AI did not return a tool_use block");
    }

    const result = toolBlock.input as {
      trust_gap_owned: string;
      trust_gap_cep: string;
      priority_action: string;
      ai_narrative: string;
    };

    // 8. Save to DB
    const { data: saved, error: saveErr } = await supabase
      .from("ai_brand_visibility_scores")
      .insert({
        campaign_id,
        cep_count,
        information_consistency_score,
        ai_visibility_observations,
        ugc_depth_score:         ugcDepthScore,
        sentiment_clarity_score: sentimentScore,
        cep_breadth_score:       cepBreadthScore,
        search_intent_score:     searchIntentScore,
        eligibility_score:       eligibilityScore,
        eligibility_band:        eligibilityBand,
        trust_gap_owned:         result.trust_gap_owned,
        trust_gap_cep:           result.trust_gap_cep,
        priority_action:         result.priority_action,
        ai_narrative:            result.ai_narrative,
        status:                  "ready",
      })
      .select("id, created_at")
      .single();

    if (saveErr) {
      console.error("/api/ai-brand-visibility save error:", saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      id:                      saved?.id,
      campaign_id,
      cep_count,
      information_consistency_score,
      ugc_depth_score:         ugcDepthScore,
      sentiment_clarity_score: sentimentScore,
      cep_breadth_score:       cepBreadthScore,
      search_intent_score:     searchIntentScore,
      eligibility_score:       eligibilityScore,
      eligibility_band:        eligibilityBand,
      trust_gap_owned:         result.trust_gap_owned,
      trust_gap_cep:           result.trust_gap_cep,
      priority_action:         result.priority_action,
      ai_narrative:            result.ai_narrative,
      created_at:              saved?.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/ai-brand-visibility error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
