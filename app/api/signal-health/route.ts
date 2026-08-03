// app/api/signal-health/route.ts
// F16B — Simplified Signal Health Model
//
// POST /api/signal-health
// Reads the three core signal layers for a campaign and generates a
// single AI narrative explaining the combined signal health picture.
//
// Signal layers:
//   S0 — Media Delivery Health (MDH): frequency + quarantine status
//   S1 — Share of Voice proxy (branded search lift / signal 1 actual)
//   S2 — Save Rate / engagement proxy (signal 2 actual)
//
// Output:
//   {
//     s0_status, s0_confidence, s0_narrative,
//     s1_status, s1_confidence, s1_narrative,
//     s2_status, s2_confidence, s2_narrative,
//     combined_narrative,    // cross-signal synthesis
//     top_action,            // single most important action right now
//   }
//
// INTERNAL ONLY — never surfaced in client portal or export.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";
import Anthropic from "@anthropic-ai/sdk";

type TrafficLight = "Green" | "Amber" | "Red" | "No Data";
type ConfidenceBand = "High" | "Medium" | "Low" | "Speculative";

interface SignalInput {
  label: string;
  actual: number | null;
  threshold: number | null;
  amberThreshold: number | null;
}

function computeTrafficLight(
  input: SignalInput
): { status: TrafficLight; confidence: ConfidenceBand } {
  if (input.actual === null) {
    return { status: "No Data", confidence: "Speculative" };
  }
  if (input.threshold === null) {
    return { status: "Amber", confidence: "Low" };
  }
  const amber = input.amberThreshold ?? input.threshold * 0.8;
  const status: TrafficLight =
    input.actual >= input.threshold ? "Green" :
    input.actual >= amber           ? "Amber" : "Red";
  return { status, confidence: "Medium" }; // data_weeks refinement happens in component
}

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // ── Fetch S0: latest MDH record ───────────────────────────────────────────
    const { data: mdhRows } = await supabase
      .from("signal_media_delivery")
      .select("week_number, mdh_status, avg_frequency, quarantine_active, aqs_score, aqs_band, completion_rate_pct")
      .eq("campaign_id", campaign_id)
      .not("mdh_status", "is", null)
      .order("week_number", { ascending: false })
      .limit(4);

    const latestMdh = mdhRows?.[0] ?? null;
    const mdhDataWeeks = mdhRows?.length ?? 0;

    const s0Status: TrafficLight = !latestMdh
      ? "No Data"
      : latestMdh.mdh_status === "Green" ? "Green"
      : latestMdh.mdh_status === "Amber"  ? "Amber" : "Red";

    const s0Confidence: ConfidenceBand =
      mdhDataWeeks === 0 ? "Speculative" :
      mdhDataWeeks === 1 ? "Low" :
      mdhDataWeeks <= 3  ? "Medium" : "High";

    // ── Fetch S1 + S2: latest signal weekly report + thresholds ──────────────
    const { data: thresholdRow } = await supabase
      .from("signal_thresholds")
      .select("signal_1_label, signal_1_threshold_pct, signal_1_amber_pct, signal_2_label, signal_2_threshold_pct, signal_2_amber_pct")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    const { data: signalRows } = await supabase
      .from("signal_weekly_reports")
      .select("week_number, signal_1_actual_pct, signal_2_actual_pct")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(4);

    const latestSignal = signalRows?.[0] ?? null;
    const signalDataWeeks = signalRows?.filter(
      (r) => r.signal_1_actual_pct !== null || r.signal_2_actual_pct !== null
    ).length ?? 0;

    const s1Input: SignalInput = {
      label: thresholdRow?.signal_1_label ?? "Share of Voice",
      actual: latestSignal?.signal_1_actual_pct ?? null,
      threshold: thresholdRow?.signal_1_threshold_pct ?? null,
      amberThreshold: thresholdRow?.signal_1_amber_pct ?? null,
    };

    const s2Input: SignalInput = {
      label: thresholdRow?.signal_2_label ?? "Save Rate",
      actual: latestSignal?.signal_2_actual_pct ?? null,
      threshold: thresholdRow?.signal_2_threshold_pct ?? null,
      amberThreshold: thresholdRow?.signal_2_amber_pct ?? null,
    };

    const s1Result = computeTrafficLight(s1Input);
    const s2Result = computeTrafficLight(s2Input);

    // Override confidence with real data weeks
    const signalConf: ConfidenceBand =
      signalDataWeeks === 0 ? "Speculative" :
      signalDataWeeks === 1 ? "Low" :
      signalDataWeeks <= 3  ? "Medium" : "High";

    s1Result.confidence = signalConf;
    s2Result.confidence = signalConf;

    // ── Build AI prompt ───────────────────────────────────────────────────────
    const signalContext = `
S0 — Media Delivery (MDH):
  Status: ${s0Status}
  Data weeks: ${mdhDataWeeks}
  Latest frequency: ${latestMdh?.avg_frequency?.toFixed(1) ?? "none"} avg frequency
  Quarantine active: ${latestMdh?.quarantine_active ? "YES — signals 1-3 quarantined" : "No"}
  Latest AQS: ${latestMdh?.aqs_score ?? "none"} (${latestMdh?.aqs_band ?? "no band"})

S1 — ${s1Input.label}:
  Status: ${s1Result.status}
  Data weeks: ${signalDataWeeks}
  Latest actual: ${s1Input.actual?.toFixed(1) ?? "none"}%
  Target threshold: ${s1Input.threshold?.toFixed(1) ?? "not set"}%

S2 — ${s2Input.label}:
  Status: ${s2Result.status}
  Data weeks: ${signalDataWeeks}
  Latest actual: ${s2Input.actual?.toFixed(1) ?? "none"}%
  Target threshold: ${s2Input.threshold?.toFixed(1) ?? "not set"}%
`.trim();

    const prompt = `You are the ShiftImpact OS Signal Health Analyst. Analyse the three signal layers below and produce a concise health narrative for the strategy lead.

Rules:
- Write in plain English, no jargon the client wouldn't use
- No dashes or hyphens in copy
- Traffic light colours only: Green, Amber, Red
- One narrative per signal layer (2 sentences max each)
- One combined narrative (3 sentences max): what matters most right now
- One top action (imperative, ≤20 words, highest-priority next step)
- If data is missing, say so plainly and say what to enter

Signal data:
${signalContext}

Respond with valid JSON matching exactly:
{
  "s0_narrative": "...",
  "s1_narrative": "...",
  "s2_narrative": "...",
  "combined_narrative": "...",
  "top_action": "..."
}`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_signal_health", "claude-haiku-4-5-20251001");
    const msg = await anthropic.messages.create({
      model,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = (msg.content[0] as { type: string; text: string }).text ?? "";
    let parsed: Record<string, string>;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      s0_status:      s0Status,
      s0_confidence:  s0Confidence,
      s0_narrative:   parsed.s0_narrative ?? "",
      s1_status:      s1Result.status,
      s1_confidence:  s1Result.confidence,
      s1_label:       s1Input.label,
      s1_narrative:   parsed.s1_narrative ?? "",
      s2_status:      s2Result.status,
      s2_confidence:  s2Result.confidence,
      s2_label:       s2Input.label,
      s2_narrative:   parsed.s2_narrative ?? "",
      combined_narrative: parsed.combined_narrative ?? "",
      top_action:         parsed.top_action ?? "",
      mdh_data_weeks:     mdhDataWeeks,
      signal_data_weeks:  signalDataWeeks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
