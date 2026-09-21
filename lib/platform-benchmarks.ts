// lib/platform-benchmarks.ts
// Platform Benchmark Reference Library v0.1 — option lists, validation, and
// small display helpers for platform_benchmarks (migration 0099).
//
// This module is deliberately NOT an AI-diagnosis module — there is no model
// call, no prompt, no scoring here. It only defines the fixed vocabularies
// the CRUD UI and server actions use, and a couple of pure display helpers.
// Mirrors the existing MARKET_COVERAGE_STATUS_OPTIONS pattern in
// lib/cultural-signal-picker.ts: options live in TS as the single source of
// truth, not as a DB CHECK, wherever the list is a UI/app-layer vocabulary
// rather than a hard invariant.
//
// See lib/types.ts for the PlatformBenchmark* type definitions this module
// validates against.

import type {
  PlatformBenchmarkMarketApplicability,
  PlatformBenchmarkSourceType,
  PlatformBenchmarkConfidenceLevel,
  PlatformBenchmarkRiskTag,
} from "./types";

// ─── Market applicability ───────────────────────────────────────────────────
// How locally-grounded a given source is. Every entry carries exactly one of
// these — never inferred, always the value the strategist chose when logging
// the source. Proxy/global entries must stay visibly labeled wherever they're
// shown; see PlatformBenchmarksClient.tsx.

export const MARKET_APPLICABILITY_OPTIONS: {
  value: PlatformBenchmarkMarketApplicability;
  label: string;
  description: string;
}[] = [
  { value: "country_specific", label: "Country specific", description: "Published for, or validated in, this exact market." },
  { value: "sea_regional", label: "SEA regional", description: "Covers the broader Southeast Asia region, not this country specifically." },
  { value: "global", label: "Global", description: "Platform-wide guidance with no regional specificity." },
  { value: "proxy_needs_validation", label: "Proxy — needs validation", description: "Borrowed from an adjacent market or vertical because nothing closer exists. Never treat as local evidence." },
];

export function isValidMarketApplicability(value: string): value is PlatformBenchmarkMarketApplicability {
  return MARKET_APPLICABILITY_OPTIONS.some((o) => o.value === value);
}

export function displayMarketApplicability(value: string | null | undefined): string {
  return MARKET_APPLICABILITY_OPTIONS.find((o) => o.value === value)?.label ?? (value || "—");
}

// ─── Source type ─────────────────────────────────────────────────────────────
// Six types, kept separate end to end — never blended into one confidence
// number. Ordered roughly strongest → weakest evidence tier for display
// purposes only; the app never auto-ranks entries by this order.

export const SOURCE_TYPE_OPTIONS: {
  value: PlatformBenchmarkSourceType;
  label: string;
  description: string;
}[] = [
  { value: "campaign_actual", label: "Campaign actual", description: "Real, observed performance from a McCann/ShiftImpact campaign. Strongest, most local evidence." },
  { value: "mccann_client_benchmark", label: "McCann / client benchmark", description: "McCann or client-side benchmark data. Kept distinct from public sources — different provenance." },
  { value: "platform_published_metric", label: "Platform published metric", description: "A number the platform itself has published (e.g. stated average completion rate)." },
  { value: "platform_creative_guidance", label: "Platform creative guidance", description: "The platform's own stated best practices (hook length, safe zones, caption use)." },
  { value: "industry_benchmark", label: "Industry benchmark", description: "Third-party research or industry reports, not platform-authored." },
  { value: "strategist_observation", label: "Strategist observation", description: "A strategist's own noted pattern. Weakest evidence tier — always labeled as such." },
];

export function isValidSourceType(value: string): value is PlatformBenchmarkSourceType {
  return SOURCE_TYPE_OPTIONS.some((o) => o.value === value);
}

export function displaySourceType(value: string | null | undefined): string {
  return SOURCE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? (value || "—");
}

// ─── Confidence level ────────────────────────────────────────────────────────
// Strategist-set, never auto-computed from source_type or anything else —
// same discipline as every other strategist-set classification in this OS.

export const CONFIDENCE_LEVEL_OPTIONS: { value: PlatformBenchmarkConfidenceLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function isValidConfidenceLevel(value: string): value is PlatformBenchmarkConfidenceLevel {
  return CONFIDENCE_LEVEL_OPTIONS.some((o) => o.value === value);
}

// ─── Risk tags ────────────────────────────────────────────────────────────────
// Fixed 10-tag vocabulary, deliberately mirroring Creative Format Read's own
// dimension language (attention/opening-frame/proof-timing/brand-transfer/
// creator-role/CTA/commerce-pressure) so a strategist reading both systems
// recognizes the same risk concepts, without this table importing anything
// from lib/creative-format-read.ts (kept fully decoupled per build scope).

export const RISK_TAG_OPTIONS: { value: PlatformBenchmarkRiskTag; label: string }[] = [
  { value: "attention_risk", label: "Attention risk" },
  { value: "opening_frame_risk", label: "Opening-frame risk" },
  { value: "proof_timing_risk", label: "Proof timing risk" },
  { value: "brand_transfer_risk", label: "Brand transfer risk" },
  { value: "creator_host_role_risk", label: "Creator / host role risk" },
  { value: "cta_action_path_risk", label: "CTA / action path risk" },
  { value: "commerce_pressure_risk", label: "Commerce pressure risk" },
  { value: "format_mismatch_risk", label: "Format mismatch risk" },
  { value: "unsupported_claim_risk", label: "Unsupported claim risk" },
  { value: "market_proxy_risk", label: "Market proxy risk" },
];

export function isValidRiskTag(value: string): value is PlatformBenchmarkRiskTag {
  return RISK_TAG_OPTIONS.some((o) => o.value === value);
}

export function displayRiskTag(value: string): string {
  return RISK_TAG_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Filters a raw string list down to only the valid, known risk tag values. */
export function sanitizeRiskTags(values: string[]): PlatformBenchmarkRiskTag[] {
  return values.filter(isValidRiskTag);
}

// ─── Staleness ────────────────────────────────────────────────────────────────
// Pure date math only — no model, no live platform check. An entry with no
// staleness_window_days never goes stale automatically (some sources, e.g. a
// campaign_actual, don't age the way platform guidance does); the strategist
// decides whether to set a window at all.

export function isBenchmarkStale(capturedOn: string, stalenessWindowDays: number | null): boolean {
  if (stalenessWindowDays === null || stalenessWindowDays === undefined) return false;
  const captured = new Date(capturedOn);
  if (Number.isNaN(captured.getTime())) return false;
  const dueDate = new Date(captured.getTime() + stalenessWindowDays * 24 * 60 * 60 * 1000);
  return Date.now() > dueDate.getTime();
}

/** Days overdue past the staleness window, or null if not stale / no window set. */
export function daysOverdue(capturedOn: string, stalenessWindowDays: number | null): number | null {
  if (!isBenchmarkStale(capturedOn, stalenessWindowDays) || stalenessWindowDays === null) return null;
  const captured = new Date(capturedOn);
  const dueDate = new Date(captured.getTime() + stalenessWindowDays * 24 * 60 * 60 * 1000);
  return Math.floor((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
}
