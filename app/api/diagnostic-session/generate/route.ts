// app/api/diagnostic-session/generate/route.ts
// Sprint 11 — Generate Diagnostic Session Deliverable
// INTERNAL ONLY
//
// POST /api/diagnostic-session/generate
// Body: { session_id: string }
//
// Reads the session record, calls Claude Sonnet,
// produces a structured Diagnostic Brief the client receives.
// Saves deliverable_text + brief_json back to diagnostic_sessions.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: session, error: fetchErr } = await supabase
      .from("diagnostic_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const channels = (session.current_channels ?? []).join(", ") || "Not specified";

    const prompt = `You are ShiftImpact OS — a Growth Intelligence platform built for FMCG, QSR, and consumer goods brands in Southeast Asia. You are generating a Diagnostic Session Brief for a prospective client.

STRICT COPY RULES:
- No dashes or hyphens in any copy
- No "CMO" anywhere
- No "journey" anywhere
- Traffic light colours only (Green, Amber, Red) when referencing health or risk
- Write as a sharp, credible strategist. No consulting padding.
- All figures in Malaysian Ringgit (RM) unless specified otherwise

CLIENT INPUT:
Company: ${session.client_name}
Industry: ${session.industry}
Budget Range: ${session.budget_range ?? "Not disclosed"}
Active Channels: ${channels}
Current Tools / Attribution: ${session.current_tools ?? "None specified"}
Pain Points: ${session.pain_points ?? "Not specified"}

Produce a Diagnostic Session Brief with exactly these sections:

1. CURRENT STATE ASSESSMENT
One paragraph. Where this brand sits today relative to what a growth-intelligent brand looks like. Name their specific channels and gaps. Be direct.

2. INTELLIGENCE GAPS (3 specific gaps)
For each gap:
- Gap name (1 line, bold concept)
- What is missing and why it costs them
- The specific ShiftImpact OS signal or feature that closes it (S1 Demand Signal, S2 Save Signal, S3 UGC Signal, FRAME Brief, Kill Switches, Campaign OS Digest, OIE, etc.)

3. RECOMMENDED ACTIVATION SEQUENCE
What to build first (in 3 steps). Each step: what it produces, what decision it enables, how long to set up.

4. PREDICTION: What This Brand Can Know In 60 Days
Specific, quantified where possible. What signal data, what accuracy, what business decision it enables. Ground in their actual channels and category.

5. INVESTMENT JUSTIFICATION
One paragraph. Why RM${session.engagement_fee_rm?.toLocaleString("en-MY") ?? "5,000"} is the right entry fee for this brand, in terms of what signal intelligence they are currently flying blind on and what the cost of that blindness is per campaign.

Return the brief in plain text. Use section headers (ALL CAPS). No JSON.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_diagnostic_generate", "claude-sonnet-4-6");

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const deliverable = (msg.content[0] as { type: string; text: string }).text ?? "";

    // Build brief_json for structured access
    const sections = deliverable.split(/\n(?=[1-5]\.|[A-Z]{4,})/);
    const brief_json = {
      generated_at: new Date().toISOString(),
      model,
      section_count: sections.length,
      word_count: deliverable.split(/\s+/).length,
    };

    // Save to database
    const { error: saveErr } = await supabase
      .from("diagnostic_sessions")
      .update({
        deliverable_text: deliverable,
        brief_json,
        model_used: model,
        status: "In Progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    if (saveErr) {
      console.error("Failed to save diagnostic deliverable:", saveErr);
    }

    return NextResponse.json({
      session_id,
      deliverable,
      model_used: model,
      brief_json,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/diagnostic-session/generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
