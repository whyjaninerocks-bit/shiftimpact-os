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
