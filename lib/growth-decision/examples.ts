// lib/growth-decision/examples.ts
// Two ILLUSTRATIVE worked examples for the Roma presentation.
//
// Everything here is fictional and labelled as such: the brand, the indexed
// numbers, the outcome and the next decision. They exist to demonstrate the
// loop, not to assert any real market fact or real client result.
//
//  • Inputs are seeded (the evidence-intake UI is a named-pilot item).
//  • Stages 1–3 are produced by the real drafting pipeline from these inputs.
//  • The outcome and next decision are AUTHORED here (no next-decision AI route yet).
//  • Reconciliation over the outcome genuinely runs (reconcile.ts).

import type { Inputs, Next, Outcome, Stage3 } from "./schema";
import type { OutcomeMove } from "./taxonomy";

export type ExampleKey = "commerce_leakage" | "growth_driver";

const ILLUSTRATIVE = "ILLUSTRATIVE — fictional example numbers";

export const EXAMPLE_A_INPUTS: Inputs = {
  brand_label: "Illustrative skincare brand (fictional)",
  category: "Skincare — serum, marketplace + brand-site sales",
  market: "Indonesia",
  territory: "commerce_leakage",
  execution_owner: { label: "McCann Indonesia", type: "agency" },
  commercial_pressure:
    "Traffic investment has risen for two periods and finance wants to cut brand spend because traffic growth is not showing up as purchases.",
  decision_question:
    "Why is rising interest not becoming product choice, and what should change before more traffic is bought?",
  decision_owner: "Head of E-commerce (client)",
  objective:
    "Raise the share of product-page visitors who choose and buy, without relying on additional discounting.",
  evidence: [
    { id: "ev_1", label: "Site traffic", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "traffic", base_period: "prior 4 weeks = 100", baseline: 100, current: 130, unit: "index", text: ILLUSTRATIVE, source_label: "Client e-commerce dashboard (indexed)", source_date: "2026-09-28", owner: "Client e-commerce team" },
    { id: "ev_2", label: "Product-page (PDP) visits", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "pdp_visits", base_period: "prior 4 weeks = 100", baseline: 100, current: 125, unit: "index", text: ILLUSTRATIVE, source_label: "Client e-commerce dashboard (indexed)", source_date: "2026-09-28", owner: "Client e-commerce team" },
    { id: "ev_3", label: "Add-to-cart rate", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "add_to_cart_rate", base_period: "prior 4 weeks = 100", baseline: 100, current: 96, unit: "index", text: ILLUSTRATIVE, source_label: "Client e-commerce dashboard (indexed)", source_date: "2026-09-28", owner: "Client e-commerce team" },
    { id: "ev_4", label: "PDP-to-purchase conversion", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "pdp_to_purchase", base_period: "prior 4 weeks = 100", baseline: 100, current: 84, unit: "index", text: ILLUSTRATIVE, source_label: "Client e-commerce dashboard (indexed)", source_date: "2026-09-28", owner: "Client e-commerce team" },
    { id: "ev_5", label: "Average discount depth", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "discount_depth", base_period: "prior 4 weeks = 100", baseline: 100, current: 102, unit: "index", text: ILLUSTRATIVE, source_label: "Client pricing/promo log (indexed)", source_date: "2026-09-28", owner: "Client commerce team" },
    { id: "ev_6", label: "Content engagement on owned and creator posts", mode: "client_statement", class: "known", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Client reports engagement is at or above prior-period levels. No figures supplied. " + ILLUSTRATIVE, source_label: "Client brand team statement", source_date: "2026-09-28", owner: "Client brand team" },
    { id: "ev_7", label: "Public proof architecture: this brand's product page vs the two closest competitors' pages", mode: "public_observation", class: "known", grade: "public_observation", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Both competitor pages show a usage demonstration and a named expert endorsement high on the page; this brand's page leads with a hero image and claim text. Observed publicly by ShiftImpact; not verified with the competitors.", source_label: "ShiftImpact public page review", source_date: "2026-09-30", owner: "ShiftImpact" },
    { id: "ev_8", label: "Shopper objections / reasons for hesitation", mode: "client_statement", class: "unknown", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "No review analysis, support-ticket themes or shopper research supplied.", source_label: "Gap — nothing supplied", source_date: "2026-09-28", owner: "Client" },
    { id: "ev_9", label: "SKU-level stock availability during the period", mode: "client_statement", class: "unknown", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Not supplied. Availability could affect conversion independently of content.", source_label: "Gap — nothing supplied", source_date: "2026-09-28", owner: "Client commerce team" },
    { id: "ev_10", label: "Traffic source mix and its change", mode: "client_statement", class: "unknown", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Not supplied, so a change in traffic quality cannot be ruled in or out.", source_label: "Gap — nothing supplied", source_date: "2026-09-28", owner: "Client e-commerce team" },
    { id: "ev_11", label: "Whether a proof-led product page changes decision-point conversion with price and discount held constant", mode: "client_statement", class: "test_required", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Cannot be settled from existing data; requires a comparison.", source_label: "Test required", source_date: "2026-09-30", owner: "ShiftImpact" },
  ],
  calendar: [
    { label: "Marketplace 11.11 sale", window: "around 11 Nov (confirm exact marketplace calendar)", effect: "Platform-wide discounting and traffic surge would swamp a product-page proof test." },
    { label: "Marketplace 12.12 / Harbolnas", window: "around 12 Dec (confirm exact marketplace calendar)", effect: "Same: promotion-driven traffic distorts conversion comparisons." },
  ],
  holdable: ["price", "discount depth on test SKUs", "audience targeting", "media weight on test SKUs", "stock allocation"],
  not_holdable: ["marketplace-run sale events", "competitor pricing"],
  client_constraints: [
    "Raw row-level data will not be shared; indexed or aggregated figures only.",
    "Client can nominate a matched set of untreated SKUs with similar traffic and price band.",
    "Client can change product-page content on a bounded set of SKUs.",
  ],
};

export const EXAMPLE_B_INPUTS: Inputs = {
  brand_label: "Illustrative household-care brand (fictional)",
  category: "Household care — marketplace sales with affiliate programme",
  market: "Indonesia",
  territory: "demand_quality",
  execution_owner: { label: "McCann Indonesia", type: "agency" },
  commercial_pressure:
    "Sales have grown strongly and the board wants the affiliate budget scaled next quarter, but margin is weakening.",
  decision_question: "What is actually carrying growth, and is it the kind of growth worth scaling?",
  decision_owner: "Commercial Director (client)",
  objective:
    "Decide whether to scale, hold or reshape affiliate and promotion investment without damaging margin or repeat behaviour.",
  evidence: [
    { id: "ev_1", label: "Gross merchandise value (GMV)", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "gmv", base_period: "prior quarter = 100", baseline: 100, current: 128, unit: "index", text: ILLUSTRATIVE, source_label: "Client finance/commerce reporting (indexed)", source_date: "2026-09-30", owner: "Client commerce team" },
    { id: "ev_2", label: "Affiliate-attributed orders", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "affiliate_orders", base_period: "prior quarter = 100", baseline: 100, current: 140, unit: "index", text: ILLUSTRATIVE, source_label: "Affiliate platform report (indexed)", source_date: "2026-09-30", owner: "Client commerce team" },
    { id: "ev_3", label: "Discount intensity", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "discount_intensity", base_period: "prior quarter = 100", baseline: 100, current: 118, unit: "index", text: ILLUSTRATIVE, source_label: "Client pricing/promo log (indexed)", source_date: "2026-09-30", owner: "Client commerce team" },
    { id: "ev_4", label: "Repeat purchase rate", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "repeat_rate", base_period: "prior quarter = 100", baseline: 100, current: 101, unit: "index", text: ILLUSTRATIVE, source_label: "Client CRM summary (indexed)", source_date: "2026-09-30", owner: "Client CRM team" },
    { id: "ev_5", label: "Gross margin", mode: "indexed", class: "known", grade: "aggregated_indexed", metric_key: "margin", base_period: "prior quarter = 100", baseline: 100, current: 93, unit: "index", text: ILLUSTRATIVE, source_label: "Client finance (indexed)", source_date: "2026-09-30", owner: "Client finance" },
    { id: "ev_6", label: "Category re-purchase cycle", mode: "client_statement", class: "known", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Client states the typical re-purchase cycle for this category is long (roughly a quarter or more), so a flat repeat reading over one quarter may be partly timing. " + ILLUSTRATIVE, source_label: "Client commercial team statement", source_date: "2026-09-30", owner: "Client commercial team" },
    { id: "ev_7", label: "Affiliate incentive structure", mode: "client_statement", class: "known", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Client states affiliate incentives are largely tied to discount-led offers. " + ILLUSTRATIVE, source_label: "Client commercial team statement", source_date: "2026-09-30", owner: "Client commercial team" },
    { id: "ev_8", label: "Promotion vs full-price order mix", mode: "client_statement", class: "unknown", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Not supplied.", source_label: "Gap — nothing supplied", source_date: "2026-09-30", owner: "Client commerce team" },
    { id: "ev_9", label: "New vs repeat customer split of the growth", mode: "client_statement", class: "unknown", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Not supplied.", source_label: "Gap — nothing supplied", source_date: "2026-09-30", owner: "Client CRM team" },
    { id: "ev_10", label: "Overlap between affiliate-attributed orders and demand that would have arrived anyway (organic / branded)", mode: "client_statement", class: "unknown", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Not measurable from supplied data.", source_label: "Gap — nothing supplied", source_date: "2026-09-30", owner: "Client" },
    { id: "ev_11", label: "Whether volume holds when promotion depth is reduced on a bounded set of products", mode: "client_statement", class: "test_required", grade: "client_reported", metric_key: "", base_period: "", baseline: null, current: null, unit: "text", text: "Requires a bounded comparison; cannot be inferred from existing data.", source_label: "Test required", source_date: "2026-09-30", owner: "ShiftImpact" },
  ],
  calendar: [
    // Market-neutral: no named event or window is assumed before a real pilot is scoped.
    { label: "Commercial, platform and seasonal calendar", window: "to be agreed against the actual commercial calendar (not supplied)", effect: "Major promotional, platform or seasonal events would materially confound a promotion-reduction read." },
  ],
  holdable: ["affiliate content approach", "listing content", "media weight", "price list", "stock", "SKU set", "affiliate budget", "creator roster"],
  not_holdable: ["marketplace-run sale events"],
  client_constraints: [
    "Cannot pause the affiliate programme business-wide; can vary offer depth on a bounded subset of products or regions.",
    "Indexed or aggregated figures only; no raw order-level data shared.",
    "Client can nominate a comparison set of similar products/regions.",
  ],
};

export const EXAMPLES: Record<
  ExampleKey,
  {
    title: string;
    inputs: Inputs;
    /** Guardrail actuals matched by regex against measure key/label; primary actual given separately. */
    primaryActual: number;
    /** Primary actual chosen by regex on the generated primary measure; falls back to primaryActual. */
    primaryActuals: { match: RegExp; value: number }[];
    guardrailActuals: { match: RegExp; value: number; byUnit?: Partial<Record<string, number>> }[];
    interpretation: string;
    next: Next;
  }
> = {
  commerce_leakage: {
    title: "Example A — Commerce Leakage: interest is not becoming product choice (ILLUSTRATIVE)",
    inputs: EXAMPLE_A_INPUTS,
    primaryActual: 14,
    primaryActuals: [],
    guardrailActuals: [
      { match: /margin/i, value: -0.5 },
      { match: /volume.*(retain|share)|(retain|share).*volume/i, value: 0.93 },
      { match: /discount/i, value: 101 },
      { match: /visit|traffic/i, value: -2 },
      { match: /add.?to.?cart|atc/i, value: 1 },
      { match: /stock|avail/i, value: 97 },
      { match: /mix|source/i, value: 0 },
    ],
    interpretation:
      "Illustrative outcome. The proof-led treatment set cleared the agreed relative-conversion threshold against its matched comparison set, with every guardrail holding and held-constants verified. This is consistent with decision-point proof being a constraint on conversion in this setting; as a matched comparison it carries medium evidence strength and does not establish incrementality at scale.",
    next: {
      is_authored: true,
      move: "strengthen",
      rationale:
        "Illustrative. A clean pass on a matched comparison supports extending the proof architecture to additional SKUs before adding awareness spend.",
      next_question:
        "Does expert-led reassurance outperform peer testimonial as the proof carrier for this category?",
      test_role: "explore",
    },
  },
  growth_driver: {
    title: "Example B — Growth Driver: what is carrying growth? (ILLUSTRATIVE)",
    inputs: EXAMPLE_B_INPUTS,
    primaryActual: -9,
    primaryActuals: [
      { match: /margin/i, value: 4.1 },
      { match: /volume|order|gmv/i, value: -9 },
    ],
    guardrailActuals: [
      { match: /margin/i, value: 4.1 },
      { match: /volume|order/i, value: -9 },
      // The drafted measure may be an absolute index OR a relative difference vs the
      // matched comparison (pct_change / pct_points); the authored actual must use the
      // same unit, otherwise a unit mismatch reads as a false guardrail breach.
      { match: /discount/i, value: 109, byUnit: { pct_change: -6, pct_points: -6 } },
      { match: /repeat/i, value: 99, byUnit: { pct_change: 1, pct_points: 1 } },
      { match: /new.?customer|customer/i, value: 0 },
      { match: /brand|search|demand/i, value: 0 },
    ],
    interpretation:
      "Illustrative outcome. On the bounded comparison set, reducing promotion depth retained order volume within the agreed limit while improving contribution margin beyond the threshold. This is consistent with part of the recent growth being promotion-dependent without being fully lost when depth is reduced; it does not by itself show how much of the affiliate volume is incremental.",
    next: {
      is_authored: true,
      move: "strengthen",
      rationale:
        "Illustrative. Order volume held within the agreed limit and margin improved on the bounded set, so reduced promotion depth can be extended to further products, and affiliate budget held flat rather than scaled, before any increase is considered.",
      next_question:
        "Can stronger product-value content reduce promotional dependence further on the products where offer depth was reduced?",
      test_role: "explore",
    },
  },
};

/**
 * The authored next decision, with its move aligned to the computed
 * reconciliation draft (the strategist "approves" the draft). If the result is
 * inconclusive the authored move is kept as the retest framing.
 */
export function buildIllustrativeNext(key: ExampleKey, suggested: OutcomeMove): Next {
  const ex = EXAMPLES[key];
  return suggested === "inconclusive" ? ex.next : { ...ex.next, move: suggested };
}

/**
 * Builds the authored (illustrative) outcome from the generated Stage 3
 * measures. Guardrail values are matched by regex against key/label; an
 * unmatched guardrail is set exactly at its threshold (passes, flagged in the
 * returned notes) so nothing is silently fabricated beyond the example.
 */
export function buildIllustrativeOutcome(
  key: ExampleKey,
  stage3: Stage3,
): { outcome: Outcome; notes: string[] } {
  const ex = EXAMPLES[key];
  const notes: string[] = [];
  const readings: Outcome["readings"] = stage3.measures.map((m) => {
    if (m.unit === "pass_fail") return { measure_key: m.key, value: null, passed: true };
    if (m.role === "primary") {
      const p = ex.primaryActuals.find((g) => g.match.test(`${m.key} ${m.label}`));
      return { measure_key: m.key, value: p ? p.value : ex.primaryActual, passed: null };
    }
    const hit = ex.guardrailActuals.find((g) => g.match.test(`${m.key} ${m.label}`));
    if (hit) return { measure_key: m.key, value: hit.byUnit?.[m.unit] ?? hit.value, passed: null };
    notes.push(`No authored actual matched guardrail "${m.key}" — set at threshold; review it.`);
    return { measure_key: m.key, value: m.threshold, passed: null };
  });
  return {
    outcome: {
      is_illustrative: true,
      readings,
      treatment_delivered: true,
      deviations: [],
      held_constant_check: stage3.test.held_constant.map((h) => ({ item: h.item, status: "held" as const })),
      interpretation: ex.interpretation,
    },
    notes,
  };
}
