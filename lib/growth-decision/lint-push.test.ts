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

const mk = (push: unknown, asks?: string[]) => {
  const r = Stage2V.parse({ ...base, execution_owner_asks: asks ?? base.execution_owner_asks, push_the_brief: push });
  if (!r.ok) throw new Error("schema: " + JSON.stringify(r.issues));
  return r.value;
};
const has = (v: ReturnType<typeof lintPush>, re: RegExp) => v.some((x) => re.test(x.detail));

const common = {
  category_hygiene: ["A clear application sequence on the product page", "A named authority signal on the page"],
  parity_catchup: [{ item: "Place usage demonstration and expert endorsement high on the product page", evidence_ids: ["ev_7"] }],
  proof_mechanic: { mechanic: "diagnostic_explanation", statement: "Let the shopper test their own hesitation against the proof on the product page before buying.", what_it_makes_visible: "Whether the claim fits their situation.", limit: "Cannot fix a product claim that is weak.", basis: "hypothesis", evidence_ids: [] },
  creative_challenge: "How does a shopper who already likes the product discover why it is right for them on this page?",
  avoid: [{ default: "Claim repetition without proof", why_weak: "Adds exposure but no decision value at the point of choice." }, { default: "Decorative authority badge", why_weak: "Signals approval without settling any specific doubt." }, { default: "Generic usage sequence", why_weak: "Shows procedure but does not show fit for the shopper." }],
};
const edge = { edge: "Let the shopper settle the fit question on the page itself, which neither competitor page is evidenced to help with", beyond_parity: "Competitors carry a demonstration and a named expert [ev_7]; the evidence does not show that either helps a shopper judge personal fit, so this is a hypothesis about a gap.", why_stronger: "Converts passive proof into a decision the shopper makes.", basis: "hypothesis", evidence_ids: ["ev_7"] };
const move = (seeds: string[]) => ({ seeds_used: seeds, seeds_rejected: [{ seed_id: "reframe_decision_criteria", why_less_appropriate: "No evidence that shoppers judge on a different criterion here." }, { seed_id: "assertion_to_observable", why_less_appropriate: "Approved claims are unknown, so showing a result is not safe yet." }], adapted_statement: "Where product-page visits rose while purchase conversion fell with discount depth flat, give a visitor a way to judge fit before the add-to-cart step instead of reading another claim", how_adapted: "Combined diagnosis with locating the decision gap: the drop is between page visit and purchase, so the diagnosis is placed at that step and limited to what approved claims allow.", evidence_for_choosing: "ev_2, ev_4 and ev_5 locate the loss between page visit and purchase with price held flat.", cannot_solve: "Hesitation that is about availability or traffic quality, which ev_9 and ev_10 leave open.", basis: "hypothesis", evidence_ids: ["ev_2", "ev_4", "ev_5"] });
const T = (o: Record<string, unknown>) => ({ name: "x", direction: "A generic direction that could apply to any brand at all", locus: "proof_content", tension: "A generic tension that names nothing in particular", beyond_parity: "Matching the competitors' high-page proof [ev_7] puts proof on the page; this goes further.", built_from: ["proof_into_diagnosis"], must_be_true: ["The brand supplies review or support themes [ev_8]"], cannot_solve: "Stock gaps [ev_9] or low-intent traffic [ev_10]", differs_from_edges: "Acts on a different thing than the edge does.", differs_from_others: "Targets a different tension than the others.", why_not_hygiene: "Hygiene adds proof elements; this makes the visitor reach a personal conclusion.", basis: "hypothesis", evidence_ids: ["ev_2", "ev_4"], ...o });

const tFit = T({ name: "Fit before cart", locus: "proof_content", direction: "Give visitors who arrive interested a way to establish whether the serum suits their situation before they reach the add-to-cart step, so conversion on added traffic is not lost to unresolved fit doubt", tension: "Product-page visits rose to index 125 [ev_2] but PDP-to-purchase conversion fell to index 84 [ev_4] with discount depth flat [ev_5]: interest arrives and does not become purchase", built_from: ["proof_into_diagnosis"] });
const tContinuity = T({ name: "Where the interest came from", locus: "journey_continuity", direction: "Treat the shopper as arriving from content that already earned interest [ev_6], and have the page pick up that thread instead of restarting with a hero image and claim text [ev_7], so the step from engagement to purchase does not reset", tension: "Engagement is at or above prior levels [ev_6] while PDP-to-purchase fell to index 84 [ev_4] and the page leads with a hero image and claim text [ev_7]: the page may reset what interest built", built_from: ["expose_decision_gap", "reframe_decision_criteria"], evidence_ids: ["ev_4", "ev_6", "ev_7"] });
const tCompare = T({ name: "The tab they already have open", locus: "comparison_context", direction: "Assume the shopper is comparing this page with the two competitor pages in another tab [ev_7], and help them make that comparison on the criterion that decides, instead of leaving them to make it unaided", tension: "Both closest competitors lead with demonstration and named expert [ev_7] while this brand leads with a hero image and claim text, and conversion on rising visits fell to index 84 [ev_4]", built_from: ["comparison_decision_useful"], evidence_ids: ["ev_4", "ev_7"] });

const tCompress = T({ name: "One proof for the skimmer", locus: "proof_sequence", direction: "Assume the added visitors behind the traffic index of 130 [ev_1] skim, and make the single decisive proof reachable in moments so conversion on the added share is not lost", tension: "Traffic rose to index 130 [ev_1] faster than page visits [ev_2] while purchase conversion fell [ev_4], consistent with added visitors who skim", built_from: ["compress_proof_around_tension"], evidence_ids: ["ev_1", "ev_2", "ev_4"] });

// ── 1. generic output ──
const generic = mk({
  ...common,
  strategic_edge: [{ ...edge, edge: "Place usage demonstration and expert endorsement high on the product page", beyond_parity: "Competitors place proof high on the page, we do too." }],
  strategic_move: { ...move(["proof_into_diagnosis"]), adapted_statement: "Turn proof into diagnosis for the shopper", how_adapted: "Used as is for this brand without change." },
  stretch_territories: [
    T({ name: "The Doubt Test", tension: "Shoppers have hesitations about products", evidence_ids: [] }),
    T({ name: "Decision Shortcut", tension: "Shoppers have little time", evidence_ids: [], built_from: ["compress_proof_around_tension"] }),
  ],
});
const gv = lintPush(generic, inputs);
ok("stock territory names rejected", gv.filter((v) => /stock label/.test(v.detail)).length === 2);
ok("uncited / unanchored tension rejected", has(gv, /cite the evidence|case anchors|cite at least one evidence/));
ok("parity-as-edge rejected", has(gv, /restates a parity/));
ok("unadapted seed rejected", has(gv, /seed label|too close to the seed/));
ok("duplicate locus rejected", has(gv, /distinct locus/));
ok("no frame-challenging territory rejected", has(gv, /something other than the proof itself/));

// ── 2. improved proof only: territories restate edge ──
const proofOnly = mk({ ...common, strategic_edge: [edge], strategic_move: move(["proof_into_diagnosis", "expose_decision_gap"]),
  stretch_territories: [tFit, T({ ...tFit, name: "Fit before the cart step", locus: "proof_sequence", built_from: ["expose_decision_gap"], tension: "Page visits rose to index 125 [ev_2] yet PDP-to-purchase fell to index 84 [ev_4] with discount depth flat [ev_5]: a shopper arrives interested and leaves without buying" })] });
const pv = lintPush(proofOnly, inputs);
ok("territories that only improve the proof are rejected (restate edge / no frame challenge)", has(pv, /restates the strategic edge/) && has(pv, /something other than the proof itself/));
ok("no unselected seed rejected", has(pv, /NOT selected in strategic_move/));

// ── 3. divergent output passes ──
const good = mk({ ...common, strategic_edge: [edge], strategic_move: move(["proof_into_diagnosis"]), stretch_territories: [tCompress, tContinuity, tCompare] });
const okv = lintPush(good, inputs);
okv.forEach((v) => console.log("   ·", v.path, "—", v.detail.slice(0, 140)));
ok("divergent territories (sequence / continuity / comparison) pass", okv.length === 0);

// ── 4. seeds_rejected cannot overlap used ──
const overlap = mk({ ...common, strategic_edge: [edge], strategic_move: { ...move(["proof_into_diagnosis"]), seeds_rejected: [{ seed_id: "proof_into_diagnosis", why_less_appropriate: "Used and rejected at once is a contradiction." }, { seed_id: "assertion_to_observable", why_less_appropriate: "Approved claims are unknown so this is unsafe." }] }, stretch_territories: [tCompress, tContinuity, tCompare] });
ok("seed both used and rejected is rejected", has(lintPush(overlap, inputs), /both used and rejected/));

// ── 5. unsupported market facts in hygiene ──
const mf = mk({ ...common, category_hygiene: ["Ensure the proof asset is watchable without audio given autoplay norms in the marketplace", "A named authority signal on the page"], strategic_edge: [edge], strategic_move: move(["proof_into_diagnosis"]), stretch_territories: [tCompress, tContinuity, tCompare] });
ok("unsupported market/platform norm in hygiene rejected", has(lintPush(mf, inputs), /market\/platform norm/));
const snd = mk({ ...common, category_hygiene: ["Ensure all proof assets are legible without sound, as product pages are frequently browsed where audio is not available", "A named authority signal on the page"], strategic_edge: [edge], strategic_move: move(["proof_into_diagnosis"]), stretch_territories: [tCompress, tContinuity, tCompare] });
ok("'legible without sound, as pages are frequently browsed…' rejected", has(lintPush(snd, inputs), /market\/platform norm/));
const ev = mk({ ...common, strategic_edge: [edge], strategic_move: { ...move(["proof_into_diagnosis"]), basis: "evidenced" }, stretch_territories: [tCompress, tContinuity, tCompare] });
ok("strategic_move tagged evidenced is rejected", has(lintPush(ev, inputs), /hypothesis to test/));
const reopen = mk({ ...common, strategic_edge: [edge], strategic_move: move(["proof_into_diagnosis"]), stretch_territories: [tCompress, tContinuity, T({ ...tCompare, built_from: ["reframe_decision_criteria"], must_be_true: ["The brand has an approved claim that is stronger than the competitors'"] })] });
ok("rejected seed used without stating evidence to reopen it is rejected", has(lintPush(reopen, inputs), /required to reopen/));
const reopenOk = mk({ ...common, strategic_edge: [edge], strategic_move: move(["proof_into_diagnosis"]), stretch_territories: [tCompress, tContinuity, T({ ...tCompare, built_from: ["reframe_decision_criteria"], must_be_true: ["Evidence is supplied that shoppers judge on a different criterion [ev_8]"] })] });
ok("rejected seed with reopen evidence stated passes that check", !has(lintPush(reopenOk, inputs), /required to reopen/));
const two = mk({ ...common, strategic_edge: [edge], strategic_move: move(["proof_into_diagnosis"]), stretch_territories: [tContinuity, tCompare] });
ok("two strong territories are accepted", lintPush(two, inputs).length === 0);
const dup = mk({ ...common, category_hygiene: ["Place a usage demonstration and an expert endorsement high on the product page", "A named authority signal on the page"], strategic_edge: [edge], strategic_move: move(["proof_into_diagnosis"]), stretch_territories: [tCompress, tContinuity, tCompare] });
ok("hygiene duplicating parity_catchup rejected", has(lintPush(dup, inputs), /duplicates a parity_catchup/));

// ── 6. authority-to-explanation requires the competitor coding ask ──
const auth = { ...common, strategic_edge: [edge], strategic_move: move(["authority_endorsement_to_explanation"]), stretch_territories: [tCompress, tContinuity, tCompare] };
const noAsk = mk(auth);
ok("authority-to-explanation without competitor coding ask rejected", has(lintPush(noAsk, inputs), /only an edge if a competitor fact holds/));
const withAsk = mk(auth, [...base.execution_owner_asks.slice(0, 4), "Review the two competitor PDPs and code the depth of expert content as credential-only / claim endorsement / mechanism explanation / decision guidance before production; if competitors already explain, the authority-to-explanation move is downgraded from edge to parity."]);
ok("with the coding ask it passes", !has(lintPush(withAsk, inputs), /only an edge if a competitor fact holds/));

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("all push-lint tests pass");
