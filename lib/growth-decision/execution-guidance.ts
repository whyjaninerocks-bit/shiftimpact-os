// lib/growth-decision/execution-guidance.ts
// "Guidance for the execution owner" — a reusable, AUTHORED guidance layer, keyed by intervention
// type. It is craft written by ShiftImpact, not model output, so the commercial judgement lives
// here and can be edited without redrafting any Blueprint.
//
// Purpose: let the execution owner lead as a commercial client partner, not merely coordinate
// teams. Commercial design is not an agency's home expertise; this gives them the logic, the
// conversations, the primer and the guard-rails to lead it credibly.
//
// Only `commercial_pricing_led` is authored. The other types are stubs.
// Text uses the token {EO} for the execution owner's name (substituted at render).

import type { AgencyDeliverableKey, InterventionType } from "./intervention-types";

export type GuidanceConversation = {
  name: string;
  /** The agency deliverable this conversation serves. */
  supports: AgencyDeliverableKey;
  when: string;
  who: string;
  purpose: string;
  /** Questions {EO} leads with. */
  ask: string[];
  good_looks_like: string;
};

export type DecisionRightRow = {
  decision: string;
  client: string;
  execution_owner: string;
  shiftimpact: string;
};

export type ExecutionGuidance = {
  intervention_type: InterventionType;
  status: "authored" | "stub";
  role_framing: string;
  coordinator_vs_partner: { instead_of: string; do: string }[];
  conversations: GuidanceConversation[];
  primer: { term: string; plain_language: string }[];
  objections: { client_says: string; response: string }[];
  decision_rights: { summary: string[]; rows: DecisionRightRow[] };
  escalation_triggers: string[];
  boundaries: string[];
};

const EMPTY: Omit<ExecutionGuidance, "intervention_type"> = {
  status: "stub",
  role_framing: "",
  coordinator_vs_partner: [],
  conversations: [],
  primer: [],
  objections: [],
  decision_rights: { summary: [], rows: [] },
  escalation_triggers: [],
  boundaries: [],
};

export const EXECUTION_GUIDANCE: Record<InterventionType, ExecutionGuidance> = {
  content_led: { intervention_type: "content_led", ...EMPTY },
  commerce_led: { intervention_type: "commerce_led", ...EMPTY },
  platform_media_led: { intervention_type: "platform_media_led", ...EMPTY },
  creator_led: { intervention_type: "creator_led", ...EMPTY },

  commercial_pricing_led: {
    intervention_type: "commercial_pricing_led",
    status: "authored",
    role_framing:
      "{EO} leads this as the client's commercial partner: it frames the decision with the client, brings the test logic into the room, and holds the controls. ShiftImpact determines what the evidence supports. {EO} owns translating the reconciled result into the next activation with the client. It does not chase teams for updates.",
    coordinator_vs_partner: [
      { instead_of: "Chasing teams for confirmations", do: "Run the Readiness & Control Gate as a go / no-go the client signs" },
      { instead_of: "Passing along a pricing request", do: "Lead the decision-framing session and agree the question and tolerance before anything is scoped" },
      { instead_of: "Reporting that things happened", do: "Present delivery, held-constants and test-condition cleanliness as a readout the client can trust" },
      { instead_of: "Waiting to be told what is next", do: "Translate the reconciled result into the next activation with the client" },
    ],
    conversations: [
      {
        name: "1. Decision framing",
        supports: "commercial_activation_brief",
        when: "Before the test is scoped",
        who: "Commercial director, finance, commerce",
        purpose: "Agree the decision the test serves and what would make the client scale, hold or reshape.",
        ask: [
          "What would make you scale, hold or reshape the programme?",
          "What volume movement is acceptable, for what margin gain?",
          "What would you need to see to be comfortable acting on the result?",
        ],
        good_looks_like: "One written decision question and one written tolerance, agreed before any set is chosen.",
      },
      {
        name: "2. Test design",
        supports: "activation_architecture",
        when: "After the decision is framed",
        who: "Finance, commerce, affiliate lead",
        purpose: "Choose where and how the single variable is changed, with everything else held.",
        ask: [
          "Which products or regions can safely carry a reduced offer depth?",
          "Which similar set stays as it is, to compare against?",
          "Which depth are you willing to approve, and what must stay fixed?",
        ],
        good_looks_like: "One depth, one comparison set, one matched set and one fixed SKU list, each with a named client owner.",
      },
      {
        name: "3. Readiness & control gate",
        supports: "readiness_control_gate",
        when: "Before launch",
        who: "Every team that supplies an enabler",
        purpose: "Confirm the enablers and the held-constants, then verify the treatment is live on the comparison set only.",
        ask: [
          "Can each of you confirm in writing that your held-constants will stay as they are?",
          "Is the reduced offer live on the comparison set and nowhere else?",
          "Is anything planned that would change a held-constant while the test runs?",
        ],
        good_looks_like: "A signed checklist and deployment evidence on file. No launch until both exist.",
      },
      {
        name: "4. In-market check-in",
        supports: "in_market_stewardship",
        when: "Weekly while the test runs (short)",
        who: "Commerce, affiliate",
        purpose: "Keep the conditions clean and catch deviations the day they happen.",
        ask: [
          "Has anything changed on either group this week?",
          "Is there anything we could not hold?",
          "Is any new promotion or platform activity touching either group?",
        ],
        good_looks_like: "A deviation log with no surprises, and an escalation the same day when a condition moves.",
      },
      {
        name: "5. Readout & next move",
        supports: "activation_readout_next_move",
        when: "At the end of the test",
        who: "Commercial director, finance",
        purpose: "Present delivery and conditions, then work with the client to translate the reconciled result into the next activation.",
        ask: [
          "Here is what was delivered, what held, what moved, and whether the conditions were clean. Does the client agree?",
          "Given the reconciled result, what would the next activation be?",
          "What would you need to see before committing further?",
        ],
        good_looks_like: "The client trusts the conditions before the verdict lands, and leaves with a conditional next step.",
      },
    ],
    primer: [
      { term: "Promotional dependence", plain_language: "Volume that rises and falls with discount depth. Growth that is bought rather than earned." },
      { term: "Why one variable", plain_language: "If two things change, any movement could be either one, so the test settles nothing." },
      { term: "Matched comparison", plain_language: "A similar set of products or regions that does not change, so the difference between the sets can be read." },
      { term: "Guardrail", plain_language: "A limit the test must not breach, such as margin or repeat behaviour. A volume hold that costs margin is not a pass." },
      { term: "Held-constant", plain_language: "Something deliberately left alone on both groups, and checked, so it cannot explain the result." },
      { term: "Inconclusive", plain_language: "A valid outcome. It means the conditions were not clean enough to read, not that the test failed." },
    ],
    objections: [
      { client_says: "We cannot risk losing volume.", response: "The test is bounded to a small set, and the tolerance is agreed before launch. The wider programme carries on as it is." },
      { client_says: "The board wants scale now.", response: "Scaling into demand nobody has verified is the larger risk. The test is what makes a scale case defensible." },
      { client_says: "Can we refresh the content at the same time?", response: "Not in this test, because two changes cannot be separated. It is the natural next test if volume holds at the lower depth." },
      { client_says: "The affiliates will push back.", response: "Incentive terms and content approach stay as they are for the test. Brief them only on what the test requires." },
      { client_says: "Why not just cut discounts everywhere?", response: "We would lose the ability to tell what happened, and the risk would be business-wide instead of bounded." },
    ],
    decision_rights: {
      summary: [
        "ShiftImpact owns the decision logic and the reconciliation framework.",
        "{EO} owns activation leadership.",
        "The client owns final commercial decisions.",
      ],
      rows: [
        {
          decision: "Offer / discount depth",
          client: "Approves and is accountable",
          execution_owner: "Facilitates commercial options and trade-offs",
          shiftimpact: "Supplies the decision rule and guardrail logic",
        },
        {
          decision: "Margin thresholds and volume tolerance",
          client: "Sets and approves",
          execution_owner: "Facilitates the discussion; records the agreed tolerance",
          shiftimpact: "Frames them as measures with comparators",
        },
        {
          decision: "Comparison and matched sets, SKU set",
          client: "Confirms eligibility",
          execution_owner: "Sets up and documents",
          shiftimpact: "Specifies the matching logic",
        },
        {
          decision: "Held-constants",
          client: "Confirms from its own data",
          execution_owner: "Runs the control plan and deviation log",
          shiftimpact: "Defines what must be held",
        },
        {
          decision: "Verdict on the result",
          client: "Acts on it",
          execution_owner: "Reports the test conditions",
          shiftimpact: "Runs the reconciliation",
        },
        {
          decision: "Next commercial move",
          client: "Decides",
          execution_owner: "Translates the reconciled result into the next activation with the client",
          shiftimpact: "Supplies the reconciled evidence and next-decision logic",
        },
      ],
    },
    escalation_triggers: [
      "A held-constant moves on either group.",
      "A promotional, platform or seasonal event touches either group.",
      "Stock runs out on a set.",
      "The client asks to add a change while the test is running.",
      "Deployment evidence shows the reduced offer is live on the wrong set, or not live.",
      "Data return stops or arrives in a different form.",
    ],
    boundaries: [
      "{EO} may facilitate commercial options and trade-offs, but the client retains approval and accountability for pricing, discount depth, margin thresholds and financial decisions.",
      "This is test-design and facilitation guidance. It is not financial or pricing advice, and no outcome is guaranteed.",
      "No held-constant changes mid-test, including a small content or creator tweak. Those become the next decision.",
      "No causal verdict is stated or implied before the reconciliation has run.",
      "Indexed or aggregated figures supplied by the client only. No raw order-level data is requested.",
      "The test window and duration are agreed against the actual commercial calendar when a real pilot is scoped. They are not set in advance.",
    ],
  },
};

export function guidanceFor(t: InterventionType | null | undefined): ExecutionGuidance | null {
  if (!t) return null;
  const g = EXECUTION_GUIDANCE[t];
  return g.status === "authored" ? g : null;
}

/** Substitute the execution owner's name into authored text. */
export function withOwner(text: string, ownerLabel: string | null | undefined): string {
  return text.replaceAll("{EO}", ownerLabel?.trim() || "The execution owner");
}
