// POST /api/signal-sources/seed
// Seeds the 13 standard signal sources for a client that has none yet.
// Called from SignalSourcesSection when the client was created before auto-seeding was in place.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_SIGNAL_SOURCES = [
  { source_name: "TikTok Save Rate",                   source_type: "social",        unit: "%",     description: "Hero content saves as % of views — primary Demand signal" },
  { source_name: "TikTok Share Rate",                  source_type: "social",        unit: "%",     description: "Shares as % of views — secondary virality signal" },
  { source_name: "Google Search Intent",               source_type: "behavioral",    unit: "%",     description: "Search volume lift vs baseline for category/brand terms" },
  { source_name: "Google Search Console (Branded)",    source_type: "behavioral",    unit: "%",     description: "Branded search volume movement from Google Search Console" },
  { source_name: "Meta ROAS",                          source_type: "quantitative",  unit: "x",     description: "Return on ad spend from Meta campaigns" },
  { source_name: "TikTok Shop CTR",                    source_type: "quantitative",  unit: "%",     description: "Click-through rate on TikTok Shop product links" },
  { source_name: "TikTok Shop CVR",                    source_type: "quantitative",  unit: "%",     description: "Conversion rate on TikTok Shop (clicks to purchase)" },
  { source_name: "Cart Abandonment Rate",              source_type: "quantitative",  unit: "%",     description: "Shopping cart abandonment rate — lower is better" },
  { source_name: "Repeat Purchase Rate (60-day)",      source_type: "quantitative",  unit: "%",     description: "Customers who repurchased within 60 days" },
  { source_name: "Organic UGC Volume",                 source_type: "social",        unit: "#",     description: "Volume of organic user-generated content mentioning brand" },
  { source_name: "NPS Score",                          source_type: "qualitative",   unit: "score", description: "Net Promoter Score from post-purchase survey" },
  { source_name: "In-Store Footfall Lift",             source_type: "behavioral",    unit: "%",     description: "Store footfall lift vs baseline period" },
  { source_name: "Loyalty App Opens",                  source_type: "behavioral",    unit: "%",     description: "Loyalty app open rate during campaign period" },
];

export async function POST(req: NextRequest) {
  try {
    const { client_id } = await req.json();
    if (!client_id) {
      return NextResponse.json({ error: "client_id required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if sources already exist (idempotent)
    const { data: existing } = await supabase
      .from("client_signal_sources")
      .select("id")
      .eq("client_id", client_id)
      .limit(1);

    if (existing && existing.length > 0) {
      // Already seeded — return current sources
      const { data: all } = await supabase
        .from("client_signal_sources")
        .select("*")
        .eq("client_id", client_id)
        .order("source_name");
      return NextResponse.json({ sources: all ?? [] });
    }

    const { data, error } = await supabase
      .from("client_signal_sources")
      .insert(DEFAULT_SIGNAL_SOURCES.map(src => ({ client_id, ...src })))
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sources: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
