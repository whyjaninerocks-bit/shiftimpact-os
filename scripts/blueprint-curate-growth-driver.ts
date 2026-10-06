#!/usr/bin/env npx tsx
// ============================================================================
// Growth Driver — deterministic curation of the saved production draw.
// ============================================================================
// Growth Driver is a commercial pricing / promotion-dependency test, NOT a
// content test. The controlled variable is offer / discount depth only. This
// script takes the raw drafted stages (scripts/fixtures/blueprint-prod) and:
//   • removes the Push the Brief layer and every content / proof / creative change
//     from the active intervention (no second controlled variable),
//   • holds constant: affiliate content approach, listing content, creator roster,
//     media weight, price list, stock, SKU set, other promotional mechanics,
//   • replaces the 6-week window that straddled 11.11 / 12.12 with a post-12.12
//     (January) 4-week window that finishes before the pre-Ramadan season,
//   • drops baselines on relative-difference measures (units must match).
// Raw draws are left untouched; curated copies go to scripts/fixtures/blueprint-curated.
//
//   npx tsx scripts/blueprint-curate-growth-driver.ts
import fs from "node:fs";
import { Stage1V, Stage2V, Stage3V } from "../lib/growth-decision/schema";

const IN = "scripts/fixtures/blueprint-prod";
const OUT = "scripts/fixtures/blueprint-curated";
const read = (n: number) => JSON.parse(fs.readFileSync(`${IN}/growth_driver.stage${n}.json`, "utf8"));
const must = <T>(v: T | undefined | null, what: string): T => {
  if (v === undefined || v === null) throw new Error(`curation anchor missing: ${what}`);
  return v;
};
const replaceIn = (s: string, from: string | RegExp, to: string, what: string) => {
  const out = s.replace(from, to);
  if (out === s) throw new Error(`curation anchor not found: ${what}`);
  return out;
};

// ─── Stage 1: keep the evidence read; make the decision consistent with one controlled variable ───
const s1 = read(1);
{
  const d = s1.decision;
  d.what_changes = d.what_changes.map((x: string) => {
    if (x.startsWith("Affiliate incentive structure"))
      return "The affiliate incentive structure [ev_7] is reviewed as a planning exercise only; no incentive mechanic, content approach or creative changes on the test set while the test runs.";
    if (x.startsWith("The test is scheduled"))
      return "The test is scheduled clear of 11.11 and 12.12 / Harbolnas platform sale events — in practice a window that starts after 12.12 demand has normalised (January), not the gap between 11.11 and 12.12.";
    return x;
  });
  d.what_stays = d.what_stays.map((x: string) =>
    x.startsWith("Media weight")
      ? "Offer depth is the only variable that changes. Affiliate content approach, listing content, creator roster, media weight, price list, stock, SKU set and other promotional mechanics are held as they are."
      : x,
  );
  must(d.what_stays.find((x: string) => x.startsWith("Offer depth")), "what_stays rewrite");
  must(d.what_changes.find((x: string) => x.startsWith("The affiliate incentive structure")), "what_changes rewrite");
}

// ─── Stage 2: offer-depth-only intervention; no content / proof / creator change ───
const s2 = read(2);
s2.intervention = {
  statement:
    "Reduce offer / discount depth on a client-nominated comparison set of products or regions, against a matched set that stays at current depth, so the single variable of promotion depth can be read against volume, margin and repeat behaviour. Nothing else changes: affiliate content approach, creator roster, media weight, price list, stock, SKU set and other promotional mechanics are held as they are.",
  controlled_variable: "Offer / discount depth on the affiliate-attributed comparison set (one reduced level, set by the client)",
  preservation_constraints: [
    { item: "Affiliate content approach and listing content", why: "Any new content direction, creative or listing proof would add a second variable, and a volume change could then be consistent with either the content or the offer depth." },
    { item: "Creator roster", why: "A change in who is active would alter reach and audience quality alongside offer depth, so the two could not be separated." },
    { item: "Media weight", why: "A change in paid media would alter traffic composition and volume independently of offer depth." },
    { item: "Price list", why: "A list-price change would mix price-point sensitivity with promotion-depth sensitivity." },
    { item: "Stock", why: "A stock constraint would suppress volume for a reason unrelated to offer depth and give a false read of demand." },
    { item: "SKU set", why: "Adding or removing products on either group during the test would change the mix being compared." },
    { item: "Affiliate budget", why: "The programme continues business-wide at current investment; varying budget alongside offer depth would leave the result consistent with either." },
    { item: "Other promotional mechanics (vouchers, bundles, platform promotions) where feasible", why: "A second promotional change on either group would blur the read of offer depth; any that cannot be held are logged as deviations." },
  ],
  basis: "evidenced",
  evidence_ids: ["ev_7", "ev_11", "ev_3", "ev_5"],
};
s2.content_roles = [
  {
    role: "conversion",
    job: "Existing affiliate content continues unchanged on the comparison set and carries buyers to purchase as it does today. It is not a lever in this test: any change to its approach, creative or proof would add a second variable to the offer-depth read.",
    basis: "evidenced",
    evidence_ids: ["ev_7", "ev_11"],
  },
];
s2.proof_required = [];
s2.creator_role = {
  applicable: false,
  role: null,
  not_role: null,
  job: "Creator roster and creator briefs are held as they are for the test; creators are given no new role. Whether stronger product-value content can further reduce promotional dependence is a possible next decision, not part of this intervention.",
  selection_criteria: [],
  basis: "hypothesis",
};
s2.asset_architecture = null;
s2.platform_roles = [
  { environment: "Short-form affiliate video (comparison set)", role: "conversion", job: "Held constant: existing affiliate content continues unchanged. Only the offer depth the buyer meets at purchase differs between the comparison set and the matched set." },
  { environment: "Marketplace product listing (comparison set)", role: "product_evaluation", job: "Held constant: no new proof or content is added. The listing shows the reduced offer on the comparison set and the current offer on the matched set; nothing else changes." },
  { environment: "CRM / repeat-purchase tracking layer", role: "retention", job: "Held constant and observation-only: tracks whether buyers acquired at reduced offer depth return, read directionally because of the long re-purchase cycle." },
  { environment: "Affiliate programme (business-wide, outside the comparison set)", role: "conversion", job: "Continues at current offer depth and incentive structure so the business keeps its volume and the comparison has a stable baseline." },
];
s2.commerce_roles = [
  { role: "product_assignment", job: "Nominate the products or regions that form the comparison set and the matched set, and fix the SKU set for the test window.", controlled_by: "Client commerce team" },
  { role: "offer", job: "Set the single reduced offer depth on the comparison set against a margin recovery target; the depth is a client finance and commerce decision, not an execution decision.", controlled_by: "Client finance and commerce team" },
  { role: "handoff_to_purchase", job: "Make sure affiliate links and codes on the comparison set route to the correct listing at the test offer depth; a routing error would corrupt the read.", controlled_by: "Execution owner (affiliate tracking) and client commerce team (listing)" },
  { role: "retention", job: "Tag comparison-set buyers in the CRM so repeat behaviour can be tracked separately from the business-wide affiliate cohort.", controlled_by: "Client CRM team" },
];
s2.execution_choices = [
  {
    question: "Should the test change anything other than offer depth?",
    recommended: "No. Offer depth is the only controlled variable; affiliate content approach, creative, listing content, creator roster, media weight, price list, stock and SKU set stay as they are.",
    why: "The decision is whether volume is promotion-dependent. A second change would make any volume movement consistent with either change, so the test could not settle the decision.",
    alternative_not_chosen: "Pairing the reduction with new value-led content or new listing proof",
    basis: "evidenced",
    evidence_ids: ["ev_7", "ev_11"],
  },
  {
    question: "Should one reduced offer depth be tested or several at once?",
    recommended: "One reduced depth on the comparison set, set by the client finance team against a margin recovery target.",
    why: "Several depths would split the comparison set further and thin each cell, which is hard to read from aggregated indexed data, the only format the client can share.",
    alternative_not_chosen: "Several depths tested simultaneously across sub-sets",
    basis: "evidenced",
    evidence_ids: ["ev_11"],
  },
  {
    question: "Should the affiliate incentive mechanic be restructured or only the offer depth reduced within it?",
    recommended: "Reduce depth within the existing mechanic; do not restructure commission or incentive terms during this test.",
    why: "Restructuring the incentive at the same time would change creator motivation alongside offer depth. The incentive review stays a planning exercise until the result is known.",
    alternative_not_chosen: "Shifting to a full-price or lower-discount commission structure on the comparison set at the same time",
    basis: "evidenced",
    evidence_ids: ["ev_7", "ev_11"],
  },
  {
    question: "How should other promotional mechanics be handled on both groups?",
    recommended: "Hold vouchers, bundles and platform-run promotions at current settings where feasible; log every one that cannot be held as a deviation.",
    why: "Offer depth can only be read cleanly if no other promotional lever moves on either group. Where a lever is outside the client's control, it is recorded so the result can be qualified.",
    alternative_not_chosen: "Leaving other promotional mechanics unmonitored during the test",
    basis: "hypothesis",
    evidence_ids: ["ev_3", "ev_11"],
  },
  {
    question: "When should the test run?",
    recommended: "Start after 12.12 / Harbolnas demand has normalised (January) and finish before the pre-Ramadan season; exact dates come from the marketplace calendar.",
    why: "11.11 and 12.12 are about four and a half weeks apart, too close for a clean test plus run-in between them, and both would swamp a promotion-reduction signal.",
    alternative_not_chosen: "A window between 11.11 and 12.12",
    basis: "evidenced",
    evidence_ids: ["ev_11"],
  },
];
s2.execution_owner_asks = [
  "Confirm the client-nominated comparison set and matched set, the fixed SKU set for the test window, and the single reduced offer depth the client finance team has approved. The execution owner cannot determine any of these and must not proceed without them.",
  "Confirm the test window dates: a January start after 12.12 demand has normalised and an end before the pre-Ramadan season. Obtain the exact marketplace calendar, including any platform sale days, and document that none overlaps.",
  "Confirm in writing that affiliate content approach, listing content, creator roster, media weight, price list, stock and SKU set are unchanged on both groups, and log every other promotional mechanic that changes or cannot be held.",
  "Confirm that affiliate tracking tags comparison-set buyers separately from the business-wide cohort, and that no creator or programme term forces a different offer depth on the comparison set; flag any such term before launch.",
  "Obtain from the client commerce and CRM teams the promo-versus-full-price order mix [ev_8] and the new-versus-repeat customer split [ev_9] before launch; both are needed to interpret the result.",
];
s2.push_the_brief = null;

// ─── Stage 3: offer-depth-only treatment, January window, price list held, unit-consistent measures ───
const s3 = read(3);
s3.test.treatment =
  "On the client-nominated comparison set only: offer / discount depth on affiliate-attributed orders is reduced to one level set by the client finance and commerce teams against a margin recovery target. Nothing else changes: affiliate content approach, creator roster, media weight, price list, stock, SKU set and other promotional mechanics are held as they are, and no new proof or content is added to the listing or the affiliate content. Comparison-set buyers are tagged in the CRM for repeat tracking.";
s3.test.design_rationale = s3.test.design_rationale + " The window is four weeks, starting after 12.12 demand has normalised and finishing before the pre-Ramadan season; the primary volume read comes inside the window and the repeat read is directional only because of the long re-purchase cycle [ev_6].";
s3.test.duration_weeks = 4;
s3.test.calendar_confounds = [
  {
    event: "Marketplace 11.11 sale (around 11 November — exact date to be confirmed with the marketplace calendar)",
    risk: "Platform-wide promotion and the surrounding traffic surge would swamp any promotion-reduction signal.",
    mitigation: "No test activity before 11.11 has fully normalised; the window opens after 12.12.",
  },
  {
    event: "Marketplace 12.12 / Harbolnas (around 12 December — exact date to be confirmed)",
    risk: "Same distortion as 11.11. The gap between 11.11 and 12.12 (about four and a half weeks) is too short for a clean test plus run-in, so no window between the two is proposed.",
    mitigation: "Start in January, after 12.12 demand has normalised; the client commerce team confirms the clear date from the marketplace calendar.",
  },
  {
    event: "Early-2027 platform sale days and pre-Ramadan / Lebaran demand season (dates not supplied — client to confirm)",
    risk: "Month-start platform sale days or the shift in demand ahead of Ramadan could change traffic and volume on either group independently of offer depth.",
    mitigation: "The window is kept to four weeks so it can finish before the season begins. The client confirms the full marketplace and brand calendar before launch. Any unplanned event hitting either group makes the result inconclusive.",
  },
];
s3.test.held_constant = [
  { item: "Affiliate content approach and listing content", how_verified: "Execution owner supplies the current content brief at launch and confirms in writing each week that no new content direction, creative or listing proof was issued for either group; any change is logged as a confound." },
  { item: "Price list", how_verified: "Client commerce team confirms the list price on both groups is unchanged from the prior quarter, and shares a weekly price-list check for the test window." },
  { item: "Creator roster on the comparison set", how_verified: "Execution owner provides a named list of active affiliates at launch; any addition or removal is flagged immediately and logged against the test record." },
  { item: "Media weight", how_verified: "Client commerce team confirms paid media spend and targeting on both groups are unchanged; any unplanned activation is logged and assessed." },
  { item: "Stock availability", how_verified: "Client commerce team confirms stock is sufficient on both groups; any stock-out is flagged, and the affected SKU or region is excluded from the final read." },
  { item: "SKU set", how_verified: "Client commerce team fixes the SKU list for each group at launch; any addition or removal is logged and the SKU is excluded from the read." },
  { item: "Affiliate budget (business-wide)", how_verified: "Client commerce team confirms total affiliate spend is unchanged from the prior-quarter level; execution owner supplies a weekly spend report against the indexed baseline." },
  { item: "Other promotional mechanics (vouchers, bundles, platform promotions) where feasible", how_verified: "Client commerce team shares a promotion log for both groups at launch and weekly; any change is logged and any mechanic that cannot be held is recorded as a deviation." },
];
for (const m of s3.measures) {
  // Relative-difference measures carry no index baseline: a 93 / 101 / 118 index baseline on a
  // pct_change measure is a unit mismatch.
  if (m.unit === "pct_change" || m.unit === "pct_points") {
    m.baseline = null;
    m.baseline_source = null;
  }
}
const held = "affiliate content approach, listing content, price list, SKU set, media weight, stock, creator roster, affiliate budget, other promotional mechanics";
s3.signals.inconclusive = replaceIn(
  s3.signals.inconclusive,
  "any held-constant is found to have changed during the test window (media weight, stock, creator roster, affiliate budget)",
  `any held-constant is found to have changed during the test window (${held})`,
  "signals.inconclusive held-constant list",
);
s3.decision_rule.statement = replaceIn(
  s3.decision_rule.statement,
  "all held-constants — affiliate budget, media weight, price list, stock, creator roster — are verified",
  `all held-constants — ${held} — are verified`,
  "decision_rule held-constant list",
);

// ─── Validate and write ───
const v1 = Stage1V.parse(s1);
const v2 = Stage2V.parse(s2);
const v3 = Stage3V.parse(s3);
for (const [n, v] of [[1, v1], [2, v2], [3, v3]] as const) {
  if (!v.ok) {
    console.error(`Stage ${n} failed validation:\n` + v.issues.map((i) => ` - ${i.path} ${i.message}`).join("\n"));
    process.exit(1);
  }
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/growth_driver.stage1.json`, JSON.stringify(s1, null, 2));
fs.writeFileSync(`${OUT}/growth_driver.stage2.json`, JSON.stringify(s2, null, 2));
fs.writeFileSync(`${OUT}/growth_driver.stage3.json`, JSON.stringify(s3, null, 2));
console.log(`curated growth_driver stages written to ${OUT}/ (raw draws untouched in ${IN}/)`);
