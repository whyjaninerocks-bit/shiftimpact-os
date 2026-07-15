// app/api/brand-momentum/route.ts
// Feature 19 — Brand Momentum Score (F19) — AI composite engine
// Sprint 4: data capture + Haiku inference
//
// Request body: { client_id: string, period_start: string }
//
// Flow:
//   1. Load the BMS row for client_id + period_start (most recent if duplicates)
//   2. Load client name for context
//   3. Build Haiku prompt with 6 dimension inputs
//   4. Parse JSON: { bms_direction, bms_velocity, bms_confidence, dimension_conflict_flag, ai_read }
//   5. .update() the row (guaranteed to exist — created by saveBrandMomentumInputs first)
//   6. Return the AI fields to the component for immediate in-session display
//
// SECURITY:
//   - Access: Strategy Lead (Janine) only — never called from Client Interface
//   - ai_read and dimension_conflict_flag: INTERNAL ONLY — never shown to client
//   - Client sees: bms_direction + bms_velocity + bms_confidence only (headline composite)
//   - bms_direction/velocity/confidence: OK to show client. ai_read + conflict_flag: NEVER.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildBmsPrompt(
  clientName: string,
  periodLabel: string,
  dimensions: {
    sos_trajectory:      string | null;
    sos_magnitude:       string | null;
    sos_note:            string;
    save_rate_trend:     string | null;
    save_rate_note:      string;
    ugc_trend:           string | null;
    ugc_note:            string;
    sov_som_ratio:       string | null;
    sov_som_note:        string;
    cep_coverage:        string | null;
    cep_note:            string;
    competitive_context: string | null;
    competitive_note:    string;
  }
): string {
  const dim = (label: string, val: string | null, note: string) =>
    `  ${label}: ${val ?? "Not assessed"}${note ? ` — ${note}` : ""}`;

  return `You are a senior brand strategist computing a Brand Momentum Score (BMS) composite for ${clientName} — ${periodLabel}.

The BMS is derived from 6 signal dimensions captured by the strategy team. Your job is to:
1. Assess overall brand momentum direction, velocity, and confidence
2. Flag any dimensions that conflict with each other
3. Write a 2-sentence internal ai_read that explains the composite logic

DIMENSION INPUTS:
${dim("SOV trajectory (Share of Voice)", dimensions.sos_trajectory, dimensions.sos_note)}
${dim("Save rate trend (content saves)", dimensions.save_rate_trend, dimensions.save_rate_note)}
${dim("UGC volume trend", dimensions.ugc_trend, dimensions.ugc_note)}
${dim("SOV:SOM ratio signal", dimensions.sov_som_ratio, dimensions.sov_som_note)}
${dim("CEP coverage (Category Entry Points)", dimensions.cep_coverage, dimensions.cep_note)}
${dim("Competitive context (brand vs competitors)", dimensions.competitive_context, dimensions.competitive_note)}

SCORING RULES:
- bms_direction: "Positive" = brand is gaining ground; "Neutral" = holding; "Negative" = losing ground
- bms_velocity: "Accelerating" = improving week-over-week; "Stable" = consistent; "Decelerating" = slowing
- bms_confidence: 1-10 integer — penalise for missing dimensions (each null = -1.5), penalise for conflicting signals (-2 per conflict pair)
- dimension_conflict_flag: true if any two dimensions point in materially opposite directions
- ai_read: 2 sentences max. State the composite logic and the single biggest risk or opportunity. This is INTERNAL ONLY and must be frank and specific.

CRITICAL: Return ONLY valid JSON. No explanation, no markdown fences.

{
  "bms_direction": "Positive" | "Neutral" | "Negative",
  "bms_velocity": "Accelerating" | "Stable" | "Decelerating",
  "bms_confidence": <integer 1-10>,
  "dimension_conflict_flag": <boolean>,
  "ai_read": "<2-sentence internal commentary>"
}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { client_id, period_start } = await req.json();
    if (!client_id || !period_start) {
      return NextResponse.json({ error: "client_id and period_start are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Load the BMS row
    const { data: bmsRow, error: bmsErr } = await supabase
      .from("brand_momentum_scores")
      .select("*")
      .eq("client_id", client_id)
      .eq("period_start", period_start)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bmsErr || !bmsRow) {
      return NextResponse.json({ error: "BMS row not found — save inputs first" }, { status: 404 });
    }

    // 2. Load client name
    const { data: clientRow } = await supabase
      .from("clients")
      .select("name")
      .eq("id", client_id)
      .maybeSingle();

    const clientName = clientRow?.name ?? "Client";
    const periodLabel = bmsRow.period_label || period_start;

    // 3. Build prompt
    const prompt = buildBmsPrompt(clientName, periodLabel, {
      sos_trajectory:      bmsRow.sos_trajectory,
      sos_magnitude:       bmsRow.sos_magnitude,
      sos_note:            bmsRow.sos_note ?? "",
      save_rate_trend:     bmsRow.save_rate_trend,
      save_rate_note:      bmsRow.save_rate_note ?? "",
      ugc_trend:           bmsRow.ugc_trend,
      ugc_note:            bmsRow.ugc_note ?? "",
      sov_som_ratio:       bmsRow.sov_som_ratio,
      sov_som_note:        bmsRow.sov_som_note ?? "",
      cep_coverage:        bmsRow.cep_coverage,
      cep_note:            bmsRow.cep_note ?? "",
      competitive_context: bmsRow.competitive_context,
      competitive_note:    bmsRow.competitive_note ?? "",
    });

    // 4. Call Claude Haiku
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    // 5. Parse JSON
    let parsed: {
      bms_direction: string;
      bms_velocity: string;
      bms_confidence: number;
      dimension_conflict_flag: boolean;
      ai_read: string;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Strip markdown fences if any
      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    }

    // Validate direction/velocity against allowed enum values
    const validDirection = ["Positive", "Neutral", "Negative"];
    const validVelocity  = ["Accelerating", "Stable", "Decelerating"];
    if (!validDirection.includes(parsed.bms_direction)) parsed.bms_direction = "Neutral";
    if (!validVelocity.includes(parsed.bms_velocity))   parsed.bms_velocity  = "Stable";
    const confidence = Math.min(10, Math.max(1, Math.round(parsed.bms_confidence)));

    // 6. Save back — .update() because row is guaranteed to exist
    const { error: updateErr } = await supabase
      .from("brand_momentum_scores")
      .update({
        bms_direction:          parsed.bms_direction,
        bms_velocity:           parsed.bms_velocity,
        bms_confidence:         confidence,
        dimension_conflict_flag: parsed.dimension_conflict_flag === true,
        ai_read:                parsed.ai_read,
      })
      .eq("id", bmsRow.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 7. Return AI fields to component for in-session display
    return NextResponse.json({
      id:                     bmsRow.id,
      bms_direction:          parsed.bms_direction,
      bms_velocity:           parsed.bms_velocity,
      bms_confidence:         confidence,
      dimension_conflict_flag: parsed.dimension_conflict_flag === true,
      ai_read:                parsed.ai_read,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/brand-momentum] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
