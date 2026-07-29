import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";

export const maxDuration = 60;

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

// ─── ShiftImpact OS context injected into every assessment ────────────────────
const SHIFTIMPACT_CONTEXT = `
SHIFTIMPACT OS — WHO WE ARE AND WHAT WE DO:
ShiftImpact is NOT a creative agency and NOT a management consultancy. We are a strategic intelligence and narrative consultancy. We help Southeast Asian brands at inflection points make better decisions and tell coherent stories that hold across all stakeholder audiences simultaneously.

SHIFTIMPACT ICP (ideal client profile — be specific about fit):
• Mid-to-large brand: MYR 50M+ revenue OR PE/VC-backed OR publicly listed
• In FMCG, financial services, technology, retail, or healthcare
• At a clear inflection point: product launch, market expansion, ownership change, leadership transition, or repositioning
• Has a NARRATIVE GAP — doing bold operational things but the external story is fragmented, delayed, or disconnected from the moves
• Has a commercial leader (CMO, Head of Marketing, CCO, or Founder) who feels the tension between execution speed and strategy coherence
• Has budget authority for strategic advisory: typically MYR 80K–300K engagement

SHIFTIMPACT SERVICE PORTFOLIO (match the right service to this specific moment):
1. Brand Clarity Audit — diagnoses narrative fragmentation; right for brands with inconsistent messaging across markets, post-merger brand confusion, or launch narratives that don't cohere. Typically 4–6 weeks, MYR 80K–150K.
2. FRAME Brief — proprietary strategic brief format that aligns ALL brand communications to one platform BEFORE execution begins; right for brands about to launch, reposition, or enter a new market. Typically 3–4 weeks, MYR 60K–100K.
3. Campaign Intelligence (ICS scoring) — evaluates campaign strategy against market signals before execution budget is committed; right for brands that have lost confidence in their agency or need a second opinion before a major spend. Typically 2–3 weeks, MYR 40K–80K.
4. Signals Intelligence Retainer (Command Desk) — ongoing brand health monitoring and strategic decision support; right for brands navigating multi-year transformations. Typically monthly retainer MYR 25K–50K/month.
5. Launch Readiness Audit — market-readiness assessment for new products or market entries. Typically 2–3 weeks, MYR 50K–80K.

SIGNAL FIT PATTERNS — use these to score and reason:
HIGH FIT (opportunity score 70+, pursuit score 60+):
• Product launch WITHOUT a clear unified brand narrative → Brand Clarity Audit or FRAME Brief
• M&A / ownership change creating stakeholder confusion or valuation narrative gap → Brand Clarity Audit + Command Desk
• Leadership transition (new CMO/CEO) simultaneous with strategic pivot → Command Desk
• Award wins that signal a narrative that needs strategic foundation to sustain → Brand Clarity Audit
• Regional expansion into new market without clear positioning → FRAME Brief
• Partnership announcements being communicated tactically, not strategically → FRAME Brief

LOW FIT (score below 50, recommend Watch or Pass):
• Company in explicit cost-cutting or financial distress mode — budget frozen
• Pure operational news (factory expansion, HR appointment) with NO brand/marketing angle
• Leadership is exclusively operational (only COO/CFO visible, no CMO/CDO/marketing leader)
• Category is in terminal decline and repositioning is implausible
• Company is too early-stage (pre-revenue or seed stage) — not yet at ShiftImpact's scale

SPEND SIGNAL — assess budget availability from signals:
• "Budget likely available": company is investing (new hire, launch, expansion), has recent revenue milestones, or is PE/VC-backed with growth mandate
• "Budget possibly frozen": dividend cut, cost restructuring signals, ownership uncertainty creating decision paralysis
• "Budget signal unclear": insufficient evidence to determine

DECISION WINDOW — assess urgency:
• 0–4 weeks: launch is live NOW, acquisition announcement is fresh, new leadership just started
• 4–12 weeks: strategic plan announced but execution hasn't started, award win needs capitalisation
• 12–24 weeks: signals are real but window is not yet urgent — time to warm the relationship
• 24+ weeks: early signals, relationship building phase

════════════════════════════════════════════════════════
AOAI / ACQUISITION OS™ — OUR MARKETING EXECUTION PARTNER
════════════════════════════════════════════════════════

WHAT AOAI ACTUALLY IS:
AOAI delivers the Acquisition OS™ — a complete 6-pillar lead operating system that attracts, captures, nurtures, converts, and retains high-value leads on autopilot. It is NOT a brand agency or a creative shop. It is a marketing infrastructure business. First results in 90 days, compounding ROI.

THE 6 PILLARS — KNOW THESE PRECISELY:

P00 STRATEGISE (RM 3,500 one-time, delivered in 2 weeks):
Delivers a 30–50 page Strategy Blueprint. Includes: ICP research (2–3 psychographic personas with booking triggers, objections, decision hierarchy), competitive positioning map, master messaging document, 90-day activation roadmap, KPI scorecard. RM 3,500 is fully credited toward any retainer. THIS IS THE ENTRY POINT for first engagements.

P01 ATTRACT (part of Growth retainer RM 8,800/month):
Demand generation. Includes: content marketing engine (SEO blogs, LinkedIn articles, short-form video), paid traffic campaigns (Meta, Google, LinkedIn ads with retargeting — target ROAS 3x+), social proof architecture (case studies, testimonials, media features), high-conversion landing pages (single CTA, A/B tested copy, 15–30% CVR target). 30–50% MoM organic traffic growth target.

P02 CAPTURE (part of Growth retainer):
Lead conversion infrastructure. Includes: lead magnet ecosystem (tools, audits, e-books, webinars — high-value content for contact data), CRM + lead scoring + tagging (source attribution, automated lead scoring — hottest leads always visible), AI chatbot & instant response (24/7 qualifying chat that books calls automatically, <5 min response time). 100% lead source attribution.

P03 NURTURE (part of Growth retainer):
Trust acceleration. Includes: behaviour-triggered email flows (welcome, education, objection handling, re-engagement — zero manual effort), value-based content drip (weekly tips, case studies), multi-channel retargeting (email, SMS, WhatsApp, social ads — "they're everywhere" presence), personalisation by industry/behaviour/funnel stage. Email open rates 35%+, 20%+ cold lead revival in 60 days, SQL from MQL up 30–50%.

P04 CONVERT (part of Full OS RM 18,800/month):
Sales activation. Includes: consultative sales framework (repeatable discovery-to-close process), automated booking system (calendar sync, reminders, no-show recovery), proposal & offer optimisation (ROI calculators, risk reversals, tiered pricing), objection handling playbooks. Close rate +20–40%, sales cycle cut 40–50%.

P05 RETAIN (part of Full OS):
Growth engine. Includes: client success & onboarding, referral & affiliate programme, upsell/cross-sell triggers, live ROI dashboard (CPL, CAC, LTV, churn, NPS tracked monthly). LTV 2–3x in 12 months, churn below 5%, 30%+ leads from referrals.

ACTIVATIONOS AI LEAD ENGINE (add-on or integrated):
AI agent that responds to every lead within 30 seconds, 24/7, across WhatsApp, Facebook Messenger, Instagram DM, web widget, email, SMS, Telegram. Qualifies by budget/timeline/urgency/pain point, books meetings directly into calendars, hands off to sales with full conversation history. Used by: OSC Orthopaedic Hospital (40% no-show reduction), India International Insurance (projected $2M revenue uplift, 10x call centre capacity). Best for high-volume lead environments.

PRICING:
• Starter (P00 only): RM 3,500 one-time → ideal for first-engagement pilots, fully credited toward retainer
• Growth (P00–P03): RM 8,800/month → strategy + traffic + capture + nurture, targeting 30%+ growth in 90 days
• Full OS (all 6 pillars): RM 18,800/month → complete self-funding acquisition infrastructure
• Ad spend billed separately; no ad management fee charged on top

AOAI FIT CRITERIA — map signals to pillars:
• Brand launching a product (FMCG, D2C, health) → P01 ATTRACT (paid traffic to health-conscious consumers) + P02 CAPTURE (AI chatbot + landing pages to convert trial to repeat) → Growth retainer
• Brand with lead volume but no CRM or follow-up system → P02 CAPTURE + P03 NURTURE → Growth retainer
• Medical, dental, real estate, insurance, education — high lead volume, response time critical → ActivationOS AI Lead Engine
• B2B brand needing structured sales process → P04 CONVERT → Full OS
• Brand that has high churn or poor repeat purchase → P05 RETAIN → Full OS
• Brand at early strategy stage only, no execution gap yet → P00 STRATEGISE (Starter) as entry, AOAI Growth after ShiftImpact FRAME Brief is done
• Brand is purely narrative/positioning, no marketing execution problem → Not a fit for AOAI now

JOINT SHIFTIMPACT + AOAI PITCH (use this when partner_lens = Both):
ShiftImpact defines WHO the brand is talking to and WHAT it should say (ICP, narrative, positioning, FRAME Brief). AOAI builds the system that FINDS those exact people, CAPTURES them, NURTURES them, and CONVERTS them at scale. ShiftImpact's ICP research directly inputs into AOAI's P00 Strategy Blueprint, saving 2–3 weeks and improving every downstream pillar. Together: the prospect gets a coherent brand story AND a predictable revenue machine — not one without the other.

AOAI CAMPAIGN MECHANIC — describe THIS company's specific execution:
Do NOT just name a pillar. Describe: which channels, which audiences, what mechanic, what conversion goal, what 90-day output. Example for Gardenia Breakthru Bread: "P01 Meta + TikTok paid traffic targeting health-conscious Malaysians aged 25–40 in Klang Valley, leading to a high-conversion landing page with a free Breakthru trial mechanic; P02 WhatsApp AI chatbot to qualify interested buyers and route to nearby retailer or online purchase; P03 email drip educating on functional nutrition benefits to convert trial into repeat. 90-day output: measurable repeat purchase rate from health segment."
`;

// ─── Assessment tool ──────────────────────────────────────────────────────────
const ASSESS_TOOL: Anthropic.Tool = {
  name: "generate_assessment",
  description: "Generate a highly specific prospect assessment grounded in ShiftImpact OS methodology",
  input_schema: {
    type: "object" as const,
    properties: {
      business_moment_summary: {
        type: "string",
        description: "2–3 sentences SPECIFIC to this company: what exact events are converging right now? Name the specific signals. No generic industry observations.",
      },
      shiftimpact_entry_point: {
        type: "string",
        description: "One sentence: the EXACT business tension or narrative gap ShiftImpact can address — name the specific problem, not a category of problem.",
      },
      recommended_approach: {
        type: "string",
        description: "One paragraph: how ShiftImpact would open the relationship and frame the first engagement — specific to this company's moment, not generic advisory language.",
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
        description: "One sentence: why THIS specific offer for THIS specific moment — reference the actual signal(s) that determine the choice.",
      },
      opportunity_score: {
        type: "number",
        description: "0–100: how significant and time-sensitive is this business moment? Score against the ShiftImpact signal fit patterns. 80+ = rare timing window; 60–79 = clear moment; 40–59 = real but not urgent; below 40 = weak signal.",
      },
      pursuit_score: {
        type: "number",
        description: "0–100: composite of (a) ICP fit, (b) budget signal, (c) decision-maker accessibility, (d) competitive window. Be honest — a high opportunity score does not automatically mean high pursuit score.",
      },
      opportunity_rationale: {
        type: "string",
        description: "One sentence: which specific signal(s) drove this score and why.",
      },
      pursuit_rationale: {
        type: "string",
        description: "One sentence: what is the single biggest factor supporting OR limiting the pursuit score.",
      },
      // ── Topline strategic intelligence ────────────────────────────────────
      recommendation: {
        type: "string",
        enum: ["Pursue", "Watch", "Pass"],
        description: "Pursue = invest time and relationship capital now; Watch = keep on radar, re-assess in 4–8 weeks; Pass = not the right moment or wrong ICP fit.",
      },
      benchmark_context: {
        type: "string",
        description: "One sentence with a concrete number: how do these scores compare to similar prospects in this market and sector? E.g. 'Composite of 71 sits above the MY FMCG median of ~58, driven by concurrent launch + relocation signals.' Reference actual sector dynamics, not generic statements.",
      },
      market_context: {
        type: "string",
        description: "2–3 sentences: what specific named competitors, market events, or macro forces are shaping THIS company's moment right now? Name competitors. Name market events. No generic industry observations.",
      },
      best_entry_angle: {
        type: "string",
        description: "One crisp, bold sentence: the single sharpest conversation-opening hook for ShiftImpact — it must demonstrate that ShiftImpact has already diagnosed the prospect's specific problem before the meeting begins. If it could apply to any company in the sector, rewrite it.",
      },
      // ── Decision window and spend ──────────────────────────────────────────
      decision_window_weeks: {
        type: "number",
        description: "Estimated weeks until the business moment window closes — after which the urgency to engage will drop. E.g. a live product launch = 4–8 weeks; an announced strategy plan = 12–16 weeks; early leadership signal = 24 weeks.",
      },
      spend_signal: {
        type: "string",
        enum: ["Budget likely available", "Budget possibly frozen", "Budget signal unclear"],
        description: "Assessment of budget availability based on the signals — reference the specific evidence.",
      },
      first_engagement_offer: {
        type: "string",
        description: "The specific first engagement framing — not just the service name, but how you would POSITION the offer to THIS company at THIS moment. E.g. 'A Brand Clarity Audit framed not as a brand exercise but as a commercial risk assessment before the Breakthru Bread retail push — what happens if the launch narrative doesn't hold?' This should feel like a pitch line, not a service description.",
      },
      // ── Partner lens — ShiftImpact vs AOAI ───────────────────────────────
      partner_lens: {
        type: "string",
        enum: ["ShiftImpact", "AOAI", "Both"],
        description: "ShiftImpact = strategic intelligence, narrative, positioning work only. AOAI = marketing execution (paid media, activation, infrastructure). Both = needs strategy AND execution — the combined offer eliminates the strategy-to-execution gap.",
      },
      aoai_recommended_offer: {
        type: "string",
        enum: [
          "Acquisition OS Starter (P00)",
          "Acquisition OS Growth (P00-P03)",
          "Acquisition OS Full OS (All 6 Pillars)",
          "ActivationOS AI Lead Engine",
          "Not a fit",
        ],
        description: "Which specific Acquisition OS tier fits this company's lead/acquisition problem? P00 Starter = strategy clarity only; P00-P03 Growth = strategy + paid traffic + capture + nurture (RM 8,800/month); All 6 Pillars = add conversion + retention (RM 18,800/month); ActivationOS = high-volume lead response (medical, insurance, real estate, education). Reference the actual signals.",
      },
      aoai_entry_angle: {
        type: "string",
        description: "One sentence: the sharpest AOAI conversation-opening hook — must reference the company's specific execution challenge, not just name the service. If partner_lens is ShiftImpact only, write 'Not applicable'.",
      },
      aoai_campaign_mechanic: {
        type: "string",
        description: "If AOAI is relevant: describe the specific campaign mechanic or execution approach AOAI would run for this company — what platforms, what format, what market, what conversion goal. E.g. 'Retail sampling programme at Aeon and Lotus's targeting health-conscious shoppers in the Klang Valley, combined with Meta retargeting to convert trial into repeat purchase.' If not a fit, write 'Not applicable'.",
      },
      aoai_joint_pitch: {
        type: "string",
        description: "If partner_lens is Both: one paragraph describing the combined ShiftImpact + AOAI offer — ShiftImpact does X (strategy), AOAI does Y (execution), the combined outcome is Z. Make it specific to this company's moment. If partner_lens is ShiftImpact only, write 'Not applicable'.",
      },
    },
    required: [
      "business_moment_summary","shiftimpact_entry_point","recommended_approach",
      "recommended_offer","offer_rationale",
      "opportunity_score","pursuit_score","opportunity_rationale","pursuit_rationale",
      "recommendation","benchmark_context","market_context","best_entry_angle",
      "decision_window_weeks","spend_signal","first_engagement_offer",
      "partner_lens","aoai_recommended_offer","aoai_entry_angle",
      "aoai_campaign_mechanic","aoai_joint_pitch",
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

  // Load signals (non-duplicates, most recent 8 — keep prompt lean for Vercel 60s budget)
  const { data: signals } = await supabase
    .from("business_signals")
    .select(`
      id, signal_category, signal_type, signal_text, detected_at,
      evidence_sources ( source_confidence, verification_status, headline, url )
    `)
    .eq("company_id", company_id)
    .is("duplicate_of_id", null)
    .order("detected_at", { ascending: false })
    .limit(8);

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

  // Use Haiku for all assessments — Sonnet exceeds Vercel 60s budget with rich signal context.
  // Upgrade path: move to background queue (Sprint 5+) when async assess is needed.
  const modelTier = "haiku" as const;
  const model     = await getModel("model_prospect_scan", "claude-haiku-4-5-20251001");

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

  // 3. Build signal context for AI — truncate signal_text to keep prompt small
  const signalContext = signals.map((s, i) => {
    const evid = (s.evidence_sources as Array<{ source_confidence?: string; headline?: string }> | null) ?? [];
    const conf = evid[0]?.source_confidence ?? "Medium";
    const text = (s.signal_text ?? "").slice(0, 160);
    return `${i + 1}. [${s.signal_category}] ${s.signal_type}: ${text} (confidence: ${conf})`;
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
      max_tokens: 1800,
      tool_choice: { type: "tool", name: "generate_assessment" },
      tools: [ASSESS_TOOL],
      messages: [{
        role: "user",
        content: `You are a senior business development strategist at ShiftImpact OS with deep knowledge of Southeast Asian brand and marketing dynamics. Your assessments are specific, commercially grounded, and never generic.

${SHIFTIMPACT_CONTEXT}

═══════════════════════════════════════════════
PROSPECT TO ASSESS
═══════════════════════════════════════════════
COMPANY: ${company.name}
Industry: ${company.industry} | Market: ${company.market_code} | Size: ${company.size_band ?? "Unknown"} | Business Model: ${company.business_model ?? "Unknown"}
Company Profile: ${company.company_profile_summary || "No profile available"}

BUSINESS SIGNALS DETECTED (${signals.length} signals):
${signalContext}

${OFFER_GUIDE}

═══════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════
Generate a precise, commercially grounded assessment. Your job is to produce intelligence that is specific to THIS company's exact moment — not generic industry observations.

SCORING:
• Opportunity Score (0–100): how significant and time-sensitive is this business moment? 80+ = rare timing window NOW; 60–79 = clear moment; 40–59 = real but not urgent; <40 = weak signal. Score against ShiftImpact signal fit patterns above.
• Pursuit Score (0–100): composite of (a) ICP fit, (b) budget signal, (c) decision-maker accessibility, (d) competitive window. Be honest — a high Opportunity Score does NOT automatically mean high Pursuit Score.

PARTNER LENS RULES:
• ShiftImpact only: the problem is strategic narrative, positioning, or brand clarity — no marketing execution gap visible
• AOAI only: the company needs lead acquisition infrastructure (paid traffic, chatbot, CRM, nurture) but the narrative is clear
• Both: the company needs BOTH a coherent strategic narrative AND a lead acquisition system — this is the most powerful combined pitch

AOAI: map signals to the real Acquisition OS pillars (P00–P05) and ActivationOS. Do NOT use generic terms. Describe the specific mechanic: which channels, which audiences, what conversion goal, what 90-day output.

Every field must be specific to ${company.name}. If it could apply to any company in the sector, it is too generic — rewrite it.`,
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
  try { await supabase.from("assessment_signals").insert(junctionRows); } catch { /* non-fatal */ }

  // Persist scores — try with company_id (migration 0028), fall back without it
  const oppScore    = Math.round(assessment.opportunity_score as number);
  const pursuitScore = Math.round(assessment.pursuit_score as number);

  const { error: scoreErr } = await supabase
    .from("prospect_scores")
    .insert({
      assessment_id:         assessmentRow.id,
      company_id:            company_id as string,
      opportunity_score:     oppScore,
      pursuit_score:         pursuitScore,
      opportunity_rationale: assessment.opportunity_rationale ?? "",
      pursuit_rationale:     assessment.pursuit_rationale     ?? "",
      surfaced_at:           new Date().toISOString(),
    });

  if (scoreErr) {
    // company_id column may not exist yet (migration 0028 pending) — retry without it
    console.error("[prospect-assess] scores insert failed:", scoreErr.message, "— retrying without company_id");
    const { error: scoreErr2 } = await supabase
      .from("prospect_scores")
      .insert({
        assessment_id:         assessmentRow.id,
        opportunity_score:     oppScore,
        pursuit_score:         pursuitScore,
        opportunity_rationale: assessment.opportunity_rationale ?? "",
        pursuit_rationale:     assessment.pursuit_rationale     ?? "",
        surfaced_at:           new Date().toISOString(),
      });
    if (scoreErr2) console.error("[prospect-assess] scores fallback insert also failed:", scoreErr2.message);
  }

  // 6. Persist topline insight (recommendation, benchmark, market context, best angle, partner lens + new specificity fields)
  const { error: insightErr } = await supabase
    .from("prospect_insights")
    .insert({
      company_id:              company_id as string,
      assessment_id:           assessmentRow.id,
      depth_level:             "topline",
      recommendation:          assessment.recommendation          ?? null,
      benchmark_context:       assessment.benchmark_context       ?? null,
      market_context:          assessment.market_context          ?? null,
      best_entry_angle:        assessment.best_entry_angle        ?? null,
      partner_lens:            assessment.partner_lens            ?? null,
      aoai_recommended_offer:  assessment.aoai_recommended_offer  ?? null,
      aoai_entry_angle:        assessment.aoai_entry_angle        ?? null,
      // High-specificity fields (migration 0032)
      decision_window_weeks:   assessment.decision_window_weeks   ?? null,
      spend_signal:            assessment.spend_signal            ?? null,
      first_engagement_offer:  assessment.first_engagement_offer  ?? null,
      aoai_campaign_mechanic:  assessment.aoai_campaign_mechanic  ?? null,
      aoai_joint_pitch:        assessment.aoai_joint_pitch        ?? null,
    });
  if (insightErr) console.error("[prospect-assess] insight insert failed:", insightErr.message);

  // 7. Update company partner_tag from assessment
  const partnerLens = (assessment.partner_lens as string | null) ?? null;
  if (partnerLens) {
    await supabase.from("companies").update({ partner_tag: partnerLens }).eq("id", company_id as string);
  }

  // 8. Auto-qualify company if pursuit_score >= 50
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
    insight: {
      recommendation:         assessment.recommendation,
      benchmark_context:      assessment.benchmark_context,
      market_context:         assessment.market_context,
      best_entry_angle:       assessment.best_entry_angle,
      decision_window_weeks:  assessment.decision_window_weeks,
      spend_signal:           assessment.spend_signal,
      first_engagement_offer: assessment.first_engagement_offer,
      partner_lens:           assessment.partner_lens,
      aoai_recommended_offer: assessment.aoai_recommended_offer,
      aoai_entry_angle:       assessment.aoai_entry_angle,
      aoai_campaign_mechanic: assessment.aoai_campaign_mechanic,
      aoai_joint_pitch:       assessment.aoai_joint_pitch,
    },
    model_used:    model,
    model_tier:    modelTier,
    signals_used:  signals.length,
    queue_id,
  });
}
