// app/api/stage-brief-autodraft/route.ts
// Sprint 8 — FRAME Brief → Stage Brief auto-draft
// INTERNAL ONLY
//
// POST /api/stage-brief-autodraft
// Body: { campaign_id: string, frame_brief_id: string }
//
// Reads locked FRAME brief and generates Stage Brief drafts for each
// active channel + funnel stage combination. Saves to stage_brief_autodrafts.
//
// Returns the generated drafts for UI review before promotion.

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

const FUNNEL_STAGES = [
  { name: "Awareness", objective_hint: "build reach and memory structure for the brand" },
  { name: "Consideration", objective_hint: "drive active evaluation and intent signals" },
  { name: "Conversion", objective_hint: "capture purchase-ready demand and remove friction" },
];

const CHANNEL_DEPARTMENTS: Record<string, string> = {
  Meta: "Media",
  TikTok: "Media",
  YouTube: "Media",
  OOH: "Media",
  "Digital OOH": "Media",
  Radio: "Media",
  Print: "Media",
  CTV: "Media",
  Programmatic: "Media",
  Influencer: "Content",
  Search: "Media",
  PR: "Content",
  Email: "CRM",
  WhatsApp: "CRM",
  Shopee: "Commerce",
  Lazada: "Commerce",
  Grab: "Commerce",
};

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, frame_brief_id } = await req.json();
    if (!campaign_id || !frame_brief_id) {
      return NextResponse.json({ error: "campaign_id and frame_brief_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get the FRAME brief
    const { data: frame } = await supabase
      .from("frame_briefs")
      .select("anchor, mood, clarity_statement, demand_investment_pct, active_channels, industry_category, lock_status")
      .eq("id", frame_brief_id)
      .maybeSingle();

    if (!frame) {
      return NextResponse.json({ error: "FRAME brief not found" }, { status: 404 });
    }

    // Get campaign + client info
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, industry_profile, clients(name)")
      .eq("id", campaign_id)
      .single();

    // Get existing stage briefs (avoid duplicating live ones)
    const { data: existingBriefs } = await supabase
      .from("stage_briefs")
      .select("stage_name, channel, status")
      .eq("campaign_id", campaign_id)
      .in("status", ["Live", "Approved"]);

    const existingKeys = new Set(
      (existingBriefs ?? []).map((b: { stage_name: string; channel: string }) => `${b.stage_name}|${b.channel}`)
    );

    // Get campaign learning for context
    const { data: learning } = await supabase
      .from("campaign_learning_records")
      .select("what_worked, anchor_recommendation")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    const activeChannels = (frame.active_channels ?? []) as string[];
    if (activeChannels.length === 0) {
      return NextResponse.json({ error: "No active channels set on FRAME brief" }, { status: 400 });
    }

    // Build the prompt
    const existingBriefsNote = existingKeys.size > 0
      ? `\nExisting live/approved briefs (do NOT draft these again): ${[...existingKeys].join(", ")}`
      : "";

    const learningNote = learning
      ? `\nCAMPAIGN LEARNING:\n  What worked: ${String(learning.what_worked ?? "").slice(0, 200)}\n  Anchor rec: ${String(learning.anchor_recommendation ?? "").slice(0, 150)}`
      : "";

    const prompt = `You are the ShiftImpact OS Strategy Engine. Generate Stage Brief drafts for this campaign.

FRAME BRIEF (locked):
  Anchor: ${frame.anchor ?? "Not set"}
  Mood Register: ${frame.mood ?? "Not set"}
  Clarity Statement: ${frame.clarity_statement ?? "Not set"}
  Demand Investment: ${frame.demand_investment_pct ?? "?"}%
  Active Channels: ${activeChannels.join(", ")}
  Industry: ${frame.industry_category ?? campaign?.industry_profile ?? "FMCG"}

CAMPAIGN: ${campaign?.name ?? "Unknown"}
CLIENT: ${(campaign?.clients as Record<string, unknown> | null)?.name ?? "Unknown"}
${learningNote}
${existingBriefsNote}

Generate ONE Stage Brief for each combination of (funnel stage × channel) that makes strategic sense.
Do NOT generate a brief for every combination — only the ones that make sense for the channel's natural funnel role.
Use these channel-stage conventions:
  - OOH / Radio / Print / CTV → Awareness only
  - Programmatic / YouTube → Awareness + Consideration
  - Meta / TikTok → all three stages but weight Awareness + Consideration
  - Search → Consideration + Conversion
  - Influencer / PR → Awareness + Consideration
  - Email / WhatsApp → Consideration + Conversion (CRM)
  - Shopee / Lazada / Grab → Conversion only

STAGE OBJECTIVES:
  Awareness: build reach and memory structure
  Consideration: drive active evaluation and intent signals
  Conversion: capture purchase-ready demand and remove friction

STRICT RULES:
- No dashes or hyphens in copy
- No "CMO"
- stage_objective must be 1 sentence, specific to this brand's anchor and channel
- idea_led must be 1-2 sentences: the specific creative or tactical direction Claude recommends
- draft_rationale must explain why this stage+channel combination matters for this FRAME anchor
- Keep language sharp, not generic

Respond with valid JSON:
{
  "drafts": [
    {
      "stage_name": "Awareness",
      "stage_objective": "...",
      "channel": "Meta",
      "idea_led": "...",
      "department": "Media",
      "draft_rationale": "..."
    }
  ]
}

Return ONLY the JSON.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_stage_autodraft", "claude-sonnet-4-6");

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text ?? "";
    let parsed: { drafts?: Array<Record<string, unknown>> } = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      parsed = {};
    }

    const drafts = (parsed.drafts ?? []).filter((d: Record<string, unknown>) => {
      const key = `${d.stage_name}|${d.channel}`;
      return !existingKeys.has(key);
    });

    if (drafts.length === 0) {
      return NextResponse.json({ drafts: [], message: "All stage+channel combinations are already covered by live/approved briefs." });
    }

    // Save drafts to DB (clear old unpromotied drafts first)
    await supabase
      .from("stage_brief_autodrafts")
      .delete()
      .eq("campaign_id", campaign_id)
      .eq("frame_brief_id", frame_brief_id)
      .eq("promoted", false);

    const toInsert = drafts.map((d: Record<string, unknown>) => ({
      campaign_id,
      frame_brief_id,
      stage_name:     (d.stage_name as string) ?? "",
      stage_objective: (d.stage_objective as string) ?? "",
      channel:        (d.channel as string) ?? "",
      idea_led:       (d.idea_led as string) ?? "",
      department:     (d.department as string) ?? CHANNEL_DEPARTMENTS[d.channel as string] ?? "Media",
      draft_rationale: (d.draft_rationale as string) ?? "",
      model_used:     model,
    }));

    const { data: saved, error: saveErr } = await supabase
      .from("stage_brief_autodrafts")
      .insert(toInsert)
      .select("id, stage_name, channel, stage_objective, idea_led, department, draft_rationale, promoted");

    if (saveErr) {
      console.error("/api/stage-brief-autodraft save error:", saveErr);
    }

    return NextResponse.json({
      drafts: saved ?? toInsert,
      count: (saved ?? toInsert).length,
      model_used: model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/stage-brief-autodraft error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST /api/stage-brief-autodraft/promote ─────────────────────────────────
// Handled separately — see promote route below

// ─── GET — fetch existing autodrafts for a campaign ──────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaign_id = searchParams.get("campaign_id");
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data } = await supabase
      .from("stage_brief_autodrafts")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("promoted", false)
      .order("generated_at", { ascending: false });

    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
