import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReviewContext, type CampaignReviewContext } from "@/lib/review";
import { validateOwnedFieldUpdate } from "@/lib/reviewFields";
import type { OsRule } from "@/lib/types";

export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const REVIEW_TOOL = {
  name: "submit_campaign_review",
  description:
    "Submit updated values for the 5 Claude-owned campaign fields. Omit any field whose value should not change this week.",
  input_schema: {
    type: "object" as const,
    properties: {
      current_phase: {
        type: "string",
        enum: ["Demand", "Conversion", "Retention", "Complete"],
        description: "Only advance if the prerequisite phase gate is Open and the next stage brief is Live.",
      },
      confidence_score: { type: "number", minimum: 0, maximum: 100 },
      gate_signal_status: { type: "string", enum: ["Pending", "On Track", "At Risk", "Blocked"] },
      operating_notes: { type: "string", description: "Replacement text for the operating notes field." },
      last_review_date: { type: "string", description: "ISO date for today, e.g. 2026-06-15." },
      summary: { type: "string", description: "One-sentence summary of what changed and why, for the run report." },
    },
    additionalProperties: false,
  },
};

function buildPrompt(ctx: CampaignReviewContext, reviewRule: OsRule | null, today: string): string {
  const { campaign, stage_briefs, phase_gates, kill_switches, dashboards, business_outcomes } = ctx;

  return `${reviewRule?.description ?? "Run the weekly campaign review."}

Today's date: ${today}

CAMPAIGN
${JSON.stringify(
  {
    name: campaign.name,
    client: campaign.client_name,
    industry_profile: campaign.industry_profile,
    status: campaign.status,
    current_phase: campaign.current_phase,
    confidence_score: campaign.confidence_score,
    gate_signal_status: campaign.gate_signal_status,
    operating_notes: campaign.operating_notes,
    last_review_date: campaign.last_review_date,
    ics_threshold: campaign.ics_threshold,
    clarity_statement: campaign.clarity_statement,
  },
  null,
  2,
)}

STAGE BRIEFS
${JSON.stringify(stage_briefs, null, 2)}

PHASE GATES
${JSON.stringify(phase_gates, null, 2)}

KILL SWITCHES
${JSON.stringify(kill_switches, null, 2)}

RECENT WEEKLY DASHBOARDS (most recent first)
${JSON.stringify(dashboards.slice(0, 4), null, 2)}

BUSINESS OUTCOMES LOG (most recent first)
${JSON.stringify(business_outcomes.slice(0, 4), null, 2)}

Decide updated values for current_phase, confidence_score, gate_signal_status, operating_notes,
and last_review_date based on the data above. Only advance current_phase if the prerequisite
phase gate's gate_decision is "Open" and the next stage's brief status is "Live". Use kill switch
trigger_status and dashboard funnel_health/RAG colors to set gate_signal_status (any "Triggered"
kill switch or "Red" funnel health should push toward "Blocked" or "At Risk"). Use business
outcomes vs targets to inform confidence_score. Write operating_notes as a short summary of
current state and what changed. Set last_review_date to ${today}. Do not modify any other field.
Call submit_campaign_review with only the fields that should change (plus a one-sentence summary).`;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return unauthorized();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const context = await buildReviewContext();
  const anthropic = new Anthropic({ apiKey });
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const results = [];

  for (const campaignContext of context.campaigns) {
    const { campaign } = campaignContext;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "submit_campaign_review" },
      messages: [{ role: "user", content: buildPrompt(campaignContext, context.review_rule, today) }],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      results.push({ campaign_id: campaign.id, name: campaign.name, status: "error", error: "No tool call returned." });
      continue;
    }

    const input = toolUse.input as Record<string, unknown>;
    const { summary, ...fields } = input;
    if (!("last_review_date" in fields)) fields.last_review_date = today;

    const validation = validateOwnedFieldUpdate(fields);
    if (!validation.ok) {
      results.push({ campaign_id: campaign.id, name: campaign.name, status: "error", error: validation.error });
      continue;
    }

    const { error } = await supabase.from("campaigns").update(validation.update).eq("id", campaign.id);
    if (error) {
      results.push({ campaign_id: campaign.id, name: campaign.name, status: "error", error: error.message });
      continue;
    }

    results.push({
      campaign_id: campaign.id,
      name: campaign.name,
      status: "updated",
      changes: validation.update,
      summary: typeof summary === "string" ? summary : undefined,
    });
  }

  return NextResponse.json({ reviewed_at: context.generated_at, results });
}
