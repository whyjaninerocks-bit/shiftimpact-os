#!/usr/bin/env npx tsx
// Validate a saved stage output (JSON file) against schema + basis + lint.
// Usage: npx tsx scripts/blueprint-validate.ts <commerce_leakage|growth_driver> <1|2|3> <file.json> [--s1 stage1.json --s2 stage2.json]
import fs from "node:fs";
import { Stage1V, Stage2V, Stage3V } from "../lib/growth-decision/schema";
import { enforceBasis, lintCausalAndCreative, lintStage1Or2 } from "../lib/growth-decision/lint";
import { parseInputs } from "../lib/growth-decision/draft";
import { EXAMPLES, type ExampleKey } from "../lib/growth-decision/examples";

const [key, stage, file] = process.argv.slice(2) as [ExampleKey, string, string];
const inputs = parseInputs(EXAMPLES[key].inputs);
const raw = JSON.parse(fs.readFileSync(file, "utf8"));

const validator = stage === "1" ? Stage1V : stage === "2" ? Stage2V : Stage3V;
const r = validator.parse(raw);
if (!r.ok) {
  console.log("SCHEMA ISSUES:\n - " + r.issues.map((i) => `${i.path}: ${i.message}`).join("\n - "));
  process.exit(1);
}
const { value, downgraded } = enforceBasis(r.value, inputs);
const v = stage === "3" ? lintCausalAndCreative(value) : lintStage1Or2(value as never, inputs);
console.log("schema: OK");
console.log("downgraded to hypothesis:", downgraded.length ? downgraded.join(", ") : "none");
console.log("lint violations:", v.length ? "\n - " + v.map((x) => `[${x.kind}] ${x.path}: ${x.detail}`).join("\n - ") : "none");
