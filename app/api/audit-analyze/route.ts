import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are ShiftImpact OS — a campaign intelligence system. Your job is to score campaigns objectively on the Idea Certainty Score (ICS) framework based on any available campaign information.

ICS dimensions and what to look for:
1. Cultural Fit (20%) — Does the idea feel true to the culture it speaks into? Is it credible here, not transplanted from another market or trend?
2. Business Alignment (20%) — Does this idea directly serve the commercial objective? Is it the engine of results, or decoration?
3. Audience Tension (20%) — Does it tap into a real, present tension the audience is already living? Not manufactured conflict — actual pressure.
4. Executional Coherence (15%) — Can the idea hold across all required channels and touchpoints without breaking or becoming generic?
5. Measurability (15%) — Can the idea's effect on audience behaviour be observed and recorded within the campaign window?
6. Scalability (10%) — Can this idea grow in intensity, spend, or market without losing its integrity?

Score each dimension 1–5:
1 = Absent or not observable from available information
2 = Weak / superficial connection
3 = Present / average execution
4 = Strong / clear and deliberate
5 = Exceptional / category-defining

Be objective. If information is insufficient to score a dimension confidently, score 3 and note it.

Respond ONLY with valid JSON in this exact format — no other text:
{
  "scores": {
    "cultural_fit": <1-5>,
    "business_alignment": <1-5>,
    "audience_tension": <1-5>,
    "executional_coherence": <1-5>,
    "measurability": <1-5>,
    "scalability": <1-5>
  },
  "reasoning": {
    "cultural_fit": "<1-2 sentences citing specific evidence from the campaign info>",
    "business_alignment": "<1-2 sentences>",
    "audience_tension": "<1-2 sentences>",
    "executional_coherence": "<1-2 sentences>",
    "measurability": "<1-2 sentences>",
    "scalability": "<1-2 sentences>"
  },
  "big_idea_read": "<One sentence — what is the actual Big Idea this campaign runs on, in your read>",
  "overall_diagnosis": "<2-3 sentences — chief diagnosis: where this campaign is strong and where the real risk is>",
  "recommendation": "<1 sentence — the single most important thing this campaign needs to do or stop doing>"
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brand_name, campaign_name, industry, current_phase, context_text, business_outcome_label } = body;

    if (!context_text || context_text.trim().length < 30) {
      return NextResponse.json(
        { error: "Please provide more campaign context. Paste a brief description, social posts, press coverage, or anything you know about this campaign." },
        { status: 400 }
      );
    }

    // ── AI scoring ────────────────────────────────────────────────────────
    const userPrompt = `Score this campaign on the ICS framework:

Brand: ${brand_name}
Campaign: ${campaign_name}
Industry: ${industry}
Current Phase: ${current_phase}
Business Objective: ${business_outcome_label || "Not specified"}

Campaign Information:
${context_text}

Return JSON only.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI analysis returned unexpected format. Try again." }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    const { scores, reasoning, big_idea_read, overall_diagnosis, recommendation } = analysis;

    // ── Create records in Supabase ────────────────────────────────────────
    const supabase = createAdminClient();

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: brand_name,
        industry_profile: (["QSR", "B2B", "Retail", "Other"].includes(industry) ? industry : "Other") as "QSR" | "B2B" | "Retail" | "Other",
        business_outcome_label: business_outcome_label || "Business Outcome",
        retention_metric_label: "Retention Metric",
      })
      .select("id")
      .single();

    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        client_id: client.id,
        name: campaign_name || "Campaign Audit",
        current_phase: (["Demand", "Conversion", "Retention", "Complete"].includes(current_phase) ? current_phase : "Demand") as "Demand" | "Conversion" | "Retention" | "Complete",
      })
      .select("id")
      .single();

    if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 });

    const { error: frameError } = await supabase.from("frame_briefs").insert({
      campaign_id: campaign.id,
      // Store context in the Force field, AI big idea read as Anchor, diagnosis as Clarity Statement
      force: context_text.slice(0, 800),
      anchor: big_idea_read || `[AI Audit] ${brand_name}`,
      clarity_statement: overall_diagnosis || "",
      ics_cultural_fit: scores.cultural_fit ?? 3,
      ics_business_alignment: scores.business_alignment ?? 3,
      ics_audience_tension: scores.audience_tension ?? 3,
      ics_executional_coherence: scores.executional_coherence ?? 3,
      ics_measurability: scores.measurability ?? 3,
      ics_scalability: scores.scalability ?? 3,
    });

    if (frameError) return NextResponse.json({ error: frameError.message }, { status: 500 });

    // Seed phase gates from templates
    const { data: templates } = await supabase
      .from("gate_templates")
      .select("id, gate_type, sequence_order, required_signal_template")
      .order("sequence_order");

    const gateRows = (templates ?? []).map((t) => ({
      campaign_id: campaign.id,
      gate_template_id: t.id,
      gate_type: t.gate_type,
      sequence_order: t.sequence_order,
      required_signal: t.required_signal_template,
    }));
    if (gateRows.length > 0) await supabase.from("phase_gates").insert(gateRows);

    // Seed standard client channels
    await supabase.from("client_channels").insert([
      { client_id: client.id, channel_name: "Digital / Social", channel_category: "Digital", translation_hint: "Platform-native brand mechanics." },
      { client_id: client.id, channel_name: "KOL / Influencer", channel_category: "KOL", translation_hint: "Creator-native storytelling." },
      { client_id: client.id, channel_name: "PR / Earned Media", channel_category: "PR", translation_hint: "Journalist angle, not brand angle." },
      { client_id: client.id, channel_name: "Radio", channel_category: "Radio", translation_hint: "Audio-only hook. Human tension in 15 seconds." },
      { client_id: client.id, channel_name: "Retail / In-Store", channel_category: "Retail", translation_hint: "Last-mile conversion trigger." },
    ]);

    revalidatePath("/clients");
    revalidatePath("/");

    return NextResponse.json({
      campaign_id: campaign.id,
      scores,
      reasoning,
      big_idea_read,
      overall_diagnosis,
      recommendation,
    });

  } catch (err) {
    console.error("[audit-analyze]", err);
    return NextResponse.json({ error: "Analysis failed — please try again." }, { status: 500 });
  }
}
