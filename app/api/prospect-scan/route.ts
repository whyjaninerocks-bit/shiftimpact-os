import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";
import { createHash } from "crypto";

export const maxDuration = 60; // seconds — Apify actors need time to run

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = "https://api.apify.com/v2";

// ─── Apify runner ─────────────────────────────────────────────────────────────
async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 60,
  maxItems = 20
) {
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSecs}&maxItems=${maxItems}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
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

  // 3. Scrape — parallel: LinkedIn company + web news
  const rawChunks: string[] = [];
  const evidenceMap: Record<string, { url?: string; headline?: string; published_at?: string }> = {};

  try {
    // LinkedIn company page scraper
    if (linkedinUrl) {
      const liItems = await runApifyActor("anchor/linkedin-company-detail-scraper", {
        startUrls: [{ url: linkedinUrl }],
        maxResults: 1,
      }, 60, 1).catch(() => []);

      if (liItems.length > 0) {
        const li = liItems[0];
        const text = [
          li.description,
          li.specialities,
          `Employees: ${li.employeeCount}`,
          `Founded: ${li.founded}`,
          li.tagline,
        ].filter(Boolean).join(" | ");
        if (text) rawChunks.push(`[LinkedIn Company Profile]\n${text.slice(0, 1000)}`);
      }
    }

    // Web news — RAG web browser actor
    const newsItems = await runApifyActor("apify/rag-web-browser", {
      query: `"${searchQuery}" (award OR funding OR launch OR partnership OR expansion OR recognition OR milestone OR growth) Malaysia OR Singapore 2024 OR 2025 OR 2026`,
      maxResults: 8,
    }, 60, 8).catch(() => []);

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

    // Also try Google News via web search if no results
    if (rawChunks.length < 2) {
      const gnItems = await runApifyActor("apify/google-search-scraper", {
        queries: `${searchQuery} company news 2025 OR 2026`,
        maxPagesPerQuery: 1,
        resultsPerPage: 10,
      }, 45, 10).catch(() => []);

      for (const r of gnItems.slice(0, 8)) {
        const title   = (r.title   || "") as string;
        const snippet = (r.snippet || "") as string;
        const url     = (r.url     || "") as string;
        if (snippet) {
          rawChunks.push(`[Search Result: ${title}]\nURL: ${url}\n${snippet}`);
          evidenceMap[title] = { url, headline: title };
        }
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
        error_log: [{ ts: new Date().toISOString(), msg: "No content retrieved from scrapers" }],
      }).eq("id", queue_id);
    }
    return NextResponse.json({
      signals_found: 0,
      signals_new: 0,
      signals_duplicate: 0,
      company_profile_summary: "",
      queue_id,
      warning: "No content retrieved from public sources",
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
          content: `You are analysing public information about the company "${companyName}" (${company.industry}, ${company.market_code}).

Extract every meaningful business signal from the content below. A signal is a real, observable event that indicates business momentum — funding, awards, partnerships, product launches, leadership changes, market expansion, brand recognition.

Ignore generic marketing copy, evergreen website content, and social posts with no specific event.

For each signal:
- signal_category: Growth | Recognition | Milestone | Activation | Leadership
- signal_type: specific sub-type (e.g. "Series A Funding", "Industry Award", "Market Expansion")
- signal_text: one factual sentence describing the specific event
- source_confidence: High (named source, date, specific amount) | Medium (referenced but vague) | Low (inferred)

Also write a company_profile_summary: 2-3 sentences on what this company does and its current business trajectory.

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
      await supabase.from("evidence_sources").insert({
        signal_id:           inserted.id,
        source_type:         "news",
        url:                 sig.source_url,
        headline:            sig.headline   ?? null,
        published_at:        sig.published_at ?? null,
        source_confidence:   sig.source_confidence,
        verification_status: "Unverified",
      }).catch(() => {});
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
    queue_id,
  });
}
