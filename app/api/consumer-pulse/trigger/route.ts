// app/api/consumer-pulse/trigger/route.ts
// Feature 34 — Consumer Intelligence Layer (Sprint 12)
// INTERNAL ONLY — never called from /brief/[id] or any client-facing route.
//
// POST /api/consumer-pulse/trigger
// Body: { campaign_id, trigger_type?, cultural_context?, industry_category? }
//
// Calls 3 Apify actors in parallel (TikTok trending MY, Google Trends MY,
// The Star Malaysia headlines). Synthesises consumer context via Claude Haiku.
// Saves snapshot to consumer_intelligence_snapshots.
//
// Actors run via run-sync-get-dataset-items (synchronous, returns results directly).
// maxItems kept small to stay within Vercel Pro 60s function timeout.
//
// Auth: service role (Supabase JWT). No client exposure.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai-model";

export const maxDuration = 60; // Vercel Pro — 60s function timeout

// ─── Supabase admin client ───────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Apify ──────────────────────────────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE  = "https://api.apify.com/v2";

// Run an Apify actor synchronously and return dataset items.
// Returns null on failure — caller handles gracefully.
async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 45,
  maxItems = 20
): Promise<unknown[] | null> {
  if (!APIFY_TOKEN) return null;
  try {
    const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items`
      + `?token=${APIFY_TOKEN}&timeout=${timeoutSecs}&maxItems=${maxItems}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// ─── Category → search keyword mapping ──────────────────────────────────────
// Maps FRAME brief industry_category values to meaningful Google Trends terms

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "FMCG":            ["FMCG Malaysia", "consumer goods Malaysia", "supermarket Malaysia"],
  "Personal Care":   ["skincare Malaysia", "beauty products Malaysia", "personal care Malaysia"],
  "Food & Beverage": ["food delivery Malaysia", "F&B Malaysia", "restaurant Malaysia"],
  "Telco":           ["mobile plan Malaysia", "5G Malaysia", "telco Malaysia"],
  "Retail":          ["online shopping Malaysia", "e-commerce Malaysia", "retail Malaysia"],
  "Health":          ["health supplement Malaysia", "wellness Malaysia", "pharmacy Malaysia"],
  "Automotive":      ["car Malaysia", "EV Malaysia", "test drive Malaysia"],
  "Finance":         ["insurance Malaysia", "bank Malaysia", "investment Malaysia"],
  "Property":        ["property Malaysia", "home loan Malaysia", "housing Malaysia"],
};

function getCategoryKeywords(industry_category?: string): string[] {
  if (!industry_category) return ["Malaysia consumer", "shopping Malaysia"];
  for (const [key, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (industry_category.toLowerCase().includes(key.toLowerCase())) return keywords;
  }
  return [`${industry_category} Malaysia`, "Malaysia consumer", "brand Malaysia"];
}

// ─── Apify pulls ─────────────────────────────────────────────────────────────

async function pullTikTokTrending(): Promise<unknown[] | null> {
  return runApifyActor(
    "khadinakbar~tiktok-trending-hashtags-scraper",
    { country: "MY", maxItems: 20 },
    40,
    20
  );
}

async function pullGoogleTrends(industry_category?: string): Promise<unknown[] | null> {
  const searchTerms = getCategoryKeywords(industry_category);
  return runApifyActor(
    "apify~google-trends-scraper",
    {
      searchTerms,
      geo: "MY",
      timeRange: "now 7-d",
      outputAsJson: true,
    },
    40,
    20
  );
}

async function pullTheStarNews(): Promise<unknown[] | null> {
  return runApifyActor(
    "xtracto~thestar-scraper",
    { maxItems: 8 },
    35,
    8
  );
}

// ─── AI synthesis ─────────────────────────────────────────────────────────────

function buildSynthesisPrompt(
  cultural_context: string | undefined,
  industry_category: string | undefined,
  tiktok: unknown[] | null,
  googleTrends: unknown[] | null,
  thestar: unknown[] | null
): string {
  const tiktokSummary = tiktok && tiktok.length > 0
    ? `TikTok Malaysia trending: ${JSON.stringify(tiktok.slice(0, 10))}`
    : "TikTok data: not available this pull.";

  const trendsSummary = googleTrends && googleTrends.length > 0
    ? `Google Trends MY: ${JSON.stringify(googleTrends.slice(0, 10))}`
    : "Google Trends: not available this pull.";

  const newsSummary = thestar && thestar.length > 0
    ? `The Star Malaysia recent headlines: ${JSON.stringify(thestar.slice(0, 6))}`
    : "The Star news: not available this pull.";

  return `You are a senior strategic planner at a Malaysian marketing consultancy.
You have just pulled live consumer intelligence data for a campaign brief.

Campaign context:
- Industry/Category: ${industry_category ?? "Not specified"}
- Target cultural context: ${cultural_context ?? "Pan-Malaysian"}

Live data pulled right now:
${tiktokSummary}

${trendsSummary}

${newsSummary}

Write a concise consumer intelligence summary (4–6 sentences) that:
1. Identifies what Malaysian consumers are currently engaging with, searching for, or talking about that is relevant to this category
2. Notes any cultural moments, trends or tensions visible in the data
3. Flags one implication for the brand's brief or campaign positioning

Write in plain, direct language. No bullet points. No headers. Do not mention tool names or data sources by name — synthesise the signals into a coherent picture of where the Malaysian consumer's head is right now.`;
}

async function synthesiseWithClaude(prompt: string): Promise<string> {
  // Model read from os_settings DB — change from /settings UI, no redeploy needed.
  // Falls back to CONSUMER_PULSE_MODEL env var, then to Haiku default.
  const model = await getModel(
    "model_consumer_pulse",
    "claude-haiku-4-5-20251001",
    "CONSUMER_PULSE_MODEL"
  );
  const client = new Anthropic();
  const response = await client.messages.create({
    model,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

// ─── Route handler ────────────────────────────────────────────────────────────

interface TriggerRequest {
  campaign_id: string;
  trigger_type?: "manual" | "campaign_start" | "campaign_end";
  cultural_context?: string;
  industry_category?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: TriggerRequest = await req.json();
    const {
      campaign_id,
      trigger_type = "manual",
      cultural_context,
      industry_category,
    } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Run all three Apify actors in parallel — failures are non-fatal
    const [tiktok, googleTrends, thestar] = await Promise.all([
      pullTikTokTrending(),
      pullGoogleTrends(industry_category),
      pullTheStarNews(),
    ]);

    const anyDataReturned = tiktok || googleTrends || thestar;

    // 2. AI synthesis (skip if all actors failed — no data to synthesise)
    let ai_synthesis = "";
    let error_detail: string | null = null;

    if (anyDataReturned) {
      try {
        const prompt = buildSynthesisPrompt(
          cultural_context,
          industry_category,
          tiktok,
          googleTrends,
          thestar
        );
        ai_synthesis = await synthesiseWithClaude(prompt);
      } catch (err) {
        // Synthesis failure is non-fatal — store raw data without synthesis
        error_detail = `AI synthesis failed: ${String(err).slice(0, 200)}`;
      }
    } else {
      error_detail = "All Apify actors returned no data. Check APIFY_API_TOKEN env var.";
    }

    // 3. Save snapshot
    const { data: snapshot, error: saveErr } = await supabase
      .from("consumer_intelligence_snapshots")
      .insert({
        campaign_id,
        trigger_type,
        status: anyDataReturned ? "complete" : "error",
        cultural_context: cultural_context ?? null,
        industry_category: industry_category ?? null,
        tiktok_trends: tiktok ?? null,
        google_trends: googleTrends ?? null,
        thestar_news: thestar ?? null,
        ai_synthesis: ai_synthesis || null,
        error_detail,
      })
      .select()
      .single();

    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    return NextResponse.json(
      { error: String(err).slice(0, 300) },
      { status: 500 }
    );
  }
}
