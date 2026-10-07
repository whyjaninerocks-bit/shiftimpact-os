// lib/growth-decision/intervention-types.ts
// The execution package CHANGES with the type of intervention. A pricing test must not be
// forced into a content template. Every type answers the same two questions:
//   1. What does the agency actually do?            → five client-facing deliverables
//   2. What must the client / platform enable?      → required enablers (kept separate)
//
// Only `commercial_pricing_led` is fully authored (Growth Driver). The other four types are
// stubs: they are declared so the framework is reusable, but they carry no deliverable or
// guidance library yet.

export const INTERVENTION_TYPES = [
  "content_led",
  "commercial_pricing_led",
  "commerce_led",
  "platform_media_led",
  "creator_led",
] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

/** The five client-facing agency deliverables. Same five for every type; the TASKS under them differ. */
export const AGENCY_DELIVERABLE_KEYS = [
  "commercial_activation_brief",
  "activation_architecture",
  "readiness_control_gate",
  "in_market_stewardship",
  "activation_readout_next_move",
] as const;
export type AgencyDeliverableKey = (typeof AGENCY_DELIVERABLE_KEYS)[number];

export const AGENCY_DELIVERABLE_NAMES: Record<AgencyDeliverableKey, string> = {
  commercial_activation_brief: "Commercial Activation Brief",
  activation_architecture: "Activation Architecture",
  readiness_control_gate: "Readiness & Control Gate",
  in_market_stewardship: "In-Market Stewardship",
  activation_readout_next_move: "Activation Readout & Next Move",
};

export type AgencyDeliverable = {
  key: AgencyDeliverableKey;
  /** What the client receives / sees this deliverable do. One or two sentences. */
  purpose: string;
  /** The detailed operational activities underneath. Execution tasks, not the headline proposition. */
  tasks: string[];
  /** Observable completion test. */
  done_when: string;
};

export type ClientPlatformEnabler = {
  enabler: string;
  owner: string;
  /** What this makes valid. */
  makes_valid: string;
  /** What happens if it is not in place. */
  if_missing: string;
};

export type InterventionTypeDef = {
  type: InterventionType;
  label: string;
  description: string;
  /** "authored" = deliverables + enablers + guidance exist; "stub" = declared only. */
  status: "authored" | "stub";
  /**
   * Which content-specific Stage 2 sections apply. A pricing test changes no content, proof, creator
   * or asset, so those sections are not rendered for it (they are held constant, listed under
   * preservation constraints).
   */
  applies: { content_roles: boolean; proof_required: boolean; creator_role: boolean; asset_architecture: boolean };
  deliverables: AgencyDeliverable[];
  enablers: ClientPlatformEnabler[];
};

const STUB_APPLIES = { content_roles: false, proof_required: false, creator_role: false, asset_architecture: false };

export const INTERVENTION_TYPE_DEFS: Record<InterventionType, InterventionTypeDef> = {
  content_led: {
    type: "content_led",
    label: "Content-led",
    description: "The intervention is what the content shows and proves (roles, proof, asset architecture, creator role).",
    status: "stub",
    applies: { content_roles: true, proof_required: true, creator_role: true, asset_architecture: true },
    deliverables: [],
    enablers: [],
  },
  commercial_pricing_led: {
    type: "commercial_pricing_led",
    label: "Commercial / pricing-led",
    description:
      "The controlled variable is a commercial lever (offer or discount depth) held by the client. The agency owns the activation architecture around it.",
    status: "authored",
    applies: { content_roles: false, proof_required: false, creator_role: false, asset_architecture: false },
    deliverables: [
      {
        key: "commercial_activation_brief",
        purpose:
          "The agreed brief for the commercial test: the decision it serves, the single variable, what is held constant, and what each team applies. Co-authored with the client; the depth and thresholds are the client's.",
        tasks: [
          "Activation plan: sequence, owners, dates and dependencies, with the test window to be agreed against the actual commercial calendar",
          "Offer-depth implementation brief: exactly what each team applies, where, from when, to which set (depth value supplied by the client)",
          "Record the agreed decision question and tolerance before launch",
        ],
        done_when: "The client has agreed the brief in writing, including the decision question and tolerance.",
      },
      {
        key: "activation_architecture",
        purpose:
          "How the test is set up and rolled out across commerce, affiliate, media and platform teams so that treatment and comparison are clean.",
        tasks: [
          "Treatment vs comparison setup: comparison set and matched set defined, eligibility rules and SKU / region lists locked",
          "Channel and affiliate rollout sequencing, so both groups switch cleanly",
          "Coordination model across commerce, affiliate, media and platform teams, with a named contact in each",
        ],
        done_when: "Both groups, the rollout order and every team's contact are documented and agreed.",
      },
      {
        key: "readiness_control_gate",
        purpose:
          "A go / no-go gate. Nothing launches until each held-constant is confirmed and the treatment is verified live on the comparison set only.",
        tasks: [
          "Execution checklist: pre-launch, in-flight and close-out",
          "Held-constant control plan: who confirms each item, how, and how often",
          "Deployment confirmation: evidence the reduced offer is live on the comparison set and nowhere else before the read starts",
        ],
        done_when: "Every enabler is confirmed in writing and deployment evidence is on file.",
      },
      {
        key: "in_market_stewardship",
        purpose:
          "Running the test cleanly in market: tracking what is delivered and held, and escalating the moment a condition moves.",
        tasks: [
          "Weekly activation status: deployed, held, deviated",
          "Deviation log: every change to a held-constant item or promotional mechanic, with date, group and affected SKUs",
          "Execution QA: routing, tagging, listing-state and offer-display checks on both groups",
        ],
        done_when: "Weekly status issued each week and every deviation logged and escalated.",
      },
      {
        key: "activation_readout_next_move",
        purpose:
          "What was delivered, what held, and whether the conditions were clean, then the next activation, conditional on the reconciled result. It does not give the causal verdict.",
        tasks: [
          "End-of-test activation readout: delivery, held-constants, deviations, test-condition cleanliness",
          "Next activation recommendation, conditional on the reconciled result (not pre-decided)",
          "Hand the conditions record to ShiftImpact for reconciliation",
        ],
        done_when: "The readout is delivered and the conditions record has been handed to reconciliation.",
      },
    ],
    enablers: [
      { enabler: "Pricing / discount approval (the single reduced depth)", owner: "Client finance and commerce", makes_valid: "The one controlled variable exists and is accountable to the client.", if_missing: "Test cannot launch." },
      { enabler: "SKU eligibility and a fixed SKU set", owner: "Client commerce", makes_valid: "Comparison and matched groups are defined and stable.", if_missing: "Groups cannot be defined." },
      { enabler: "Stock availability on both groups", owner: "Client commerce / supply", makes_valid: "Volume reflects demand, not supply.", if_missing: "Affected SKUs excluded; result may be inconclusive." },
      { enabler: "Price-list stability", owner: "Client commerce", makes_valid: "Offer depth is not confounded with a list-price change.", if_missing: "Result inconclusive." },
      { enabler: "Affiliate budget approval, held at current level", owner: "Client commerce", makes_valid: "Budget is not a second variable.", if_missing: "Budget change contaminates the read." },
      { enabler: "Marketplace configuration (applying the offer-depth change)", owner: "Client / platform", makes_valid: "The treatment is actually delivered.", if_missing: "No deployment, so no test." },
      { enabler: "Platform permissions and access to listings and tracking", owner: "Platform", makes_valid: "Deployment confirmation and execution QA can be done.", if_missing: "Treatment delivery cannot be verified." },
      { enabler: "Data return (volume, margin, discount intensity, repeat, promotion log)", owner: "Client finance, commerce and CRM", makes_valid: "Reconciliation can run on client-supplied figures.", if_missing: "No reconciliation, so no verdict." },
      { enabler: "Commercial calendar constraints", owner: "Client commerce", makes_valid: "The window can be agreed clear of events that would confound the read.", if_missing: "Window cannot be set." },
    ],
  },
  commerce_led: {
    type: "commerce_led",
    label: "Commerce-led",
    description: "The intervention is the listing, handoff or product-data experience at the point of purchase.",
    status: "stub",
    applies: { ...STUB_APPLIES, proof_required: true },
    deliverables: [],
    enablers: [],
  },
  platform_media_led: {
    type: "platform_media_led",
    label: "Platform / media-led",
    description: "The intervention is where, when and how weight is deployed across platforms and media.",
    status: "stub",
    applies: STUB_APPLIES,
    deliverables: [],
    enablers: [],
  },
  creator_led: {
    type: "creator_led",
    label: "Creator-led",
    description: "The intervention is the creator role, selection and briefing.",
    status: "stub",
    applies: { ...STUB_APPLIES, creator_role: true },
    deliverables: [],
    enablers: [],
  },
};

/** Rows with no intervention_type (drafted before this layer) behave as content-led. */
export function typeOf(t: InterventionType | null | undefined): InterventionTypeDef {
  return INTERVENTION_TYPE_DEFS[t ?? "content_led"];
}
