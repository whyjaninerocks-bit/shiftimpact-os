// lib/window-synthesis.ts
// Single source of truth for pitch angle synthesis.
//
// Design rule: narratives must echo the evidence (what signals actually showed),
// then draw an inference (why that creates a conversation opportunity) — never
// assert conditions that weren't observed. "They announced a growth plan" is
// evidence. "It's planning season" is an unsupported assertion.
//
// Imported by:
//   app/(os)/prospects/digest/page.tsx
//   app/api/digest-summary/route.ts

export type SynthesisResult = {
  narrative: string;
  leadWindowType: string;
};

// Strip the signal category prefix ("Recognition: Award Win - X" → "Award Win - X")
// for use in evidence-grounded narratives.
function signalDetail(reason: string): string {
  const parts = reason.split(":");
  return (parts.length > 1 ? parts.slice(1).join(":").trim() : reason).trim();
}

export function synthesizePitchAngle(
  windowTypes: string[],    // sorted by WINDOW_PRIORITY, highest first
  leadLabel: string,        // human label for the top window
  triggerReasons: string[] = []  // actual signal reasons, same order as windowTypes
): SynthesisResult {
  const has = (t: string) => windowTypes.includes(t);
  const leadWindowType = windowTypes[0] ?? "";
  const n = windowTypes.length;

  // Pull the most specific signal details available for the narrative
  const leadEvidence  = triggerReasons[0] ? signalDetail(triggerReasons[0]) : null;
  const otherEvidence = triggerReasons.slice(1).map(signalDetail).filter(Boolean);

  // Helper: builds an evidence clause if we have signal detail
  const withEvidence = (base: string): string => {
    if (!leadEvidence) return base;
    return `${base} — signals show: ${leadEvidence}${otherEvidence.length ? ` alongside ${otherEvidence.join(" and ")}` : ""}.`;
  };

  // ── Strategic move combos ────────────────────────────────────────────────
  // strategic_move = MOU, signed partnership, market expansion, joint venture
  // The external narrative rarely keeps pace with strategic commitments.
  if (has("strategic_move") && has("leadership_change"))
    return { narrative: withEvidence("New leadership in the middle of a strategic announcement — two major signals running simultaneously. The external story needs to hold through both, and that's hard to manage without a clear narrative framework."), leadWindowType };
  if (has("strategic_move") && has("campaign_season"))
    return { narrative: withEvidence("Strategic commitment announced with campaigns active — two narratives competing for stakeholder attention. The risk is disconnect: what the campaigns say versus what the move signals. One conversation on alignment before the next briefing cycle is locked."), leadWindowType };
  if (has("strategic_move") && has("conference_calendar"))
    return { narrative: withEvidence("Strategic announcement with a public platform ahead — rare that both land together. Enter now before the conference messaging is finalised and the narrative is locked into the wrong frame."), leadWindowType };
  if (has("strategic_move") && has("fiscal_cycle"))
    return { narrative: withEvidence("Strategic commitment announced with a budget cycle active — how they allocate next should connect directly to the direction they've just announced publicly. That alignment rarely happens without intentional work."), leadWindowType };
  if (has("strategic_move") && has("product_launch"))
    return { narrative: withEvidence("Strategic partnership alongside a product push — two signals with separate momentum competing for the same stakeholder attention. The question is whether both are telling the same story."), leadWindowType };
  if (has("strategic_move") && has("funding_event"))
    return { narrative: withEvidence("Capital secured alongside a strategic commitment — the pace of execution is about to accelerate. Get in before the agency roster and communications priorities are set by whoever gets there first."), leadWindowType };
  if (has("strategic_move"))
    return {
      narrative: leadEvidence
        ? `${leadEvidence}. Strategic commitments like this typically outpace the external communications narrative — there's a brief window to help them shape the story before internal momentum locks the communications into reactive mode.`
        : "A strategic commitment is in play. The external story rarely keeps pace with moves like this — that gap is the conversation.",
      leadWindowType,
    };

  // ── Leadership combos ─────────────────────────────────────────────────────
  if (has("leadership_change") && has("funding_event"))
    return { narrative: withEvidence("New leadership in place with fresh capital confirmed — get in before they lock down the vendor roster and budget priorities"), leadWindowType };
  if (has("leadership_change") && has("rfp_cycle"))
    return { narrative: withEvidence("Leadership change has triggered a vendor review — the window to influence the brief is open, but it closes once the RFP goes out"), leadWindowType };
  if (has("leadership_change") && has("fiscal_cycle"))
    return { narrative: withEvidence("New leader entering an active budget cycle — they are making resource decisions now and haven't committed yet"), leadWindowType };
  if (has("leadership_change") && has("campaign_season"))
    return { narrative: withEvidence("New leader has inherited live campaigns — they need to know what is working before they change anything or sign off on the next round"), leadWindowType };
  if (has("leadership_change") && has("conference_calendar"))
    return { narrative: withEvidence("New leader with a public platform in market — enter on the event, not a cold pitch. They're visible and meeting people; this is the moment to be one of them"), leadWindowType };
  if (has("leadership_change") && has("product_launch"))
    return { narrative: withEvidence("Leadership change coinciding with a product push — they need early read on whether the launch is landing before committing the next phase of spend"), leadWindowType };

  // ── Funding combos ────────────────────────────────────────────────────────
  if (has("funding_event") && has("rfp_cycle"))
    return { narrative: withEvidence("Capital secured and a vendor review is open — they have the budget and a live decision to make; lead with what the intelligence layer delivers, not what it costs"), leadWindowType };
  if (has("funding_event") && has("campaign_season"))
    return { narrative: withEvidence("Investment confirmed with campaigns running — the question they need answered is whether the spend is working; lead with attribution clarity"), leadWindowType };
  if (has("funding_event") && has("fiscal_cycle"))
    return { narrative: withEvidence("Funding secured with a budget cycle underway — they are actively allocating; position Growth Intelligence as the decision layer, not an add-on"), leadWindowType };
  if (has("funding_event") && has("product_launch"))
    return { narrative: withEvidence("Capital in with a product just launched — they are spending and watching. Lead with early signal read on whether the launch is tracking"), leadWindowType };

  // ── RFP combos ────────────────────────────────────────────────────────────
  if (has("rfp_cycle") && has("fiscal_cycle"))
    return { narrative: withEvidence("A vendor review is running inside an active budget cycle — do not position as another vendor to evaluate; enter as the intelligence layer that makes their brief sharper"), leadWindowType };
  if (has("rfp_cycle") && has("campaign_season"))
    return { narrative: withEvidence("Agency review with live campaigns in market — their own campaign data is your proof of concept; show what better intelligence looks like on results they already own"), leadWindowType };

  // ── Conference combos — checked before campaign+fiscal so recognition takes precedence ──
  if (has("conference_calendar") && has("campaign_season") && has("fiscal_cycle"))
    return { narrative: leadEvidence
      ? `${leadEvidence} puts them in public momentum — campaigns are live and budget decisions are active. Lead on the event presence, ground the conversation in what the campaign data is showing against their stated direction.`
      : "Active event presence with live campaigns and budget signals converging — lead on the visibility moment, show what the intelligence layer reveals about campaign performance, then connect it to where they say they are going.", leadWindowType };
  if (has("conference_calendar") && has("campaign_season"))
    return { narrative: withEvidence("Active event presence with campaigns live — lead with the story behind the numbers; the conference platform opens the door, campaign intelligence is the room"), leadWindowType };
  if (has("conference_calendar") && has("fiscal_cycle"))
    return { narrative: withEvidence("Visible in market alongside active budget decisions — enter with data that makes their event investment defensible, before the next budget allocation is locked"), leadWindowType };
  if (has("conference_calendar") && has("product_launch"))
    return { narrative: withEvidence("Event platform with a product launch confirmed — they are visible and moving simultaneously; enter with the intelligence that connects the launch performance to the story they're telling at the event"), leadWindowType };

  // ── Campaign + planning ───────────────────────────────────────────────────
  if (has("campaign_season") && has("fiscal_cycle"))
    return { narrative: withEvidence("Campaigns active with confirmed budget cycle signals — this campaign's performance data is the most credible input into whatever spending decision comes next"), leadWindowType };
  if (has("campaign_season") && has("product_launch"))
    return { narrative: withEvidence("New product launched with campaigns running — one conversation on what the full signal picture is telling them about the launch performance"), leadWindowType };

  // ── Remaining ─────────────────────────────────────────────────────────────
  if (has("fiscal_cycle") && has("product_launch"))
    return { narrative: withEvidence("Budget decisions active with a product just in market — the launch data is the most current input they have; that is the intelligence conversation"), leadWindowType };

  // ── 3+ unmatched ─────────────────────────────────────────────────────────
  if (n >= 3)
    return {
      narrative: leadEvidence
        ? `${n} signals converging — lead with ${leadLabel.toLowerCase()} (${leadEvidence}). The other signals are context for the room, not the opening.`
        : `${n} signals converging. Lead with ${leadLabel.toLowerCase()} only — the others are supporting context for once you are in the conversation, not before.`,
      leadWindowType,
    };

  // ── Single window ─────────────────────────────────────────────────────────
  return {
    narrative: leadEvidence
      ? `Signal: ${leadEvidence}. One clear entry point — lead with this, open the conversation, and let them surface the rest.`
      : "One clear signal. Lead with this, open the conversation, and let them surface the rest.",
    leadWindowType,
  };
}
