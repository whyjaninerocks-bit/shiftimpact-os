#!/usr/bin/env npx tsx
// ============================================================================
// Growth Driver — deterministic curation of the saved production draw.
// ============================================================================
// Growth Driver is a commercial / pricing-led intervention, NOT a content test.
//   • controlled variable = offer / discount depth only (held by the client)
//   • the AGENCY owns the activation architecture around it: five client-facing deliverables
//     (see intervention-types.ts), kept separate from what the client / platform must enable
//   • no new content, PDP proof, creator strategy or listing content (later decisions only)
//   • timing is market-neutral: no named events, no hard-coded window or duration
//   • relative-difference measures carry no index baselines (units must match)
// Raw draws are left untouched; curated copies go to scripts/fixtures/blueprint-curated.
//
//   npx tsx scripts/blueprint-curate-growth-driver.ts
import fs from "node:fs";
import { Stage1V, Stage2V, Stage3V } from "../lib/growth-decision/schema";
import { INTERVENTION_TYPE_DEFS } from "../lib/growth-decision/intervention-types";

const IN = "scripts/fixtures/blueprint-prod";
const OUT = "scripts/fixtures/blueprint-curated";
const read = (n: number) => JSON.parse(fs.readFileSync(`${IN}/growth_driver.stage${n}.json`, "utf8"));
const replaceIn = (s: string, from: string, to: string, what: string) => {
  if (!s.includes(from)) throw new Error(`curation anchor not found: ${what}`);
  return s.replace(from, to);
};
/** Apply fn to every string leaf. */
const mapStrings = (v: unknown, fn: (s: string) => string): unknown => {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]));
  return v;
};

const TIMING_STATEMENT =
  "Test window to be agreed against the actual commercial calendar. Avoid major promotional, platform or seasonal events that would materially confound the read. Duration should be sufficient to produce a readable sample and should not be hard-coded before a real pilot is scoped.";

// ─── Stage 1: keep the evidence read; one controlled variable; market-neutral timing ───
let s1 = read(1);
s1 = mapStrings(s1, (t) => {
  t = t.replace(
    /The test window must be scheduled outside the 11\.11 and 12\.12 \/ Harbolnas platform-wide sale periods, as those events would swamp any promotion-reduction signal on the comparison set\./,
    "The test window is to be agreed against the actual commercial calendar, avoiding major promotional, platform or seasonal events that would materially confound the read.",
  );
  t = t.replace(
    /scheduled outside the 11\.11 and 12\.12 platform sale windows where platform-wide promotion would swamp the signal/,
    "scheduled against the actual commercial calendar, clear of events that would confound the read",
  );
  return t;
}) as typeof s1;
{
  const d = s1.decision;
  d.what_changes = d.what_changes.map((x: string) => {
    if (x.startsWith("Affiliate incentive structure"))
      return "The affiliate incentive structure [ev_7] is reviewed as a planning exercise only; no incentive mechanic, content approach or creative changes on the test set while the test runs.";
    if (x.startsWith("The test is scheduled"))
      return "The test window is agreed against the actual commercial calendar, avoiding major promotional, platform or seasonal events that would materially confound the read.";
    return x;
  });
  d.what_stays = d.what_stays.map((x: string) =>
    x.startsWith("Media weight")
      ? "Offer depth is the only variable that changes. Affiliate content approach, listing content, creator roster, media weight, price list, stock, SKU set, affiliate budget and other promotional mechanics are held as they are."
      : x,
  );
}

// ─── Stage 2: commercial / pricing-led intervention ───
let s2 = read(2);
const def = INTERVENTION_TYPE_DEFS.commercial_pricing_led;
s2.intervention_type = def.type;
s2.intervention = {
  statement:
    "Reduce offer / discount depth on a client-nominated comparison set of products or regions, against a matched set that stays at current depth, so the single variable of promotion depth can be read against volume, margin and repeat behaviour. The client holds the commercial lever; the agency owns the activation architecture around it. Nothing else changes: affiliate content approach, listing content, creator roster, media weight, price list, stock, SKU set, affiliate budget and other promotional mechanics are held as they are.",
  controlled_variable: "Offer / discount depth on the affiliate-attributed comparison set (one reduced level, approved by the client)",
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
  // The evidence supports TESTING for promotional dependence, not confirming it.
  basis: "hypothesis",
  evidence_ids: ["ev_7", "ev_11", "ev_3", "ev_5"],
};
// "Reduce price dependence" is a secondary job of the same hypothesis; it is not evidenced either.
s2.behavioural_job.basis = "hypothesis";
// Content-specific sections do not apply to this type; they are held constant.
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
  { environment: "Affiliate programme (business-wide, outside the comparison set)", role: "conversion", job: "Continues at current offer depth and incentive structure so the business keeps its volume and the matched comparison set has a stable baseline." },
];
// Client / platform-controlled levers live in client_platform_enablers, not here.
s2.commerce_roles = [];
s2.execution_choices = [
  {
    question: "Should the test change anything other than offer depth?",
    recommended: "No. Offer depth is the only controlled variable; affiliate content approach, creative, listing content, creator roster, media weight, price list, stock, SKU set and affiliate budget stay as they are.",
    why: "The decision is whether volume is promotion-dependent. A second change would make any volume movement consistent with either change, so the test could not settle the decision.",
    alternative_not_chosen: "Pairing the reduction with new value-led content or new listing proof",
    basis: "evidenced",
    evidence_ids: ["ev_7", "ev_11"],
  },
  {
    question: "Should one reduced offer depth be tested or several at once?",
    recommended: "One reduced depth on the comparison set, approved by the client finance team against its own margin recovery target.",
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
    question: "When should the test run, and for how long?",
    recommended: TIMING_STATEMENT,
    why: "The calendar, and what counts as a readable sample, can only be judged against a real pilot's commercial calendar and volumes. Fixing either now would be a guess.",
    alternative_not_chosen: "Fixing a start date and duration before a real pilot is scoped",
    basis: "hypothesis",
    evidence_ids: ["ev_11"],
  },
];
// Agency actions only. Anything the client or platform supplies is in client_platform_enablers.
s2.execution_owner_asks = [
  "Lead the decision-framing and test-design conversations with the client, and record the agreed decision question, tolerance, sets and single reduced depth before anything launches.",
  "Run the Readiness & Control Gate as a go / no-go: no launch until every enabler is confirmed in writing and deployment is verified on the comparison set only.",
  "Hold the control plan for every held-constant, keep the deviation log, and escalate the same day a condition moves.",
  "Deliver the activation readout (delivery and test conditions only, not the verdict) and a next-activation recommendation that is conditional on the reconciled result.",
];
s2.push_the_brief = null;
// The execution package for this intervention type: five agency deliverables, and — separately —
// the client / platform enablers. Materialised from the authored library so the Blueprint is a
// self-contained record.
s2.agency_deliverables = def.deliverables.map((d) => ({ ...d }));
s2.client_platform_enablers = def.enablers.map((e) => ({ ...e }));

// ─── Stage 3: offer-depth-only treatment, market-neutral timing, price list held, unit-consistent measures ───
const s3 = read(3);
s3.test.treatment =
  "On the client-nominated comparison set only: offer / discount depth on affiliate-attributed orders is reduced to one level approved by the client finance and commerce teams against their own margin recovery target. Nothing else changes: affiliate content approach, listing content, creator roster, media weight, price list, stock, SKU set, affiliate budget and other promotional mechanics are held as they are, and no new proof or content is added to the listing or the affiliate content. Comparison-set buyers are tagged in the CRM for repeat tracking.";
s3.test.design_rationale = s3.test.design_rationale + " " + TIMING_STATEMENT + " The primary volume read comes inside the window; the repeat read is directional only because of the long re-purchase cycle [ev_6].";
s3.test.duration_weeks = null;
s3.test.calendar_confounds = [
  {
    event: "Commercial, platform and seasonal calendar (not supplied)",
    risk: "A major promotional, platform or seasonal event touching either group could change traffic and volume independently of offer depth and swamp the read.",
    mitigation: TIMING_STATEMENT + " Any unplanned event that hits either group makes the result inconclusive.",
  },
];
s3.test.held_constant = [
  { item: "Affiliate content approach and listing content", how_verified: "Execution owner supplies the current content brief at launch and confirms in writing each week that no new content direction, creative or listing proof was issued for either group; any change is logged as a confound." },
  { item: "Price list", how_verified: "Client commerce team confirms the list price on both groups is unchanged, and shares a weekly price-list check for the test window." },
  { item: "Creator roster on the comparison set", how_verified: "Execution owner provides a named list of active affiliates at launch; any addition or removal is flagged immediately and logged against the test record." },
  { item: "Media weight", how_verified: "Client commerce team confirms paid media spend and targeting on both groups are unchanged; any unplanned activation is logged and assessed." },
  { item: "Stock availability", how_verified: "Client commerce team confirms stock is sufficient on both groups; any stock-out is flagged, and the affected SKU or region is excluded from the final read." },
  { item: "SKU set", how_verified: "Client commerce team fixes the SKU list for each group at launch; any addition or removal is logged and the SKU is excluded from the read." },
  { item: "Affiliate budget (business-wide)", how_verified: "Client commerce team confirms total affiliate spend is unchanged from its prior level; execution owner supplies a weekly spend report against the indexed baseline." },
  { item: "Other promotional mechanics (vouchers, bundles, platform promotions) where feasible", how_verified: "Client commerce team shares a promotion log for both groups at launch and weekly; any change is logged and any mechanic that cannot be held is recorded as a deviation." },
];
for (const m of s3.measures) {
  // Relative-difference measures carry no index baseline: an index baseline on a pct_change
  // measure is a unit mismatch.
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
s3.signals.inconclusive = s3.signals.inconclusive.replace(
  /\(11\.11, 12\.12, or an unconfirmed calendar event\)/,
  "(or any unplanned promotional, platform or seasonal event)",
);
s3.decision_rule.statement = replaceIn(
  s3.decision_rule.statement,
  "all held-constants — affiliate budget, media weight, price list, stock, creator roster — are verified",
  `all held-constants — ${held} — are verified`,
  "decision_rule held-constant list",
);
// Any other residual named event in Stage 3 free text: neutralise.
const s3n = mapStrings(s3, (t) =>
  t
    .replace(/\s*\((?:around )?(?:11 November|12 December)[^)]*\)/g, "")
    .replace(/(?:the )?11\.11 and 12\.12(?: \/ Harbolnas)?(?: platform(?:-wide)? sale(?: periods| windows| events)?)?/g, "major promotional or platform events")
    .replace(/11\.11|12\.12|Harbolnas/g, "major promotional or platform event"),
) as typeof s3;

// ─── Basis: the two design choices that rest on a design judgement, not an evidenced finding ───
for (const q of [
  "Should the test change anything other than offer depth?",
  "Should one reduced offer depth be tested or several at once?",
]) {
  const c = s2.execution_choices.find((x: { question: string }) => x.question === q);
  if (!c) throw new Error(`execution choice not found: ${q}`);
  c.basis = "hypothesis";
}

// ─── Gross-margin guardrail: the treatment set's gross margin is compared with the matched comparison set's ───
{
  const m = s3n.measures.find((x: { key: string }) => x.key === "gross_margin_index_treatment");
  if (!m) throw new Error("gross margin measure not found");
  m.label = "Gross margin index: treatment set compared with matched comparison set — must not be lower";
  m.definition =
    "The gross margin index on the treatment set (reduced offer depth) compared with the matched comparison set (current offer depth) over the test window, expressed as a relative difference. The test is designed to recover margin; this guardrail checks that the treatment set's gross margin is not lower than the matched comparison set's (for example, because returns, fulfilment costs or affiliate fee structures offset the discount reduction). A proposed threshold of 0 percent relative difference is set: the treatment set's gross margin must be at or above the matched comparison set's. This is the minimum condition for the test to be commercially meaningful; if gross margin on the treatment set falls below that of the matched comparison set, the intervention has not achieved its stated purpose.";
  m.failure_condition =
    "The treatment set's gross margin index is lower than the matched comparison set's gross margin index over the test window, meaning the offer-depth reduction has not recovered margin and the intervention has not delivered its primary commercial rationale.";
}
// Stage 3 design rationale: name the two groups once, in the standard terms.
s3n.test.design_rationale = replaceIn(
  s3n.test.design_rationale,
  "a client-nominated set of products or regions (the treatment group) has promotion depth reduced, while a matched set of similar products or regions continues at current discount depth (the comparison group).",
  "a client-nominated treatment set of products or regions has promotion depth reduced, while a matched comparison set of similar products or regions continues at current discount depth.",
  "design_rationale group naming",
);

// ─── Group terminology: treatment set = reduced offer depth; matched comparison set = current offer depth ───
// In this design the bare words "comparison set" only ever meant the treated group, which is the ambiguity
// being removed. Order matters: normalise the explicit "comparison group" forms first.
const groupTerms = (t: string): string =>
  t
    .replace(/affiliate-active comparison set/g, "affiliate-active regions or products")
    .replace(/\bmatched comparison group(['’]s)?/g, (_m, p) => `matched comparison set${p ?? ""}`)
    .replace(/(?<!matched )\b(the )?comparison group(['’]s)?/g, (_m, the, p) => `${the ?? ""}matched comparison set${p ?? ""}`)
    .replace(/\btreatment group(['’]s)?/g, (_m, p) => `treatment set${p ?? ""}`)
    .replace(/(?<!matched )\bComparison-set\b/g, "Treatment-set")
    .replace(/(?<!matched )\bcomparison[- ]set\b/g, "treatment set")
    .replace(/(?<!comparison )\bmatched (sets?)\b/g, (_m, x) => `matched comparison ${x}`)
    .replace(/relative to the comparison, the intervention/g, "relative to the matched comparison set, the intervention");
s1 = mapStrings(s1, groupTerms) as typeof s1;
s2 = mapStrings(s2, groupTerms) as typeof s2;
const s3g = mapStrings(s3n, groupTerms) as typeof s3n;

// Guard: nothing may call the treated group a "comparison set", and no looser group names remain.
for (const [n, v] of [[1, s1], [2, s2], [3, s3g]] as const) {
  const txt = JSON.stringify(v);
  const bad = txt.match(/(?<!matched )comparison[- ]set|(?<!matched )comparison group|treatment group|\bmatched sets?\b|contribution margin|(?<!matched )(?<!the matched )\bthe comparison\b(?!["'])/i);
  if (bad) throw new Error(`Stage ${n}: residual group wording "${bad[0]}"`);
}

// ─── Guard: no named events or hard-coded window anywhere in the curated stages ───
const BANNED = /11\.11|12\.12|Harbolnas|Ramadan|Lebaran|January|pre-Ramadan|\b(?:four|4|six|6)[- ]weeks?\b/i;
for (const [n, v] of [[1, s1], [2, s2], [3, s3g]] as const) {
  const hit = JSON.stringify(v).match(BANNED);
  if (hit) throw new Error(`Stage ${n} still contains "${hit[0]}" — timing must stay market-neutral`);
}

// ─── Validate and write ───
const results = [Stage1V.parse(s1), Stage2V.parse(s2), Stage3V.parse(s3g)];
results.forEach((v, i) => {
  if (!v.ok) {
    console.error(`Stage ${i + 1} failed validation:\n` + v.issues.map((x) => ` - ${x.path} ${x.message}`).join("\n"));
    process.exit(1);
  }
});
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/growth_driver.stage1.json`, JSON.stringify(s1, null, 2));
fs.writeFileSync(`${OUT}/growth_driver.stage2.json`, JSON.stringify(s2, null, 2));
fs.writeFileSync(`${OUT}/growth_driver.stage3.json`, JSON.stringify(s3g, null, 2));
console.log(`curated growth_driver stages written to ${OUT}/ (raw draws untouched in ${IN}/)`);
