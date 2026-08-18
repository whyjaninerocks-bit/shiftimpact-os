// app/api/signal-movement/route.ts
// Signal Movement Engine — FRAME-aware, counter-intuitive AI strategist
//
// POST /api/signal-movement
// Body: { campaign_id: string, week_number: number }
//
// Reads: signal state (4 weeks), FRAME Brief, BIP, MDH/AQS, market context,
//        campaign learning, category + market code
// Calls: Claude Sonnet — strategy-grade, not template-grade
// Returns: per-signal diagnosis + 3-horizon movement plan
//          Horizon 1 = immediate (existing assets, 0-5 days)
//          Horizon 2 = brief-ready (new production, 6-14 days) → creates Stage Brief
//          Horizon 3 = structural (phase-level, 15-30 days)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── Market intelligence — what moves each signal per market ─────────────────

const MARKET_SIGNAL_CONTEXT: Record<string, string> = {
  MY: "Malaysia: TikTok Save+Share are primary lead signals. WhatsApp dark social (referral spike) is the strongest advocacy proxy. SoS strengthens in consideration stage. Shopee Wishlist Adds are high-value commerce signals. Malay-language content earns 2-3x the save rate of English in mass-market categories.",
  SG: "Singapore: Share of Search (SoS) is the most search-mature signal in SEA — it is the primary gate signal here. Instagram Save Rate and LinkedIn Saves (B2B) follow. Consumers research heavily before acting — content that answers a specific question earns more search lift than brand awareness content.",
  PH: "Philippines: Facebook Group Mentions are the #1 organic signal — FB is effectively the internet. TikTok UGC volume and Share Rate follow. Shopee Live Commerce engagement is a high-value commerce signal. Community content outperforms polished brand content 3:1 for UGC seeding.",
  TH: "Thailand: TikTok Sound Adoption Rate is #1 for trend-led categories. LINE OA Open Rate and Forward Rate are strong CRM signals. Creative that uses Thai language wordplay or cultural idioms earns significantly higher UGC replication rates.",
  ID: "Indonesia: TikTok UGC Volume is #1 — highest organic TikTok content output in SEA. Tokopedia + Shopee Wishlist Adds are high-value commerce signals. YouTube Completion Rate matters for long-form. UGC activation cost is lowest in SEA — micro-seeding at scale is feasible.",
};

// ─── Category creative intelligence ─────────────────────────────────────────

const CATEGORY_CREATIVE_CONTEXT: Record<string, string> = {
  FMCG: "FMCG: UGC earns highest ROI through product-in-use moments in real settings (not studios). Save Rate is earned by utility content — recipes, hacks, usage tips. SoS lifts fastest through retail shelf moment content + unboxing formats. Paid search top-up has 48-hour impact on branded SoS.",
  QSR: "QSR: UGC is driven by limited-time offer scarcity and food theatre (dramatic reveals, texture shots). Save Rate is earned by menu discovery content (items people didn't know existed). SoS spikes from cultural moment tie-ins (festive meals, sports events). OOH-adjacent: geo-targeted digital near restaurant clusters.",
  Beauty: "Beauty: Save Rate is the highest-performing signal — beauty consumers save reference looks, tutorials, ingredient breakdowns. UGC is driven by transformation content and before/after formats. SoS lifts from editorial placement + dermatologist endorsement. Community content earns 4x the save rate of brand content.",
  "Personal Care": "Personal Care: Problem-solution formats earn highest save rates. UGC is driven by routine content — 'day in my life' formats featuring the product organically. SoS lifts from SEO-optimised how-to content and comparison content that ranks for category queries.",
  Fashion: "Fashion: Save Rate is the primary signal — outfit inspiration content is saved for later reference. UGC is driven by styling challenges and creator looks that are easy to replicate. SoS lifts from trend moment content tied to real-world fashion events.",
  DTC: "DTC/D2C: Save Rate is earned by value-proposition content (comparison, proof points, testimonials). UGC is driven by unboxing and first-use moments — seeding to micro-creators with authentic review mandates. SoS lifts from review-generation campaigns and brand-term SEO.",
  Default: "Cross-category: Content that answers a specific question earns more search lift than awareness content. Save Rate requires genuine utility — reformatting existing content into cheatsheet or carousel format is the fastest lever. UGC requires an easy-to-replicate creative hook, not a complex brief.",
};

function getCategoryContext(industryProfile: string | null | undefined): string {
  if (!industryProfile) return CATEGORY_CREATIVE_CONTEXT.Default;
  const key = Object.keys(CATEGORY_CREATIVE_CONTEXT).find(
    (k) => k !== "Default" && industryProfile.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CATEGORY_CREATIVE_CONTEXT[key] : CATEGORY_CREATIVE_CONTEXT.Default;
}

// ─── Signal health helper ────────────────────────────────────────────────────

type SignalStatus = "Green" | "Amber" | "Red" | "No data";

function signalStatus(actual: number | null, target: number, amber: number): SignalStatus {
  if (actual === null) return "No data";
  if (actual >= target) return "Green";
  if (actual >= amber) return "Amber";
  return "Red";
}

function signalStatusCount(actual: number | null, target: number, amber: number): SignalStatus {
  if (actual === null) return "No data";
  if (actual >= target) return "Green";
  if (actual >= amber) return "Amber";
  return "Red";
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { campaign_id, week_number } = await req.json();
    if (!campaign_id || week_number == null) {
      return NextResponse.json({ error: "campaign_id and week_number are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // ── Parallel data fetch ──────────────────────────────────────────────────
    const [
      thresholdRes,
      weeklyRes,
      frameRes,
      bipRes,
      campaignRes,
      mdhRes,
      marketCtxRes,
      learningRes,
    ] = await Promise.all([
      supabase
        .from("signal_thresholds")
        .select("*")
        .eq("campaign_id", campaign_id)
        .single(),
      supabase
        .from("signal_weekly_reports")
        .select("week_number, signal_1_actual_pct, signal_2_actual_pct, signal_2b_actual_pct, signal_3_actual_count, signal_3b_actual_pct, signal_4_actual_pct")
        .eq("campaign_id", campaign_id)
        .lte("week_number", week_number)
        .order("week_number", { ascending: false })
        .limit(4),
      supabase
        .from("frame_briefs")
        .select("force, role, anchor, mood, expression, clarity_statement, industry_category, campaign_pathway, active_channels, demand_investment_pct, lock_status")
        .eq("campaign_id", campaign_id)
        .maybeSingle(),
      supabase
        .from("big_idea_platforms")
        .select("topline_idea, brand_role, cultural_tension, propagation_mechanism, media_idea, expression_summary, lock_status")
        .eq("campaign_id", campaign_id)
        .maybeSingle(),
      supabase
        .from("campaigns")
        .select("name, current_phase, duration_weeks, industry_profile, clients(name, industry_profile)")
        .eq("id", campaign_id)
        .single(),
      supabase
        .from("signal_media_delivery")
        .select("week_number, mdh_status, avg_frequency, aqs_score, aqs_band, attention_gap_flag, attention_gap_action, quarantine_active, completion_rate_pct")
        .eq("campaign_id", campaign_id)
        .order("week_number", { ascending: false })
        .limit(2),
      supabase
        .from("signal_market_contexts")
        .select("category_search_trend, competitive_sov_change, cultural_moment_flag, cultural_moment_note, platform_algorithm_flag, macro_context_note")
        .eq("campaign_id", campaign_id)
        .eq("week_number", week_number)
        .maybeSingle(),
      supabase
        .from("campaign_learning_records")
        .select("what_worked, what_failed, anchor_recommendation")
        .eq("campaign_id", campaign_id)
        .maybeSingle(),
    ]);

    const threshold = thresholdRes.data;
    const weeklyRows = weeklyRes.data ?? [];
    const frame = frameRes.data;
    const bip = bipRes.data;
    const campaign = campaignRes.data;
    const mdhRows = mdhRes.data ?? [];
    const marketCtx = marketCtxRes.data;
    const learning = learningRes.data;

    if (!threshold) {
      return NextResponse.json({ error: "Signal thresholds not set for this campaign." }, { status: 404 });
    }
    if (weeklyRows.length === 0) {
      return NextResponse.json({ error: "No weekly signal data found. Enter signal data first." }, { status: 404 });
    }

    const current = weeklyRows[0];
    const marketCode = (threshold.market_code ?? "MY").toUpperCase();
    const industryProfile = (campaign?.clients as { industry_profile?: string } | null)?.industry_profile ?? campaign?.industry_profile ?? "";

    // ── Compute signal statuses + consecutive weeks stuck ────────────────────

    const s1Status = signalStatus(current.signal_1_actual_pct, threshold.signal_1_threshold_pct, threshold.signal_1_amber_pct);
    const s2Status = signalStatus(current.signal_2_actual_pct, threshold.signal_2_threshold_pct, threshold.signal_2_amber_pct);
    const s2bStatus = signalStatus(current.signal_2b_actual_pct, threshold.signal_2b_target_pct, threshold.signal_2b_amber_pct);
    const s3Status = signalStatusCount(current.signal_3_actual_count, threshold.signal_3_threshold_count, threshold.signal_3_amber_count);

    function consecutiveWeeksBelow(field: keyof typeof current, target: number): number {
      let count = 0;
      for (const row of weeklyRows) {
        const val = row[field] as number | null;
        if (val === null || val < target) count++;
        else break;
      }
      return count;
    }

    const s1Weeks = consecutiveWeeksBelow("signal_1_actual_pct", threshold.signal_1_threshold_pct);
    const s2Weeks = consecutiveWeeksBelow("signal_2_actual_pct", threshold.signal_2_threshold_pct);
    const s3Weeks = consecutiveWeeksBelow("signal_3_actual_count", threshold.signal_3_threshold_count);

    // Only generate movement plans for signals below Green
    const stagnantSignals: string[] = [];
    if (s1Status !== "Green") stagnantSignals.push("S1");
    if (s2Status !== "Green") stagnantSignals.push("S2");
    if (s2bStatus !== "Green") stagnantSignals.push("S2B");
    if (s3Status !== "Green") stagnantSignals.push("S3");

    if (stagnantSignals.length === 0) {
      return NextResponse.json({
        all_green: true,
        message: "All signals are at or above target. No movement plans required this week.",
        signals: [],
      });
    }

    // ── MDH / AQS context ────────────────────────────────────────────────────
    const latestMdh = mdhRows[0] ?? null;
    const mdhContext = latestMdh
      ? `MDH Status: ${latestMdh.mdh_status} | Frequency: ${latestMdh.avg_frequency?.toFixed(1) ?? "N/A"}x | Quarantine: ${latestMdh.quarantine_active ? "YES — signals quarantined" : "No"} | AQS: ${latestMdh.aqs_score ?? "N/A"} (${latestMdh.aqs_band ?? "N/A"}) | Attention Gap: ${latestMdh.attention_gap_flag ? "YES — " + (latestMdh.attention_gap_action ?? "") : "No"}`
      : "MDH: Not entered this week.";

    // ── Market context ───────────────────────────────────────────────────────
    const marketCtxLines: string[] = [];
    if (marketCtx?.category_search_trend) marketCtxLines.push(`Category search trend: ${marketCtx.category_search_trend}`);
    if (marketCtx?.competitive_sov_change) marketCtxLines.push(`Competitive SOV change: ${marketCtx.competitive_sov_change}`);
    if (marketCtx?.cultural_moment_flag) marketCtxLines.push(`Cultural moment active: YES — ${marketCtx.cultural_moment_note ?? ""}`);
    if (marketCtx?.platform_algorithm_flag) marketCtxLines.push("Platform algorithm change: YES — interpret signals with caution");
    if (marketCtx?.macro_context_note) marketCtxLines.push(`Macro context: ${marketCtx.macro_context_note}`);
    const marketCtxSection = marketCtxLines.length ? `External context:\n${marketCtxLines.join("\n")}` : "No external market context entered this week.";

    // ── Campaign phase ───────────────────────────────────────────────────────
    const durationWeeks = threshold.campaign_duration_weeks ?? 12;
    const phasePct = week_number / durationWeeks;
    const phase = phasePct <= 0.25 ? 1 : phasePct <= 0.60 ? 2 : phasePct <= 0.80 ? 3 : 4;
    const phaseLabel = ["", "Demand Build", "Nurture", "Conversion Sprint", "Optimisation"][phase];

    // ── Build signal data block for prompt ───────────────────────────────────
    const signalBlock = `
SIGNAL STATE — Week ${week_number} of ${durationWeeks} (Phase ${phase}: ${phaseLabel}, ${Math.round(phasePct * 100)}% through):

S1 — ${threshold.signal_1_label ?? "Share of Search (SoS)"}: ${s1Status}
  Actual: ${current.signal_1_actual_pct !== null ? current.signal_1_actual_pct + "%" : "Not entered"} | Target: ${threshold.signal_1_threshold_pct}%
  Consecutive weeks below target: ${s1Weeks}

S2 — ${threshold.signal_2_label ?? "Save Rate"}: ${s2Status}
  Actual: ${current.signal_2_actual_pct !== null ? current.signal_2_actual_pct + "%" : "Not entered"} | Target: ${threshold.signal_2_threshold_pct}%
  Consecutive weeks below target: ${s2Weeks}

S2B — ${threshold.signal_2b_label ?? "Share Rate"}: ${s2bStatus}
  Actual: ${current.signal_2b_actual_pct !== null ? current.signal_2b_actual_pct + "%" : "Not entered"} | Target: ${threshold.signal_2b_target_pct}%

S3 — ${threshold.signal_3_label ?? "UGC Volume"}: ${s3Status}
  Actual: ${current.signal_3_actual_count !== null ? current.signal_3_actual_count + " pieces" : "Not entered"} | Target: ${threshold.signal_3_threshold_count} pieces
  Consecutive weeks below target: ${s3Weeks}

Stagnant signals requiring movement plans: ${stagnantSignals.join(", ")}
`.trim();

    // ── FRAME + BIP context ──────────────────────────────────────────────────
    const frameBlock = frame
      ? `FRAME BRIEF (${frame.lock_status}):
Force: ${frame.force}
Role: ${frame.role}
Anchor: ${frame.anchor}
Mood: ${frame.mood}
Expression: ${frame.expression}
Clarity Statement: ${frame.clarity_statement}
Industry Category: ${frame.industry_category ?? industryProfile}
Campaign Pathway: ${frame.campaign_pathway ?? "Not specified"}
Active Channels: ${Array.isArray(frame.active_channels) ? frame.active_channels.join(", ") : "Not set"}`
      : "FRAME BRIEF: Not yet defined.";

    const bipBlock = bip
      ? `BIG IDEA PLATFORM (${bip.lock_status}):
Topline Idea: ${bip.topline_idea}
Brand Role: ${bip.brand_role}
Cultural Tension: ${bip.cultural_tension}
Propagation Mechanism: ${bip.propagation_mechanism}
Media Idea: ${bip.media_idea}
Expression Summary: ${bip.expression_summary}`
      : "BIG IDEA PLATFORM: Not yet defined.";

    const learningBlock = learning
      ? `CAMPAIGN LEARNING (from prior periods):
What worked: ${learning.what_worked ?? "None recorded"}
What failed: ${learning.what_failed ?? "None recorded"}
Anchor recommendation: ${learning.anchor_recommendation ?? "None"}`
      : "CAMPAIGN LEARNING: None recorded.";

    // ── Claude prompt ────────────────────────────────────────────────────────

    const systemPrompt = `You are the ShiftImpact Signal Movement Strategist — a senior growth intelligence advisor embedded inside the ShiftImpact OS.

Your job is to generate counter-intuitive, category-specific, market-grounded movement plans for behaviour signals that are stagnant or declining. You have deep knowledge of FMCG, QSR, Beauty, DTC, and B2B categories across Malaysia, Singapore, Philippines, Thailand, and Indonesia.

CORE PRINCIPLE: Do not recommend the obvious play. Every strategy lead already knows "make more content" or "boost existing posts." Your value is in reading the signal data alongside the brand's FRAME Brief and identifying what will actually move the needle — even if unexpected.

CRITICAL RULES:
1. Movement plans must be grounded in the brand's FRAME Brief anchor and BIP — never recommend creative that contradicts the campaign idea.
2. Honour lead times. Horizon 1 = existing asset activation only (0-5 days). Horizon 2 = new production brief (6-14 days). Horizon 3 = structural planning (15-30 days). Never promise instant production of new assets in Horizon 1.
3. If MDH shows quarantine_active = true, explicitly note that signals are quarantined and media delivery must be fixed FIRST before any signal movement brief can be effective.
4. If a signal has been stuck for 3+ consecutive weeks, it is a structural problem, not a content problem. Horizon 3 must address root cause, not incremental improvements.
5. Be specific: name the platform, name the format, name the mechanic. "Post more content" is not a recommendation.
6. Campaign phase matters — in Phase 4 (Optimisation), do not recommend Demand-stage fuel. Tag it [NEXT CAMPAIGN].
7. Consider cross-signal interactions: a Green S2 (Save Rate) can be leveraged to lift S1 (SoS) through a specific mechanic. A flat S3 with low AQS means the creative itself is the problem, not the distribution.

OUTPUT FORMAT — valid JSON only, no markdown:
{
  "signals": [
    {
      "signal_id": "S1" | "S2" | "S2B" | "S3",
      "signal_label": "string",
      "status": "Amber" | "Red",
      "weeks_stagnant": number,
      "diagnosis": "string — WHY is this signal stuck? What does the data pattern reveal about audience behaviour?",
      "horizon_1": {
        "label": "Immediate (0-5 days, existing assets only)",
        "action": "string — specific, named action using existing creative or media",
        "platform": "string",
        "mechanic": "string — how it works behaviourally",
        "expected_movement": "string — what should shift and by when"
      },
      "horizon_2": {
        "label": "Brief-ready (6-14 days, new production)",
        "format": "string — specific content format",
        "hook_direction": "string — the creative tension or angle",
        "platform": "string",
        "mechanic": "string — how the format provokes the target behaviour",
        "brief_body": "string — 2-3 sentences a creative team can act on, grounded in the FRAME anchor",
        "department": "string — Social / Creative / Performance / PR / Community"
      },
      "horizon_3": {
        "label": "Structural (15-30 days)",
        "issue": "string — root cause if 3+ weeks stuck, or phase-level planning item",
        "recommendation": "string — strategic intervention, not a content brief",
        "flag": "STRUCTURAL_PROBLEM" | "NEXT_CAMPAIGN" | "PHASE_SHIFT" | null
      }
    }
  ]
}`;

    const userPrompt = `${signalBlock}

---
MARKET: ${marketCode}
${MARKET_SIGNAL_CONTEXT[marketCode] ?? MARKET_SIGNAL_CONTEXT.MY}

CATEGORY INTELLIGENCE:
${getCategoryContext(industryProfile)}

---
${frameBlock}

---
${bipBlock}

---
MEDIA DELIVERY HEALTH:
${mdhContext}

---
${marketCtxSection}

---
${learningBlock}

---
Generate a Signal Movement Plan for the stagnant signals: ${stagnantSignals.join(", ")}.

For each signal, read the full context above — the brand's anchor, the market dynamics, the category creative intelligence, the MDH/AQS data, and any cross-signal interactions — then produce the most effective and counter-intuitive movement plan you can justify.

Return valid JSON only.`;

    const model = process.env.SIGNAL_MOVEMENT_MODEL ?? "claude-sonnet-4-5";

    const response = await anthropic.messages.create({
      model,
      max_tokens: 3000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("/api/signal-movement: Claude returned no JSON:", raw.slice(0, 200));
      return NextResponse.json({ error: "AI did not return a valid movement plan." }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      campaign_id,
      week_number,
      phase,
      phase_label: phaseLabel,
      market_code: marketCode,
      generated_at: new Date().toISOString(),
      all_green: false,
      ...parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/signal-movement error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
