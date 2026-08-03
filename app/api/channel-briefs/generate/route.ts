// app/api/channel-briefs/generate/route.ts
// POST /api/channel-briefs/generate
// Generates AI-written discipline briefs (stored in stage_briefs) for each
// active channel on a campaign. Requires FRAME Brief to be Locked.
//
// Body: { campaign_id: string }
// Returns: { ok: true, generated: string[] } — list of channels briefed

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const CHANNEL_HINTS: Record<string, string> = {
  "Digital / Social": "social media platforms (TikTok, Instagram, Facebook, X). Native platform mechanics, short-form video, save/share/comment as engagement signals.",
  "KOL / Influencer":  "creator partnerships and KOL content. Authentic storytelling, creator-native formats, audience trust as the primary currency.",
  "PR / Earned Media": "press, journalists, and earned editorial. Newsworthiness, story angle, media relations, not brand language.",
  "Radio":             "audio-only broadcast (ERA FM and equivalents). Hook in the first 3 seconds, sound design, voice tone, call to action. No visuals.",
  "Retail / In-Store": "physical retail environment. Last-mile conversion trigger, shelf standout, proximity-to-purchase messaging, shopper psychology.",
};

async function generateChannelBrief(
  channel: string,
  frame: Record<string, unknown>,
  bip: Record<string, unknown>
): Promise<{ brief_body: string; propagation_mechanism: string }> {
  const client = new Anthropic();
  const channelHint = CHANNEL_HINTS[channel] ?? channel;

  const prompt = `You are writing a discipline brief for a ${channel} campaign activation.

CHANNEL CONTEXT: ${channelHint}

THE CAMPAIGN BRIEF:
Business Imperative: ${frame.force || "Not set"}
Audience: ${frame.role || "Not set"}
Audience Life Context: ${frame.anchor || "Not set"}
Emotional Tone: ${frame.mood || "Not set"}
Brand Expression: ${frame.expression || "Not set"}
What We Want People to Say: ${frame.clarity_statement || "Not set"}
What We're Fighting: ${frame.enemy_villain || "Not set"}
Cultural Context: ${frame.primary_cultural_context || "None"}

THE BIG IDEA:
${bip.topline_idea || "Not yet defined"}
Brand's Non-Transferable Role: ${bip.brand_role || "Not set"}
How the Idea Travels: ${bip.propagation_mechanism || "Not set"}
Cultural Tension We're Resolving: ${bip.cultural_tension || "Not set"}
Native Media Expression: ${bip.media_idea || "Not set"}
How It Shows Up Everywhere: ${bip.expression_summary || "Not set"}

Write a focused discipline brief for ${channel}. Structure your response EXACTLY as follows (use these headings):

CHANNEL ROLE
(1-2 sentences: what must ${channel} achieve in this campaign? Be specific to the funnel stage this channel owns.)

THE IDEA ON THIS CHANNEL
(2-3 sentences: how does the big idea live specifically on ${channel}? Be channel-native — what format, mechanic, or behaviour makes this idea work here specifically?)

3 CONTENT EXECUTIONS
1. [Specific execution idea — 1 sentence]
2. [Specific execution idea — 1 sentence]
3. [Specific execution idea — 1 sentence]

BRAND GUARDRAILS
(1-2 constraints this channel must respect from the brand expression and enemy definition)

WHAT MOVES THE IDEA FORWARD
(1 sentence: what happens on ${channel} that earns the idea's next moment — what is the propagation trigger?)

Write for a creative/media agency team who will execute this immediately. Under 280 words total. Do not repeat the big idea verbatim — interpret it for this channel's native mechanics.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Extract propagation trigger for the stage_briefs.propagation_mechanism field
  const propMatch = text.match(/WHAT MOVES THE IDEA FORWARD\s*\n([\s\S]+?)(?:\n\n|$)/);
  const propagation_mechanism = propMatch ? propMatch[1].trim() : "";

  return { brief_body: text, propagation_mechanism };
}

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = (await req.json()) as { campaign_id: string };
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch FRAME brief — must be Locked and have active_channels
    const { data: frame, error: frameErr } = await supabase
      .from("frame_briefs")
      .select("*")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    if (frameErr) return NextResponse.json({ error: frameErr.message }, { status: 500 });
    if (!frame) return NextResponse.json({ error: "FRAME Brief not found" }, { status: 404 });
    if (frame.lock_status !== "Locked") {
      return NextResponse.json(
        { error: "FRAME Brief must be Locked before generating discipline briefs" },
        { status: 422 }
      );
    }

    const activeChannels: string[] = frame.active_channels ?? [];
    if (activeChannels.length === 0) {
      return NextResponse.json({ error: "No active channels selected in the brief" }, { status: 422 });
    }

    // Fetch BIP
    const { data: bip } = await supabase
      .from("big_idea_platforms")
      .select("*")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    // Find existing stage_briefs for this campaign to avoid duplicates
    const { data: existing } = await supabase
      .from("stage_briefs")
      .select("channel")
      .eq("campaign_id", campaign_id);
    const existingChannels = new Set((existing ?? []).map((b: { channel: string }) => b.channel));

    // Generate and insert briefs for channels not yet briefed
    const generated: string[] = [];

    for (const channel of activeChannels) {
      if (existingChannels.has(channel)) {
        // Already briefed — skip (don't overwrite human-edited briefs)
        continue;
      }

      try {
        const { brief_body, propagation_mechanism } = await generateChannelBrief(
          channel,
          frame as Record<string, unknown>,
          (bip ?? {}) as Record<string, unknown>
        );

        const { error: insertErr } = await supabase.from("stage_briefs").insert({
          campaign_id,
          stage: "Demand", // Default to Demand stage
          channel,
          brief_body,
          propagation_mechanism,
          idea_led_vs_spend_led: "Idea-Led",
          status: "Draft",
        });

        if (insertErr) {
          console.error(`Failed to insert brief for ${channel}:`, insertErr.message);
        } else {
          generated.push(channel);
        }
      } catch (e) {
        console.error(`Error generating brief for ${channel}:`, e);
      }
    }

    return NextResponse.json({ ok: true, generated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
