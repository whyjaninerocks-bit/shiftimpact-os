// lib/signal-maps.ts
// Outcome-Led Signal Mapping — pure logic, no DB/network calls.
//
// Two responsibilities kept deliberately separate from lib/actions.ts:
//   1. computeConfidenceLabel — deterministic, no AI. Honesty-first: a
//      campaign only gets "Conversion Measured" if the strategist has
//      confirmed actual conversion-tier data is available, not because a
//      signal was merely mentioned somewhere.
//   2. validateSignalKeys — rejects any signal key that isn't a real row in
//      signal_vocabulary, so campaign_signal_maps never silently accepts
//      free text again (that was the original bug this system replaced).
//
// See project memory: Outcome-Led Signal Mapping — APPLIED.

import type { CategoryAttribute, ConfidenceLabel } from "./types";

export type ConfidenceResult = {
  label: ConfidenceLabel;
  reason: string;
  matched: string[];
};

/**
 * Deterministic confidence label for a campaign signal map.
 *
 * Logic (checked in order, first match wins):
 *   1. Any overlap between availableData and the category's
 *      default_conversion_signals → "Conversion Measured"
 *   2. Else, any overlap with default_leading_signals → "Conversion Partially
 *      Supported"
 *   3. Else → "Conversion Likelihood Only"
 *
 * `matched` always lists the availableData keys that triggered the label
 * (empty array for the "Likelihood Only" case, since nothing matched).
 */
export function computeConfidenceLabel(
  availableData: string[],
  category: Pick<CategoryAttribute, "default_conversion_signals" | "default_leading_signals">
): ConfidenceResult {
  const available = new Set(availableData);
  const conversionSignals = category.default_conversion_signals ?? [];
  const leadingSignals = category.default_leading_signals ?? [];

  const matchedConversion = conversionSignals.filter((s) => available.has(s));
  if (matchedConversion.length > 0) {
    return {
      label: "Conversion Measured",
      reason:
        "Available data includes direct conversion-tier signals for this category: " +
        matchedConversion.join(", ") +
        ".",
      matched: matchedConversion,
    };
  }

  const matchedLeading = leadingSignals.filter((s) => available.has(s));
  if (matchedLeading.length > 0) {
    return {
      label: "Conversion Partially Supported",
      reason:
        "Available data includes leading/intent signals but no confirmed conversion-tier data for this category: " +
        matchedLeading.join(", ") +
        ". Treat outcome as directionally supported, not measured.",
      matched: matchedLeading,
    };
  }

  return {
    label: "Conversion Likelihood Only",
    reason:
      "None of the available data matches this category's leading or conversion signals. Any outcome narrative here is a likelihood estimate, not a measured result.",
    matched: [],
  };
}

/**
 * Validates that every key in `keys` exists in the live signal_vocabulary
 * set. Call with a freshly-fetched vocabulary list (not a cached/stale one)
 * immediately before persisting a campaign_signal_maps row.
 *
 * Returns the list of invalid keys (empty = all valid). Throws nothing —
 * callers decide how to surface the error.
 */
export function findInvalidSignalKeys(keys: string[], validKeys: Set<string> | string[]): string[] {
  const valid = validKeys instanceof Set ? validKeys : new Set(validKeys);
  return keys.filter((k) => !valid.has(k));
}

/**
 * Convenience wrapper: validates every signal array on a draft signal map
 * payload at once. Returns a map of field name -> invalid keys, only for
 * fields that actually have invalid keys (empty object = fully valid).
 */
export function validateSignalMapKeys(
  payload: {
    leading_signals: string[];
    conversion_signals: string[];
    lagging_signals: string[];
    available_data: string[];
    missing_data: string[];
  },
  validKeys: Set<string> | string[]
): Record<string, string[]> {
  const valid = validKeys instanceof Set ? validKeys : new Set(validKeys);
  const errors: Record<string, string[]> = {};

  const fields: (keyof typeof payload)[] = [
    "leading_signals",
    "conversion_signals",
    "lagging_signals",
    "available_data",
    "missing_data",
  ];

  for (const field of fields) {
    const invalid = findInvalidSignalKeys(payload[field], valid);
    if (invalid.length > 0) errors[field] = invalid;
  }

  return errors;
}
