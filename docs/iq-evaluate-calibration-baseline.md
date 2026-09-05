# IQ Evaluate — Calibration Baseline

**Status:** Locked baseline, 5 September 2026
**Source:** Three sequential internal-only test runs against the seeded "Internal Test — ZestBowl Lunch Sales Push" campaign (`campaign_id: 0041dacc-9527-408b-82d4-c72be3c4525c`). FRAME context held stable across tests; only the Big Idea Platform (BIP) content was varied, isolating idea architecture as the variable under test.
**Purpose:** Establish what different IQ Evaluate score bands mean in practice, before any prompt tuning, KB grounding, or scoring-model changes are made. This is a reference point to calibrate future changes against — not a claim that these bands are permanent or final.

## Test log

| Test | BIP idea | Score | kb_grounded | Result / Causal / Transferability | One-line verdict |
|---|---|---|---|---|---|
| 1 | Generic voucher/promo push (no distinct mechanic) | 33 | false | Not Stated / Not Claimable / Not Tested | Tactical promo — foundational-heavy across dimensions |
| 2 | "The Lunchtime Autopilot Breaker" (5-Day Autopilot Break, same-week 2nd-order mechanic) | 58 | false | Not Stated / Not Claimable / Not Tested | Developing architecture — genuine mechanic, not yet ownable |
| 3 | "The 12PM Default Reset" (same mechanic, sharper behavioural + proof framing) | 63 | false | Not Stated / Not Claimable / Not Tested | Same category as Test 2, incrementally sharper — still a well-engineered conversion play, not yet a platform |

## What a 30s score means

Dimensions are mostly **Foundational (1/3)**. The idea functions as a discount or voucher mechanic dressed in campaign language — no structural device distinguishes it from any competitor running the same promo. There is no real "enemy," no mechanic that proves behaviour change versus one-time redemption, and no proof logic beyond redemption counts. Treat a 30s score as: **not yet a Big Idea Platform, closer to a media plan with a tagline.**

## What a 50s score means

Dimensions are mostly **Developing (2/3)**. The idea has a genuine, testable mechanic — something designed to distinguish habit change from one-off trial (in this series: a same-week second-order trigger). Cultural Permission and Human Truth are recognisable and correctly diagnosed but not yet owned territory. Brand Role has "substitution risk" — a competitor with similar product economics could copy the mechanic. Business Ambition still caps at a channel KPI ("more orders") rather than a market-structure claim. Treat a 50s score as: **a well-engineered conversion play — real architecture, not yet ownable.**

## What a 60s score means (so far — n=1)

Same category of critique as the 50s band, with incremental gains in behavioural specificity and proof logic (tighter definition of the target behaviour, a clearer counterfactual/measurement plan). The gap to World-Class did not close by sharpening wording — new, categorically different gaps surfaced instead: propagation still depends on paid media/CRM rather than the idea self-replicating, and Surprise & Structural Tension can *drop* to Foundational if the creative expression leans on category-familiar imagery ("sad desk lunch," "tired scroll") even when the underlying mechanic is sound. Treat a 60s score as: **diminishing returns from refining an existing mechanic — the next real jump requires owned cultural territory, a market-structure ambition statement, and self-replicating propagation, not better copy on the same structure.**

Note the score movement itself was informative: Test 1→2 gained 25 points (adding a real mechanic where none existed). Test 2→3 gained only 5 points (refining an already-real mechanic). That drop-off in marginal score per unit of effort is expected and, if it recurs in future calibration rounds, should be read as a signal that the *architecture* needs to change, not the wording.

## Confidence model is a separate axis from creative quality

The 8 creative dimensions (Cultural Permission, Human Truth, Brand Role, Idea Architecture, Business Ambition, Earned Attention Potential, Surprise & Structural Tension, Dual Audience Architecture) score **idea quality only** — is this a good, ownable, culturally sharp Big Idea Platform.

The `confidence_model` object scores **how much real-world proof exists** — a completely different question:
- `evidence_confidence` / `market_confidence` — reflect internal reasoning quality (how well-formed the logic is). These are the only two fields allowed to move on creative strength alone, and did move (Medium in Tests 2 and 3, versus the lower Test 1 baseline).
- `result_confidence`, `causal_confidence`, `transferability_score` — reflect actual business-impact proof. These stayed at **Not Stated / Not Claimable / Not Tested across all three tests**, regardless of the creative score moving from 33 to 58 to 63.

This is correct, designed behaviour, not a gap in the system: a World-Class idea can — and, before real campaign data exists, *should* — still carry zero business-impact claim. The system prompt explicitly instructs the model not to let a strong creative read on the 8 dimensions inflate the confidence model. This calibration series confirms that instruction is holding under real variation in idea quality, not just in theory.

## kb_grounded stays false until a real corpus is connected

`kb_grounded` is a hardcoded `false` in `/api/iq-evaluate/route.ts` (not AI-generated — the model cannot set this field). Migration 0078 laid the KB schema foundation, but no case/award corpus has been ingested. `kb_grounded` must remain `false` for every evaluation until that corpus exists and is deliberately wired into the route — this is a guardrail against the model implying Cannes/APPIES/Effie-grounded authority it doesn't have, not a placeholder waiting to be flipped as a side effect of an unrelated change. Confirmed across all three tests: no award-corpus language appeared anywhere in the output text, consistent with `kb_grounded: false`.

## Non-goals of this document

This baseline does not recommend prompt changes, scoring-model changes, or KB ingestion — none were made to produce it. It exists so that if/when those changes are made later, there is a "before" reference to calibrate against.
