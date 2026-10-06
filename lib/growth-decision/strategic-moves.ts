// lib/growth-decision/strategic-moves.ts
// Curated STRATEGIC-MOVE SEED LIBRARY for Stage 2 "Push the Brief".
//
// A seed is a reusable FORM of strategic advantage — how a senior strategist
// pushes work beyond category hygiene. It is NOT an idea, a concept, a campaign
// line or copy, and it contains nothing brand-specific. Stage 2 must SELECT,
// ADAPT or COMBINE seeds against the case evidence; it must never echo a seed
// label unchanged (enforced in lint-push.ts).
//
// This file is authored craft. Edit it: it is the part of the system that
// should carry ShiftImpact's strategic judgement, not the prompt wording.

export type StrategicMoveSeed = {
  id: string;
  name: string;
  /** What this move does for the shopper's decision. */
  strategic_job: string;
  /** The situation in which it is the right move. */
  when_useful: string;
  /** What evidence in a case would justify choosing it. */
  supporting_evidence: string;
  /** What it cannot fix — so it is never over-sold. */
  cannot_solve: string;
  /** What the weak / default execution of this move looks like. */
  weak_default: string;
  /** Why it is more than competent category execution. */
  differs_from_hygiene: string;
  /**
   * Some moves are only an EDGE if a cheap fact about competitors holds. When set,
   * the Blueprint must carry an execution-owner ask to code that fact before
   * production, and downgrade the move from edge to parity if the answer is "no".
   */
  validation_codes?: readonly string[];
  validation_subject?: string;
  downgrade_rule?: string;
};

export const STRATEGIC_MOVE_SEEDS = [
  {
    id: "proof_into_diagnosis",
    name: "Turn proof into diagnosis",
    strategic_job:
      "Help the shopper work out whether the product is right for THEIR situation, so proof becomes a judgement the shopper makes rather than a claim they are asked to accept.",
    when_useful:
      "Interest is intact but purchase is not completing, and the hesitation is about personal fit or suitability rather than awareness or price.",
    supporting_evidence:
      "Stable or rising upstream engagement alongside falling purchase conversion; no price or availability explanation; unknown or suspected fit-related hesitation.",
    cannot_solve:
      "A genuine product-market gap, a weak product claim, or hesitation that is about price, availability or trust in the retailer.",
    weak_default:
      "A generic 'is this for you?' block that every shopper passes through identically, or a quiz that ends in the same recommendation for everyone.",
    differs_from_hygiene:
      "Hygiene shows what the product does; this makes the shopper establish what it would do for them, which a claim or endorsement cannot do.",
  },
  {
    id: "passive_proof_to_decision_utility",
    name: "Convert passive proof into decision utility",
    strategic_job:
      "Make every proof element answer a question the shopper is actually asking at the point of choice, instead of sitting on the page as reassurance.",
    when_useful:
      "Proof elements already exist or are planned but would only be decorative; the shopper has to do the work of connecting proof to their decision.",
    supporting_evidence:
      "Proof is present on the page (own or competitor) yet conversion is still weak; reviews or support themes show questions that existing proof does not answer.",
    cannot_solve:
      "The absence of proof altogether, or a shopper who has already decided against the category.",
    weak_default:
      "Badges, ratings and logos placed near the purchase button, which signal approval without resolving any specific doubt.",
    differs_from_hygiene:
      "Hygiene adds proof; this ties each proof element to a specific decision it must settle, so removing it would leave a question unanswered.",
  },
  {
    id: "parity_to_superiority",
    name: "Transform parity into superiority",
    strategic_job:
      "Having matched the standard competitors already set, find the dimension on which the same proof can be made more specific, more checkable or more complete than theirs.",
    when_useful:
      "Competitors are evidenced to carry a proof standard that the brand currently lacks, so catching up is necessary but will not by itself create preference.",
    supporting_evidence:
      "Observed competitor proof architecture; some visibility of what that proof does not show; a brand asset or fact that competitors do not display.",
    cannot_solve:
      "Not knowing what competitors fail to show. Without that, superiority is a hypothesis to test, not a finding.",
    weak_default:
      "Copying the competitor structure and adding more of it (more badges, more testimonials, longer pages).",
    differs_from_hygiene:
      "Hygiene reaches the competitor standard; this deliberately exceeds it on a named dimension.",
  },
  {
    id: "expose_decision_gap",
    name: "Expose the decision gap",
    strategic_job:
      "Make the specific gap between 'I like this' and 'I will buy this' visible and name what closes it, so the shopper recognises their own hesitation being addressed.",
    when_useful:
      "Funnel data shows interest converting to action poorly at one identifiable step, and the hesitation can be located rather than guessed.",
    supporting_evidence:
      "A step-level drop with a stable upstream signal; objection, review or support data naming what shoppers hesitate over.",
    cannot_solve:
      "Hesitation the brand has no data on. Without objection evidence this stays a hypothesis about where the gap is.",
    weak_default:
      "Addressing generic category objections (price, safety, results) that the shopper did not raise.",
    differs_from_hygiene:
      "Hygiene answers the questions the category usually raises; this answers the question this shopper population is actually stuck on.",
  },
  {
    id: "compress_proof_around_tension",
    name: "Compress proof around one decisive tension",
    strategic_job:
      "Reduce the proof to the one or two items that settle the single decisive tension in this decision, so a shopper with little time or attention still reaches a conclusion.",
    when_useful:
      "Traffic or attention is rising but quality or patience is uncertain; a long proof stack would be skimmed or skipped.",
    supporting_evidence:
      "Volume rising faster than conversion; signs of lower-intent or time-poor visitors; proof that is comprehensive but slow to take in.",
    cannot_solve:
      "A genuinely complex purchase that needs depth, or a case where the decisive tension is not yet known.",
    weak_default:
      "A shorter version of everything, or a summary that drops the proof that mattered.",
    differs_from_hygiene:
      "Hygiene builds a complete proof set; this chooses what to leave out and justifies the choice.",
  },
  {
    id: "authority_endorsement_to_explanation",
    name: "Shift authority from endorsement to explanation",
    strategic_job:
      "Use expertise to explain why a claim holds, so the shopper can follow the reasoning, instead of asking them to trust a name or credential.",
    when_useful:
      "An authority signal is part of the category standard, but the claim itself is technical or hard for a shopper to judge.",
    supporting_evidence:
      "Competitors or the brand use named authority; the product claim depends on a mechanism the shopper cannot easily assess; credibility rather than awareness is the gap.",
    cannot_solve:
      "A claim the brand cannot substantiate, or authority the brand does not actually hold.",
    weak_default:
      "A credentialled name beside the claim with no statement of what was assessed or concluded.",
    differs_from_hygiene:
      "Hygiene includes an authority signal; this makes the authority do explanatory work the shopper can check.",
    validation_subject: "the depth of expert content on each competitor page under review",
    validation_codes: ["credential-only", "claim endorsement", "mechanism explanation", "decision guidance"],
    downgrade_rule:
      "If competitors already carry mechanism explanation or decision guidance, authority-to-explanation is parity, not an edge, and must be moved to parity_catchup.",
  },
  {
    id: "comparison_decision_useful",
    name: "Make comparison decision-useful rather than decorative",
    strategic_job:
      "Help the shopper compare options on the criterion that actually decides the purchase, rather than on a feature list that flatters the brand.",
    when_useful:
      "Shoppers are plainly comparing the brand with alternatives at the moment of choice, and the brand's own page does not help them make that comparison.",
    supporting_evidence:
      "Competitor pages structured around comparison or proof; comparison-style search or review behaviour; a documented basis on which the product genuinely differs.",
    cannot_solve:
      "A product with no genuine difference to show, or comparison claims the brand cannot substantiate.",
    weak_default:
      "A table of ticks the brand wins by construction.",
    differs_from_hygiene:
      "Hygiene lists attributes; this selects the one criterion on which choosing is hard and helps the shopper resolve it fairly.",
  },
  {
    id: "assertion_to_observable",
    name: "Turn proof from assertion into something observable",
    strategic_job:
      "Let the shopper see or check the basis of a claim themselves, so belief comes from observation rather than from being told.",
    when_useful:
      "The product's benefit is abstract or invisible at the point of choice, and the shopper has no way of judging a claim other than trusting it.",
    supporting_evidence:
      "Claim-led page structure with weak conversion; competitor proof that is observable where the brand's is asserted; a brand fact that can be shown honestly.",
    cannot_solve:
      "Results the brand's approved claims do not permit it to show, or a benefit that cannot honestly be made observable.",
    weak_default:
      "Visual treatments of the product that look persuasive but carry no information the shopper can evaluate.",
    differs_from_hygiene:
      "Hygiene states what the product does; this lets the shopper verify it.",
  },
  {
    id: "reframe_decision_criteria",
    name: "Reframe the decision criteria",
    strategic_job:
      "Change what the shopper uses to decide, so the brand's genuine strength becomes the criterion that counts, without misrepresenting the category.",
    when_useful:
      "Shoppers are judging the brand on a criterion on which it is structurally disadvantaged, and a different valid criterion would serve them better.",
    supporting_evidence:
      "A documented basis for a different criterion; evidence that the current criterion is not what drives satisfaction after purchase; competitors all competing on the same dimension.",
    cannot_solve:
      "A criterion the shopper does not actually care about, or a reframe that is not true.",
    weak_default:
      "Telling the shopper what to care about without showing why it matters to their outcome.",
    differs_from_hygiene:
      "Hygiene competes on the category's existing criteria; this changes the basis of the comparison.",
  },
] as const satisfies readonly StrategicMoveSeed[];

export type StrategicMoveId = (typeof STRATEGIC_MOVE_SEEDS)[number]["id"];
export const STRATEGIC_MOVE_IDS = STRATEGIC_MOVE_SEEDS.map((s) => s.id) as unknown as readonly [
  StrategicMoveId,
  ...StrategicMoveId[],
];

/** Compact rendering for the Stage 2 prompt. */
export function renderSeedLibrary(): string {
  return STRATEGIC_MOVE_SEEDS.map(
    (s) =>
      `- id: ${s.id} | ${s.name}\n    job: ${s.strategic_job}\n    useful when: ${s.when_useful}\n    supporting evidence: ${s.supporting_evidence}\n    cannot solve: ${s.cannot_solve}\n    weak default: ${s.weak_default}\n    vs hygiene: ${s.differs_from_hygiene}` +
      ((s as StrategicMoveSeed).validation_codes
        ? `\n    VALIDATE BEFORE PRODUCTION: code ${(s as StrategicMoveSeed).validation_subject} as ${(s as StrategicMoveSeed).validation_codes!.join(" / ")}. ${(s as StrategicMoveSeed).downgrade_rule}`
        : ""),
  ).join("\n");
}
