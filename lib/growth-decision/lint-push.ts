// lib/growth-decision/lint-push.ts
// DETERMINISTIC guards for the Push the Brief layer. These exist so quality does
// not depend only on prompt wording:
//   • a seed move may be selected, adapted or combined — never echoed unchanged
//   • parity (what competitors are evidenced to do) cannot be passed off as an edge
//   • territories must be derived from THIS case (case-specific vocabulary + cited
//     evidence), must not be stock labels, must differ from each other, and must
//     not restate the proof mechanic
//   • no physical-attribute / casting language
// Pure functions; no I/O.

import type { Inputs, Stage2 } from "./schema";
import type { Violation } from "./lint";
import { STRATEGIC_MOVE_SEEDS, type StrategicMoveSeed } from "./strategic-moves";
import { FRAME_CHALLENGING_LOCI } from "./taxonomy";

const STOP = new Set(
  (
    "the a an and or of to in on for with without that this these those is are was were be been being it its as at by from " +
    "not no but if then than so such into onto over under about across through while when where which who whom what how why " +
    "can could should would may might must will shall do does did done has have had their them they there here also more most " +
    "less least very only just any all each both either neither other another same own per via vs"
  ).split(/\s+/),
);

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? []).filter((w) => !STOP.has(w));
}
function wordSet(text: string): Set<string> {
  return new Set(words(text));
}
export function jaccard(a: string, b: string): number {
  const A = wordSet(a);
  const B = wordSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function collectStrings(v: unknown, out: string[]): void {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
}

/** Vocabulary that is specific to THIS case: words in the inputs that do not appear in the seed library. */
function caseVocabulary(inputs: Inputs): Set<string> {
  const seedWords = new Set<string>();
  for (const s of STRATEGIC_MOVE_SEEDS) words(Object.values(s).join(" ")).forEach((w) => seedWords.add(w));
  const strings: string[] = [];
  collectStrings(
    {
      b: inputs.brand_label,
      c: inputs.category,
      p: inputs.commercial_pressure,
      d: inputs.decision_question,
      o: inputs.objective,
      e: inputs.evidence.map((e) => [e.label, e.text, e.metric_key]),
      cal: inputs.calendar,
      h: [inputs.holdable, inputs.not_holdable, inputs.client_constraints],
    },
    strings,
  );
  const vocab = new Set<string>();
  for (const w of words(strings.join(" "))) if (!seedWords.has(w) && w.length >= 4) vocab.add(w);
  return vocab;
}

/**
 * How anchored a piece of text is in THIS case: distinct case-specific words,
 * distinct evidence ids cited inline ([ev_N]) and distinct numbers that appear in
 * the inputs. Generic text that could be reused for another brand scores ~0.
 */
export function caseAnchors(text: string, vocab: Set<string>, inputs: Inputs): { terms: number; ev: number; nums: number } {
  const terms = new Set<string>();
  for (const w of words(text)) if (vocab.has(w)) terms.add(w);
  const ev = new Set(text.match(/ev_\d+/g) ?? []);
  const inputNums = new Set(JSON.stringify(inputs).match(/\d{2,}(?:\.\d+)?/g) ?? []);
  const nums = new Set((text.match(/\d{2,}(?:\.\d+)?/g) ?? []).filter((n) => inputNums.has(n)));
  return { terms: terms.size, ev: ev.size, nums: nums.size };
}

const STOCK_TERRITORY = /(doubt test|decision shortcut|proof you can see|make the invisible visible|mechanism made visible|show the difference|invisible visible)/i;
// Hygiene must state an ACTION. Justification clauses about how a market/platform/audience
// behaves ("as pages are browsed without sound", "given norms", "frequently", "often") are rejected.
const MARKET_FACT = /(,\s*as\b|\bbecause\b|\bsince\b|\bgiven\b|\bfrequently\b|\boften\b|\btypically\b|\bcommonly\b|\bmost shoppers\b|\bauto-?play\b|\bnorms?\b|\bwithout (audio|sound)\b|\bsound[- ]?off\b|\bmuted\b|\bmobile[- ]first\b|\bbrowsed\b)/i;
const PLATFORM_NAMES = ["tokopedia", "shopee", "lazada", "blibli", "tiktok shop", "amazon", "whatsapp", "facebook", "instagram", "youtube"];
const PHYSICAL = /\b(skin ?tone|complexion|ethnic(ity)?|age group|young (woman|women|man|men)|attractive|slim|fair[- ]skinned|dark[- ]skinned)\b/i;

export function lintPush(stage2: Stage2, inputs: Inputs): Violation[] {
  const p = stage2.push_the_brief;
  const v: Violation[] = [];
  if (!p) return v;
  const add = (path: string, detail: string) => v.push({ kind: "push", path, detail });

  // 1. Strategic move: not the seed unchanged.
  const seeds = STRATEGIC_MOVE_SEEDS.filter((s) => (p.strategic_move.seeds_used as readonly string[]).includes(s.id));
  for (const s of seeds) {
    const stmt = p.strategic_move.adapted_statement;
    if (stmt.toLowerCase().includes(s.name.toLowerCase()))
      add("push_the_brief.strategic_move.adapted_statement", `contains the seed label "${s.name}" — restate it for THIS case`);
    if (jaccard(stmt, s.strategic_job) > 0.5)
      add("push_the_brief.strategic_move.adapted_statement", `too close to the seed's generic job ("${s.id}") — adapt it to this case's evidence and tension`);
  }

  // 2. Edges must go beyond parity/hygiene.
  p.strategic_edge.forEach((e, i) => {
    const pool = [...p.parity_catchup.map((x) => x.item), ...p.category_hygiene];
    if (pool.some((x) => jaccard(e.edge, x) > 0.45))
      add(`push_the_brief.strategic_edge[${i}].edge`, "restates a parity/hygiene item — an edge must go beyond what competitors already do or what a competent execution does anyway");
  });

  // 3. Territories.
  const vocab = caseVocabulary(inputs);
  const seedNames = STRATEGIC_MOVE_SEEDS.map((s) => s.name.toLowerCase());
  p.stretch_territories.forEach((t, i) => {
    const base = `push_the_brief.stretch_territories[${i}]`;
    if (STOCK_TERRITORY.test(t.name) || seedNames.includes(t.name.toLowerCase()))
      add(`${base}.name`, `"${t.name}" is a stock label / seed name — invent a working label that describes THIS case's opportunity`);
    if (t.evidence_ids.length === 0)
      add(`${base}.evidence_ids`, "a territory must cite the evidence that generates its tension");
    const a = caseAnchors(`${t.tension} ${t.direction}`, vocab, inputs);
    if (caseAnchors(t.tension, vocab, inputs).ev < 1)
      add(`${base}.tension`, "the tension must cite at least one evidence id inline, e.g. [ev_4] — a tension that is not anchored in this case's evidence is rejected");
    if (a.terms + a.ev + a.nums < 4)
      add(`${base}.tension`, `only ${a.terms + a.ev + a.nums} case anchors (case-specific terms, evidence ids, input figures) — a territory that could be reused for another brand by swapping nouns is rejected; anchor the tension and direction in this case's evidence`);
    if (jaccard(t.direction, p.proof_mechanic.statement) > 0.5)
      add(`${base}.direction`, "restates the proof_mechanic — a territory must open a different opportunity");
    if (jaccard(t.why_not_hygiene, t.direction) > 0.75)
      add(`${base}.why_not_hygiene`, "just repeats the direction — explain why this is more than competent category execution");
  });
  for (let i = 0; i < p.stretch_territories.length; i++) {
    for (let j = i + 1; j < p.stretch_territories.length; j++) {
      const a = p.stretch_territories[i];
      const b = p.stretch_territories[j];
      const sameMoves = [...a.built_from].sort().join() === [...b.built_from].sort().join();
      if (jaccard(a.tension, b.tension) > 0.5 || (sameMoves && jaccard(a.direction, b.direction) > 0.4))
        add(`push_the_brief.stretch_territories[${j}]`, `not meaningfully different from territory ${i + 1} — vary the tension, shopper conclusion or strategic move`);
    }
  }

  // 3b. seeds_rejected: judgement made visible; rejected seeds cannot also be used.
  const used = new Set<string>(p.strategic_move.seeds_used as readonly string[]);
  const rej = p.strategic_move.seeds_rejected;
  if (new Set(rej.map((r) => r.seed_id)).size !== rej.length)
    add("push_the_brief.strategic_move.seeds_rejected", "each rejected seed must be a different seed");
  rej.forEach((r, i) => {
    if (used.has(r.seed_id))
      add(`push_the_brief.strategic_move.seeds_rejected[${i}]`, `"${r.seed_id}" is both used and rejected`);
  });

  // 3b2. A rejected seed may back a stretch territory ONLY if must_be_true names the evidence/data that would reopen it.
  const rejectedIds = new Set(rej.map((r) => r.seed_id as string));
  p.stretch_territories.forEach((t, i) => {
    const reopened = t.built_from.filter((id) => rejectedIds.has(id));
    if (reopened.length && !t.must_be_true.some((m) => /\b(evidence|data|supplied|confirm\w*|research|analytics)\b/i.test(m)))
      add(`push_the_brief.stretch_territories[${i}].must_be_true`, `built from rejected seed(s) ${reopened.join(", ")}: must_be_true must state the evidence or data required to reopen it`);
  });

  // 3c. Territories must diverge from the edges, not restate them.
  const terr = p.stretch_territories;
  const usesUnselected = terr.some((t) => t.built_from.some((id) => !used.has(id)));
  if (!usesUnselected)
    add("push_the_brief.stretch_territories", "at least one territory must be built from a strategic seed that was NOT selected in strategic_move");
  const loci = terr.map((t) => t.locus);
  if (new Set(loci).size !== loci.length)
    add("push_the_brief.stretch_territories", "territories must act on different things (distinct locus values)");
  if (!terr.some((t) => (FRAME_CHALLENGING_LOCI as readonly string[]).includes(t.locus)))
    add("push_the_brief.stretch_territories", "at least one territory must act on something other than the proof itself (locus: decision_criteria, comparison_context or journey_continuity) — otherwise the section is only 'better PDP proof'");
  terr.forEach((t, i) => {
    const base = `push_the_brief.stretch_territories[${i}]`;
    const onlyProof = t.locus === "proof_content" || t.locus === "proof_sequence";
    const sameSeeds = t.built_from.every((id) => used.has(id));
    if (onlyProof && sameSeeds)
      add(`${base}`, "restates the strategic edge: it acts on the proof itself and is built only from the seeds already used in strategic_move — introduce a materially different strategic move");
    for (const e of p.strategic_edge) {
      if (jaccard(t.direction, `${e.edge} ${e.beyond_parity}`) > 0.35)
        add(`${base}.direction`, "too close to a strategic_edge — a territory must introduce a materially different strategic move, not rephrase the edge");
    }
  });

  // 3c2. Two territories built on the same unselected seed are near-duplicates: omit the weaker one.
  for (let i = 0; i < terr.length; i++) {
    for (let j = i + 1; j < terr.length; j++) {
      const shared = terr[j].built_from.filter((id) => terr[i].built_from.includes(id) && !used.has(id));
      if (shared.length)
        add(`push_the_brief.stretch_territories[${j}]`, `shares the seed "${shared[0]}" with territory ${i + 1} — two territories built on the same unselected seed are near-duplicates; omit the weaker one (two strong territories beat three) or build it from a different strategic move`);
    }
  }

  // 3c3. No platform/marketplace names that the supplied inputs do not contain.
  const inputsText = JSON.stringify(inputs).toLowerCase();
  const allText: string[] = [];
  collectStrings(p, allText);
  collectStrings(stage2.execution_owner_asks, allText);
  const joined = allText.join(" \n ").toLowerCase();
  for (const name of PLATFORM_NAMES) {
    if (joined.includes(name) && !inputsText.includes(name)) {
      add("push_the_brief", `names "${name}", which is not in the supplied inputs — refer to "the marketplace listing" or "the brand site" unless the client has named the platform`);
      break;
    }
  }

  // 3d0. A move is a judgement about what to try, not a finding.
  if (p.strategic_move.basis === "evidenced")
    add("push_the_brief.strategic_move.basis", "the chosen strategic move is a hypothesis to test unless a supplied evidence item directly tests that move — tag it hypothesis");

  // 3d. Hygiene must not contain parity, nor unsupported market/platform facts.
  p.category_hygiene.forEach((h, i) => {
    if (p.parity_catchup.some((x) => jaccard(h, x.item) > 0.45))
      add(`push_the_brief.category_hygiene[${i}]`, "duplicates a parity_catchup item — keep competitor-evidenced standards in parity_catchup only");
    const mf = h.match(MARKET_FACT);
    if (mf)
      add(`push_the_brief.category_hygiene[${i}]`, `contains "${mf[0]}", which asserts a market/platform norm that is not in the supplied evidence — hygiene must state an ACTION, not a claim about how the market or platform behaves; delete the justification clause or the whole line`);
  });

  // 3e. Seeds that are only an EDGE if a competitor fact holds → owner ask + downgrade rule.
  const needValidation = STRATEGIC_MOVE_SEEDS.filter(
    (s) => (s as StrategicMoveSeed).validation_codes && (used.has(s.id) || terr.some((t) => t.built_from.includes(s.id))),
  );
  const asks = stage2.execution_owner_asks.join(" \n ").toLowerCase();
  for (const seed of needValidation) {
    const codes = (seed as StrategicMoveSeed).validation_codes!;
    const missing = codes.filter((c) => !asks.includes(c.toLowerCase()));
    if (missing.length || !asks.includes("competitor") || !asks.includes("parity"))
      add(
        "execution_owner_asks",
        `"${seed.id}" is only an edge if a competitor fact holds: add an owner ask to review the competitor pages and code ${(seed as StrategicMoveSeed).validation_subject} as ${codes.join(" / ")}, stating that if competitors already do it the move is downgraded from edge to parity (missing: ${missing.join(", ") || "competitor/parity wording"})`,
      );
  }

  // 4. People: no physical attributes (that is casting).
  const all: string[] = [];
  collectStrings(p, all);
  for (const s of all) {
    const m = s.match(PHYSICAL);
    if (m) {
      add("push_the_brief", `"${m[0]}" — describe the shopper's situation or concern, never physical attributes (that is casting)`);
      break;
    }
  }
  return v;
}
