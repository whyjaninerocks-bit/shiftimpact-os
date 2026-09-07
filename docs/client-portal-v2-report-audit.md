# Client Portal v2 — Weekly Report Element Audit & Privacy Spec

**Status:** Audit only. No portal code has been changed. This is the "what should go in the real weekly report, and what must stay internal" study requested before rebuilding `/portal/[id]`. Grounded in the live database schema, real row counts, and the access-control comments already written into ~20 API route files — not assumptions.

---

## 1. The headline finding

ShiftImpact OS already has a strong, consistent privacy convention — it's just never been applied to the portal page itself, and the newest capability (cross-category signal mapping) was built without one at all.

Nearly every intelligence-generating route in the codebase (`brand-momentum`, `social-currency`, `review-platform`, `dsem`, `dba-correlation`, `intelligence-query`, `ai-brand-visibility`, and more) carries an explicit `ACCESS RULES` comment block splitting its output into two tiers:

- **Client-shareable:** the composite score, the trend direction, and a plain-language narrative.
- **Internal only:** the raw dimension breakdown, the methodology, the AI's internal reasoning (`ai_read`), conflict flags, multipliers, and any competitor data.

Example, verbatim from `brand-momentum/route.ts`: *"Client sees: bms_direction + bms_velocity + bms_confidence only (headline composite)... ai_read + conflict_flag: NEVER."* The same split appears independently in at least six other routes. This is a real, repeated design decision — not a one-off.

The actual portal page (`portal/[id]/page.tsx`) ignores almost all of this. Today it reads exactly one table (`signal_weekly_reports`) and shows three fields: `demand_health`, `nurture_health`, `conversion_health`, plus a `gate_status` badge. Everything else below — including data that already has a client-safe version defined — never reaches the client.

## 2. What actually exists, real vs. wired vs. populated

Checked directly against the database (row counts as of this audit) and the codebase.

| Element | Source | Real & working? | Rows in prod | Wired to portal today? | Access rule already defined? |
|---|---|---|---|---|---|
| Demand / Nurture / Conversion health + gate status | `signal_weekly_reports` | Yes | 2 | **Yes** (only thing shown) | Partial — no per-field rule written down |
| Cross-category signal map (leading/conversion/lagging signals, business outcome label, confidence, missing-data disclosure) | `campaign_signal_maps` | Yes — real, tested against Golden Test Client | 3 | **No** | **No — never defined. This is the actual gap.** |
| Brand Momentum Score | `brand_momentum_scores` + `/api/brand-momentum` | Yes | 2 | No | Yes — direction/velocity/confidence client-safe, ai_read/conflict internal |
| Social Currency Index | `/api/social-currency` (no dedicated table found — computed on demand) | Yes | — | No | Yes — sci_score/trend/narrative client-safe, dimensions/build_action internal |
| Review Platform Health | `/api/review-platform` | Yes | — | No | Yes — same split pattern |
| Media ROI / cross-channel performance | `cross_channel_reports` | Yes | 1 | No | Not yet defined |
| Kill switches (guardrail triggers) | `kill_switches` | Yes | 6 | No | Not yet defined |
| Prediction Accuracy Log | `prediction_accuracy_log` | Table exists, logic exists (`/api/prediction-reconcile`, `/api/prediction-snapshot`) | **0** | No | Not yet defined |
| Report delivery / read-receipt log | `client_report_recipients` | Table + UI built (Sprint work, Task #5) | **0** | No | N/A — operational, not intelligence |
| AI Brand Visibility / Eligibility Score | `/api/ai-brand-visibility` (F23) | Yes, but it's a **proxy score** derived from existing signal health + manual inputs — not real ChatGPT/Perplexity monitoring | — | No | Yes, and it's the strictest one in the codebase: *"never expose eligibility_score, trust gap matrix, or competitor data to any client-facing route"* |
| IQ Evaluate / ICS creative score | IQ Evaluate tables | Yes | — | No | Established separately (calibration baseline doc): client sees score band + one-line read, not the 8-dimension breakdown |

**Read this table plainly:** almost everything needed for a genuinely robust weekly report already exists and already has real logic behind it. The portal just was never connected to most of it. The one truly aspirational thing in the current sales demo is the Prediction Accuracy Record showing "5/5, 100%" — that table is real but currently empty in production, so that section can't honestly be shown yet for a real client until predictions actually get logged and reconciled a few times.

## 3. The specific gap Janine flagged — cross-category signal maps have no privacy rule yet

`campaign_signal_maps` is the table behind the new "connect behaviour signals across categories" work. Its columns, and the recommended split, applying the same convention used everywhere else in the codebase:

**Show to client:**
- `business_outcome_label` — plain-language statement of what this campaign is actually trying to move (already category-specific, e.g. not forced into "save rate" language for a non-FMCG client)
- `leading_signals`, `conversion_signals`, `lagging_signals` — the signal *labels*, not the internal weighting logic behind them
- `confidence_label` (High/Medium/Low, or whatever band is used) — the headline confidence, matching how every other module in the OS discloses confidence
- `missing_data` — this one is important to keep visible, not hide: telling a client honestly "we don't have X yet, here's what that means for confidence" is consistent with the prediction-accuracy/variance-analysis honesty already built elsewhere in the OS, and it's a trust-building disclosure, not a weakness to hide

**Keep internal only:**
- `signal_weights` (the jsonb weighting logic) — methodology, not client's business
- `confidence_reason`, `confidence_matched_data` — this is the internal reasoning trail for *why* the confidence label was set; useful for the strategist, not the client
- `post_hoc_predictive_signal`, `post_hoc_outcome_notes` — retrospective model-tuning notes, internal by nature
- `map_status` — internal workflow state (draft/active/superseded), not client-relevant

This mirrors exactly how `brand_momentum_scores` and the social/review platform scores already split composite-and-narrative (client) from dimension-and-methodology (internal) — so adopting it here isn't a new policy, it's applying the existing one to the one system that was built after the pattern was established but never got tagged with it.

## 4. Recommended v2 portal structure

In priority order — each section only appears if the client's campaign actually has data for it (no showing empty/fictional sections, unlike the current demo):

1. **Campaign health, framed by the client's own category** — replace the fixed Demand/Nurture/Conversion badges with whatever `campaign_signal_maps` says actually matters for this business (a B2B client sees pipeline-stage language; an FMCG client sees the current save-rate-style language) — this is the core fix Janine asked for.
2. **Gate status** — kept as-is, it's category-agnostic (a threshold either fired or didn't) and already works.
3. **Brand Momentum** — direction, velocity, confidence, one-line narrative. Not currently shown; ready to wire in.
4. **Media / channel performance** — from `cross_channel_reports`, once more than 1 row of real data exists per client.
5. **Creative / idea quality** — score band + one-line read (IQ Evaluate precedent), not the 8-dimension breakdown.
6. **Guardrails reviewed this week** — a plain-language line when a kill switch was evaluated, not the raw threshold math.
7. **Prediction track record** — only once `prediction_accuracy_log` actually has verified rows for that campaign. Don't show this section at all until it's real, for any client — showing a fabricated "100% accuracy" the way the demo does is a genuine risk if a real client ever compares notes with the demo.
8. **Compliance / delivery record** — once `client_report_recipients` actually gets populated per send.

AI Brand Visibility and the full "Social Currency Index number" stay internal-only per their own explicit rule — client sees only the narrative trend line the OS already permits, nothing else.

## 5. What this means, practically

The rebuild isn't "invent a robust report" — it's "stop showing three fields from one table, and start showing the client-safe half of the six-plus modules that already compute real intelligence and already know what's safe to disclose." The main net-new work is: (a) wire the portal to `campaign_signal_maps` so the report is category-aware instead of fixed, and (b) write and apply the same client-safe/internal split to that table, since it's the one place in the OS that capability was never defined.

Nothing here has been built. This is the spec to review before that work starts.
