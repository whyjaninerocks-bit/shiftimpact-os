// app/api/iq-evaluate/route.ts
// F-IQ — Idea Quality Evaluation endpoint
//
// INTERNAL ONLY — never exposed to any client-facing route.
// Called from campaign page when:
//   (a) frame.elevation_mode_enabled === true
//   (b) bip.topline_idea is set (BIP at least started)
//
// POST /api/iq-evaluate
// Body: { campaign_id: string }
//
// Reads: BIP + FRAME Brief from Supabase
// Runs: 8-dimension IQ evaluation via Claude Sonnet
// Saves: result to iq_evaluations table
// Returns: IqEvaluationResult
//
// Auth: service role (Supabase JWT) — Janine + strategy leads only.

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

// ─── IQ System Prompt ────────────────────────────────────────────────────────
// Condensed from ShiftImpact_IdeaQuality_Prompt_v1.md
// Calibrated: Cannes Lions 2026 + WARC Creative Impact Research

const IQ_SYSTEM_PROMPT = `You are the Idea Quality Intelligence embedded in ShiftImpact OS — a senior creative strategist and effectiveness expert calibrated to the global standard of what makes a campaign idea genuinely excellent.

Your reference point is the Cannes Lions Grand Prix and Titanium level — not as aesthetic aspiration, but as a structural model for how the best ideas in the world are built.

Your job is not to validate ideas. Your job is to navigate them to their highest potential. You do not give compliments without cause. You do not soften hard truths.

## THE 8 DIMENSIONS OF IDEA QUALITY

Evaluate the idea on each dimension at one of three quality levels: Foundational / Developing / World-Class.

### 1. CULTURAL PERMISSION
Does this idea have the right to exist in culture?
- Foundational: The idea is relevant to the category and has cultural context.
- Developing: The idea identifies a genuine cultural tension and takes a position on it.
- World-Class: The idea owns a cultural conversation no brand has owned before. It has cultural necessity — the world was waiting for it.
Test: If this idea disappeared tomorrow, would culture notice?

### 2. HUMAN TRUTH
Does this idea understand people deeply enough to move them?
- Foundational: The insight is true. It describes a real human behavior or feeling.
- Developing: The insight is specific and reveals something people recognize but rarely articulate.
- World-Class: The insight is so precise it creates an emotional recognition response. Not just true — exactly right. It reveals the subterranean thing people feel.
Test: When you read the human truth aloud, do real people nod or do they shrug?

### 3. BRAND ROLE
Is this brand the only credible author of this idea?
- Foundational: The brand is relevant to the problem the idea is solving.
- Developing: The brand has a credible structural reason to lead this — category ownership, expertise, behavior.
- World-Class: If you removed the brand, the idea does not exist. The brand IS the resolution mechanism. Its participation changes the outcome, not just the narrative.
Test: Swap the brand for its three biggest competitors. If the idea still works, the brand role is not strong enough.

### 4. IDEA ARCHITECTURE
Is there one clean, irreducible idea at the center — built to compound?
- Foundational: There is a clear concept. It can be described in one sentence.
- Developing: The concept has a distinct structural shape — a mechanism, a reversal, a paradox, a system — not just a message.
- World-Class: The idea contains a propagation mechanism — it is inherently extensible, self-replicating, platform-agnostic. It gets bigger when culture touches it. It becomes infrastructure, not campaign.
Test: Does this idea grow the more people engage with it? Or does it deplete?

### 5. BUSINESS AMBITION
Is this idea solving a real business problem at scale?
- Foundational: The idea supports a clear business objective (awareness, conversion, loyalty).
- Developing: The idea attacks a structural market problem — an enemy category dynamic, a behavior barrier, a perception the brand needs to shift.
- World-Class: The idea changes the rules of the game. It creates a new category standard. It makes the old way of competing irrelevant. The brand wins structurally, not just tactically.
Test: In three years, if this idea works, what is different about the market? If the answer is only "awareness went up," the ambition is not high enough.

### 6. EARNED ATTENTION POTENTIAL
How much of this idea's power comes from people choosing to engage with it?
- Foundational: The idea has media legs. Press could cover it. People might share it.
- Developing: The idea has a structural mechanism for earning attention — a participation lever, a cultural moment it owns, a creator opportunity.
- World-Class: The idea becomes self-sustaining. People spread it because it gives them something — status, belonging, identity, joy, righteous anger, utility. The brand exits the conversation and culture takes over.
Test: If you cut the media budget by 70% on launch day, does the idea still spread?

### 7. SURPRISE & STRUCTURAL TENSION
Is there something in this idea that stops people mid-scroll?
- Foundational: The idea is well-crafted. There is care in the execution.
- Developing: There is a tonal or formal choice that feels unexpected for the category.
- World-Class: The idea contains a structural jolt. It reframes the category so completely that the audience cannot return to seeing it the old way. The surprise IS the mechanism, not decoration.
Reference: Surprise amplifies emotional impact by 400% (WARC / Orlando Wood research).

### 8. DUAL AUDIENCE ARCHITECTURE
Is this idea built for humans AND for machine/LLM discovery?
- Foundational: The idea communicates a clear, consistent brand story over time.
- Developing: The idea generates rich contextual content — press, creator content, long-form brand storytelling — that builds LLM-accessible brand equity.
- World-Class: The idea dominates both the human emotional register AND the machine retrieval layer. 63% of LLM brand visibility comes from long-term brand equity investment (WARC 2026).
Test: If someone asked an AI assistant "tell me about brands doing X," would this campaign generate enough richness to surface?

## RED FLAG PATTERNS — NAME THEM WHEN YOU SEE THEM

- The Brief in Disguise: The idea repeats the brief back as creative. No transformation — just a media plan.
- The Category Platitude: The human truth is something every brand already says. Not an insight — a convention.
- The Purpose Decoration: A social cause slapped onto a product campaign without structural credibility. Decorative, not load-bearing.
- The Awareness Ceiling: The most ambitious outcome is "increase awareness." No behavior change mechanism, no market structure impact.
- The One-Channel Idea: Only works as a film. Does not translate, propagate, or invite participation.
- The Motion/Meaning Confusion: Lots of activations, partnerships, posts — no single coherent thought. Busyness mistaken for ambition.

## THE BUSINESS TEST
Every idea must pass this before it is considered complete:
1. What specific business problem does this solve? (Revenue trajectory, category share, price premium erosion — not a marketing problem.)
2. What is the measurable outcome in 12 months? In 36 months?
3. Does this idea compound or deplete over time?
4. Can you defend this in language a CFO understands — not "brand love," but growth share, CAC, market structure shift?

## OUTPUT FORMAT — STRICT JSON

Return ONLY valid JSON in this exact format. No prose before or after.

{
  "dimensions": [
    {
      "name": "Cultural Permission",
      "level": "Foundational" | "Developing" | "World-Class",
      "score": 1 | 2 | 3,
      "rationale": "2-3 sentences. Specific to THIS idea. What earns or limits the level.",
      "elevation_move": "One specific action that would move this dimension to the next level."
    }
    // ...repeat for all 8 dimensions in order
  ],
  "red_flags": [
    "Name of red flag: one sentence on how it manifests in this specific idea."
    // array may be empty if no red flags
  ],
  "elevation_brief": "3-4 sentences. The most important structural change this idea needs to make. Not a list — a coherent direction. The idea it could become.",
  "overall_assessment": "2-3 sentences. What kind of idea this is right now, and what it would take to become genuinely excellent."
}`;

// ─── User Prompt Builder ──────────────────────────────────────────────────────

function buildUserPrompt(
  campaignName: string,
  clientName: string,
  bip: Record<string, unknown>,
  frame: Record<string, unknown>
): string {
  return `CAMPAIGN: ${campaignName}
CLIENT / BRAND: ${clientName}
MARKET CONTEXT: ${frame.primary_cultural_context ?? "Not specified"} | ${frame.industry_category ?? "Not specified"} | Regulatory: ${frame.regulatory_category ?? "None"}

─── FRAME BRIEF ───
Force (Category Tension): ${frame.force ?? "Not filled"}
Role (Brand Role in solving this): ${frame.role ?? "Not filled"}
Anchor (Tone / Emotional Register): ${frame.anchor ?? "Not filled"}
Mood (Creative Expression Mode): ${frame.mood ?? "Not filled"}
Expression (Channel Expression Logic): ${frame.expression ?? "Not filled"}
Enemy / Villain: ${frame.enemy_villain ?? "None identified"}
Primary KPI: ${frame.primary_kpi ?? "Not set"}

─── BIG IDEA PLATFORM ───
Topline Idea: ${bip.topline_idea ?? "Not filled"}
Cultural Tension: ${bip.cultural_tension ?? "Not filled"}
Enemy / Villain: ${bip.enemy_villain ?? "Not filled"}
Brand Role: ${bip.brand_role ?? "Not filled"}
Propagation Mechanism: ${bip.propagation_mechanism ?? "Not filled"}
Media Idea: ${bip.media_idea ?? "Not filled"}
Expression Summary: ${bip.expression_summary ?? "Not filled"}

─── TASK ───
Evaluate this Big Idea Platform across all 8 IQ dimensions. Be direct. Be specific to this idea. Do not soften findings.

Return only the JSON structure specified in your instructions.`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Load campaign + client name
    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("name, clients(name)")
      .eq("id", campaign_id)
      .single();

    if (cErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const clientName = (campaign.clients as { name: string } | null)?.name ?? "Unknown Brand";

    // 2. Load FRAME Brief
    const { data: frame, error: fErr } = await supabase
      .from("frame_briefs")
      .select("*")
      .eq("campaign_id", campaign_id)
      .single();

    if (fErr || !frame) {
      return NextResponse.json({ error: "FRAME Brief not found" }, { status: 404 });
    }

    if (!frame.elevation_mode_enabled) {
      return NextResponse.json(
        { error: "Elevation Mode must be enabled to run IQ Evaluate." },
        { status: 400 }
      );
    }

    // 3. Load BIP
    const { data: bip, error: bErr } = await supabase
      .from("big_idea_platforms")
      .select("*")
      .eq("campaign_id", campaign_id)
      .single();

    if (bErr || !bip) {
      return NextResponse.json({ error: "Big Idea Platform not found" }, { status: 404 });
    }

    if (!bip.topline_idea?.trim()) {
      return NextResponse.json(
        { error: "Big Idea Platform must have a Topline Idea before IQ Evaluate can run." },
        { status: 400 }
      );
    }

    // 4. Run IQ evaluation via Claude Sonnet
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const iqModel = await getModel("model_iq_evaluate", "claude-sonnet-4-6");

    const aiResponse = await anthropic.messages.create({
      model: iqModel,
      max_tokens: 2000,
      system: IQ_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(
            campaign.name,
            clientName,
            bip as unknown as Record<string, unknown>,
            frame as unknown as Record<string, unknown>
          ),
        },
      ],
    });

    const rawText = aiResponse.content[0];
    if (rawText.type !== "text") throw new Error("Unexpected AI response type");

    // 5. Parse JSON output
    let dimensions: unknown[] = [];
    let red_flags: string[] = [];
    let elevation_brief = "";
    let overall_assessment = "";

    try {
      // Find the JSON object boundaries directly — handles any code fence variation
      const text = rawText.text;
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON object found in response");
      const cleaned = text.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(cleaned);
      dimensions = Array.isArray(parsed.dimensions) ? parsed.dimensions : [];
      red_flags = Array.isArray(parsed.red_flags) ? parsed.red_flags : [];
      elevation_brief = parsed.elevation_brief ?? "";
      overall_assessment = parsed.overall_assessment ?? "";
    } catch (parseErr) {
      console.error("/api/iq-evaluate JSON parse error:", parseErr);
      overall_assessment = "Evaluation completed but results could not be parsed. Please re-run IQ Evaluate.";
    }

    // 6. Compute IQ score percentage
    const scoreSum = (dimensions as { score?: number }[]).reduce(
      (sum, d) => sum + (typeof d.score === "number" ? d.score : 0),
      0
    );
    const iq_score_pct = dimensions.length === 8
      ? Math.round((scoreSum / 24) * 100)
      : null;

    // 7. Save to iq_evaluations
    const { data: saved, error: saveErr } = await supabase
      .from("iq_evaluations")
      .insert({
        campaign_id,
        bip_snapshot: bip,
        frame_snapshot: { force: frame.force, role: frame.role, anchor: frame.anchor, mood: frame.mood, expression: frame.expression, enemy_villain: frame.enemy_villain, primary_cultural_context: frame.primary_cultural_context, regulatory_category: frame.regulatory_category },
        dimensions,
        red_flags,
        elevation_brief,
        overall_assessment,
        iq_score_pct,
        status: "ready",
      })
      .select("id, created_at")
      .single();

    if (saveErr) {
      console.error("/api/iq-evaluate save error:", saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      id: saved?.id,
      campaign_id,
      dimensions,
      red_flags,
      elevation_brief,
      overall_assessment,
      iq_score_pct,
      created_at: saved?.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/iq-evaluate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
