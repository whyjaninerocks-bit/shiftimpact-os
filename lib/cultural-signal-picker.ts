// lib/cultural-signal-picker.ts
// Campaign-aware OS Cultural Radar signal picker — Stage 4A.2 UX fix.
//
// Replaces the flat, unscoped signal dropdown in StrategicBasisSourcesPanel
// with a grouped, searchable picker. Pure, deterministic logic only — no AI
// auto-ranking, no scoring, no auto-selection. Every signal is still
// browsable; nothing is hidden.
//
// Grouping uses only two real structured fields on cultural_signals:
//   - geographic_scope     (e.g. "MY", "ID")
//   - relevant_industries  (text[], e.g. ["FMCG", "Retail"])
// matched against the campaign's own structured context:
//   - industry_category    (FrameBrief field — same vocabulary as
//                           relevant_industries, e.g. "FMCG", "QSR")
//   - a best-effort campaign market, since neither campaigns, clients, nor
//     frame_briefs currently store a structured market/country field (see
//     inferCampaignMarket below — this is a real product gap, flagged here
//     and in the Stage 4A.2 return report, not silently worked around with
//     AI inference).
//
// cultural_signals.handoff_brief (free TEXT, sometimes containing
// unstructured category/market notes) was inspected but is deliberately NOT
// used for grouping — it isn't reliably structured, and parsing free text
// for classification would violate the "deterministic matching only, no AI
// auto-ranking" instruction. relevant_industries/geographic_scope are the
// real structured fields and are the only inputs used here.

import type { MarketCoverageStatus } from "@/lib/types";

export type SignalGroupKey =
  | "recommended"
  | "same_market_adjacent"
  | "broader_market"
  | "other"
  | "needs_tagging";

// Approved neutral vocabulary only — see StrategicBasisSourcesPanel.tsx
// header. Never "best," "winning," "most powerful," "required," "missing."
export const SIGNAL_GROUP_LABELS: Record<SignalGroupKey, { title: string; helper: string }> = {
  recommended: {
    title: "Recommended for this campaign",
    helper: "Suggested by market/category fit.",
  },
  same_market_adjacent: {
    title: "Same market, adjacent category",
    helper: "Same market, adjacent category.",
  },
  broader_market: {
    title: "Broader market signals",
    helper: "Broader market signal.",
  },
  other: {
    title: "Other available signals",
    helper: "Available, not clearly matched to this campaign.",
  },
  needs_tagging: {
    title: "Needs tagging",
    helper: "Missing enough metadata to classify.",
  },
};

// Ordered for display — recommended first, needs_tagging last, but "other"
// is never hidden per explicit instruction.
export const SIGNAL_GROUP_ORDER: SignalGroupKey[] = [
  "recommended",
  "same_market_adjacent",
  "broader_market",
  "other",
  "needs_tagging",
];

// Minimal shape this module needs — matches CulturalSignalPickerRow from
// lib/data.ts without importing it, to keep this module dependency-free and
// independently unit-testable (see the pure-logic test pattern used by
// lib/strategic-synthesis.ts).
export type SignalPickerInput = {
  id: string;
  signal_name: string;
  signal_type: string | null;
  geographic_scope: string | null;
  relevant_industries: string[] | null;
  brand_fit_status: string | null;
  is_trending: boolean | null;
  // Stage 4B — type-shape only, not used by grouping logic below (grouping
  // still keys off geographic_scope/relevant_industries only, unchanged).
  // Present here so CulturalSignalPickerRow round-trips through
  // groupSignals()/groupSignalForCampaign() without losing the field.
  durability_status: string | null;
  // Cultural Signal Quality Lens — Layer 2 v0.1. Same reasoning as
  // durability_status above: not used by grouping/search, present purely so
  // CulturalSignalPickerRow round-trips through groupSignals() without
  // losing the fields summarizeSignalQuality() needs downstream.
  evidence: string | null;
  why_it_matters: string | null;
};

export type CampaignSignalContext = {
  // Real, reliable — FrameBrief.industry_category, same vocabulary as
  // cultural_signals.relevant_industries (both "FMCG", "QSR", "Retail", …).
  industryCategory: string | null;
  // Best-effort only — see inferCampaignMarket. null means "unknown," and
  // an unknown market never produces a false "same market" match.
  market: string | null;
};

// Fixed, literal keyword → geographic_scope code lookup. Deterministic
// substring matching only — never an LLM call, never fuzzy/semantic
// inference. This exists because no campaign/client/FRAME field currently
// stores a structured market code (flagged as a follow-up recommendation:
// add a real `market` field to campaigns or clients rather than relying on
// this literal keyword scan going forward).
const MARKET_KEYWORDS: { code: string; keywords: string[] }[] = [
  { code: "MY", keywords: ["malaysia", "malaysian", "kuala lumpur", " kl ", "klang valley"] },
  { code: "ID", keywords: ["indonesia", "indonesian", "jakarta"] },
  { code: "SG", keywords: ["singapore", "singaporean"] },
  { code: "TH", keywords: ["thailand", "thai "] },
  { code: "PH", keywords: ["philippines", "filipino", "manila"] },
  { code: "VN", keywords: ["vietnam", "vietnamese", "hanoi", "ho chi minh"] },
];

export function inferCampaignMarket(input: {
  primaryCulturalContext?: string | null;
  clientName?: string | null;
  industryProfile?: string | null;
}): string | null {
  const haystack = ` ${[input.primaryCulturalContext, input.clientName, input.industryProfile]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()} `;
  for (const { code, keywords } of MARKET_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) return code;
  }
  return null;
}

const MARKET_DISPLAY_NAMES: Record<string, string> = {
  MY: "Malaysia",
  ID: "Indonesia",
  SG: "Singapore",
  TH: "Thailand",
  PH: "Philippines",
  VN: "Vietnam",
  SEA: "Southeast Asia",
  GLOBAL: "Global",
  OTHER: "Other",
};

export function displayMarket(code: string | null): string {
  if (!code) return "Market not tagged";
  return MARKET_DISPLAY_NAMES[code] ?? code;
}

// ─── campaigns.primary_market_code — Stage 4A.3 ────────────────────────────
// Canonical option list for the "Primary market" control on the campaign
// page (CampaignInfoSection.tsx) and for server-side validation in
// updateCampaign() (lib/actions.ts). One source of truth so the UI and the
// validation allow-list can never drift apart. No DB CHECK constraint —
// adding a market later is a code change here, not a migration.
export const MARKET_CODE_OPTIONS: { code: string; label: string }[] = [
  { code: "MY", label: "Malaysia (MY)" },
  { code: "ID", label: "Indonesia (ID)" },
  { code: "SG", label: "Singapore (SG)" },
  { code: "PH", label: "Philippines (PH)" },
  { code: "TH", label: "Thailand (TH)" },
  { code: "VN", label: "Vietnam (VN)" },
  { code: "SEA", label: "Southeast Asia (SEA)" },
  { code: "GLOBAL", label: "Global" },
  { code: "OTHER", label: "Other" },
];

export function isValidMarketCode(code: string): boolean {
  return MARKET_CODE_OPTIONS.some((o) => o.code === code);
}

// ─── market_parameters.coverage_status — Market Activation by Radar Layer 1 ──
// Honest, strategist-set label for how much real curated cultural
// intelligence exists for a market — never a claim of full regional
// coverage. Mirrors displayDurabilityStatus below: one canonical options
// list, one validator, one display helper, so the UI and any prompt-chain
// context can never drift apart on wording.
export const MARKET_COVERAGE_STATUS_OPTIONS: { value: MarketCoverageStatus; label: string }[] = [
  { value: "not_tracked", label: "Not actively tracked yet" },
  { value: "experimental", label: "Limited coverage" },
  { value: "active_tracking", label: "Actively tracked" },
  { value: "strategic_coverage", label: "Actively tracked" },
];

export function isValidMarketCoverageStatus(value: string): value is MarketCoverageStatus {
  return MARKET_COVERAGE_STATUS_OPTIONS.some((o) => o.value === value);
}

export function displayMarketCoverageStatus(value: string | null | undefined): string {
  if (!value) return "Not actively tracked yet";
  const match = MARKET_COVERAGE_STATUS_OPTIONS.find((o) => o.value === value);
  return match?.label ?? "Not actively tracked yet";
}

// ─── cultural_signals.durability_status — Stage 4B ─────────────────────────
// Distinguishes durable cultural patterns from trends, emerging signals, and
// signals that simply haven't been assessed yet. Independent of is_trending,
// which stays as a legacy/supporting "movement" flag set at signal creation
// — this field is strategist-set only, never auto-computed, and can be set,
// changed, or cleared at any point in the signal's life (see cultural-radar
// [id] page). NULL means never touched; 'not_assessed' means a strategist
// reviewed the signal and explicitly could not classify it yet — those are
// two different states, which is the actual gap this field closes.
export type DurabilityStatus =
  | "not_assessed"
  | "rooted_cultural_pattern"
  | "emerging_signal"
  | "currently_trending"
  | "needs_validation";

export const DURABILITY_STATUS_OPTIONS: { value: DurabilityStatus; label: string; desc: string }[] = [
  { value: "not_assessed", label: "Not assessed", desc: "Reviewed, but not enough evidence to classify yet." },
  { value: "rooted_cultural_pattern", label: "Rooted cultural pattern", desc: "Long-standing — not tied to a moment." },
  { value: "emerging_signal", label: "Emerging signal", desc: "New — not yet confirmed as durable or fleeting." },
  { value: "currently_trending", label: "Currently trending", desc: "Actively gaining momentum right now." },
  { value: "needs_validation", label: "Needs validation", desc: "Uncertain — needs more evidence before acting on it." },
];

export function isValidDurabilityStatus(value: string): value is DurabilityStatus {
  return DURABILITY_STATUS_OPTIONS.some((o) => o.value === value);
}

// Display helper for read-only surfaces (portal read section, campaign
// picker chips). Deliberately returns null for both NULL and 'not_assessed'
// — an unassessed signal should show nothing, never a label that reads like
// a warning or an error state.
export function displayDurabilityStatus(value: string | null | undefined): string | null {
  if (!value || value === "not_assessed") return null;
  const match = DURABILITY_STATUS_OPTIONS.find((o) => o.value === value);
  return match?.label ?? null;
}

// ─── cultural_signals.durability_reassess_at — Stage 4B follow-up ──────────
// "Durability is a judgment about now — it should get checked again later."
// Default horizon (days) proposed to the strategist per value, never applied
// silently — the strategist can always move the date. Fast-moving
// classifications (trending, needs_validation) get short horizons; rooted
// patterns get a long one, so even those eventually come back for a sanity
// check rather than being classified once and never revisited.
export const DURABILITY_REASSESS_DEFAULT_DAYS: Record<DurabilityStatus, number | null> = {
  not_assessed: null,
  needs_validation: 30,
  currently_trending: 60,
  emerging_signal: 90,
  rooted_cultural_pattern: 365,
};

// Returns a YYYY-MM-DD string (matches <input type="date"> + Postgres date),
// or null when the value has no reassessment horizon (not_assessed, or an
// unrecognized value).
export function suggestReassessDate(status: string | null, from: Date = new Date()): string | null {
  if (!status || !isValidDurabilityStatus(status)) return null;
  const days = DURABILITY_REASSESS_DEFAULT_DAYS[status];
  if (days == null) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// A signal is only ever flagged overdue if it actually carries a
// classification — an unset/'not_assessed' signal has nothing to reassess.
export function isReassessOverdue(
  reassessAt: string | null | undefined,
  durabilityStatus: string | null | undefined,
  today: Date = new Date()
): boolean {
  if (!reassessAt || !durabilityStatus || durabilityStatus === "not_assessed") return false;
  const todayStr = today.toISOString().slice(0, 10);
  return reassessAt < todayStr;
}

// ─── Cultural Signal Quality Lens — Layer 2 v0.1 ───────────────────────────
// Pure, read-only completeness logic. No DB writes, no new fields, nothing
// blocking — this only ever reads a signal's existing columns and reports
// back. Honestly represents what those fields do and do not answer for each
// of the 8 checklist items from the Layer 2 plan; never invents data that
// isn't there.
//
// Two of the eight items — human tension, subculture / psychographic lens —
// have no home anywhere in cultural_signals today and are always reported
// as a flat gap in this pass. Two more — meaning system, confidence limit —
// have a related-but-not-equivalent field (why_it_matters, durability_status
// respectively) and are capped at "needs_judgement," never "captured": a
// filled-in why_it_matters might genuinely name the broader meaning system,
// or it might just be brand-fit commentary — that distinction needs a
// strategist, not a length check. Same logic as durability_status not being
// confidence (see that field's own header comment above): related is not
// equivalent.

export type SignalQualityStatus = "captured" | "needs_judgement" | "gap";

export type SignalQualityChecklistKey =
  | "surface_signal"
  | "human_tension"
  | "market_code"
  | "subculture_lens"
  | "language_rituals_behaviours"
  | "meaning_system"
  | "strategic_implication"
  | "confidence_limit";

export type SignalQualityChecklistItem = {
  key: SignalQualityChecklistKey;
  label: string;
  status: SignalQualityStatus;
  note: string;
};

// The minimal shape this needs — a subset of both CulturalSignalPickerRow
// (picker) and the full cultural_signals row (detail page), so both callers
// can pass their existing data straight through with no extra fetch beyond
// what's added to the picker row below.
export type SignalQualityInput = {
  signal_name: string | null;
  geographic_scope: string | null;
  signal_type: string | null;
  evidence: string | null;
  why_it_matters: string | null;
  durability_status: string | null;
};

const MIN_EVIDENCE_CHARS = 20;

export function computeSignalQualityChecklist(signal: SignalQualityInput): SignalQualityChecklistItem[] {
  const hasSignalName = !!signal.signal_name && signal.signal_name.trim().length > 0;
  const hasMarket = !!signal.geographic_scope;
  const hasSubstantiveEvidence = !!signal.evidence && signal.evidence.trim().length >= MIN_EVIDENCE_CHARS;
  const hasWhyItMatters = !!signal.why_it_matters && signal.why_it_matters.trim().length > 0;
  const hasDurability =
    !!signal.durability_status &&
    isValidDurabilityStatus(signal.durability_status) &&
    signal.durability_status !== "not_assessed";

  return [
    {
      key: "surface_signal",
      label: "Surface signal",
      status: hasSignalName ? "captured" : "gap",
      note: hasSignalName ? "Signal name is set." : "No signal name yet.",
    },
    {
      key: "human_tension",
      label: "Human tension",
      status: "gap",
      note: "Not yet captured — no dedicated field for this yet. Worth naming explicitly in Why it matters.",
    },
    {
      key: "market_code",
      label: "Market code",
      status: hasMarket ? "captured" : "gap",
      note: hasMarket ? `Tagged to ${signal.geographic_scope}.` : "No market tagged yet.",
    },
    {
      key: "subculture_lens",
      label: "Subculture / psychographic lens",
      status: "gap",
      note: "Not yet captured — no dedicated field for this yet.",
    },
    {
      key: "language_rituals_behaviours",
      label: "Language / rituals / behaviours",
      status: signal.signal_type ? (hasSubstantiveEvidence ? "captured" : "needs_judgement") : "gap",
      note: !signal.signal_type
        ? "No signal type set."
        : hasSubstantiveEvidence
        ? "Signal type set and evidence has real detail."
        : "Signal type set, but evidence is thin — add more specific detail.",
    },
    {
      key: "meaning_system",
      label: "Meaning system",
      status: hasWhyItMatters ? "needs_judgement" : "gap",
      note: hasWhyItMatters
        ? "Why it matters has content — confirm it actually names the broader meaning system, not just brand fit."
        : "Not yet captured — Why it matters is empty.",
    },
    {
      key: "strategic_implication",
      label: "Strategic implication",
      status: hasWhyItMatters ? "captured" : "gap",
      note: hasWhyItMatters ? "Why it matters is filled in." : "Why it matters is empty.",
    },
    {
      key: "confidence_limit",
      label: "Confidence limit",
      status: hasDurability ? "needs_judgement" : "gap",
      note: hasDurability
        ? "Durability is classified, but durability is not confidence — confirm separately how much to trust this signal."
        : "Not yet captured — durability isn't classified either.",
    },
  ];
}

// Items that can actually reach "captured" today, given the two structural
// gaps above and the two items permanently capped at needs_judgement.
const CAPTURABLE_KEYS: SignalQualityChecklistKey[] = [
  "surface_signal",
  "market_code",
  "language_rituals_behaviours",
  "strategic_implication",
];

// Lightweight summary for the picker badge — a single small chip, not the
// full 8-item checklist. Tiered off the 4 items that can realistically be
// "captured" today, so the badge never implies a max score that's currently
// unreachable (see file header — 4 of the 8 items cap below "captured").
export function summarizeSignalQuality(signal: SignalQualityInput): {
  capturedCount: number;
  capturableTotal: number;
  tier: "strong" | "partial" | "thin";
  label: string;
} {
  const checklist = computeSignalQualityChecklist(signal);
  const capturable = checklist.filter((c) => CAPTURABLE_KEYS.includes(c.key));
  const capturedCount = capturable.filter((c) => c.status === "captured").length;
  const capturableTotal = capturable.length;
  const tier: "strong" | "partial" | "thin" =
    capturedCount >= capturableTotal ? "strong" : capturedCount >= capturableTotal / 2 ? "partial" : "thin";
  const label = tier === "strong" ? "Strong context" : tier === "partial" ? "Partial context" : "Thin context";
  return { capturedCount, capturableTotal, tier, label };
}

function hasIndustryOverlap(signalIndustries: string[] | null, campaignCategory: string | null): boolean {
  if (!campaignCategory || !signalIndustries || signalIndustries.length === 0) return false;
  const target = campaignCategory.trim().toLowerCase();
  return signalIndustries.some((ind) => ind.trim().toLowerCase() === target);
}

function hasMarketMatch(signalScope: string | null, campaignMarket: string | null): boolean {
  if (!campaignMarket || !signalScope) return false;
  return signalScope.trim().toUpperCase() === campaignMarket.trim().toUpperCase();
}

// Deterministic, non-overlapping bucket assignment. Priority order:
//   1. needs_tagging   — signal has neither geographic_scope nor
//                        relevant_industries to classify against anything.
//   2. recommended     — market matches (known) AND category matches.
//   3. same_market_adjacent — market matches (known), category does not.
//   4. broader_market  — category matches, market doesn't match / unknown.
//   5. other           — some metadata exists, but neither market nor
//                        category can be confirmed to match this campaign.
// An unknown campaign market (context.market === null) never produces a
// "recommended" or "same market" result — those two require a confirmed
// match, never an assumed one.
export function groupSignalForCampaign(signal: SignalPickerInput, context: CampaignSignalContext): SignalGroupKey {
  const hasScope = !!signal.geographic_scope && signal.geographic_scope.trim().length > 0;
  const hasIndustries = !!signal.relevant_industries && signal.relevant_industries.length > 0;
  if (!hasScope && !hasIndustries) return "needs_tagging";

  const marketMatch = hasMarketMatch(signal.geographic_scope, context.market);
  const categoryMatch = hasIndustryOverlap(signal.relevant_industries, context.industryCategory);

  if (marketMatch && categoryMatch) return "recommended";
  if (marketMatch && !categoryMatch) return "same_market_adjacent";
  if (!marketMatch && categoryMatch) return "broader_market";
  return "other";
}

export function groupSignals(
  signals: SignalPickerInput[],
  context: CampaignSignalContext
): Record<SignalGroupKey, SignalPickerInput[]> {
  const grouped: Record<SignalGroupKey, SignalPickerInput[]> = {
    recommended: [],
    same_market_adjacent: [],
    broader_market: [],
    other: [],
    needs_tagging: [],
  };
  for (const signal of signals) {
    grouped[groupSignalForCampaign(signal, context)].push(signal);
  }
  return grouped;
}

// Search across title / category / market / signal type — case-insensitive
// substring match, no ranking.
export function signalMatchesSearch(signal: SignalPickerInput, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    signal.signal_name,
    signal.signal_type,
    signal.geographic_scope,
    displayMarket(signal.geographic_scope),
    ...(signal.relevant_industries ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
