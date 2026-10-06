// Run: npx tsx lib/growth-decision/lint-push.test.ts
import fs from "node:fs";
import { Stage2V } from "./schema";
import { EXAMPLE_A_INPUTS } from "./examples";
import { parseInputs } from "./draft";
import { lintPush } from "./lint-push";

const inputs = parseInputs(EXAMPLE_A_INPUTS);
const base = JSON.parse(fs.readFileSync("scripts/fixtures/blueprint-demo/commerce_leakage.stage2.json", "utf8"));
let failed = 0;
const ok = (name: string, cond: boolean) => { console.log(`${cond ? "✔" : "✖"} ${name}`); if (!cond) failed += 1; };

const mk = (push: unknown) => {
  const r = Stage2V.parse({ ...base, push_the_brief: push });
  if (!r.ok) throw new Error("schema: " + JSON.stringify(r.issues));
  return r.value;
};

const common = {
  category_hygiene: ["A clear application sequence on the product page", "A named authority signal on the page"],
  parity_catchup: [{ item: "Place usage demonstration and expert endorsement high on the product page", evidence_ids: ["ev_7"] }],
  proof_mechanic: { mechanic: "diagnostic_explanation", statement: "Let the shopper test their own hesitation against the proof on the product page before buying.", what_it_makes_visible: "Whether the claim fits their situation.", limit: "Cannot fix a product claim that is weak.", basis: "hypothesis", evidence_ids: [] },
  creative_challenge: "How does a shopper who already likes the product discover why it is right for them on this page?",
  avoid: [{ default: "Claim repetition without proof", why_weak: "Adds exposure but no decision value at the point of choice." }, { default: "Decorative authority badge", why_weak: "Signals approval without settling any specific doubt." }, { default: "Generic usage sequence", why_weak: "Shows procedure but does not show fit for the shopper." }],
};

// ── generic output (what the last run produced, in the new shape) ──
const generic = mk({
  ...common,
  strategic_edge: [{ edge: "Place usage demonstration and expert endorsement high on the product page", beyond_parity: "Competitors place proof high on the page, we do too.", why_stronger: "Proof must appear where the hesitation is active.", basis: "evidenced", evidence_ids: ["ev_7"] }],
  strategic_move: { seeds_used: ["proof_into_diagnosis"], adapted_statement: "Turn proof into diagnosis for the shopper", how_adapted: "Used as is for this brand without change.", evidence_for_choosing: "Conversion is low at the moment.", cannot_solve: "Cannot fix a weak product.", basis: "hypothesis", evidence_ids: [] },
  stretch_territories: [
    { name: "The Doubt Test", direction: "Identify the hesitation a shopper has and answer it visibly", tension: "Shoppers have hesitations about products they consider buying", beyond_parity: "More than generic proof", built_from: ["expose_decision_gap"], must_be_true: ["Objection data supplied"], cannot_solve: "Cannot fix weak products", differs_from_others: "Different from the others in approach", why_not_hygiene: "It is more than competent execution because it is specific", basis: "hypothesis", evidence_ids: [] },
    { name: "Decision Shortcut", direction: "Compress proof so shoppers decide faster", tension: "Shoppers have little time to decide", beyond_parity: "Faster than the other approaches", built_from: ["compress_proof_around_tension"], must_be_true: ["Time is short"], cannot_solve: "Cannot fix complex purchases", differs_from_others: "Different focus on speed", why_not_hygiene: "It is more than competent execution because it is faster", basis: "hypothesis", evidence_ids: [] },
  ],
});
const gv = lintPush(generic, inputs);
gv.forEach((v) => console.log("   ·", v.path, "—", v.detail.slice(0, 90)));
ok("generic: stock territory names rejected", gv.filter((v) => /stock label/.test(v.detail)).length === 2);
ok("generic: uncited tension rejected", gv.some((v) => /cite the evidence/.test(v.detail)));
ok("generic: not-case-specific rejected", gv.some((v) => /case anchors|cite at least one evidence/.test(v.detail)));
ok("generic: parity edge rejected", gv.some((v) => /restates a parity/.test(v.detail)));
ok("generic: unadapted seed rejected", gv.some((v) => /seed label|too close to the seed/.test(v.detail)));

// ── case-specific output passes ──
const good = mk({
  ...common,
  strategic_edge: [{ edge: "Let the shopper settle the fit question on the page itself, which neither competitor page is evidenced to help with", beyond_parity: "Competitors carry a demonstration and a named expert [ev_7]; the evidence does not show that either helps a shopper judge personal fit, so this is a hypothesis about a gap.", why_stronger: "Converts passive proof into a decision the shopper makes.", basis: "hypothesis", evidence_ids: ["ev_7"] }],
  strategic_move: { seeds_used: ["proof_into_diagnosis", "expose_decision_gap"], adapted_statement: "Where product-page visits rose while purchase conversion fell with discount depth flat, give a visitor a way to judge fit before the add-to-cart step instead of reading another claim", how_adapted: "Combined diagnosis with locating the decision gap: the drop is between page visit and purchase, so the diagnosis is placed at that step and limited to what the brand's approved claims allow.", evidence_for_choosing: "ev_2, ev_4 and ev_5 locate the loss between page visit and purchase with price held flat.", cannot_solve: "Hesitation that is about availability or traffic quality, which ev_9 and ev_10 leave open.", basis: "hypothesis", evidence_ids: ["ev_2", "ev_4", "ev_5"] },
  stretch_territories: [
    { name: "Fit before cart", direction: "Give visitors who arrive interested a way to establish whether the serum suits their situation before they reach the add-to-cart step, so conversion on added traffic is not lost to unresolved fit doubt", tension: "Product-page visits rose to index 125 [ev_2] but PDP-to-purchase conversion fell to index 84 [ev_4] with discount depth flat [ev_5]: interest arrives and does not become purchase", beyond_parity: "Matching the competitors' high-page proof [ev_7] gets proof onto the page; this asks the proof to settle personal fit.", built_from: ["proof_into_diagnosis"], must_be_true: ["The brand supplies review or support themes naming fit-related doubts [ev_8]", "Approved claims permit fit guidance"], cannot_solve: "Stock gaps [ev_9] or low-intent traffic [ev_10]", differs_from_others: "Targets purchase doubt at the page, where the others target page structure or traffic quality.", why_not_hygiene: "Hygiene adds proof elements; this makes the visitor use proof to reach a personal conclusion, which a competent page does not require.", basis: "hypothesis", evidence_ids: ["ev_2", "ev_4", "ev_5"] },
    { name: "Added traffic, thinner patience", direction: "Assume the extra visitors behind the traffic index of 130 [ev_1] are less willing to read, and make the single decisive proof reachable in moments so conversion on the added share is not lost", tension: "Traffic rose to index 130 [ev_1] faster than page visits [ev_2] while purchase conversion fell [ev_4], consistent with added visitors who skim", beyond_parity: "Competitor pages stack proof high [ev_7]; this decides which single proof matters most for a skimming visitor.", built_from: ["compress_proof_around_tension"], must_be_true: ["Traffic source mix shows the added visitors are lower intent [ev_10]", "The decisive proof item is identified from objection data [ev_8]"], cannot_solve: "A page problem that exists for high-intent visitors too", differs_from_others: "Rests on the traffic-quality tension and a compressed proof, not on personal fit.", why_not_hygiene: "Hygiene completes the proof set; this chooses what to leave out for a skimming audience and defends the choice.", basis: "hypothesis", evidence_ids: ["ev_1", "ev_2", "ev_4"] },
  ],
});
const okv = lintPush(good, inputs);
okv.forEach((v) => console.log("   ·", v.path, "—", v.detail.slice(0, 120)));
ok("case-specific territories + moves pass", okv.length === 0);

// physical attributes
const phys = mk({ ...common, strategic_edge: good.push_the_brief!.strategic_edge, strategic_move: good.push_the_brief!.strategic_move, stretch_territories: good.push_the_brief!.stretch_territories, avoid: [...common.avoid.slice(0, 2), { default: "A demonstrator whose skin tone differs from the target shopper", why_weak: "Reduces recognisability for the target shopper at the point of choice." }] });
ok("physical-attribute language rejected", lintPush(phys, inputs).some((v) => /casting/.test(v.detail)));

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("all push-lint tests pass");
