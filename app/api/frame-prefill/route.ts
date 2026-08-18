// app/api/frame-prefill/route.ts
// Sprint 8 — Campaign Learning → FRAME Brief pre-fill
// INTERNAL ONLY
//
// POST /api/frame-prefill
// Body: { campaign_id: string }
//
// Reads:
//   - Existing FRAME brief (to know what's already set)
//   - Campaign Learning Record for this campaign
//   - Campaign Learning Records from other campaigns for the same client
//   - Signal weekly reports (last 4) — to surface what's been working
//   - Business outcomes (what the client is trying to achieve)
//   - Brand momentum (direction)
//
// Returns pre-fill suggestions for:
//   anchor, mood, clarity_statement, demand_investment_pct,
//   active_channels, industry_category, elevation_mode_enabled
//
// Each suggestion comes with rationale grounded in the learning data.

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

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get campaign + client info
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, current_phase, industry_profile, client_id, clients(name, industry_profile)")
      .eq("id", campaign_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get existing FRAME brief
    const { data: frame } = await supabase
      .from("frame_briefs")
      .select("anchor, mood, clarity_statement, demand_investment_pct, active_channels, industry_category, elevation_mode_enabled, lock_status")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    // Get Campaign Learning Record for this campaign
    const { data: ownLearning } = await supabase
      .from("campaign_learning_records")
      .select("what_worked, what_to_change, signal_insights, anchor_recommendation, sov_pct, som_pct, created_at")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    // Get learning records from other campaigns for the same client
    const { data: allCampaigns } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("client_id", campaign.client_id)
      .neq("id", campaign_id)
      .limit(5);

    const otherCampaignIds = (allCampaigns ?? []).map((c: { id: string }) => c.id);
    let priorLearning: Array<Record<string, unknown>> = [];
    if (otherCampaignIds.length > 0) {
      const { data } = await supabase
        .from("campaign_learning_records")
        .select("what_worked, what_to_change, anchor_recommendation, sov_pct, som_pct")
        .in("campaign_id", otherCampaignIds)
        .limit(3);
      priorLearning = (data ?? []) as Array<Record<string, unknown>>;
    }

    // Get recent signal reports (to surface channel performance)
    const { data: signalReports } = await supabase
      .from("signal_weekly_reports")
      .select("week_number, demand_health, nurture_health, conversion_health, gate_status")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(4);

    // Get business outcomes
    const { data: outcomes } = await supabase
      .from("business_outcomes")
      .select("outcome_type, target_value, unit, timeframe")
      .eq("campaign_id", campaign_id)
      .limit(5);

    // Get brand momentum
    const { data: bms } = await supabase
      .from("brand_momentum_scores")
      .select("bms_direction, bms_velocity, bms_confidence, period_label")
      .eq("client_id", campaign.client_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build context block
    const lines: string[] = [];
    lines.push(`CLIENT: ${(campaign.clients as Record<string, unknown> | null)?.name ?? "Unknown"}`);
    lines.push(`CAMPAIGN: ${campaign.name} | Phase: ${campaign.current_phase}`);
    lines.push(`Industry: ${campaign.industry_profile}`);

    if (frame) {
      lines.push(`\nEXISTING FRAME (what's already set):`);
      lines.push(`  Anchor: ${frame.anchor || "EMPTY"}`);
      lines.push(`  Mood: ${frame.mood || "EMPTY"}`);
      lines.push(`  Clarity: ${frame.clarity_statement || "EMPTY"}`);
      lines.push(`  Demand %: ${frame.demand_investment_pct ?? "EMPTY"}`);
      lines.push(`  Active channels: ${JSON.stringify(frame.active_channels ?? [])}`);
      lines.push(`  Lock status: ${frame.lock_status}`);
    }

    if (outcomes?.length) {
      lines.push(`\nBUSINESS OUTCOMES:`);
      outcomes.forEach(o => {
        lines.push(`  ${o.outcome_type}: ${o.target_value} ${o.unit} by ${o.timeframe}`);
      });
    }

    if (ownLearning) {
      lines.push(`\nCAMPAIGN LEARNING RECORD (this campaign):`);
      if (ownLearning.what_worked)   lines.push(`  What worked: ${String(ownLearning.what_worked).slice(0, 300)}`);
      if (ownLearning.what_to_change) lines.push(`  What to change: ${String(ownLearning.what_to_change).slice(0, 300)}`);
      if (ownLearning.anchor_recommendation) lines.push(`  Anchor recommendation: ${String(ownLearning.anchor_recommendation).slice(0, 200)}`);
      if (ownLearning.sov_pct !== null && ownLearning.som_pct !== null) {
        lines.push(`  SoV ${ownLearning.sov_pct}% vs SoM ${ownLearning.som_pct}% — ratio ${Number(ownLearning.sov_pct) > 0 ? (Number(ownLearning.som_pct) / Number(ownLearning.sov_pct)).toFixed(2) : "?"}`);
      }
    }

    if (priorLearning.length > 0) {
      lines.push(`\nPRIOR CAMPAIGN LEARNING (same client, other campaigns):`);
      priorLearning.forEach((l, i) => {
        lines.push(`  Campaign ${i + 1}:`);
        if (l.what_worked)   lines.push(`    Worked: ${String(l.what_worked).slice(0, 200)}`);
        if (l.anchor_recommendation) lines.push(`    Anchor rec: ${String(l.anchor_recommendation).slice(0, 150)}`);
      });
    }

    if (signalReports?.length) {
      lines.push(`\nRECENT SIGNAL PERFORMANCE:`);
      signalReports.forEach(r => {
        lines.push(`  Wk${r.week_number}: Demand=${r.demand_health} Nurture=${r.nurture_health} Conversion=${r.conversion_health} Gate=${r.gate_status}`);
      });
    }

    if (bms) {
      lines.push(`\nBRAND MOMENTUM: ${bms.period_label} — ${bms.bms_direction} (velocity ${bms.bms_velocity}, confidence ${bms.bms_confidence})`);
    }

    const contextBlock = lines.join("\n");

    const prompt = `You are the ShiftImpact OS Strategy Engine. Based on the campaign learning data below, generate pre-fill suggestions for the FRAME Brief fields that are EMPTY or could be improved.

STRICT OUTPUT RULES:
- No dashes or hyphens in copy
- No "CMO" anywhere
- Be specific and grounded in the data — not generic marketing language
- Only suggest fields that have genuine signal from the learning data
- If a field already has strong content, suggest an improvement not a replacement
- Channel suggestions must be from: ["Meta", "TikTok", "YouTube", "OOH", "Digital OOH", "Radio", "Print", "CTV", "Programmatic", "Influencer", "Search", "PR", "Email", "WhatsApp", "Shopee", "Lazada", "Grab"]

CAMPAIGN DATA:
${contextBlock}

Respond with valid JSON matching exactly this structure:
{
  "anchor": {
    "suggestion": "proposed anchor text",
    "rationale": "why, grounded in the learning data",
    "confidence": "High" | "Medium" | "Low"
  },
  "mood": {
    "suggestion": "proposed mood register",
    "rationale": "why",
    "confidence": "High" | "Medium" | "Low"
  },
  "clarity_statement": {
    "suggestion": "proposed clarity statement",
    "rationale": "why",
    "confidence": "High" | "Medium" | "Low"
  },
  "demand_investment_pct": {
    "suggestion": 60,
    "rationale": "why this split, based on signal performance",
    "confidence": "High" | "Medium" | "Low"
  },
  "active_channels": {
    "suggestion": ["Meta", "TikTok"],
    "rationale": "why these channels, based on performance data",
    "confidence": "High" | "Medium" | "Low"
  },
  "elevation_mode": {
    "suggestion": true | false,
    "rationale": "whether elevation mode is warranted based on brand momentum",
    "confidence": "High" | "Medium" | "Low"
  },
  "summary": "2-3 sentence synthesis of what the learning data is telling you about the strategic direction"
}

Return ONLY the JSON. No preamble or explanation.
Omit any field you do not have meaningful signal for.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_frame_prefill", "claude-haiku-4-5-20251001");

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text ?? "";
    let parsed: Record<string, unknown> = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      suggestions: parsed,
      context_summary: {
        has_own_learning: !!ownLearning,
        prior_campaign_count: priorLearning.length,
        signal_weeks: signalReports?.length ?? 0,
        brand_momentum: bms?.bms_direction ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/frame-prefill error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
