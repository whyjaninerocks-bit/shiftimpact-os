// app/api/market-discover/route.ts
// Market Discovery Engine — given a sector + market (+ optional signal focus),
// find companies with active business signals not yet in the pipeline.
//
// Signal focus options (from Growth Intelligence KB v1.0):
//   Growth, Recognition, Milestone, Activation, Leadership, Competitive, Talent
//
// Flow:
//   1. Build targeted search queries from sector + signal_focus
//   2. Scrape via Apify RAG browser + Google Search
//   3. AI extracts company names + signals using all 7 KB categories
//   4. Cross-check against existing companies in DB to filter already-tracked ones
//   5. Return ranked discovery list with signal context

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = "https://api.apify.com/v2";

// ─── Google News RSS fallback (zero config, no API key) ───────────────────────

const MARKET_RSS_PARAMS: Record<string, { hl: string; gl: string; ceid: string }> = {
  MY: { hl: "en-MY", gl: "MY", ceid: "MY:en" },
  SG: { hl: "en-SG", gl: "SG", ceid: "SG:en" },
  PH: { hl: "en-PH", gl: "PH", ceid: "PH:en" },
  TH: { hl: "th-TH", gl: "TH", ceid: "TH:th" },
  ID: { hl: "id-ID", gl: "ID", ceid: "ID:id" },
};

async function fetchMarketRss(
  sector: string,
  market: string,
  marketCode: string,
  focusKeywords: string
): Promise<string[]> {
  const { hl, gl, ceid } = MARKET_RSS_PARAMS[marketCode] ?? MARKET_RSS_PARAMS.MY;

  // Use the first 1-2 words of sector to keep queries short enough for Google News to match
  const sectorShort = sector.split(" ").slice(0, 2).join(" ");

  // Short, targeted queries — long queries return 0 results from Google News RSS
  const queries = [
    `${sectorShort} ${market} company 2026`,
    `${sectorShort} ${market} brand launch 2026`,
    `${sectorShort} ${market} award recognition 2026`,
    `${sectorShort} ${market} ${focusKeywords.split(" ").slice(0, 2).join(" ")} 2026`,
  ];

  const chunks: string[] = [];

  await Promise.allSettled(queries.map(async (q) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ShiftImpactOS/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return;
      const xml = await res.text();
      const itemRe = /<item>([\s\S]*?)<\/item>/g;
      let m: RegExpExecArray | null;
      let count = 0;
      while ((m = itemRe.exec(xml)) !== null && count < 5) {
        const block = m[1];
        const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block)?.[1] ?? /<title>(.*?)<\/title>/.exec(block)?.[1] ?? "").trim();
        const link  = (/<link>(.*?)<\/link>/.exec(block)?.[1] ?? "").trim();
        const desc  = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block)?.[1] ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 400);
        if (title && desc) {
          chunks.push(`[${title}]\nURL: ${link}\n${desc}`);
          count++;
        }
      }
    } catch { /* non-fatal */ }
  }));

  return chunks;
}

// ─── Signal focus → search keyword map ───────────────────────────────────────

const SIGNAL_FOCUS_QUERIES: Record<string, string> = {
  Growth:       "funding investment expansion partnership",
  Recognition:  "award win recognition ESG sustainability employer",
  Milestone:    "anniversary milestone achievement years customer",
  Activation:   "launch rebranding campaign event sponsorship",
  Leadership:   "appointed CEO CMO director leadership transition founder",
  Competitive:  "disruption new entrant competitor market change regulation",
  Talent:       "hiring marketing brand digital growth CMO communications vacancy",
};

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

// ─── AI extraction tool — all 7 KB signal categories ─────────────────────────

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
            signal_type:  {
              type: "string",
              enum: ["Growth", "Recognition", "Milestone", "Activation", "Leadership", "Competitive", "Talent"],
              description: "The KB signal category that best describes the business event",
            },
            signal_text:  { type: "string", description: "One-sentence description of the specific business event" },
            source_url:   { type: "string", description: "URL of the news article" },
            why_now:      {
              type: "string",
              description: "Why this company is worth approaching now — the specific tension or opportunity the signal reveals",
            },
            shiftimpact_angle: {
              type: "string",
              description: "One sentence: which ShiftImpact capability is most relevant (Brand Clarity Audit, FRAME Brief, Campaign Intelligence, Command Desk, Launch Readiness Audit)",
            },
            relevance_score: { type: "number", description: "0-100 relevance score for ShiftImpact OS positioning" },
          },
          required: ["name", "industry", "market_code", "signal_type", "signal_text", "why_now", "shiftimpact_angle", "relevance_score"],
        },
      },
    },
    required: ["companies"],
  },
};

export async function POST(req: NextRequest) {
  const supabase  = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const sector       = (body.sector       ?? "") as string;
  const market       = (body.market       ?? "Malaysia") as string;
  const marketCode   = (body.market_code  ?? "MY") as string;
  const signalFocus  = (body.signal_focus ?? "") as string; // optional

  if (!sector) {
    return NextResponse.json({ error: "sector is required" }, { status: 400 });
  }

  // Build signal-focused search keywords
  const focusKeywords = signalFocus && SIGNAL_FOCUS_QUERIES[signalFocus]
    ? SIGNAL_FOCUS_QUERIES[signalFocus]
    : "award launch expansion partnership leadership hiring";

  // 1. Scrape — run both sources in parallel
  const rawChunks: string[] = [];

  const [ragItems, gnItems] = await Promise.all([
    APIFY_TOKEN
      ? runApifyActor("apify/rag-web-browser", {
          query: `${sector} ${market} company ${focusKeywords} 2025 OR 2026`,
          maxResults: 8,
        }, 20, 8).catch((e) => { console.error("[market-discover] rag-web-browser:", e?.message); return [] as Record<string, unknown>[]; })
      : Promise.resolve([] as Record<string, unknown>[]),

    APIFY_TOKEN
      ? runApifyActor("apify/google-search-scraper", {
          queries: `${sector} ${market} brand OR company news 2026`,
          maxPagesPerQuery: 1,
          resultsPerPage: 10,
        }, 20, 10).catch((e) => { console.error("[market-discover] google-search-scraper:", e?.message); return [] as Record<string, unknown>[]; })
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

  // Fallback: Google News RSS when Apify is not configured (zero cost)
  if (rawChunks.length === 0) {
    const rssChunks = await fetchMarketRss(sector, market, marketCode, focusKeywords);
    rawChunks.push(...rssChunks);
  }

  if (rawChunks.length === 0) {
    return NextResponse.json({
      companies: [],
      warning: "No content retrieved. Try a different sector or market.",
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

  const focusInstruction = signalFocus
    ? `SIGNAL FOCUS: Prioritise companies with "${signalFocus}" signals — ${SIGNAL_FOCUS_QUERIES[signalFocus] ?? ""}. Score companies with this signal type higher.`
    : "Find the highest-fit companies across all signal types.";

  const aiResp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2500,
    tool_choice: { type: "tool", name: "extract_companies" },
    tools: [DISCOVER_TOOL],
    messages: [
      {
        role: "user",
        content: `You are the Market Discovery Engine for ShiftImpact OS — a strategic intelligence consultancy serving brands and marketing leaders in Southeast Asia.

Your job: from the news content below, identify companies in the ${sector} sector in ${market} that have ACTIVE business signals indicating they may need strategic narrative clarity, brand positioning, campaign intelligence, or communication strategy.

SIGNAL TAXONOMY (Growth Intelligence Layer KB v1.0 — use all 7 categories):
- Growth: Funding, investment, market expansion, new partnerships, physical expansion
- Recognition: Awards, ESG/sustainability recognition, employer recognition, leadership recognition
- Milestone: Heritage anniversaries, customer milestones, business achievement milestones
- Activation: Product/service launches, rebranding, corporate/industry events, sponsorships
- Leadership: Executive appointments, founder transitions, leadership visibility changes
- Competitive: Competitor launches, new entrants, category disruption, regulation changes that create openings
- Talent: Hiring campaigns for marketing/brand/digital/growth/communications roles

${focusInstruction}

SHIFTIMPACT SERVICES (match to signals):
- Brand Clarity Audit → narrative fragmentation, post-merger confusion, inconsistent messaging
- FRAME Brief → about to launch, reposition, or enter new market
- Campaign Intelligence → pre-launch spend validation, agency second opinion
- Command Desk → ongoing transformation, multi-year strategic navigation
- Launch Readiness Audit → new product or market entry

RULES:
- Only extract companies with SPECIFIC, VERIFIABLE events
- Each must have a clear "why now" — what business tension does the signal reveal?
- relevance_score: 0-100 based on fit for ShiftImpact's services
- market_code: MY, SG, PH, TH, or ID only
- Maximum 10 companies
- Do NOT include: ${Array.from(existingNames).slice(0, 30).join(", ")}

SECTOR: ${sector}
MARKET: ${market}

NEWS CONTENT:
${rawContent}`,
      },
    ],
  });

  type Discovered = {
    name: string;
    industry: string;
    market_code: string;
    signal_type: string;
    signal_text: string;
    source_url?: string;
    why_now: string;
    shiftimpact_angle: string;
    relevance_score: number;
  };

  let discovered: Discovered[] = [];

  const toolUse = aiResp.content.find(b => b.type === "tool_use");
  if (toolUse && toolUse.type === "tool_use") {
    const inp = toolUse.input as { companies: Discovered[] };
    discovered = (inp.companies ?? [])
      .filter(c => !existingNames.has(c.name.toLowerCase().trim()))
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 10);
  }

  return NextResponse.json({ companies: discovered, sources_scanned: rawChunks.length });
}
