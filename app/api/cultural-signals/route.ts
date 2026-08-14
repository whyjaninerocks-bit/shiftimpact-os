// app/api/cultural-signals/route.ts
// Cultural Radar & Instigation Engine — GA3 prototype
// GET  /api/cultural-signals        — list all signals
// POST /api/cultural-signals        — create new signal + auto-classify industries

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import { getModel } from "@/lib/ai-model";

const INDUSTRY_OPTIONS = [
  "FMCG", "Financial Services", "Technology", "Retail", "QSR",
  "Healthcare", "Property", "Education", "Insurance", "Automotive",
  "Hospitality", "Media & Entertainment", "Telco", "E-Commerce", "B2B SaaS",
];

// ── Auto-classify with Claude Haiku ──────────────────────────────────────────
// Returns is_generic + relevant_industries based on signal content.
// is_generic = true  → applies to any Malaysian/SEA consumer brand
// is_generic = false → industry-specific; use relevant_industries to route
async function autoClassify(
  signal_name: string,
  signal_type: string,
  evidence: string,
): Promise<{ is_generic: boolean; relevant_industries: string[] }> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = await getModel("model_cultural_classify", "claude-haiku-4-5-20251001");

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are classifying a cultural signal for ShiftImpact OS, a growth intelligence platform for Malaysian and Southeast Asian brands.

SIGNAL:
Name: ${signal_name}
Type: ${signal_type} (behavioural | linguistic | ritual | community)
Evidence: ${evidence}

CLASSIFY:

1. is_generic: true if this cultural signal applies broadly to ANY Malaysian/SEA consumer brand — e.g. festive rituals, everyday expressions, universal symbols, widely-shared consumer behaviours. false if it is specific to particular industries or verticals.

2. relevant_industries: which of the following industries should receive this signal? Choose ALL that genuinely apply. When is_generic=true, still list the industries most immediately impacted.
   Options: ${INDUSTRY_OPTIONS.join(", ")}

Return valid JSON only, no explanation, no markdown:
{"is_generic": boolean, "relevant_industries": string[]}`,
        },
      ],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown code fences if present
    const clean = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean) as { is_generic: boolean; relevant_industries: string[] };

    // Validate
    const is_generic = !!parsed.is_generic;
    const relevant_industries = (parsed.relevant_industries ?? []).filter(
      (i: string) => INDUSTRY_OPTIONS.includes(i)
    );

    return { is_generic, relevant_industries };
  } catch {
    // Auto-classify failed — return safe defaults (won't block signal creation)
    return { is_generic: false, relevant_industries: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cultural_signals")
    .select("id, signal_name, signal_type, is_trending, is_generic, geographic_scope, brand_fit_status, status, relevant_industries, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signals: data });
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  const {
    signal_name, signal_type, source_description, evidence,
    is_trending, geographic_scope,
    // Manual overrides — if provided, skip auto-classify for those fields
    relevant_industries: manualIndustries,
    client_id,
  } = body;

  if (!signal_name?.trim())        return NextResponse.json({ error: "signal_name required" }, { status: 400 });
  if (!signal_type)                return NextResponse.json({ error: "signal_type required" }, { status: 400 });
  if (!source_description?.trim()) return NextResponse.json({ error: "source_description required" }, { status: 400 });
  if (!evidence?.trim())           return NextResponse.json({ error: "evidence required" }, { status: 400 });

  // Step 1: save the signal with any manually-provided industries
  const insertRow: Record<string, unknown> = {
    signal_name:        signal_name.trim(),
    signal_type,
    source_description: source_description.trim(),
    evidence:           evidence.trim(),
    is_trending:        !!is_trending,
    geographic_scope:   geographic_scope || "MY",
    status:             "logged",
    is_generic:         false,
    relevant_industries: Array.isArray(manualIndustries) && manualIndustries.length > 0
      ? manualIndustries
      : [],
  };
  if (client_id) insertRow.client_id = client_id;

  const { data, error } = await supabase
    .from("cultural_signals")
    .insert(insertRow)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Step 2: auto-classify — enrich is_generic + relevant_industries via Claude Haiku
  // If manual industries were provided we still run classify to get is_generic,
  // but keep the manual industry list if Claude returns fewer matches.
  const { is_generic, relevant_industries: autoIndustries } = await autoClassify(
    signal_name.trim(),
    signal_type,
    evidence.trim(),
  );

  // Merge: union of manual + auto (auto may surface more relevant industries)
  const mergedIndustries = Array.from(new Set([
    ...(Array.isArray(manualIndustries) ? manualIndustries : []),
    ...autoIndustries,
  ]));

  const updatePayload: Record<string, unknown> = {
    is_generic,
    relevant_industries: mergedIndustries,
  };

  const { data: updated, error: updateError } = await supabase
    .from("cultural_signals")
    .update(updatePayload)
    .eq("id", data.id)
    .select()
    .single();

  if (updateError) {
    // Return original (still saved) — classification failed, not the save
    return NextResponse.json({ signal: data, classify_error: updateError.message }, { status: 201 });
  }

  return NextResponse.json({ signal: updated }, { status: 201 });
}
