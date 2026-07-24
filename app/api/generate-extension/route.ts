// generate-extension/route.ts
// Sprint 30+ · upgraded channel brief — structured JSON, three-lens eval, BIP context
//
// Output format (brief_body is stored as JSON string, __v:2):
//   idea_spine, concept_rationale, win_conditions, propagation_mechanism,
//   cog_lens, cfo_lens, cco_lens, anchor_integrity_check, do_not, client_notes
//
// Backwards compat: v1 briefs (plain text) are untouched.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Pre-baked channel win conditions ────────────────────────────────────────

interface ChannelWinSpec {
  conditions: string;
  kpis: string;
  watchout: string;
}

const CHANNEL_WIN: Record<string, ChannelWinSpec> = {
  Radio: {
    conditions: "Tension stated in first 5 words. Sound creates the mental image — no visual dependency. Brand identifiable by audio mark alone. 15s hook holds, 30s full message earns recall.",
    kpis: "Brand recognition in blind test >65%. Unaided recall after 3 exposures >40%. Frequency floor 3x per week in market.",
    watchout: "Audio theatre, not radio copy. If it reads as a script, it will play as an ad.",
  },
  KOL: {
    conditions: "Creator's authentic voice carries the tension — no scripted brand language. Audience ICP overlap >70%. Save-bait mechanic fires in first 7 seconds. Creator is the proof, not the brand.",
    kpis: "Save rate on creator content >5% (above brand-owned average). Comment-to-like ratio >8%. Re-share velocity within 48 hours of posting.",
    watchout: "Brief the tension, not the script. Over-briefing kills creator credibility and audience trust.",
  },
  Retail: {
    conditions: "Point-of-decision disruption. One visual signal communicates tension without copy. Brand identifiable in under 1 second at 2 metre distance. Idea wins at shelf, not just in isolation.",
    kpis: "Shelf standout score >70% in fixture audit. Basket attachment rate uplift vs control store. Purchase conversion lift at POS.",
    watchout: "The competitor product is 30cm away. Win the moment — the shopper has 3 seconds.",
  },
  Digital: {
    conditions: "Hook lands in under 2 seconds. Idea is recognisable with sound off. Brand identifiable within 3 seconds. Platform format is native, not adapted TV.",
    kpis: "VCR >40% (TikTok), >55% (Meta Reels). Save rate >3.5% (FMCG benchmark). Share rate >1.8%. Comment depth avg >15 words.",
    watchout: "If it looks like an ad, it loses. Platform-native behaviour beats brand guidelines.",
  },
  PR: {
    conditions: "The cultural tension earns the coverage — not the brand announcement. Story survives without the brand name in the headline. Journalist angle, not brand angle.",
    kpis: "Tier 1 media placements. Unprompted story replication within 72 hours. Social sharing of earned coverage by non-branded accounts.",
    watchout: "If it reads like a press release, it gets treated like one.",
  },
  CRM: {
    conditions: "Triggered by consumer behaviour, not a calendar date. Personalisation goes beyond name — references specific usage or purchase pattern. One CTA. Timing is the creative.",
    kpis: "Open rate >25% (FMCG CRM benchmark). Click-to-conversion >4%. Unsubscribe rate <0.3%.",
    watchout: "Relevance beats frequency. One well-timed message outperforms three calendar blasts.",
  },
  Custom: {
    conditions: "Define what winning looks like in this environment before execution begins. Set a pre-agreed measurement threshold that can be read weekly.",
    kpis: "To be defined based on channel specifics and available measurement infrastructure.",
    watchout: "Custom channels require custom measurement. Do not retrofit standard KPIs onto non-standard environments.",
  },
};

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const body = await request.json();
  const { campaign_id, channel_name, channel_category, translation_hint } = body;

  if (!campaign_id || !channel_name) {
    return NextResponse.json({ error: "campaign_id and channel_name required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Fetch all relevant OS context ──────────────────────────────────────────

  const [frameRes, bipRes, campaignRes] = await Promise.all([
    supabase
      .from("frame_briefs")
      .select("force, role, anchor, mood, expression, clarity_statement, ics_threshold, ics_weighted_total, industry_category, campaign_pathway")
      .eq("campaign_id", campaign_id)
      .single(),
    supabase
      .from("big_idea_platforms")
      .select("topline_idea, brand_role, propagation_mechanism, cultural_tension, media_idea, expression_summary, lock_status")
      .eq("campaign_id", campaign_id)
      .single(),
    supabase
      .from("campaigns")
      .select("name, current_phase, gate_signal_status, industry_profile")
      .eq("id", campaign_id)
      .single(),
  ]);

  const frame = frameRes.data;
  if (!frame) {
    const detail = frameRes.error?.message ?? "no row returned";
    return NextResponse.json({ error: `FRAME Brief not found: ${detail}` }, { status: 404 });
  }
  if (frame.ics_threshold === "Stop") {
    return NextResponse.json({ error: "ICS score is Stop — FRAME must be reworked before generating channel briefs." }, { status: 400 });
  }

  const bip = bipRes.data;
  const campaign = campaignRes.data;

  // ── Pre-baked win conditions for this channel ───────────────────────────────
  const winSpec = CHANNEL_WIN[channel_category] ?? CHANNEL_WIN.Custom;
  const prebakedWinConditions = `CONDITIONS: ${winSpec.conditions}\n\nKEY KPIs: ${winSpec.kpis}\n\nWATCHOUT: ${winSpec.watchout}`;

  // ── Build AI prompt ─────────────────────────────────────────────────────────
  const hint = translation_hint ? `\nClient channel note: ${translation_hint}` : "";

  const bipContext = bip
    ? `\nBIG IDEA PLATFORM (${bip.lock_status}):\n- Topline Idea: ${bip.topline_idea}\n- Brand Role: ${bip.brand_role}\n- Cultural Tension: ${bip.cultural_tension}\n- Propagation Mechanism: ${bip.propagation_mechanism}\n- Media Idea: ${bip.media_idea}\n- Expression Summary: ${bip.expression_summary}`
    : "\nBIG IDEA PLATFORM: Not yet defined.";

  const campaignContext = campaign
    ? `\nCAMPAIGN CONTEXT:\n- Name: ${campaign.name}\n- Current Phase: ${campaign.current_phase}\n- Gate Signal: ${campaign.gate_signal_status}\n- Industry: ${campaign.industry_profile}`
    : "";

  const prompt = `You are a senior strategy director at ShiftImpact OS writing a comprehensive channel brief. You have the full campaign context below. Your job is to translate the Big Idea faithfully into this specific channel — not create a new idea.

LOCKED FRAME BRIEF:
- Force (cultural tension): ${frame.force}
- Role (brand job): ${frame.role}
- Anchor (the one idea): ${frame.anchor}
- Mood (emotional tone): ${frame.mood}
- Expression (execution style): ${frame.expression}
- Clarity Statement: ${frame.clarity_statement}
- Industry: ${frame.industry_category ?? "Not specified"}
- Pathway: ${frame.campaign_pathway ?? "Not specified"}
- ICS Score: ${frame.ics_weighted_total ?? "Not scored"} (${frame.ics_threshold ?? "Unknown"})
${bipContext}
${campaignContext}

CHANNEL: ${channel_name} (${channel_category})
PRE-BAKED WIN CONDITIONS FOR THIS CHANNEL:
${prebakedWinConditions}${hint}

TEAM LENS FRAMEWORK — use these three lenses to stress-test and strengthen your brief content. Do NOT output them as separate fields — weave their insights into win_conditions, concept_rationale, and the strategic recommendation below:
- CHIEF OF GROWTH (CoG): Demand, audience acquisition, market penetration, funnel stage fit. Does this earn new buyers?
- CFO: Budget efficiency, ROI defensibility, MMM data contribution, attribution readiness. Is this spend bankable?
- CCO: Creative standard, idea integrity, FRAME anchor hold, brand aspiration. Would this make Cannes/Effies/AMES?

Return ONLY a valid JSON object — no markdown, no explanation, no code fences — with exactly these keys:

{
  "__v": 2,
  "idea_spine": "One sharp sentence: how the Big Idea lives in this specific channel. Must trace directly to the FRAME anchor.",
  "concept_rationale": "2-3 sentences: why this channel for this idea at this funnel stage. What does this channel uniquely do that others cannot? Weave in CoG and CCO thinking — does this earn new buyers, and does it hold the creative standard?",
  "win_conditions": "AI-enriched win conditions for this campaign + channel. Build on the pre-baked conditions with campaign-specific targets. Include: what growth signal this channel generates (CoG read), whether the spend is MMM-attributable and board-defensible (CFO read), and the creative integrity bar this execution must clear (CCO read). Write as a single integrated block, not labelled sub-sections.",
  "propagation_mechanism": "What does this channel execution do to earn the audience's movement to the next stage? Be specific about the mechanism.",
  "strategic_recommendation": "3-4 sentences. The integrated brief recommendation — what to do, why it works for this idea in this channel, and what proof of success looks like. This is the output the team acts on.",
  "anchor_integrity_check": "A candid assessment: what is the single biggest risk of idea drift in this channel? What would cause this execution to lose the FRAME anchor?",
  "do_not": "One line only: what must NEVER appear in this execution. The red line that protects the idea.",
  "client_notes": ""
}`;

  const anthropic = new Anthropic({ apiKey });
  // Prefill the assistant turn with "{" — forces the model to continue the JSON object
  // and prevents it from wrapping the output in markdown code fences.
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: "{" },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  // Prepend the "{" we prefilled — the model continues from after it
  const rawText = "{" + (textBlock && textBlock.type === "text" ? textBlock.text : "");

  // Parse the JSON directly — prefill guarantees no markdown fences
  let briefObj: Record<string, unknown>;
  try {
    briefObj = JSON.parse(rawText);
  } catch {
    // Fallback: extract first complete {...} block — try to close a truncated JSON
    const trimmed = rawText.trimEnd();
    // If truncated mid-object, try appending closing brace
    const candidates = [trimmed, trimmed + '""}', trimmed + '"}'];
    let parsed: Record<string, unknown> | null = null;
    for (const c of candidates) {
      try { parsed = JSON.parse(c); break; } catch { /* continue */ }
    }
    briefObj = parsed ?? { __v: 1, _raw: rawText };
  }

  const brief_body = JSON.stringify(briefObj);
  const propagation_mechanism = (typeof briefObj.propagation_mechanism === "string")
    ? briefObj.propagation_mechanism
    : "";

  // ── Save to idea_extensions ─────────────────────────────────────────────────
  // Check if an extension already exists for this campaign + channel
  const { data: existing } = await supabase
    .from("idea_extensions")
    .select("id")
    .eq("campaign_id", campaign_id)
    .eq("channel_name", channel_name)
    .single();

  let saveError;
  if (existing) {
    // Re-generate: update the existing record
    const { error } = await supabase
      .from("idea_extensions")
      .update({
        brief_body,
        frame_anchor: frame.anchor,
        mood_register: frame.mood,
        clarity_statement: frame.clarity_statement,
        propagation_mechanism,
        channel_category: channel_category || "Custom",
        ai_generated: true,
      })
      .eq("id", existing.id);
    saveError = error;
  } else {
    // New brief: insert
    const { error } = await supabase
      .from("idea_extensions")
      .insert({
        campaign_id,
        channel_name,
        channel_category: channel_category || "Custom",
        brief_body,
        frame_anchor: frame.anchor,
        mood_register: frame.mood,
        clarity_statement: frame.clarity_statement,
        propagation_mechanism,
        ai_generated: true,
      });
    saveError = error;
  }

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
