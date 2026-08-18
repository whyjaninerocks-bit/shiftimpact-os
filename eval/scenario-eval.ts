#!/usr/bin/env npx tsx
// ============================================================================
// ShiftImpact OS — Scenario-Level Eval  (scenario-eval.ts)
// ============================================================================
//
// 5 end-to-end workflow scenarios mapped to real client tensions.
// Unlike golden-set.ts (isolated route tests) and sprint-gate.ts (per-feature
// BA inference), these test the FULL JOURNEY — multiple steps, multiple
// components, from the first data entry to the business decision it enables.
//
// Each scenario answers: "Can Janine complete this client workflow and arrive
// at a decision she would stake her reputation on?"
//
// Scenarios:
//   S1 — Drypers CRM Attribution Journey
//   S2 — Sptrizer Cultural Intelligence Journey
//   S3 — Yeo's Cross-Channel Blind Spot Journey
//   S4 — Brand Momentum to Client Conversation Journey (GA4)
//   S5 — Consumer State to Activation Decision Journey (GA3)
//
// Usage:
//   npx tsx eval/scenario-eval.ts --all        # run all automatable steps
//   npx tsx eval/scenario-eval.ts --checklist  # print human-review steps only
//
// Environment vars:
//   ANTHROPIC_API_KEY
//   GATE_MODEL          (default: claude-sonnet-4-6)
//   EVAL_BASE_URL       (default: http://localhost:3000)
//   SCENARIO_CAMPAIGN_ID, SCENARIO_CLIENT_ID,
//   SCENARIO_PERIOD_START, SCENARIO_WEEK_NUMBER
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepMode   = "auto" | "human";
type StepStatus = "PASS" | "FAIL" | "REVIEW" | "SKIP";

interface ScenarioStep {
  stepId:     string;
  mode:       StepMode;
  action:     string;               // what happens in this step
  assertion:  string;               // what must be true after this step
  failIf:     string;               // what would make this step fail
  check?:     () => Promise<{ pass: boolean; detail: string }>;
}

interface Scenario {
  id:             string;
  client:         string;           // named client or GA reference
  tension:        string;           // the original problem this workflow solves
  businessOutcome: string;          // the decision that should be possible after this journey
  steps:          ScenarioStep[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m", bold: "\x1b[1m",
  green:  "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", gray: "\x1b[90m",
  blue:   "\x1b[34m", cyan: "\x1b[36m",
  magenta:"\x1b[35m",
};

const BASE_URL  = process.env.EVAL_BASE_URL   ?? "http://localhost:3000";
const MODEL     = process.env.GATE_MODEL      ?? "claude-sonnet-4-6";

async function post(route: string, body: Record<string, unknown>) {
  try {
    const res  = await fetch(`${BASE_URL}${route}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: String(err) } };
  }
}

async function evaluateOutput(
  output: string,
  question: string,
  passStandard: string,
): Promise<{ pass: boolean; evidence: string; note: string }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  const res = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Evaluate this AI system output against the question below.

OUTPUT:
${output}

QUESTION: ${question}
PASS STANDARD: ${passStandard}

Respond in JSON only:
{ "pass": true|false, "evidence": "<direct quote from output that supports verdict>", "note": "<one sentence>" }`,
    }],
  });
  const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { pass: false, evidence: "", note: "Parse error on evaluator response." };
  }
}

// ─── SCENARIOS ────────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // S1 — Drypers CRM Attribution Journey
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     "S1",
    client: "Drypers / Vinda Group",
    tension: "Revenue attribution gap — non-loyalty buyers who purchase from CRM campaigns are not tracked. No formula exists for estimating dark conversions beyond the loyalty programme.",
    businessOutcome: "Janine can present Drypers with a credible, methodology-labelled incremental lift figure from a Holdout test — without requiring individual-level tracking (PDPA-safe).",
    steps: [
      {
        stepId:    "S1.1",
        mode:      "human",
        action:    "Janine opens the Drypers campaign page and navigates to the Attribution section.",
        assertion: "AttributionSection renders with Add Record form visible. Three test type options present: MMM, Holdout, Proxy.",
        failIf:    "Attribution section is missing, or only one test type is available.",
      },
      {
        stepId:    "S1.2",
        mode:      "human",
        action:    "Janine selects test_type=Holdout, enters channel_name='CRM Email', week_number=6, spend_rm=8000, incremental_lift_pct=22, notes='30% holdout cell in Selangor. Result: 22% incremental sales lift over control.'",
        assertion: "Record saves and appears in the Week 6 group with a Holdout badge (blue). Lift displays as '22%'. Notes are visible.",
        failIf:    "Record fails to save. Lift not displayed. Badge missing or wrong colour.",
      },
      {
        stepId:    "S1.3",
        mode:      "human",
        action:    "Janine adds 11 more MMM records across weeks 1–5 and 7–12 (two channels each week: CRM Email + Shopee).",
        assertion: "MMM readiness bar reaches 100% and shows 'Ready' badge in green. Distinct week count = 12.",
        failIf:    "Bar does not reach 100% with 12 distinct weeks. 'Ready' badge not shown.",
      },
      {
        stepId:    "S1.4",
        mode:      "human",
        action:    "Janine reviews the Attribution section in its final state before a client meeting.",
        assertion: "Three methodology types visible with distinct badges (MMM/Holdout/Proxy). The Holdout record's 22% lift is the headline data point Janine would use in conversation. No internal fields (spend reconstruction logic, MMM weights) are visible.",
        failIf:    "Internal methodology details exposed. Lift figure buried or unclear. Janine would need to open a spreadsheet to find the number.",
      },
      {
        stepId:    "S1.5",
        mode:      "human",
        action:    "BUSINESS OUTCOME CHECK: Can Janine say to Drypers — 'Our Holdout test in Selangor shows a 22% incremental sales lift from the CRM campaign, PDPA-compliant, no individual tracking required'?",
        assertion: "YES. The system surfaced this number with methodology label (Holdout) and a notes field with full test context. The claim is credible and sourced.",
        failIf:    "The system requires Janine to manually retrieve or reconstruct this number outside the app.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // S2 — Sptrizer Cultural Intelligence Journey
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     "S2",
    client: "Sptrizer",
    tension: "Campaign signals dropped during a cultural moment (Ramadan final week) but the team couldn't tell if it was a campaign problem or a market-wide audience behaviour shift. Creative decisions were made on bad inference.",
    businessOutcome: "Janine can show Sptrizer that the system separates cultural suppression from campaign underperformance — so the team never pulls budget or changes creative based on a market condition disguised as a campaign signal.",
    steps: [
      {
        stepId:    "S2.1",
        mode:      "human",
        action:    "Janine opens the campaign page for the week where Ramadan final week overlapped with below-threshold signals. She navigates to the Market Context section (F16C).",
        assertion: "MarketContextSection is visible with fields for cultural_moment_flag, cultural_moment_note, category_search_trend, competitive_sov_change, platform_algorithm_flag.",
        failIf:    "Market Context section missing or cultural_moment_flag field not present.",
      },
      {
        stepId:    "S2.2",
        mode:      "human",
        action:    "Janine sets: cultural_moment_flag=true, cultural_moment_note='Final week Ramadan — Malay youth category, humour content suppressed, purchase decisions deferred to post-Eid.' Saves the market context.",
        assertion: "Context saved successfully. UI confirms save.",
        failIf:    "Save fails. Note text truncated.",
      },
      {
        stepId:    "S2.3",
        mode:      "auto",
        action:    "Signal report AI is called for this week with the cultural moment context set.",
        assertion: "ai_narrative explicitly distinguishes between campaign signal performance and the cultural moment. The word 'cultural' or 'Ramadan' or 'moment' appears in the narrative.",
        failIf:    "Narrative blames campaign creative for the signal drop without mentioning cultural context.",
        check: async () => {
          const campaignId = process.env.SCENARIO_CAMPAIGN_ID ?? "";
          const weekNum    = Number(process.env.SCENARIO_WEEK_NUMBER ?? 5);
          if (!campaignId) return { pass: false, detail: "SCENARIO_CAMPAIGN_ID not set" };
          const r = await post("/api/signal-report", { campaign_id: campaignId, week_number: weekNum });
          if (!r.ok) return { pass: false, detail: `HTTP ${r.status}` };
          const d  = r.data as Record<string, unknown>;
          const narrative = String(d.ai_narrative ?? "");
          const eval_ = await evaluateOutput(
            narrative,
            "Does the narrative explicitly acknowledge a cultural or external market factor as contributing to the signal reading this week?",
            "The words 'cultural', 'Ramadan', 'moment', 'market', or 'external' must appear AND be linked to the signal performance, not just mentioned in passing.",
          );
          return { pass: eval_.pass, detail: `${eval_.note} Evidence: "${eval_.evidence}"` };
        },
      },
      {
        stepId:    "S2.4",
        mode:      "human",
        action:    "Janine reads the signal narrative alongside the health colours (which may be Amber/Red — signals were genuinely low).",
        assertion: "Health colours are HONEST (Amber/Red where signals are below threshold). The narrative adds CONTEXT — not as an excuse, but as an explanation. Both are present simultaneously.",
        failIf:    "Narrative softens health colours to Green because of the cultural flag. OR narrative ignores the cultural context and reports plain underperformance.",
      },
      {
        stepId:    "S2.5",
        mode:      "human",
        action:    "BUSINESS OUTCOME CHECK: Can Janine tell Sptrizer — 'The signals were below threshold this week, but this is consistent with Ramadan final week behaviour. We recommend holding creative and budget — this is not a campaign problem.'?",
        assertion: "YES. The system gave her both the honest health signal AND the contextual explanation to hold that position confidently.",
        failIf:    "Janine would have to make that call from gut feel because the system didn't surface the distinction.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // S3 — Yeo's Cross-Channel Blind Spot Journey
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     "S3",
    client: "Yeo's / CaraMu",
    tension: "Individual channel signals looked healthy in isolation, but the campaign idea was fragmenting across channels — no single view showed whether the Big Idea was travelling coherently through the full funnel.",
    businessOutcome: "Janine can identify which funnel stage is leaking and give Yeo's a cross-channel recommendation that no single platform dashboard could produce.",
    steps: [
      {
        stepId:    "S3.1",
        mode:      "human",
        action:    "Janine opens the Yeo's campaign page. The campaign has 3 active channels: TikTok TopView (Demand), Meta Paid Social (Nurture), Shopee Ads (Conversion). She navigates to the Cross-Channel section.",
        assertion: "CrossChannelSection visible. Current week's channel metrics form is accessible. All 3 channels listed.",
        failIf:    "Cross-channel section missing. Fewer than 3 channels shown.",
      },
      {
        stepId:    "S3.2",
        mode:      "human",
        action:    "Janine enters weekly metrics: TikTok (Green, reach 2.1M, save rate 8.2%), Meta (Amber, engagement 1.4%, below benchmark), Shopee (Green, CTR 3.8%). Idea integrity note: 'TikTok and Shopee aligned on CaraMu freshness message. Meta running generic brand-awareness copy — no CaraMu hook.'",
        assertion: "All metrics saved. Idea integrity note saved. Form clears after save.",
        failIf:    "Metrics fail to save. Idea integrity note dropped.",
      },
      {
        stepId:    "S3.3",
        mode:      "auto",
        action:    "Cross-channel report AI is called for this week.",
        assertion: "ai_narrative names all 3 channels. dominant_funnel_gap references Nurture (Meta is the Amber channel). Idea integrity score ≤ 3 (fragmentation noted). Recommended actions are cross-channel, not single-channel.",
        failIf:    "Narrative only discusses TikTok and Shopee (the Green channels). dominant_funnel_gap is wrong. Recommendations say 'fix Meta' not 'the Nurture stage is leaking across the funnel.'",
        check: async () => {
          const campaignId = process.env.SCENARIO_CAMPAIGN_ID ?? "";
          const weekNum    = Number(process.env.SCENARIO_WEEK_NUMBER ?? 5);
          if (!campaignId) return { pass: false, detail: "SCENARIO_CAMPAIGN_ID not set" };
          const r = await post("/api/cross-channel-report", { campaign_id: campaignId, week_number: weekNum });
          if (!r.ok) return { pass: false, detail: `HTTP ${r.status}` };
          const d  = r.data as Record<string, unknown>;
          const narrative = String(d.ai_narrative ?? "");
          const eval_ = await evaluateOutput(
            narrative,
            "Does the narrative identify a specific funnel stage gap (not just a channel gap) and provide a cross-channel recommendation — not just 'fix the underperforming channel'?",
            "Must name a funnel stage (Demand/Nurture/Conversion/Retention) AND recommend an action that involves more than one channel.",
          );
          return { pass: eval_.pass, detail: `Funnel gap: ${d.dominant_funnel_gap}. ${eval_.note}` };
        },
      },
      {
        stepId:    "S3.4",
        mode:      "human",
        action:    "Janine reads the idea integrity score and the narrative.",
        assertion: "Idea integrity score reflects the Meta creative drift (score ≤ 3). Narrative explicitly connects the Nurture-stage gap to the Meta copy misalignment — not generic 'Meta is underperforming'.",
        failIf:    "Narrative says 'Meta engagement is below benchmark. Consider optimising Meta.' This is a channel metric, not a cross-channel intelligence output.",
      },
      {
        stepId:    "S3.5",
        mode:      "human",
        action:    "BUSINESS OUTCOME CHECK: Can Janine tell Yeo's — 'TikTok and Shopee are delivering the CaraMu idea well. The gap is in Nurture — Meta is running disconnected copy that breaks the consumer journey between demand and conversion. Fix the copy, not the budget.'?",
        assertion: "YES. The system gave her the cross-channel read that no single platform dashboard could — because it synthesised across funnel stages, not just channel metrics.",
        failIf:    "Janine assembled this insight herself from individual channel reports. The system didn't connect the dots.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // S4 — Brand Momentum to Client Conversation Journey (GA4)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     "S4",
    client: "All clients — GA4 Brand Stewardship",
    tension: "Clients can see campaign performance but not brand momentum. SOV can be going up while competitive share goes down — and nothing flags the contradiction until it's too late.",
    businessOutcome: "Janine can open a brand health conversation at board level using the BMS output — without exposing the scoring methodology or needing a separate research study.",
    steps: [
      {
        stepId:    "S4.1",
        mode:      "human",
        action:    "Janine opens a client page and navigates to the Brand Momentum section. She creates a new BMS period: 'Q2 2026', start 2026-04-01, end 2026-06-30.",
        assertion: "BMS form opens with all 6 dimension fieldsets. Period fields accept the dates.",
        failIf:    "BMS section missing. Period fields not present. Form doesn't open.",
      },
      {
        stepId:    "S4.2",
        mode:      "human",
        action:    "Janine enters a conflict scenario: SOV trajectory=Up/Moderate, competitive_context=Losing, sov_som_ratio=Negative. Other 3 dimensions: save rate=Up, UGC=Flat, CEP=Stable. Saves and runs BMS inference.",
        assertion: "BMS inference runs. dimension_conflict_flag=true (SOV up but competitive share down is a material conflict). bms_direction=Neutral or Negative. ai_read names the SOV:competitive conflict explicitly.",
        failIf:    "dimension_conflict_flag=false on a clear SOV/competitive conflict. ai_read smooths over the tension with a balanced summary.",
      },
      {
        stepId:    "S4.3",
        mode:      "auto",
        action:    "Brand momentum API is called for this period.",
        assertion: "Response contains bms_direction ≠ Positive. dimension_conflict_flag=true. ai_read explicitly describes the contradiction between SOV gain and competitive share loss.",
        failIf:    "bms_direction=Positive despite competitive=Losing. Conflict flag absent.",
        check: async () => {
          const clientId    = process.env.SCENARIO_CLIENT_ID    ?? "";
          const periodStart = process.env.SCENARIO_PERIOD_START ?? "";
          if (!clientId || !periodStart) return { pass: false, detail: "SCENARIO_CLIENT_ID or SCENARIO_PERIOD_START not set" };
          const r = await post("/api/brand-momentum", { client_id: clientId, period_start: periodStart });
          if (!r.ok) return { pass: false, detail: `HTTP ${r.status}` };
          const d  = r.data as Record<string, unknown>;
          const aiRead = String(d.ai_read ?? "");
          const notPositive = d.bms_direction !== "Positive";
          const hasConflict = d.dimension_conflict_flag === true;
          const eval_ = await evaluateOutput(
            aiRead,
            "Does the ai_read explicitly describe a contradiction between SOV performance and competitive share loss — and does it frame this as the key strategic issue, not just one of several observations?",
            "The tension must be named as the PRIMARY issue. A passing mention is insufficient.",
          );
          return {
            pass: notPositive && hasConflict && eval_.pass,
            detail: `direction=${d.bms_direction}, conflict=${d.dimension_conflict_flag}. ${eval_.note}`,
          };
        },
      },
      {
        stepId:    "S4.4",
        mode:      "human",
        action:    "Janine reads the ai_read (internal) and the Direction/Velocity/Confidence headline (client-facing summary).",
        assertion: "ai_read gives Janine enough language to explain the SOV:competitive conflict in plain terms. The client-facing headline (Neutral/Decelerating/Confidence 5) is honest without exposing the scoring mechanism.",
        failIf:    "ai_read is generic ('the brand is performing well in some areas'). OR the scoring methodology or dimension weights are visible in any client-facing element.",
      },
      {
        stepId:    "S4.5",
        mode:      "human",
        action:    "BUSINESS OUTCOME CHECK: Can Janine open a board-level conversation: 'Our voice share is growing but we are losing competitive ground — the brand is winning attention but not converting it to market share. This needs a brief review, not more media spend.'?",
        assertion: "YES. The BMS gave her the composite read (Neutral direction, Decelerating velocity) AND the specific conflict (SOV:SOM tension) that supports this recommendation — without a separate brand tracking study.",
        failIf:    "Janine has the numbers but not the language. She would need to write the interpretation herself.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // S5 — Consumer State to Activation Decision Journey (GA3)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id:     "S5",
    client: "All clients — GA3 Consumer Activation",
    tension: "Campaign teams make channel and creative decisions based on media performance metrics, not consumer journey stage. Spend goes to awareness when consumers are ready to convert — and vice versa.",
    businessOutcome: "Janine can prescribe the right activation strategy for the right consumer stage — without the client needing to commission a separate audience research study.",
    steps: [
      {
        stepId:    "S5.1",
        mode:      "human",
        action:    "Janine opens the campaign's Signal Intelligence section at Week 8 of 12. All 3 signals are above threshold (S1=28%, S2=11%, S3=145). Strategy notes: 'Shopee basket abandonment rate high. Purchase intent signals strong. Promotional window opens next week.'",
        assertion: "SignalIntelligenceSection shows all 3 health colours as Green. Week 8 of 12 places this in Phase 3 (Conversion phase).",
        failIf:    "Any health colour incorrect. Phase context not reflected in the section.",
      },
      {
        stepId:    "S5.2",
        mode:      "auto",
        action:    "Consumer Behaviour State inference is called for Week 8 with these signals.",
        assertion: "diagnosed_state = 4 (In Consideration) or 5 (Intent-Active). activation_direction references conversion activation, trial, or purchase trigger — not awareness-building. Phase 3 context reflected in the output.",
        failIf:    "diagnosed_state ≤ 2 with all signals above threshold. activation_direction recommends brand awareness spend in Week 8 of 12.",
        check: async () => {
          const campaignId = process.env.SCENARIO_CAMPAIGN_ID ?? "";
          const weekNum    = Number(process.env.SCENARIO_WEEK_NUMBER ?? 8);
          if (!campaignId) return { pass: false, detail: "SCENARIO_CAMPAIGN_ID not set" };
          const r = await post("/api/behaviour-state", { campaign_id: campaignId, week_number: weekNum });
          if (!r.ok) return { pass: false, detail: `HTTP ${r.status}` };
          const d = r.data as Record<string, unknown>;
          const state      = Number(d.diagnosed_state ?? 0);
          const activation = String(d.activation_direction ?? "");
          const eval_ = await evaluateOutput(
            activation,
            "Does the activation_direction recommend a conversion or purchase-trigger action — not an awareness or engagement action?",
            "Must contain language about conversion, trial, purchase, promotional trigger, or basket recovery. Awareness-building language = FAIL.",
          );
          return {
            pass: state >= 4 && eval_.pass,
            detail: `State=${state} (need ≥4). Activation: ${eval_.note}`,
          };
        },
      },
      {
        stepId:    "S5.3",
        mode:      "human",
        action:    "Janine reads the diagnosed_state, signal_pattern_read, and activation_direction.",
        assertion: "The output tells Janine: (a) where consumers are in the journey (State 4/5), (b) what the signals tell us about their readiness, (c) what to do next (conversion trigger). All three in one read — no cross-referencing required.",
        failIf:    "Output is a state label without an activation recommendation. Janine would need to interpret state → action herself.",
      },
      {
        stepId:    "S5.4",
        mode:      "human",
        action:    "Janine checks: does the activation_direction align with the FRAME Brief's conversion objective for this campaign?",
        assertion: "The recommendation is consistent with the campaign's Phase 3 brief. No contradiction between what the state diagnosis recommends and what the brief already set as the conversion objective.",
        failIf:    "State diagnosis recommends awareness spend while the brief calls for conversion activation. The system is giving contradictory direction.",
      },
      {
        stepId:    "S5.5",
        mode:      "human",
        action:    "BUSINESS OUTCOME CHECK: Can Janine tell the client — 'Consumer signals show your audience is in the consideration-to-intent window. Week 9 is the right moment for a promotional trigger — not more reach. Here's the activation we recommend.'?",
        assertion: "YES. The system gave her a journey-stage read AND an activation prescription in one output. No separate audience research needed.",
        failIf:    "Janine is giving the client a media metric ('signals are Green') rather than a journey-stage insight ('consumers are ready to convert').",
      },
    ],
  },

];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runScenarios(mode: "all" | "checklist") {
  console.log(`\n${C.bold}ShiftImpact OS — Scenario-Level Eval (5 scenarios)${C.reset}`);
  console.log(`${C.gray}Model: ${MODEL}  |  Base URL: ${BASE_URL}${C.reset}`);
  console.log("═".repeat(68));

  const results: Array<{ scenario: Scenario; step: ScenarioStep; status: StepStatus; detail: string }> = [];

  for (const scenario of SCENARIOS) {
    const color = scenario.id === "S1" ? C.green :
                  scenario.id === "S2" ? C.yellow :
                  scenario.id === "S3" ? C.blue :
                  scenario.id === "S4" ? C.magenta : C.cyan;

    console.log(`\n${color}${C.bold}${scenario.id} — ${scenario.client}${C.reset}`);
    console.log(`${C.gray}Tension:${C.reset} ${scenario.tension}`);
    console.log(`${C.gray}Business outcome:${C.reset} ${scenario.businessOutcome}`);

    for (const step of scenario.steps) {
      let status: StepStatus = "REVIEW";
      let detail = "";

      if (mode === "all" && step.mode === "auto" && step.check) {
        try {
          const r = await step.check();
          status = r.pass ? "PASS" : "FAIL";
          detail = r.detail;
        } catch (err) {
          status = "FAIL";
          detail = String(err);
        }
      } else if (step.mode === "human") {
        status = "REVIEW";
        detail = "Manual verification required";
      } else if (step.mode === "auto" && !step.check) {
        status = "SKIP";
        detail = "No auto-check defined";
      }

      results.push({ scenario, step, status, detail });

      const icon = status === "PASS"   ? `${C.green}✔ PASS${C.reset}` :
                   status === "FAIL"   ? `${C.red}✘ FAIL${C.reset}` :
                   status === "REVIEW" ? `${C.yellow}◐ REVIEW${C.reset}` :
                                         `${C.gray}○ SKIP${C.reset}`;
      const modeTag = step.mode === "auto" ? `${C.cyan}[auto]${C.reset}` : `${C.gray}[human]${C.reset}`;
      console.log(`\n  ${icon}  ${modeTag}  ${C.bold}${step.stepId}${C.reset}`);
      console.log(`  ${C.gray}Action:${C.reset}    ${step.action}`);
      console.log(`  ${C.green}→ Expect:${C.reset}  ${step.assertion}`);
      console.log(`  ${C.red}→ Fail if:${C.reset} ${step.failIf}`);
      if (detail && status !== "REVIEW") {
        console.log(`  ${C.gray}Detail:${C.reset}    ${detail}`);
      }

      // Business outcome step — emphasise
      if (step.stepId.endsWith(".5")) {
        console.log(`\n  ${C.bold}${color}▶ BUSINESS OUTCOME:${C.reset} ${scenario.businessOutcome}`);
      }
    }
  }

  // Summary
  const counts = { PASS: 0, FAIL: 0, REVIEW: 0, SKIP: 0 };
  results.forEach(r => counts[r.status]++);

  console.log("\n" + "═".repeat(68));
  console.log(
    `${C.bold}Results:${C.reset}  ` +
    `${C.green}${counts.PASS} PASS${C.reset}  ` +
    `${C.red}${counts.FAIL} FAIL${C.reset}  ` +
    `${C.yellow}${counts.REVIEW} REVIEW${C.reset}  ` +
    `${C.gray}${counts.SKIP} SKIP${C.reset}`
  );
  console.log(`${C.gray}REVIEW steps require manual verification against the live app.${C.reset}`);

  if (mode === "checklist") {
    console.log(`\n${C.bold}HUMAN REVIEW CHECKLIST${C.reset}`);
    console.log("─".repeat(68));
    results
      .filter(r => r.status === "REVIEW")
      .forEach(r => {
        console.log(`\n${r.step.stepId}  [${r.scenario.client}]`);
        console.log(`  Action:    ${r.step.action}`);
        console.log(`  ${C.green}Expect:${C.reset}    ${r.step.assertion}`);
        console.log(`  ${C.red}Fail if:${C.reset}   ${r.step.failIf}`);
      });
  }

  const blocked = counts.FAIL > 0;
  console.log(`\n${blocked ? C.red + "✘ SCENARIO EVAL: BLOCKED — resolve FAILs" : C.green + "✔ SCENARIO EVAL: AUTO STEPS CLEAR — work through REVIEW steps manually"}${C.reset}\n`);
  process.exit(blocked ? 1 : 0);
}

const mode = process.argv.includes("--checklist") ? "checklist" : "all";
runScenarios(mode).catch(err => { console.error(err); process.exit(1); });
