// app/api/prospect-enrich/route.ts
// Sprint 11 — LinkedIn + Web Profile Enrichment
//
// POST /api/prospect-enrich
// Body: { company_id: string }
//
// Flow:
//   1. Load company (name, linkedin_url, website, industry, market_code)
//   2. Parallel scrape:
//      a. anchor/linkedin-company-detail-scraper (if linkedin_url exists + APIFY_TOKEN)
//      b. apify/rag-web-browser — company profile + headcount search
//   3. Haiku tool_use → structured enrichment fields
//   4. PATCH company record (only non-null fields overwrite)
//   5. Return { enriched_fields, company_id }
//
// Security: service role only. Never called from client-facing interface.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = "https://api.apify.com/v2";

// ─── Apify helper ─────────────────────────────────────────────────────────────

async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 25,
  maxItems = 3
): Promise<Record<string, unknown>[]> {
  if (!APIFY_TOKEN) return [];
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSecs}&maxItems=${maxItems}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout((timeoutSecs + 5) * 1000),
    });
    if (!res.ok) return [];
    return await res.json() as Record<string, unknown>[];
  } catch {
    return [];
  }
}

// ─── Tool schema for enrichment synthesis ────────────────────────────────────

const ENRICH_TOOL = {
  name: "submit_company_enrichment",
  description: "Submit structured enrichment data extracted from web research about this company.",
  input_schema: {
    type: "object" as const,
    properties: {
      company_profile_summary: {
        type: "string",
        description: "2–3 sentences describing what the company does, who it serves, and its market position. Be specific — avoid generic phrases. Use present tense.",
      },
      employee_band: {
        type: "string",
        enum: ["<10", "10-50", "51-200", "201-500", "501-2000", "2000+"],
        description: "Best estimate of headcount band based on any evidence. Choose the closest band if exact number available.",
      },
      business_model: {
        type: "string",
        enum: ["B2C", "B2B", "B2B2C", "Marketplace", "DTC", "Other"],
        description: "Primary business model. B2B2C if sells to businesses who sell to consumers.",
      },
      growth_stage: {
        type: "string",
        enum: ["Pre-Revenue", "Early", "Growth", "Scale", "Mature", "Enterprise"],
        description: "Growth stage: Pre-Revenue=pre-launch; Early=<RM5M revenue or Series A; Growth=expanding; Scale=scaling fast; Mature=established; Enterprise=large established corp.",
      },
      website: {
        type: "string",
        description: "Official website URL (e.g. https://company.com). Only include if found in the data — do NOT invent.",
      },
      linkedin_url: {
        type: "string",
        description: "LinkedIn company URL (e.g. https://linkedin.com/company/name). Only include if found — do NOT invent.",
      },
      confidence: {
        type: "string",
        enum: ["High", "Medium", "Low"],
        description: "High = data found directly in LinkedIn profile or official sources. Medium = inferred from multiple web sources. Low = limited data, mostly inferred.",
      },
      enrichment_notes: {
        type: "string",
        description: "1–2 sentences on the most significant finding or biggest uncertainty in this enrichment. Internal only.",
      },
    },
    required: ["company_profile_summary", "confidence", "enrichment_notes"],
  },
} as const;

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let body: { company_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_id } = body;
  if (!company_id) return NextResponse.json({ error: "company_id is required" }, { status: 400 });

  // ── Load company ──────────────────────────────────────────────────────────
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("id, name, industry, market_code, linkedin_url, website, employee_band, business_model, growth_stage, company_profile_summary")
    .eq("id", company_id)
    .single();

  if (companyErr || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // ── Parallel scrape ───────────────────────────────────────────────────────
  const rawChunks: string[] = [];

  const [liItems, ragItems] = await Promise.all([
    // LinkedIn company detail scraper (only if URL + token)
    (company.linkedin_url && APIFY_TOKEN)
      ? runApifyActor("anchor/linkedin-company-detail-scraper", {
          startUrls: [{ url: company.linkedin_url }],
          maxResults: 1,
        }, 25, 1).catch(() => [] as Record<string, unknown>[])
      : Promise.resolve([] as Record<string, unknown>[]),

    // RAG web browser — profile + headcount + market position
    APIFY_TOKEN
      ? runApifyActor("apify/rag-web-browser", {
          query: `"${company.name}" company profile employees headcount ${company.market_code ?? "Malaysia"} ${company.industry ?? ""} founded`,
          maxResults: 4,
        }, 25, 4).catch(() => [] as Record<string, unknown>[])
      : Promise.resolve([] as Record<string, unknown>[]),
  ]);

  // Process LinkedIn scraper output
  if (liItems.length > 0) {
    const li = liItems[0];
    const liText = [
      li.description,
      li.tagline,
      li.specialities,
      li.employeeCount ? `Employee count: ${li.employeeCount}` : null,
      li.founded ? `Founded: ${li.founded}` : null,
      li.websiteUrl ? `Website: ${li.websiteUrl}` : null,
    ].filter(Boolean).join("\n");
    if (liText) rawChunks.push(`[LinkedIn Company Profile — ${company.linkedin_url}]\n${liText.slice(0, 1500)}`);
  }

  // Process RAG web results
  for (const item of ragItems.slice(0, 4)) {
    const text  = ((item.text || item.markdown || item.description || "") as string).slice(0, 600);
    const title = (item.title || "") as string;
    const url   = (item.url || item.canonicalUrl || "") as string;
    if (text) rawChunks.push(`[Web: ${title}]\nURL: ${url}\n${text}`);
  }

  // Fallback: use existing profile summary as context if no web data
  if (rawChunks.length === 0 && company.company_profile_summary) {
    rawChunks.push(`[Existing profile summary]\n${company.company_profile_summary}`);
  }

  if (rawChunks.length === 0) {
    return NextResponse.json({
      warning: "No data retrieved — APIFY_API_TOKEN may not be configured or scraper returned empty results.",
      company_id,
      enriched_fields: {},
    });
  }

  // ── AI synthesis ──────────────────────────────────────────────────────────
  const systemPrompt = `You are enriching a company profile in a B2B intelligence system. Extract structured data about the company from the web research provided.

RULES:
- Only populate fields where you found clear evidence. Leave optional fields omitted if data is absent.
- Do NOT invent URLs, employee counts, or financial details.
- Be specific in the profile summary — if the company makes FMCG products, name the product categories.
- Market: ${company.market_code ?? "MY"} · Industry: ${company.industry ?? "Unknown"}`;

  const userPrompt = `Company: ${company.name}
Existing data: employee_band=${company.employee_band ?? "unknown"}, business_model=${company.business_model ?? "unknown"}, growth_stage=${company.growth_stage ?? "unknown"}

Web research collected:
${rawChunks.join("\n\n---\n\n")}

Extract enrichment data. Only include fields where evidence exists.`;

  let enriched: Record<string, string | undefined> = {};

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: systemPrompt,
      tools: [ENRICH_TOOL],
      tool_choice: { type: "tool", name: "submit_company_enrichment" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolBlock = msg.content.find(b => b.type === "tool_use");
    if (toolBlock?.type === "tool_use") {
      enriched = toolBlock.input as Record<string, string | undefined>;
    }
  } catch (e) {
    return NextResponse.json({ error: `AI synthesis failed: ${String(e)}` }, { status: 500 });
  }

  // ── Build update object (only overwrite empty/null fields) ────────────────
  // For profile summary + profile fields: always update if we got better data.
  // For website + linkedin_url: only set if currently empty.
  const update: Record<string, string> = {};

  if (enriched.company_profile_summary) {
    update.company_profile_summary = enriched.company_profile_summary;
  }
  if (enriched.employee_band) {
    update.employee_band = enriched.employee_band;
  }
  if (enriched.business_model && !company.business_model) {
    update.business_model = enriched.business_model;
  }
  if (enriched.growth_stage && !company.growth_stage) {
    update.growth_stage = enriched.growth_stage;
  }
  if (enriched.website && !company.website) {
    update.website = enriched.website;
  }
  if (enriched.linkedin_url && !company.linkedin_url) {
    update.linkedin_url = enriched.linkedin_url;
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  let updated = false;
  if (Object.keys(update).length > 0) {
    const { error: updateErr } = await supabase
      .from("companies")
      .update(update)
      .eq("id", company_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    updated = true;
  }

  return NextResponse.json({
    company_id,
    company_name:   company.name,
    enriched_fields: update,
    enrichment_notes: enriched.enrichment_notes ?? null,
    confidence:      enriched.confidence ?? "Low",
    updated,
    sources_used: rawChunks.length,
    apify_configured: !!APIFY_TOKEN,
  });
}
