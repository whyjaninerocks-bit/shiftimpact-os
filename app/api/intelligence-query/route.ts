// app/api/intelligence-query/route.ts
// F33 — Intelligence Query Activator (Sprint 7)
// INTERNAL ONLY — Janine-operated. NEVER exposed to clients.
//
// POST /api/intelligence-query
// Takes a natural-language client question, routes to relevant stored
// intelligence components for that campaign, runs targeted Claude inference,
// returns a 4-part client-safe finding + internal confidence/source metadata.
//
// The 4-part client-safe output:
//   headline      — one sentence
//   context       — 2-3 sentences (no raw numbers, no state codes)
//   implication   — 1-2 sentences
//   recommendation — 1-2 sentences
//
// INTERNAL ONLY fields (never shown to clients):
//   confidence        — High / Directional / Speculative
//   components_used   — which stored records contributed
//   data_basis        — table + record count + latest record timestamp
//   scopes_resolved   — which query type(s) the router mapped to
//
// Auth: service role only.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type QueryScope =
  | "signal_delivery"
  | "consumer_behaviour"
  | "brand_momentum"
  | "risk_pipeline"
  | "activation_next_steps"
  | "attribution_roi"
  | "ai_competitive_visibility"
  | "campaign_overview";

type ConfidenceTier = "High" | "Directional" | "Speculative";

interface DataBasis {
  component: string;
  table: string;
  record_count: number;
  latest_record_at: string | null;
}

interface IntelligenceQueryRequest {
  campaign_id: string;
  query_text: string;
  query_scope?: QueryScope[];   // optional override — router determines if omitted
  week_number?: number;          // defaults to most recent week with data
}

interface ComponentData {
  signal_reports?: unknown[];
  consumer_state?: unknown[];
  brand_momentum?: unknown[];
  attribution?: unknown[];
  orchestration_summary?: string | null;
  [key: string]: unknown;
}

// ─── Step 1: Route the query ──────────────────────────────────────────────────
// Lightweight inference to classify which intelligence domains the query requires.

async function routeQuery(
  query_text: string,
  anthropic: Anthropic
): Promise<QueryScope[]> {
  const routerPrompt = `You are a routing classifier for a campaign intelligence system.

Given a question, identify which intelligence domains are needed to answer it.
Return ONLY a JSON array of scope strings from this list:
- "signal_delivery"         (signals, reach, frequency, delivery health)
- "consumer_behaviour"      (who is buying, audience states, consumer journey)
- "brand_momentum"          (brand health, momentum score, brand direction)
- "risk_pipeline"           (risk of sales drop, pipeline cliff, warning flags)
- "activation_next_steps"   (what to do next, priority actions, recommendations)
- "attribution_roi"         (campaign ROI, what's driving results, revenue proof)
- "ai_competitive_visibility" (AI visibility, search presence, competitive position)
- "campaign_overview"       (overall summary, everything at once)

Rules:
- If "campaign_overview" is chosen, include it alone.
- Return 1-3 scopes maximum (unless campaign_overview).
- Return ONLY the JSON array. No explanation.

Question: "${query_text}"`;

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    messages: [{ role: "user", content: routerPrompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
  try {
    const parsed = JSON.parse(text) as QueryScope[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ["campaign_overview"];
  } catch {
    return ["campaign_overview"];
  }
}

// ─── Step 2: Pull stored component data ───────────────────────────────────────

async function fetchComponentData(
  campaign_id: string,
  scopes: QueryScope[],
  week_number: number | undefined,
  supabase: ReturnType<typeof getSupabase>
): Promise<{ data: ComponentData; data_basis: DataBasis[] }> {
  const data: ComponentData = {};
  const data_basis: DataBasis[] = [];
  const all = scopes.includes("campaign_overview");

  // Signal delivery
  if (all || scopes.includes("signal_delivery") || scopes.includes("risk_pipeline")) {
    const query = supabase
      .from("signal_weekly_reports")
      .select("week_number, week_of, demand_health, nurture_health, conversion_health, ai_narrative, pipeline_risk_detected, created_at")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(4);

    const { data: rows } = await query;
    data.signal_reports = rows ?? [];
    data_basis.push({
      component: "Signal Intelligence",
      table: "signal_weekly_reports",
      record_count: (rows ?? []).length,
      latest_record_at: rows?.[0]?.created_at ?? null,
    });
  }

  // Consumer behaviour
  if (all || scopes.includes("consumer_behaviour") || scopes.includes("activation_next_steps")) {
    const { data: rows } = await supabase
      .from("consumer_state_readings")
      .select("week_number, week_of, dominant_state, velocity_score, state_stall_flag, ai_narrative, created_at")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(4);

    data.consumer_state = rows ?? [];
    data_basis.push({
      component: "Consumer Behaviour State",
      table: "consumer_state_readings",
      record_count: (rows ?? []).length,
      latest_record_at: rows?.[0]?.created_at ?? null,
    });
  }

  // Brand momentum
  if (all || scopes.includes("brand_momentum") || scopes.includes("risk_pipeline")) {
    const { data: client_row } = await supabase
      .from("campaigns")
      .select("client_id")
      .eq("id", campaign_id)
      .single();

    if (client_row) {
      const { data: rows } = await supabase
        .from("brand_momentum_scores")
        .select("period_label, bms_direction, bms_velocity, bms_confidence, dimension_conflict_flag, ai_read, created_at")
        .eq("client_id", client_row.client_id)
        .order("created_at", { ascending: false })
        .limit(3);

      data.brand_momentum = rows ?? [];
      data_basis.push({
        component: "Brand Momentum Score",
        table: "brand_momentum_scores",
        record_count: (rows ?? []).length,
        latest_record_at: rows?.[0]?.created_at ?? null,
      });
    }
  }

  // Attribution
  if (all || scopes.includes("attribution_roi")) {
    const { data: rows } = await supabase
      .from("attribution_records")
      .select("week_number, channel_name, spend_rm, sales_rm, incremental_lift_pct, test_type, notes, created_at")
      .eq("campaign_id", campaign_id)
      .order("week_number", { ascending: false })
      .limit(8);

    data.attribution = rows ?? [];
    data_basis.push({
      component: "Attribution Data",
      table: "attribution_records",
      record_count: (rows ?? []).length,
      latest_record_at: rows?.[0]?.created_at ?? null,
    });
  }

  // Latest orchestration chain summary
  if (all || scopes.includes("campaign_overview")) {
    const { data: run } = await supabase
      .from("orchestration_runs")
      .select("chain_summary, completed_at")
      .eq("campaign_id", campaign_id)
      .eq("status", "COMPLETE")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    data.orchestration_summary = run?.chain_summary ?? null;
  }

  return { data, data_basis };
}

// ─── Step 3: Assess confidence tier ──────────────────────────────────────────

function assessConfidence(data_basis: DataBasis[]): ConfidenceTier {
  const populated = data_basis.filter(b => b.record_count > 0);
  if (populated.length === 0) return "Speculative";

  const totalRecords = populated.reduce((sum, b) => sum + b.record_count, 0);
  // High: 3+ weeks across relevant components (rough proxy: 3+ records per component)
  const avgRecords = totalRecords / populated.length;

  if (avgRecords >= 3 && populated.length >= 2) return "High";
  if (avgRecords >= 1) return "Directional";
  return "Speculative";
}

// ─── Step 4: Run targeted inference ──────────────────────────────────────────

async function generateFinding(
  query_text: string,
  scopes: QueryScope[],
  component_data: ComponentData,
  confidence: ConfidenceTier,
  anthropic: Anthropic
): Promise<{ headline: string; context: string; implication: string; recommendation: string }> {

  const dataContext = JSON.stringify(component_data, null, 2);

  const systemPrompt = `You are a campaign intelligence analyst. You produce client-safe findings from internal campaign data.

BOUNDARY RULES — STRICT:
1. No state codes (1, 2, 3, 4, 5, 6) — describe consumer behaviour in plain language only.
2. No competitor names — use directional language only ("competitive pressure", "market competition").
3. No raw metric numbers unless they come directly from the attribution data provided.
4. No internal system names (MDH, CSTR, BMS, ICS, FRAME, BIP, etc.) — describe what they mean, not what they're called.
5. CLIENT-SAFE ONLY — this output will be read directly to a client or pasted into a presentation.

CONFIDENCE: ${confidence}
${confidence === "Directional" ? "Phrase findings as indicative signals, not confirmed facts. Use language like 'early data suggests' or 'directionally'." : ""}
${confidence === "Speculative" ? "Clearly frame findings as preliminary. Limited data available. Do not overstate certainty." : ""}

Produce a 4-part finding as JSON:
{
  "headline": "<one sentence — what the data shows>",
  "context": "<2-3 sentences — what was measured and what it shows>",
  "implication": "<1-2 sentences — what this means for the brand or campaign>",
  "recommendation": "<1-2 sentences — what to do>"
}`;

  const userPrompt = `Client question: "${query_text}"

Intelligence domains queried: ${scopes.join(", ")}

Available data:
${dataContext}

Produce the 4-part client-safe finding as JSON.`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}";

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");

  try {
    const parsed = JSON.parse(cleaned) as {
      headline?: string;
      context?: string;
      implication?: string;
      recommendation?: string;
    };
    return {
      headline: parsed.headline ?? "Intelligence finding not available.",
      context: parsed.context ?? "",
      implication: parsed.implication ?? "",
      recommendation: parsed.recommendation ?? "",
    };
  } catch {
    // Fallback: return raw text as headline
    return {
      headline: text.slice(0, 120) || "Intelligence finding not available.",
      context: "",
      implication: "",
      recommendation: "",
    };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const anthropic = getAnthropic();

  let body: IntelligenceQueryRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { campaign_id, query_text, query_scope, week_number } = body;

  if (!campaign_id || !query_text?.trim()) {
    return NextResponse.json(
      { error: "campaign_id and query_text are required" },
      { status: 400 }
    );
  }

  // Step 1: Route the query
  const scopes_resolved: QueryScope[] = query_scope?.length
    ? query_scope
    : await routeQuery(query_text, anthropic);

  // Step 2: Pull stored component data
  const { data: component_data, data_basis } = await fetchComponentData(
    campaign_id,
    scopes_resolved,
    week_number,
    supabase
  );

  // Step 3: Assess confidence
  const confidence: ConfidenceTier = assessConfidence(data_basis);

  // Step 4: Generate finding
  const { headline, context, implication, recommendation } = await generateFinding(
    query_text,
    scopes_resolved,
    component_data,
    confidence,
    anthropic
  );

  const components_used = data_basis
    .filter(b => b.record_count > 0)
    .map(b => b.component);

  const result = {
    query_id: randomUUID(),
    campaign_id,
    query_text,
    // ── 4-part client-safe finding ──
    headline,
    context,
    implication,
    recommendation,
    // ── Internal only — NEVER shown to clients ──
    confidence,
    components_used,
    data_basis,
    scopes_resolved,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
