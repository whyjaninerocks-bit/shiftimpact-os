import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";

export const maxDuration = 60;

// ─── Deep dive tool ───────────────────────────────────────────────────────────
const DEEP_TOOL: Anthropic.Tool = {
  name: "generate_deep_dive",
  description: "Generate a full in-depth pursuit intelligence report for a prospect ShiftImpact has decided to pursue",
  input_schema: {
    type: "object" as const,
    properties: {
      competitive_landscape: {
        type: "string",
        description: "2-3 sentences: who else is likely competing for this company's attention (consultancies, agencies, platforms)? What are they offering and where does ShiftImpact have an edge?",
      },
      approach_sequence: {
        type: "string",
        description: "A numbered 4-5 step pursuit sequence: how to move from cold → warm → meeting → proposal. Be specific about the method (LinkedIn, email, event, referral) and what each step establishes.",
      },
      signal_analysis: {
        type: "string",
        description: "Signal-by-signal breakdown: for each key signal, explain what it really means for the company's internal dynamics and why it opens a door for ShiftImpact. Format as numbered points.",
      },
      risk_factors: {
        type: "string",
        description: "2-3 honest risks: what could make this pursuit fail or stall? Be specific (budget freeze, wrong contact, competitor already in the room, internal politics).",
      },
      market_timing: {
        type: "string",
        description: "2 sentences: why is NOW the right (or wrong) time to pursue? What is the window and when does it close?",
      },
      // ── Person recommendation ──────────────────────────────────────────────
      recommended_person_name: {
        type: "string",
        description: "The specific person's name to approach FIRST — extracted from the signal evidence if a real name was surfaced (e.g. from award announcements, executive appointment news, partnership signings). If no name was found in the signals, output exactly: 'Not identified in signals'.",
      },
      recommended_person_role: {
        type: "string",
        description: "Their exact title or the closest title to target at this company. Be specific — not 'senior executive' but 'Chief Strategy Officer' or 'Head of Corporate Affairs'.",
      },
      recommended_person_why: {
        type: "string",
        description: "2 sentences: why this person specifically — not just because of their seniority, but because of their direct connection to the business moment (ownership transition, product launch, partnership, award). What decision or tension are they personally sitting closest to?",
      },
      recommended_person_signal: {
        type: "string",
        description: "Which specific signal or evidence headline surfaced this person or this role? Quote the signal type and the key fact. E.g. 'Recognition signal: Roy Heong named Asian Innovation Excellence Award winner — signals CMO is the external-facing executive tied to brand positioning.'",
      },
      recommended_person_hook: {
        type: "string",
        description: "One specific opening line tailored to THIS person — not a generic intro. Reference something specific about them or their role in the current situation that makes it impossible to ignore.",
      },
    },
    required: [
      "competitive_landscape",
      "approach_sequence",
      "signal_analysis",
      "risk_factors",
      "market_timing",
      "recommended_person_name",
      "recommended_person_role",
      "recommended_person_why",
      "recommended_person_signal",
      "recommended_person_hook",
    ],
  },
};

// ─── POST /api/prospect-pursue ────────────────────────────────────────────────
// Body: { company_id }
// Flow:
//   1. Load company + latest assessment + all non-duplicate signals
//   2. Mark company status → Pursuing
//   3. Generate deep dive via Sonnet
//   4. Persist to prospect_insights (depth_level = 'deep')
//   5. Return deep dive content

export async function POST(req: NextRequest) {
  const supabase  = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { company_id } = body;
  if (!company_id) return NextResponse.json({ error: "company_id is required" }, { status: 400 });

  // 1. Load company
  const { data: company, error: compErr } = await supabase
    .from("companies")
    .select("id,name,industry,market_code,size_band,growth_stage,company_profile_summary,is_suppressed,status")
    .eq("id", company_id)
    .single();

  if (compErr || !company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (company.is_suppressed) return NextResponse.json({ error: "Company is suppressed" }, { status: 403 });

  // Load latest assessment
  const { data: assessment } = await supabase
    .from("prospect_assessments")
    .select("id,business_moment_summary,shiftimpact_entry_point,recommended_offer,offer_rationale")
    .eq("company_id", company_id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Load latest topline insight
  const { data: topline } = await supabase
    .from("prospect_insights")
    .select("recommendation,benchmark_context,market_context,best_entry_angle")
    .eq("company_id", company_id as string)
    .eq("depth_level", "topline")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Load all non-duplicate signals (full set for deep analysis)
  const { data: signals } = await supabase
    .from("business_signals")
    .select(`
      id, signal_category, signal_type, signal_text, detected_at, signal_freshness_score,
      evidence_sources ( url, headline, source_confidence )
    `)
    .eq("company_id", company_id)
    .is("duplicate_of_id", null)
    .order("detected_at", { ascending: false })
    .limit(15);

  if (!signals || signals.length === 0) {
    return NextResponse.json({ error: "No signals found. Run a scan first." }, { status: 422 });
  }

  // 2. Mark company as Pursuing
  await supabase
    .from("companies")
    .update({ status: "Pursuing" })
    .eq("id", company_id as string);

  // 3. Build context for deep dive — include evidence headlines so AI can surface named individuals
  const signalContext = signals.map((s, i) => {
    const evid = (s.evidence_sources as Array<{ source_confidence?: string; headline?: string; url?: string }> | null) ?? [];
    const conf = evid[0]?.source_confidence ?? "Medium";
    const fresh = Math.round((s.signal_freshness_score ?? 1) * 100);
    const headlines = evid.map(e => e.headline).filter(Boolean).join(" | ");
    return [
      `${i + 1}. [${s.signal_category}] ${s.signal_type} (confidence: ${conf}, freshness: ${fresh}%)`,
      `   ${s.signal_text}`,
      headlines ? `   Evidence headlines: ${headlines}` : "",
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const toplineContext = topline
    ? `TOPLINE ASSESSMENT:\nRecommendation: ${topline.recommendation}\nBenchmark: ${topline.benchmark_context}\nMarket context: ${topline.market_context}\nBest entry angle: ${topline.best_entry_angle}`
    : "";

  const assessmentContext = assessment
    ? `PRIOR ASSESSMENT:\nBusiness moment: ${assessment.business_moment_summary}\nEntry point: ${assessment.shiftimpact_entry_point}\nRecommended offer: ${assessment.recommended_offer}\nOffer rationale: ${assessment.offer_rationale}`
    : "";

  const model = await getModel("model_prospect_assess_deep", "claude-sonnet-4-6");

  // 4. Generate deep dive
  let deepDive: Record<string, unknown> = {};
  let tokensUsed = 0;

  try {
    const aiResp = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      tool_choice: { type: "tool", name: "generate_deep_dive" },
      tools: [DEEP_TOOL],
      messages: [{
        role: "user",
        content: `You are a senior strategist at ShiftImpact OS, a strategic intelligence consultancy in Southeast Asia. The team has decided to PURSUE this prospect. Generate a full in-depth intelligence report to guide the pursuit.

COMPANY: ${company.name}
Industry: ${company.industry} | Market: ${company.market_code} | Size: ${company.size_band ?? "Unknown"} | Stage: ${company.growth_stage ?? "Unknown"}
Profile: ${company.company_profile_summary || "No profile available"}

${toplineContext}

${assessmentContext}

ALL BUSINESS SIGNALS DETECTED (${signals.length}):
${signalContext}

Generate a precise, commercially grounded deep dive. For the person recommendation: scan the signal evidence headlines carefully for any named individuals (executives, award winners, signatories, speakers). If a real name appears, use it. If not, recommend the most strategically relevant role to target. Be specific — name real competitors, real market events, real risks. No generic advice.`,
      }],
    });

    tokensUsed = (aiResp.usage?.input_tokens ?? 0) + (aiResp.usage?.output_tokens ?? 0);
    const toolUse = aiResp.content.find((b) => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      deepDive = toolUse.input as Record<string, unknown>;
    }
  } catch (aiErr) {
    return NextResponse.json({ error: "Deep dive generation failed", detail: String(aiErr) }, { status: 500 });
  }

  // 5. Persist deep insight
  const { data: insightRow, error: insightErr } = await supabase
    .from("prospect_insights")
    .insert({
      company_id:                  company_id as string,
      assessment_id:               assessment?.id ?? null,
      depth_level:                 "deep",
      competitive_landscape:       deepDive.competitive_landscape        ?? null,
      approach_sequence:           deepDive.approach_sequence            ?? null,
      signal_analysis:             deepDive.signal_analysis              ?? null,
      risk_factors:                deepDive.risk_factors                 ?? null,
      market_timing:               deepDive.market_timing                ?? null,
      recommended_person_name:     deepDive.recommended_person_name      ?? null,
      recommended_person_role:     deepDive.recommended_person_role      ?? null,
      recommended_person_why:      deepDive.recommended_person_why       ?? null,
      recommended_person_signal:   deepDive.recommended_person_signal    ?? null,
      recommended_person_hook:     deepDive.recommended_person_hook      ?? null,
    })
    .select("id")
    .single();

  if (insightErr) console.error("[prospect-pursue] deep insight insert failed:", insightErr.message);

  const estimatedCost = tokensUsed > 0
    ? Number(((tokensUsed / 1_000_000) * 3.0).toFixed(6))
    : null;

  return NextResponse.json({
    insight_id:                  insightRow?.id ?? null,
    competitive_landscape:       deepDive.competitive_landscape,
    approach_sequence:           deepDive.approach_sequence,
    signal_analysis:             deepDive.signal_analysis,
    risk_factors:                deepDive.risk_factors,
    market_timing:               deepDive.market_timing,
    recommended_person_name:     deepDive.recommended_person_name,
    recommended_person_role:     deepDive.recommended_person_role,
    recommended_person_why:      deepDive.recommended_person_why,
    recommended_person_signal:   deepDive.recommended_person_signal,
    recommended_person_hook:     deepDive.recommended_person_hook,
    model_used:                  model,
    tokens_used:                 tokensUsed,
    estimated_cost:              estimatedCost,
    signals_used:                signals.length,
  });
}
