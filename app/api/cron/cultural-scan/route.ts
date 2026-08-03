// app/api/cron/cultural-scan/route.ts
// Weekly automated cultural signal extraction — Layer 1 (free sources only).
// Runs every Monday 2am UTC (10am MYT) via Vercel Cron, after prospect-rescan.
//
// SIGNAL PHILOSOPHY — MID TO LONG TERM ONLY:
// This scanner deliberately ignores viral/hype signals. It looks for structural
// shifts in consumer behaviour, language, or community values that have been
// building for months and will remain relevant for 12-24 months. Anything
// driven by a specific news event, celebrity, or viral moment is discarded.
//
// Sources (Layer 1 — zero incremental cost):
//   - Google News RSS: consumer behaviour analysis + lifestyle shift queries (MY/SG)
//   - Reddit r/malaysia: monthly top posts — recurring themes only
//
// Layer 2 (TikTok/Instagram/Twitter via Apify) — add after 2-week calibration.
//
// Security: Vercel injects Authorization: Bearer <CRON_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";

export const maxDuration = 60;

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// ─── Google News RSS fetcher ──────────────────────────────────────────────────
// Using analysis/feature queries — NOT breaking news. The content must reflect
// observed consumer behaviour, not a one-day event.

type Article = { title: string; snippet: string; source: string };

async function fetchCulturalArticles(): Promise<Article[]> {
  const queries = [
    // Behavioural shifts
    "Malaysian consumers behaviour change 2024 2025",
    "Gen Z millennials Malaysia attitude spending habits",
    "Southeast Asia consumer behaviour trend analysis",
    // Linguistic / cultural identity
    "Malaysian language expression culture identity",
    "Bahasa Malaysia slang everyday speech",
    // Category-level shifts
    "Malaysia FMCG shopping habits brand loyalty",
    "Malaysia financial behaviour savings debt young adults",
    "Malaysia food culture dining habits change",
    "Malaysia health wellness consumer shift",
    "Malaysia digital lifestyle habits",
    // Singapore / SEA overlap
    "Singapore consumer behaviour cultural shift",
    "Southeast Asia Gen Z values brand expectations",
  ];

  const articles: Article[] = [];

  for (const q of queries) {
    try {
      const encoded = encodeURIComponent(q);
      const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-MY&gl=MY&ceid=MY:en`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ShiftImpactOS/1.0)" },
      });
      if (!res.ok) continue;

      const xml = await res.text();

      // Parse <item> blocks
      const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const match of itemMatches) {
        const block = match[1];
        const title   = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? block.match(/<title>(.*?)<\/title>/))?.[1]?.trim() ?? "";
        const desc    = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ?? block.match(/<description>(.*?)<\/description>/))?.[1]
          ?.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim() ?? "";
        const source  = (block.match(/<source[^>]*>(.*?)<\/source>/))?.[1]?.trim() ?? "";

        if (title && title.length > 20) {
          articles.push({ title, snippet: desc.slice(0, 300), source });
        }
        if (articles.length >= 80) break;
      }
    } catch {
      // RSS fetch timeout or parse error — skip and continue
    }
    if (articles.length >= 80) break;
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  return articles.filter(a => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Load existing signal names for de-duplication ───────────────────────────

async function getExistingSignalNames(supabase: ReturnType<typeof createAdminClient>): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("cultural_signals")
      .select("signal_name")
      .neq("status", "archived");
    return (data ?? []).map(r => r.signal_name.toLowerCase());
  } catch {
    return [];
  }
}

// ─── Claude extraction ────────────────────────────────────────────────────────

type ExtractedSignal = {
  signal_name: string;
  signal_type: "behavioural" | "linguistic" | "ritual" | "community";
  evidence: string;
  why_it_matters: string;
  is_generic: boolean;
  relevant_industries: string[];
};

const INDUSTRY_OPTIONS = [
  "FMCG", "Financial Services", "Technology", "Retail", "QSR",
  "Healthcare", "Property", "Education", "Insurance", "Automotive",
  "Hospitality", "Media & Entertainment", "Telco", "E-Commerce", "B2B SaaS",
];

async function extractSignals(
  articles: Article[],
  existingNames: string[],
  anthropic: Anthropic,
  model: string,
): Promise<ExtractedSignal[]> {

  if (articles.length === 0) return [];

  const articleText = articles
    .slice(0, 40)
    .map((a, i) => `[${i + 1}] ${a.title}\n${a.snippet ? `"${a.snippet}"` : ""}\nSource: ${a.source}`)
    .join("\n\n");

  const existingList = existingNames.length > 0
    ? `\nALREADY LOGGED (do NOT repeat these):\n${existingNames.slice(0, 30).join(", ")}`
    : "";

  const prompt = `You are extracting MID-TO-LONG TERM cultural signals for ShiftImpact OS, a growth intelligence platform for Malaysian and Southeast Asian brands.

Your job is to identify enduring shifts in consumer behaviour, language, community values, and cultural rituals — signals that Malaysian/SEA brand teams can act on over the next 12–24 months.

ARTICLES THIS WEEK:
${articleText}
${existingList}

━━ CRITICAL FILTER — READ BEFORE EXTRACTING ━━

ONLY extract signals that are STRUCTURAL AND ENDURING:
✓ A behavioural shift that has been building for 6+ months (e.g. "Malaysians now research prices across 3 platforms before any purchase above RM50")
✓ A linguistic pattern embedded in everyday speech (e.g. "cincai lah" as shorthand for decision fatigue)
✓ A ritual or habit that has become routine (e.g. "splitting bills via DuitNow QR has replaced cash-rounding negotiations entirely")
✓ A community value that is solidifying across age groups (e.g. "shame around visible debt is shifting — young adults openly discuss BNPL use")

IMMEDIATELY DISCARD — do not log:
✗ Anything triggered by a single news event, political moment, or celebrity
✗ Viral TikTok/social media trends without behavioral depth
✗ Seasonal or one-off observations (unless they reflect a recurring cultural pattern)
✗ Anything where the evidence is just "it's trending this week"
✗ Signals you cannot explain with a concrete, observable behaviour or quoted pattern
✗ Signals already in the ALREADY LOGGED list above

SIGNAL TYPES:
- behavioural: what people are doing differently (purchases, searches, routines)
- linguistic: words, phrases, expressions now in common use
- ritual: repeated practices around food, money, relationships, digital life
- community: values or identities crystallising within a group

For each signal, assess:
- is_generic: true if it applies to ANY Malaysian/SEA consumer brand; false if industry-specific
- relevant_industries: which sectors from this list: ${INDUSTRY_OPTIONS.join(", ")}

━━ OUTPUT FORMAT ━━

Return a JSON array. Return ONLY the array, no markdown, no explanation.
If you find fewer than 3 strong signals, return fewer — quality over quantity.
Maximum 5 signals per run.

[
  {
    "signal_name": "Short memorable label (max 8 words)",
    "signal_type": "behavioural|linguistic|ritual|community",
    "evidence": "Concrete, specific observation with quoted language or data if available. 2-3 sentences. This must be the actual observable evidence, not an assertion.",
    "why_it_matters": "Why a brand team should care. What it opens up or what it closes off. 1-2 sentences.",
    "is_generic": true,
    "relevant_industries": ["FMCG", "Retail"]
  }
]`;

  try {
    const msg = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const clean = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean) as ExtractedSignal[];

    // Validate each signal
    return (Array.isArray(parsed) ? parsed : []).filter(s =>
      s.signal_name?.trim() &&
      ["behavioural", "linguistic", "ritual", "community"].includes(s.signal_type) &&
      s.evidence?.trim() &&
      s.why_it_matters?.trim() &&
      // De-dupe check
      !existingNames.some(e => e.includes(s.signal_name.toLowerCase().slice(0, 20)))
    ).slice(0, 5);

  } catch {
    return [];
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = await getModel("model_cultural_scan", "claude-haiku-4-5-20251001");

  const log: string[] = [];
  let saved = 0;

  try {
    // 1. Fetch articles
    log.push("Fetching cultural articles from Google News RSS...");
    const articles = await fetchCulturalArticles();
    log.push(`Fetched ${articles.length} articles`);

    // 2. Load existing signal names (for de-dupe)
    const existingNames = await getExistingSignalNames(supabase);
    log.push(`${existingNames.length} existing signals loaded for de-duplication`);

    // 3. Extract signals via Claude
    log.push("Running Claude extraction (mid/long-term filter active)...");
    const signals = await extractSignals(articles, existingNames, anthropic, model);
    log.push(`${signals.length} signals passed the mid/long-term filter`);

    // 4. Save each signal
    for (const sig of signals) {
      const row = {
        signal_name:        sig.signal_name.trim(),
        signal_type:        sig.signal_type,
        source_description: "Weekly cultural scan — Google News RSS (MY/SG consumer behaviour queries)",
        evidence:           sig.evidence.trim(),
        why_it_matters:     sig.why_it_matters.trim(),
        is_trending:        false, // deliberately false — we want mid/long-term, not trending
        geographic_scope:   "MY",
        is_generic:         sig.is_generic,
        relevant_industries: (sig.relevant_industries ?? []).filter(
          (i: string) => INDUSTRY_OPTIONS.includes(i)
        ),
        status:             "logged",
      };

      const { error } = await supabase.from("cultural_signals").insert(row);
      if (error) {
        log.push(`Save error for "${sig.signal_name}": ${error.message}`);
      } else {
        saved++;
        log.push(`Saved: "${sig.signal_name}" [${sig.signal_type}${sig.is_generic ? ", generic" : ""}]`);
      }
    }

    log.push(`Done. ${saved} new cultural signals added.`);

    return NextResponse.json({
      ok: true,
      articles_fetched: articles.length,
      signals_extracted: signals.length,
      signals_saved: saved,
      log,
    });

  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      log,
    }, { status: 500 });
  }
}
