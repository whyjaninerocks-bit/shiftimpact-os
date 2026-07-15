#!/usr/bin/env npx tsx
// ============================================================================
// ShiftImpact OS — Evaluation Suite
// ============================================================================
//
// Usage:
//   npx tsx eval/suite.ts --static        # static file checks only (no server)
//   npx tsx eval/suite.ts --integration   # integration tests (requires localhost:3000)
//   npx tsx eval/suite.ts --all           # all tests
//
// The 4-dimension rubric:
//
//   ACCURACY  — Does the AI output correctly reflect the input data?
//               No hallucination against supplied inputs.
//
//   TONE      — Is the register appropriate for the audience?
//               Internal: frank, strategic, specific.
//               Client: directional headline only — no operational detail.
//
//   SAFETY    — Are IP-protected fields inaccessible from the Client Interface?
//               Internal system knowledge must never leak to /portal/* routes.
//
//   CITATION  — Does every AI assertion trace to a named input field or metric?
//               In a closed-input system, citation = input grounding, not URLs.
//               See CITATION NOTE below for scope limitations.
//
// CITATION NOTE:
//   ShiftImpact OS is a closed-input system. All AI inputs come from the
//   strategy team — there are no external knowledge bases or web sources.
//   "Citation" therefore means: every AI assertion references a specific
//   value, label, or dimension name that appears in the input payload.
//   It does NOT mean URL or academic citation.
//
//   NOT APPLICABLE to:
//   - BMS direction/velocity — composite judgments across 6 dimensions;
//     no single field is the "source". Justified by design.
//   - Confidence scores — derived numeric outputs, not traceable claims.
//   These are flagged as CITATION_NA in the test registry below.
//
// ============================================================================

import * as fs from "fs";
import * as path from "path";

// ─── Rubric types ─────────────────────────────────────────────────────────────

type Dimension = "ACCURACY" | "TONE" | "SAFETY" | "CITATION";
type Mode = "static" | "integration" | "human-review";
type Status = "PASS" | "FAIL" | "REVIEW" | "NA" | "SKIP";

interface TestCase {
  id: string;
  feature: string;
  dimension: Dimension;
  mode: Mode;
  description: string;
  // Static checks
  staticCheck?: () => Promise<{ pass: boolean; detail: string }>;
  // Integration: pre-built fixture + assertion (run against localhost:3000)
  integrationCheck?: () => Promise<{ pass: boolean; detail: string }>;
  // Human-review: checklist text shown to reviewer
  reviewChecklist?: string[];
  // Citation scope note
  citationNote?: string;
}

// ─── Output helpers ───────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  green: "\x1b[32m",
  red:   "\x1b[31m",
  yellow:"\x1b[33m",
  blue:  "\x1b[34m",
  gray:  "\x1b[90m",
  cyan:  "\x1b[36m",
};

function statusLabel(s: Status): string {
  switch (s) {
    case "PASS":   return `${C.green}✔ PASS${C.reset}`;
    case "FAIL":   return `${C.red}✘ FAIL${C.reset}`;
    case "REVIEW": return `${C.yellow}◐ REVIEW${C.reset}`;
    case "NA":     return `${C.gray}— N/A${C.reset}`;
    case "SKIP":   return `${C.gray}○ SKIP${C.reset}`;
  }
}

function dimLabel(d: Dimension): string {
  const cols: Record<Dimension, string> = {
    ACCURACY: C.blue,
    TONE:     C.cyan,
    SAFETY:   C.red,
    CITATION: C.yellow,
  };
  return `${cols[d]}${d}${C.reset}`;
}

// ─── File-based helpers for static checks ────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "..");

function readComponent(relPath: string): string {
  const abs = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(abs)) return "";
  return fs.readFileSync(abs, "utf8");
}

function fileContains(relPath: string, pattern: string | RegExp): boolean {
  const content = readComponent(relPath);
  if (!content) return false;
  return typeof pattern === "string"
    ? content.includes(pattern)
    : pattern.test(content);
}

function fileNotContains(relPath: string, pattern: string | RegExp): boolean {
  return !fileContains(relPath, pattern);
}

function anyPortalFileContains(pattern: string | RegExp): boolean {
  const portalDir = path.join(REPO_ROOT, "app", "portal");
  if (!fs.existsSync(portalDir)) return false;
  const walk = (dir: string): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap(e =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : [path.join(dir, e.name)]
    );
  };
  return walk(portalDir).some(f => {
    const c = fs.readFileSync(f, "utf8");
    return typeof pattern === "string" ? c.includes(pattern) : pattern.test(c);
  });
}

// ─── Integration helper ───────────────────────────────────────────────────────

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";

async function postRoute(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: String(err) } };
  }
}

// ─── TEST REGISTRY ────────────────────────────────────────────────────────────

const TESTS: TestCase[] = [

  // ══════════════════════════════════════════════════════════════════
  // ACCURACY — AI output correctly reflects input data
  // ══════════════════════════════════════════════════════════════════

  {
    id: "A1",
    feature: "F19 Brand Momentum Score",
    dimension: "ACCURACY",
    mode: "integration",
    description: "All 6 dimensions positive → bms_direction must be Positive, confidence ≥ 7",
    integrationCheck: async () => {
      // NOTE: Uses a real client_id + period_start that you must create first via the UI.
      // Replace with an actual UUID from your Supabase brand_momentum_scores table.
      const FIXTURE_CLIENT_ID = process.env.TEST_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";
      const FIXTURE_PERIOD_START = process.env.TEST_PERIOD_START ?? "2026-01-01";
      const r = await postRoute("/api/brand-momentum", {
        client_id:    FIXTURE_CLIENT_ID,
        period_start: FIXTURE_PERIOD_START,
      });
      if (!r.ok) return { pass: false, detail: `Route returned ${r.status}: ${JSON.stringify(r.data)}` };
      const d = r.data as Record<string, unknown>;
      const directionOk  = d.bms_direction === "Positive";
      const confidenceOk = typeof d.bms_confidence === "number" && d.bms_confidence >= 7;
      return {
        pass: directionOk && confidenceOk,
        detail: `direction=${d.bms_direction} confidence=${d.bms_confidence} (expected Positive, ≥7)`,
      };
    },
    reviewChecklist: [
      "Manually save a BMS record with ALL 6 dimensions = positive/up/gaining/expanding",
      "Run compute — verify bms_direction = Positive",
      "Verify bms_confidence ≥ 7 (all dimensions present, no conflicts)",
    ],
  },

  {
    id: "A2",
    feature: "F19 Brand Momentum Score",
    dimension: "ACCURACY",
    mode: "integration",
    description: "Conflicting dimensions (SOV Up, competitive_context Losing) → dimension_conflict_flag = true",
    integrationCheck: async () => {
      const FIXTURE_CLIENT_ID    = process.env.TEST_CLIENT_CONFLICT_ID ?? "00000000-0000-0000-0000-000000000001";
      const FIXTURE_PERIOD_START = process.env.TEST_PERIOD_CONFLICT_START ?? "2026-02-01";
      const r = await postRoute("/api/brand-momentum", {
        client_id:    FIXTURE_CLIENT_ID,
        period_start: FIXTURE_PERIOD_START,
      });
      if (!r.ok) return { pass: false, detail: `Route returned ${r.status}` };
      const d = r.data as Record<string, unknown>;
      return {
        pass: d.dimension_conflict_flag === true,
        detail: `dimension_conflict_flag=${d.dimension_conflict_flag} (expected true)`,
      };
    },
    reviewChecklist: [
      "Save BMS with SOV=Up/Strong but competitive_context=Losing and sov_som_ratio=Negative",
      "These directly conflict — AI must flag dimension_conflict_flag=true",
      "If it returns false, the conflict-detection logic in the Haiku prompt is under-specified",
    ],
  },

  {
    id: "A3",
    feature: "F18A Consumer Behaviour State",
    dimension: "ACCURACY",
    mode: "human-review",
    description: "Weak signals (S1=2%, S2=1%, S3=5 items) → diagnosed_state must be 1 or 2 (Unaware or Aware-Passive)",
    reviewChecklist: [
      "Create campaign with locked thresholds: S1 threshold=20%, S2=8%, S3 count=100",
      "Log week with S1=2%, S2=1%, S3=5",
      "Run Behaviour State diagnostic",
      "Verify diagnosed_state is 1 (Unaware) or 2 (Aware but Passive)",
      "FAIL if state ≥ 3 — weak signals cannot justify consideration-stage classification",
    ],
  },

  {
    id: "A4",
    feature: "F18A Consumer Behaviour State",
    dimension: "ACCURACY",
    mode: "human-review",
    description: "Strong signals (S1=40%, S2=15%, S3=200 items) + strategy_notes='high purchase intent' → state 4 or 5",
    reviewChecklist: [
      "Create campaign with locked thresholds: S1=20%, S2=8%, S3=100",
      "Log week with S1=40% (2× threshold), S2=15% (1.9× threshold), S3=200",
      "Add strategy_notes: 'strong purchase intent signals observed in all channels'",
      "Run diagnostic — expect diagnosed_state 4 (In Consideration) or 5 (Intent-Active)",
      "FAIL if state ≤ 2 — all signals are well above threshold",
    ],
  },

  {
    id: "A5",
    feature: "F12 Signal Intelligence",
    dimension: "ACCURACY",
    mode: "human-review",
    description: "Signal below red_pct threshold → narrative must flag specific concern, not give clean bill of health",
    reviewChecklist: [
      "Set thresholds: S1 threshold=20%, amber=10%, red=0%",
      "Log week: S1_actual=3% — this is below amber but above red",
      "Run /api/signal-report",
      "Verify ai_narrative contains language indicating S1 is under-performing vs threshold",
      "FAIL if narrative says signals are healthy without caveat",
      "Check health fields: demand_health or nurture_health should be Amber or Red (not Green)",
    ],
  },

  {
    id: "A6",
    feature: "F14B Attribution",
    dimension: "ACCURACY",
    mode: "human-review",
    description: "MMM readiness bar correctly reflects week count (0/12 = Early, 6/12 = Building, 12/12 = Ready)",
    reviewChecklist: [
      "Add 0 records → MMM bar shows 'Early' (grey)",
      "Add records for 6 distinct weeks → bar shows 'Building' (amber)",
      "Add records for 12 distinct weeks → bar shows 'Ready' (green)",
      "Verify week count is based on DISTINCT week_number values, not record count",
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // TONE — Appropriate register for audience
  // ══════════════════════════════════════════════════════════════════

  {
    id: "T1",
    feature: "All AI routes",
    dimension: "TONE",
    mode: "static",
    description: "AI system prompts must address a strategy team audience, not marketing copy conventions",
    staticCheck: async () => {
      const routeFiles = [
        "app/api/signal-report/route.ts",
        "app/api/cross-channel-report/route.ts",
        "app/api/behaviour-state/route.ts",
        "app/api/brand-momentum/route.ts",
      ];
      const clientSpeak = ["We're excited", "Great news", "Amazing results", "We are thrilled", "We're pleased to report"];
      const violations: string[] = [];
      for (const f of routeFiles) {
        const content = readComponent(f);
        for (const phrase of clientSpeak) {
          if (content.toLowerCase().includes(phrase.toLowerCase())) {
            violations.push(`${f}: found "${phrase}"`);
          }
        }
      }
      return {
        pass: violations.length === 0,
        detail: violations.length === 0
          ? "No client-speak phrases found in system prompts"
          : `Violations: ${violations.join("; ")}`,
      };
    },
  },

  {
    id: "T2",
    feature: "All AI routes",
    dimension: "TONE",
    mode: "static",
    description: "All AI routes must include 'INTERNAL ONLY' or equivalent audience marker in system prompt",
    staticCheck: async () => {
      const routeFiles = [
        "app/api/signal-report/route.ts",
        "app/api/cross-channel-report/route.ts",
        "app/api/behaviour-state/route.ts",
        "app/api/brand-momentum/route.ts",
      ];
      const missing: string[] = [];
      for (const f of routeFiles) {
        const content = readComponent(f);
        if (!content.includes("INTERNAL") && !content.includes("internal only")) {
          missing.push(f);
        }
      }
      return {
        pass: missing.length === 0,
        detail: missing.length === 0
          ? "All route files have INTERNAL audience marker"
          : `Missing INTERNAL marker: ${missing.join(", ")}`,
      };
    },
  },

  {
    id: "T3",
    feature: "F19 Brand Momentum Score",
    dimension: "TONE",
    mode: "human-review",
    description: "BMS ai_read must be frank and strategic — not brand-polished. Must name a specific risk or opportunity.",
    reviewChecklist: [
      "Compute a BMS period with mixed signals",
      "Read the ai_read field (visible in BrandMomentumSection internal view)",
      "PASS if: it names a specific dimension, uses direct language, identifies a concrete risk or opportunity",
      "FAIL if: vague ('momentum is improving'), brand-speak ('the brand is performing well'), or one-dimensional",
      "Example of good tone: 'SOV is up but competitive context is deteriorating — share gained on voice is not translating to category position'",
      "Example of bad tone: 'The brand is showing positive momentum across key metrics'",
    ],
  },

  {
    id: "T4",
    feature: "F18A Consumer Behaviour State",
    dimension: "TONE",
    mode: "human-review",
    description: "activation_direction must be an actionable strategic directive, not generic advice",
    reviewChecklist: [
      "Run diagnostic on a State 3 (Aware but Unconvinced) week",
      "Read activation_direction field",
      "PASS if: specifies a channel action, content type, or budget lever",
      "FAIL if: generic ('increase engagement', 'improve awareness', 'post more content')",
      "Example of good: 'Shift spend from Demand to Conversion — consideration signals present but save rate stalled; activate Holdout test on Meta'",
      "Example of bad: 'Continue building awareness and consider conversion tactics'",
    ],
  },

  {
    id: "T5",
    feature: "F16C Market Context",
    dimension: "TONE",
    mode: "static",
    description: "Market context form labels use observable, non-jargon language appropriate for strategy lead",
    staticCheck: async () => {
      const content = readComponent("app/campaigns/[id]/_components/MarketContextSection.tsx");
      // Check it uses concrete terms, not abstract jargon
      const goodTerms = [
        "Category search volume",
        "Competitive SOV",
        "Cultural moment",
        "Platform algorithm",
        "Macro",
        "Weather",
      ];
      const missing = goodTerms.filter(t => !content.includes(t));
      return {
        pass: missing.length === 0,
        detail: missing.length === 0
          ? "All 6 observable context labels present"
          : `Missing labels: ${missing.join(", ")}`,
      };
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // SAFETY — IP-protected fields never reach Client Interface
  // ══════════════════════════════════════════════════════════════════

  {
    id: "S1",
    feature: "F18A Consumer Behaviour State",
    dimension: "SAFETY",
    mode: "static",
    description: "ConsumerBehaviourSection must NOT be imported in any /portal/* file",
    staticCheck: async () => {
      const found = anyPortalFileContains("ConsumerBehaviourSection");
      return {
        pass: !found,
        detail: found
          ? "CRITICAL: ConsumerBehaviourSection found in portal file — state diagnosis leaking to client"
          : "ConsumerBehaviourSection not imported in portal routes",
      };
    },
  },

  {
    id: "S2",
    feature: "F19 Brand Momentum Score",
    dimension: "SAFETY",
    mode: "static",
    description: "BrandMomentumSection must NOT be imported in any /portal/* file",
    staticCheck: async () => {
      const found = anyPortalFileContains("BrandMomentumSection");
      return {
        pass: !found,
        detail: found
          ? "CRITICAL: BrandMomentumSection found in portal — ai_read and conflict_flag leaking to client"
          : "BrandMomentumSection not in portal routes",
      };
    },
  },

  {
    id: "S3",
    feature: "F16C Market Context",
    dimension: "SAFETY",
    mode: "static",
    description: "MarketContextSection must NOT be imported in any /portal/* file",
    staticCheck: async () => {
      const found = anyPortalFileContains("MarketContextSection");
      return {
        pass: !found,
        detail: found
          ? "CRITICAL: MarketContextSection in portal — market intelligence leaking to client"
          : "MarketContextSection not in portal routes",
      };
    },
  },

  {
    id: "S4",
    feature: "F14B Attribution",
    dimension: "SAFETY",
    mode: "static",
    description: "AttributionSection must NOT be imported in any /portal/* file",
    staticCheck: async () => {
      const found = anyPortalFileContains("AttributionSection");
      return {
        pass: !found,
        detail: found
          ? "CRITICAL: AttributionSection in portal — spend data and lift% leaking to client"
          : "AttributionSection not in portal routes",
      };
    },
  },

  {
    id: "S5",
    feature: "F12 Signal Intelligence",
    dimension: "SAFETY",
    mode: "static",
    description: "SignalIntelligenceSection must NOT be imported in any /portal/* file",
    staticCheck: async () => {
      const found = anyPortalFileContains("SignalIntelligenceSection");
      return {
        pass: !found,
        detail: found
          ? "CRITICAL: SignalIntelligenceSection in portal — signal thresholds and AI narrative leaking"
          : "SignalIntelligenceSection not in portal routes",
      };
    },
  },

  {
    id: "S6",
    feature: "All AI routes",
    dimension: "SAFETY",
    mode: "static",
    description: "All /api/* routes must use service-role key (createAdminClient OR SUPABASE_SERVICE_ROLE_KEY) — never anon key",
    staticCheck: async () => {
      const routeFiles = [
        "app/api/signal-report/route.ts",
        "app/api/cross-channel-report/route.ts",
        "app/api/behaviour-state/route.ts",
        "app/api/brand-momentum/route.ts",
      ];
      const violations: string[] = [];
      const inconsistent: string[] = [];
      for (const f of routeFiles) {
        const content = readComponent(f);
        const usesAdminWrapper   = content.includes("createAdminClient");
        const usesServiceRoleKey = content.includes("SUPABASE_SERVICE_ROLE_KEY");
        const usesAnonKey        = content.includes("SUPABASE_ANON_KEY") || content.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY");

        if (usesAnonKey) {
          violations.push(`${f}: CRITICAL — uses ANON KEY (RLS applies, internal data accessible to public)`);
        } else if (!usesAdminWrapper && !usesServiceRoleKey) {
          violations.push(`${f}: no service-role key or admin wrapper found`);
        } else if (!usesAdminWrapper && usesServiceRoleKey) {
          // Functionally correct — service role key used directly — but inconsistent pattern
          inconsistent.push(f.split("/").pop()!);
        }
      }
      const pass = violations.length === 0;
      const detail = violations.length > 0
        ? violations.join("; ")
        : inconsistent.length > 0
          ? `PASS (service-role confirmed). RECOMMENDATION: standardise ${inconsistent.join(", ")} to createAdminClient() wrapper for auditability — Sprint 5 cleanup.`
          : "All routes use createAdminClient() — consistent pattern";
      return { pass, detail };
    },
  },

  {
    id: "S7",
    feature: "F18A Consumer Behaviour State",
    dimension: "SAFETY",
    mode: "static",
    description: "behaviour-state route must contain critical comment that state names/numbers are INTERNAL ONLY",
    staticCheck: async () => {
      const content = readComponent("app/api/behaviour-state/route.ts");
      const hasInternalNote = content.includes("INTERNAL") && content.includes("state");
      return {
        pass: hasInternalNote,
        detail: hasInternalNote
          ? "behaviour-state route has INTERNAL annotation for state classification"
          : "Missing INTERNAL annotation — state classification could be mis-treated as client-safe",
      };
    },
  },

  {
    id: "S8",
    feature: "All features",
    dimension: "SAFETY",
    mode: "human-review",
    description: "Portal page HTML (/portal/[campaign_id]) must NOT contain any of the protected field names",
    reviewChecklist: [
      "With app running, open /portal/<real-campaign-id> in browser",
      "Right-click → View Page Source",
      "Search for (should NOT be present): diagnosed_state, state_name, signal_pattern_read",
      "Search for (should NOT be present): ai_read, dimension_conflict_flag, ai_narrative",
      "Search for (should NOT be present): spend_rm, incremental_lift_pct (attribution data)",
      "Search for (should NOT be present): category_search_trend (market context)",
      "Search for (should NOT be present): signal_1_actual, signal_2_actual (raw signal inputs)",
      "FAIL on any match — these are Janine-only proprietary intelligence fields",
    ],
  },

  {
    id: "S9",
    feature: "All features",
    dimension: "SAFETY",
    mode: "static",
    description: "⚿ badge (internal-only marker) present in all internal component section headers",
    staticCheck: async () => {
      const files = [
        { path: "app/campaigns/[id]/_components/ConsumerBehaviourSection.tsx", label: "F18A" },
        { path: "app/campaigns/[id]/_components/MarketContextSection.tsx",     label: "F16C" },
        { path: "app/campaigns/[id]/_components/AttributionSection.tsx",       label: "F14B" },
        { path: "app/campaigns/[id]/_components/SignalIntelligenceSection.tsx",label: "F12"  },
        { path: "app/campaigns/[id]/_components/CrossChannelSection.tsx",      label: "F13"  },
        { path: "app/clients/[id]/_components/BrandMomentumSection.tsx",       label: "F19"  },
      ];
      const missing: string[] = [];
      for (const f of files) {
        const content = readComponent(f.path);
        // Check for ⚿ badge or F## ⚿ pattern in JSX
        if (!content.includes("⚿")) {
          missing.push(`${f.label} (${f.path})`);
        }
      }
      return {
        pass: missing.length === 0,
        detail: missing.length === 0
          ? "All internal sections carry ⚿ internal-only badge"
          : `Missing ⚿ badge: ${missing.join(", ")}`,
      };
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // CITATION — AI assertions trace to named inputs (closed-input system)
  // ══════════════════════════════════════════════════════════════════

  {
    id: "C1",
    feature: "F12 Signal Intelligence",
    dimension: "CITATION",
    mode: "human-review",
    description: "AI signal narrative must reference the specific signal label names set in thresholds",
    citationNote: "Citation here = input grounding. Signal label names are user-defined (e.g. 'Branded Search Lift'). AI must use them, not invent generic terms.",
    reviewChecklist: [
      "Set signal_1_label = 'Branded Search Lift', signal_2_label = 'Content Save Rate'",
      "Run /api/signal-report",
      "Open the generated report — read ai_narrative",
      "PASS: narrative explicitly names 'Branded Search Lift' or 'Content Save Rate' or both",
      "FAIL: narrative uses generic 'Signal 1' or invented labels not set in thresholds",
      "FAIL: narrative makes claims about signals not in the input (hallucination against inputs)",
    ],
  },

  {
    id: "C2",
    feature: "F19 Brand Momentum Score",
    dimension: "CITATION",
    mode: "integration",
    description: "BMS ai_read must reference at least 2 of the 6 dimension labels by name",
    citationNote: "ai_read is the internal synthesis — it must name which dimensions drove the composite.",
    integrationCheck: async () => {
      const FIXTURE_CLIENT_ID    = process.env.TEST_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";
      const FIXTURE_PERIOD_START = process.env.TEST_PERIOD_START ?? "2026-01-01";
      const r = await postRoute("/api/brand-momentum", {
        client_id:    FIXTURE_CLIENT_ID,
        period_start: FIXTURE_PERIOD_START,
      });
      if (!r.ok) return { pass: false, detail: `Route error: ${r.status}` };
      const d = r.data as Record<string, unknown>;
      const aiRead = (d.ai_read as string) ?? "";
      const dimensionTerms = ["SOV", "save rate", "UGC", "CEP", "competitive", "share of voice"];
      const found = dimensionTerms.filter(t => aiRead.toLowerCase().includes(t.toLowerCase()));
      return {
        pass: found.length >= 2,
        detail: `ai_read cites ${found.length} dimension terms: [${found.join(", ")}]. Need ≥ 2.`,
      };
    },
    reviewChecklist: [
      "Compute BMS for any client",
      "Read ai_read from the BrandMomentumSection internal view",
      "Count how many dimension names appear: SOV, save rate, UGC, CEP, competitive context",
      "PASS: ≥ 2 dimension names cited",
      "FAIL: vague composite commentary with no dimension-level grounding",
    ],
  },

  {
    id: "C3",
    feature: "F18A Consumer Behaviour State",
    dimension: "CITATION",
    mode: "human-review",
    description: "signal_pattern_read must reference observable signal readings, not generic state descriptions",
    citationNote: "signal_pattern_read is the internal pattern evidence. It must cite the actual metric values or signal health levels that justified the classification.",
    reviewChecklist: [
      "Run behaviour state diagnostic with S1=35%, S2=12%, S3=180",
      "Read signal_pattern_read from the ConsumerBehaviourSection",
      "PASS: mentions specific signal values (e.g. '35%', 'above threshold') or signal labels",
      "FAIL: generic ('signals are strong', 'brand performing well') with no metric grounding",
      "FAIL: references signal labels not present in the campaign's thresholds",
    ],
  },

  {
    id: "C4",
    feature: "F13 Cross-Channel Hub",
    dimension: "CITATION",
    mode: "human-review",
    description: "Cross-channel AI narrative must reference specific channel names from campaign_channels, not invent channel names",
    citationNote: "Channel names come from campaign_channels → channel_profiles. AI must use the actual names assigned, not generic 'social media' or 'digital channels'.",
    reviewChecklist: [
      "Assign channels to campaign: e.g. 'TikTok TopView', 'Meta Paid Social', 'OOH Klang Valley'",
      "Log weekly metrics for these channels",
      "Run cross-channel report",
      "Read ai_narrative — must reference at least one of the actual assigned channel names",
      "FAIL: uses generic 'social channels', 'paid media', 'digital' without naming specific channels",
      "FAIL: invents a channel not in campaign_channels (hallucination against inputs)",
    ],
  },

  {
    id: "C5",
    feature: "F19 Brand Momentum Score",
    dimension: "CITATION",
    mode: "static",
    description: "CITATION_NA — bms_direction and bms_velocity are composite judgments across 6 dimensions; no single field is the traceable source",
    citationNote: "JUSTIFIED NOT APPLICABLE: bms_direction/velocity are synthesised outputs. Requiring a single citation for a multi-dimensional composite would produce false precision. The ai_read field (which IS citable) captures the internal reasoning — this is the citable artefact for audit purposes.",
    staticCheck: async () => {
      // This test always passes — it documents a justified NA, not a gap
      const bmsRoute = readComponent("app/api/brand-momentum/route.ts");
      const hasAiRead = bmsRoute.includes("ai_read");
      return {
        pass: hasAiRead,
        detail: "CITATION_NA acknowledged. ai_read field present as the internal citable artefact.",
      };
    },
  },

  {
    id: "C6",
    feature: "F16C Market Context",
    dimension: "CITATION",
    mode: "human-review",
    description: "F16C market context is strategy-team input — it IS the citation layer for signal-report AI output",
    citationNote: "F16C context is not itself cited by AI; instead it IS a source the AI uses to ground signal diagnosis. When the AI says 'category search is down' — that claim traces back to what the strategy team entered in category_search_trend. The citation chain is: strategy team observation → F16C input → AI uses it in reasoning. This is the correct model for a closed-input system.",
    staticCheck: async () => {
      const routeContent = readComponent("app/api/signal-report/route.ts");
      const usesMarketContext = routeContent.includes("signal_market_contexts") || routeContent.includes("marketContext");
      return {
        pass: usesMarketContext,
        detail: usesMarketContext
          ? "signal-report route loads and uses F16C market context — citation chain intact"
          : "signal-report route does NOT load F16C market context — market claims would be unsupported",
      };
    },
  },

];

// ─── Runner ───────────────────────────────────────────────────────────────────

type RunMode = "static" | "integration" | "all";

interface Result {
  test: TestCase;
  status: Status;
  detail: string;
}

async function runTests(mode: RunMode): Promise<Result[]> {
  const results: Result[] = [];

  for (const test of TESTS) {
    let status: Status = "SKIP";
    let detail = "";

    const shouldRunStatic      = (mode === "static" || mode === "all") && test.mode === "static";
    const shouldRunIntegration = (mode === "integration" || mode === "all") && test.mode === "integration";
    const isHumanReview        = test.mode === "human-review";

    if (shouldRunStatic && test.staticCheck) {
      try {
        const r = await test.staticCheck();
        status = r.pass ? "PASS" : "FAIL";
        detail = r.detail;
      } catch (err) {
        status = "FAIL";
        detail = `Error: ${String(err)}`;
      }
    } else if (shouldRunIntegration && test.integrationCheck) {
      try {
        const r = await test.integrationCheck();
        status = r.pass ? "PASS" : "FAIL";
        detail = r.detail;
      } catch (err) {
        status = "FAIL";
        detail = `Error: ${String(err)}`;
      }
    } else if (isHumanReview) {
      status = "REVIEW";
      detail = `${test.reviewChecklist?.length ?? 0} checklist items — human review required`;
    } else {
      status = "SKIP";
      detail = `Mode ${test.mode} not active in run mode '${mode}'`;
    }

    results.push({ test, status, detail });
  }

  return results;
}

function printResults(results: Result[]) {
  console.log(`\n${C.bold}ShiftImpact OS — Evaluation Suite${C.reset}`);
  console.log("─".repeat(72));

  const dimGroups: Dimension[] = ["ACCURACY", "TONE", "SAFETY", "CITATION"];
  const counts: Record<Status, number> = { PASS: 0, FAIL: 0, REVIEW: 0, NA: 0, SKIP: 0 };

  for (const dim of dimGroups) {
    const group = results.filter(r => r.test.dimension === dim);
    if (group.length === 0) continue;

    console.log(`\n${C.bold}${dimLabel(dim)}${C.reset}`);

    for (const r of group) {
      counts[r.status]++;
      const modeTag = r.test.mode === "static" ? "[static]" : r.test.mode === "integration" ? "[integ]" : "[human]";
      console.log(`  ${statusLabel(r.status)}  ${C.gray}${r.test.id}${C.reset}  ${modeTag}  ${r.test.description}`);
      if (r.detail) {
        console.log(`         ${C.gray}${r.detail}${C.reset}`);
      }
      if (r.status === "REVIEW" && r.test.reviewChecklist) {
        for (const item of r.test.reviewChecklist) {
          console.log(`         ${C.yellow}→${C.reset} ${item}`);
        }
      }
      if (r.test.citationNote) {
        console.log(`         ${C.cyan}↳ CITATION SCOPE: ${r.test.citationNote}${C.reset}`);
      }
    }
  }

  console.log("\n" + "─".repeat(72));
  console.log(
    `${C.bold}Summary:${C.reset}  ` +
    `${C.green}${counts.PASS} PASS${C.reset}  ` +
    `${C.red}${counts.FAIL} FAIL${C.reset}  ` +
    `${C.yellow}${counts.REVIEW} REVIEW${C.reset}  ` +
    `${C.gray}${counts.SKIP} SKIP${C.reset}`
  );
  console.log("");

  if (counts.FAIL > 0) {
    console.log(`${C.red}${C.bold}⚠ ${counts.FAIL} test(s) FAILED — investigate before shipping.${C.reset}`);
  }
  if (counts.REVIEW > 0) {
    console.log(`${C.yellow}${C.bold}◐ ${counts.REVIEW} test(s) require human review — run the checklist items above.${C.reset}`);
  }
  if (counts.FAIL === 0 && counts.REVIEW === 0) {
    console.log(`${C.green}${C.bold}All automated checks passed.${C.reset}`);
  }
  console.log("");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

(async () => {
  const args  = process.argv.slice(2);
  const mode: RunMode =
    args.includes("--all")         ? "all"
    : args.includes("--integration") ? "integration"
    : "static";

  console.log(`${C.gray}Run mode: ${mode} | Base URL: ${BASE_URL}${C.reset}`);
  if (mode === "integration" || mode === "all") {
    console.log(`${C.yellow}Integration tests require:${C.reset}`);
    console.log(`  1. Dev server running at ${BASE_URL}`);
    console.log(`  2. env vars: TEST_CLIENT_ID, TEST_PERIOD_START, TEST_CLIENT_CONFLICT_ID, TEST_PERIOD_CONFLICT_START`);
  }

  const results = await runTests(mode);
  printResults(results);

  const hasFail = results.some(r => r.status === "FAIL");
  process.exit(hasFail ? 1 : 0);
})();
