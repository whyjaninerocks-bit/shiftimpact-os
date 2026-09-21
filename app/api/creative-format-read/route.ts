// app/api/creative-format-read/route.ts
// Creative Format Read v0.1 schema/UI — INTERNAL ONLY, never client-facing.
//
// Mirrors app/api/strategic-synthesis/route.ts's structure and reasoning
// closely on purpose: same risk profile (an LLM producing first-pass
// judgment for a human strategist to weigh), same "the route does the
// write" pattern, same freeze-input-snapshot-before-calling-the-model
// discipline.
//
// POST /api/creative-format-read
// Body: { campaign_id: string, asset_description: string, asset_maturity: "script" | "storyboard" | "rough_cut" | "final_asset" }
//
// This route NEVER writes to frame_briefs or big_idea_platforms — it only
// ever inserts one row into creative_format_reads. Unlike Strategic
// Synthesis, there is nothing to "apply" here: this is a read, not a draft,
// so the row this route inserts IS the final artifact of the run — no
// separate review/apply/reject step, and the row is never updated after
// insert (see migration 0098's append-only note).
//
// Live model-output QA is still pending in this engagement (ANTHROPIC_API_KEY
// not reachable in the build/QC sandbox) — this route is untested against a
// live model call. See CreativeFormatReadSection.tsx's on-screen warning.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth/require-session";
import { getModel } from "@/lib/ai-model";
import {
  CREATIVE_FORMAT_READ_SYSTEM_PROMPT,
  buildCreativeFormatReadUserPrompt,
  buildCreativeFormatReadTool,
  assembleCreativeFormatRead,
  renderCreativeFormatReadSummary,
  type CreativeAssetMaturity as LogicAssetMaturity,
} from "@/lib/creative-format-read";
import type { StrategicBasisSource, BrandCommerceClassification } from "@/lib/types";
import type { MarketCoverageContext } from "@/lib/strategic-synthesis";

const ASSET_MATURITIES: LogicAssetMaturity[] = ["script", "storyboard", "rough_cut", "final_asset"];

export async function POST(req: NextRequest) {
  const authError = await requireSession();
  if (authError) return authError;

  const supabase = createAdminClient();

  let campaign_id: string | undefined;
  let asset_description: string | undefined;
  let asset_maturity: LogicAssetMaturity | undefined;
  let frame_brief_id: string | null = null;
  let big_idea_platform_id: string | null = null;

  try {
    const body = await req.json();
    campaign_id = body.campaign_id;
    asset_description = typeof body.asset_description === "string" ? body.asset_description.trim() : "";
    asset_maturity = body.asset_maturity;

    if (!campaign_id || !asset_description) {
      return NextResponse.json(
        { error: "campaign_id and asset_description are required" },
        { status: 400 }
      );
    }
    if (!asset_maturity || !ASSET_MATURITIES.includes(asset_maturity)) {
      return NextResponse.json({ error: `Invalid asset_maturity: ${asset_maturity}` }, { status: 400 });
    }

    // 1. Load campaign + client for prompt context.
    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("name, primary_market_code, clients(name)")
      .eq("id", campaign_id)
      .single();
    if (cErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const clientRow = campaign.clients as unknown as { name: string } | null;
    const clientName = clientRow?.name ?? "Unknown Brand";

    // 2. Market Cultural Coverage — same read Strategic Synthesis uses
    // (Market Activation by Radar Layer 1). primary_market_code may be null
    // or a non-country code with no market_parameters row — both resolve to
    // "not tracked" via buildMarketCoverageBlock.
    const marketCode = (campaign as { primary_market_code?: string | null }).primary_market_code ?? null;
    let marketCoverage: MarketCoverageContext | null = null;
    if (marketCode) {
      const { data: marketParamRow } = await supabase
        .from("market_parameters")
        .select("market_name, coverage_status")
        .eq("market_code", marketCode.toUpperCase())
        .maybeSingle();
      const { count: signalCount } = await supabase
        .from("cultural_signals")
        .select("id", { count: "exact", head: true })
        .eq("geographic_scope", marketCode);
      marketCoverage = {
        marketCode,
        marketName: marketParamRow?.market_name ?? null,
        coverageStatus: marketParamRow?.coverage_status ?? null,
        signalCount: signalCount ?? 0,
      };
    }

    // 3. Load FRAME (required — a campaign always has one by the time this
    // route can be called from the UI, but defend anyway).
    const { data: frame, error: fErr } = await supabase
      .from("frame_briefs")
      .select("*")
      .eq("campaign_id", campaign_id)
      .single();
    if (fErr || !frame) {
      return NextResponse.json({ error: "FRAME Brief not found for this campaign" }, { status: 404 });
    }
    frame_brief_id = frame.id as string;

    // 4. Load BIP only when it exists — Creative Format Read can still run
    // against FRAME alone; lib/creative-format-read.ts degrades gracefully
    // when bip is null (marks brand_role/cta_action_path/format_fit
    // insufficient_input rather than guessing).
    const { data: bip } = await supabase
      .from("big_idea_platforms")
      .select("*")
      .eq("campaign_id", campaign_id)
      .maybeSingle();
    if (bip) big_idea_platform_id = bip.id as string;

    // 5. Cited strategic basis sources — prefer BIP's (an asset diagnoses
    // against the creative platform most directly) and fall back to
    // FRAME's when there's no BIP yet.
    const basisTarget = bip ? { type: "big_idea_platform" as const, id: bip.id as string } : { type: "frame_brief" as const, id: frame.id as string };
    const { data: basisSourcesRaw, error: basisErr } = await supabase
      .from("strategic_basis_sources")
      .select("*")
      .eq("target_type", basisTarget.type)
      .eq("target_id", basisTarget.id);
    if (basisErr) throw new Error(basisErr.message);
    const basisSources = (basisSourcesRaw as StrategicBasisSource[]) ?? [];

    // 6. Brand-Commerce Read classification — same single source of truth
    // Strategic Synthesis uses, never inferred from free text.
    const { data: signalMap } = await supabase
      .from("campaign_signal_maps")
      .select("classification")
      .eq("campaign_id", campaign_id)
      .eq("is_active", true)
      .maybeSingle();
    const brandCommerceClassification =
      (signalMap as { classification: BrandCommerceClassification } | null)?.classification ?? null;

    // 7. Freeze input_snapshot NOW — never a live join later. Mirrors
    // Strategic Synthesis's own field selection for frame/bip.
    const input_snapshot = {
      frame: {
        force: frame.force,
        role: frame.role,
        anchor: frame.anchor,
        mood: frame.mood,
        expression: frame.expression,
        clarity_statement: frame.clarity_statement,
        enemy_villain: frame.enemy_villain,
        enemy_active: frame.enemy_active,
      },
      bip: bip
        ? {
            topline_idea: bip.topline_idea,
            brand_role: bip.brand_role,
            cultural_tension: bip.cultural_tension,
            propagation_mechanism: bip.propagation_mechanism,
            media_idea: bip.media_idea,
          }
        : null,
      basis_source_ids: basisSources.map((s) => s.id),
      market_coverage: marketCoverage,
      brand_commerce_classification: brandCommerceClassification,
      asset_description,
      asset_maturity,
    };

    // 8. Call Claude — forced structured output via tool use, same pattern
    // as /api/strategic-synthesis and /api/iq-evaluate.
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_creative_format_read", "claude-sonnet-4-6");

    const userPrompt = buildCreativeFormatReadUserPrompt({
      campaignName: campaign.name,
      clientName,
      frame: frame as unknown as Record<string, unknown>,
      bip: bip as unknown as Record<string, unknown> | null,
      basisSources,
      marketCoverage,
      brandCommerceClassification,
      assetDescription: asset_description,
      assetMaturity: asset_maturity,
    });

    const tool = buildCreativeFormatReadTool();

    const aiResponse = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      system: CREATIVE_FORMAT_READ_SYSTEM_PROMPT,
      tools: [tool],
      tool_choice: { type: "tool", name: "submit_creative_format_read" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("Claude did not return a tool_use block");
    }
    const result = toolBlock.input as {
      dimensions: {
        key: string;
        observed_read: string;
        rationale: string;
        evidence_quality: string;
        status: string;
        strengthening_move: string;
      }[];
      platform_seam?: { platform_dependent?: boolean; platform_note?: string };
    };
    const modelDimensions = Array.isArray(result.dimensions) ? result.dimensions : [];

    // 9. Assemble — merges model output with server-side guardrail scrub and
    // the asset-maturity confidence cap. This is the enforcement layer;
    // never trust the model's own evidence_quality claim past this point.
    const assembled = assembleCreativeFormatRead(modelDimensions, result.platform_seam, asset_maturity);
    const strategist_summary = renderCreativeFormatReadSummary(assembled, campaign.name);

    // 10. One insert — one row per run, never updated after (append-only,
    // see migration 0098).
    const { data: saved, error: saveErr } = await supabase
      .from("creative_format_reads")
      .insert({
        campaign_id,
        frame_brief_id,
        big_idea_platform_id,
        asset_description,
        asset_maturity,
        input_snapshot,
        output_dimensions: assembled.dimensions,
        platform_seam: assembled.platform_seam,
        strategist_summary,
        status: "ready",
      })
      .select("*")
      .single();

    if (saveErr) {
      console.error("/api/creative-format-read save error:", saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/creative-format-read error:", message);

    // Persist the failed attempt too, when we have enough to do so, so the
    // run history is honest about failures rather than silent — same
    // pattern as Strategic Synthesis's error handling.
    if (campaign_id) {
      await supabase
        .from("creative_format_reads")
        .insert({
          campaign_id,
          frame_brief_id,
          big_idea_platform_id,
          asset_description: asset_description ?? "",
          asset_maturity: asset_maturity ?? "script",
          input_snapshot: {},
          output_dimensions: [],
          status: "error",
          error_message: message,
        })
        .select("id")
        .maybeSingle();
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
