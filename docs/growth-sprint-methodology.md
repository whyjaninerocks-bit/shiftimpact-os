# Growth Sprint Experience v1 — Methodology (Frozen for Pilot)

**Status:** Frozen. This document describes the exact methodology validated across three golden-case business scenarios and locked for the 3–5 real business pilot. Do not change the diagnosis/recommendation prompts, the decision vocabulary, or the schema without re-running validation — see "Change control" at the bottom.

## What Growth Sprint is — and isn't

Growth Sprint is a **paid, operator-facilitated growth decision experience**. A ShiftImpact operator runs a live, ~10–15 minute session with a business owner to identify the one growth opportunity worth prioritising next, and leaves with a specific, executable 30-day test.

It is explicitly **not**:
- An AI report generator (the operator drives the session; the AI supports two specific decisions)
- An industry template engine (see "Business Context," below — it never forces a category)
- A general intelligence platform (it has one job: turn a fuzzy growth question into one testable hypothesis)

## The core object: Growth Moment

A Growth Moment is a recognisable customer situation where a need becomes active and creates a commercial opportunity. It has six required fields:

| Field | Question it answers |
|---|---|
| Customer | Who experiences this moment? |
| Situation | What is the everyday context? |
| Trigger | What specifically makes the need active right now? |
| Need | What problem or aspiration does the trigger surface? |
| Behaviour | What does the customer actually do (or fail to do) today? |
| Commercial response | What can the business credibly offer in that moment? |

All six fields carry equal weight. A moment missing any field is materially harder for the AI to reason about — the operator UI now shows a live completeness score (X/6) and warns before running diagnosis on an incomplete moment, but does not hard-block adding one (an operator mid-conversation may need to capture a partial thought and complete it later).

**A Growth Moment is not an audience segment.** "Millennials who care about sustainability" is not a Growth Moment. "A regular customer who asks a health question at checkout and leaves without booking the service that would answer it" is.

## Business Context — illustrative only, never forcing

Operators may optionally tag a sprint as Commerce, Experience, Service, or Custom. This tag is used only as illustrative framing in the AI prompt ("typical focus: revenue per customer, repeat purchase...") — it never determines the diagnosis, and the prompt explicitly instructs the model not to force the business into the template.

When no context is set (or "Custom" is chosen), the prompt renders "Not specified — diagnose from the inputs below only," and the model reasons entirely from the Growth Moment and evidence given. This was the single most important thing validated in the three golden cases — see "Validation record" below.

## Evidence Confidence

Every Growth Moment carries a qualitative confidence tag, no numeric scoring:

- **Confirmed** — verified through logged data or direct tracking
- **Observed** — staff have seen this happen, not formally tracked
- **Directional** — an impression from casual conversation
- **Inferred** — reasoned from other evidence, not directly observed
- **Missing** — not known yet

The diagnosis prompt is instructed to preserve this confidence level, not upgrade it. If evidence is Missing or Inferred, the diagnosis says so plainly rather than treating it as settled fact.

## The two AI calls

Growth Sprint uses exactly two AI calls — no per-dimension agents, no third call.

**Call 1 — Diagnosis** (`lib/growth-sprint/diagnose.ts`): takes the full intake (business snapshot, growth question, constraints, revenue pillars, Growth Moments with evidence) and produces a business situation summary, named growth constraints, and a ranked list of opportunities — each one traceable to a specific Growth Moment, with explicit supporting and missing evidence.

**Human review checkpoint**: the operator reviews the ranked opportunities and either confirms the model's top pick or overrides it with a stated reason. This choice is never re-decided by the AI.

**Call 2 — Recommendation** (`lib/growth-sprint/recommend.ts`): takes the confirmed opportunity and produces three explicitly separated parts:

1. **Growth Hypothesis** — the specific, unproven bet the test is designed to check, stated as a hypothesis ("we believe that..."), not a conclusion.
2. **30-Day Test** — one specific, executable action: the test itself, target audience, offer/intervention, conversion path, and evidence signals to watch.
3. **Decision Rule** — the rule for interpreting results *once the test has actually run* (named thresholds, not a forecast).

## Decision vocabulary — corrected logic (locked)

`decision_outcome` is one of exactly five values: **Scale, Shift, Hold, Retest, Stop**. No sixth state, no internal mapping layer.

The critical rule, added after golden-case validation surfaced a real defect (see below): **`decision_outcome` describes the state *before* the test has run — it is not a forecast and not a statement of confidence in the hypothesis.**

- **Hold** is the honest default for any untested hypothesis. Defining a 30-day test because the answer isn't known yet *means* the outcome is Hold. This is not a hedge — it's the correct answer.
- **Scale** requires that this *exact* intervention has already been validated by real prior evidence — not that the underlying problem is confirmed, that the fix itself has been tried and worked. A well-reasoned hypothesis is not evidence.
- **Shift** requires that a different intervention on the same moment is already better supported than the one being proposed.
- **Retest** / **Stop** apply only when a prior test of this exact intervention already ran.

In practice, nearly every first-time Growth Sprint will output Hold — that is expected and correct, not a weak result.

## Raw / reviewed separation

Every AI output is written twice: `diagnosis_raw`/`diagnosis_reviewed` and `recommendation_raw`/`recommendation_reviewed`. The `_raw` copy is the AI's original, unedited output and is **never exposed publicly** — not in the API, not in the public share page's query. The `_reviewed` copy is what the operator can edit before publishing, and it's what the client sees.

## Public sharing

Published sprints get a high-entropy random token (32 bytes, base64url). Only the SHA-256 hash is stored — the plaintext token is shown to the operator exactly once, at publish time, and never again. The public share page (`/growth-sprint/share/[token]`) selects only `business_name`, `business_context`, `diagnosis_reviewed`, `recommendation_reviewed`, `decision_outcome`, and `status` — raw output, override reasons, and validation feedback are structurally excluded from that query, not just hidden in the UI. Revoking a share sets `revoked_at`, which the token validator checks on every access.

## Access model

Every `/api/growth-sprints/*` route requires an authenticated session (same cookie-based Supabase auth used elsewhere in the app), checked before any database access. The public share route is the one deliberate exception, gated by token instead of login. No per-owner row scoping — matches the rest of the OS's `allow_all` internal / `deny_public` external convention.

## Validation record (three golden cases)

Validated live against the real Anthropic API (not simulated) across three deliberately different business types:

- **Commerce** (PawStop, pet retailer) — specific opportunity traced to a checkout moment, not generic marketing advice. Decision outcome: Hold, with named thresholds for escalation.
- **Service** (Recover Physio, physiotherapy clinic) — correctly respected a hard no-discounting constraint instead of reaching for a discount lever. Decision outcome: Hold (this case initially output a premature "Scale" before the fix below).
- **Custom/unknown** (Claymind Studio, blended pottery workshop + retail) — no `business_context` supplied. The model never forced a Commerce/Experience/Service label, reasoning entirely from the given Growth Moment. This is the structural proof that the no-forced-classification design actually holds under real model output, not just prompt inspection.

**Defect found and fixed:** the physiotherapy case initially output `decision_outcome: "Scale"` before any test had run — the model's own rationale hedged ("the most likely outcome is Scale or Shift") but committed to Scale anyway. The `recommend.ts` prompt was rewritten to explicitly separate the pre-test state (`decision_outcome`/`decision_rationale`) from the post-test interpretation rule (`decision_rule`), and to define Hold as the correct default. Re-validated live: the same case now correctly outputs Hold, with the other two cases unchanged.

## Known, accepted limitation (not fixed — logged for post-pilot review)

The Growth Moment intake form only strictly requires Customer and Situation to add a moment; the other four fields can be added incomplete. The UI now surfaces a live completeness score and gates the diagnosis step behind an explicit operator override if any moment is incomplete — but it does not hard-block partial entry, by design, since an operator mid-conversation may need to capture a partial thought and complete it later.

## Change control

This methodology is frozen for the 3–5 business pilot. Any change to `diagnose.ts`, `recommend.ts`, the decision vocabulary, or the Growth Moment schema should be treated as a new version requiring re-validation against golden cases before further pilot use — not a silent edit.
