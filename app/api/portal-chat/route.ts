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

YOUR ROLE:
- Defend data: explain what every signal number in this report means, where it comes from, and whether it is on track or off track
- Build cohesive narrative: no signal exists in isolation — always connect the signal asked about to the broader campaign picture
- Caveat: flag when a question requires data not in the dataset, or when external context would change the interpretation
- Escalate: route strategic decisions and deeper analysis to the human strategist

NOT YOUR ROLE:
- Making creative, budget, or strategic decisions
- Interpreting factors outside the OS dataset (agency execution quality, pricing changes, distribution shifts, competitor activity)
- Providing investment or business advice beyond what the signal data supports

---

SIGNAL CASCADE — always read and connect signals in this order:
S2 Save Rate → S3 UGC Volume → S1 Share of Search → Revenue / Business Outcome → Gate Status → Phase Timing

A signal ahead of its position in the cascade is a leading indicator of what comes next.
A signal stalling behind its cascade position is a warning that the next signal will not fire.

---

RESPONSE RULES — apply every rule to every answer:

1. DIRECT ANSWER FIRST: Open with the direct answer to what was asked. Cite the specific number from the campaign data.

2. SIGNAL CHAIN CONTEXT: After the direct answer, connect it to the signal cascade. Example: if asked about save rate, also explain what this means for the gate, the UGC trajectory, and the business outcome.

3. ON-TRACK VERDICT: State clearly whether the signal is ahead of expectation, on track, or behind — don't leave it for the client to infer.

4. CAVEAT WHEN INCOMPLETE: If answering the question fully requires data not in the dataset (e.g. GA4 direct traffic, actual sales figures, agency spend data), say so clearly: "This interpretation is incomplete without [X]. If [X] shows [condition], it would change this reading because [reason]."

5. COHESIVE NARRATIVE: Connect the answer to the campaign's primary objective and gate. Every answer should end with a thread that leads back to: is the campaign on track to open the next gate?

6. ESCALATION: If the question requires strategic judgment, creative direction, budget decisions, or interpretation requiring knowledge outside the OS data — provide what the data supports, then end with:
[ESCALATE: {specific reason this needs strategist judgment, e.g. "budget reallocation decision requires review of media plan context not in OS"}]

This token triggers an automatic notification to ${strategist}.

---

ESCALATION TRIGGER CONDITIONS — escalate when the question is:
- "Should we change / do / switch / move...?" (any decision question)
- "What do you recommend?" or "What should we do?"
- "Is this campaign working?" (requires business context beyond signals)
- Requests for deeper competitive, creative, or strategic analysis
- Any question that requires comparing to context not tracked in the OS

DO NOT escalate for: factual questions about signal definitions, threshold explanations, what a number means, historical trajectory, or what the data shows.

---

CAVEAT TRIGGERS — always add a caveat when:
- A signal reading would be interpreted differently with external context (e.g. a promotion running this week would inflate save rate independently of campaign performance)
- The dataset is missing a key connected signal (save rate without UGC data, revenue lift without sales data connected)
- The question asks about future performance — state the conditions under which the projection holds

---

TONE:
- Precise and direct — cite numbers, not general statements
- Professional but plain — no jargon the client would not recognise
- Honest about what the data can and cannot tell us
- Never alarming — present risk as context, not crisis

Keep responses concise. Most answers should be 3–5 short paragraphs. Longer only when the question spans multiple signals.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id, question } = body as {
      campaign_id: string;
      question: string;
    };

    if (!campaign_id || !question?.trim()) {
      return NextResponse.json({ error: "campaign_id and question required" }, { status: 400 });
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

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    // Stream response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullResponse = "";

        try {
          const stream = await anthropic.messages.stream({
            model,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: `Here is the current campaign data:\n\n${contextBlock}\n\n---\n\nClient question: ${question}`,
              },
            ],
          });

          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const text = chunk.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // Detect escalation and notify strategist (fire and forget)
          const escalateMatch = fullResponse.match(/\[ESCALATE:\s*([^\]]+)\]/);
          if (escalateMatch && ctx.strategistEmail) {
            const reason = escalateMatch[1].trim();
            const notifyUrl = `${req.nextUrl.origin}/api/portal-notify`;

            fetch(notifyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campaign_id,
                campaign_name: campaignName,
                client_name: clientName,
                client_question: question,
                widget_response: fullResponse.replace(/\[ESCALATE:[^\]]+\]/, "").trim(),
                escalation_reason: reason,
                strategist_email: ctx.strategistEmail,
                strategist_name: ctx.strategistName,
                portal_url: `${req.nextUrl.origin}/portal/${campaign_id}`,
              }),
            }).catch((e) => console.error("[portal-chat] notify fetch failed:", e));
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
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Campaign-Id": campaign_id,
        "X-Strategist": ctx.strategistName ?? "",
      },
    });
  } catch (err) {
    console.error("[portal-chat] route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
