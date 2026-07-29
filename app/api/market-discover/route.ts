// app/api/market-discover/route.ts
// Market Discovery Engine — given a sector + market, find companies with active
// business signals that aren't yet in the pipeline.
//
// Flow:
//   1. Use Apify RAG browser + Google Search to find recent news in the sector
//   2. AI extracts company names + signals from the results
//   3. Cross-check against existing companies in DB to filter already-tracked ones
//   4. Return ranked discovery list with signal context

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = "https://api.apify.com/v2";

async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 20,
  maxItems = 8
) {
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSecs}&maxItems=${maxItems}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout((timeoutSecs + 3) * 1000),
  });
  if (!res.ok) throw new Error(`Apify ${actorId} — ${res.status}`);
  return res.json() as Promise<Record<string, unknown>[]>;
}

const DISCOVER_TOOL: Anthropic.Tool = {
  name: "extract_companies",
  description: "Extract companies with active business signals from news content",
  input_schema: {
    type: "object" as const,
    properties: {
      companies: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name:         { type: "string", description: "Company name as it appears in the news" },
            industry:     { type: "string", description: "Industry sector" },
            market_code:  { type: "string", description: "2-letter market code: MY, SG, PH, TH, ID" },
            signal_type:  { type: "string", description: "Type of business signal: Growth, Recognition, Milestone, Activation, Leadership" },
            signal_text:  { type: "string", description: "One-sentence description of the specific business event" },
            source_url:   { type: "string", description: "URL of the news article" },
            why_now:      { type: "string", description: "Why this company is worth approaching now — the strategic tension or opportunity" },
            relevance_score: { type: "number", description: "0-100 relevance score for ShiftImpact OS positioning" },
          },
          required: ["name", "industry", "market_code", "signal_type", "signal_text", "why_now", "relevance_score"],
        },
      },
    },
    required: ["companies"],
  },
};

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const sector      = (body.sector      ?? "") as string;
  const market      = (body.market      ?? "Malaysia") as string;
  const marketCode  = (body.market_code ?? "MY") as string;

  if (!sector) {
    return NextResponse.json({ error: "sector is required" }, { status: 400 });
  }

  // 1. Scrape — run both sources in parallel
  const rawChunks: string[] = [];

  const [ragItems, gnItems] = await Promise.all([
    APIFY_TOKEN
      ? runApifyActor("apify/rag-web-browser", {
          query: `${sector} ${market} company news award launch expansion partnership 2025 OR 2026`,
          maxResults: 8,
        }, 20, 8).catch(() => [] as Record<string, unknown>[])
      : Promise.resolve([] as Record<string, unknown>[]),

    APIFY_TOKEN
      ? runApifyActor("apify/google-search-scraper", {
          queries: `${sector} ${market} brand OR company news 2025 OR 2026 award OR launch OR expansion OR leadership`,
          maxPagesPerQuery: 1,
          resultsPerPage: 10,
        }, 20, 10).catch(() => [] as Record<string, unknown>[])
      : Promise.resolve([] as Record<string, unknown>[]),
  ]);

  for (const item of ragItems.slice(0, 8)) {
    const text  = ((item.text || item.markdown || item.description || "") as string).slice(0, 500);
    const url   = (item.url || item.canonicalUrl || "") as string;
    const title = (item.title || "") as string;
    if (text) rawChunks.push(`[Article: ${title}]\nURL: ${url}\n${text}`);
  }

  for (const r of gnItems.slice(0, 10)) {
    const title = (r.title || "") as string;
    const text  = (r.description || r.snippet || r.text || "") as string;
    const url   = (r.url || r.link || "") as string;
    if (text) rawChunks.push(`[Search: ${title}]\nURL: ${url}\n${text}`);
  }

  if (rawChunks.length === 0) {
    return NextResponse.json({
      companies: [],
      warning: "No content retrieved. Check that APIFY_API_TOKEN is configured.",
    });
  }

  // 2. Fetch existing tracked companies to filter out
  const { data: existing } = await supabase
    .from("companies")
    .select("name")
    .eq("is_suppressed", false);

  const existingNames = new Set(
    (existing ?? []).map(c => (c.name as string).toLowerCase().trim())
  );

  // 3. Extract companies via AI
  const rawContent = rawChunks.join("\n\n---\n\n").slice(0, 10000);

  const aiResp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    tool_choice: { type: "tool", name: "extract_companies" },
    tools: [DISCOVER_TOOL],
    messages: [
      {
        role: "user",
        content: `You are the Market Discovery Engine for ShiftImpact OS — a strategic intelligence consultancy serving brands and marketing leaders in Southeast Asia.

Your job: from the news content below, identify companies in the ${sector} sector in ${market} that have ACTIVE business signals — specific, real events that indicate they may need:
- Strategic narrative clarity
- Brand positioning work
- Campaign intelligence
- Communication strategy during a business transition

RULES:
- Only extract companies with SPECIFIC, VERIFIABLE events (not generic mentions)
- Each company must have a clear "why now" — what moment are they in?
- Relevance score: 0-100 based on fit for ShiftImpact's services (brand strategy, narrative, intelligence)
- market_code must be one of: MY, SG, PH, TH, ID
- signal_type must be: Growth, Recognition, Milestone, Activation, or Leadership
- Maximum 10 companies
- Do NOT include companies already in this list: ${Array.from(existingNames).join(", ")}

SECTOR: ${sector}
MARKET: ${market}

NEWS CONTENT:
${rawContent}`,
      },
    ],
  });

  let discovered: Array<{
    name: string;
    industry: string;
    market_code: string;
    signal_type: string;
    signal_text: string;
    source_url?: string;
    why_now: string;
    relevance_score: number;
  }> = [];

  const toolUse = aiResp.content.find(b => b.type === "tool_use");
  if (toolUse && toolUse.type === "tool_use") {
    const inp = toolUse.input as { companies: typeof discovered };
    discovered = (inp.companies ?? [])
      .filter(c => !existingNames.has(c.name.toLowerCase().trim()))
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 10);
  }

  return NextResponse.json({ companies: discovered, sources_scanned: rawChunks.length });
}
