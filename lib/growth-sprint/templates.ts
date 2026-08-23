// lib/growth-sprint/templates.ts
// Static configuration only — NOT a database table, NOT an admin-editable
// system. These are examples and prompt guidance, never conclusions,
// never scoring rules, never industry logic. The diagnosis must work
// correctly even when business_context is null/custom.
//
// Used two ways:
//   1. As optional illustrative few-shot context inside the Call 1 prompt
//      (lib/growth-sprint/diagnose.ts), only when the operator has set
//      business_context — never forced.
//   2. As placeholder/example text in the operator workspace UI (step 4/5
//      inputs) to help an operator who isn't sure what to write.

import type { BusinessContext } from "./types";

export interface GrowthSprintTemplate {
  label: string;
  focus: string;
  example_revenue_pillars: string[];
  example_growth_moments: string[];
}

export const GROWTH_SPRINT_TEMPLATES: Record<
  Exclude<BusinessContext, "custom">,
  GrowthSprintTemplate
> = {
  commerce: {
    label: "Commerce Business",
    focus: "acquisition, repeat purchase, basket growth, loyalty",
    example_revenue_pillars: [
      "Core products",
      "Add-ons",
      "Membership",
      "Bundles",
      "Subscriptions",
    ],
    example_growth_moments: [
      "First-time buyer",
      "Replenishment cycle",
      "Category upgrade",
      "Gifting occasion",
      "Loyalty re-engagement",
    ],
  },
  experience: {
    label: "Experience Business",
    focus: "occasions, bookings, visits, upgrades",
    example_revenue_pillars: [
      "Admissions or bookings",
      "Events",
      "F&B",
      "Packages",
      "Add-ons",
    ],
    example_growth_moments: [
      "First-time visit",
      "Celebration occasion",
      "Repeat visit trigger",
      "Group or family booking",
      "Seasonal discovery",
    ],
  },
  service: {
    label: "Service Business",
    focus: "trust, conversion, retention, referrals",
    example_revenue_pillars: [
      "Initial consultation",
      "Core service",
      "Packages",
      "Follow-up",
      "Membership or plans",
    ],
    example_growth_moments: [
      "First inquiry",
      "Trust-building consultation",
      "Service completion follow-up",
      "Referral moment",
      "Renewal or plan upgrade",
    ],
  },
};

// Explicitly no entry for "custom" — a custom business gets zero seeded
// examples and the AI Call 1 prompt is instructed to derive everything
// from the operator's own free-text inputs only.
