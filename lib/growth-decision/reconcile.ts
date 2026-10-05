// lib/growth-decision/reconcile.ts
// Pure reconciliation: stored thresholds + readings → verdict DRAFT.
//
// Deterministic, no AI. A strategist approves the outcome; this only computes.
//
// A "clean pass" requires ALL of: primary measure passes, every guardrail
// passes, every held-constant verified `held`, treatment delivered as specified.
// Anything else is not a clean pass — a result can never claim more than its
// design and its conditions allow.

import type { Measure, Outcome, Stage3 } from "./schema";
import type { OutcomeMove, TestDesign } from "./taxonomy";

export type Verdict =
  | "passed"
  | "passed_confounded"
  | "guardrail_breach"
  | "failed"
  | "inconclusive";

export type MeasureStatus = "pass" | "fail" | "missing" | "no_threshold";

export type MeasureResult = {
  key: string;
  role: "primary" | "guardrail";
  label: string;
  status: MeasureStatus;
  actual: number | boolean | null;
  threshold: number | null;
  comparator: Measure["comparator"];
  unit: Measure["unit"];
};

export type Reconciliation = {
  verdict: Verdict;
  suggested_move: OutcomeMove;
  evidence_strength: "directional" | "medium" | "high";
  measure_results: MeasureResult[];
  reasons: string[];
};

function compare(actual: number, c: Measure["comparator"], t: number): boolean {
  switch (c) {
    case "gte": return actual >= t;
    case "gt": return actual > t;
    case "lte": return actual <= t;
    case "lt": return actual < t;
  }
}

export function strengthForDesign(design: TestDesign): "directional" | "medium" | "high" {
  if (design === "randomised") return "high";
  if (design === "before_after") return "directional";
  return "medium"; // matched_comparison | holdout | split_test
}

function downgrade(s: "directional" | "medium" | "high"): "directional" | "medium" | "high" {
  return s === "high" ? "medium" : "directional";
}

export function reconcile(stage3: Stage3, outcome: Outcome): Reconciliation {
  const reasons: string[] = [];
  const results: MeasureResult[] = stage3.measures.map((m) => {
    const reading = outcome.readings.find((r) => r.measure_key === m.key);
    let status: MeasureStatus;
    let actual: number | boolean | null = null;

    if (!reading || (reading.value === null && reading.passed === null)) {
      status = "missing";
    } else if (m.unit === "pass_fail") {
      actual = reading.passed;
      status = reading.passed === null ? "missing" : reading.passed ? "pass" : "fail";
    } else if (reading.value === null) {
      status = "missing";
    } else if (m.threshold === null) {
      actual = reading.value;
      status = "no_threshold";
    } else {
      actual = reading.value;
      status = compare(reading.value, m.comparator, m.threshold) ? "pass" : "fail";
    }
    return {
      key: m.key,
      role: m.role,
      label: m.label,
      status,
      actual,
      threshold: m.threshold,
      comparator: m.comparator,
      unit: m.unit,
    };
  });

  const primary = results.filter((r) => r.role === "primary");
  const guardrails = results.filter((r) => r.role === "guardrail");
  let strength = strengthForDesign(stage3.test.design);

  // ── conditions that make any result non-clean ──
  const conditionProblems: string[] = [];
  if (outcome.treatment_delivered === false)
    conditionProblems.push("Treatment was not delivered as specified.");
  if (outcome.treatment_delivered === null)
    conditionProblems.push("Treatment delivery is unconfirmed.");
  const breached = outcome.held_constant_check.filter((h) => h.status === "breached");
  const unknown = outcome.held_constant_check.filter((h) => h.status === "unknown");
  if (breached.length)
    conditionProblems.push(`Held-constant breached: ${breached.map((h) => h.item).join(", ")}.`);
  if (unknown.length)
    conditionProblems.push(`Held-constant unverified: ${unknown.map((h) => h.item).join(", ")}.`);
  const requiredHeld = new Set(stage3.test.held_constant.map((h) => h.item.toLowerCase()));
  const checked = new Set(outcome.held_constant_check.map((h) => h.item.toLowerCase()));
  const unchecked = [...requiredHeld].filter((i) => !checked.has(i));
  if (unchecked.length)
    conditionProblems.push(`Held-constant not checked: ${unchecked.join(", ")}.`);

  const missingCore =
    primary.length === 0 ||
    primary.some((r) => r.status === "missing" || r.status === "no_threshold") ||
    guardrails.some((r) => r.status === "missing" || r.status === "no_threshold");

  if (missingCore) {
    reasons.push("A required reading or threshold is missing, so the result cannot be reconciled.");
    return {
      verdict: "inconclusive",
      suggested_move: "inconclusive",
      evidence_strength: "directional",
      measure_results: results,
      reasons: [...reasons, ...conditionProblems],
    };
  }

  const primaryPass = primary.every((r) => r.status === "pass");
  const guardrailFail = guardrails.filter((r) => r.status === "fail");

  if (!primaryPass) {
    if (conditionProblems.length) {
      return {
        verdict: "inconclusive",
        suggested_move: "inconclusive",
        evidence_strength: "directional",
        measure_results: results,
        reasons: [
          "Primary measure did not clear its threshold, but the test conditions were not clean, so the miss cannot be attributed to the intervention.",
          ...conditionProblems,
        ],
      };
    }
    return {
      verdict: "failed",
      suggested_move: stage3.decision_rule.on_fail,
      evidence_strength: strength,
      measure_results: results,
      reasons: ["Primary measure did not clear its threshold under clean conditions."],
    };
  }

  // Primary passed.
  if (guardrailFail.length) {
    return {
      verdict: "guardrail_breach",
      // The "win" damaged something it was meant to protect. Do not scale; change the intervention.
      suggested_move: "shift",
      evidence_strength: downgrade(strength),
      measure_results: results,
      reasons: [
        `Primary measure passed but guardrail(s) failed: ${guardrailFail.map((g) => g.label).join(", ")}.`,
        ...conditionProblems,
      ],
    };
  }

  if (conditionProblems.length) {
    strength = downgrade(strength);
    return {
      verdict: "passed_confounded",
      suggested_move: "inconclusive",
      evidence_strength: strength,
      measure_results: results,
      reasons: [
        "Primary measure and all guardrails cleared, but the test conditions were not fully clean — treat as a promising signal that needs a retest, not a pass.",
        ...conditionProblems,
      ],
    };
  }

  return {
    verdict: "passed",
    suggested_move: stage3.decision_rule.on_pass,
    evidence_strength: strength,
    measure_results: results,
    reasons: [
      "Primary measure and every guardrail cleared; held-constants verified; treatment delivered as specified.",
    ],
  };
}
