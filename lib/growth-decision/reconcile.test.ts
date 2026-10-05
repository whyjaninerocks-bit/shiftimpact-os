// Run: npx tsx lib/growth-decision/reconcile.test.ts
import assert from "node:assert/strict";
import { reconcile } from "./reconcile";
import type { Outcome, Stage3 } from "./schema";

const stage3: Stage3 = {
  test: {
    role: "strengthen",
    design: "matched_comparison",
    design_rationale: "Matched SKU comparison because randomisation is not available.",
    treatment: "Proof-led product page on treated SKUs",
    comparison: "Matched untreated SKUs",
    duration_weeks: 4,
    calendar_confounds: [],
    held_constant: [
      { item: "price", how_verified: "price log" },
      { item: "discount", how_verified: "promo calendar" },
    ],
  },
  measures: [
    { key: "conv_lift", role: "primary", label: "PDP-to-purchase vs matched", definition: "Relative difference vs matched set", unit: "pct_change", baseline: null, baseline_source: null, comparator: "gte", threshold: 10, threshold_status: "proposed", failure_condition: "Below +10% relative" },
    { key: "margin_delta", role: "guardrail", label: "Margin change", definition: "Margin change in points", unit: "pct_points", baseline: null, baseline_source: null, comparator: "gte", threshold: -2, threshold_status: "proposed", failure_condition: "Margin falls more than 2 points" },
    { key: "stock_ok", role: "guardrail", label: "Stock held", definition: "Stock availability maintained", unit: "pass_fail", baseline: null, baseline_source: null, comparator: "gte", threshold: null, threshold_status: "needs_client_input", failure_condition: "Any stock-out on treated SKUs" },
  ],
  signals: { success: "Primary and guardrails clear", failure: "Primary misses", inconclusive: "Conditions not clean" },
  decision_rule: { statement: "Pass requires primary and all guardrails, held constants verified, treatment delivered.", on_pass: "strengthen", on_fail: "stop" },
};

const clean: Outcome = {
  is_illustrative: true,
  readings: [
    { measure_key: "conv_lift", value: 14, passed: null },
    { measure_key: "margin_delta", value: -0.5, passed: null },
    { measure_key: "stock_ok", value: null, passed: true },
  ],
  treatment_delivered: true,
  deviations: [],
  held_constant_check: [
    { item: "price", status: "held" },
    { item: "discount", status: "held" },
  ],
  interpretation: "Illustrative clean pass for tests.",
};

// 1. clean pass
let r = reconcile(stage3, clean);
assert.equal(r.verdict, "passed");
assert.equal(r.suggested_move, "strengthen");
assert.equal(r.evidence_strength, "medium");

// 2. guardrail breach
r = reconcile(stage3, { ...clean, readings: clean.readings.map((x) => (x.measure_key === "margin_delta" ? { ...x, value: -3.1 } : x)) });
assert.equal(r.verdict, "guardrail_breach");
assert.equal(r.suggested_move, "shift");

// 3. held-constant breached on an otherwise passing result → confounded, retest
r = reconcile(stage3, { ...clean, held_constant_check: [{ item: "price", status: "held" }, { item: "discount", status: "breached" }] });
assert.equal(r.verdict, "passed_confounded");
assert.equal(r.suggested_move, "inconclusive");
assert.equal(r.evidence_strength, "directional");

// 4. treatment not delivered
r = reconcile(stage3, { ...clean, treatment_delivered: false });
assert.equal(r.verdict, "passed_confounded");

// 5. clean fail
r = reconcile(stage3, { ...clean, readings: clean.readings.map((x) => (x.measure_key === "conv_lift" ? { ...x, value: 3 } : x)) });
assert.equal(r.verdict, "failed");
assert.equal(r.suggested_move, "stop");

// 6. fail under unclean conditions → inconclusive, not failed
r = reconcile(stage3, {
  ...clean,
  treatment_delivered: null,
  readings: clean.readings.map((x) => (x.measure_key === "conv_lift" ? { ...x, value: 3 } : x)),
});
assert.equal(r.verdict, "inconclusive");

// 7. missing primary reading
r = reconcile(stage3, { ...clean, readings: clean.readings.filter((x) => x.measure_key !== "conv_lift") });
assert.equal(r.verdict, "inconclusive");

// 8. unchecked held-constant item
r = reconcile(stage3, { ...clean, held_constant_check: [{ item: "price", status: "held" }] });
assert.equal(r.verdict, "passed_confounded");

// 9. before_after can never exceed directional
r = reconcile({ ...stage3, test: { ...stage3.test, design: "before_after" } }, clean);
assert.equal(r.verdict, "passed");
assert.equal(r.evidence_strength, "directional");

console.log("reconcile: all 9 tests passed");
