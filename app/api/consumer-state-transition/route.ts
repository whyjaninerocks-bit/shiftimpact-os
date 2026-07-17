// app/api/consumer-state-transition/route.ts
// F27 — Consumer State Transition Rate Engine
// Sprint 21 · 18 July 2026
//
// POST /api/consumer-state-transition
// Body:
//   campaign_id:        string
//   week_number:        number
//   week_of:            string (ISO date, e.g. "2026-07-14")
//   state_distribution: { "1": number, ..., "6": number }  — % summing to ~100
//
// Computation:
//   dominant_state    — state key with highest %
//   cstr_vs_prior     — { "1_to_2": delta, ..., "5_to_6": delta }
//                       delta = current[i+1] - prior[i+1] (pp moved)
//   velocity_score    — weighted average of CSTR deltas (positive = advancing)
//   state_stall_flag  — TRUE if 4+ of 5 transition deltas are within ±0.5pp
//
// ACCESS RULES:
//   state_distribution, dominant_state, cstr_vs_prior, velocity_score: INTERNAL ONLY
//   state_stall_flag, state_stall_note: INTERNAL ONLY
//   ai_narrative: ONLY field shared with client (plain language, no state codes)
//
// Saves to consumer_state_readings (migration 0013 — already live in production)

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

// ─── Dominant state computation ───────────────────────────────────────────────
// Returns the state number (1–6) with the highest audience % this week.

function computeDominantState(dist: Record<string, number>): number {
  let best = 1;
  let bestVal = -1;
  for (const [k, v] of Object.entries(dist)) {
    const key = parseInt(k, 10);
    if (!isNaN(key) && key >= 1 && key <= 6 && v > bestVal) {
      best = key;
      bestVal = v;
    }
  }
  return best;
}

// ─── CSTR computation ─────────────────────────────────────────────────────────
// For each adjacent pair i → i+1:
//   CSTR = current[i+1] - prior[i+1]
//   Positive = more audience in higher state vs last week → forward momentum
//   Negative = fewer in higher state → regression

function computeCstr(
  current: Record<string, number>,
  prior: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (let i = 1; i <= 5; i++) {
    const key = `${i}_to_${i + 1}`;
    const cur = current[String(i + 1)] ?? 0;
    const pri = prior[String(i + 1)] ?? 0;
    result[key] = parseFloat((cur - pri).toFixed(2));
  }
  return result;
}

// ─── Velocity score ───────────────────────────────────────────────────────────
// Weighted average of CSTR values.
// Early-funnel transitions weighted higher — more audience, more signal.

const VELOCITY_WEIGHTS: Record<string, number> = {
  "1_to_2": 0.25,
  "2_to_3": 0.25,
  "3_to_4": 0.20,
  "4_to_5": 0.20,
  "5_to_6": 0.10,
};

function computeVelocityScore(cstr: Record<string, number>): number {
  let score = 0;
  for (const [key, weight] of Object.entries(VELOCITY_WEIGHTS)) {
    score += (cstr[key] ?? 0) * weight;
  }
  return parseFloat(score.toFixed(2));
}

// ─── Stall flag ───────────────────────────────────────────────────────────────
// Stall = 4 or more of 5 transition pairs show < 0.5pp movement (flat).
// stall_note lists which transitions are stalling — INTERNAL ONLY.

function computeStall(cstr: Record<string, number>): {
  stall_flag: boolean;
  stall_note: string;
} {
  const flatTransitions = Object.entries(cstr)
    .filter(([, delta]) => Math.abs(delta) < 0.5)
    .map(([key]) => key);

  if (flatTransitions.length < 4) {
    return { stall_flag: false, stall_note: "" };
  }

  const note = `Minimal movement (<0.5pp) in: ${flatTransitions.join(", ")}`;
  return { stall_flag: true, stall_note: note };
}

// ─── State descriptors — INTERNAL to AI prompt, NEVER in output ──────────────

const STATE_DESCRIPTORS: Record<number, string> = {
  1: "Unaware (no brand recognition in this audience segment)",
  2: "Aware but Passive (brand recognised, no engagement or consideration yet)",
  3: "Aware but Unconvinced (aware, but no positive associations formed)",
  4: "In Consideration (actively evaluating this brand vs alternatives)",
  5: "Intent-Active (clear intent signals — search, store visits, add-to-cart)",
  6: "Post-Purchase (converted — loyalty and repeat purchase at stake)",
};

// ─── AI Tool ──────────────────────────────────────────────────────────────────

const CSTR_TOOL = {
  name: "submit_consumer_transition_narrative",
  description: "Submit the consumer audience progression narrative for this campaign week.",
  input_schema: {
    type: "object" as const,
    properties: {
      ai_narrative: {
        type: "string",
        description: [
          "3–4 sentences in plain business language.",
          "Describes how the campaign audience is progressing this week vs last week.",
          "CRITICAL: NEVER mention state numbers (1–6) or state names (Unaware, Aware, In Consideration, etc.) — these are internal classification tools and must never appear in client-facing output.",
          "Use directional marketing language: 'awareness is building', 'consideration is stalling', 'intent signals are accelerating', 'the audience remains in early-awareness territory', etc.",
          "Reference velocity direction: positive velocity = audience advancing, negative = regressing.",
          "If stall flag is active, clearly state that strategic intervention is needed to unlock momentum.",
          "This narrative may be shared directly with the client — write accordingly.",
        ].join(" "),
      },
    },
    required: ["ai_narrative"],
  },
} as const;

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Consumer Progression Intelligence embedded in ShiftImpact OS.

You interpret audience movement data across a proprietary 6-stage consumer behaviour model. This model is an internal tool — its stage numbers and stage names are NEVER referenced in client-facing output.

CRITICAL OUTPUT RULES:
- NEVER mention state numbers (1–6) or state names (Unaware, Aware Passive, In Consideration, etc.) in ai_narrative
- Use plain business language: "awareness is building", "consideration has stalled", "purchase intent is accelerating", "the audience is not yet converting", etc.
- Write for a brand marketer, not a data scientist
- Be direct — do not soften a stall or negative velocity with vague language
- 3–4 sentences maximum`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_id,
      week_number,
      week_of,
      state_distribution,
    }: {
      campaign_id: string;
      week_number: number;
      week_of: string;
      state_distribution: Record<string, number>;
    } = body;

    if (!campaign_id || !week_number || !week_of || !state_distribution) {
      return NextResponse.json(
        { error: "campaign_id, week_number, week_of, and state_distribution are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Load campaign + client name for context
    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("name, clients(name)")
      .eq("id", campaign_id)
      .maybeSingle();

    if (cErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const clientName = (campaign.clients as { name: string } | null)?.name ?? "Unknown Brand";

    // 2. Load prior reading (most recent week before this one)
    const { data: priorReadings } = await supabase
      .from("consumer_state_readings")
      .select("week_number, state_distribution, velocity_score")
      .eq("campaign_id", campaign_id)
      .lt("week_number", week_number)
      .order("week_number", { ascending: false })
      .limit(1);

    const priorReading = priorReadings?.[0] ?? null;

    // 3. Compute dominant state
    const dominant_state = computeDominantState(state_distribution);

    // 4. Compute CSTR if prior reading exists
    let cstr_vs_prior: Record<string, number> | null = null;
    let velocity_score: number | null = null;
    let stall_flag = false;
    let stall_note = "";

    if (priorReading) {
      const priorDist = priorReading.state_distribution as Record<string, number>;
      cstr_vs_prior = computeCstr(state_distribution, priorDist);
      velocity_score = computeVelocityScore(cstr_vs_prior);
      const stall = computeStall(cstr_vs_prior);
      stall_flag = stall.stall_flag;
      stall_note = stall.stall_note;
    }

    // 5. Load BIP for context
    const { data: bip } = await supabase
      .from("big_idea_platforms")
      .select("topline_idea, cultural_tension")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    // 6. Build user prompt
    const dominantDesc = STATE_DESCRIPTORS[dominant_state] ?? "Unknown";
    const totalPct = Object.values(state_distribution).reduce((a, b) => a + b, 0);

    const cstrLines = cstr_vs_prior
      ? Object.entries(cstr_vs_prior)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `  ${k}: ${v > 0 ? "+" : ""}${v}pp`)
          .join("\n")
      : "  (First reading for this campaign — no prior week to compare)";

    const velocityLabel =
      velocity_score === null
        ? "N/A (first reading)"
        : velocity_score > 0
        ? `+${velocity_score} (advancing)`
        : velocity_score < 0
        ? `${velocity_score} (regressing)`
        : "0.00 (flat)";

    const userPrompt = `BRAND: ${clientName}
CAMPAIGN: ${campaign.name}

── BIG IDEA PLATFORM ──
Topline Idea: ${bip?.topline_idea ?? "Not filled"}
Cultural Tension: ${bip?.cultural_tension ?? "Not filled"}

── WEEK ${week_number} STATE DISTRIBUTION [INTERNAL — do NOT reference in narrative] ──
Dominant audience stage this week: ${dominantDesc}
${Object.entries(state_distribution)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .map(([k, v]) => `  State ${k}: ${v.toFixed(1)}%`)
  .join("\n")}
Distribution total: ${totalPct.toFixed(1)}%

── CONSUMER TRANSITION RATES vs PRIOR WEEK [INTERNAL] ──
${cstrLines}

── VELOCITY SUMMARY ──
Campaign Velocity Score: ${velocityLabel}
Stall Flag: ${stall_flag ? `YES — ${stall_note}` : "No stall detected"}

── TASK ──
Write a 3–4 sentence plain-language narrative about how this campaign's audience is progressing.
Do not use state numbers or state names.
If stall flag is YES, clearly signal that strategic intervention is needed to unlock momentum.`;

    // 7. Generate AI narrative
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_cstr", "claude-sonnet-4-6");

    const aiResponse = await anthropic.messages.create({
      model,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      tools: [CSTR_TOOL],
      tool_choice: { type: "tool", name: "submit_consumer_transition_narrative" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("AI did not return a tool_use block");
    }

    const { ai_narrative } = toolBlock.input as { ai_narrative: string };

    // 8. Upsert to consumer_state_readings (unique on campaign_id + week_number)
    const { data: saved, error: saveErr } = await supabase
      .from("consumer_state_readings")
      .upsert(
        {
          campaign_id,
          week_number,
          week_of,
          state_distribution,
          dominant_state,
          cstr_vs_prior,
          velocity_score,
          state_stall_flag: stall_flag,
          state_stall_note: stall_note,
          ai_narrative,
          reading_source: "behaviour-state",
        },
        { onConflict: "campaign_id,week_number" }
      )
      .select("id, created_at")
      .single();

    if (saveErr) {
      console.error("/api/consumer-state-transition save error:", saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      id: saved?.id,
      campaign_id,
      week_number,
      week_of,
      dominant_state,
      cstr_vs_prior,
      velocity_score,
      state_stall_flag: stall_flag,
      state_stall_note: stall_note,
      ai_narrative,
      created_at: saved?.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/consumer-state-transition error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
