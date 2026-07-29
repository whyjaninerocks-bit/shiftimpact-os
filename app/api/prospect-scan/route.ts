import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";
import { createHash } from "crypto";

export const maxDuration = 60; // seconds — Apify actors need time to run

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = "https://api.apify.com/v2";

// ─── Derive a short search name by stripping corporate suffixes ───────────────
// Rules:
//   • Strip common legal/geographic suffixes from the end
//   • But only if the result has 2+ words — single-word results are too ambiguous
//     (e.g. "Gardenia Malaysia" → strip → "Gardenia" = 1 word → keep original)
//   • "Alliance Bank Malaysia Berhad" → "Alliance Bank" (2 words ✓)
//   • "Spritzer Berhad" → "Spritzer" (1 word → keep "Spritzer Berhad")
function shortName(companyName: string): string {
  const suffixes = [
    /\s+(Malaysia|Singapore|Philippines|Thailand|Indonesia)\s+Berhad\s*$/i,
    /\s+Berhad\s*$/i,
    /\s+Sdn\.?\s+Bhd\.?\s*$/i,
    /\s+Bhd\.?\s*$/i,
    /\s+Pte\.?\s+Ltd\.?\s*$/i,
    /\s+Pte\.?\s*$/i,
    /\s+Ltd\.?\s*$/i,
    /\s+(Malaysia|Singapore|Philippines|Thailand|Indonesia)\s*$/i,
    /\s+Group\s*$/i,
  ];
  let name = companyName.trim();
  for (const re of suffixes) {
    const cleaned = name.replace(re, "").trim();
    // Only accept the stripped version if it has 2+ words (avoids ambiguous single words)
    if (cleaned.length >= 3 && cleaned.includes(" ")) { name = cleaned; break; }
  }
  return name;
}

// ─── Google News RSS — zero-config fallback (no API key needed) ───────────────
// Returns raw text chunks in the same format as Apify results.
async function fetchGoogleNewsRSS(
  companyName: string,
  marketCode: string = "MY"
): Promise<string[]> {
  const marketMap: Record<string, { hl: string; gl: string; ceid: string }> = {
    MY: { hl: "en-MY", gl: "MY", ceid: "MY:en" },
    SG: { hl: "en-SG", gl: "SG", ceid: "SG:en" },
    PH: { hl: "en-PH", gl: "PH", ceid: "PH:en" },
    TH: { hl: "th-TH", gl: "TH", ceid: "TH:th" },
    ID: { hl: "id-ID", gl: "ID", ceid: "ID:id" },
  };
  const { hl, gl, ceid } = marketMap[marketCode] ?? marketMap.MY;

  const short = shortName(companyName);
  // Use short name but add market context to avoid generic-word collisions
  // e.g. "Gardenia MY" not just "Gardenia" which hits flower/garden results
  const searchTerm = short !== companyName ? short : companyName;
  const marketSuffix = marketCode !== "MY" ? ` ${marketCode}` : " Malaysia";

  const queries = [
    `"${searchTerm}"${marketSuffix} award OR recognition OR win`,
    `"${searchTerm}"${marketSuffix} launch OR expansion OR investment OR funding`,
    `"${searchTerm}"${marketSuffix} partnership OR milestone OR appointed OR leadership`,
  ];

  const chunks: string[] = [];

  await Promise.all(queries.map(async (q) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ShiftImpactOS/1.0)" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return;
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match: RegExpExecArray | null;
      let count = 0;
      while ((match = itemRegex.exec(xml)) !== null && count < 5) {
        const item = match[1];
        const title = (
          item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
          item.match(/<title>(.*?)<\/title>/)?.[1] ?? ""
        ).trim();
        const desc = (
          item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ??
          item.match(/<description>(.*?)<\/description>/)?.[1] ?? ""
        ).replace(/<[^>]+>/g, "").trim().slice(0, 500);
        const srcUrl  = item.match(/source url="([^"]+)"/)?.[1]?.trim() ?? "";
        const srcName = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim() ?? "";
        const date    = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";

        // Accept if any meaningful word from the company name appears in the article.
        // We trust the search query (which already includes market + context) to find
        // relevant articles; the filter just removes obvious off-topic results.
        const significantWords = companyName
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 3 && !["berhad","malaysia","singapore","philippines","thailand","indonesia","group","sdn","bhd","pte","ltd"].includes(w));
        const textToCheck = (title + " " + desc).toLowerCase();
        const isRelevant = significantWords.length === 0 || significantWords.some(w => textToCheck.includes(w));
        if (title && isRelevant) {
          chunks.push(`[News RSS: ${title}]\nSource: ${srcName} (${srcUrl})\nDate: ${date}\n${desc}`);
          count++;
        }
      }
    } catch {
      // silently skip on timeout or fetch error
    }
  }));

  return chunks;
}

// ─── Apify runner ─────────────────────────────────────────────────────────────
async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 25,
  maxItems = 5
) {
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSecs}&maxItems=${maxItems}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    // Hard client-side abort — prevents hanging the Vercel function if Apify is slow
    signal: AbortSignal.timeout((timeoutSecs + 3) * 1000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify ${actorId} — ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>[]>;
}

// ─── Fingerprint ──────────────────────────────────────────────────────────────
function fingerprint(company_id: string, category: string, type: string, text: string): string {
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 300);
  return createHash("md5").update(`${company_id}::${category}::${type}::${norm}`).digest("hex");
}

// ─── Signal classification tool (Haiku) ───────────────────────────────────────
const CLASSIFY_TOOL: Anthropic.Tool = {
  name: "classify_signals",
  description: "Extract and classify business signals from raw content about a company",
  input_schema: {
    type: "object" as const,
    properties: {
      signals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            signal_category: {
              type: "string",
              enum: ["Growth","Recognition","Milestone","Activation","Leadership"],
            },
            signal_type:  { type: "string", description: "Specific sub-type e.g. 'Series A Funding', 'Award Win', 'New Product Launch'" },
            signal_text:  { type: "string", description: "One-sentence summary of the signal" },
            source_url:   { type: "string" },
            headline:     { type: "string" },
            published_at: { type: "string", description: "ISO date if available" },
            source_confidence: { type: "string", enum: ["High","Medium","Low"] },
          },
          required: ["signal_category","signal_type","signal_text","source_confidence"],
        },
      },
      company_profile_summary: {
        type: "string",
        description: "2-3 sentence summary of what this company does and its current business momentum",
      },
    },
    required: ["signals","company_profile_summary"],
  },
};

// ─── POST /api/prospect-scan ──────────────────────────────────────────────────
// Body: {
//   company_id:    uuid  (required)
//   linkedin_url?: string  (company LinkedIn page URL)
//   website?:      string  (company website)
//   search_query?: string  (override search query, default: company name)
// }
// Flow:
//   1. Pull company record
//   2. Enqueue job in ai_processing_queue
//   3. Scrape LinkedIn + web news via Apify
//   4. Classify signals via Haiku (model_prospect_scan)
//   5. Deduplicate + insert business_signals + evidence_sources
//   6. Update company profile summary + last_signal_date
//   7. Mark queue job complete
// Returns: { signals_found, signals_new, signals_duplicate, company_profile_summary, queue_id }

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { company_id } = body;
  if (!company_id) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  // 1. Fetch company
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("id,name,industry,market_code,website,linkedin_url,is_suppressed,status")
    .eq("id", company_id)
    .single();

  if (companyErr || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  if (company.is_suppressed) {
    return NextResponse.json({ error: "Company is suppressed" }, { status: 403 });
  }

  const companyName    = company.name as string;
  const companyShort   = shortName(companyName);
  const linkedinUrl    = (body.linkedin_url ?? company.linkedin_url ?? null) as string | null;
  const website        = (body.website      ?? company.website      ?? null) as string | null;
  const searchQuery    = (body.search_query ?? companyName) as string;

  // 2. Enqueue job
  const { data: queueJob } = await supabase
    .from("ai_processing_queue")
    .insert({
      queue_type:    "opportunity_scan",
      priority:      2,
      status:        "processing",
      company_id:    company_id as string,
      model_tier:    "haiku",
      input_payload: { company_id, linkedin_url: linkedinUrl, website, search_query: searchQuery },
      started_at:    new Date().toISOString(),
    })
    .select("id")
    .single();

  const queue_id = queueJob?.id ?? null;

  // 3. Scrape — ALL sources run in parallel to stay within Vercel 60s budget.
  // Each source has its own timeout. Total parallel phase = max(20, 20, 12, 20) = 20s,
  // leaving 40s for AI classification + DB writes.
  const rawChunks: string[] = [];
  const evidenceMap: Record<string, { url?: string; headline?: string; published_at?: string }> = {};

  const [liItems, newsItems, rssChunks, gnItems] = await Promise.all([
    // 1. LinkedIn company page scraper (needs Apify token; 20s)
    linkedinUrl && APIFY_TOKEN
      ? runApifyActor("anchor/linkedin-company-detail-scraper", {
          startUrls: [{ url: linkedinUrl }],
          maxResults: 1,
        }, 20, 1).catch(() => [] as Record<string, unknown>[])
      : Promise.resolve([] as Record<string, unknown>[]),

    // 2. RAG web browser — short name + market + industry for specificity (20s)
    APIFY_TOKEN
      ? runApifyActor("apify/rag-web-browser", {
          query: `"${companyShort}" ${company.market_code ?? "Malaysia"} ${company.industry ?? ""} (award OR funding OR launch OR partnership OR expansion OR recognition OR milestone OR growth) 2024 OR 2025 OR 2026`,
          maxResults: 5,
        }, 20, 5).catch(() => [] as Record<string, unknown>[])
      : Promise.resolve([] as Record<string, unknown>[]),

    // 3. Google News RSS — zero-config, always runs (12s abort inside)
    fetchGoogleNewsRSS(companyName, company.market_code as string ?? "MY"),

    // 4. Apify Google Search — runs in parallel, not as a sequential fallback (20s)
    APIFY_TOKEN
      ? runApifyActor("apify/google-search-scraper", {
          queries: `${companyShort} ${company.market_code ?? "Malaysia"} ${company.industry ?? ""} news 2024 OR 2025 OR 2026`,
          maxPagesPerQuery: 1,
          resultsPerPage: 8,
        }, 20, 8).catch(() => [] as Record<string, unknown>[])
      : Promise.resolve([] as Record<string, unknown>[]),
  ]);

  try {
    // Process LinkedIn
    if (liItems.length > 0) {
      const li = liItems[0];
      const text = [
        li.description,
        li.specialities,
        `Employees: ${li.employeeCount}`,
        `Founded: ${li.founded}`,
        li.tagline,
      ].filter(Boolean).join(" | ");
      if (text) rawChunks.push(`[LinkedIn Company Profile]\n${(text as string).slice(0, 1000)}`);
    }

    // Process Apify RAG news
    for (const item of newsItems.slice(0, 8)) {
      const text   = ((item.text || item.markdown || item.description || "") as string).slice(0, 600);
      const url    = (item.url  || item.canonicalUrl || "") as string;
      const title  = (item.title || "") as string;
      const date   = (item.date  || item.publishedAt || "") as string;
      if (text) {
        rawChunks.push(`[News: ${title}]\nURL: ${url}\nDate: ${date}\n${text}`);
        evidenceMap[title] = { url, headline: title, published_at: date || undefined };
      }
    }

    // Add Google News RSS chunks
    rawChunks.push(...rssChunks);

    // Process Google Search results
    // Apify google-search-scraper returns "description" not "snippet"
    for (const r of gnItems.slice(0, 8)) {
      const title   = (r.title || "") as string;
      const text    = (r.description || r.snippet || r.text || "") as string; // handle all field name variants
      const url     = (r.url || r.link || "") as string;
      if (text) {
        rawChunks.push(`[Search Result: ${title}]\nURL: ${url}\n${text}`);
        evidenceMap[title] = { url, headline: title };
      }
    }
  } catch (scrapeErr) {
    console.error("[prospect-scan] scrape error:", scrapeErr);
  }

  if (rawChunks.length === 0) {
    // Mark queue as failed, return gracefully
    if (queue_id) {
      await supabase.from("ai_processing_queue").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_log: [{ ts: new Date().toISOString(), msg: "No content retrieved from scrapers", apify_configured: !!APIFY_TOKEN }],
      }).eq("id", queue_id);
    }
    return NextResponse.json({
      signals_found: 0,
      signals_new: 0,
      signals_duplicate: 0,
      company_profile_summary: "",
      queue_id,
      apify_configured: !!APIFY_TOKEN,
      warning: APIFY_TOKEN
        ? "No content retrieved from public sources. Company may have limited online presence."
        : "No content retrieved. APIFY_API_TOKEN is not configured in environment. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  // 4. Classify via Haiku
  const model = await getModel("model_prospect_scan", "claude-haiku-4-5-20251001");
  const rawContent = rawChunks.join("\n\n---\n\n").slice(0, 12000);

  let classifiedSignals: Array<{
    signal_category: string;
    signal_type: string;
    signal_text: string;
    source_url?: string;
    headline?: string;
    published_at?: string;
    source_confidence: string;
  }> = [];
  let companyProfileSummary = "";
  let tokensUsed = 0;

  try {
    const aiResp = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      tool_choice: { type: "tool", name: "classify_signals" },
      tools: [CLASSIFY_TOOL],
      messages: [
        {
          role: "user",
          content: `You are the Growth Intelligence Layer™ of ShiftImpact OS, a strategic intelligence consultancy in Southeast Asia.

Your job is NOT to record company activity. Your job is to identify BUSINESS MOMENTS — specific events that indicate a company may be entering a period where stronger decisions, clearer narratives, better communication or strategic alignment could create business value.

For every signal you detect, apply the 5-question intelligence model:
1. What happened? (the specific event)
2. Why does this matter now? (strategic importance)
3. What tension may exist? (hidden challenge behind the event)
4. What opportunity exists? (potential strategic intervention)
5. Which ShiftImpact capability applies?

SIGNAL TAXONOMY — classify using these categories:
- Growth: Funding, investment, market expansion, physical expansion, new partnerships
- Recognition: Awards, ESG/sustainability recognition, employer recognition, leadership recognition
- Milestone: Heritage anniversaries, customer milestones, business achievement milestones
- Activation: Product/service launches, rebranding, corporate/industry events, sponsorships
- Leadership: Executive appointments, founder transitions, leadership visibility changes

RULES:
- Only extract signals that are SPECIFIC, REAL, OBSERVABLE events — not generic marketing copy
- Ignore evergreen website content, boilerplate PR phrases, generic social posts
- signal_text must be a factual one-sentence description of the specific event
- source_confidence: High = named source + date + specific details; Medium = referenced but vague; Low = inferred
- If content mentions "${companyName}" winning an award, record it even if no date is given

COMPANY: "${companyName}" — Industry: ${company.industry}, Market: ${company.market_code}

RAW CONTENT:
${rawContent}`,
        },
      ],
    });

    tokensUsed = (aiResp.usage?.input_tokens ?? 0) + (aiResp.usage?.output_tokens ?? 0);

    const toolUse = aiResp.content.find((b) => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      const inp = toolUse.input as { signals: typeof classifiedSignals; company_profile_summary: string };
      classifiedSignals      = inp.signals ?? [];
      companyProfileSummary  = inp.company_profile_summary ?? "";
    }
  } catch (aiErr) {
    console.error("[prospect-scan] AI classification error:", aiErr);
  }

  // 5. Deduplicate + insert signals
  let signals_new = 0;
  let signals_duplicate = 0;

  for (const sig of classifiedSignals) {
    const fp = fingerprint(company_id as string, sig.signal_category, sig.signal_type, sig.signal_text);

    // Check duplicate
    const { data: existing } = await supabase
      .from("business_signals")
      .select("id")
      .eq("signal_fingerprint", fp)
      .maybeSingle();

    if (existing) { signals_duplicate++; continue; }

    // Insert signal
    const { data: inserted, error: insertErr } = await supabase
      .from("business_signals")
      .insert({
        company_id:        company_id as string,
        signal_category:   sig.signal_category,
        signal_type:       sig.signal_type,
        signal_text:       sig.signal_text,
        source_url:        sig.source_url   ?? null,
        signal_fingerprint: fp,
        raw_evidence:      { source_url: sig.source_url, headline: sig.headline },
      })
      .select("id")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") { signals_duplicate++; continue; }
      console.error("[prospect-scan] signal insert error:", insertErr.message);
      continue;
    }

    signals_new++;

    // Attach evidence source
    if (inserted && sig.source_url) {
      try {
        await supabase.from("evidence_sources").insert({
          signal_id:           inserted.id,
          source_type:         "news",
          url:                 sig.source_url,
          headline:            sig.headline   ?? null,
          published_at:        sig.published_at ?? null,
          source_confidence:   sig.source_confidence,
          verification_status: "Unverified",
        });
      } catch { /* non-fatal — signal still recorded */ }
    }
  }

  // 6. Update company profile + last_signal_date
  const companyUpdate: Record<string, unknown> = {};
  if (companyProfileSummary) companyUpdate.company_profile_summary = companyProfileSummary;
  if (signals_new > 0)       companyUpdate.last_signal_date = new Date().toISOString();
  if (Object.keys(companyUpdate).length > 0) {
    await supabase.from("companies").update(companyUpdate).eq("id", company_id as string);
  }

  // 7. Mark queue complete
  const estimatedCost = tokensUsed > 0
    ? Number(((tokensUsed / 1_000_000) * 0.25).toFixed(6))  // Haiku ~$0.25/M tokens
    : null;

  if (queue_id) {
    await supabase.from("ai_processing_queue").update({
      status:        "complete",
      model_used:    model,
      tokens_used:   tokensUsed || null,
      estimated_cost: estimatedCost,
      completed_at:  new Date().toISOString(),
      output_payload: {
        signals_found:     classifiedSignals.length,
        signals_new,
        signals_duplicate,
        company_profile_summary: companyProfileSummary,
      },
    }).eq("id", queue_id);
  }

  return NextResponse.json({
    signals_found:           classifiedSignals.length,
    signals_new,
    signals_duplicate,
    company_profile_summary: companyProfileSummary,
    apify_configured:        !!APIFY_TOKEN,
    queue_id,
  });
}
