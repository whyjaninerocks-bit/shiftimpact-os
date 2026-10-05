// lib/growth-decision/lint.ts
// Post-processing guards on AI output. Pure functions, no I/O.
//
//  1. causal-language lint  — no "proves", "caused by", etc. Use "consistent with".
//  2. creative-boundary lint — ShiftImpact specifies the job; it never writes
//     scripts, concepts, storyboards, casting or production.
//  3. invented-number lint   — numbers in stage 1/2 narrative must trace to inputs.
//  4. evidence-id integrity  — `evidenced` needs at least one real evidence id,
//     otherwise it is downgraded to `hypothesis` (never silently left as evidenced).

import type { Inputs, Stage1, Stage2 } from "./schema";

export type Violation = { kind: "causal" | "creative" | "invented_number"; path: string; detail: string };

const CAUSAL: RegExp[] = [
  /\bproves?\b/i,
  /\bproved\b/i,
  /\bproven\b/i,
  /\bcaused? by\b/i,
  /\bis caused by\b/i,
  /\bdue to the (campaign|content|creative|creator)\b/i,
  /\bdefinitely\b/i,
  /\bcertainly\b/i,
  /\bguarantee[sd]?\b/i,
  /\bwill (increase|boost|lift|drive|fix|solve)\b/i,
  /\bthe (root )?cause is\b/i,
  /\bclearly (shows|demonstrates)\b/i,
];

const CREATIVE: RegExp[] = [
  /\bstoryboard\b/i,
  /\bscript(ed)?\b/i,
  /\bscreenplay\b/i,
  /\bshot[- ]list\b/i,
  /\bvoice[- ]?over\b/i,
  /\bscene \d+\b/i,
  /\btagline\b/i,
  /\bslogan\b/i,
  /\bhook:/i,
  /\bheadline:/i,
  /\bcaption:/i,
  /\bconcept:/i,
  /\bcasting\b/i,
  /\bcast (a|an|the)\b/i,
  /\bopen(s|ing)? (on|with) a (shot|close-up)\b/i,
  /\bcamera\b/i,
  /\bB-roll\b/i,
];

function walkStrings(v: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof v === "string") out.push({ path, text: v });
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) walkStrings(x, path ? `${path}.${k}` : k, out);
}

// Keys whose string values are enum labels, not prose — skip them.
const ENUM_KEYS = new Set([
  "role", "primary", "secondary", "proof", "beat", "move", "confidence", "basis",
  "design", "test_role", "unit", "comparator", "threshold_status", "id", "key",
  "evidence_id", "evidence_ids", "on_pass", "on_fail", "type", "status", "measure_key",
]);

function proseStrings(v: unknown): { path: string; text: string }[] {
  const all: { path: string; text: string }[] = [];
  walkStrings(v, "", all);
  return all.filter((s) => {
    const last = s.path.split(".").pop()!.replace(/\[\d+\]$/, "");
    return !ENUM_KEYS.has(last);
  });
}

export function lintCausalAndCreative(stageOutput: unknown): Violation[] {
  const issues: Violation[] = [];
  for (const { path, text } of proseStrings(stageOutput)) {
    for (const re of CAUSAL) {
      const m = text.match(re);
      if (m) issues.push({ kind: "causal", path, detail: `"${m[0]}" — use "consistent with" / "suggests" instead` });
    }
    for (const re of CREATIVE) {
      const m = text.match(re);
      if (m) issues.push({ kind: "creative", path, detail: `"${m[0]}" — specify the job, not the creative` });
    }
    // Quoted written copy longer than 8 words = drafted creative.
    const quoted = text.match(/["“][^"”]{40,}["”]/);
    if (quoted) issues.push({ kind: "creative", path, detail: "long quoted copy — ShiftImpact does not write copy" });
  }
  return issues;
}

// ─── invented numbers ───────────────────────────────────────────────────────

function inputNumberCorpus(inputs: Inputs): Set<string> {
  const set = new Set<string>();
  const add = (n: number) => {
    set.add(String(n));
    set.add(String(Math.round(n)));
    set.add(String(Math.abs(n)));
    set.add(String(Math.abs(Math.round(n))));
  };
  const raw = JSON.stringify(inputs);
  for (const m of raw.matchAll(/\d+(?:\.\d+)?/g)) set.add(m[0]);
  for (const e of inputs.evidence) {
    if (e.baseline !== null && e.current !== null) {
      add(e.current - e.baseline);
      if (e.baseline !== 0) add(((e.current - e.baseline) / e.baseline) * 100);
    }
  }
  return set;
}

export function lintInventedNumbers(stageOutput: unknown, inputs: Inputs): Violation[] {
  const corpus = inputNumberCorpus(inputs);
  const issues: Violation[] = [];
  for (const { path, text } of proseStrings(stageOutput)) {
    for (const m of text.matchAll(/\d+(?:\.\d+)?/g)) {
      const n = m[0];
      const value = Number(n);
      const isPct = text.slice(m.index! + n.length, m.index! + n.length + 1) === "%";
      // Single-digit counts ("two proof beats", "3 variants") are not claims.
      if (value < 10 && !isPct && !n.includes(".")) continue;
      if (!corpus.has(n) && !corpus.has(String(Math.round(value)))) {
        issues.push({ kind: "invented_number", path, detail: `"${n}" does not trace to any supplied input` });
      }
    }
  }
  return issues;
}

// ─── evidence-id integrity ──────────────────────────────────────────────────

/**
 * Mutates a deep copy: any `basis: "evidenced"` item with no valid evidence id
 * becomes `hypothesis`. Unknown ids are stripped. Returns the paths changed.
 */
export function enforceBasis<T>(stage: T, inputs: Inputs): { value: T; downgraded: string[] } {
  const valid = new Set(inputs.evidence.map((e) => e.id));
  const downgraded: string[] = [];
  const copy = JSON.parse(JSON.stringify(stage)) as T;

  const visit = (node: unknown, path: string) => {
    if (Array.isArray(node)) return node.forEach((x, i) => visit(x, `${path}[${i}]`));
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (Array.isArray(o.evidence_ids)) {
      o.evidence_ids = (o.evidence_ids as unknown[]).filter((x) => typeof x === "string" && valid.has(x as string));
    }
    if (o.basis === "evidenced") {
      const idsHere = Array.isArray(o.evidence_ids) ? (o.evidence_ids as unknown[]) : null;
      // Explanations carry supports[] instead of evidence_ids.
      const supports = Array.isArray(o.supports)
        ? (o.supports as { evidence_id?: string }[]).filter((c) => c.evidence_id && valid.has(c.evidence_id))
        : null;
      const hasEvidence = (idsHere && idsHere.length > 0) || (supports && supports.length > 0);
      if (!hasEvidence) {
        o.basis = "hypothesis";
        downgraded.push(path || "$");
      }
    }
    if (Array.isArray(o.supports)) {
      o.supports = (o.supports as { evidence_id?: string }[]).filter((c) => c.evidence_id && valid.has(c.evidence_id));
    }
    if (Array.isArray(o.contradicts)) {
      o.contradicts = (o.contradicts as { evidence_id?: string }[]).filter((c) => c.evidence_id && valid.has(c.evidence_id));
    }
    for (const [k, x] of Object.entries(o)) visit(x, path ? `${path}.${k}` : k);
  };
  visit(copy, "");
  return { value: copy, downgraded };
}

export function lintStage1Or2(
  stageOutput: Stage1 | Stage2,
  inputs: Inputs,
): Violation[] {
  return [...lintCausalAndCreative(stageOutput), ...lintInventedNumbers(stageOutput, inputs)];
}
