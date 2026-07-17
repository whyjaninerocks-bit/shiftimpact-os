// app/api/behaviour-state/route.ts
// Feature 18A — Consumer Behaviour State Diagnostic (Sprint 3)
// Internal only. Not exposed to clients.
//
// POST /api/behaviour-state
// Reads F12 signal data + F13 channel health for the requested week,
// classifies the consumer behaviour state using Claude Haiku (6-state model),
// saves the result back to consumer_behaviour_states.
//
// Auth: service role (Supabase JWT) — strategy lead and Janine only.
// CRITICAL: State names, numbers, and classification system are
//   NEVER surfaced to the Client Interface.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase admin client ────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BehaviourStateRequest {
  campaign_id: string;
  week_number: number;
}

type SignalHealth = "Green" | "Amber" | "Red";

interface SignalWeeklyRow {
  signal_1_actual_pct: number | null;
  signal_1_label?: string;
  signal_2_actual_pct: number | null;
  signal_2_label?: string;
  signal_3_actual_count: number | null;
  signal_3_label?: string;
  demand_health: SignalHealth | null;
  nurture_health: SignalHealth | null;
  conversion_health: SignalHealth | null;
  campaign_phase: number | null;
}

interface ThresholdRow {
  signal_1_label: string;
  signal_2_label: string;
  signal_3_label: string;
  campaign_duration_weeks: number;
}

// ─── Tool schema ──────────────────────────────────────────────────────────────

const BEHAVIOUR_STATE_TOOL = {
  name: "submit_behaviour_state_diagnosis",
  description: "Submit the consumer behaviour state classification and diagnosis.",
  input_schema: {
    type: "object" as const,
    properties: {
      diagnosed_state: {
        type: "integer",
        description: "The classified consumer state as an integer 1–6.",
        minimum: 1,
        maximum: 6,
      },
      state_name: {
        type: "string",
        description: "The exact state name: Unaware | Aware but Passive | Aware but Unconvinced | In Consideration | Intent-Active | Post-Purchase",
      },
      signal_pattern_read: {
        type: "string",
        description: "1–2 sentences: which signal combination you observed and why it maps to this state.",
      },
      activation_direction: {
        type: "string",
        description: "1–2 sentences: what the strategy lead should prioritise this week to advance consumers toward the next state.",
      },
      low_involvement_note: {
        type: "string",
        description: "1 sentence: how the category's involvement level modifies this read. Empty string if not applicable or insufficient data.",
      },
      confidence_level: {
        type: "string",
        enum: ["High", "Medium", "Directional"],
        description: "High = 2+ signals clearly point to one state. Medium = 1 clear signal + supporting evidence. Directional = single signal or ambiguous.",
      },
    },
    required: [
      "diagnosed_state",
      "state_name",
      "signal_pattern_read",
      "activation_direction",
      "low_involvement_note",
      "confidence_level",
    ],
  },
} as const;

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the ShiftImpact OS Consumer Behaviour State Diagnostic engine.
This is an internal tool for Janine and strategy leads only.

Your job: classify which of 6 consumer behaviour states the target audience is currently in, based on the week's signal data.

THE 6 CONSUMER STATES:
1. Unaware — SoS flat, UGC near zero, branded search at baseline noise. Brand is not in the category vocabulary.
2. Aware but Passive — Category search present, branded search flat, UGC low, save rate low. Brand has recognition but no salience at buying moments.
3. Aware but Unconvinced — Branded search present, UGC has comparison/review language, save rate flat. Brand is being considered and rejected — or considered and not closed.
4. In Consideration — Save rate rising, branded search increasing, comparison searches present. Brand is on the active shortlist.
5. Intent-Active — Branded search surging, save rate at or near peak, UGC volume high. Purchase trigger has fired.
6. Post-Purchase — Branded search stable/declining, UGC shows usage/experience content, save rate declining. Purchase cycle complete.

SIGNAL MAPPING:
- Signal 3 (UGC volume) → proxy for brand salience, category presence, and advocacy
- Signal 2 (Save Rate %) → proxy for active consideration and intent
- Signal 1 (Branded Search Lift %) → proxy for purchase intent and conversion readiness

CONFIDENCE RULES:
- High: 2 or more signals clearly and consistently point to one state
- Medium: 1 clear signal plus supporting evidence from another
- Directional: single signal or mixed/ambiguous signals — best current read

CRITICAL RULES:
1. Write for the strategy lead. Be specific about which signals drove the classification.
2. State names and numbers are INTERNAL ONLY — they will not be shown to clients.
3. activation_direction must be practical and actionable within the next 7 days.
4. Acknowledge incomplete data honestly. Not all signals may be reported each week.
5. Do not write motivational language. Be diagnostic and direct.`;
}

// ─── User prompt ──────────────────────────────────────────────────────────────

function buildUserPrompt(
  campaignName: string,
  industryProfile: string,
  weekNumber: number,
  campaignPhase: number | null,
  threshold: ThresholdRow | null,
  weekly: SignalWeeklyRow | null,
  channelHealthContext: string,
  strategyNotes: string
): string {
  // Signal values
  const sig1Value = weekly?.signal_1_actual_pct != null
    ? `${weekly.signal_1_actual_pct}% ${threshold?.signal_1_label ?? "branded search lift"}`
    : "Not reported";
  const sig2Value = weekly?.signal_2_actual_pct != null
    ? `${weekly.signal_2_actual_pct}% ${threshold?.signal_2_label ?? "save rate"}`
    : "Not reported";
  const sig3Value = weekly?.signal_3_actual_count != null
    ? `${weekly.signal_3_actual_count} ${threshold?.signal_3_label ?? "UGC posts"}`
    : "Not reported";

  const demandH = weekly?.demand_health ?? "No data";
  const nurtureH = weekly?.nurture_health ?? "No data";
  const conversionH = weekly?.conversion_health ?? "No data";

  const phaseLabel = campaignPhase
    ? `Phase ${campaignPhase} of 4`
    : "Phase unknown";

  const durationCtx = threshold?.campaign_duration_weeks
    ? ` (${threshold.campaign_duration_weeks}-week campaign)`
    : "";

  const notesSection = strategyNotes
    ? `\nSTRATEGY LEAD NOTES:\n${strategyNotes}`
    : "";

  const noSignalWarning = !weekly
    ? "\nNOTE: No signal data found for this week. Run the Signal Intelligence module first for a higher-confidence diagnosis. Classify as Directional confidence only."
    : "";

  return `CAMPAIGN: ${campaignName}
INDUSTRY / CATEGORY: ${industryProfile || "Not specified"}
WEEK: ${weekNumber}${durationCtx} — ${phaseLabel}

SIGNAL HEALTH SUMMARY (F12 — this week):
- Conversion (Signal 1 — branded search intent): ${conversionH} | Actual: ${sig1Value}
- Nurture (Signal 2 — content save / consideration): ${nurtureH} | Actual: ${sig2Value}
- Demand (Signal 3 — UGC volume / brand salience): ${demandH} | Actual: ${sig3Value}
${channelHealthContext}${notesSection}${noSignalWarning}

Diagnose the consumer behaviour state for this campaign this week.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: BehaviourStateRequest = await req.json();
    const { campaign_id, week_number } = body;

    if (!campaign_id || !week_number) {
      return NextResponse.json(
        { error: "campaign_id and week_number are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Load campaign name + industry profile
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, industry_profile")
      .eq("id", campaign_id)
      .single();
    const campaignName = campaign?.name ?? "Campaign";
    const industryProfile = campaign?.industry_profile ?? "";

    // 2. Load signal threshold (for signal labels + campaign duration)
    const { data: threshold } = await supabase
      .from("signal_thresholds")
      .select("signal_1_label, signal_2_label, signal_3_label, campaign_duration_weeks")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    // 3. Load signal weekly report for this week
    // Provides computed health lights + actual signal values
    const { data: weekly } = await supabase
      .from("signal_weekly_reports")
      .select(
        "signal_1_actual_pct, signal_2_actual_pct, signal_3_actual_count, " +
        "demand_health, nurture_health, conversion_health, campaign_phase"
      )
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number)
      .maybeSingle();

    // 4. Load consumer_behaviour_states row for strategy_notes
    // (row was created by saveConsumerBehaviourObservation before this API call)
    const { data: stateRow } = await supabase
      .from("consumer_behaviour_states")
      .select("strategy_notes")
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number)
      .maybeSingle();
    const strategyNotes = (stateRow as any)?.strategy_notes ?? "";

    // 5. Load F13 cross-channel health for supplementary context
    const { data: channelMetrics } = await supabase
      .from("channel_weekly_metrics")
      .select(`
        channel_health,
        campaign_channels (
          channel_role,
          channel_profiles ( channel_name )
        )
      `)
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number);

    let channelHealthContext = "";
    if (channelMetrics && channelMetrics.length > 0) {
      const ROLES = ["Demand", "Nurture", "Conversion", "Retention"] as const;
      type RoleKey = (typeof ROLES)[number];
      const roleHealth: Record<RoleKey, { G: number; A: number; R: number; names: string[] }> = {
        Demand:     { G: 0, A: 0, R: 0, names: [] },
        Nurture:    { G: 0, A: 0, R: 0, names: [] },
        Conversion: { G: 0, A: 0, R: 0, names: [] },
        Retention:  { G: 0, A: 0, R: 0, names: [] },
      };
      for (const m of channelMetrics) {
        const cc = (m as any).campaign_channels;
        const role = cc?.channel_role as RoleKey;
        const name = cc?.channel_profiles?.channel_name ?? "?";
        const health = m.channel_health as "Green" | "Amber" | "Red";
        if (role && roleHealth[role]) {
          if (health === "Green") roleHealth[role].G++;
          else if (health === "Amber") roleHealth[role].A++;
          else roleHealth[role].R++;
          roleHealth[role].names.push(`${name}(${health[0]})`);
        }
      }
      const lines = ROLES
        .filter((r) => roleHealth[r].names.length > 0)
        .map((r) => {
          const v = roleHealth[r];
          return `  ${r}: ${v.G}G/${v.A}A/${v.R}R — ${v.names.join(", ")}`;
        });
      if (lines.length > 0) {
        channelHealthContext =
          `\nCROSS-CHANNEL CONTEXT (F13 hub — supplementary):\n${lines.join("\n")}`;
      }
    }

    // 6. Call Claude Haiku — tool use forces structured output, eliminates JSON text parsing
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      system: buildSystemPrompt(),
      tools: [BEHAVIOUR_STATE_TOOL],
      tool_choice: { type: "tool", name: "submit_behaviour_state_diagnosis" },
      messages: [
        {
          role: "user",
          content: buildUserPrompt(
            campaignName,
            industryProfile,
            week_number,
            (weekly as SignalWeeklyRow | null)?.campaign_phase ?? null,
            (threshold as ThresholdRow | null),
            weekly as SignalWeeklyRow | null,
            channelHealthContext,
            strategyNotes
          ),
        },
      ],
    });

    // 7. Extract tool use result — .input is already a parsed object, no text manipulation needed
    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("AI did not return a tool_use block");
    }

    const parsed = toolBlock.input as {
      diagnosed_state: number;
      state_name: string;
      signal_pattern_read: string;
      activation_direction: string;
      low_involvement_note: string;
      confidence_level: "High" | "Medium" | "Directional";
    };

    const diagnosedState: number | null =
      typeof parsed.diagnosed_state === "number" &&
      parsed.diagnosed_state >= 1 &&
      parsed.diagnosed_state <= 6
        ? parsed.diagnosed_state
        : null;
    const stateName          = parsed.state_name          ?? "";
    const signalPatternRead  = parsed.signal_pattern_read ?? "";
    const activationDirection = parsed.activation_direction ?? "";
    const lowInvolvementNote = parsed.low_involvement_note ?? "";
    const confidenceLevel: "High" | "Medium" | "Directional" =
      parsed.confidence_level === "High" || parsed.confidence_level === "Medium"
        ? parsed.confidence_level
        : "Directional";

    // 8. Save AI outputs to consumer_behaviour_states
    // Row guaranteed to exist (created by saveConsumerBehaviourObservation before this call)
    const { error: updateErr } = await supabase
      .from("consumer_behaviour_states")
      .update({
        diagnosed_state: diagnosedState,
        state_name: stateName,
        signal_pattern_read: signalPatternRead,
        activation_direction: activationDirection,
        low_involvement_note: lowInvolvementNote,
        confidence_level: confidenceLevel,
      })
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number);

    if (updateErr) {
      console.error("Failed to save behaviour state:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 9. Return the full result
    return NextResponse.json({
      week_number,
      diagnosed_state: diagnosedState,
      state_name: stateName,
      signal_pattern_read: signalPatternRead,
      activation_direction: activationDirection,
      low_involvement_note: lowInvolvementNote,
      confidence_level: confidenceLevel,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/behaviour-state error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
