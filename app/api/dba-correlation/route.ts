// app/api/dba-correlation/route.ts
// F29 — DBA Performance Correlation Engine
// Sprint 6 · 30 July 2026
//
// Correlates Distinctive Brand Asset deployment against campaign signal health.
// ALL OUTPUT INTERNAL ONLY — Janine/strategy lead only, never client-facing.
//
// Correlation dimensions:
//   Signal 1 (SoS/branded search health): DBA consistency → share of search
//   AQS (Attention Quality):               DBA presence → attention quality in media
//   CSTR (Consumer State Transition):      DBA consistency → state transition rate
//
// Erosion Alert:
//   Fires when any deployed "Established" asset appears in a context where signal
//   health is declining — suggesting DBA recall may be weakening.
//
// Process:
//   1. Pull deployed DBA assets from frame_briefs.distinctive_assets_deployed
//   2. Pull brand_assets records for those IDs
//   3. Pull latest signal health + AQS + CSTR
//   4. AI generates directional correlation read + erosion assessment
//   5. Persist to dba_correlation_logs

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthToScore(health: string | null | undefined): number {
  if (health === "Green") return 80;
  if (health === "Amber") return 50;
  if (health === "Red")   return 20;
  return 0;
}

type CorrelationRating = "Positive" | "Neutral" | "Negative" | "Insufficient Data";

function directionFromScore(signalScore: number, assetStrengthAvg: number): CorrelationRating {
  if (signalScore === 0) return "Insufficient Data";
  // Simple directional: strong assets + strong signal = Positive
  if (assetStrengthAvg >= 70 && signalScore >= 70) return "Positive";
  if (assetStrengthAvg >= 50 && signalScore >= 50) return "Neutral";
  if (assetStrengthAvg >= 50 && signalScore < 30)  return "Negative";
  return "Neutral";
}

function assetStrengthToScore(strength: string | null): number {
  if (strength === "Established") return 90;
  if (strength === "Building")    return 60;
  if (strength === "Emerging")    return 35;
  if (strength === "At Risk")     return 15;
  return 30;
}

// ─── AI Tool ─────────────────────────────────────────────────────────────────

const DBA_CORRELATION_TOOL = {
  name: "submit_dba_correlation",
  description: "Submit the DBA performance correlation analysis and erosion assessment.",
  input_schema: {
    type: "object" as const,
    properties: {
      correlation_signal1: {
        type: "string",
        enum: ["Positive", "Neutral", "Negative", "Insufficient Data"],
        description: "How DBA deployment correlates with Signal 1 (branded search / share of search) at this point in the campaign.",
      },
      correlation_aqs: {
        type: "string",
        enum: ["Positive", "Neutral", "Negative", "Insufficient Data"],
        description: "How DBA deployment correlates with Attention Quality Score — does the creative attention improve when DBAs are present?",
      },
      correlation_cstr: {
        type: "string",
        enum: ["Positive", "Neutral", "Negative", "Insufficient Data"],
        description: "How DBA consistency correlates with Consumer State Transition Rate — are consistent DBA deployments associated with better state movement?",
      },
      erosion_alert: {
        type: "boolean",
        description: "True if one or more Established assets are showing signals of erosion — declining signal health coincident with DBA deployment.",
      },
      erosion_asset_names: {
        type: "string",
        description: "Comma-separated names of assets flagged for erosion risk. Empty string if none.",
      },
      erosion_inference: {
        type: "string",
        description: "INTERNAL — 1–2 sentences explaining why erosion is suspected, based on signal data. Empty if no erosion.",
      },
      correlation_summary: {
        type: "string",
        description: "INTERNAL — 3–5 sentences. A strategic read of what the DBA ↔ signal correlation pattern means for this campaign. Identifies what to reinforce, what to watch, and whether DBA consistency appears to be driving or trailing campaign performance. INTERNAL ONLY — never share with client.",
      },
    },
    required: [
      "correlation_signal1", "correlation_aqs", "correlation_cstr",
      "erosion_alert", "erosion_asset_names", "erosion_inference",
      "correlation_summary",
    ],
  },
} as const;

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id, strategy_notes = "" } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const anthropic = new Anthropic();

    // 1. Campaign + frame brief
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, clients(name), frame_briefs(distinctive_assets_deployed)")
      .eq("id", campaign_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const clientName = (campaign.clients as { name: string } | null)?.name ?? "Unknown";
    const frames = campaign.frame_briefs as { distinctive_assets_deployed?: string }[] | null;
    const deployedStr = frames?.[0]?.distinctive_assets_deployed ?? "";

    // 2. Parse deployed asset IDs
    const deployedIds = deployedStr === "NONE_CONFIRMED"
      ? []
      : deployedStr.split(",").map(s => s.trim()).filter(Boolean);

    // 3. Fetch asset records
    let deployedAssets: { id: string; asset_name: string; asset_type: string; asset_strength: string; description: string }[] = [];
    if (deployedIds.length > 0) {
      const { data: assets } = await supabase
        .from("brand_assets")
        .select("id, asset_name, asset_type, asset_strength, description")
        .in("id", deployedIds);
      deployedAssets = assets ?? [];
    }

    const avgStrengthScore = deployedAssets.length > 0
      ? Math.round(deployedAssets.reduce((s, a) => s + assetStrengthToScore(a.asset_strength), 0) / deployedAssets.length)
      : 0;

    // 4. Latest signal health
    const { data: signalReports } = await supabase
      .from("signal_weekly_reports")
      .select("week_number, conversion_health, demand_health, nurture_health")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(1);
    const latestSignal = signalReports?.[0] ?? null;
    const signal1Score = healthToScore(latestSignal?.conversion_health);

    // 5. Latest AQS
    const { data: aqsRows } = await supabase
      .from("signal_media_delivery")
      .select("aqs_score, aqs_band, week_number")
      .eq("campaign_id", campaign_id)
      .not("aqs_score", "is", null)
      .order("week_number", { ascending: false })
      .limit(1);
    const latestAqs = aqsRows?.[0] ?? null;

    // 6. Latest CSTR
    const { data: cstrRows } = await supabase
      .from("consumer_state_readings")
      .select("f27_status, week_number")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(1);
    const latestCstr = cstrRows?.[0] ?? null;

    // 7. Directional correlation estimates (for context injection)
    const corrS1  = directionFromScore(signal1Score, avgStrengthScore);
    const corrAqs = latestAqs?.aqs_score
      ? directionFromScore(Math.round(Number(latestAqs.aqs_score)), avgStrengthScore)
      : "Insufficient Data";
    const corrCstr = latestCstr?.f27_status
      ? directionFromScore(latestCstr.f27_status === "TRANSITION CONFIRMED" ? 80 : 40, avgStrengthScore)
      : "Insufficient Data";

    // Erosion: Established assets with declining signal
    const erosionCandidates = deployedAssets.filter(a => a.asset_strength === "Established" && signal1Score < 50);

    // 8. AI analysis
    const assetList = deployedAssets.length > 0
      ? deployedAssets.map(a => `- ${a.asset_name} (${a.asset_type}, ${a.asset_strength}): ${a.description}`).join("\n")
      : "No distinctive assets confirmed as deployed in this campaign.";

    const userPrompt = `BRAND: ${clientName}
CAMPAIGN: ${campaign.name}

── DEPLOYED DISTINCTIVE BRAND ASSETS ──
${assetList}
Average asset strength score: ${avgStrengthScore}/100

── SIGNAL HEALTH (latest week) ──
Signal 1 (Conversion/Search): ${latestSignal?.conversion_health ?? "No data"} (score: ${signal1Score}/100)
Signal 2 (Demand/Nurture): ${latestSignal?.demand_health ?? "No data"}
Signal 3 (UGC/Nurture): ${latestSignal?.nurture_health ?? "No data"}

── AQS (Attention Quality Score) ──
Score: ${latestAqs?.aqs_score ?? "No data"} | Band: ${latestAqs?.aqs_band ?? "No data"}

── CSTR (Consumer State Transition) ──
Status: ${latestCstr?.f27_status ?? "No data"}

── PRELIMINARY DIRECTIONAL CORRELATION ──
Signal 1 ↔ DBA: ${corrS1}
AQS ↔ DBA: ${corrAqs}
CSTR ↔ DBA: ${corrCstr}

── EROSION CANDIDATES ──
${erosionCandidates.length > 0
    ? erosionCandidates.map(a => `- ${a.asset_name} (Established → Signal 1 declining)`).join("\n")
    : "None identified."}

── TASK ──
Provide a directional DBA Performance Correlation assessment for this campaign.
Assess whether each correlation direction (Positive/Neutral/Negative/Insufficient Data) is correct given the context.
Identify any Erosion Alert conditions.
Write a 3–5 sentence internal strategic read of what this pattern means.
ALL OUTPUT IS INTERNAL — never client-facing.`;

    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      tools: [DBA_CORRELATION_TOOL],
      tool_choice: { type: "tool", name: "submit_dba_correlation" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolBlock = aiResponse.content.find(b => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("AI did not return correlation analysis");
    }

    const result = toolBlock.input as {
      correlation_signal1: string;
      correlation_aqs: string;
      correlation_cstr: string;
      erosion_alert: boolean;
      erosion_asset_names: string;
      erosion_inference: string;
      correlation_summary: string;
    };

    // 9. Persist
    const { data: saved, error: saveErr } = await supabase
      .from("dba_correlation_logs")
      .insert({
        campaign_id,
        assets_deployed_ids: deployedIds.join(","),
        signal1_health: latestSignal?.conversion_health ?? null,
        aqs_score: latestAqs?.aqs_score ?? null,
        aqs_band: latestAqs?.aqs_band ?? null,
        cstr_status: latestCstr?.f27_status ?? null,
        correlation_signal1: result.correlation_signal1,
        correlation_aqs: result.correlation_aqs,
        correlation_cstr: result.correlation_cstr,
        erosion_alert: result.erosion_alert,
        erosion_asset_names: result.erosion_asset_names,
        erosion_inference: result.erosion_inference,
        correlation_summary: result.correlation_summary,
        strategy_notes,
      })
      .select("id, created_at")
      .single();

    if (saveErr) {
      console.error("/api/dba-correlation save error:", saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      id: saved?.id,
      campaign_id,
      deployed_assets: deployedAssets,
      signal1_health: latestSignal?.conversion_health ?? null,
      aqs_score: latestAqs?.aqs_score ?? null,
      aqs_band: latestAqs?.aqs_band ?? null,
      cstr_status: latestCstr?.f27_status ?? null,
      correlation_signal1: result.correlation_signal1,
      correlation_aqs: result.correlation_aqs,
      correlation_cstr: result.correlation_cstr,
      erosion_alert: result.erosion_alert,
      erosion_asset_names: result.erosion_asset_names,
      erosion_inference: result.erosion_inference,
      correlation_summary: result.correlation_summary,
      created_at: saved?.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/dba-correlation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaign_id = searchParams.get("campaign_id");
  if (!campaign_id) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dba_correlation_logs")
    .select("*")
    .eq("campaign_id", campaign_id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data ?? [] });
}
