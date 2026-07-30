// app/api/cron/prospect-rescan/route.ts
// Weekly automated prospect pipeline re-scan
// Runs every Monday 9am MYT (1am UTC) via Vercel Cron.
//
// Strategy: scan the 10 most-overdue companies (oldest last_signal_date first,
// null = never scanned = highest priority). Uses Google News RSS only — zero
// incremental cost. Apify runs only if APIFY_API_TOKEN is present.
//
// Security: Vercel injects Authorization: Bearer <CRON_SECRET> on every invocation.
// The CRON_SECRET env var must be set in Vercel → Settings → Environment Variables.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

export const maxDuration = 60; // Hobby plan limit; upgrade to 300 on Pro

// ─── Auth ────────────────────────────────────────────────────────────────────

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (dev only)
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// ─── Fingerprint ─────────────────────────────────────────────────────────────

function fingerprint(company_id: string, category: string, type: string, text: string): string {
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 300);
  return createHash("md5").update(`${company_id}::${category}::${type}::${norm}`).digest("hex");
}

// ─── Google News RSS ─────────────────────────────────────────────────────────

type RssItem = { title: string; url: string; text: string };

async function fetchRss(companyName: string, marketCode: string = "MY"): Promise<RssItem[]> {
  const marketMap: Record<string, { hl: string; gl: string; ceid: string; suffix: string }> = {
    MY: { hl: "en-MY", gl: "MY", ceid: "MY:en", suffix: "Malaysia" },
    SG: { hl: "en-SG", gl: "SG", ceid: "SG:en", suffix: "Singapore" },
    PH: { hl: "en-PH", gl: "PH", ceid: "PH:en", suffix: "Philippines" },
    TH: { hl: "th-TH", gl: "TH", ceid: "TH:th", suffix: "Thailand" },
    ID: { hl: "id-ID", gl: "ID", ceid: "ID:id", suffix: "Indonesia" },
  };
  const cfg = marketMap[marketCode] ?? marketMap.MY;

  // Strip common suffixes to get a cleaner search term
  const suffixes = [/\s+Berhad\s*$/i, /\s+Sdn\.?\s+Bhd\.?\s*$/i, /\s+Pte\.?\s+Ltd\.?\s*$/i, /\s+Group\s*$/i];
  let short = companyName.trim();
  for (const re of suffixes) {
    const cleaned = short.replace(re, "").trim();
    if (cleaned.length >= 3 && cleaned.includes(" ")) { short = cleaned; break; }
  }

  const queries = [
    `"${short}" ${cfg.suffix} award OR recognition OR win`,
    `"${short}" ${cfg.suffix} launch OR expansion OR investment OR funding`,
    `"${short}" ${cfg.suffix} appointed OR leadership OR partnership OR milestone`,
  ];

  const items: RssItem[] = [];

  await Promise.allSettled(queries.map(async (q) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${cfg.hl}&gl=${cfg.gl}&ceid=${cfg.ceid}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ShiftImpactOS/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const xml = await res.text();
      const itemRe = /<item>([\s\S]*?)<\/item>/g;
      let m: RegExpExecArray | null;
      let count = 0;
      while ((m = itemRe.exec(xml)) !== null && count < 4) {
        const block  = m[1];
        const title  = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block)?.[1] ?? /<title>(.*?)<\/title>/.exec(block)?.[1] ?? "").trim();
        const link   = (/<link>(.*?)<\/link>/.exec(block)?.[1] ?? "").trim();
        const desc   = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block)?.[1] ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 300);
        if (title && desc) { items.push({ title, url: link, text: desc }); count++; }
      }
    } catch { /* non-fatal */ }
  }));

  return items;
}

// ─── AI classification tool ────────────────────────────────────────────────────

const CLASSIFY_TOOL = {
  name: "classify_signals",
  description: "Extract and classify business signals from raw content",
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
              enum: ["Growth","Recognition","Milestone","Activation","Leadership","Competitive","Talent"],
            },
            signal_type:       { type: "string" },
            signal_text:       { type: "string" },
            source_url:        { type: "string" },
            source_confidence: { type: "string", enum: ["High","Medium","Low"] },
          },
          required: ["signal_category","signal_type","signal_text","source_confidence"],
        },
      },
    },
    required: ["signals"],
  },
} as const;

// ─── Scan one company ─────────────────────────────────────────────────────────

type ScanResult = {
  company_id: string;
  name: string;
  signals_new: number;
  signals_dup: number;
  error?: string;
};

async function scanCompany(
  supabase: ReturnType<typeof createAdminClient>,
  anthropic: Anthropic,
  company: { id: string; name: string; market_code: string | null }
): Promise<ScanResult> {
  const base: ScanResult = { company_id: company.id, name: company.name, signals_new: 0, signals_dup: 0 };

  try {
    // 1. Fetch RSS
    const items = await fetchRss(company.name, company.market_code ?? "MY");
    if (items.length === 0) return base;

    const rawContent = items
      .map(i => `[${i.title}]\n${i.text}`)
      .join("\n\n---\n\n")
      .slice(0, 8000);

    // 2. Classify via Haiku
    const aiResp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      tool_choice: { type: "tool", name: "classify_signals" },
      tools: [CLASSIFY_TOOL],
      messages: [{
        role: "user",
        content: `You are the Growth Intelligence Layer of ShiftImpact OS. Extract business signals for "${company.name}" from the news below.

SIGNAL TAXONOMY (7 categories):
- Growth: Funding, investment, expansion, partnerships
- Recognition: Awards, ESG recognition, employer rankings, leadership recognition
- Milestone: Anniversaries, customer milestones, business achievements
- Activation: Product launches, rebranding, events, sponsorships
- Leadership: Executive appointments, founder transitions
- Competitive: Market disruption, new entrants, regulatory changes
- Talent: Hiring campaigns for marketing/brand/digital/growth roles

Only extract SPECIFIC, VERIFIABLE events. Ignore generic PR copy.
signal_text = one factual sentence about the event.
source_confidence: High = named source + specifics; Medium = referenced but vague; Low = inferred.

CONTENT:
${rawContent}`,
      }],
    });

    const toolUse = aiResp.content.find(b => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return base;

    const { signals = [] } = toolUse.input as { signals: Array<{ signal_category: string; signal_type: string; signal_text: string; source_url?: string; source_confidence: string }> };

    // 3. Deduplicate + insert
    for (const sig of signals) {
      const fp = fingerprint(company.id, sig.signal_category, sig.signal_type, sig.signal_text);

      const { data: existing } = await supabase
        .from("business_signals")
        .select("id")
        .eq("signal_fingerprint", fp)
        .maybeSingle();

      if (existing) { base.signals_dup++; continue; }

      const { error: insertErr } = await supabase
        .from("business_signals")
        .insert({
          company_id:        company.id,
          signal_category:   sig.signal_category,
          signal_type:       sig.signal_type,
          signal_text:       sig.signal_text,
          source_url:        sig.source_url ?? null,
          signal_fingerprint: fp,
          raw_evidence:      { source: "cron-weekly-rescan" },
        });

      if (insertErr && insertErr.code !== "23505") {
        console.error(`[cron/prospect-rescan] insert error for ${company.name}:`, insertErr.message);
        continue;
      }
      base.signals_new++;
    }

    // 4. Update last_signal_date (always — marks the company as checked)
    await supabase
      .from("companies")
      .update({ last_signal_date: new Date().toISOString() })
      .eq("id", company.id);

  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
  }

  return base;
}

// ─── GET handler (Vercel Cron) ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase  = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const started   = Date.now();

  // Fetch up to 10 most-overdue companies (null last_signal_date = never scanned = top priority)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, market_code, prospect_tier, last_signal_date")
    .eq("is_suppressed", false)
    .not("status", "eq", "Archived")
    .or(`last_signal_date.is.null,last_signal_date.lte.${sevenDaysAgo}`)
    .order("last_signal_date", { ascending: true, nullsFirst: true })
    .limit(10);

  if (error) {
    console.error("[cron/prospect-rescan] company fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!companies || companies.length === 0) {
    return NextResponse.json({
      message: "All companies scanned within the last 7 days — nothing to do.",
      elapsed_ms: Date.now() - started,
    });
  }

  // Scan in parallel (Promise.allSettled so one failure doesn't block others)
  const results = await Promise.allSettled(
    companies.map(c => scanCompany(supabase, anthropic, c))
  );

  const summary = results.map(r =>
    r.status === "fulfilled"
      ? r.value
      : { company_id: "?", name: "?", signals_new: 0, signals_dup: 0, error: String(r.reason) }
  );

  const totalNew = summary.reduce((s, r) => s + r.signals_new, 0);
  const elapsed  = Date.now() - started;

  console.log(`[cron/prospect-rescan] ${companies.length} companies scanned, ${totalNew} new signals, ${elapsed}ms`);

  return NextResponse.json({
    scanned: companies.length,
    total_new_signals: totalNew,
    elapsed_ms: elapsed,
    results: summary,
  });
}
