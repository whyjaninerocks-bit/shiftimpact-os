// app/api/behaviour-state/route.ts
// Feature 18A — Consumer Behaviour State Diagnostic (Sprint 3)
// Sprint 23 update · 18 July 2026 — auto-writes to consumer_state_readings
//
// POST /api/behaviour-state
// Reads F12 signal data + F13 channel health for the requested week,
// classifies the consumer behaviour state using Claude Haiku (6-state model),
// saves the result back to consumer_behaviour_states,
// then auto-infers state distribution and writes to consumer_state_readings
// so the CSTR Engine (F27) populates automatically — no manual input required.
//
// Auth: service role (Supabase JWT) — strategy lead and Janine only.
// CRITICAL: State names, numbers, and classification system are
//   NEVER surfaced to the Client Interface.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai-model";
import {
  computeDominantState,
  computeCstr,
  computeVelocityScore,
  computeStall,
} from "@/app/api/consumer-state-transition/route";

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

// ─── State distribution inference ─────────────────────────────────────────────
// Derives the full 6-state audience % distribution from the diagnosed_state
// + signal health statuses. Eliminates manual data entry.
//
// Logic:
//   1. Step-down weights from modal (diagnosed) state outward — each state
//      gets: max(1, 40 - (distance × 10))
//   2. Signal health shifts ±4pp within its proxied zone:
//      Signal 3 (Demand) → shifts States 1↔2
//      Signal 2 (Nurture) → shifts States 2↔3
//      Signal 1 (Conversion) → shifts States 4↔5
//   3. Normalise to 100%
//
// Thresholds are passive minimums (Sprint 23). Recalibrate after 3 campaigns
// per category — see project_cstr_benchmarks memory.

function inferStateDistribution(
  diagnosedState: number,
  demandHealth: SignalHealth | null,
  nurtureHealth: SignalHealth | null,
  conversionHealth: SignalHealth | null
): Record<string, number> {
  // Step 1 — Step-down weights from modal state
  const raw: Record<number, number> = {};
  for (let s = 1; s <= 6; s++) {
    const dist = Math.abs(s - diagnosedState);
    raw[s] = Math.max(1, 40 - dist * 10);
  }

  // Step 2 — Signal health zone adjustments (±4pp)
  const shift = (state: number, delta: number) => {
    raw[state] = Math.max(0, (raw[state] || 0) + delta);
  };

  // Signal 3 (Demand/UGC) → proxies States 1–2 awareness zone
  if (demandHealth === "Green")     { shift(2, 4); shift(1, -2); }
  else if (demandHealth === "Red")  { shift(1, 4); shift(2, -2); }

  // Signal 2 (Nurture/Save Rate) → proxies States 2–3 consideration zone
  if (nurtureHealth === "Green")    { shift(3, 4); shift(2, -2); }
  else if (nurtureHealth === "Red") { shift(2, 4); shift(3, -2); }

  // Signal 1 (Conversion/Search Lift) → proxies States 4–5 intent zone
  if (conversionHealth === "Green")    { shift(5, 4); shift(4, -2); }
  else if (conversionHealth === "Red") { shift(4, 4); shift(5, -2); }

  // Step 3 — Normalise to 100%
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  const dist: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    dist[k] = parseFloat(((v / total) * 100).toFixed(1));
  }
  return dist;
}

// ─── CSTR narrative tool ──────────────────────────────────────────────────────
// Generates the auto-narrative for consumer_state_readings.ai_narrative.
// Uses Claude Haiku (same model as behaviour-state diagnostic) for speed.

const CSTR_NARRATIVE_TOOL = {
  name: "submit_cstr_narrative",
  description: "Submit the audience progression narrative for this campaign week.",
  input_schema: {
    type: "object" as const,
    properties: {
      ai_narrative: {
        type: "string",
        description: [
          "2–3 sentences in plain business language.",
          "Describes how the campaign audience is progressing this week based on the behaviour state diagnosis.",
          "CRITICAL: NEVER mention state numbers (1–6) or state names (Unaware, Aware, In Consideration, etc.).",
          "Use directional marketing language only: 'awareness is building', 'consideration is stalling', 'intent signals are growing', etc.",
          "If velocity is negative or stall flag is active, clearly signal that momentum needs attention.",
          "Client-facing — write for a brand marketer, not a data scientist.",
        ].join(" "),
      },
    },
    required: ["ai_narrative"],
  },
} as const;

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

  const phaseLabel = campaignPhase ? `Phase ${campaignPhase} of 4` : "Phase unknown";

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

// ─── ISO date for Monday of week N ────────────────────────────────────────────
// Used as week_of when auto-writing to consumer_state_readings.
// Anchored to current date — approximate; exact date not material since
// consumer_state_readings unique key is (campaign_id, week_number).

function mondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
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
      .select("name, industry_profile, clients(name)")
      .eq("id", campaign_id)
      .single();
    const campaignName = campaign?.name ?? "Campaign";
    const industryProfile = campaign?.industry_profile ?? "";
    const clientName = (campaign?.clients as { name: string } | null)?.name ?? "Unknown Brand";

    // 2. Load signal threshold
    const { data: threshold } = await supabase
      .from("signal_thresholds")
      .select("signal_1_label, signal_2_label, signal_3_label, campaign_duration_weeks")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    // 3. Load signal weekly report for this week
    const { data: weekly } = await supabase
      .from("signal_weekly_reports")
      .select(
        "signal_1_actual_pct, signal_2_actual_pct, signal_3_actual_count, " +
        "demand_health, nurture_health, conversion_health, campaign_phase"
      )
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number)
      .maybeSingle();

    // 4. Load strategy_notes from consumer_behaviour_states
    const { data: stateRow } = await supabase
      .from("consumer_behaviour_states")
      .select("strategy_notes")
      .eq("campaign_id", campaign_id)
      .eq("week_number", week_number)
      .maybeSingle();
    const strategyNotes = (stateRow as any)?.strategy_notes ?? "";

    // 5. Load F13 cross-channel health for context
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

    // 6. Call AI model — behaviour state diagnosis
    // Model resolved from os_settings (configurable from /settings page).
    // Default: claude-haiku-4-5-20251001. Can be upgraded to Sonnet per campaign.
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const behaviourStateModel = await getModel("model_behaviour_state", "claude-haiku-4-5-20251001");

    const aiResponse = await anthropic.messages.create({
      model: behaviourStateModel,
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

    // 7. Extract tool use result
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
    const stateName           = parsed.state_name           ?? "";
    const signalPatternRead   = parsed.signal_pattern_read  ?? "";
    const activationDirection = parsed.activation_direction ?? "";
    const lowInvolvementNote  = parsed.low_involvement_note ?? "";
    const confidenceLevel: "High" | "Medium" | "Directional" =
      parsed.confidence_level === "High" || parsed.confidence_level === "Medium"
        ? parsed.confidence_level
        : "Directional";

    // 8. Save AI outputs to consumer_behaviour_states
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

    // ─────────────────────────────────────────────────────────────────────────
    // Sprint 23 addition: Auto-write to consumer_state_readings (F27 CSTR Engine)
    // This eliminates the need for manual state distribution input.
    // ─────────────────────────────────────────────────────────────────────────

    if (diagnosedState !== null) {
      const weeklyData = weekly as SignalWeeklyRow | null;

      // 9a. Infer state distribution from diagnosed state + signal health
      const stateDist = inferStateDistribution(
        diagnosedState,
        weeklyData?.demand_health ?? null,
        weeklyData?.nurture_health ?? null,
        weeklyData?.conversion_health ?? null
      );

      // 9b. Load prior reading for CSTR delta computation
      const { data: priorReadings } = await supabase
        .from("consumer_state_readings")
        .select("week_number, state_distribution, velocity_score")
        .eq("campaign_id", campaign_id)
        .lt("week_number", week_number)
        .order("week_number", { ascending: false })
        .limit(1);

      const priorReading = priorReadings?.[0] ?? null;

      // 9c. Compute CSTR metrics
      const dominant_state = computeDominantState(stateDist);
      let cstr_vs_prior: Record<string, number> | null = null;
      let velocity_score: number | null = null;
      let stall_flag = false;
      let stall_note = "";

      if (priorReading) {
        const priorDist = priorReading.state_distribution as Record<string, number>;
        cstr_vs_prior = computeCstr(stateDist, priorDist);
        velocity_score = computeVelocityScore(cstr_vs_prior);
        const stall = computeStall(cstr_vs_prior);
        stall_flag = stall.stall_flag;
        stall_note = stall.stall_note;
      }

      // 9d. Generate CSTR narrative (Haiku — fast, client-facing plain language)
      const velocityContext = velocity_score === null
        ? "first reading this campaign — no prior week to compare"
        : velocity_score >= 1.0
        ? `velocity +${velocity_score} — audience advancing strongly`
        : velocity_score > 0.3
        ? `velocity +${velocity_score} — on track`
        : velocity_score >= -0.3
        ? `velocity ${velocity_score} — audience movement is flat, needs attention`
        : `velocity ${velocity_score} — audience regressing, intervention needed`;

      const cstrNarrativeModel = await getModel("model_cstr_narrative", "claude-haiku-4-5-20251001");
      const cstrNarrativeRes = await anthropic.messages.create({
        model: cstrNarrativeModel,
        max_tokens: 300,
        system: `You are the Consumer Progression Intelligence in ShiftImpact OS.
Write 2–3 sentences of plain business language about how this brand's audience is progressing.
CRITICAL: NEVER use state numbers (1–6) or state names (Unaware, In Consideration, etc.).
Use only directional marketing language. Client-facing. Be direct.`,
        tools: [CSTR_NARRATIVE_TOOL],
        tool_choice: { type: "tool", name: "submit_cstr_narrative" },
        messages: [{
          role: "user",
          content: `BRAND: ${clientName}
CAMPAIGN: ${campaignName}
WEEK: ${week_number}

SIGNAL READ (internal context):
${signalPatternRead}

VELOCITY: ${velocityContext}
STALL: ${stall_flag ? `Yes — ${stall_note}` : "No stall detected"}
NEXT ACTION (internal): ${activationDirection}

Write the audience progression narrative for this week.`,
        }],
      });

      const cstrNarrativeBlock = cstrNarrativeRes.content.find((b) => b.type === "tool_use");
      const ai_narrative = cstrNarrativeBlock?.type === "tool_use"
        ? (cstrNarrativeBlock.input as { ai_narrative: string }).ai_narrative
        : `${signalPatternRead} ${activationDirection}`; // fallback

      // 9e. Upsert into consumer_state_readings
      const week_of = mondayOfCurrentWeek();
      const { error: cstrSaveErr } = await supabase
        .from("consumer_state_readings")
        .upsert(
          {
            campaign_id,
            week_number,
            week_of,
            state_distribution: stateDist,
            dominant_state,
            cstr_vs_prior,
            velocity_score,
            state_stall_flag: stall_flag,
            state_stall_note: stall_note,
            ai_narrative,
            reading_source: "behaviour-state-auto",
          },
          { onConflict: "campaign_id,week_number" }
        );

      if (cstrSaveErr) {
        // Non-fatal — log but don't fail the behaviour state response
        console.error("Sprint 23: CSTR auto-write failed (non-fatal):", cstrSaveErr);
      }
    }

    // 10. Return the full behaviour state result
    return NextResponse.json({
      week_number,
      diagnosed_state: diagnosedState,
      state_name: stateName,
      signal_pattern_read: signalPatternRead,
      activation_direction: activationDirection,
      low_involvement_note: lowInvolvementNote,
      confidence_level: confidenceLevel,
      cstr_auto_written: diagnosedState !== null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/behaviour-state error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
