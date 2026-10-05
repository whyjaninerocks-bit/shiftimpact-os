#!/usr/bin/env npx tsx
// Persist a curated demo blueprint from saved stage JSON files.
// Used when stages were drafted outside the production route (e.g. a proxy run);
// the model/provenance label is stored with each stage so the UI shows it honestly.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/blueprint-persist.ts <commerce_leakage|growth_driver> \
//     --s1 s1.json --s2 s2.json --s3 s3.json --model "label"
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseInputs } from "../lib/growth-decision/draft";
import { Stage1V, Stage2V, Stage3V, type BlueprintContent, type StageMeta } from "../lib/growth-decision/schema";
import { enforceBasis } from "../lib/growth-decision/lint";
import { buildIllustrativeNext, buildIllustrativeOutcome, EXAMPLES, type ExampleKey } from "../lib/growth-decision/examples";
import { reconcile } from "../lib/growth-decision/reconcile";

function arg(n: string) {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const key = process.argv[2] as ExampleKey;
  const ex = EXAMPLES[key];
  if (!ex) throw new Error("unknown example");
  const inputs = parseInputs(ex.inputs);
  const label = arg("--model") ?? "claude-sonnet-5-5 (proxy draft via subagent, NOT the production route; re-run scripts/blueprint-gate.ts for production-model output)";

  const load = <T>(file: string, v: { parse(x: unknown): { ok: true; value: T } | { ok: false; issues: { path: string; message: string }[] } }) => {
    const r = v.parse(JSON.parse(fs.readFileSync(file, "utf8")));
    if (!r.ok) throw new Error(`${file}: ` + r.issues.map((i) => `${i.path} ${i.message}`).join("; "));
    return enforceBasis(r.value, inputs);
  };
  const fx = (n: number) => `scripts/fixtures/blueprint-demo/${key}.stage${n}.json`;
  const s1 = load(arg("--s1") ?? fx(1), Stage1V);
  const s2 = load(arg("--s2") ?? fx(2), Stage2V);
  const s3 = load(arg("--s3") ?? fx(3), Stage3V);

  const { outcome, notes } = buildIllustrativeOutcome(key, s3.value);
  notes.forEach((n) => console.warn("⚠ " + n));
  const rec = reconcile(s3.value, outcome);
  console.log(`reconcile → ${rec.verdict} | move ${rec.suggested_move} | strength ${rec.evidence_strength}`);
  rec.measure_results.forEach((m) => console.log(`  ${m.role} ${m.key}: ${m.status} (actual ${m.actual}, ${m.comparator} ${m.threshold})`));

  const now = new Date().toISOString();
  const meta = (d: string[]): StageMeta => ({ drafted_at: now, model: label, attempts: 1, lint_warnings: [], downgraded_to_hypothesis: d });
  const content: BlueprintContent = {
    stage1: s1.value,
    stage2: s2.value,
    stage3: s3.value,
    outcome,
    next: buildIllustrativeNext(key, rec.suggested_move),
  };
  const stages = { stage1: meta(s1.downgraded), stage2: meta(s2.downgraded), stage3: meta(s3.downgraded) };

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: existing } = await sb.from("activation_blueprints").select("id").eq("title", ex.title).eq("is_demo", true).maybeSingle();
  const row = {
    title: ex.title,
    territory: inputs.territory,
    market: inputs.market,
    execution_owner_label: inputs.execution_owner.label,
    execution_owner_type: inputs.execution_owner.type,
    is_demo: true,
    inputs,
    content,
    stages,
    updated_at: now,
  };
  const res = existing
    ? await sb.from("activation_blueprints").update(row).eq("id", existing.id).select("id").single()
    : await sb.from("activation_blueprints").insert(row).select("id").single();
  if (res.error) throw res.error;
  console.log(`✔ persisted ${res.data.id}  →  /blueprints/${res.data.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
