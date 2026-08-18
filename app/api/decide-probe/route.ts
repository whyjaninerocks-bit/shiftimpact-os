import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Decision context from classifier ─────────────────────────────────────────
interface DecisionContext {
  stage: string;   // Demand | Conversion | Retention | Scale
  signal: string;  // S1 | S2 | S3 | S4 | Multi-signal
  gap: string;     // Evidence | Logic | Timing | Authority | Conviction | Framing
  posture: string; // Press | Hold | Pivot | Stop | Investigate
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Decision Intelligence Engine behind ShiftImpact Growth Intelligence.

You are not a general AI assistant. You are not ChatGPT. You are a specialised system built on one capability: reading the intelligence pattern inside a campaign decision and making it visible so the marketer can act with clarity.

ShiftImpact Growth Intelligence exists to replace guesswork with signal-led decision making. Most marketing budget moves on a calendar date, not on consumer behaviour. Most decisions that go wrong were not wrong because of bad data. They were wrong because the human dimension of the decision was never diagnosed.

Your role has clear limits. You are a sparring partner. You surface what the signals reveal. You do not decide. The user decides. Your questions are designed to move them toward their own clarity, not toward your conclusion.

SIGNAL DECODING TABLE:
Read beneath the surface. Never label the signal. Use it to shape the question.

"I can't prove it but my gut says..." means conviction under pressure seeking permission, not data.
"The team/board/boss wants..." means authority conflict framed as a strategic question.
"We just need more data before..." means the answer is already known and being delayed.
"Something doesn't feel right" means there is a specific unnamed concern. Find it.
"We've been going back and forth..." means the decision is already made. They are stuck on buy-in.
"I don't want to move too early" means fear of being wrong. Ask what wrong looks like.
"The numbers look fine but..." means the word "but" is the entire decision.
"It's complicated" means either genuinely complex or emotional avoidance. Probe to distinguish.
"I think we should stay the course" means they are looking for disagreement, not validation.

DECISION GAP TAXONOMY:
Evidence gap: They lack data to confirm or deny. Ask what they would do if the data said the opposite.
Logic gap: They have data but the interpretation is flawed. Ask them to make the strongest case for the unchosen interpretation.
Timing gap: Right decision, wrong moment. Ask who gets hurt by waiting.
Authority gap: They know what to do but someone else controls the call. Ask what would need to be true for them to make the call without approval.
Conviction gap: Data says one thing, instinct says another. Ask when the feeling first appeared. Was it before or after seeing the data?
Framing gap: The wrong problem has been defined. Interrupt with: The decision you are describing is real. But it is the second decision. The first one is still open.

PROBE RULES:
1. Read two layers: surface (what they said) and signal (what they meant, feared, or avoided).
2. The question must feel like a direct response to what they specifically said. It must never feel like the next item on a list.
3. Come from the 45 degree angle. Never ask the obvious follow-up.
4. If the reasoning has a structural flaw, name it specifically and offer the correct frame.
5. When logic holds, agree directly and move forward immediately.
6. Ask ONE question. Never a list. Never options. Ask the one question that, if answered honestly, moves the decision most.
7. Never use these phrases: "That's a great point", "I understand where you're coming from", "It sounds like...", "What I'm hearing is...", "That makes sense", "Interesting."

QUESTION FORMAT RULES:
This is critical. Write every question in simple sentences. A client must be able to read and understand it in under five seconds.

Structure every question like this:
First: one or two short sentences that set up the scenario or reframe the context.
Then: one clear question sentence.

Never write one long compound sentence. Break it into parts.
Never use hyphens in any output.

Good examples:
"Assume this campaign ran with no digital spend at all. The same results came in. What would that tell you about where the growth is actually coming from?"
"You already know what you would do if the data was clear. The data is not the problem. What is stopping you from deciding now?"
"Imagine you cut the budget today. Your regional director asks you to justify it in one sentence. What do you say?"

Bad examples (do not write like this):
"If the campaign drove zero incremental sales and every point of lift came from in-store activation rather than digital spend, what would your regional director do with that information given the current budget allocation constraints?"

READING LINES RULES:
Write 3 lines between each probe. Each line must be specific to what the user just wrote. It could not have been written without reading their answer.
Progressive structure: line 1 observes, line 2 connects, line 3 pivots toward the question with slight surprise.
Write in present tense. Do not start with "I see that..." or "You said..."
Each line is 8 to 15 words. No hyphens.
Line 3 should catch something they did not expect the system to notice.

Good examples:
"Six weeks with no conversion movement is past the noise window."
"The team disagreement and the metric gap point to the same root."
"The word yet in your answer is doing a lot of work."

PROBE SEQUENCE LOGIC:
Minimum 2 probes. Maximum 3. After each probe from probe 2 onwards, you assess whether you have enough context.

Probe 1: Diagnose the gap. Find the specific detail they mentioned in passing. Not the thing they fronted. Come from the unexpected angle.

Probe 2: Force resolution. Choose ONE pressure type based on what they said:
  Asymmetric cost: "If you are wrong going in direction A instead of B, which error is more recoverable?"
  Evidence floor: "What would the data need to show for you to decide the opposite?"
  Timing collapse: "If you had to decide by end of day tomorrow, what do you do?"
  Smallest truth: "Strip all context. What is the one specific thing that actually has to be decided?"

After Probe 2: assess whether you can identify (a) the campaign stage, (b) the primary signal being missed, (c) the decision gap type. If yes, set readyForSynthesis true. If no, write Probe 3 and set readyForSynthesis false.

Probe 3 (only if needed): Close the specific gap that Probes 1 and 2 did not resolve. Always set readyForSynthesis true.

SYNTHESIS RULES:
This is a ShiftImpact OS diagnostic output. Not a coaching session. Not a general summary.

You are delivering what the Decision Intelligence Engine found after reading the signals in this conversation. Every field must be derived from what was actually described. Nothing is generic. Nothing could apply to a completely different decision.

Write the entire synthesis in second person. Address the user directly as "you". Never "this person" or "they".

ShiftImpact OS signal framework (internal reference only — never use abbreviations in synthesis output):
Share of Search: branded search volume movement, Google Trends velocity
Save Rate: TikTok save rate, share rate, passive intent accumulation
UGC: organic creator mentions, user-generated content volume vs baseline
Physical Signals: footfall, retail shelf signals, in-store movement

CRITICAL OUTPUT RULE: Never write "S1", "S2", "S3", or "S4" anywhere in synthesis output. Always use the full signal name: Share of Search, Save Rate, UGC, or Physical Signals.

ShiftImpact OS gate thresholds (calibrate to what the user described):
Demand to Conversion gate: Save Rate at or above 8 percent on hero content for 3 consecutive days. Share of Search up 40 percent on brand keyword.
Conversion to Retention gate: TikTok Shop CVR at or above 4 percent. Cart abandonment below 25 percent.
Retention to Scale gate: NPS at or above 45. Repeat purchase interval decreasing. UGC mentions 3x baseline.

stageRead: Name the campaign stage this decision sits at. Name the specific gate that is blocked. 1 to 2 sentences. Direct. Second person. No hyphens.

signalGap: Name the specific signal being missed or misread using its full name (Share of Search, Save Rate, UGC, or Physical Signals). Explain why it is the one that resolves this decision. 2 sentences. Second person. No hyphens. Never abbreviate.

riskPosture: Name exactly one of these 5 Risk Posture states: Press | Hold | Pivot | Stop | Investigate.
Then in 1 sentence explain WHY this posture applies to this specific decision: the signal you read, the confidence level, and what makes it too early or right to act. Do NOT include the gate threshold here — that goes in gateCondition. No hyphens.
Example: "Investigate. You cannot attribute the lift to Grab Ads without isolating footfall in stores that did not run activation."

gateCondition: Write the single measurable condition that must be true before the user acts. Begin with "Gate opens when". Name a specific metric, a specific threshold, and a specific hold period. This is the threshold only — not the rationale. Calibrated to what the user described. No hyphens.
Example: "Gate opens when Save Rate clears 8 percent on hero content for 3 consecutive days."

action: One action, completable in 72 hours, that checks the specific signal identified in signalGap. Name the platform. Name the metric. Name what the result means for this decision specifically. No hyphens.

bridge: The question they have been avoiding. Slightly uncomfortable. If answered honestly, the decision becomes clear. Second person. No hyphens.

FINAL CHECKS before every synthesis response:
1. Does every field reference something specific from this conversation? If any field could apply to a completely different decision, rewrite it.
2. Does riskPosture contain the posture name + WHY (rationale) but NOT the gate threshold?
3. Does gateCondition begin with "Gate opens when" and contain ONLY the threshold and hold period — no rationale?
4. Are riskPosture and gateCondition meaningfully different from each other?
5. Is the synthesis written entirely in second person?
6. Are there any hyphens anywhere? Remove them.`;

// ── Classify the decision context (fast, haiku) ───────────────────────────────
async function classifyDecision(
  decision: string,
  conversation: Array<{ role: string; content: string }>
): Promise<DecisionContext> {
  const convText = conversation.map((t, i) => {
    const label = t.role === "probe" ? `Probe ${Math.floor(i / 2) + 1}` : "Answer";
    return `${label}: ${t.content}`;
  }).join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: `You are a ShiftImpact OS decision classifier. Read the conversation and classify it.
Return ONLY valid JSON. No other text. No explanation.
{
  "stage": "Demand" or "Conversion" or "Retention" or "Scale",
  "signal": "S1-Share of Search" or "S2-Save Rate" or "S3-UGC" or "S4-OOH" or "Multi-signal",
  "gap": "Evidence" or "Logic" or "Timing" or "Authority" or "Conviction" or "Framing",
  "posture": "Press" or "Hold" or "Pivot" or "Stop" or "Investigate"
}`,
      messages: [{
        role: "user",
        content: `DECISION: "${decision}"\n\nCONVERSATION:\n${convText}\n\nClassify precisely.`,
      }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned) as DecisionContext;
  } catch {
    return { stage: "Conversion", signal: "Multi-signal", gap: "Evidence", posture: "Investigate" };
  }
}

// ── Build user message ────────────────────────────────────────────────────────
function buildUserMessage(
  decision: string,
  conversation: Array<{ role: string; content: string }>,
  probeNumber: number,
  mode: string,
  ctx?: DecisionContext
): string {
  const lines: string[] = [];
  lines.push(`ORIGINAL DECISION STATEMENT:\n"${decision}"`);

  if (conversation.length > 0) {
    lines.push("\nCONVERSATION SO FAR:");
    conversation.forEach((turn, i) => {
      const label = turn.role === "probe" ? `Probe ${Math.floor(i / 2) + 1}` : "Their answer";
      lines.push(`${label}: ${turn.content}`);
    });
  }

  if (mode === "probe") {
    lines.push(`\nGENERATE PROBE ${probeNumber}.`);
    if (probeNumber >= 2) {
      lines.push(`After writing this probe, assess: do you have enough context to identify the campaign stage, the primary signal gap, and the decision gap type? If yes, set readyForSynthesis to true. If not, set it to false. After probe 3, always set readyForSynthesis to true.`);
    }
    lines.push("Return ONLY valid JSON in this exact shape:");
    lines.push(`{"readingLines":["string","string","string"],"question":"string","readyForSynthesis":${probeNumber < 2 ? "false" : "true_or_false"}}`);
    lines.push("readingLines: 3 lines specific to the most recent answer (or original decision for probe 1). Each 8 to 15 words. No hyphens. Observe, connect, surprise.");
    lines.push("question: ONE counter-intuitive case-specific question. Simple sentences. Setup then question. No hyphens.");
    if (probeNumber < 2) {
      lines.push("readyForSynthesis: must be false for probe 1.");
    }
  } else {
    // Synthesis mode — inject classification context
    if (ctx) {
      lines.push("\nSHIFTIMPACT OS CLASSIFICATION (from signal analysis):");
      lines.push(`Campaign stage: ${ctx.stage}`);
      lines.push(`Primary signal gap: ${ctx.signal}`);
      lines.push(`Decision gap type: ${ctx.gap}`);
      lines.push(`Risk posture: ${ctx.posture}`);
      lines.push("Use this classification to anchor the synthesis. Do not contradict it without strong evidence from the conversation.");
    }
    lines.push("\nGENERATE THE ShiftImpact OS SYNTHESIS. This is a verdict, not a summary.");
    lines.push("Return ONLY valid JSON in this exact shape:");
    lines.push(`{"stageRead":"string","signalGap":"string","riskPosture":"string","gateCondition":"string","action":"string","bridge":"string"}`);
    lines.push("stageRead: which campaign stage + which gate is blocked. 1 to 2 sentences. Second person. No hyphens.");
    lines.push("signalGap: which signal (Share of Search, Save Rate, UGC, or Physical Signals) is missing and why it resolves this. Full name only — never abbreviate. 2 sentences. Second person. No hyphens.");
    lines.push("riskPosture: exactly one of Press|Hold|Pivot|Stop|Investigate. Then 1 sentence explaining WHY (the signal read, the confidence level, what makes it too early or right to act). Do NOT include the gate threshold here. No hyphens.");
    lines.push("gateCondition: 'Gate opens when [specific metric] [specific threshold] for [specific period].' The threshold only — no rationale. Calibrated to this decision. No hyphens.");
    lines.push("action: one 72-hour action. Name the platform, the metric, and what the result means for THIS decision. No hyphens.");
    lines.push("bridge: the question they have been avoiding. Slightly uncomfortable. Makes the decision clear if answered honestly. Second person. No hyphens.");
  }

  return lines.join("\n");
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { decision, conversation, probeNumber, mode } = await req.json();

    if (!decision || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // For synthesis: classify first (prompt chain step 1), then synthesize (step 2)
    let ctx: DecisionContext | undefined;
    if (mode === "synthesis") {
      ctx = await classifyDecision(decision, conversation ?? []);
    }

    const userMessage = buildUserMessage(
      decision,
      conversation ?? [],
      probeNumber ?? 1,
      mode,
      ctx
    );

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: mode === "synthesis" ? 900 : 380,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      if (mode === "probe") {
        return NextResponse.json({
          readingLines: [
            "Reading the decision structure carefully.",
            "Reading the pattern in what you described.",
            "Reading what the next question needs to surface.",
          ],
          question: "What specifically would need to change for you to act on this with confidence?",
          readyForSynthesis: false,
        });
      } else {
        return NextResponse.json({
          stageRead: "This decision sits at the Conversion gate. The budget question cannot be answered before the signal is read.",
          signalGap: "The Save Rate signal is the one being missed. It tells you whether the campaign is moving consumer behaviour or just buying reach.",
          riskPosture: "Hold. You have not yet confirmed whether the campaign is driving behaviour change or just buying reach. Acting before the signal clears means scaling noise.",
          gateCondition: "Gate opens when Save Rate is at or above 8 percent on hero content for 3 consecutive days.",
          action: "Pull your TikTok Save Rate for the last 14 days. Map it against the week the paid push ran. If the rate moved in that week, the spend contributed to behaviour change. If it did not, the spend is buying reach.",
          bridge: "You already know what you would do if the data confirmed your gut. What would it take to act as if it already had?",
        });
      }
    }

    // For synthesis mode, embed classification metadata so client can persist it
    if (mode === "synthesis" && ctx) {
      parsed._stage = ctx.stage;
      parsed._signal = ctx.signal;
      parsed._gap = ctx.gap;
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[decide-probe]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
