// lib/growth-sprint/diagnose.ts
// Growth Sprint AI Call 1 — Diagnosis + Growth Moments + Opportunity Ranking.
//
// Answers: "What opportunity deserves attention?"
//
// This is the FIRST of exactly two AI calls. No third call, no separate
// agents per dimension — the diagnostician/occasion-strategist/opportunity-
// analyst framing from the original PRD is folded into one prompt here,
// not split into three requests.
//
// Business context (commerce/experience/service) is used ONLY as optional
// illustrative few-shot guidance when the operator has set it — the model
// is explicitly instructed not to force a classification or fit the
// business into a template it doesn't match.

import Anthropic from "@anthropic-ai/sdk";
import { getModel } from "@/lib/ai-model";
import { GROWTH_SPRINT_TEMPLATES } from "./templates";
import type {
  BusinessContext,
  DiagnosisOutput,
  EvidenceTags,
  GrowthMoment,
} from "./types";

interface DiagnoseInput {
  business_name: string;
  business_location: string | null;
  business_context: BusinessContext | null;
  target_customer: string | null;
  growth_question: string;
  desired_outcome: string | null;
  current_obstacle: string | null;
  constraints_notes: string | null;
  revenue_pillars: string[];
  growth_moments: GrowthMoment[];
  evidence_tags: EvidenceTags;
}

function buildPrompt(input: DiagnoseInput): string {
  const template =
    input.business_context && input.business_context !== "custom"
      ? GROWTH_SPRINT_TEMPLATES[input.business_context]
      : null;

  const momentLines = input.growth_moments
    .map((m) => {
      const tag = input.evidence_tags[m.id];
      const confidence = tag?.confidence ?? "Missing";
      const note = tag?.note ? ` (${tag.note})` : "";
      return `- [${m.id}] Customer: ${m.customer} | Situation: ${m.situation} | Trigger: ${m.trigger} | Need: ${m.need} | Behaviour: ${m.behaviour} | Commercial response: ${m.commercial_response} | Evidence: ${confidence}${note}`;
    })
    .join("\n");

  return `You are helping a ShiftImpact operator run a Growth Sprint — a focused, 10-15 minute session that identifies the ONE growth opportunity a business should prioritise next.

STRICT RULES:
- Do not force this business into an industry template. Diagnose the actual situation described below.
- Do not invent facts. Only reason from what is given. If evidence is Missing or Inferred, say so plainly — do not upgrade its confidence.
- Do not produce generic marketing advice. Every opportunity must be traceable to a specific Growth Moment listed below.
- Business context (if given) is illustrative only — it does not determine your conclusion.

BUSINESS
Name: ${input.business_name}
Location: ${input.business_location ?? "Not specified"}
Business context (operator-tagged, optional, illustrative only): ${template ? `${template.label} — typical focus: ${template.focus}` : "Not specified — diagnose from the inputs below only"}
Target customer: ${input.target_customer ?? "Not specified"}

GROWTH QUESTION
"${input.growth_question}"

CURRENT CHALLENGE
Desired outcome: ${input.desired_outcome ?? "Not specified"}
Current obstacle: ${input.current_obstacle ?? "Not specified"}
Constraints: ${input.constraints_notes ?? "Not specified"}

REVENUE PILLARS (operator-defined)
${input.revenue_pillars.length ? input.revenue_pillars.join(", ") : "Not specified"}

GROWTH MOMENTS (operator-identified, with evidence confidence)
${momentLines || "None identified yet"}

Produce a JSON object with exactly this shape:
{
  "business_situation": "one paragraph, grounded only in what was given above",
  "growth_constraints": ["specific constraint", "..."],
  "opportunities": [
    {
      "moment_id": "must match one of the [id] values above",
      "rank": 1,
      "rationale": "why this opportunity, specifically, grounded in the evidence given",
      "supporting_evidence": ["specific evidence cited above"],
      "missing_evidence": ["what would strengthen this if known"]
    }
  ],
  "recommended_priority_moment_id": "the moment_id you rank highest"
}

Rank up to 5 opportunities, most promising first. If fewer than 5 Growth Moments were given, rank all of them. Return ONLY the JSON object, no other text.`;
}

export async function runDiagnosis(input: DiagnoseInput): Promise<{
  output: DiagnosisOutput;
  model: string;
}> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = await getModel("model_growth_sprint_diagnose", "claude-sonnet-4-6");

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    messages: [{ role: "user", content: buildPrompt(input) }],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Diagnosis failed — model did not return valid JSON");
  }

  const output = JSON.parse(jsonMatch[0]) as DiagnosisOutput;
  return { output, model };
}
