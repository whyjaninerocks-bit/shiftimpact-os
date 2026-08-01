// lib/window-synthesis.ts
// Single source of truth for pitch angle synthesis.
// Given sorted window types (highest-priority first) for ONE company,
// returns a single entry-point and a narrative connecting all open windows —
// so the pitch is one story, not a menu of services.
//
// Imported by:
//   app/(os)/prospects/digest/page.tsx
//   app/api/digest-summary/route.ts

export type SynthesisResult = {
  narrative: string;
  leadWindowType: string;
};

export function synthesizePitchAngle(
  windowTypes: string[],   // sorted by WINDOW_PRIORITY, highest first
  leadLabel: string        // human label for the top window
): SynthesisResult {
  const has = (t: string) => windowTypes.includes(t);
  const leadWindowType = windowTypes[0] ?? "";
  const n = windowTypes.length;

  // ── Leadership combos (highest conversion — always check first) ───────────
  if (has("leadership_change") && has("funding_event"))
    return { narrative: "New leadership with fresh capital — audit their strategy before they lock in the roadmap. One conversation that covers both doors.", leadWindowType };
  if (has("leadership_change") && has("rfp_cycle"))
    return { narrative: "Incoming leader triggering an agency review — get in before the brief is written, not after it is awarded.", leadWindowType };
  if (has("leadership_change") && has("fiscal_cycle"))
    return { narrative: "Leadership transition entering planning season — shape the new brief before anyone else is in the room.", leadWindowType };
  if (has("leadership_change") && has("campaign_season"))
    return { narrative: "New leader inheriting active campaigns — show them what is really performing before they make changes.", leadWindowType };
  if (has("leadership_change") && has("conference_calendar"))
    return { narrative: "New leader riding a recognition moment — enter on the win, not the pitch. Make the intelligence the trophy.", leadWindowType };
  if (has("leadership_change") && has("product_launch"))
    return { narrative: "Leadership change coinciding with a product push — they need to know if the launch is landing before they commit the next round of spend.", leadWindowType };

  // ── Funding combos ────────────────────────────────────────────────────────
  if (has("funding_event") && has("rfp_cycle"))
    return { narrative: "Capital secured, vendor review open — they have budget and a decision to make. Lead with ROI clarity, not a capabilities deck.", leadWindowType };
  if (has("funding_event") && has("campaign_season"))
    return { narrative: "Investment secured with campaigns running — lead with attribution: show exactly what their capital is doing right now.", leadWindowType };
  if (has("funding_event") && has("fiscal_cycle"))
    return { narrative: "Fresh funding entering annual planning — position Growth Intelligence as the foundation for how they deploy capital next year.", leadWindowType };
  if (has("funding_event") && has("product_launch"))
    return { narrative: "Funded company launching a product — they are spending. The question is whether they know it is working.", leadWindowType };

  // ── RFP combos ────────────────────────────────────────────────────────────
  if (has("rfp_cycle") && has("fiscal_cycle"))
    return { narrative: "Budget season coinciding with agency review — do not compete as a vendor. Enter as the intelligence layer for the incoming brief.", leadWindowType };
  if (has("rfp_cycle") && has("campaign_season"))
    return { narrative: "Agency review with live campaigns — the campaigns are your proof of concept. Show them what better intelligence looks like on their own data.", leadWindowType };

  // ── Conference combos — check before campaign+fiscal so recognition moment takes precedence ──
  if (has("conference_calendar") && has("campaign_season") && has("fiscal_cycle"))
    return { narrative: "Award momentum with active campaigns heading into planning season — lead on the recognition win, then show them the intelligence that made the campaign work. One meeting, one story.", leadWindowType };
  if (has("conference_calendar") && has("campaign_season"))
    return { narrative: "Award/event momentum with live campaigns — lead with the story behind the numbers. Recognition opens the door, intelligence is the room.", leadWindowType };
  if (has("conference_calendar") && has("fiscal_cycle"))
    return { narrative: "Recognition moment entering planning season — they are visible and budgeting. Enter with the data story before the next brief is written.", leadWindowType };
  if (has("conference_calendar") && has("product_launch"))
    return { narrative: "Award momentum with a product launch — they are visible and moving. Enter with the numbers that explain the recognition.", leadWindowType };

  // ── Campaign + planning combos ────────────────────────────────────────────
  if (has("campaign_season") && has("fiscal_cycle"))
    return { narrative: "Active campaign overlapping with planning — this campaign's data is the anchor for next year's strategy conversation.", leadWindowType };
  if (has("campaign_season") && has("product_launch"))
    return { narrative: "New product in market with campaigns active — one conversation on the full-cycle intelligence behind the launch.", leadWindowType };

  // ── Remaining combos ──────────────────────────────────────────────────────
  if (has("fiscal_cycle") && has("product_launch"))
    return { narrative: "Planning season with a product push underway — the launch data is the best argument for building the intelligence layer before next year's plan is locked.", leadWindowType };

  // ── 3+ windows that did not match a specific combo ───────────────────────
  if (n >= 3)
    return {
      narrative: `${n} signals converging on one company. Lead with the ${leadLabel.toLowerCase()} signal only — the others are supporting context you deploy in the room once you are in, not before.`,
      leadWindowType,
    };

  // ── Single window ─────────────────────────────────────────────────────────
  return {
    narrative: "One clear signal. Lead with this, open the conversation, and let them surface the rest.",
    leadWindowType,
  };
}
