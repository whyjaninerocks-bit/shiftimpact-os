#!/usr/bin/env npx tsx
// ============================================================================
// Activation Blueprint — Stage 2 QUALITY GATE + demo seeding
// ============================================================================
//
// The quality gate comes BEFORE any UI work: Commerce Leakage must show the
// Blueprint can reach Roma-level specificity. If it is generic, stop and fix
// prompts / taxonomy / evidence logic.
//
// Usage (needs ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY):
//   npx tsx --env-file=.env.local scripts/blueprint-gate.ts commerce_leakage            # run stages 1–3, print, DO NOT persist
//   npx tsx --env-file=.env.local scripts/blueprint-gate.ts commerce_leakage --persist  # also upsert the demo row (+ authored outcome/next)
//   npx tsx --env-file=.env.local scripts/blueprint-gate.ts growth_driver --persist
//   npx tsx --env-file=.env.local scripts/blueprint-gate.ts commerce_leakage --push-only    # Stage 1+2, print ONLY push_the_brief, stop
//   npx tsx scripts/blueprint-gate.ts commerce_leakage --emit 1                       # print Stage 1 prompt only (no API call)
//   npx tsx scripts/blueprint-gate.ts commerce_leakage --emit 2 --s1 stage1.json
//   npx tsx scripts/blueprint-gate.ts commerce_leakage --emit 3 --s1 stage1.json --s2 stage2.json
//
// Add ANTHROPIC_API_KEY to .env.local first (e.g. `vercel env pull .env.local`).

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  anthropicCall,
  draftStage1,
  draftStage2,
  draftStage3,
  parseInputs,
  StageError,
} from "../lib/growth-decision/draft";
import { stage1System, stage1User, stage2System, stage2User, stage3System, stage3User } from "../lib/growth-decision/prompts";
import { buildIllustrativeNext, buildIllustrativeOutcome, EXAMPLES, type ExampleKey } from "../lib/growth-decision/examples";
import { reconcile } from "../lib/growth-decision/reconcile";
import type { BlueprintContent, Stage1, Stage2, StageMeta } from "../lib/growth-decision/schema";

const GENERIC_PHRASES = [
  "engaging content", "leverage", "synergy", "authentic content", "storytelling",
  "resonate", "holistic", "omnichannel", "best practice", "high-quality content",
  "build awareness", "brand love", "thought leader",
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function specificityReport(s2: Stage2): { ok: boolean; lines: string[] } {
  const text = JSON.stringify(s2).toLowerCase();
  const generics = GENERIC_PHRASES.filter((p) => text.includes(p));
  const allItems = [
    s2.behavioural_job,
    s2.intervention,
    ...s2.content_roles,
    ...s2.proof_required,
    ...s2.execution_choices,
  ];
  const hyp = allItems.filter((x) => x.basis === "hypothesis").length;
  const evd = allItems.filter((x) => x.basis === "evidenced").length;
  const choicesWithAlt = s2.execution_choices.filter((c) => c.alternative_not_chosen.length >= 5).length;
  const evidenceCited = new Set(allItems.flatMap((x) => x.evidence_ids ?? [])).size;
  const lines = [
    `generic phrases found: ${generics.length ? generics.join(", ") : "none"}`,
    `evidenced vs hypothesis: ${evd} evidenced / ${hyp} hypothesis`,
    `distinct evidence ids cited: ${evidenceCited}`,
    `execution choices that reject an alternative: ${choicesWithAlt}/${s2.execution_choices.length}`,
    `asset beats: ${s2.asset_architecture.beats.map((b) => b.beat).join(" → ")}`,
    `creator role applicable: ${s2.creator_role.applicable}${s2.creator_role.role ? ` (${s2.creator_role.role}, not ${s2.creator_role.not_role ?? "n/a"})` : ""}`,
  ];
  // Flags for a human read — the real gate is YOU reading it cold.
  const ok = generics.length === 0 && choicesWithAlt === s2.execution_choices.length && evidenceCited >= 2;
  return { ok, lines };
}

async function main() {
  const key = process.argv[2] as ExampleKey;
  if (!key || !(key in EXAMPLES)) {
    console.error("Usage: blueprint-gate.ts <commerce_leakage|growth_driver> [--persist] [--emit 1|2|3]");
    process.exit(1);
  }
  const ex = EXAMPLES[key];
  const inputs = parseInputs(ex.inputs);

  const emit = arg("--emit");
  if (emit) {
    const s1: Stage1 | undefined = arg("--s1") ? JSON.parse(fs.readFileSync(arg("--s1")!, "utf8")) : undefined;
    const s2: Stage2 | undefined = arg("--s2") ? JSON.parse(fs.readFileSync(arg("--s2")!, "utf8")) : undefined;
    if (emit === "1") console.log(`=== SYSTEM ===\n${stage1System()}\n\n=== USER ===\n${stage1User(inputs)}`);
    if (emit === "2" && s1) console.log(`=== SYSTEM ===\n${stage2System()}\n\n=== USER ===\n${stage2User(inputs, s1)}`);
    if (emit === "3" && s1 && s2) console.log(`=== SYSTEM ===\n${stage3System()}\n\n=== USER ===\n${stage3User(inputs, s1, s2)}`);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local (e.g. `vercel env pull .env.local`) and re-run.");
    process.exit(2);
  }

  const content: BlueprintContent = {};
  const stages: Record<string, StageMeta> = {};

  try {
    console.log(`\n▶ Stage 1 — ${ex.title}`);
    const s1 = await draftStage1(inputs, anthropicCall);
    content.stage1 = s1.value;
    stages.stage1 = s1.meta;
    console.log(JSON.stringify(s1.value, null, 2));

    console.log(`\n▶ Stage 2 — THE QUALITY GATE`);
    const s2 = await draftStage2(inputs, s1.value, anthropicCall);
    content.stage2 = s2.value;
    stages.stage2 = s2.meta;
    if (process.argv.includes("--push-only")) {
      // Show ONLY the Push the Brief layer (for review before anything else).
      const p = s2.value.push_the_brief;
      console.log(JSON.stringify(p, null, 2));
      console.log("\nexecution_owner_asks (shown so the competitor-depth validation ask can be checked):");
      s2.value.execution_owner_asks.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
      if (p) {
        const tagged = [...p.strategic_edge, p.strategic_move, p.proof_mechanic, ...p.stretch_territories];
        const hyp = tagged.filter((x) => x.basis === "hypothesis").length;
        console.log("\n── Push the Brief checks ──");
        console.log(`  hygiene: ${p.category_hygiene.length} | parity catch-up: ${p.parity_catchup.length} | edges: ${p.strategic_edge.length} | avoid: ${p.avoid.length} | territories: ${p.stretch_territories.length}`);
        console.log(`  strategic move seeds: ${p.strategic_move.seeds_used.join(" + ")}`);
        console.log(`  proof mechanic: ${p.proof_mechanic.mechanic}${p.proof_mechanic.secondary.length ? " + " + p.proof_mechanic.secondary.join(", ") : ""}`);
        console.log(`  edge/move/mechanic/territory basis: ${tagged.length - hyp} evidenced / ${hyp} hypothesis`);
        console.log(`  seeds rejected: ${p.strategic_move.seeds_rejected.map((r) => r.seed_id).join(", ")}`);
        p.stretch_territories.forEach((t, i) => console.log(`  territory ${i + 1}: "${t.name}" — acts on ${t.locus}; built from ${t.built_from.join(" + ")}`));
        console.log(`  attempts: ${s2.meta.attempts}; downgraded to hypothesis: ${s2.meta.downgraded_to_hypothesis.length}`);
      }
      console.log("\n(stopped after Stage 2 — --push-only; nothing persisted)");
      return;
    }
    console.log(JSON.stringify(s2.value, null, 2));
    const rep = specificityReport(s2.value);
    console.log("\n── Stage 2 specificity checks (heuristic; the real gate is a cold human read) ──");
    rep.lines.forEach((l) => console.log("  " + l));
    console.log(rep.ok ? "  ✔ heuristics pass — now read it cold as Roma's team would." : "  ✖ heuristics flag generic output — fix prompts/taxonomy/evidence logic before any UI.");

    console.log(`\n▶ Stage 3`);
    const s3 = await draftStage3(inputs, s1.value, s2.value, anthropicCall);
    content.stage3 = s3.value;
    stages.stage3 = s3.meta;
    console.log(JSON.stringify(s3.value, null, 2));

    const { outcome, notes } = buildIllustrativeOutcome(key, s3.value);
    content.outcome = outcome;
    notes.forEach((n) => console.warn("  ⚠ " + n));
    const rec = reconcile(s3.value, outcome);
    content.next = buildIllustrativeNext(key, rec.suggested_move);
    console.log(`\n▶ Reconciliation (computed): ${rec.verdict} → suggested move: ${rec.suggested_move} | evidence strength: ${rec.evidence_strength}`);
    rec.reasons.forEach((r) => console.log("  - " + r));
  } catch (e) {
    if (e instanceof StageError) {
      console.error("\n✖ Stage failed after retry:\n - " + e.issues.join("\n - "));
      console.error("\nLast raw output:\n" + e.lastRaw.slice(0, 3000));
      process.exit(3);
    }
    throw e;
  }

  if (process.argv.includes("--persist") || arg("--save-dir")) {
    // Keep exactly what was drafted, so what was reviewed is what can be re-persisted.
    const dir = arg("--save-dir") ?? "scripts/fixtures/blueprint-prod";
    fs.mkdirSync(dir, { recursive: true });
    for (const [n, v] of [[1, content.stage1], [2, content.stage2], [3, content.stage3]] as const) {
      if (v) fs.writeFileSync(`${dir}/${key}.stage${n}.json`, JSON.stringify(v, null, 2));
    }
    console.log(`\n(saved drafted stages to ${dir}/${key}.stage{1,2,3}.json)`);
  }

  if (process.argv.includes("--persist")) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !sk) throw new Error("Supabase env missing");
    const sb = createClient(url, sk, { auth: { persistSession: false } });
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
      updated_at: new Date().toISOString(),
    };
    const res = existing
      ? await sb.from("activation_blueprints").update(row).eq("id", existing.id).select("id").single()
      : await sb.from("activation_blueprints").insert(row).select("id").single();
    if (res.error) throw res.error;
    console.log(`\n✔ Persisted demo blueprint ${res.data.id}  →  /blueprints/${res.data.id}`);
  } else {
    console.log("\n(not persisted — add --persist to save the curated demo row)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
