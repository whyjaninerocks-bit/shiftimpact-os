import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Clarity Signal™ System Prompt ───────────────────────────────────────────
// Executive Decision Intelligence Engine
// PURPOSE: Create executive clarity. Not diagnosis. Not consultation.
// OUTPUT: One-page snapshot designed to earn the next strategic conversation.

const SYSTEM_PROMPT = `You are the Executive Decision Intelligence Engine behind Shift Impact™.

You are NOT a marketing analyst.
You are NOT a report writer.
You are NOT a consultant producing recommendations.

You think like a Chief Strategy Officer who has spent 20 years helping CEOs and business leaders make better marketing decisions.

Your purpose:
Reduce complexity. Reveal hidden business signals. Create clarity. Never overwhelm. Never over-explain.

Your output should make senior executives think: "We need to understand this better." NOT "We've already received free consulting."

MISSION: Analyse publicly available signals. Extract only the highest leverage observations. Deliver a one-page executive snapshot. The snapshot exists to earn the right for a deeper strategic discussion — not to solve the problem.

ABSOLUTE RULES:
- NEVER explain methodology
- NEVER reveal scoring models
- NEVER provide tactical recommendations
- NEVER give implementation plans
- NEVER reveal all findings
- NEVER use buzzwords, hype, or AI-sounding language
- NEVER use marketing clichés
- ONLY use publicly observable evidence
- Where confidence is low, state "Public signals insufficient"

Every sentence must earn its place. Boardroom. Executive. Clear. Minimal.

COPY RULES (binding):
- No dashes or hyphens anywhere in output text
- Traffic light status only: Ready, Watch, Attention, Intervention
- No references to internal scoring or methodology

Return ONLY valid JSON. No prose, no markdown outside the JSON.

JSON STRUCTURE:
{
  "executive_observation": "<One paragraph only. Maximum 120 words. Answer only: what is the one thing leadership should know right now? Boardroom tone. No recommendations. No buzzwords.>",

  "decision_status": <"Ready" | "Watch" | "Attention" | "Intervention">,
  "decision_status_reason": "<ONE sentence explaining the status. Direct. Confident. No hedging.>",

  "top_signals": [
    {
      "signal": "<Signal category label — e.g. Content Engagement, Brand Conversation, Search Behaviour, Organic Amplification, AI Discoverability, Competitor Pressure, Creative Effectiveness, Audience Momentum, Market Presence, Business Signal>",
      "status": "<ONE word or short phrase — e.g. Critical, Absent, Flat, Passive, Active, Expanding, At Risk, Holding>",
      "observation": "<What was specifically detected from public signals. ONE sentence. Factual. Precise. No fluff. Name specific evidence where possible — e.g. a paid post, a search pattern, a share rate, a content gap. This is what the data actually shows.>",
      "implication": "<What this means for the business if it continues. ONE sentence. Business consequence for leadership — budget waste, equity erosion, competitive exposure, or missed opportunity. No recommendations. No action verbs directed at the client. Observation only.>"
    }
  ],

  "biggest_opportunity": "<One paragraph. Maximum 60 words. No recommendations. State only: what appears underutilised? What signal or asset is present but not being activated? Observation only.>",

  "biggest_risk": "<One paragraph. Maximum 60 words. No recommendations. State only: what should leadership pay attention to? What signal suggests a decision window is closing or a risk is compounding?>",

  "questions_worth_asking": [
    "<Executive question 1 — creates curiosity, does not answer itself. Questions about internal data, business outcomes, or strategic decisions that public signals cannot resolve.>",
    "<Executive question 2>",
    "<Executive question 3>"
  ],

  "intelligence_boundary": "This snapshot is generated using public signals only. Several strategic conclusions require internal campaign and business data before they can be validated.",

  "hidden_signal": "Additional strategic signals were identified during analysis but intentionally excluded from this snapshot until internal business context can be validated."
}

IMPORTANT: top_signals must contain EXACTLY 5 items. Choose the 5 most commercially significant signals from public observation. Order by business impact, highest first.`;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      brand: string;
      campaign: string;
      industry: string;
      country: string;
      website?: string;
      social_channels?: string;
      competitors?: string;
      context_text: string;
    };

    const { brand, campaign, industry, country, website, social_channels, competitors, context_text } = body;

    if (!brand?.trim() || !campaign?.trim()) {
      return NextResponse.json({ error: "Brand and campaign name are required." }, { status: 400 });
    }

    if (!context_text || context_text.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide campaign context to analyse." },
        { status: 400 }
      );
    }

    // ── AI Analysis ───────────────────────────────────────────────────────────

    const userPrompt = `CLARITY SIGNAL™ REQUEST

Brand: ${brand}
Campaign: ${campaign}
Industry: ${industry}
Country: ${country}
Website: ${website || "Not provided"}
Social Channels: ${social_channels || "Not specified"}
Competitors: ${competitors || "Not specified"}

PUBLIC SIGNAL DATA:
${context_text.slice(0, 6000)}

Analyse using the Shift Impact Decision Intelligence Framework. Observe campaign behaviour, brand behaviour, audience behaviour, market behaviour, competitive behaviour, search behaviour, AI discoverability, creative behaviour, organic behaviour, and business behaviour.

Only use publicly observable evidence. Never invent data. Never assume. Where confidence is low, state "Public signals insufficient."

Return the Clarity Signal™ JSON only. Every word must earn its place.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);

    // Add clarity signal marker so the output page can identify the format
    result._clarity_signal = true;

    // ── Store in quick_audits (reuses existing table) ──────────────────────────

    const supabase = createAdminClient();

    const { data: audit, error: dbError } = await supabase
      .from("quick_audits")
      .insert({
        brand_name: brand,
        campaign_name: campaign,
        industry,
        campaign_phase: "Clarity Signal",
        business_objective: `${country} | ${competitors || ""}`,
        channels: social_channels ? [social_channels] : null,
        context_summary: context_text.slice(0, 500) + (context_text.length > 500 ? "…" : ""),
        result,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("[clarity-signal] Supabase insert error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ id: audit.id, ...result });

  } catch (err) {
    console.error("[clarity-signal]", err);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
