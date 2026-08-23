# Growth Sprint v1 — Pilot Readiness Document

**Status:** Architecture frozen. This document assesses whether the existing build is ready for real-world pilot validation with 3–5 businesses — it does not propose changes to how the product works. See [growth-sprint-methodology.md](./growth-sprint-methodology.md) for the locked methodology this assesses against.

**Reviewed against the actual codebase** (`lib/growth-sprint/`, `app/(os)/growth-sprint/`, `app/api/growth-sprints/`, `app/growth-sprint/share/[token]/page.tsx`) on 19 August 2026, not against the original spec or intent — findings below reflect what the code does today.

**Target validation question:** Will a business owner trust this process enough to change a decision? Not: is the AI impressive, is the technology advanced, can we automate everything.

---

## 1. What is locked

- The 8-step operator workspace: Business snapshot → Growth question → Growth challenge → Revenue pillars → Growth Moments → Evidence capture → Diagnosis → Recommendation.
- The two AI calls (`diagnose.ts`, `recommend.ts`) and their prompts, exactly as validated across the three golden cases.
- The Growth Moment's six required fields and the qualitative Evidence Confidence scale.
- The decision vocabulary (Scale/Shift/Hold/Retest/Stop) and the pre-test-vs-post-test logic fixed in the last validation pass.
- The raw/reviewed separation and the public share mechanism (token + hash, revocable, reviewed-fields-only query).
- The access model: authenticated operator routes, token-gated public share route, no per-owner row scoping.

## 2. What should not be changed for this pilot

Per explicit instruction, and because none of it is what's being tested:

- No new modules. No refactor of Growth Sprint's own architecture.
- No consolidation with Decision Engine, FRAME/STAGE/Gates, Quick Audit, or Prospect Intelligence.
- No new abstraction layers.
- No feature additions beyond what's flagged below as a genuine content gap in what the business owner actually receives (see 4.1) — and even that is flagged for your decision, not implemented here.

The pilot is testing the *product*, not the platform. If the first 3–5 sessions reveal the wrong opportunity gets surfaced, or business owners don't trust the output, that's signal about the methodology and prompts — not a reason to reach for new infrastructure.

## 3. Current pilot workflow

**Setup:** Operator creates a sprint with just a business name, then runs an 8-step guided session live with the business owner. Each step autosaves on "Continue" (a PATCH round-trip per step).

**Steps 1–4** (business snapshot, growth question, growth challenge, revenue pillars): free-text capture, no AI involved, low friction. Business context (Commerce/Experience/Service/Custom) is optional and explicitly illustrative-only.

**Step 5** (Growth Moments): operator builds one or more structured 6-field moments. A live completeness score warns — but does not hard-block — if fields are missing, with an explicit "run anyway" override.

**Step 6** (Evidence capture): operator tags each moment with a qualitative confidence level (Confirmed/Observed/Directional/Inferred/Missing) and an optional note.

**Step 7** (Diagnosis — AI Call 1): model returns a business situation summary, named constraints, and ranked opportunities, each traceable to a specific moment. Operator picks which opportunity to act on — confirming the model's top pick, or overriding it with a required reason.

**Step 8** (Recommendation — AI Call 2 + approve + publish): model returns the Growth Hypothesis, the 30-Day Test, and the Decision Rule, plus the current pre-test `decision_outcome` (almost always Hold on a first sprint) and its rationale. Operator reviews, clicks Approve, then Publish, which generates a one-time share link for the business owner.

**What the business owner sees:** a token-gated public page at `/growth-sprint/share/[token]` showing the opportunity, the priority moment's rationale, the recommended decision badge, the 30-day test (test/audience/offer/conversion path), and the evidence signals to watch.

## 4. Known limitations

### 4.1 Blocker — the published report does not show the Growth Hypothesis or the Decision Rule

This is the one finding in this review that should be resolved, or consciously accepted, before the pilot — not a nice-to-have.

The operator's own workspace (step 8) correctly shows all three locked parts of the recommendation: Growth Hypothesis, 30-Day Test, Decision Rule. But the page the business owner actually receives (`app/growth-sprint/share/[token]/page.tsx`) only renders the opportunity and the 30-Day Test. It never renders `recommendation_reviewed.growth_hypothesis` or `recommendation_reviewed.decision_rule` — both fields exist, are already computed and stored, and are simply not on the page.

This matters specifically because of the pilot's own success question. The Decision Rule is the part that makes the recommendation falsifiable — it's the thing a skeptical business owner needs to see to trust that this isn't just a plausible-sounding suggestion, but a test with a defined answer. Right now they see the test and the current Hold status, but not the rule for what happens next, and not the hypothesis framed as an explicit unproven bet rather than a stated conclusion. Displaying two fields that already exist in the data is not a new feature or an architecture change — it's a one-page content fix — but it's outside this review's scope to implement without your sign-off, so it's flagged here for a decision rather than made.

### 4.2 Friction — no in-workspace way to edit AI wording before it goes live

The methodology document describes the reviewed copy as "what the operator can edit before publishing." The API supports this (`diagnosis_reviewed` and `recommendation_reviewed` are both PATCH-able fields). The UI does not — step 7 and step 8 render the AI's output as read-only text; the only operator input is which opportunity to prioritise and, optionally, an override reason. If a sentence reads awkwardly or needs a local detail corrected in front of a real business owner, there's currently no in-session way to fix it.

This is not a demonstrated problem — the three golden-case outputs read cleanly and needed no editing — but it's a real gap between what the doc promises and what the UI does, and worth knowing going in rather than discovering live with a client watching.

### 4.3 Friction — eight sequential screens is more navigation than a fluid conversation wants

Each step is its own screen behind its own save round-trip. For a facilitator running a live 10–15 minute conversation, that's eight context switches, on top of building multi-field Growth Moments and tagging evidence per moment. Not a blocker — it was already run successfully in the staging walkthrough — but the operator should rehearse the flow once solo before the first real pilot session, so the mechanics don't visibly slow down the conversation.

### 4.4 Not a limitation, but worth restating: no confusing areas found in the vocabulary itself

The one real methodology defect found during validation — the physiotherapy case prematurely outputting Scale before any test had run — is already fixed and re-validated live. The Hold-as-default logic and the Scale/Shift/Hold/Retest/Stop distinctions held up across all three re-run golden cases. This part of the product doesn't need pilot data to trust; the numbered concerns above are the only open items.

### 4.5 Open — output reads as generic, close to what the business is already doing (flagged 22 Aug 2026, after running the live demo)

The core concern is not a bug, and it's the most important open item for the pilot: the opportunity and recommendation in the demo scenarios can read as things the business owner already suspects or is already doing, rather than a specific, non-obvious finding. If that's how it lands with a real business owner, it undercuts the entire pilot success question in section 5 — "does this make them trust the process enough to change a decision" is a hard sell if the output feels like a restatement of the obvious.

Two different, not-yet-distinguished possible causes:

- **Demo-content authoring, not methodology.** The three demo scenarios are pre-written composites built to be broadly representative of an archetype (elderly care, clinic, local commerce) rather than pulled from one real business's actual, sometimes-surprising evidence. A live session grounded in a real business owner's specific Growth Moments — the odd detail, the thing only they would know — may not have this problem to the same degree, since specificity in the real product comes from what the business owner says, not from a script.
- **A framing problem in the output itself.** Even where the underlying finding is genuinely specific, the copy may not clearly separate "the symptom you already sense" (often unsurprising — of course families hesitate, of course patients delay treatment) from "the exact, falsifiable fix and threshold nobody has actually tried yet" (the actually new part). If that distinction isn't sharp in the language, the whole package reads as generic even when the mechanics underneath are sound. Note this is a live-copy concern, separate from the fabrication risk already fixed in `/decide` — the direction here is the opposite: not inventing specifics, but under-selling the specifics that are already real.

This can't be fully diagnosed from demo content alone — it needs real pilot sessions. The Client Reflection step already has a built-in test for exactly this ("did this reveal a missed opportunity?") — if real businesses also say no, or say "we already knew that," that's the signal the underlying diagnosis/recommendation prompts need sharpening, not just the demo scenario copy. Until then: revise the three demo scenarios to sharpen the obvious-symptom-versus-non-obvious-fix distinction before running this with an actual prospect, and treat this as the top-priority thing to watch in the first 1–2 real pilot sessions.

## 5. Pilot success criteria

The pilot is not measuring the AI. It's measuring whether a real business owner trusts the output enough to act differently than they would have otherwise. Concretely, for each of the 3–5 pilot businesses, this pilot is a pass if:

- The operator completes the session end-to-end without needing a workaround outside the tool.
- The business owner can restate the opportunity and the 30-day test in their own words immediately after the session, without re-explanation.
- The business owner agrees the identified opportunity is real and specific to them — not something that could apply to any business in their category.
- The business owner names a decision they were genuinely unsure about, and the session moved them toward a specific answer (even if that answer is "wait and test," i.e. Hold).
- The business owner says, unprompted or on direct ask, that they would pay for this, would act on the 30-day test, or would want a follow-up session.

Any single business failing one of these doesn't fail the pilot — the pilot is failed only if a pattern emerges across most of the 3–5 (e.g. every business agrees with the opportunity but none can articulate the decision rule; or every operator hits the same friction point).

## 6. Feedback capture method

The schema already has a place for post-session outcome data — `validation_feedback` (`action_taken`, `outcome_summary`, `would_repeat_decision`, `captured_at`) is a real column on `growth_sprints`, writable via the existing `PATCH /api/growth-sprints/[id]` route. There is no operator-facing form for it yet. For 3–5 pilot businesses, building a dedicated UI for this is not worth it — that would be exactly the kind of premature infrastructure this freeze is meant to avoid. Two lower-cost options that need no new module:

- Capture it directly via the existing PATCH endpoint (a short script, or a one-off internal note-taking pass after each pilot follow-up call), since the field already accepts free-text + booleans.
- Or capture it entirely outside the app — a plain form or shared sheet — and backfill `validation_feedback` later if it turns out to matter for a future decision, since nothing downstream currently reads that field.

**What to capture per business, structured around section C of this review:**

*Business information* — industry/category, rough size (solo/small team/multi-location), the specific challenge they came in with, in their own words.

*Session metrics* — actual completion time versus the 10–15 minute target; the step where the operator hesitated or had to improvise (this is the most useful operator-facing signal — it tells you which of the 8 steps needs rethinking first if a pattern shows up); any question the business owner visibly didn't understand or had to have rephrased.

*Output quality* — did the business owner agree the opportunity was the right one to prioritise; did they push back or want a different moment prioritised instead; did anything in the diagnosis or recommendation feel generic or reusable across a different business; specifically, did they understand the Decision Rule and could they restate what would make them scale, shift, or stop.

*Commercial validation* — would they pay for this session at the price point being tested; would they actually run the 30-day test as written, or would they modify it first; do they want a follow-up engagement, and if so what kind.

Five businesses is not a statistically meaningful sample — the point of capturing this consistently is to catch a *pattern* (the same friction point, the same kind of pushback, the same commercial hesitation) across most of them, not to score any single session.
