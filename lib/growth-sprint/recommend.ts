// lib/growth-sprint/recommend.ts
// Growth Sprint AI Call 2 — Decision Recommendation.
//
// Answers: "What should we test next?"
//
// This is the SECOND and final AI call. Runs only after the operator has
// reviewed Call 1's output and confirmed (or overridden) the priority
// opportunity — that choice is a required input here, never re-decided.
//
// decision_outcome is stored directly as Scale/Shift/Hold/Retest/Stop —
// no shared internal vocabulary or mapping layer in v1, per the locked
// scope. Retest is represented in the prompt as "stop the current test
// and rerun with a correction," not as an independent state the model
// invents its own meaning for.

import Anthropic from "@anthropic-ai/sdk";
import { getModel } from "@/lib/ai-model";
import type {
  BusinessContext,
  DiagnosisOutput,
  GrowthMoment,
  RecommendationOutput,
} from "./types";

interface RecommendInput {
  business_name: string;
  business_context: BusinessContext | null;
  diagnosis: DiagnosisOutput;
  priority_moment: GrowthMoment;
  override_reason: string | null; // set if operator picked a different moment than the model recommended
}

function buildPrompt(input: RecommendInput): string {
  const opportunity = input.diagnosis.opportunities.find(
    (o) => o.moment_id === input.priority_moment.id
  );

  return `You are helping a ShiftImpact operator finish a Growth Sprint. The diagnosis is complete and the operator has confirmed which opportunity to act on. Your job now is narrow: state the hypothesis being tested, define one specific 30-day test, and set the rule for what happens after it runs.

Your output has three distinct parts. Do not blend them:
1. GROWTH HYPOTHESIS — what you believe is true about this opportunity, stated as an unproven bet, not a conclusion.
2. 30-DAY TEST — the specific, executable action that checks the hypothesis.
3. DECISION RULE — the rule for interpreting results ONCE the test has actually run. This is not a prediction of what will happen.

STRICT RULES:
- Do not revisit or re-rank the opportunity choice. It is fixed below.
- Do not produce generic marketing advice. The test must be specific enough to execute this week.
- decision_outcome describes the CURRENT state, before this test has been run — it is NOT a forecast of the test's result and NOT a statement of confidence in the hypothesis.
- decision_outcome must be exactly one of: Scale, Shift, Hold, Retest, Stop.
  - Scale = this exact intervention has ALREADY been validated by real prior evidence (not just that the underlying problem is confirmed — that the fix itself has been tried and worked). If no test of this intervention has happened yet, Scale is wrong no matter how strong the hypothesis feels.
  - Shift = a different intervention on this same moment is already better supported by existing evidence than the one being proposed now.
  - Hold = the honest default for any hypothesis that has not yet been tested. If you are defining a 30-day test because the answer isn't known yet, the outcome is Hold — that is what "haven't tested it yet" means. Do not use Hold as a weak or hedging answer; use it as the correct answer for an untested hypothesis.
  - Retest = a prior test of this same intervention already ran and the result was inconclusive or flawed in a specific, named way.
  - Stop = a prior test of this exact intervention already ran and evidence clearly did not support it.
- In practice, for a first-time Growth Sprint on a moment with no prior test history, decision_outcome will almost always be Hold. Only deviate from Hold if the operator's evidence explicitly describes a prior attempt at this exact intervention, not just evidence that the problem exists.
- decision_rule must describe what SHOULD happen after the test runs (e.g. specific thresholds), not what you expect will happen.

BUSINESS: ${input.business_name}
CONFIRMED OPPORTUNITY (Growth Moment)
Customer: ${input.priority_moment.customer}
Situation: ${input.priority_moment.situation}
Trigger: ${input.priority_moment.trigger}
Need: ${input.priority_moment.need}
Behaviour: ${input.priority_moment.behaviour}
Commercial response: ${input.priority_moment.commercial_response}

DIAGNOSIS CONTEXT
${opportunity ? `Rationale for this opportunity: ${opportunity.rationale}\nSupporting evidence: ${opportunity.supporting_evidence.join("; ") || "None given"}\nMissing evidence: ${opportunity.missing_evidence.join("; ") || "None"}` : "No matching diagnosis entry found — reason from the Growth Moment alone."}
${input.override_reason ? `\nOperator note: this opportunity was chosen over the model's original top pick. Reason given: "${input.override_reason}"` : ""}

Produce a JSON object with exactly this shape:
{
  "growth_hypothesis": "the specific, unproven bet this test is designed to check — one or two sentences, stated as a hypothesis ('we believe that...'), not a conclusion",
  "thirty_day_test": "one specific, executable test description",
  "target_audience": "who specifically",
  "offer_intervention": "what specifically changes or gets offered",
  "conversion_path": "how the customer moves from the trigger to the commercial response",
  "evidence_signals": ["specific signal to watch", "..."],
  "decision_rule": "the specific rule for what happens after the test runs — name the thresholds or conditions that would trigger Scale, Shift, Retest, or Stop once real results exist",
  "decision_rationale": "why decision_outcome is set to its current value — for an untested hypothesis, this should explain why Hold is the honest answer right now",
  "decision_outcome": "Scale" | "Shift" | "Hold" | "Retest" | "Stop"
}

Return ONLY the JSON object, no other text.`;
}

export async function runRecommendation(input: RecommendInput): Promise<{
  output: RecommendationOutput;
  model: string;
}> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = await getModel("model_growth_sprint_recommend", "claude-sonnet-4-6");

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: buildPrompt(input) }],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Recommendation failed — model did not return valid JSON");
  }

  const output = JSON.parse(jsonMatch[0]) as RecommendationOutput;
  return { output, model };
}
