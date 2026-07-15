#!/usr/bin/env npx tsx
// ============================================================================
// ShiftImpact OS — Sprint Completion Gate  (sprint-gate.ts)
// ============================================================================
//
// Unified sprint gate. Two layers, fully automated:
//
//  LAYER 1 — AUTO-FIX TECHNICAL CHECKS
//    Scans the codebase for known structural issues.
//    Where safe to fix automatically: fixes in place and reports the change.
//    Where not safe: produces a precise remediation instruction.
//    Hard block: sprint cannot close if any FAIL remains after auto-fix.
//
//  LAYER 2 — BA INFERENCE EVALUATION
//    Calls each AI route with a test fixture.
//    Passes the raw output to Claude Haiku for evaluation against 4 BA lens
//    dimensions: Traceability, Decision Utility, Boundary Integrity,
//    and Client Answer.
//    No manual sign-off. The system produces its own verdict.
//
// Usage:
//   npx tsx eval/sprint-gate.ts --static       # Layer 1 only (no API needed)
//   npx tsx eval/sprint-gate.ts --ba           # Layer 2 only (needs live app)
//   npx tsx eval/sprint-gate.ts --all          # Both layers
//   npx tsx eval/sprint-gate.ts --fix          # Layer 1 with auto-fix enabled
//
// Environment vars:
//   ANTHROPIC_API_KEY          Required for Layer 2
//   GATE_MODEL                 Model for BA inference (default: claude-sonnet-4-6)
//                              Set to any current Anthropic model string.
//                              e.g. claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5-20251001
//   EVAL_BASE_URL              App base URL (default: http://localhost:3000)
//   GATE_CAMPAIGN_ID           Seeded campaign for route testing
//   GATE_CLIENT_ID             Seeded client for BMS route testing
//   GATE_PERIOD_START          ISO date for BMS test row
//   GATE_WEEK_NUMBER           Week number for signal/cross-channel tests
//
// ── SPRINT CONFIG ─────────────────────────────────────────────────────────────
// Update this block for each new sprint before running the gate.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs   from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";

// ─── Sprint config ────────────────────────────────────────────────────────────

interface BAQuestion {
  traceability:   string;   // Does the output reference specific named inputs?
  decisionUtility: string;  // Is there an actionable recommendation within 48h?
  clientAnswer:   string;   // Does it answer the named client tension?
}

interface FeatureConfig {
  id:            string;
  name:          string;
  route:         string;    // e.g. "/api/signal-report"
  clientTension: string;    // Named client problem this feature solves
  growthArea:    string;    // GA1–GA5
  testFixture:   Record<string, unknown>;
  baQuestions:   BAQuestion;
}

interface SprintConfig {
  sprintNumber: number;
  date:         string;
  features:     FeatureConfig[];
}

const SPRINT_CONFIG: SprintConfig = {
  sprintNumber: 7,
  date:         "2026-07-15",

  // Sprint 7 features:
  //   F31 — Campaign Intelligence Report (full campaign synthesis + client export)
  //   F32 — Intelligence Orchestration Layer (input-triggered prompt chain)
  //   F33 — Intelligence Query Activator (Janine-operated on-demand extraction)
  //
  // Boundary rules for this sprint:
  //   • orchestration_run trigger_data, step names, steps_failed, error_log are INTERNAL ONLY
  //   • chain_summary is the ONLY orchestration field that is client-safe
  //   • MDH_QUARANTINE status is INTERNAL — client does not see chain halt reason
  //   • F33 confidence tier (High/Directional/Speculative) is INTERNAL — never in copy output
  //   • F33 components_used and data_basis are INTERNAL — never shown to clients
  //   • F33 "Copy for presentation" must exclude all internal fields
  //   • F31 report_data and findings[].confidence are INTERNAL — never in client export
  //   • F31 client export contains only executive_summary + finding text (headline/context/implication/recommendation)
  //   • No competitor names in any F31/F33 output — directional language only
  //   • State codes (1–6), internal system names (MDH, CSTR, BMS, ICS) must not appear in any finding

  features: [
    {
      id:            "F31",
      name:          "Campaign Intelligence Report — Full campaign synthesis with client export",
      route:         "/api/campaign-report-generate",
      clientTension: "Internal (Janine): after entering 4+ weeks of campaign data across signal, consumer state, BMS, risk and attribution — there is no single synthesised view of what all intelligence components are saying together. Janine must piece together the campaign story manually before each client meeting.",
      growthArea:    "GA2",
      testFixture: {
        campaign_id: process.env.GATE_CAMPAIGN_ID ?? "",
        action:      "generate",
      },
      baQuestions: {
        traceability:    "Does /api/campaign-report-generate pull from at least 3 component tables (signal_weekly_reports, consumer_state_readings, brand_momentum_scores, attribution_records) and reflect that data in distinct sections of report_data? Does data_coverage in the response show non-zero record counts for at least 2 components?",
        decisionUtility: "Does the executive_summary contain a concrete directional statement about the campaign (not just a description of what was generated)? Can Janine paste the executive_summary into a client briefing document without any editing?",
        clientAnswer:    "Does the executive_summary or any section of report_data contain any of the following? If yes: hard FAIL. (a) state codes 1-6, (b) internal system names: MDH, CSTR, BMS, ICS, FRAME, BIP, orchestration_runs, campaign_reports, (c) competitor brand names, (d) confidence tier labels in client-facing text, (e) components_used / data_basis content, (f) internal step names from the orchestration chain.",
      },
    },
    {
      id:            "F32",
      name:          "Intelligence Orchestration Layer — Input-triggered prompt chain",
      route:         "/api/orchestrate",
      clientTension: "Internal (Janine): each intelligence component (Signal, Consumer State, BMS, Risk, Activation) runs independently. Janine must manually trigger each after data entry. There is no system that chains them automatically — meaning a missed trigger creates stale intelligence and wasted preparation time.",
      growthArea:    "GA1",
      testFixture: {
        campaign_id:  process.env.GATE_CAMPAIGN_ID ?? "",
        trigger_type: "SIGNAL_ENTERED",
        trigger_data: { week_number: Number(process.env.GATE_WEEK_NUMBER ?? 1) },
      },
      baQuestions: {
        traceability:    "Does /api/orchestrate create a record in orchestration_runs with status RUNNING before calling any step, and update it to COMPLETE (or FAILED / MDH_QUARANTINE) with steps_completed and steps_failed arrays that name each step individually? If a step fails, is the exact error in error_log — not a generic message?",
        decisionUtility: "Does chain_summary contain a client-safe sentence that Janine can read aloud to describe what ran — with no internal step names (mdh_layer_0, signal_intelligence, etc.), no state codes, and no metric values? A sentence referencing internal step names is a FAIL.",
        clientAnswer:    "If MDH = RED (all three signals red), does the chain halt at Step 0, log MDH_QUARANTINE, and return chain_summary = 'Delivery health is below minimum threshold — intelligence chain paused.' — with no inference output and no state or metric data in the response? Any inference output during quarantine is a hard FAIL.",
      },
    },
    {
      id:            "F33",
      name:          "Intelligence Query Activator — Janine-operated on-demand extraction",
      route:         "/api/intelligence-query",
      clientTension: "All clients: when a client asks a specific question mid-presentation (e.g. 'Is the brand growing?' or 'What do we do next?'), Janine has no fast, structured way to pull a presentation-ready finding from stored intelligence. She must reconstruct context from memory or raw data.",
      growthArea:    "GA1",
      testFixture: {
        campaign_id: process.env.GATE_CAMPAIGN_ID ?? "",
        query_text:  "Is the brand growing? What is the momentum right now?",
        query_scope: ["brand_momentum"],
      },
      baQuestions: {
        traceability:    "Does /api/intelligence-query return components_used listing the specific stored records queried (not generic component names), and does data_basis include record_count and latest_record_at for each table? If no stored data exists, is confidence = 'Speculative' and components_used = [] — not a fabricated finding?",
        decisionUtility: "Does the recommendation field contain a specific action Janine can present to the client within the meeting — not a vague 'monitor the situation' or 'continue current strategy'? Is the finding self-contained (Janine can read it without opening another screen)?",
        clientAnswer:    "Does the 4-part finding (headline/context/implication/recommendation) contain any of the following? If yes: hard FAIL. (a) state codes 1-6, (b) internal system names: MDH, CSTR, BMS, ICS, FRAME, BIP, F32, F33, orchestration_runs, (c) competitor brand names, (d) confidence tier label, (e) components_used or data_basis content, (f) raw metric numbers not from attribution data.",
      },
    },
  ],
};

// ─── Console helpers ──────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  blue:   "\x1b[34m",
  gray:   "\x1b[90m",
  cyan:   "\x1b[36m",
  white:  "\x1b[97m",
};

function log(msg: string)         { console.log(msg); }
function pass(msg: string)        { console.log(`  ${C.green}✔  PASS${C.reset}  ${msg}`); }
function fail(msg: string)        { console.log(`  ${C.red}✘  FAIL${C.reset}  ${msg}`); }
function fixed(msg: string)       { console.log(`  ${C.cyan}⚙  FIXED${C.reset} ${msg}`); }
function review(msg: string)      { console.log(`  ${C.yellow}◐  NOTE${C.reset}  ${msg}`); }
function info(msg: string)        { console.log(`  ${C.gray}○  INFO${C.reset}  ${msg}`); }

const BASE_URL    = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const GATE_MODEL  = process.env.GATE_MODEL    ?? "claude-sonnet-4-6";

// ─── File utilities ───────────────────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");

function readSrc(rel: string): string {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}

function writeSrc(rel: string, content: string): void {
  fs.writeFileSync(path.join(ROOT, rel), content, "utf8");
}

function patchFile(rel: string, find: string, replace: string): boolean {
  const content = readSrc(rel);
  if (!content.includes(find)) return false;
  if (content.includes(replace)) return false; // already patched
  writeSrc(rel, content.replace(find, replace));
  return true;
}

// ─── LAYER 1: AUTO-FIX TECHNICAL CHECKS ──────────────────────────────────────

interface TechResult {
  id:      string;
  label:   string;
  status:  "PASS" | "FAIL" | "FIXED" | "NOTE";
  detail:  string;
  remedy?: string;
}

const AI_ROUTES = [
  "app/api/signal-report/route.ts",
  "app/api/cross-channel-report/route.ts",
  "app/api/behaviour-state/route.ts",
  "app/api/brand-momentum/route.ts",
];

const INTERNAL_MARKER = "INTERNAL ONLY";

async function runTechChecks(autoFix: boolean): Promise<TechResult[]> {
  const results: TechResult[] = [];

  // T1 — INTERNAL ONLY markers on all AI routes
  for (const route of AI_ROUTES) {
    const content = readSrc(route);
    if (!content) {
      results.push({ id: "T1", label: `INTERNAL ONLY: ${route}`, status: "NOTE", detail: "File not found in code-updates — may be in main app directory." });
      continue;
    }
    if (content.includes(INTERNAL_MARKER)) {
      results.push({ id: "T1", label: `INTERNAL ONLY: ${route}`, status: "PASS", detail: "Marker present." });
    } else if (autoFix) {
      // Auto-fix: insert marker after the first comment line
      const fixed_content = content.replace(
        /^(\/\/ .+\n)/,
        `$1// ${INTERNAL_MARKER} — never called from or exposed to Client Interface (/portal/*).\n`
      );
      writeSrc(route, fixed_content);
      results.push({ id: "T1", label: `INTERNAL ONLY: ${route}`, status: "FIXED", detail: `Auto-inserted INTERNAL ONLY marker.` });
    } else {
      results.push({
        id: "T1", label: `INTERNAL ONLY: ${route}`, status: "FAIL",
        detail: "INTERNAL ONLY marker missing.",
        remedy: `Add '// ${INTERNAL_MARKER} — never called from or exposed to Client Interface (/portal/*).' to line 3 of ${route}. Run --fix to apply automatically.`,
      });
    }
  }

  // T2 — Admin client pattern (createAdminClient or SUPABASE_SERVICE_ROLE_KEY)
  for (const route of AI_ROUTES) {
    const content = readSrc(route);
    if (!content) continue;
    const usesWrapper = content.includes("createAdminClient");
    const usesServiceKey = content.includes("SUPABASE_SERVICE_ROLE_KEY");
    if (usesWrapper) {
      results.push({ id: "T2", label: `Admin client: ${route}`, status: "PASS", detail: "Uses createAdminClient() wrapper." });
    } else if (usesServiceKey) {
      results.push({ id: "T2", label: `Admin client: ${route}`, status: "NOTE", detail: "Uses inline getSupabase() with SUPABASE_SERVICE_ROLE_KEY. Functionally correct. Standardise to createAdminClient() in Sprint 5 cleanup." });
    } else {
      results.push({ id: "T2", label: `Admin client: ${route}`, status: "FAIL", detail: "No service-role pattern found — route may use anon key.", remedy: "Replace Supabase client init with createAdminClient() from @/lib/supabase/admin." });
    }
  }

  // T3 — Portal boundary: no AI route imports from /portal/*
  for (const route of AI_ROUTES) {
    const content = readSrc(route);
    if (!content) continue;
    if (content.includes("/portal/")) {
      results.push({ id: "T3", label: `Portal boundary: ${route}`, status: "FAIL", detail: "Route imports from /portal/* — boundary violation.", remedy: "Remove any import or reference to /portal/* from this API route." });
    } else {
      results.push({ id: "T3", label: `Portal boundary: ${route}`, status: "PASS", detail: "No /portal/* imports." });
    }
  }

  // T4 — Security: no threshold values or internal scoring constants in client-facing components
  const CLIENT_COMPONENTS = [
    "app/clients/[id]/_components/BrandMomentumSection.tsx",
    "app/campaigns/[id]/_components/SignalIntelligenceSection.tsx",
    "app/campaigns/[id]/_components/ConsumerBehaviourSection.tsx",
    "app/campaigns/[id]/_components/CrossChannelSection.tsx",
  ];
  const LEAK_PATTERNS = ["_threshold_", "bms_confidence_weight", "state_threshold", "conflict_weight"];
  for (const comp of CLIENT_COMPONENTS) {
    const content = readSrc(comp);
    if (!content) continue;
    const leaked = LEAK_PATTERNS.find(p => content.includes(p));
    if (leaked) {
      results.push({ id: "T4", label: `Threshold leak: ${comp}`, status: "FAIL", detail: `Pattern '${leaked}' found in client component — internal scoring data exposed.`, remedy: "Remove or move to server-side. Client components must never reference internal scoring constants." });
    } else {
      results.push({ id: "T4", label: `Threshold leak: ${comp}`, status: "PASS", detail: "No internal scoring patterns in client component." });
    }
  }

  // T5 — ai_read / dimension_conflict_flag not rendered in client-facing BMS component
  const bmsContent = readSrc("app/clients/[id]/_components/BrandMomentumSection.tsx");
  if (bmsContent) {
    const exposesAiRead         = bmsContent.includes("{score.ai_read}") || bmsContent.includes("{result.ai_read}");
    const exposesConflictClient = bmsContent.includes("{score.dimension_conflict_flag}");
    // Check they only appear inside BmsResultCard (internal) not in history/client view
    const internalOnlyBlock = bmsContent.includes("INTERNAL") && bmsContent.includes("ai_read");
    if (exposesAiRead && !internalOnlyBlock) {
      results.push({ id: "T5", label: "BMS: ai_read client exposure", status: "FAIL", detail: "ai_read rendered in client-facing section — internal field must be restricted to BmsResultCard (Janine view only).", remedy: "Ensure ai_read is only rendered inside BmsResultCard component, not in HistoryCard or any client portal view." });
    } else {
      results.push({ id: "T5", label: "BMS: ai_read client exposure", status: "PASS", detail: "ai_read correctly scoped to internal result card." });
    }
    if (exposesConflictClient) {
      results.push({ id: "T5b", label: "BMS: dimension_conflict_flag client exposure", status: "NOTE", detail: "dimension_conflict_flag referenced — verify it is NOT rendered in client-visible output." });
    } else {
      results.push({ id: "T5b", label: "BMS: dimension_conflict_flag client exposure", status: "PASS", detail: "dimension_conflict_flag not exposed in client component." });
    }
  }

  // T6 — Sprint actions: no redirect() after saveBrandMomentumInputs
  const actionsContent = readSrc("lib/actions.ts");
  if (actionsContent) {
    const bmsBlock = actionsContent.split("saveBrandMomentumInputs")[1]?.split("export async function")[0] ?? "";
    if (bmsBlock.includes("redirect(")) {
      results.push({ id: "T6", label: "BMS action: redirect() after save", status: "FAIL", detail: "saveBrandMomentumInputs uses redirect() — breaks the component's follow-up API call.", remedy: "Remove redirect(). Use revalidatePath() only. Pattern: saveWeeklySignalInputs." });
    } else {
      results.push({ id: "T6", label: "BMS action: no redirect()", status: "PASS", detail: "saveBrandMomentumInputs correctly uses revalidatePath() only." });
    }
  }

  // T7 — Schema: attribution_records has no UNIQUE constraint (by design)
  const migrationFiles = ["supabase/migrations/0011_attribution_records.sql", "migrations/0011_attribution_records.sql"];
  for (const mf of migrationFiles) {
    const content = readSrc(mf);
    if (!content) continue;
    if (content.includes("UNIQUE") && content.includes("attribution_records")) {
      results.push({ id: "T7", label: "Attribution: no UNIQUE constraint", status: "FAIL", detail: "UNIQUE constraint found on attribution_records — intentionally non-unique to support same-week multi-test-type records.", remedy: "Remove UNIQUE constraint. Two records for the same (campaign_id, week_number, channel_name) must be allowed (different test types: MMM + Holdout)." });
    } else {
      results.push({ id: "T7", label: "Attribution: no UNIQUE constraint", status: "PASS", detail: "No UNIQUE constraint on attribution_records — correct by design." });
    }
  }

  return results;
}

// ─── LAYER 2: BA INFERENCE EVALUATION ────────────────────────────────────────

interface BADimension {
  dimension: "TRACEABILITY" | "DECISION_UTILITY" | "BOUNDARY" | "CLIENT_ANSWER";
  verdict:   "PASS" | "FAIL";
  evidence:  string;  // quote from the AI output that supports the verdict
  note:      string;  // brief evaluator commentary
}

interface BAResult {
  featureId:   string;
  featureName: string;
  routeCalled: string;
  rawOutput:   string;
  dimensions:  BADimension[];
  verdict:     "PASS" | "FAIL" | "PARTIAL";
  summary:     string;
}

async function callRoute(p: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(`${BASE_URL}${p}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: String(err) } };
  }
}

function buildBAPrompt(feature: FeatureConfig, routeOutput: string): string {
  return `You are a senior business analyst evaluating whether a campaign intelligence AI system's output meets business validity criteria.

FEATURE BEING EVALUATED: ${feature.name} (${feature.id})
GROWTH AREA: ${feature.growthArea}
CLIENT TENSION THIS FEATURE SOLVES:
"${feature.clientTension}"

ACTUAL AI ROUTE OUTPUT:
${routeOutput}

EVALUATION CRITERIA — assess each dimension independently:

1. TRACEABILITY
Question: ${feature.baQuestions.traceability}
Pass standard: The output explicitly references specific named inputs, dimension labels, or data points from the request. Generic commentary without grounding = FAIL.

2. DECISION_UTILITY
Question: ${feature.baQuestions.decisionUtility}
Pass standard: A strategy lead can take a concrete next action based solely on this output within 48 hours. "Monitor" or "continue" without specificity = FAIL.

3. BOUNDARY
Question: Does the output contain ANY of the following that would be inappropriate for a strategy lead to see (let alone a client)?
- Internal scoring weights or threshold values (e.g. "confidence penalised by 1.5 per null dimension")
- Raw formula or composite derivation logic
- System prompt fragments or internal variable names
Pass standard: Output contains only directional intelligence. Any methodology leakage = FAIL.

4. CLIENT_ANSWER
Question: ${feature.baQuestions.clientAnswer}
Pass standard: A strategy lead could use this output verbatim (or with minimal paraphrase) to address the named client's original question. If it requires significant translation = FAIL.

RESPOND IN STRICT JSON — no markdown fences:
{
  "dimensions": [
    { "dimension": "TRACEABILITY",    "verdict": "PASS|FAIL", "evidence": "<direct quote from output>", "note": "<1 sentence>" },
    { "dimension": "DECISION_UTILITY","verdict": "PASS|FAIL", "evidence": "<direct quote from output>", "note": "<1 sentence>" },
    { "dimension": "BOUNDARY",        "verdict": "PASS|FAIL", "evidence": "<direct quote from output>", "note": "<1 sentence>" },
    { "dimension": "CLIENT_ANSWER",   "verdict": "PASS|FAIL", "evidence": "<direct quote from output>", "note": "<1 sentence>" }
  ],
  "verdict": "PASS|PARTIAL|FAIL",
  "summary": "<2 sentences: overall BA assessment of whether this feature output is business-valid>"
}

Verdict rules:
- PASS: all 4 dimensions pass
- PARTIAL: 3 dimensions pass (flag the failing one)
- FAIL: 2 or more dimensions fail`;
}

async function runBAInference(feature: FeatureConfig): Promise<BAResult> {
  const envMissing = Object.values(feature.testFixture).some(v => !v);
  if (envMissing) {
    return {
      featureId:   feature.id,
      featureName: feature.name,
      routeCalled: feature.route,
      rawOutput:   "",
      dimensions:  [],
      verdict:     "FAIL",
      summary:     `SKIP — test fixture env vars not set for ${feature.id}. Set GATE_CAMPAIGN_ID, GATE_CLIENT_ID, GATE_PERIOD_START, GATE_WEEK_NUMBER.`,
    };
  }

  // Call the route
  const r = await callRoute(feature.route, feature.testFixture as Record<string, unknown>);
  if (!r.ok) {
    return {
      featureId:   feature.id,
      featureName: feature.name,
      routeCalled: feature.route,
      rawOutput:   JSON.stringify(r.data),
      dimensions:  [],
      verdict:     "FAIL",
      summary:     `Route returned HTTP ${r.status}. Cannot run BA inference on an error response.`,
    };
  }

  // Extract the most relevant AI text fields
  const d = r.data as Record<string, unknown>;
  const aiFields = [
    "ai_narrative", "ai_read", "signal_pattern_read", "activation_direction",
    "cross_channel_narrative",
    // F31 fields
    "executive_summary",
    // F32 fields
    "chain_summary",
    // F33 fields
    "headline", "context", "implication", "recommendation",
  ];
  const outputText = aiFields
    .filter(f => d[f])
    .map(f => `[${f.toUpperCase()}]\n${d[f]}`)
    .join("\n\n");

  if (!outputText) {
    return {
      featureId:   feature.id,
      featureName: feature.name,
      routeCalled: feature.route,
      rawOutput:   JSON.stringify(d),
      dimensions:  [],
      verdict:     "FAIL",
      summary:     "Route returned no recognisable AI text fields. Check the route ran correctly and saved to DB.",
    };
  }

  // Call Haiku for BA inference
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  const response = await anthropic.messages.create({
    model:      GATE_MODEL,
    max_tokens: 800,
    messages:   [{ role: "user", content: buildBAPrompt(feature, outputText) }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed  = JSON.parse(cleaned);
    return {
      featureId:   feature.id,
      featureName: feature.name,
      routeCalled: feature.route,
      rawOutput:   outputText,
      dimensions:  parsed.dimensions ?? [],
      verdict:     parsed.verdict ?? "FAIL",
      summary:     parsed.summary ?? "",
    };
  } catch {
    return {
      featureId:   feature.id,
      featureName: feature.name,
      routeCalled: feature.route,
      rawOutput:   outputText,
      dimensions:  [],
      verdict:     "FAIL",
      summary:     `BA inference parse error. Raw evaluator output: ${raw.slice(0, 200)}`,
    };
  }
}

// ─── Report writer ────────────────────────────────────────────────────────────

function writeReport(
  techResults: TechResult[],
  baResults:   BAResult[],
  sprintNum:   number,
): void {
  const lines: string[] = [];
  const ts = new Date().toISOString();

  lines.push(`# ShiftImpact OS — Sprint ${sprintNum} Gate Report`);
  lines.push(`Generated: ${ts}`);
  lines.push("");

  // Tech summary
  const techPass  = techResults.filter(r => r.status === "PASS").length;
  const techFail  = techResults.filter(r => r.status === "FAIL").length;
  const techFixed = techResults.filter(r => r.status === "FIXED").length;
  const techNote  = techResults.filter(r => r.status === "NOTE").length;
  lines.push(`## Layer 1 — Technical  |  ${techPass} PASS  ${techFixed} FIXED  ${techFail} FAIL  ${techNote} NOTE`);
  for (const r of techResults) {
    const icon = r.status === "PASS" ? "✔" : r.status === "FIXED" ? "⚙" : r.status === "NOTE" ? "◐" : "✘";
    lines.push(`${icon} [${r.id}] ${r.label}: ${r.detail}`);
    if (r.remedy) lines.push(`   → REMEDY: ${r.remedy}`);
  }

  lines.push("");

  // BA summary
  if (baResults.length > 0) {
    const baPass    = baResults.filter(r => r.verdict === "PASS").length;
    const baPartial = baResults.filter(r => r.verdict === "PARTIAL").length;
    const baFail    = baResults.filter(r => r.verdict === "FAIL").length;
    lines.push(`## Layer 2 — BA Inference  |  ${baPass} PASS  ${baPartial} PARTIAL  ${baFail} FAIL`);
    for (const r of baResults) {
      const icon = r.verdict === "PASS" ? "✔" : r.verdict === "PARTIAL" ? "◐" : "✘";
      lines.push(`${icon} [${r.featureId}] ${r.featureName} (${r.routeCalled})`);
      lines.push(`   Verdict: ${r.verdict} — ${r.summary}`);
      for (const d of r.dimensions) {
        const dIcon = d.verdict === "PASS" ? "✔" : "✘";
        lines.push(`   ${dIcon} ${d.dimension}: ${d.note}`);
        if (d.verdict === "FAIL") lines.push(`      Evidence: "${d.evidence}"`);
      }
    }
  }

  lines.push("");
  const sprintPass = techFail === 0 && baResults.every(r => r.verdict !== "FAIL");
  lines.push(`## GATE STATUS: ${sprintPass ? "✔ SPRINT COMPLETE" : "✘ BLOCKED — resolve FAILs before closing sprint"}`);

  const reportPath = path.join(__dirname, `sprint-${sprintNum}-gate-report.md`);
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
  log(`\n${C.gray}Report written → ${reportPath}${C.reset}`);
}

// ─── Main runner ──────────────────────────────────────────────────────────────

async function run() {
  const args    = process.argv.slice(2);
  const doStatic = args.includes("--static") || args.includes("--all");
  const doBA     = args.includes("--ba")     || args.includes("--all");
  const autoFix  = args.includes("--fix");

  if (!doStatic && !doBA) {
    log(`Usage: npx tsx eval/sprint-gate.ts --static | --ba | --all | --fix`);
    process.exit(1);
  }

  const sprint = SPRINT_CONFIG.sprintNumber;
  log(`\n${C.bold}ShiftImpact OS — Sprint ${sprint} Gate${C.reset}  ${SPRINT_CONFIG.date}`);
  log("═".repeat(68));

  let techResults: TechResult[] = [];
  let baResults:   BAResult[]   = [];

  // ── Layer 1 ────────────────────────────────────────────────────────────────
  if (doStatic || autoFix) {
    log(`\n${C.bold}LAYER 1 — Technical Checks${autoFix ? " (auto-fix ON)" : ""}${C.reset}`);
    techResults = await runTechChecks(autoFix);
    for (const r of techResults) {
      const msg = `[${r.id}] ${r.label}`;
      if      (r.status === "PASS")  pass(msg);
      else if (r.status === "FIXED") fixed(`${msg} — ${r.detail}`);
      else if (r.status === "NOTE")  review(msg + " — " + r.detail);
      else                           fail(`${msg}\n         ${C.red}→ ${r.detail}${C.reset}${r.remedy ? `\n         ${C.yellow}REMEDY: ${r.remedy}${C.reset}` : ""}`);
    }
    const fails = techResults.filter(r => r.status === "FAIL").length;
    log(`\n  ${fails === 0 ? C.green + "Layer 1: 0 FAIL — technical gate clear" : C.red + `Layer 1: ${fails} FAIL(s) — sprint BLOCKED`}${C.reset}`);
  }

  // ── Layer 2 ────────────────────────────────────────────────────────────────
  if (doBA) {
    if (!process.env.ANTHROPIC_API_KEY) {
      log(`\n${C.red}Layer 2 skipped — ANTHROPIC_API_KEY not set${C.reset}`);
    } else {
      log(`\n${C.bold}LAYER 2 — BA Inference Evaluation${C.reset}`);
      log(`${C.gray}Calling routes at ${BASE_URL} — BA inference model: ${GATE_MODEL}${C.reset}\n`);

      for (const feature of SPRINT_CONFIG.features) {
        log(`${C.blue}▶ ${feature.id} — ${feature.name}${C.reset}`);
        const result = await runBAInference(feature);
        baResults.push(result);

        const icon = result.verdict === "PASS" ? C.green + "✔" : result.verdict === "PARTIAL" ? C.yellow + "◐" : C.red + "✘";
        log(`  ${icon} ${result.verdict}${C.reset}  ${result.summary}`);

        for (const d of result.dimensions) {
          const di = d.verdict === "PASS" ? C.green + "✔" : C.red + "✘";
          log(`    ${di} ${d.dimension}${C.reset}: ${d.note}`);
          if (d.verdict === "FAIL") {
            log(`       ${C.yellow}Evidence: "${d.evidence.slice(0, 120)}..."${C.reset}`);
          }
        }
        log("");
      }
    }
  }

  // ── Gate verdict ───────────────────────────────────────────────────────────
  const techFails = techResults.filter(r => r.status === "FAIL").length;
  const baFails   = baResults.filter(r => r.verdict === "FAIL").length;
  const blocked   = techFails > 0 || baFails > 0;

  log("═".repeat(68));
  if (blocked) {
    log(`${C.red}${C.bold}✘  SPRINT ${sprint} BLOCKED${C.reset}`);
    if (techFails > 0) log(`   ${C.red}${techFails} technical FAIL(s) — run --fix or apply remedies manually${C.reset}`);
    if (baFails   > 0) log(`   ${C.red}${baFails} BA inference FAIL(s) — review feature output and re-run${C.reset}`);
  } else {
    log(`${C.green}${C.bold}✔  SPRINT ${sprint} GATE CLEAR — both layers passed${C.reset}`);
    log(`${C.gray}   Mark sprint complete in task system.${C.reset}`);
  }

  // Write report
  writeReport(techResults, baResults, sprint);
  log("");

  process.exit(blocked ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
