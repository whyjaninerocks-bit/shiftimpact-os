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
// Stage 1 (3 Sept 2026, SEA Marketing Effectiveness Intelligence KB groundwork):
// rubric-only. No external award/effectiveness corpus is connected yet — do not
// reintroduce "calibrated to Cannes/APPIES/Effie" language until kb_grounded can
// actually be true.

const IQ_SYSTEM_PROMPT = `You are the Idea Quality Intelligence embedded in ShiftImpact OS — a senior creative strategist and effectiveness expert.

IQ Evaluate uses ShiftImpact's strategic evaluation rubric to assess the strength of the idea, the business challenge, the behaviour to move, the brand role, proof logic, signal plan and execution risk. Future versions may include verified award and effectiveness case references once the SEA Marketing Effectiveness Intelligence KB is curated. Do not claim or imply that this evaluation is trained on, calibrated against, or grounded in Cannes, APPIES, Effie, or any other award corpus — none is connected yet.

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

## DECISION READINESS FIELDS (Stage 1 — rubric-only, no case grounding yet)

In addition to the 8 dimensions, produce 7 structured fields that make this evaluation useful as a decision-support tool, not just a creative critique:

1. business_challenge_clarity — Is the underlying business problem actually named, or is this a marketing-only brief in disguise?
2. behaviour_to_move — What specific human behaviour is this idea trying to change? Name it, not a vague sentiment.
3. market_category_tension — What category or market-level tension is this idea responding to?
4. proof_logic — What would have to be true, and measured, for this idea's effectiveness to be provable? Not what it will achieve — what would count as proof.
5. signal_plan — What early signals (attention / leading / near-conversion / conversion / lagging) should be tracked to know if this idea is working before final business results are in?
6. execution_risk — What could cause this idea to fail in delivery — budget, timeline, capability, data availability, regulatory, cultural misstep? This is about delivery risk, not creative weakness (that's what red_flags is for).
7. decision_recommendation — Given everything above, what should the strategist actually do next: proceed, revise, pressure-test further, or stop?

For EACH of these 7 fields, also tag a claim_type — be strict and honest about which one applies:
- source_supported: directly supported by the FRAME Brief / BIP inputs you were given
- inference: a reasonable read based on the inputs, not stated outright in them
- hypothesis: a plausible pattern you believe is true but cannot support from the inputs alone
- recommendation: your own strategic advice, not a factual claim
- not_claimable_yet: you genuinely cannot assess this from what you were given

## CONFIDENCE MODEL (Stage 1 — no KB corpus connected yet)

You MUST also return a confidence_model. Because no verified case-study corpus is connected to this evaluation yet, these values should almost always sit at their lowest tier — do not inflate them:
- evidence_confidence (High/Medium/Low): how much of this evaluation is grounded in real inputs (FRAME Brief + BIP) vs. general reasoning. Given only a brief and an idea platform, this is rarely High.
- result_confidence (High/Medium/Low/Not Stated): confidence that a business result would actually follow. No business result exists yet at this stage — default to "Not Stated" unless the brief includes real prior performance data.
- causal_confidence (High/Medium/Low/Not Claimable): confidence that THIS idea specifically — not the category, not the brand generally — would cause the outcome. Default to "Not Claimable": you have no case evidence connecting ideas like this one to outcomes.
- market_confidence (High/Medium/Low): confidence in how well you understand the specific market context you were given.
- transferability_score (High/Medium/Low/Not Tested): always "Not Tested" at this stage. No KB pattern-matching has occurred.

Do not let a strong creative read on the 8 dimensions inflate the confidence model. A World-Class idea can still have Not Claimable causal_confidence — creative quality and proof of effectiveness are different questions.

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

// ─── Tool Schema ─────────────────────────────────────────────────────────────
// Force structured output via tool use — eliminates all text parsing.

// Shared shape for each Stage 1 decision-readiness field: a value plus how
// certain that value is. claim_type is mandatory — never let a field imply
// more certainty than it has earned.
const FIELD_WITH_CLAIM_TYPE = {
  type: "object",
  properties: {
    value: { type: "string" },
    claim_type: {
      type: "string",
      enum: ["source_supported", "inference", "hypothesis", "recommendation", "not_claimable_yet"],
    },
  },
  required: ["value", "claim_type"],
} as const;

const IQ_TOOL = {
  name: "submit_iq_evaluation",
  description: "Submit the complete 8-dimension IQ evaluation result.",
  input_schema: {
    type: "object" as const,
    properties: {
      dimensions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name:            { type: "string" },
            level:           { type: "string", enum: ["Foundational", "Developing", "World-Class"] },
            score:           { type: "number", enum: [1, 2, 3] },
            rationale:       { type: "string" },
            elevation_move:  { type: "string" },
          },
          required: ["name", "level", "score", "rationale", "elevation_move"],
        },
        minItems: 8,
        maxItems: 8,
      },
      red_flags:           { type: "array", items: { type: "string" } },
      elevation_brief:     { type: "string" },
      overall_assessment:  { type: "string" },
      // Stage 1 — SEA Marketing Effectiveness Intelligence KB groundwork.
      // Rubric-only fields. No case corpus is connected — see confidence_model.
      extended_evaluation: {
        type: "object",
        description: "7 decision-readiness fields, each tagged with how certain the claim is.",
        properties: {
          business_challenge_clarity: FIELD_WITH_CLAIM_TYPE,
          behaviour_to_move:          FIELD_WITH_CLAIM_TYPE,
          market_category_tension:    FIELD_WITH_CLAIM_TYPE,
          proof_logic:                FIELD_WITH_CLAIM_TYPE,
          signal_plan:                FIELD_WITH_CLAIM_TYPE,
          execution_risk:              FIELD_WITH_CLAIM_TYPE,
          decision_recommendation:     FIELD_WITH_CLAIM_TYPE,
        },
        required: [
          "business_challenge_clarity", "behaviour_to_move", "market_category_tension",
          "proof_logic", "signal_plan", "execution_risk", "decision_recommendation",
        ],
      },
      confidence_model: {
        type: "object",
        description: "Defaults to the lowest tier on every field until a verified case corpus exists.",
        properties: {
          evidence_confidence:    { type: "string", enum: ["High", "Medium", "Low"] },
          result_confidence:      { type: "string", enum: ["High", "Medium", "Low", "Not Stated"] },
          causal_confidence:      { type: "string", enum: ["High", "Medium", "Low", "Not Claimable"] },
          market_confidence:      { type: "string", enum: ["High", "Medium", "Low"] },
          transferability_score:  { type: "string", enum: ["High", "Medium", "Low", "Not Tested"] },
        },
        required: ["evidence_confidence", "result_confidence", "causal_confidence", "market_confidence", "transferability_score"],
      },
    },
    required: ["dimensions", "red_flags", "elevation_brief", "overall_assessment", "extended_evaluation", "confidence_model"],
  },
};

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

    const clientName = (campaign.clients as unknown as { name: string } | null)?.name ?? "Unknown Brand";

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

    // 4. Run IQ evaluation via Claude — forced structured output via tool use
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const iqModel = await getModel("model_iq_evaluate", "claude-sonnet-4-6");

    const aiResponse = await anthropic.messages.create({
      model: iqModel,
      max_tokens: 7000, // bumped from 4000 — Stage 1 adds extended_evaluation + confidence_model
      system: IQ_SYSTEM_PROMPT,
      tools: [IQ_TOOL],
      tool_choice: { type: "tool", name: "submit_iq_evaluation" },
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

    // 5. Extract structured result from tool use block — no text parsing needed
    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("Claude did not return a tool_use block");
    }

    type FieldWithClaimType = { value: string; claim_type: string };

    const result = toolBlock.input as {
      dimensions: { name: string; level: string; score: number; rationale: string; elevation_move: string }[];
      red_flags: string[];
      elevation_brief: string;
      overall_assessment: string;
      extended_evaluation?: Record<string, FieldWithClaimType>;
      confidence_model?: Record<string, string>;
    };

    const dimensions  = Array.isArray(result.dimensions)  ? result.dimensions  : [];
    const red_flags   = Array.isArray(result.red_flags)    ? result.red_flags   : [];
    const elevation_brief    = result.elevation_brief    ?? "";
    const overall_assessment = result.overall_assessment ?? "";

    // Stage 1 — SEA Marketing Effectiveness Intelligence KB groundwork.
    // Defensive defaults: if the model somehow omits a field despite the forced
    // tool schema, fall back to "not_claimable_yet" / lowest-confidence rather
    // than silently dropping the key.
    const EMPTY_FIELD: FieldWithClaimType = { value: "", claim_type: "not_claimable_yet" };
    const extended_evaluation = {
      business_challenge_clarity: result.extended_evaluation?.business_challenge_clarity ?? EMPTY_FIELD,
      behaviour_to_move:          result.extended_evaluation?.behaviour_to_move ?? EMPTY_FIELD,
      market_category_tension:    result.extended_evaluation?.market_category_tension ?? EMPTY_FIELD,
      proof_logic:                result.extended_evaluation?.proof_logic ?? EMPTY_FIELD,
      signal_plan:                result.extended_evaluation?.signal_plan ?? EMPTY_FIELD,
      execution_risk:              result.extended_evaluation?.execution_risk ?? EMPTY_FIELD,
      decision_recommendation:     result.extended_evaluation?.decision_recommendation ?? EMPTY_FIELD,
    };
    const confidence_model = {
      evidence_confidence:   result.confidence_model?.evidence_confidence ?? "Low",
      result_confidence:     result.confidence_model?.result_confidence ?? "Not Stated",
      causal_confidence:     result.confidence_model?.causal_confidence ?? "Not Claimable",
      market_confidence:     result.confidence_model?.market_confidence ?? "Low",
      transferability_score: result.confidence_model?.transferability_score ?? "Not Tested",
    };
    // Hard flag, not model output — stays false until a verified case corpus is
    // actually wired in. Never let the AI set this itself.
    const kb_grounded = false;

    // Response aliases for the 4 fields that overlap with the existing 8-dimension
    // rubric — deliberately NOT stored as separate AI-generated opinions, to avoid
    // two texts about the same thing disagreeing with each other.
    const findDim = (name: string) =>
      (dimensions as { name: string; level: string; rationale: string }[]).find((d) => d.name === name);
    const culturalPermissionDim = findDim("Cultural Permission");
    const brandRoleDim          = findDim("Brand Role");
    const dualAudienceDim       = findDim("Dual Audience Architecture");
    const response_aliases = {
      idea_strength: overall_assessment,
      cultural_specificity: culturalPermissionDim
        ? `${culturalPermissionDim.level}: ${culturalPermissionDim.rationale}` : null,
      brand_role_credibility: brandRoleDim
        ? `${brandRoleDim.level}: ${brandRoleDim.rationale}` : null,
      ai_usefulness: dualAudienceDim
        ? `${dualAudienceDim.level}: ${dualAudienceDim.rationale}` : null,
    };

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
        extended_evaluation,
        confidence_model,
        kb_grounded,
        schema_version: 2,
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
      extended_evaluation,
      confidence_model,
      kb_grounded,
      schema_version: 2,
      response_aliases,
      created_at: saved?.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/iq-evaluate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
