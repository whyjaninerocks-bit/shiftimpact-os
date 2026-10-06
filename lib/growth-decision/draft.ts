// lib/growth-decision/draft.ts
// Runs one drafting stage: prompt → JSON → validate → enforce basis → lint,
// with a single corrective retry. Pure orchestration; the Anthropic client is
// injected so it can be used by the API route, the gate script and tests.

import {
  InputsV,
  Stage1V,
  Stage2V,
  Stage3V,
  type Inputs,
  type Stage1,
  type Stage2,
  type Stage3,
  type StageMeta,
} from "./schema";
import { enforceBasis, lintCausalAndCreative, lintStage1Or2, type Violation } from "./lint";
import { lintPush } from "./lint-push";
import {
  stage1System,
  stage1User,
  stage2System,
  stage2User,
  stage3System,
  stage3User,
} from "./prompts";
import type { Issue } from "./validate";

export const BLUEPRINT_MODEL = process.env.BLUEPRINT_MODEL || "claude-sonnet-4-6";

export type LlmCall = (args: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  max_tokens: number;
}) => Promise<string>;

export class StageError extends Error {
  constructor(
    message: string,
    public issues: string[],
    public lastRaw: string,
  ) {
    super(message);
  }
}

function extractJson(raw: string): unknown {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON object in model output");
  return JSON.parse(m[0]);
}

function fmtIssues(issues: Issue[]): string[] {
  return issues.map((i) => `${i.path}: ${i.message}`);
}
function fmtViolations(v: Violation[]): string[] {
  return v.map((x) => `[${x.kind}] ${x.path}: ${x.detail}`);
}

export function parseInputs(raw: unknown): Inputs {
  const r = InputsV.parse(raw);
  if (!r.ok) throw new Error("Invalid blueprint inputs: " + fmtIssues(r.issues).join("; "));
  return r.value;
}

type StageResult<T> = { value: T; meta: StageMeta };

async function runWithRetry<T extends Stage1 | Stage2 | Stage3>(opts: {
  call: LlmCall;
  system: string;
  user: string;
  validate: (v: unknown) => { ok: true; value: T } | { ok: false; issues: Issue[] };
  lint: (v: T) => Violation[];
  inputs: Inputs;
  maxTokens: number;
}): Promise<StageResult<T>> {
  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: opts.user },
  ];
  let attempts = 0;
  let lastRaw = "";
  let lastProblems: string[] = [];

  while (attempts < 3) {
    attempts += 1;
    lastRaw = await opts.call({ system: opts.system, messages, max_tokens: opts.maxTokens });

    let parsed: unknown;
    try {
      parsed = extractJson(lastRaw);
    } catch (e) {
      lastProblems = [`output was not valid JSON: ${(e as Error).message}`];
      messages.push({ role: "assistant", content: lastRaw });
      messages.push({
        role: "user",
        content: `Your output could not be parsed: ${lastProblems[0]}. Return ONLY the corrected JSON object.`,
      });
      continue;
    }

    const v = opts.validate(parsed);
    if (!v.ok) {
      lastProblems = fmtIssues(v.issues);
      messages.push({ role: "assistant", content: lastRaw });
      messages.push({
        role: "user",
        content: `Schema validation failed:\n- ${lastProblems.join("\n- ")}\nReturn ONLY the corrected JSON object, keeping everything that was fine.`,
      });
      continue;
    }

    const { value: enforced, downgraded } = enforceBasis(v.value, opts.inputs);
    const violations = opts.lint(enforced);
    if (violations.length) {
      lastProblems = fmtViolations(violations);
      messages.push({ role: "assistant", content: lastRaw });
      messages.push({
        role: "user",
        content: `Lint failed:\n- ${lastProblems.join("\n- ")}\nRewrite ONLY the offending statements: specify jobs not creative, use non-causal language, and use only numbers present in the supplied evidence. Return the full corrected JSON object.`,
      });
      continue;
    }

    return {
      value: enforced,
      meta: {
        drafted_at: new Date().toISOString(),
        model: BLUEPRINT_MODEL,
        attempts,
        lint_warnings: [],
        downgraded_to_hypothesis: downgraded,
      },
    };
  }
  throw new StageError("Stage failed validation/lint after retry", lastProblems, lastRaw);
}

export async function draftStage1(inputs: Inputs, call: LlmCall): Promise<StageResult<Stage1>> {
  return runWithRetry<Stage1>({
    call,
    system: stage1System(),
    user: stage1User(inputs),
    validate: (v) => Stage1V.parse(v),
    lint: (v) => lintStage1Or2(v, inputs),
    inputs,
    maxTokens: 5000,
  });
}

export async function draftStage2(
  inputs: Inputs,
  stage1: Stage1,
  call: LlmCall,
): Promise<StageResult<Stage2>> {
  return runWithRetry<Stage2>({
    call,
    system: stage2System(),
    user: stage2User(inputs, stage1),
    validate: (v) => {
      const r = Stage2V.parse(v);
      if (!r.ok) return r;
      const p = r.value.push_the_brief;
      if (!p) return { ok: false, issues: [{ path: "push_the_brief", message: "required: category_hygiene, strategic_edge, proof_mechanic, creative_challenge, avoid, stretch_territories" }] };
      if (!p.creative_challenge.trim().endsWith("?"))
        return { ok: false, issues: [{ path: "push_the_brief.creative_challenge", message: "must be a single question ending in '?'" }] };
      return r;
    },
    lint: (v) => [...lintStage1Or2(v, inputs), ...lintPush(v, inputs)],
    inputs,
    maxTokens: 12000,
  });
}

export async function draftStage3(
  inputs: Inputs,
  stage1: Stage1,
  stage2: Stage2,
  call: LlmCall,
): Promise<StageResult<Stage3>> {
  return runWithRetry<Stage3>({
    call,
    system: stage3System(),
    user: stage3User(inputs, stage1, stage2),
    validate: (v) => Stage3V.parse(v),
    // Stage 3 prose gets causal/creative lint. Thresholds are proposals and are
    // exempt from the invented-number rule; baselines are checked separately.
    lint: (v) => [
      ...lintCausalAndCreative(v),
      ...baselineViolations(v, inputs),
    ],
    inputs,
    maxTokens: 5000,
  });
}

function baselineViolations(stage3: Stage3, inputs: Inputs): Violation[] {
  const out: Violation[] = [];
  const byId = new Map(inputs.evidence.map((e) => [e.id, e]));
  stage3.measures.forEach((m, i) => {
    if (m.baseline === null) return;
    const src = m.baseline_source ? byId.get(m.baseline_source) : undefined;
    const ok = src && (src.baseline === m.baseline || src.current === m.baseline);
    if (!ok) {
      out.push({
        kind: "invented_number",
        path: `measures[${i}].baseline`,
        detail: `baseline ${m.baseline} does not match the cited evidence item (${m.baseline_source ?? "none"}); set null if no evidence baseline exists`,
      });
    }
  });
  return out;
}

/** Real Anthropic call, used by the route and the gate script. */
export async function anthropicCall(args: Parameters<LlmCall>[0]): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: BLUEPRINT_MODEL,
    max_tokens: args.max_tokens,
    temperature: 0.3,
    system: args.system,
    messages: args.messages,
  });
  const block = msg.content[0];
  return block && block.type === "text" ? block.text.trim() : "";
}
