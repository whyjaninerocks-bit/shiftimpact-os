// app/api/cultural-signals/[id]/handoff/route.ts
// POST /api/cultural-signals/[id]/handoff
// Generates a creative handoff brief (Part 3) via Claude.
// ShiftImpact stays diagnostic — the brief supplies signal + timing + territory,
// never the finished creative work.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import { getModel } from "@/lib/ai-model";

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch the signal
  const { data: signal, error: fetchError } = await supabase
    .from("cultural_signals")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !signal) {
    return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  }

  // Need brand fit assessment before generating handoff
  if (!signal.why_it_matters || !signal.brand_fit_notes) {
    return NextResponse.json(
      { error: "Complete Part 2 (brand fit assessment) before generating the handoff brief." },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  const prompt = `You are a cultural intelligence analyst at ShiftImpact. Your role is diagnostic — you supply the signal, the cultural read, and the timing. You never produce creative assets or finished campaign work. That stays with the brand's creative team.

Write a creative handoff brief for the following cultural signal. The brief should give a creative team everything they need to know to decide whether and how to act on this signal — not tell them what to make.

CULTURAL SIGNAL:
Name: ${signal.signal_name}
Type: ${signal.signal_type}
Market: ${signal.geographic_scope}
Trending / moving: ${signal.is_trending ? "Yes — currently gaining momentum" : "No — permanent and ordinary (ignored because it is not new, not because it is not real)"}

WHAT WAS OBSERVED:
Source: ${signal.source_description}
Evidence: ${signal.evidence}

CULTURAL READ (Part 2):
Why this matters: ${signal.why_it_matters}
Brand fit assessment: ${signal.brand_fit_notes}
Brand fit verdict: ${signal.brand_fit_status}
Community respect check passed: ${signal.community_respect_check ? "Yes" : "No — flag this before proceeding"}

---

Write the handoff brief in this exact format. Use plain language. No bullet walls. No marketing jargon. Copy rules: no dashes or hyphens in copy, no "CMO" in any output.

## The Signal

[One paragraph. What was observed, where, and why it caught attention. Specific, not generic. Include the verbatim evidence.]

## The Cultural Read

[One paragraph. Why this is happening. What it means. Whether it is moving or permanent and ordinary. Be honest about uncertainty.]

## The Territory

[One paragraph. What creative space this opens. What this brand could plausibly own here and why. Ground this in the brand fit assessment.]

## The Timing Window

[One short paragraph. Is this time-sensitive or durable? What happens if they move now versus later?]

## The Constraint

[One paragraph. The one rule that cannot be relaxed: there must be a genuine, respectful connection to the real people or community behind this signal. If there is not one, do not proceed. State explicitly whether the community respect check was passed and what it means for the creative direction.]

## Questions for the Creative Team

[3 to 5 open questions the creative team should answer before developing work. These are questions, not directions. ShiftImpact does not answer them — the brand and their team do.]

---

Keep the total brief under 600 words. Write as a peer handing over intelligence to a trusted creative partner, not as a consultant delivering a report.`;

  let handoffBrief: string;
  try {
    const message = await client.messages.create({
      model: getModel("sonnet"),
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    handoffBrief = message.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    return NextResponse.json(
      { error: `AI generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // Save to database
  const { data: updated, error: saveError } = await supabase
    .from("cultural_signals")
    .update({
      handoff_brief:        handoffBrief,
      handoff_generated_at: new Date().toISOString(),
      status:               "briefed",
    })
    .eq("id", id)
    .select()
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ signal: updated, handoff_brief: handoffBrief });
}
