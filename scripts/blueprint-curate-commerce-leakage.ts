#!/usr/bin/env npx tsx
// ============================================================================
// Commerce Leakage (Example A) — deterministic curation of the saved production draw.
// ============================================================================
// Two corrections only; no new model draw, no prompt change, strategy untouched:
//   1. Timing is market-neutral: no named marketplace event, no hard-coded duration.
//   2. The matched-comparison stability guardrail was logically wrong: a one-sided "≥ 75" threshold
//      against a baseline of 84, described as a 75–95 band around a baseline of 100 (where the
//      baseline itself, 100, would fall outside the band). It is replaced by a symmetric proposed band
//      around the pre-test baseline, expressed as absolute movement from baseline (index points).
// Raw draws are left untouched; curated copies go to scripts/fixtures/blueprint-curated.
//
//   npx tsx scripts/blueprint-curate-commerce-leakage.ts
import fs from "node:fs";
import { Stage1V, Stage2V, Stage3V } from "../lib/growth-decision/schema";

const IN = "scripts/fixtures/blueprint-prod";
const OUT = "scripts/fixtures/blueprint-curated";
const read = (n: number) => JSON.parse(fs.readFileSync(`${IN}/commerce_leakage.stage${n}.json`, "utf8"));
const replaceIn = (s: string, from: string, to: string, what: string) => {
  if (!s.includes(from)) throw new Error(`curation anchor not found: ${what}`);
  return s.replace(from, to);
};
const mapStrings = (v: unknown, fn: (s: string) => string): unknown => {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]));
  return v;
};

const TIMING_STATEMENT =
  "Test window to be agreed against the actual commercial calendar. Avoid major promotional, platform or seasonal events that would materially confound the read. Duration should be sufficient to produce a readable sample and should not be hard-coded before a real pilot is scoped.";
const CALENDAR_CLAUSE =
  "agreed against the actual commercial calendar, avoiding major promotional, platform or seasonal events that would materially confound the read";
const BAND_SHORT = "the agreed stability band around its pre-test baseline (proposed 95–105 on an index where the baseline = 100)";

// ─── Stage 1 ───
let s1 = read(1);
s1.decision.rationale = replaceIn(
  s1.decision.rationale,
  "The test window must avoid 11.11 and 12.12 marketplace sale events, which would distort conversion comparisons.",
  "The test window must be agreed against the actual commercial calendar, avoiding major promotional, platform or seasonal events that would distort conversion comparisons.",
  "stage1 rationale timing sentence",
);
s1.decision.what_changes = s1.decision.what_changes.map((x: string) =>
  x.startsWith("The test is scheduled outside the 11.11")
    ? `The test window is ${CALENDAR_CLAUSE}.`
    : x,
);

// ─── Stage 2 ───
const s2 = read(2);
s2.execution_owner_asks = s2.execution_owner_asks.map((x: string) =>
  x.startsWith("Confirm with the client commerce team that the test window is scheduled outside")
    ? replaceIn(
        x,
        "that the test window is scheduled outside the 11.11 and 12.12 marketplace sale periods, and that",
        `that the test window is ${CALENDAR_CLAUSE}, and that`,
        "stage2 owner ask timing clause",
      )
    : x,
);

// ─── Stage 3 ───
const s3 = read(3);
s3.test.duration_weeks = null;
// The three marketplace-calendar confounds name specific events and an order of events. Replace them with one
// market-neutral confound; the competitor-pricing confound is unrelated to timing and is kept.
const competitor = s3.test.calendar_confounds.filter((c: { event: string }) => /^Competitor pricing/.test(c.event));
if (competitor.length !== 1) throw new Error("competitor pricing confound not found");
s3.test.calendar_confounds = [
  {
    event: "Commercial, platform and seasonal calendar (not supplied)",
    risk: "A major promotional, platform or seasonal event touching either group could change traffic quality or discount depth independently of the product-page proof architecture and make the comparison unreadable.",
    mitigation: `${TIMING_STATEMENT} Any platform event that cannot be excluded from the window should be logged as a confound, and the result treated as inconclusive for the affected days.`,
  },
  competitor[0],
];

// Stability guardrail: symmetric band around the pre-test baseline, read as absolute movement in index points.
const idx = s3.measures.findIndex((m: { key: string }) => m.key === "untreated_sku_conversion_stability");
if (idx < 0) throw new Error("stability measure not found");
s3.measures[idx] = {
  key: "matched_comparison_conversion_stability",
  role: "guardrail",
  label: "Matched comparison group conversion stability — absolute movement from its pre-test baseline (index points)",
  definition:
    "Matched comparison group conversion must remain within an agreed stability band around its pre-test baseline. The precise band is proposed and must be agreed with the client before launch. For this illustrative demo only, the proposed band is symmetric around the pre-test baseline of 100 (a band of 95–105), read as an absolute movement of no more than 5 index points in either direction. A movement outside the band suggests an external factor (platform event, competitor move, stock issue) has affected the matched comparison group, and the result should be treated as inconclusive.",
  unit: "absolute",
  baseline: null,
  baseline_source: null,
  comparator: "lte",
  threshold: 5,
  threshold_status: "proposed",
  failure_condition:
    "The matched comparison group's conversion moves outside the proposed band (more than 5 index points above or below its pre-test baseline of 100) during the test window, indicating the matched comparison group has been affected by an external variable. The primary measure relative lift cannot be cleanly interpreted and the result is inconclusive.",
};

s3.signals.success = replaceIn(
  s3.signals.success,
  "the untreated group's conversion index has remained between 75 and 95",
  `the matched comparison group's conversion has remained within ${BAND_SHORT}`,
  "signals.success band",
);
s3.signals.inconclusive = replaceIn(
  s3.signals.inconclusive,
  "the comparison group's conversion index moves outside the 75–95 band, indicating an external shock to the untreated group",
  `the matched comparison group's conversion moves outside ${BAND_SHORT}, indicating an external shock to the matched comparison group`,
  "signals.inconclusive band",
);
s3.signals.inconclusive = replaceIn(
  s3.signals.inconclusive,
  "a marketplace sale event (11.11, 12.12 or an unscheduled platform promotion)",
  "a major promotional, platform or seasonal event (scheduled or unscheduled)",
  "signals.inconclusive event",
);
s3.decision_rule.statement = replaceIn(
  s3.decision_rule.statement,
  "(3) the comparison group stability guardrail — untreated SKU conversion index has remained between 75 and 95;",
  `(3) the matched comparison stability guardrail — the matched comparison group's conversion has remained within ${BAND_SHORT};`,
  "decision_rule band",
);

// Fixed-duration wording → neutral. (Weekly cadences such as "monitored weekly" are cadence, not duration, and stay.)
const s3n = mapStrings(s3, (t) =>
  t
    .replace(/the same 4-week test window/g, "the same test window")
    .replace(/throughout the 4-week test window/g, "throughout the test window")
    .replace(/over the 4-week window/g, "over the test window")
    .replace(/at the end of the 4-week test window/g, "at the end of the test window")
    .replace(/at week 1 and week 3 mid-test checkpoints/g, "at mid-test checkpoints")
    .replace(/the checkpoint records from weeks 1 and 3 and the final-week review/g, "the mid-test checkpoint records and the end-of-test review"),
) as typeof s3;

// ─── Guards ───
const BANNED = /11\.11|12\.12|Harbolnas|Ramadan|Lebaran|January|\b(?:four|4|six|6)[- ]weeks?\b|\bweeks? \d|weeks \d+ and \d+|final-week/i;
for (const [n, v] of [[1, s1], [2, s2], [3, s3n]] as const) {
  const hit = JSON.stringify(v).match(BANNED);
  if (hit) throw new Error(`Stage ${n} still contains "${hit[0]}" — timing must stay market-neutral`);
}
const STALE_BAND = /75\s*(?:–|-|and|to)\s*95|between 75|below 75|above 95|untreated_sku_conversion_stability/;
{
  const hit = JSON.stringify(s3n).match(STALE_BAND);
  if (hit) throw new Error(`Stage 3 still contains the old stability band "${hit[0]}"`);
}

// ─── Validate and write ───
const results = [Stage1V.parse(s1), Stage2V.parse(s2), Stage3V.parse(s3n)];
results.forEach((v, i) => {
  if (!v.ok) {
    console.error(`Stage ${i + 1} failed validation:\n` + v.issues.map((x) => ` - ${x.path} ${x.message}`).join("\n"));
    process.exit(1);
  }
});
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/commerce_leakage.stage1.json`, JSON.stringify(s1, null, 2));
// Stage 2 is written in its parsed form (adds the explicit intervention-type defaults: null / []) so the file is exactly what is stored.
const p2 = results[1];
fs.writeFileSync(`${OUT}/commerce_leakage.stage2.json`, JSON.stringify(p2.ok ? p2.value : s2, null, 2));
fs.writeFileSync(`${OUT}/commerce_leakage.stage3.json`, JSON.stringify(s3n, null, 2));
console.log(`curated commerce_leakage stages written to ${OUT}/ (raw draws untouched in ${IN}/)`);
