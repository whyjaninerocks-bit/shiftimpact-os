// app/api/strategic-synthesis/route.ts
// Strategic Synthesis v0.1 (Stage 4C.2) — INTERNAL ONLY, never client-facing.
//
// Optional, user-triggered (never a standing mode, never automatic). One
// call here produces exactly one strategic_synthesis_runs row — history is
// preserved, never overwritten, mirroring /api/iq-evaluate's pattern.
//
// POST /api/strategic-synthesis
// Body: { campaign_id: string, target_type: "frame_brief" | "big_idea_platform", target_id: string, triggered_by?: string }
//
// This route NEVER writes to frame_briefs or big_idea_platforms. It only
// ever inserts one row into strategic_synthesis_runs. Applying a drafted
// step to the live brief is a client-side, strategist-initiated action
// (see StrategicSynthesisPanel.tsx) followed by the existing FRAME/BIP Save.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";
import {
  FRAME_SYNTHESIS_STEPS,
  BIP_SYNTHESIS_STEPS,
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
  buildSynthesisTool,
  assembleSynthesisRoute,
  type MarketCoverageContext,
} from "@/lib/strategic-synthesis";
import type { StrategicBasisTargetType, StrategicBasisSource, BrandCommerceClassification } from "@/lib/types";

const TARGET_TYPES: StrategicBasisTargetType[] = ["frame_brief", "big_idea_platform"];

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let campaign_id: string | undefined;
  let target_type: StrategicBasisTargetType | undefined;
  let target_id: string | undefined;
  let triggered_by: string | null = null;

  try {
    const body = await req.json();
    campaign_id = body.campaign_id;
    target_type = body.target_type;
    target_id = body.target_id;
    triggered_by = body.triggered_by ?? null;

    if (!campaign_id || !target_type || !target_id) {
      return NextResponse.json(
        { error: "campaign_id, target_type, and target_id are required" },
        { status: 400 }
      );
    }
    if (!TARGET_TYPES.includes(target_type)) {
      return NextResponse.json({ error: `Invalid target_type: ${target_type}` }, { status: 400 });
    }

    // 1. Validate target exists and belongs to this campaign — target_id is
    // polymorphic, Postgres cannot enforce a real FK, so this is required
    // before touching anything else.
    const targetTable = target_type === "frame_brief" ? "frame_briefs" : "big_idea_platforms";
    const { data: targetRow, error: targetErr } = await supabase
      .from(targetTable)
      .select("*")
      .eq("id", target_id)
      .maybeSingle();
    if (targetErr) throw new Error(targetErr.message);
    if (!targetRow) {
      return NextResponse.json(
        { error: `${target_type === "frame_brief" ? "FRAME Brief" : "Big Idea Platform"} not found` },
        { status: 404 }
      );
    }
    if ((targetRow as { campaign_id: string }).campaign_id !== campaign_id) {
      return NextResponse.json({ error: "This target does not belong to the specified campaign." }, { status: 400 });
    }

    // 2. Load campaign + client for prompt context — including business
    // outcome fields, which live on Campaign/Client (not FrameBrief) and
    // feed the FRAME business_outcome read-only step. Cross-table, so this
    // is read-only context only, never a synthesis target.
    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("name, business_outcome_target, business_outcome_actual, primary_market_code, clients(name, business_outcome_label)")
      .eq("id", campaign_id)
      .single();
    if (cErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const clientRow = campaign.clients as unknown as { name: string; business_outcome_label: string } | null;
    const clientName = clientRow?.name ?? "Unknown Brand";
    const businessOutcome = {
      target: campaign.business_outcome_target ?? null,
      actual: campaign.business_outcome_actual ?? null,
      label: clientRow?.business_outcome_label ?? "Business Outcome",
    };

    // 2b. Market Activation by Radar Layer 1 — honest coverage read for this
    // campaign's primary market. primary_market_code may be null (never
    // set), or a non-country code (SEA/GLOBAL/OTHER) with no
    // market_parameters row — both resolve to marketParamRow === null,
    // which buildMarketCoverageBlock treats as "not tracked."
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

    // 3. Always load FRAME (BIP synthesis needs FRAME context too; FRAME
    // synthesis's own target IS the frame).
    const { data: frame, error: fErr } = await supabase
      .from("frame_briefs")
      .select("*")
      .eq("campaign_id", campaign_id)
      .single();
    if (fErr || !frame) {
      return NextResponse.json({ error: "FRAME Brief not found" }, { status: 404 });
    }

    // 4. Load BIP only when it exists (FRAME synthesis can run before BIP does).
    const { data: bip } = await supabase
      .from("big_idea_platforms")
      .select("*")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    // 5. Load cited strategic basis sources for THIS target only — these
    // gate cultural framing and are frozen into input_snapshot below.
    const { data: basisSourcesRaw, error: basisErr } = await supabase
      .from("strategic_basis_sources")
      .select("*")
      .eq("target_type", target_type)
      .eq("target_id", target_id);
    if (basisErr) throw new Error(basisErr.message);
    const basisSources = (basisSourcesRaw as StrategicBasisSource[]) ?? [];

    // 6. Load Brand-Commerce Read classification — the ONLY signal used to
    // gate Commerce / Action Intelligence framing. Never inferred from
    // free-text objectives.
    const { data: signalMap } = await supabase
      .from("campaign_signal_maps")
      .select("classification")
      .eq("campaign_id", campaign_id)
      .eq("is_active", true)
      .maybeSingle();
    const brandCommerceClassification =
      (signalMap as { classification: BrandCommerceClassification } | null)?.classification ?? null;

    // 7. Freeze input_snapshot NOW — the FRAME/BIP field values and the
    // specific basis source ids actually used. Never a live join later.
    const input_snapshot = {
      frame: {
        force: frame.force,
        role: frame.role,
        anchor: frame.anchor,
        mood: frame.mood,
        expression: frame.expression,
        clarity_statement: frame.clarity_statement,
        campaign_pathway: frame.campaign_pathway,
        primary_kpi: frame.primary_kpi,
        gate_signal_commitment: frame.gate_signal_commitment,
        enemy_villain: frame.enemy_villain,
        regulatory_category: frame.regulatory_category,
      },
      bip: bip
        ? {
            topline_idea: bip.topline_idea,
            enemy_villain: bip.enemy_villain,
            brand_role: bip.brand_role,
            propagation_mechanism: bip.propagation_mechanism,
            cultural_tension: bip.cultural_tension,
            media_idea: bip.media_idea,
            expression_summary: bip.expression_summary,
          }
        : null,
      basis_source_ids: basisSources.map((s) => s.id),
      brand_commerce_classification: brandCommerceClassification,
    };

    const stepDefs = target_type === "frame_brief" ? FRAME_SYNTHESIS_STEPS : BIP_SYNTHESIS_STEPS;
    const routeKey = target_type === "frame_brief" ? "marketing_brief_synthesis" : "creative_strategy_synthesis";
    const routeLabel = target_type === "frame_brief" ? "Marketing Brief Synthesis" : "Creative Strategy Synthesis";

    // 7b. currentValues — live field values at generation time, for the
    // protection rules in assembleSynthesisRoute (empty_only /
    // confirm_overwrite). Only the fields that actually need protection are
    // included; "always"/"read_only"/"enum" steps ignore this map.
    const currentValues: Record<string, string | null> = {};
    let enemyInheritance: { effectiveValue: string | null; inheritedFromFrame: boolean } | null = null;

    if (target_type === "frame_brief") {
      currentValues.primary_kpi = (frame.primary_kpi as string) || null;
      currentValues.gate_signal_commitment = (frame.gate_signal_commitment as string) || null;
    } else if (bip) {
      // Same precedence BigIdeaPlatformSection.tsx already uses for
      // `enemyDefault` — bip.enemy_villain wins if set, else frame's if
      // FRAME Enemy is active, else empty. Mirrored here so the protection
      // check and the prompt context agree with what the strategist
      // actually sees on the page.
      const bipEnemy = ((bip as { enemy_villain?: string }).enemy_villain ?? "").trim();
      const frameEnemyActive = !!(frame as { enemy_active?: boolean }).enemy_active;
      const frameEnemy = ((frame as { enemy_villain?: string }).enemy_villain ?? "").trim();
      const effectiveValue = bipEnemy.length > 0 ? bipEnemy : frameEnemyActive && frameEnemy.length > 0 ? frameEnemy : null;
      const inheritedFromFrame = bipEnemy.length === 0 && frameEnemyActive && frameEnemy.length > 0;
      currentValues.enemy_villain = effectiveValue;
      enemyInheritance = { effectiveValue, inheritedFromFrame };
    }

    // 8. Call Claude — forced structured output via tool use, same pattern
    // as /api/iq-evaluate.
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = await getModel("model_strategic_synthesis", "claude-sonnet-4-6");

    const userPrompt = buildSynthesisUserPrompt({
      targetType: target_type,
      campaignName: campaign.name,
      clientName,
      frame: frame as unknown as Record<string, unknown>,
      bip: bip as unknown as Record<string, unknown> | null,
      basisSources,
      brandCommerceClassification,
      steps: stepDefs,
      businessOutcome: target_type === "frame_brief" ? businessOutcome : null,
      enemyInheritance,
      marketCoverage,
    });

    const tool = buildSynthesisTool(stepDefs);

    const aiResponse = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      system: SYNTHESIS_SYSTEM_PROMPT,
      tools: [tool],
      tool_choice: { type: "tool", name: "submit_strategic_synthesis" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolBlock = aiResponse.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("Claude did not return a tool_use block");
    }
    const result = toolBlock.input as {
      steps: { key: string; draft_text: string; rationale: string; evidence_quality: string }[];
    };
    const modelSteps = Array.isArray(result.steps) ? result.steps : [];

    // 9. Assemble the route — merges server-defined step metadata
    // (target_field, protection) with model draft output, runs the
    // guardrail check, and applies protection rules (empty_only / enum /
    // confirm_overwrite) using currentValues computed above.
    const route = assembleSynthesisRoute(routeKey, routeLabel, stepDefs, modelSteps, currentValues);

    // 10. One insert — one row per generation event, never overwritten.
    const { data: saved, error: saveErr } = await supabase
      .from("strategic_synthesis_runs")
      .insert({
        campaign_id,
        target_type,
        target_id,
        triggered_by,
        input_snapshot,
        routes: [route],
        status: "ready",
        review_status: "not_reviewed",
      })
      .select("*")
      .single();

    if (saveErr) {
      console.error("/api/strategic-synthesis save error:", saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/strategic-synthesis error:", message);

    // Persist the failed attempt too, when we have enough to do so, so the
    // run history/audit trail is honest about failures rather than silent.
    if (campaign_id && target_type && target_id) {
      await supabase
        .from("strategic_synthesis_runs")
        .insert({
          campaign_id,
          target_type,
          target_id,
          triggered_by,
          input_snapshot: {},
          routes: [],
          status: "error",
          error_message: message,
        })
        .select("id")
        .maybeSingle();
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
