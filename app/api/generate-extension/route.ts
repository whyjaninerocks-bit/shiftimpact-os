import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const CHANNEL_RULES: Record<string, string> = {
  Radio: "Audio only. Tension must hit in the first 5 words. No visual dependency. The human emotion must be audible — not described. 15–30 second hook.",
  KOL: "Creator-native format. Save-bait mechanic required. The creator is the proof, not the brand. Brief must specify: what the creator shows, what they say, what the save trigger is.",
  Retail: "One moment, no copy. Brand signal only. The shelf/POS must communicate the tension without words. Think visual disruption at point of decision.",
  Digital: "Scroll-stopping hook in first 2 seconds. Idea stays identical — only the format adapts to platform. Specify format: Reel, carousel, static, story.",
  PR: "Journalist angle, not brand angle. What is the cultural tension that earns coverage? Frame as a story a media outlet would write — not a press release.",
  CRM: "Personal trigger, high intimacy. One clear reward signal. The reader must feel this was written for them specifically. Timing matters — specify the trigger event.",
  Custom: "Adapt the Big Idea faithfully to this channel's specific constraints. Identify what makes this touchpoint unique and how the idea must be expressed through it.",
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const body = await request.json();
  const { campaign_id, channel_name, channel_category, translation_hint } = body;

  if (!campaign_id || !channel_name) {
    return NextResponse.json({ error: "campaign_id and channel_name required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch FRAME Brief for this campaign
  const { data: frame } = await supabase
    .from("frame_briefs")
    .select("force, role, anchor, mood, expression, clarity_statement, ics_threshold")
    .eq("campaign_id", campaign_id)
    .single();

  if (!frame) return NextResponse.json({ error: "FRAME Brief not found" }, { status: 404 });
  if (frame.ics_threshold === "Stop") {
    return NextResponse.json({ error: "ICS score is Stop — FRAME must be reworked before generating channel briefs." }, { status: 400 });
  }

  const channelRule = CHANNEL_RULES[channel_category] ?? CHANNEL_RULES.Custom;
  const hint = translation_hint ? `\nClient-specific channel note: ${translation_hint}` : "";

  const prompt = `You are writing a channel brief for a campaign. You have the locked FRAME Brief below. Your job is to translate the Big Idea faithfully into this specific channel — not create a new idea.

LOCKED FRAME BRIEF:
- Force (cultural tension): ${frame.force}
- Role (brand job): ${frame.role}
- Anchor (the one idea): ${frame.anchor}
- Mood (emotional tone): ${frame.mood}
- Expression (execution style): ${frame.expression}
- Clarity Statement: ${frame.clarity_statement}

CHANNEL: ${channel_name} (${channel_category})
CHANNEL RULES: ${channelRule}${hint}

Write a channel brief in this structure:
**Idea Anchor** — one sentence: how the Big Idea lives in this channel specifically
**Execution Format** — the specific format, length, or placement
**Hook / Open** — the first moment (what the audience sees/hears first)
**Core Message** — the idea body in this channel's language
**Propagation Mechanism** — what does this channel execution do to earn the audience's movement to the next stage?
**Do Not** — one line on what must never appear in this execution (to prevent idea drift)

Keep it tight. Every line must trace back to the FRAME anchor. Do not invent new ideas.`;

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content.find((b) => b.type === "text");
  const brief_body = text && text.type === "text" ? text.text : "";

  // Save to idea_extensions
  const { data: ext, error } = await supabase
    .from("idea_extensions")
    .insert({
      campaign_id,
      channel_name,
      channel_category: channel_category || "Custom",
      brief_body,
      frame_anchor: frame.anchor,
      mood_register: frame.mood,
      clarity_statement: frame.clarity_statement,
      propagation_mechanism: "",
      ai_generated: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ extension: ext });
}
