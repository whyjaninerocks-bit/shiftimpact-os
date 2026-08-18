// app/api/portal-chat/route.ts
// LLM-backed portal Q&A — pulls live campaign signal data from Supabase,
// passes it to Claude as structured context, streams a data-defensible answer.
//
// Three-tier response logic baked into system prompt:
//   Tier 1 — Fact/data defense: any question about what a number is or means → answer from data
//   Tier 2 — Interpretation with caveats: answer + flag what context would change it
//   Tier 3 — Escalation: strategic/decision questions → data summary + [ESCALATE: reason]
//
// [ESCALATE: ...] token in response triggers /api/portal-notify (auto email to strategist).

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModel } from "@/lib/ai-model";

export const runtime = "nodejs";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchCampaignContext(campaignId: string) {
  const supabase = createAdminClient();

  const [
    campaignRes,
    signalRes,
    gatesRes,
    kolRes,
    reportRes,
    frameBriefRes,
    teamMemberRes,
  ] = await Promise.all([
    // Campaign overview
    supabase
      .from("campaigns_with_overview")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle(),

    // All weekly signal readings, newest first
    supabase
      .from("signal_weekly_reports")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("week_number", { ascending: false })
      .limit(12),

    // Phase gates
    supabase
      .from("campaign_phase_gates")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("gate_number", { ascending: true }),

    // KOL trackers
    supabase
      .from("kol_trackers")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true }),

    // Latest published report
    supabase
      .from("campaign_reports")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // FRAME brief
    supabase
      .from("frame_briefs")
      .select("frame_anchor, clarity_statement, active_channels, ics_weighted_total, ics_threshold, frame_lock_status")
      .eq("campaign_id", campaignId)
      .maybeSingle(),

    // Assigned team member (for escalation email)
    supabase
      .from("campaigns_with_overview")
      .select("team_member_id, team_member_name")
      .eq("id", campaignId)
      .maybeSingle(),
  ]);

  // Fetch team member email separately if we have an ID
  let strategistEmail: string | null = null;
  let strategistName: string | null = teamMemberRes.data?.team_member_name ?? null;
  const teamMemberId = teamMemberRes.data?.team_member_id;

  if (teamMemberId) {
    const { data: tm } = await supabase
      .from("team_members")
      .select("name, email")
      .eq("id", teamMemberId)
      .maybeSingle();
    if (tm) {
      strategistEmail = tm.email ?? null;
      strategistName = tm.name ?? strategistName;
    }
  }

  return {
    campaign: campaignRes.data,
    signals: signalRes.data ?? [],
    gates: gatesRes.data ?? [],
    kols: kolRes.data ?? [],
    report: reportRes.data,
    frame: frameBriefRes.data,
    strategistName,
    strategistEmail,
  };
}

// ─── Context block builder ────────────────────────────────────────────────────
// Converts raw DB data into a structured, LLM-readable context block.
// Every number the LLM uses to defend answers comes from here.

function buildContextBlock(ctx: Awaited<ReturnType<typeof fetchCampaignContext>>): string {
  const { campaign, signals, gates, kols, report, frame } = ctx;

  const lines: string[] = [];

  // Campaign identity
  lines.push("=== CAMPAIGN ===");
  if (campaign) {
    lines.push(`Client: ${campaign.client_name ?? "—"}`);
    lines.push(`Campaign: ${campaign.name}`);
    lines.push(`Industry: ${campaign.industry_profile ?? "—"}`);
    lines.push(`Current phase: ${campaign.current_phase}`);
    lines.push(`Gate signal status: ${campaign.gate_signal_status}`);
    lines.push(`Confidence score: ${Math.round(campaign.confidence_score ?? 0)}/100`);
    lines.push(`Business outcome: ${campaign.business_outcome_label ?? "—"} — actual ${campaign.business_outcome_actual ?? "not yet connected"} / target ${campaign.business_outcome_target ?? "—"}`);
    lines.push(`Retention metric: ${campaign.retention_metric_label ?? "—"} — actual ${campaign.retention_metric_actual ?? "not yet connected"} / target ${campaign.retention_metric_target ?? "—"}`);
    lines.push(`ICS threshold: ${campaign.ics_threshold ?? "—"}`);
  }

  // FRAME brief
  lines.push("\n=== FRAME BRIEF ===");
  if (frame) {
    lines.push(`Anchor (The One Idea): ${frame.frame_anchor ?? "—"}`);
    lines.push(`Clarity statement: ${frame.clarity_statement ?? "—"}`);
    lines.push(`Active channels: ${(frame.active_channels ?? []).join(", ") || "—"}`);
    lines.push(`ICS score: ${frame.ics_weighted_total ?? "—"} (threshold: ${frame.ics_threshold ?? "—"})`);
    lines.push(`Brief status: ${frame.frame_lock_status ?? "—"}`);
  } else {
    lines.push("No FRAME brief found.");
  }

  // Signal weekly history
  lines.push("\n=== SIGNAL WEEKLY HISTORY (newest first) ===");
  lines.push("Columns: Week | S1 SoS% | S2 Save% | S2B Share% | S3 UGC count | S3B VCR% | Health | Gate status | WA Echo | Auto-sourced");
  if (signals.length === 0) {
    lines.push("No signal data recorded yet.");
  } else {
    for (const s of signals) {
      const auto = [s.signal_1_auto && "S1", s.signal_3_auto && "S3"].filter(Boolean).join(",") || "manual";
      lines.push(
        `Week ${s.week_number}: ` +
        `S1=${s.signal_1_actual_pct ?? "—"}% | ` +
        `S2=${s.signal_2_actual_pct ?? "—"}% | ` +
        `S2B=${s.signal_2b_actual_pct ?? "—"}% | ` +
        `S3=${s.signal_3_actual_count ?? "—"} posts | ` +
        `S3B=${s.signal_3b_actual_pct ?? "—"}% | ` +
        `Health=${s.health_score ?? "—"} | ` +
        `Gate=${s.gate_signal_status ?? "—"} | ` +
        `WA Echo=${s.wa_echo_event ? "YES" : "no"} | ` +
        `Source=${auto}`
      );
    }
  }

  // Gate thresholds
  lines.push("\n=== PHASE GATES ===");
  if (gates.length === 0) {
    lines.push("No phase gates configured.");
  } else {
    for (const g of gates) {
      lines.push(
        `Gate ${g.gate_number} (${g.gate_name ?? "—"}): ` +
        `status=${g.gate_decision ?? "Pending"} | ` +
        `signal=${g.primary_signal ?? "—"} | ` +
        `threshold=${g.threshold_value ?? "—"} | ` +
        `current=${g.current_value ?? "—"} | ` +
        `hold_days=${g.hold_days_required ?? "—"}`
      );
    }
  }

  // KOL performance
  lines.push("\n=== KOL PROGRAMME ===");
  if (kols.length === 0) {
    lines.push("No KOL data recorded.");
  } else {
    for (const k of kols) {
      lines.push(
        `${k.name} | ${k.platform} | ${k.tier} | ` +
        `followers=${k.follower_count ?? "—"} | ` +
        `brief_status=${k.brief_status} | ` +
        `note=${k.performance_note ?? "—"}`
      );
    }
  }

  // Latest report predictions
  lines.push("\n=== LATEST REPORT ===");
  if (report) {
    lines.push(`Week: ${report.week_number ?? "—"}`);
    lines.push(`Published: ${report.published_at ?? report.created_at}`);
    if (report.predictions_locked) {
      lines.push(`Locked predictions: ${JSON.stringify(report.predictions_locked)}`);
    }
    if (report.verified_predictions) {
      lines.push(`Verified predictions: ${JSON.stringify(report.verified_predictions)}`);
    }
    if (report.compliance_score != null) {
      lines.push(`Brief compliance score: ${report.compliance_score}%`);
    }
  } else {
    lines.push("No published report yet.");
  }

  return lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  campaignName: string,
  clientName: string,
  strategistName: string | null
): string {
  const strategist = strategistName ?? "your ShiftImpact OS strategist";

  return `You are the ShiftImpact OS campaign intelligence assistant embedded in the client portal for "${campaignName}" (${clientName}).

CRITICAL RULE — READ THIS FIRST:
If the client question asks you to make or recommend a decision — "Should we...?", "Do you recommend...?", "What should we do?", "Is it worth...?", or any question where the answer requires a judgment call rather than reading from the data — you MUST end your response with this exact token on its own line:
[ESCALATE: reason why this needs the strategist]

Do not omit this token for any decision question. The token must appear verbatim, including the square brackets.

Example of a question that MUST end with [ESCALATE:]:
Question: "Should we shift budget from mid-tier to micro KOLs?"
Response: "The data shows micro-KOLs are outperforming on save rate (7.4% vs 5.4% for mid-tier), but whether to reallocate budget depends on the full media plan, contract commitments, and timing context that sits outside the OS. Here is what the OS data tells us: ... [data summary] ... [ESCALATE: budget reallocation decision requires review of media plan and KOL contracts with the strategist]"

---

YOUR ROLE:
- Defend data: explain what every signal number means, where it comes from, and whether it is on track
- Build cohesive narrative: no signal exists in isolation — connect the signal to the broader campaign picture
- Caveat: flag when a question requires data not in the dataset or when external context would change the interpretation
- Escalate: any decision or recommendation question goes to the strategist — the OS gives the data, the strategist makes the call

NOT YOUR ROLE:
- Making creative, budget, or strategic decisions
- Recommending specific actions (that is the strategist's job)
- Interpreting factors outside the OS dataset

---

SIGNAL CASCADE — read and connect signals in this order:
S2 Save Rate → S3 UGC Volume → S1 Share of Search → Revenue / Business Outcome → Gate Status → Phase Timing

---

RESPONSE RULES:

1. DIRECT ANSWER FIRST — cite the specific number from the data.
2. SIGNAL CHAIN CONTEXT — connect to the cascade: what does this signal mean for the next one in the chain?
3. ON-TRACK VERDICT — state clearly: ahead of expectation / on track / behind.
4. CAVEAT WHEN INCOMPLETE — if external data would change the interpretation, say so explicitly.
5. ESCALATION — for any decision question, end with [ESCALATE: specific reason].

---

WHEN TO ESCALATE (add [ESCALATE:] token):
- Any "should we" / "do you recommend" / "what should we do" question
- Any budget, timing, or creative direction decision
- Any request for strategic analysis or competitive interpretation

WHEN NOT TO ESCALATE:
- Factual questions about what a number means
- Questions about signal definitions or thresholds
- Questions about historical trajectory shown in the data

---

TONE: Precise, direct, plain language. Cite numbers not generalities. Most answers: 3–5 short paragraphs.`;
}

// ─── Demo context (hardcoded Cooks campaign for /portal/demo testing) ─────────

function buildDemoContextBlock(): string {
  return `=== CAMPAIGN ===
Client: Cooks Malaysia
Campaign: Jadikan Caramu (Make It Yours)
Industry: FMCG — Food & Beverage
Current phase: Phase 1 (Demand)
Gate signal status: Amber — approaching threshold
Confidence score: 74/100
Business outcome: Revenue Lift — actual +12.4% / target +20% by end of Phase 1
Retention metric: Repeat Purchase Rate (60-day) — actual 18% / target 25%
ICS threshold: CONDITIONAL (score 76, category avg 67)

=== FRAME BRIEF ===
Anchor (The One Idea): Jadikan Caramu — Make It Yours
Clarity statement: Make Cooks paste the brand that Malaysians associate with their own version of every recipe — not the shortcut brand, but the enabling brand.
Active channels: TikTok, Instagram Reels, Meta Feed, KOL Programme
ICS score: 76 (threshold: CONDITIONAL)
Brief status: Locked

=== SIGNAL WEEKLY HISTORY (newest first) ===
Columns: Week | S1 SoS% | S2 Save% | S2B Share% | S3 UGC count | Health | Gate status | WA Echo
Week 6: S1=14.2% | S2=6.1% | S2B=4.8% | S3=28 posts (72% authenticity) | Health=74 | Gate=Amber | WA Echo=no
Week 5: S1=13.8% | S2=5.7% | S2B=4.4% | S3=22 posts (69% authenticity) | Health=71 | Gate=Amber | WA Echo=no
Week 4: S1=12.9% | S2=5.3% | S2B=3.9% | S3=19 posts (65% authenticity) | Health=67 | Gate=Amber | WA Echo=no
Week 3: S1=12.1% | S2=4.8% | S2B=3.4% | S3=14 posts (61% authenticity) | Health=62 | Gate=Red | WA Echo=no
Week 2: S1=11.4% | S2=4.2% | S2B=2.8% | S3=9 posts (54% authenticity) | Health=58 | Gate=Red | WA Echo=no
Week 1: S1=10.8% | S2=3.6% | S2B=2.1% | S3=5 posts (48% authenticity) | Health=52 | Gate=Red | WA Echo=no

Gate thresholds: S2 Save Rate ≥ 8% held for 3 consecutive days | S1 SoS ≥ 18% | S3 UGC authenticity ≥ 65%
S2 is 1.9pp below gate. S1 is 3.8pp below gate. S3 authenticity has crossed the gate threshold this week.
Save rate growth rate: +0.4pp per week (current pace) → gate fires Week 10–11 without creative change.
With recipe-led brief actioned this week: expected acceleration to +0.6–0.8pp/week → gate fires Week 7–8.

=== PHASE GATES ===
Gate 1 (Phase 2 Unlock — Conversion): Pending | signal=S2 Save Rate | threshold=8% | current=6.1% | hold_days=3
Gate 2 (Phase 3 Unlock — Retention & Scale): Locked until Gate 1 opens

=== KOL PROGRAMME ===
@masakdenganaishah | TikTok | Micro-tier | followers=82,000 | save_rate=8.4% | budget_share=14% | brief_status=Active
@eatwithzafran | TikTok | Micro-tier | followers=61,000 | save_rate=7.1% | budget_share=13% | brief_status=Active
@dapurrumahkuofficial | TikTok | Micro-tier | followers=45,000 | save_rate=6.8% | budget_share=11% | brief_status=Active
Mid-tier KOL A | TikTok+Instagram | Mid-tier | followers=310,000 | save_rate=5.6% | budget_share=35% | brief_status=Active | ROAS below 1.0x
Mid-tier KOL B | Instagram | Mid-tier | followers=280,000 | save_rate=5.2% | budget_share=27% | brief_status=Active | ROAS below 1.0x

Micro-KOL average: 7.4% save rate, 38% of KOL budget.
Mid-tier KOL average: 5.4% save rate (below gate threshold), 62% of KOL budget.
Mid-tier KOL is in red on Media ROI — consuming 62% of KOL budget while producing below-gate save rates.

=== LATEST REPORT ===
Week: 6
Report: Week 6 Campaign Intelligence Report — Brand posture: GAINING (2 consecutive weeks)
Creative battery: Meta Feed lifestyle content 24% (2 weeks to fatigue), TikTok recipe formats 82% (no fatigue risk), aggregate 46%
ICS score: 76 — CONDITIONAL flag on executional consistency (not expressed uniformly across formats)
Competitor benchmarks: MAGGI 81, Cooks 76, Knorr 74, Adabi 59
Brief compliance score (Week 5): 78%
Locked predictions (Week 6): Save rate reaches 6.5–6.7% by Week 7 if brief actioned | Gate fires Week 7–8 at 48% probability | UGC crosses 32 posts/week by Week 7
Prior predictions (Weeks 1–5): All 5 verified within stated range — 100% accuracy this campaign
Merdeka window: 31 August — elevated reach for recipe content anchored to Malaysian heritage dishes (2-week window, closes end of August)
TikTok algorithm: currently giving recipe-format videos 1.4x distribution vs lifestyle content

=== STRATEGIST ===
Assigned: Janine Wai — ShiftImpact OS Lead Strategist`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id, question, demo } = body as {
      campaign_id?: string;
      question: string;
      demo?: boolean;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "question required" }, { status: 400 });
    }

    // Demo mode — uses hardcoded Cooks context, no DB fetch
    if (demo) {
      const contextBlock = buildDemoContextBlock();
      const model = await getModel("model_portal_chat", "claude-haiku-4-5-20251001");
      const systemPrompt = buildSystemPrompt("Jadikan Caramu", "Cooks Malaysia", "Janine Wai");
      return streamResponse({ contextBlock, systemPrompt, model, question, campaignId: "demo", campaignName: "Jadikan Caramu", clientName: "Cooks Malaysia" });
    }

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const [ctx, model] = await Promise.all([
      fetchCampaignContext(campaign_id),
      getModel("model_portal_chat", "claude-haiku-4-5-20251001"),
    ]);

    if (!ctx.campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaignName = ctx.campaign.name;
    const clientName = ctx.campaign.client_name ?? "Client";
    const contextBlock = buildContextBlock(ctx);
    const systemPrompt = buildSystemPrompt(campaignName, clientName, ctx.strategistName);

    return streamResponse({ contextBlock, systemPrompt, model, question, campaignId: campaign_id, campaignName, clientName });
  } catch (err) {
    console.error("[portal-chat] route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Shared streaming helper ──────────────────────────────────────────────────
// Escalation detection is returned via response header — the CLIENT is responsible
// for asking the user to confirm before calling /api/portal-notify.

async function streamResponse({
  contextBlock,
  systemPrompt,
  model,
  question,
  campaignId,
  campaignName,
  clientName,
}: {
  contextBlock: string;
  systemPrompt: string;
  model: string;
  question: string;
  campaignId: string;
  campaignName: string;
  clientName: string;
}) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // We need to capture the full response to extract escalation reason,
  // then stream it. Use a TransformStream to do both simultaneously.
  let fullResponse = "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await anthropic.messages.stream({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Here is the current campaign data:\n\n${contextBlock}\n\n---\n\nClient question (answer in plain text, no markdown headers):\n${question}`,
            },
          ],
        });

        // Append the question as the last line so it's clear
        // (already in the prompt above — just stream the response)
        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // Detect escalation — pass metadata back via a sentinel line the client strips
        // Use [\s\S]+? to match across newlines in case Claude wraps the reason
        const escalateMatch = fullResponse.match(/\[ESCALATE:\s*([\s\S]+?)\]/i);
        console.log("[portal-chat] escalate detected:", !!escalateMatch, escalateMatch?.[1]?.slice(0, 80));
        if (escalateMatch) {
          const reason = escalateMatch[1].trim();
          // Append a structured sentinel the client reads and removes from display
          const sentinel = `\n\n[__ESCALATE_META__${JSON.stringify({ reason, campaign_id: campaignId, campaign_name: campaignName, client_name: clientName })}]`;
          controller.enqueue(encoder.encode(sentinel));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            "I wasn't able to retrieve the campaign data right now. Please try again or contact your strategist directly."
          )
        );
        console.error("[portal-chat] stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
