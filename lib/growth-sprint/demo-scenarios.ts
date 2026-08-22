// lib/growth-sprint/demo-scenarios.ts
// Growth Sprint Pilot Demo Mode — static, pre-authored scenario content.
//
// This is presentation content for a facilitator-led live demo, not a new
// intelligence layer and not a live AI call. It is written to the exact
// standard the two real AI calls (diagnose.ts / recommend.ts) are held to —
// every opportunity is traceable to a specific Growth Moment, evidence is
// qualitative and honest about what's Confirmed vs Inferred, and
// decision_outcome is Hold by default because none of these hypotheses has
// actually been tested. Nothing here is fabricated data about a real
// business — these are three deliberately fictional composites built from
// common patterns in each category, used only to demonstrate the mechanic.
//
// No new database table, no new API route, no new AI call. Reuses the same
// shapes as lib/growth-sprint/types.ts so this stays visually and
// structurally identical to a real sprint.

import type { BusinessContext, DecisionOutcome, EvidenceConfidence } from "./types";

export interface DemoGrowthMoment {
  customer: string;
  situation: string;
  trigger: string;
  need: string;
  behaviour: string;
  commercial_response: string;
  confidence: EvidenceConfidence;
  evidenceNote: string;
}

export interface DemoOpportunity {
  momentIndex: number;
  rank: number;
  rationale: string;
  supporting_evidence: string[];
  missing_evidence: string[];
}

export interface DemoDecisionBranch {
  label: "Scale" | "Shift" | "Retest" | "Stop";
  condition: string;
}

export interface DemoScenario {
  slug: string;
  cardLabel: string;
  archetype: string;

  // Step 1 — Business Context
  businessName: string;
  industry: string;
  customerType: string;
  challenge: string;
  revenueObjective: string;
  businessContextDiagnosis: BusinessContext;
  businessContextNote: string;

  // Step 2 — Growth Question
  growthQuestion: string;
  growthQuestionExample: string;

  // Step 3 — Growth Moment Discovery
  growthMoments: DemoGrowthMoment[];

  // Step 5 — AI Diagnosis Reveal
  businessSituation: string;
  growthConstraints: string[];
  opportunities: DemoOpportunity[];
  priorityMomentIndex: number;

  // Step 6 — Recommendation
  growthHypothesis: string;
  thirtyDayTest: string;
  targetAudience: string;
  offerIntervention: string;
  conversionPath: string;
  evidenceSignals: string[];

  // Step 7 — Decision Rules
  decisionOutcome: DecisionOutcome;
  decisionRationale: string;
  decisionRule: string;
  decisionBranches: DemoDecisionBranch[];

  // Step 8 — Client Reflection
  beforeQuote: string;

  // Facilitator mode — talking points per step
  facilitator: {
    opening: string;
    businessContext: string;
    growthQuestion: string;
    growthMomentDiscovery: string;
    evidenceConfidence: string;
    diagnosisReveal: string;
    recommendation: string;
    decisionRules: string;
    reflection: string;
  };
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  // ── 1. Elderly care / service business ─────────────────────────────────
  {
    slug: "elderly-care",
    cardLabel: "Elderly Care",
    archetype: "Elderly care / service business",
    businessName: "Golden Years Home Care",
    industry: "In-home elderly care services",
    customerType: "Adult children (40s–60s) arranging care for an ageing parent",
    challenge: "We get enquiries through referrals and our website, but a lot of families go quiet after the first phone call and never sign up.",
    revenueObjective: "Convert more first enquiries into signed care plans, without discounting.",
    businessContextDiagnosis: "service",
    businessContextNote: "Reads as a service business, but not a standard one — the person on the phone (an adult child) is not the person receiving the care (the parent). That gap between buyer and end user is the thing a generic service template would miss.",
    growthQuestion: "We are investing in marketing but unsure what is actually moving families to sign up.",
    growthQuestionExample: "We are investing in marketing but unsure what is actually moving customers.",
    growthMoments: [
      {
        customer: "Adult child (usually a daughter, 40s–55) researching care for an ageing parent",
        situation: "Parent has had a fall, a hospital discharge, or a visible decline that makes living alone feel unsafe",
        trigger: "A specific incident — a fall, a missed medication, a doctor's comment — that turns 'someday' into 'now'",
        need: "Reassurance the parent will be safe, and reassurance that choosing outside care isn't abandoning them",
        behaviour: "Calls 2–3 agencies the same week, asks about caregiver background and pricing, then goes quiet for days even after a good call",
        commercial_response: "The first call currently moves straight into a pricing and package pitch, not into what the family is actually anxious about",
        confidence: "Confirmed",
        evidenceNote: "Front desk has tracked the drop-off between 'good call' and 'goes quiet' across the last two intake cycles.",
      },
      {
        customer: "Existing client family, three months into a care plan",
        situation: "Caregiver relationship is working and the parent has stabilised",
        trigger: "A second incident-free month passes and the family relaxes",
        need: "Confidence to consider increasing hours or adding overnight care",
        behaviour: "Never asks — assumes the current plan is the only option unless a new crisis hits",
        commercial_response: "No structured check-in point exists to raise expanding the plan",
        confidence: "Directional",
        evidenceNote: "Care coordinators have mentioned this in passing conversation — it isn't tracked.",
      },
    ],
    businessSituation: "Golden Years' constraint is not enquiry volume — the intake log shows a steady stream of first calls from anxious adult children. The constraint sits immediately after a good first call, in the days before the family either books an assessment or goes quiet, and that pattern is tracked, not assumed. The second opportunity — expanding hours for settled existing clients — is real but sits on weaker evidence, since it's never actually been raised with a family.",
    growthConstraints: [
      "Enquiry volume is not the bottleneck — post-call conversion is",
      "The buyer (adult child) and the end user (parent) are different people with different anxieties, and the current call script speaks mainly to one of them",
    ],
    opportunities: [
      {
        momentIndex: 0,
        rank: 1,
        rationale: "This is the only moment with tracked evidence of a specific, repeated drop-off point, and it sits at the highest-stakes, highest-anxiety moment in the whole relationship — the first call after a triggering incident.",
        supporting_evidence: ["Two intake cycles of logged calls-to-signup showing the same drop-off after a 'good' first call"],
        missing_evidence: ["Whether the drop-off is about price, timing, or the emotional framing of the call — the log shows that it happens, not why"],
      },
      {
        momentIndex: 1,
        rank: 2,
        rationale: "A real opportunity, but evidence is second-hand and the moment has never actually been tested with a family, so it's ranked below the confirmed one.",
        supporting_evidence: ["Care coordinators' informal observation"],
        missing_evidence: ["Any tracked instance of a family being asked and saying yes or no"],
      },
    ],
    priorityMomentIndex: 0,
    growthHypothesis: "We believe families are not going quiet because of price. They are going quiet because the first call answers questions about the service before it answers the question they actually called with: will my parent be safe, and am I doing the right thing.",
    thirtyDayTest: "Rewrite the first-call script to open with the safety and guilt question before any pricing or package detail, and track enquiry-to-signup conversion split by which script version the caller used.",
    targetAudience: "Adult children calling within 48 hours of a triggering incident — fall, hospital discharge, or doctor referral — the segment showing the sharpest current drop-off",
    offerIntervention: "No discount and no new package — same pricing, reordered conversation, plus a same-day follow-up call within 24 hours instead of the current 3–5 day gap",
    conversionPath: "First call → same-day follow-up call → in-home assessment booked → signed care plan",
    evidenceSignals: [
      "Enquiry-to-signup rate on the new script versus the old script, same two-week window",
      "Time-to-follow-up tightened from 3–5 days to 24 hours, and whether that alone moves the number",
      "Whether families who still go quiet after the new script cite a different reason when asked",
    ],
    decisionOutcome: "Hold",
    decisionRationale: "This is a well-reasoned hypothesis about why the drop-off happens, but it hasn't been tested yet — the office has evidence the drop-off exists, not evidence that reordering the call fixes it.",
    decisionRule: "Gate opens when the new script's enquiry-to-signup rate is at least 15 percentage points above the old script's rate, across a minimum of 15 calls per version.",
    decisionBranches: [
      { label: "Scale", condition: "The new-script conversion rate clears the threshold across both trigger types (fall and hospital discharge) — roll it out to every intake caller and retire the old script." },
      { label: "Shift", condition: "Families engage longer on the call and ask better questions, but signup rate doesn't move — the objection is downstream of the call, likely price or family disagreement, not the opening framing." },
      { label: "Retest", condition: "The new script is used inconsistently, or the 24-hour follow-up slips back to 3–5 days — retest with the process actually followed before judging the hypothesis." },
      { label: "Stop", condition: "Conversion is flat or worse than the old script across both trigger types with at least 15 calls each — the reason families go quiet is not the call framing." },
    ],
    beforeQuote: "We need more marketing.",
    facilitator: {
      opening: "Most businesses don't lack ideas — they lack clarity on which opportunity deserves investment first. For a care business specifically, that's rarely about lead volume. It's usually about what happens in the anxious moment right after the first call.",
      businessContext: "Don't force this into a generic services template. Ask what's actually happening day to day — who calls, why now, and what they're afraid of. Let the system tell you it reads as a service business with an unusual buyer/end-user split, don't lead them there.",
      growthQuestion: "Ask which of the three examples feels closest, then let them describe it in their own words. For a care business this is almost always framed around trust, not price — listen for that.",
      growthMomentDiscovery: "Walk the six fields slowly. The trigger question — 'what causes action right now?' — is usually the most revealing one for a care business, because it's rarely the service itself, it's a specific incident.",
      evidenceConfidence: "This is the trust moment. Say plainly: we separate what you know happened from what you believe is happening. A care business usually has confirmed data on the drop-off itself, but only a guess about why — point that out explicitly.",
      diagnosisReveal: "Don't lead with 'the AI thinks.' Say: based on the evidence you just gave us, the strongest opportunity appears to be... then let the rationale do the convincing, not the technology.",
      recommendation: "Slow down on the growth hypothesis line — it should sound like a bet, not a conclusion. That distinction is the whole point of this step.",
      decisionRules: "This is the hero moment. Read the current state — Hold — and the reason out loud before anything else. Then walk Scale, Shift, Retest, Stop as four honest, named outcomes, not a sales pitch for Scale.",
      reflection: "Ask the before question first and let it sit for a second before asking after. Don't fill the silence — the gap between the two answers is the actual value being demonstrated.",
    },
  },

  // ── 2. Clinic / service business ────────────────────────────────────────
  {
    slug: "clinic",
    cardLabel: "Clinic",
    archetype: "Clinic / service business",
    businessName: "Bright Smile Dental",
    industry: "Dental clinic",
    customerType: "Working adults 25–45 who've been putting off a dental visit",
    challenge: "We run promotions and get a lot of enquiries on Instagram, but a lot of people book a consultation and then don't come back for treatment.",
    revenueObjective: "Convert more consultations into completed treatment plans, not just first visits.",
    businessContextDiagnosis: "service",
    businessContextNote: "Reads as a service business built around a multi-visit purchase decision. The gap isn't awareness — Instagram enquiries are healthy — it's what happens in the seconds after a patient is handed a quote.",
    growthQuestion: "We have enquiries but conversion is weak.",
    growthQuestionExample: "We have enquiries but conversion is weak.",
    growthMoments: [
      {
        customer: "Working adult who booked a consultation after months of an unaddressed dental issue",
        situation: "Sits through the consultation and receives a treatment plan and quote for work beyond a basic cleaning",
        trigger: "Receiving the quote for recommended treatment, typically RM2,000–6,000, at the end of the consultation",
        need: "Time to process a cost they weren't expecting, and reassurance the treatment is necessary now, not optional",
        behaviour: "Says 'let me think about it,' leaves, and doesn't book the follow-up treatment appointment",
        commercial_response: "No structured follow-up after the quote beyond the receptionist mentioning they can call back",
        confidence: "Confirmed",
        evidenceNote: "Clinic's own booking system logs consultation-to-treatment conversion — the drop after quote is a real logged number.",
      },
      {
        customer: "Existing patient due for a 6-month cleaning",
        situation: "Last cleaning was routine, no issues flagged",
        trigger: "The 6-month mark passes with no reminder that lands",
        need: "A nudge that fits an already-busy schedule",
        behaviour: "Doesn't rebook until a new problem forces a visit",
        commercial_response: "Reminder system exists but isn't consistently followed up on",
        confidence: "Observed",
        evidenceNote: "Front desk notices patients don't return on schedule, but it isn't tracked systematically.",
      },
    ],
    businessSituation: "Bright Smile's bottleneck sits specifically at post-quote decision paralysis on higher-cost, unplanned treatment — not top-of-funnel awareness, which the Instagram enquiry volume already confirms is healthy. The second opportunity, routine patients lapsing past their 6-month reminder, is real but currently only an impression, not a tracked pattern.",
    growthConstraints: [
      "Awareness and first bookings are not the bottleneck — the drop happens after the quote is given",
      "There is no structured moment between 'quote given' and 'patient decides,' so hesitation currently has nowhere to go but silence",
    ],
    opportunities: [
      {
        momentIndex: 0,
        rank: 1,
        rationale: "This is the moment with tracked, logged evidence of a specific and repeated drop-off, at the highest-value point in the patient relationship — a quote above RM2,000.",
        supporting_evidence: ["Booking system logs showing consultation-to-treatment conversion around 40% on quotes above RM2,000"],
        missing_evidence: ["Whether hesitation is about total cost, timing, or wanting a second opinion — the system shows that they stall, not why"],
      },
      {
        momentIndex: 1,
        rank: 2,
        rationale: "Plausible and lower-effort to fix, but resting on staff impression rather than a tracked number, so ranked below the confirmed opportunity.",
        supporting_evidence: ["Front desk observation of missed 6-month rebookings"],
        missing_evidence: ["Actual rebooking rate at 6 months versus target"],
      },
    ],
    priorityMomentIndex: 0,
    growthHypothesis: "We believe patients are not declining treatment because they don't want it — they're stalling because the quote lands as a single high number with no path to say yes in stages, and nothing meets them again after that moment of hesitation.",
    thirtyDayTest: "For every consultation ending in a quote above RM2,000, add a structured 48-hour follow-up call plus an option to split the treatment into two visits or payments, and track conversion against the current no-follow-up baseline.",
    targetAudience: "Patients quoted more than RM2,000 in a single consultation who did not book their next appointment before leaving",
    offerIntervention: "No price discount — same quote, plus a 48-hour follow-up call and a two-stage payment or treatment option",
    conversionPath: "Consultation → quote given → 48-hour follow-up call → treatment appointment booked",
    evidenceSignals: [
      "Consultation-to-treatment conversion on quotes above RM2,000, new process versus the ~40% historical baseline",
      "Whether the two-stage option is taken up, or whether patients still choose to pay in full",
      "Any change in the specific reason patients give when they do decline",
    ],
    decisionOutcome: "Hold",
    decisionRationale: "The pattern of stalling after a quote is confirmed, but the reason for it — and whether a follow-up call actually fixes it — has not been tested yet.",
    decisionRule: "Gate opens when consultation-to-treatment conversion on quotes above RM2,000 rises at least 20 percentage points above the current baseline, across a minimum of 20 quoted consultations.",
    decisionBranches: [
      { label: "Scale", condition: "Conversion clears the threshold across both new and returning patients — make the 48-hour follow-up and payment split standard for every quote above RM2,000." },
      { label: "Shift", condition: "The follow-up call gets patients talking and asking questions, but they still don't book — the resistance is about the money itself, not the lack of contact. Test a financing option instead." },
      { label: "Retest", condition: "Follow-up calls are inconsistently made or miss the 48-hour window — retest with the process actually followed before judging the hypothesis." },
      { label: "Stop", condition: "Conversion is flat across at least 20 quoted consultations with the follow-up in place — decision paralysis after the quote is not the real blocker." },
    ],
    beforeQuote: "We need more marketing.",
    facilitator: {
      opening: "For a clinic, the instinct is almost always 'we need more leads.' Set the frame early: the enquiry number is already healthy here — this session is about the one moment inside the funnel that's actually leaking.",
      businessContext: "Let them describe the patient journey in their own words before offering a category. A clinic often looks like a straightforward service business until you get to the multi-visit, high-cost decision point — that's the nuance worth surfacing.",
      growthQuestion: "'Enquiries but weak conversion' is almost always the right frame for a clinic — confirm that's really what they mean before moving on.",
      growthMomentDiscovery: "The trigger here is a specific, nameable event — the moment the quote is handed over. Get them to describe that exact moment, not the general idea of 'patients hesitating.'",
      evidenceConfidence: "Clinics usually have real booking-system data on this, which makes for a strong Confirmed moment — use that contrast against the second, Observed-only moment to make the distinction concrete.",
      diagnosisReveal: "Emphasise that the opportunity is traceable to their own booking data, not a generic industry assumption. That's the credibility hook for a clinic owner specifically.",
      recommendation: "Be explicit that the intervention isn't a discount — clinics are often worried this process will just recommend cutting price. It doesn't.",
      decisionRules: "Hero moment. Read Hold and its reason first. The Stop condition matters especially here — a clinic owner should hear plainly that if the numbers don't move, the answer is to look elsewhere, not to keep pushing the same fix.",
      reflection: "Ask what they were about to spend more marketing budget on before this session, then ask what they'd test first now. The contrast is the deliverable.",
    },
  },

  // ── 3. Local commerce business ──────────────────────────────────────────
  {
    slug: "local-commerce",
    cardLabel: "Local Commerce",
    archetype: "Local commerce business",
    businessName: "Kedai Rasa",
    industry: "Artisanal snack / kuih producer, stall + online orders",
    customerType: "Local repeat buyers, plus one-off gift buyers around festive seasons",
    challenge: "We get a rush of orders every festive season but sales are flat and unpredictable the rest of the year.",
    revenueObjective: "Build steady non-festive revenue, not just bigger festive spikes.",
    businessContextDiagnosis: "commerce",
    businessContextNote: "Reads cleanly as commerce, but the constraint isn't demand or awareness — the sales log shows engaged repeat buyers who simply never encounter a reason to buy outside the two festive windows.",
    growthQuestion: "We want growth but don't know which customer opportunity to prioritise.",
    growthQuestionExample: "We want growth but don't know which customer opportunity to prioritise.",
    growthMoments: [
      {
        customer: "A repeat festive-season buyer (bought Raya or CNY hampers in a past year)",
        situation: "Sees a social post or passes the stall with no festive occasion driving the purchase",
        trigger: "A personal occasion — a birthday, a small gathering, or just a craving — with no festive prompt attached",
        need: "Permission to buy without an occasion — right now the brand only shows up as a festive gifting product",
        behaviour: "Follows the account and likes festive posts, but doesn't buy or even browse outside the 6–8 week festive windows",
        commercial_response: "Menu, packaging, and marketing are built entirely around festive hampers — there's no everyday-sized or everyday-occasion product on offer",
        confidence: "Confirmed",
        evidenceNote: "Order data shows sales cluster almost entirely in the two festive windows — a directly observed pattern in their own sales log.",
      },
      {
        customer: "One-off gift buyer, festive season only, no repeat history",
        situation: "Buys a hamper as a gift once, during a festive window",
        trigger: "A festive gifting occasion specifically",
        need: "A safe, ready-made gift that requires no decision-making",
        behaviour: "Never returns outside that specific festive purchase",
        commercial_response: "No mechanism currently exists to bring this buyer back at all",
        confidence: "Inferred",
        evidenceNote: "Assumed from follower geography and purchase pattern — not confirmed by asking buyers directly.",
      },
    ],
    businessSituation: "Kedai Rasa's growth constraint is not demand — the sales log and social engagement both show a genuinely interested, repeat-buyer audience. The constraint is that every product, price point, and post is built around festive gifting, so that engaged audience is never given a reason or a moment to buy the rest of the year. The one-off gift buyer opportunity is weaker — it's a real segment but there's no confirmed evidence they'd return under any circumstance yet.",
    growthConstraints: [
      "The business already has a warm, repeat-engaged audience — the constraint is the offer, not the audience",
      "Every current touchpoint (product, price, posts) is framed around festive gifting, with nothing built for an everyday occasion",
    ],
    opportunities: [
      {
        momentIndex: 0,
        rank: 1,
        rationale: "This moment has directly observed evidence — the sales-clustering pattern is in their own order data — and the buyers involved are already warm and engaged, which makes it the lower-risk test to run first.",
        supporting_evidence: ["Order log showing sales concentrated almost entirely in two festive windows despite year-round social engagement"],
        missing_evidence: ["Whether repeat buyers would actually buy a non-festive product if offered one — that's the thing being tested, not yet known"],
      },
      {
        momentIndex: 1,
        rank: 2,
        rationale: "A real segment, but the evidence for why they never return is inferred, not confirmed, and no retention mechanism has ever been tried with them.",
        supporting_evidence: ["Follower and purchase pattern data"],
        missing_evidence: ["Any direct signal from one-off buyers themselves about why they didn't return"],
      },
    ],
    priorityMomentIndex: 0,
    growthHypothesis: "We believe repeat buyers already trust the brand and would buy more often, but don't, because every product and post signals 'festive gift,' not 'everyday treat' — the brand has never given them a reason or a moment to buy outside the two windows.",
    thirtyDayTest: "Launch one small, everyday-priced product (single-serve or small pack, under RM15) positioned explicitly for non-festive occasions, and post about it only to the existing repeat-buyer list and followers, tracking orders from that specific product and audience.",
    targetAudience: "Existing repeat festive buyers — people who ordered in at least one of the last two festive windows — not new-customer acquisition",
    offerIntervention: "One new everyday-sized product, no discount, positioned around a non-gift occasion such as a weekend treat rather than a festive hamper",
    conversionPath: "Sees post to existing followers → orders the new everyday product through the same ordering channel used for festive orders → repeats within the 30-day window",
    evidenceSignals: [
      "Number of orders for the new product from known repeat buyers within 30 days",
      "Whether any of those buyers order a second time within the same window — true non-festive repeat behaviour, not a one-off",
      "Engagement on the everyday-framed post compared to their usual festive post benchmark",
    ],
    decisionOutcome: "Hold",
    decisionRationale: "The sales-clustering pattern is confirmed, but repeat buyers have never actually been offered a non-festive product, so whether they'd buy one is a hypothesis, not yet evidence.",
    decisionRule: "Gate opens when at least 15 percent of contacted repeat buyers place an order for the new everyday product within the 30-day window, with at least one in five of those ordering a second time in the same window.",
    decisionBranches: [
      { label: "Scale", condition: "The threshold clears and repeat orders appear — build a small permanent everyday-occasion line and market to festive and everyday moments year-round." },
      { label: "Shift", condition: "People engage with the post (saves, comments) but don't order — the interest is real but the product or price point is wrong. Test a different everyday item or price before concluding demand isn't there." },
      { label: "Retest", condition: "The product wasn't actually visible in the ordering channel repeat buyers use, or the post never reached most of the list — retest with real reach and access confirmed first." },
      { label: "Stop", condition: "Engagement and orders are both flat despite confirmed reach to the repeat-buyer list — the dormancy isn't about festive framing, and this specific hypothesis is wrong." },
    ],
    beforeQuote: "We need more marketing.",
    facilitator: {
      opening: "Local commerce owners usually think their problem is a slow season. Reframe early: the audience is already there and engaged — the question is what's actually being offered to them.",
      businessContext: "This is a clean commerce read, but push past the category label — ask what happens to a loyal customer the other 10 months of the year. That's where the real opportunity usually sits.",
      growthQuestion: "This owner often frames it as 'we want growth but don't know where to focus' — that's example three. Let them pick their own words first.",
      growthMomentDiscovery: "The 'trigger' field is the interesting one here — for a seasonal business, the honest answer is often 'nothing' outside festive windows, and naming that gap directly is the insight.",
      evidenceConfidence: "Point out the contrast plainly: their own order data (Confirmed) proves the seasonal clustering exists, but whether repeat buyers would buy something everyday is still Inferred — that's exactly the gap the 30-day test is built to close.",
      diagnosisReveal: "Lead with the reassurance that this isn't a demand problem — the audience is already warm. That reframe is usually the moment local commerce owners lean in.",
      recommendation: "Be explicit that the test targets existing repeat buyers only, not new customer acquisition — that's a deliberate, lower-risk choice worth explaining.",
      decisionRules: "Hero moment. Walk all four branches plainly — a local commerce owner especially needs to hear that Stop is a legitimate, respected outcome, not a failure of the exercise.",
      reflection: "Ask what they'd have spent the next marketing budget on before this session (usually: more festive-season ads), then ask what they'd test first now.",
    },
  },
];

export function getDemoScenario(slug: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.slug === slug);
}
