import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";

const SONNET_CATEGORIES = ["Leadership", "Growth"];

// ─── Two-pass model resolution ────────────────────────────────────────────────
// Haiku → fast score. Escalate to Sonnet if:
//   pursuit_score_estimate >= pie_sonnet_pursuit_threshold  (default 60)
//   evidence count >= pie_sonnet_evidence_min               (default 3)
//   any signal is in pie_sonnet_signal_categories           (Leadership, Growth)
async function resolveModel(
  supabase: ReturnType<typeof createAdminClient>,
  roughScore: number,
  evidenceCount: number,
  signalCategories: string[]
): Promise<"haiku" | "sonnet"> {
  const [threshRow, evidMinRow, catRow] = await Promise.all([
    supabase.from("os_settings").select("value").eq("key", "pie_sonnet_pursuit_threshold").maybeSingle(),
    supabase.from("os_settings").select("value").eq("key", "pie_sonnet_evidence_min").maybeSingle(),
    supabase.from("os_settings").select("value").eq("key", "pie_sonnet_signal_categories").maybeSingle(),
  ]);

  const threshold  = parseInt(threshRow.data?.value ?? "60");
  const evidMin    = parseInt(evidMinRow.data?.value ?? "3");
  const sonnetCats = (catRow.data?.value ?? SONNET_CATEGORIES.join(","))
    .split(",").map((s: string) => s.trim());

  if (roughScore    >= threshold) return "sonnet";
  if (evidenceCount >= evidMin)   return "sonnet";
  if (signalCategories.some((c) => sonnetCats.includes(c))) return "sonnet";
  return "haiku";
}

// ─── Assessment tool ──────────────────────────────────────────────────────────
const ASSESS_TOOL: Anthropic.Tool = {
  name: "generate_assessment",
  description: "Generate a prospect assessment with offer mapping and two-score evaluation",
  input_schema: {
    type: "object" as const,
    properties: {
      business_moment_summary: {
        type: "string",
        description: "2-3 sentences: what is happening in this company right now that makes it a prospect",
      },
      shiftimpact_entry_point: {
        type: "string",
        description: "One sentence: the specific business tension or gap ShiftImpact can address",
      },
      recommended_approach: {
        type: "string",
        description: "One paragraph: how ShiftImpact would engage with this prospect based on their signals",
      },
      recommended_offer: {
        type: "string",
        enum: [
          "Founder Growth Diagnostic",
          "Marketing Decision Snapshot",
          "Brand Clarity Audit",
          "ESG Storytelling Diagnostic",
          "Launch Readiness Audit",
          "Command Desk",
        ],
      },
      offer_rationale: {
        type: "string",
        description: "One sentence explaining why this offer fits this prospect's current moment",
      },
      opportunity_score: {
        type: "number",
        description: "0-100: how significant is this business moment? (100 = major inflection point, rare timing window)",
      },
      pursuit_score: {
        type: "number",
        description: "0-100: should ShiftImpact pursue this prospect? (considers fit, timing, effort, likelihood of conversion)",
      },
      opportunity_rationale: {
        type: "string",
        description: "One sentence justifying the opportunity score",
      },
      pursuit_rationale: {
        type: "string",
        description: "One sentence justifying the pursuit score",
      },
    },
    required: [
      "business_moment_summary","shiftimpact_entry_point","recommended_approach",
      "recommended_offer","offer_rationale",
      "opportunity_score","pursuit_score","opportunity_rationale","pursuit_rationale",
    ],
  },
};

// ─── POST /api/prospect-assess ────────────────────────────────────────────────
// Body: { company_id }
// Flow:
//   1. Load company + all non-duplicate signals + evidence
//   2. Two-pass model resolution (Haiku vs Sonnet)
//   3. Generate assessment + offer mapping + two scores via AI
//   4. Persist prospect_assessments + assessment_signals + prospect_scores
//   5. Update company status to Qualified if pursuit_score >= 50
//   6. Return full assessment

export async function POST(req: NextRequest) {
  const supabase  = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { company_id } = body;
  if (!company_id) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  // 1. Load company
  const { data: company, error: compErr } = await supabase
    .from("companies")
    .select("id,name,industry,market_code,size_band,business_model,growth_stage,company_profile_summary,is_suppressed")
    .eq("id", company_id)
    .single();

  if (compErr || !company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (company.is_suppressed) return NextResponse.json({ error: "Company is suppressed" }, { status: 403 });

  // Load signals (non-duplicates, most recent 15)
  const { data: signals } = await supabase
    .from("business_signals")
    .select(`
      id, signal_category, signal_type, signal_text, detected_at,
      evidence_sources ( source_confidence, verification_status, headline, url )
    `)
    .eq("company_id", company_id)
    .is("duplicate_of_id", null)
    .order("detected_at", { ascending: false })
    .limit(15);

  if (!signals || signals.length === 0) {
    return NextResponse.json(
      { error: "No signals found for this company. Run /api/prospect-scan first." },
      { status: 422 }
    );
  }

  // 2. Two-pass model resolution
  const signalCategories = [...new Set(signals.map((s) => s.signal_category))];
  const evidenceCount    = signals.reduce(
    (n, s) => n + ((s.evidence_sources as unknown[])?.length ?? 0), 0
  );
  const roughScore = Math.min(signals.length * 8, 80); // simple proxy: 8pts per signal, cap 80

  const modelTier = await resolveModel(supabase, roughScore, evidenceCount, signalCategories);
  const modelKey  = modelTier === "sonnet" ? "model_prospect_assess" : "model_prospect_scan";
  const modelFallback = modelTier === "sonnet" ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";
  const model     = await getModel(modelKey, modelFallback);

  // Enqueue job
  const { data: queueJob } = await supabase
    .from("ai_processing_queue")
    .insert({
      queue_type:    "prospect_assess",
      priority:      1,
      status:        "processing",
      company_id:    company_id as string,
      model_tier:    modelTier,
      input_payload: { company_id, signal_count: signals.length },
      started_at:    new Date().toISOString(),
    })
    .select("id")
    .single();

  const queue_id = queueJob?.id ?? null;

  // 3. Build signal context for AI
  const signalContext = signals.map((s, i) => {
    const evid = (s.evidence_sources as Array<{ source_confidence?: string; headline?: string }> | null) ?? [];
    const conf = evid[0]?.source_confidence ?? "Medium";
    return `${i + 1}. [${s.signal_category}] ${s.signal_type}: ${s.signal_text} (confidence: ${conf})`;
  }).join("\n");

  const OFFER_GUIDE = `
ShiftImpact Offer Guide:
- Founder Growth Diagnostic: founder-led SME navigating first inflection point (revenue plateau, repositioning)
- Marketing Decision Snapshot: CMO or marketing lead facing decision paralysis or brief quality issues
- Brand Clarity Audit: brand with identity fragmentation, inconsistent messaging across markets
- ESG Storytelling Diagnostic: company with ESG commitments but weak public narrative
- Launch Readiness Audit: pre-launch or recently launched brand needing market-readiness assessment
- Command Desk: established brand needing ongoing strategic intelligence and decision support`;

  // 4. Generate assessment
  let assessment: Record<string, unknown> = {};
  let tokensUsed = 0;

  try {
    const aiResp = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      tool_choice: { type: "tool", name: "generate_assessment" },
      tools: [ASSESS_TOOL],
      messages: [{
        role: "user",
        content: `You are a senior business development strategist at ShiftImpact OS, a strategic intelligence consultancy in Southeast Asia.

Analyse this prospect company and generate a full assessment.

COMPANY: ${company.name}
Industry: ${company.industry} | Market: ${company.market_code} | Size: ${company.size_band ?? "Unknown"}
Profile: ${company.company_profile_summary || "No profile available"}

BUSINESS SIGNALS DETECTED (${signals.length}):
${signalContext}

${OFFER_GUIDE}

Generate a precise, commercially grounded assessment. Opportunity Score = how significant the business moment is (rare timing window = 80-100). Pursuit Score = should ShiftImpact invest time pursuing this (realistic conversion likelihood, strategic fit, effort required).`,
      }],
    });

    tokensUsed = (aiResp.usage?.input_tokens ?? 0) + (aiResp.usage?.output_tokens ?? 0);
    const toolUse = aiResp.content.find((b) => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      assessment = toolUse.input as Record<string, unknown>;
    }
  } catch (aiErr) {
    if (queue_id) {
      await supabase.from("ai_processing_queue").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_log: [{ ts: new Date().toISOString(), msg: String(aiErr) }],
      }).eq("id", queue_id);
    }
    return NextResponse.json({ error: "AI assessment failed", detail: String(aiErr) }, { status: 500 });
  }

  // 5. Persist assessment
  const { data: assessmentRow, error: assessErr } = await supabase
    .from("prospect_assessments")
    .insert({
      company_id:             company_id as string,
      business_moment_summary: assessment.business_moment_summary ?? "",
      shiftimpact_entry_point: assessment.shiftimpact_entry_point ?? "",
      recommended_approach:    assessment.recommended_approach    ?? "",
      recommended_offer:       assessment.recommended_offer as string,
      offer_rationale:         assessment.offer_rationale         ?? "",
      status:                  "ready",
      generated_at:            new Date().toISOString(),
    })
    .select("id")
    .single();

  if (assessErr || !assessmentRow) {
    return NextResponse.json({ error: assessErr?.message ?? "Assessment insert failed" }, { status: 500 });
  }

  // Link signals to assessment via junction table
  const junctionRows = signals.map((s, i) => ({
    assessment_id: assessmentRow.id,
    signal_id:     s.id,
    signal_weight: i === 0 ? 1.00 : Math.max(0.50, 1.00 - i * 0.07),
    signal_role:   i === 0 ? "primary" : i < 3 ? "supporting" : "contextual",
  }));
  await supabase.from("assessment_signals").insert(junctionRows).catch(() => {});

  // Persist scores — include company_id so trigger can update prospect_tier directly
  const oppScore    = Math.round(assessment.opportunity_score as number);
  const pursuitScore = Math.round(assessment.pursuit_score as number);

  const { data: scoreRow } = await supabase
    .from("prospect_scores")
    .insert({
      assessment_id:         assessmentRow.id,
      company_id:            company_id as string,
      opportunity_score:     oppScore,
      pursuit_score:         pursuitScore,
      opportunity_rationale: assessment.opportunity_rationale ?? "",
      pursuit_rationale:     assessment.pursuit_rationale     ?? "",
      surfaced_at:           new Date().toISOString(),
    })
    .select()
    .single();

  // 6. Auto-qualify company if pursuit_score >= 50
  if (pursuitScore >= 50 && company.status === "Watching") {
    await supabase.from("companies").update({ status: "Qualified" }).eq("id", company_id as string);
  }

  // 7. Mark queue complete
  const estimatedCost = tokensUsed > 0
    ? Number(((tokensUsed / 1_000_000) * (modelTier === "sonnet" ? 3.0 : 0.25)).toFixed(6))
    : null;

  if (queue_id) {
    await supabase.from("ai_processing_queue").update({
      status:         "complete",
      model_used:     model,
      tokens_used:    tokensUsed || null,
      estimated_cost: estimatedCost,
      completed_at:   new Date().toISOString(),
      output_payload: {
        assessment_id:     assessmentRow.id,
        opportunity_score: Math.round(assessment.opportunity_score as number),
        pursuit_score:     pursuitScore,
        recommended_offer: assessment.recommended_offer,
      },
    }).eq("id", queue_id);
  }

  return NextResponse.json({
    assessment: {
      id:                      assessmentRow.id,
      business_moment_summary: assessment.business_moment_summary,
      shiftimpact_entry_point: assessment.shiftimpact_entry_point,
      recommended_approach:    assessment.recommended_approach,
      recommended_offer:       assessment.recommended_offer,
      offer_rationale:         assessment.offer_rationale,
    },
    scores: {
      opportunity_score:     Math.round(assessment.opportunity_score as number),
      pursuit_score:         pursuitScore,
      opportunity_rationale: assessment.opportunity_rationale,
      pursuit_rationale:     assessment.pursuit_rationale,
    },
    model_used:    model,
    model_tier:    modelTier,
    signals_used:  signals.length,
    queue_id,
  });
}
