import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";

// ─── Voice DNA constants ──────────────────────────────────────────────────────
// Janine Wai's locked voice rules (v1.0, May 2026)
// Source: voice_dna_janine.md — apply to every outreach draft.

const VOICE_SYSTEM_PROMPT = `You are writing a LinkedIn DM or email outreach message on behalf of Janine Wai, Founder of ShiftImpact OS — a strategic intelligence consultancy in Southeast Asia.

JANINE'S VOICE RULES (non-negotiable):

MUST USE (2-3 per message):
- Action words: diagnose, look into, execute, position, solve, drive
- Clarity words: clear, clarity, "at a bare minimum", "get it right"
- Relationship words: partners (never vendors), credibility
- Never "identify", "assess", "help", "support", "optimize", "implement"

SIGNATURE PHRASES (use at least 1):
"Look into that" · "At a bare minimum" · "That's critical" · "Clarity on" · "In tandem"

NEVER WRITE:
- "dive deep", "empower", "unlock", "leverage" (excessive), "synergy", "holistic", "robust"
- "Let me know what you think!" or "Hope this helps!"
- Excessive dashes — never use them
- Generic openers: "In today's world...", "Research shows..."

TONE: Casual + semi-professional. Confident without arrogance. Evidence-based. Collaborative ("we" / "partners"). NOT polished marketing copy. NOT formal.

OPENING PATTERN (pick one):
- "So [action/update] that [result]"
- "I think [observation] that [insight]"
- "[Name] and I [action/found]"

CLOSING PATTERN (land on momentum, not a feedback ask):
- "[Statement]. That's critical because [why]."
- "[Evidence]. So [implication]."
- "So the next step is [action]."

STRUCTURE:
1. Open with a specific observation about their business moment (1-2 sentences — reference the signal without revealing you used AI)
2. Name the strategic tension or gap you've diagnosed (1 sentence)
3. Position ShiftImpact's offer naturally — not as a pitch, as a next logical step (1-2 sentences)
4. Close with momentum or a specific question that extends their situation (1 sentence)

TOTAL LENGTH: 100-150 words. Short enough to read in 20 seconds. No bullet points. No headers. Plain prose.`;

// ─── Outreach tool ────────────────────────────────────────────────────────────
const OUTREACH_TOOL: Anthropic.Tool = {
  name: "generate_outreach",
  description: "Generate a voice-matched outreach message for a prospect",
  input_schema: {
    type: "object" as const,
    properties: {
      message_draft: {
        type: "string",
        description: "The full outreach message in Janine's voice (100-150 words, plain prose)",
      },
      subject_line: {
        type: "string",
        description: "Email subject line or LinkedIn connection note title (max 60 chars)",
      },
      voice_check: {
        type: "object",
        properties: {
          action_words_used:      { type: "array", items: { type: "string" } },
          signature_phrase_used:  { type: "string" },
          banned_words_avoided:   { type: "boolean" },
          opening_pattern:        { type: "string" },
          closing_pattern:        { type: "string" },
        },
        required: ["action_words_used","banned_words_avoided","opening_pattern","closing_pattern"],
      },
    },
    required: ["message_draft","subject_line","voice_check"],
  },
};

// ─── GET /api/prospect-outreach ───────────────────────────────────────────────
// List outreach records for a company or person.
// Query params: company_id OR person_id, status?

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);

  const company_id = searchParams.get("company_id");
  const person_id  = searchParams.get("person_id");
  const status     = searchParams.get("status");

  if (!company_id && !person_id) {
    return NextResponse.json({ error: "company_id or person_id required" }, { status: 400 });
  }

  let query = supabase
    .from("outreach")
    .select(`
      id, person_id, assessment_id, channel, message_draft, message_sent,
      status, drafted_at, approved_at, sent_at, replied_at,
      people ( id, name, role, company_id,
        companies ( id, name )
      )
    `)
    .order("drafted_at", { ascending: false });

  if (status)     query = query.eq("status", status);
  if (person_id)  query = query.eq("person_id", person_id);
  if (company_id) {
    // Join via people — filter by company
    query = query.eq("people.company_id", company_id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ outreach: data });
}

// ─── POST /api/prospect-outreach ─────────────────────────────────────────────
// Generate a voice-matched outreach draft. DOES NOT SEND — status stays "Drafted".
// message_sent is NULL until human approves via PATCH /api/prospect-outreach/[id].
//
// Body: {
//   person_id:     uuid  (required)
//   assessment_id: uuid  (optional — uses latest assessment if omitted)
//   channel:       "LinkedIn DM" | "Email" | "Introduction" | "Event"
// }
// Returns: { outreach: { id, message_draft, subject_line, status: "Drafted" }, voice_check }

export async function POST(req: NextRequest) {
  const supabase  = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { person_id, channel } = body;
  if (!person_id || !channel) {
    return NextResponse.json({ error: "person_id and channel are required" }, { status: 400 });
  }

  // 1. Load person + company
  const { data: person, error: personErr } = await supabase
    .from("people")
    .select(`
      id, name, role, is_suppressed, company_id,
      relationship_status, warm_intro_possible, warm_intro_via,
      previous_interaction, network_connection_status,
      companies ( id, name, industry, market_code, company_profile_summary, is_suppressed )
    `)
    .eq("id", person_id)
    .single();

  if (personErr || !person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  // 2. Suppression check — gate before ANY draft generation
  const company = person.companies as Record<string, unknown> | null;

  if (person.is_suppressed) {
    return NextResponse.json(
      { error: "Person is suppressed — outreach blocked", suppressed: true },
      { status: 403 }
    );
  }
  if (company?.is_suppressed) {
    return NextResponse.json(
      { error: "Company is suppressed — outreach blocked", suppressed: true },
      { status: 403 }
    );
  }

  // Check suppression list for domain (if email channel)
  if (channel === "Email") {
    const { data: domainSupp } = await supabase
      .from("prospect_suppression_list")
      .select("id, reason")
      .not("domain", "is", null)
      .limit(1);
    // Note: domain check would need email field on person — skip for now, flag in response
  }

  // Check active suppression record for company
  const { data: compSupp } = await supabase
    .from("prospect_suppression_list")
    .select("id, reason, suppression_type")
    .eq("company_id", person.company_id)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1);

  if (compSupp && compSupp.length > 0) {
    return NextResponse.json(
      { error: `Outreach blocked — company suppressed: ${compSupp[0].reason}`, suppressed: true },
      { status: 403 }
    );
  }

  // 3. Load assessment (provided or latest ready assessment)
  let assessment_id = body.assessment_id as string | null ?? null;
  let assessmentData: Record<string, unknown> | null = null;
  let signals: Array<{ signal_category: string; signal_type: string; signal_text: string }> = [];

  if (assessment_id) {
    const { data } = await supabase
      .from("prospect_assessments")
      .select("id, business_moment_summary, shiftimpact_entry_point, recommended_offer, offer_rationale")
      .eq("id", assessment_id)
      .single();
    assessmentData = data as Record<string, unknown> | null;
  } else {
    const { data } = await supabase
      .from("prospect_assessments")
      .select("id, business_moment_summary, shiftimpact_entry_point, recommended_offer, offer_rationale")
      .eq("company_id", person.company_id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assessmentData = data as Record<string, unknown> | null;
    assessment_id  = assessmentData?.id as string | null ?? null;
  }

  // Load latest topline insight — includes new pitch-ready fields
  const { data: toplineInsight } = await supabase
    .from("prospect_insights")
    .select("best_entry_angle, first_engagement_offer, decision_window_weeks, spend_signal, partner_lens, aoai_recommended_offer")
    .eq("company_id", person.company_id)
    .eq("depth_level", "topline")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Load latest deep dive — for person-specific hook if available
  const { data: deepInsight } = await supabase
    .from("prospect_insights")
    .select("recommended_person_name, recommended_person_role, recommended_person_hook, meeting_objective, competitive_moat")
    .eq("company_id", person.company_id)
    .eq("depth_level", "deep")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Load top signals for context
  const { data: signalRows } = await supabase
    .from("business_signals")
    .select("signal_category, signal_type, signal_text")
    .eq("company_id", person.company_id)
    .is("duplicate_of_id", null)
    .order("detected_at", { ascending: false })
    .limit(5);
  signals = (signalRows ?? []) as typeof signals;

  // 4. Build context for AI
  const companyName    = (company?.name           ?? "the company") as string;
  const companyIndustry = (company?.industry      ?? "unknown industry") as string;
  const companyMarket  = (company?.market_code    ?? "MY") as string;
  const companyProfile = (company?.company_profile_summary ?? "") as string;

  const relationshipContext = [
    `Relationship status: ${person.relationship_status}`,
    person.warm_intro_possible ? `Warm intro possible via: ${person.warm_intro_via}` : null,
    person.previous_interaction ? `Previous interaction: ${person.previous_interaction}` : null,
    `Network connection: ${person.network_connection_status}`,
  ].filter(Boolean).join("\n");

  const signalContext = signals.length > 0
    ? signals.map((s) => `- [${s.signal_category}] ${s.signal_type}: ${s.signal_text}`).join("\n")
    : "No specific signals detected — write a general positioning message.";

  const ti = toplineInsight as Record<string, unknown> | null;
  const di = deepInsight as Record<string, unknown> | null;

  const assessmentContext = [
    assessmentData ? [
      `Business moment: ${assessmentData.business_moment_summary}`,
      `Entry point: ${assessmentData.shiftimpact_entry_point}`,
      `Recommended offer: ${assessmentData.recommended_offer}`,
      `Offer rationale: ${assessmentData.offer_rationale}`,
    ].join("\n") : "No assessment — write based on signals only.",

    ti?.best_entry_angle
      ? `\nBEST ENTRY ANGLE (use this as the core of your opening — do NOT copy verbatim, adapt to Janine's voice):\n"${ti.best_entry_angle}"`
      : "",

    ti?.first_engagement_offer
      ? `\nFIRST ENGAGEMENT OFFER (how to position the offer — use this framing, adapted to prose):\n${ti.first_engagement_offer}`
      : "",

    di?.recommended_person_hook && di?.recommended_person_name === person.name
      ? `\nPERSON-SPECIFIC HOOK (written for ${person.name} — adapt to Janine's voice):\n"${di.recommended_person_hook}"`
      : "",

    di?.meeting_objective
      ? `\nMEETING OBJECTIVE (the ONE thing this message should set up):\n${di.meeting_objective}`
      : "",

    ti?.decision_window_weeks
      ? `\nURGENCY: Decision window is ~${ti.decision_window_weeks} weeks — the message should feel timely, not forced.`
      : "",
  ].filter(Boolean).join("\n");

  // 5. Generate draft via Sonnet
  const model = await getModel("model_outreach_draft", "claude-sonnet-4-6");

  const { data: queueJob } = await supabase
    .from("ai_processing_queue")
    .insert({
      queue_type:    "outreach_draft",
      priority:      1,
      status:        "processing",
      company_id:    person.company_id as string,
      model_tier:    "sonnet",
      input_payload: { person_id: person_id as string, channel, assessment_id },
      started_at:    new Date().toISOString(),
    })
    .select("id")
    .single();

  const queue_id = queueJob?.id ?? null;

  let draftResult: { message_draft: string; subject_line: string; voice_check: Record<string, unknown> } | null = null;
  let tokensUsed = 0;

  try {
    const aiResp = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: VOICE_SYSTEM_PROMPT,
      tool_choice: { type: "tool", name: "generate_outreach" },
      tools: [OUTREACH_TOOL],
      messages: [{
        role: "user",
        content: `Write a ${channel} outreach draft from Janine Wai to ${person.name} (${person.role} at ${companyName}).

PROSPECT COMPANY:
Name: ${companyName}
Industry: ${companyIndustry} | Market: ${companyMarket}
Profile: ${companyProfile || "Not available"}

BUSINESS SIGNALS:
${signalContext}

ASSESSMENT INTELLIGENCE:
${assessmentContext}

RELATIONSHIP CONTEXT:
${relationshipContext}

CHANNEL: ${channel}

Write the message entirely in Janine's voice. Reference the business signals naturally — do NOT reveal that AI was used or that you ran a scan. Make the opening specific to a real observable event about ${companyName}.`,
      }],
    });

    tokensUsed = (aiResp.usage?.input_tokens ?? 0) + (aiResp.usage?.output_tokens ?? 0);

    const toolUse = aiResp.content.find((b) => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      draftResult = toolUse.input as typeof draftResult;
    }
  } catch (aiErr) {
    if (queue_id) {
      await supabase.from("ai_processing_queue").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_log: [{ ts: new Date().toISOString(), msg: String(aiErr) }],
      }).eq("id", queue_id);
    }
    return NextResponse.json({ error: "Draft generation failed", detail: String(aiErr) }, { status: 500 });
  }

  if (!draftResult) {
    return NextResponse.json({ error: "No draft generated" }, { status: 500 });
  }

  // 6. Persist outreach record — status: Drafted, message_sent: NULL (human gate)
  const { data: outreachRow, error: outreachErr } = await supabase
    .from("outreach")
    .insert({
      person_id:     person_id as string,
      assessment_id: assessment_id ?? null,
      channel:       channel as string,
      message_draft: draftResult.message_draft,
      message_sent:  null,    // stays NULL until human approves
      status:        "Drafted",
      drafted_at:    new Date().toISOString(),
    })
    .select("id, person_id, assessment_id, channel, message_draft, status, drafted_at")
    .single();

  if (outreachErr || !outreachRow) {
    return NextResponse.json({ error: outreachErr?.message ?? "Outreach insert failed" }, { status: 500 });
  }

  // 7. Complete queue job
  const estimatedCost = tokensUsed > 0
    ? Number(((tokensUsed / 1_000_000) * 3.0).toFixed(6))   // Sonnet ~$3/M tokens
    : null;

  if (queue_id) {
    await supabase.from("ai_processing_queue").update({
      status:         "complete",
      model_used:     model,
      tokens_used:    tokensUsed || null,
      estimated_cost: estimatedCost,
      completed_at:   new Date().toISOString(),
      output_payload: { outreach_id: outreachRow.id },
    }).eq("id", queue_id);
  }

  return NextResponse.json({
    outreach:    outreachRow,
    subject_line: draftResult.subject_line,
    voice_check: draftResult.voice_check,
    model_used:  model,
    // Explicit human gate reminder
    next_action: "Review and edit the draft, then PATCH /api/prospect-outreach/[id] with { action: 'approve' } to mark as approved. Send manually — the platform never sends on your behalf.",
  }, { status: 201 });
}
