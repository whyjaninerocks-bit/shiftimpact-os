// lib/aoai-scope.ts
// Maps each opportunity window type to the specific AOAI Acquisition OS™ scope.
//
// AOAI = AcquisitionOS™ (DriveFunnels). A digital acquisition & analytics consultancy
// that builds 6-pillar lead operating systems to attract, capture, nurture, convert,
// and retain high-value leads on autopilot.
//
// The 6 pillars:
//   P00 STRATEGISE — ICP research, psychographic personas, competitive positioning,
//                    master messaging doc, 90-day activation roadmap
//   P01 ATTRACT    — Content engine (SEO, LinkedIn, video), paid ads (Meta, Google,
//                    LinkedIn, YouTube, GDN), social proof, landing pages (ROAS 3x+)
//   P02 CAPTURE    — Lead magnets, CRM + lead scoring + tagging, AI chatbot
//                    (24/7 qualifier, <5 min response, WhatsApp/DM)
//   P03 NURTURE    — Behaviour-triggered email flows, multi-channel retargeting
//                    (email, SMS, WhatsApp, social), personalisation by segment
//   P04 CONVERT    — Sales framework, automated booking, proposal optimisation,
//                    objection handling playbooks (close rate +20–40%)
//   P05 RETAIN     — Client success onboarding, referral programme, upsell/cross-sell
//                    triggers, live ROI dashboard (LTV 2–3x in 12 months)
//
// Imported by:
//   app/(os)/prospects/digest/page.tsx

export type AOAIScopeResult = {
  pillars: string[];          // e.g. ["P00 STRATEGISE", "P01 ATTRACT"]
  aoaiExecutes: string;       // what AOAI specifically delivers for this window
  janinePrepAOAI: string;     // what Janine needs to brief AOAI before the conversation
};

export function getAOAIScope(windowType: string): AOAIScopeResult | null {
  switch (windowType) {

    case "leadership_change":
      return {
        pillars: ["P00 STRATEGISE", "P01 ATTRACT"],
        aoaiExecutes:
          "Strategy Blueprint delivered in 2 weeks — fresh ICP research, psychographic personas, competitive positioning, and a 90-day acquisition roadmap for the incoming leader before any ad spend is committed.",
        janinePrepAOAI:
          "Their current digital acquisition channels and monthly spend. What wasn't working under the previous leader. The new leader's stated growth priorities or 100-day agenda.",
      };

    case "funding_event":
      return {
        pillars: ["P01 ATTRACT", "P02 CAPTURE"],
        aoaiExecutes:
          "Paid traffic infrastructure (Meta, Google, LinkedIn) targeting their ICP plus a full lead capture system — CRM, lead scoring, AI chatbot — built to convert fresh capital into a qualified pipeline from month one.",
        janinePrepAOAI:
          "Growth target and timeline. Current acquisition channels and monthly budget. Their existing CPL if known. Whether they have a CRM or are starting from scratch.",
      };

    case "rfp_cycle":
      return {
        pillars: ["P00 STRATEGISE"],
        aoaiExecutes:
          "Entry via P00 Strategy Blueprint to influence the RFP criteria before it's finalised — positions AOAI as the connected acquisition system rather than a point solution being evaluated alongside others.",
        janinePrepAOAI:
          "What the RFP covers (digital only, full marketing, or specific channels). Who the incumbent is and what triggered the review. Whether the brief is already written or still open.",
      };

    case "renewal_season":
      return {
        pillars: ["P02 CAPTURE", "P03 NURTURE"],
        aoaiExecutes:
          "Replaces the expiring vendor with a connected system — CRM + lead scoring + AI chatbot for capture, and behaviour-triggered email/WhatsApp flows for nurture — solving what point solutions typically leave broken.",
        janinePrepAOAI:
          "Which contract or vendor is up for renewal and what it covers. What the client says isn't working with the current setup. Monthly spend on the outgoing contract.",
      };

    case "conference_calendar":
      return {
        pillars: ["P02 CAPTURE"],
        aoaiExecutes:
          "Lead capture infrastructure built around the recognition moment — high-conversion landing pages, lead magnets, and a 24/7 WhatsApp AI chatbot to convert event visibility into a qualified pipeline before the news cycle moves on.",
        janinePrepAOAI:
          "Whether they are exhibiting, speaking, or just winning. Their current follow-up system for event enquiries. How much inbound the award or event typically generates and what happens to those leads today.",
      };

    case "campaign_season":
      return {
        pillars: ["P01 ATTRACT", "P02 CAPTURE"],
        aoaiExecutes:
          "Campaign performance diagnosis and optimisation — paid ad ROAS and CPL analysis across Meta, Google, and LinkedIn; funnel audit to find where leads leak; CRM and lead scoring to ensure nothing is wasted.",
        janinePrepAOAI:
          "Current channel mix and monthly ad spend. Their CPL benchmark and target ROAS. Where leads are dropping off — landing page, response time, CRM, or follow-up — and what their close rate looks like today.",
      };

    case "product_launch":
      return {
        pillars: ["P00 STRATEGISE", "P01 ATTRACT", "P02 CAPTURE"],
        aoaiExecutes:
          "Full launch stack — P00 ICP research and proposition experiment design before spend is committed, P01 paid traffic (Meta, Google) to validate and scale, P02 AI chatbot and CRM to capture intent and qualify leads at launch volume.",
        janinePrepAOAI:
          "New product brief and target audience hypothesis. Whether product-market fit is proven or still being validated. Launch budget and timeline. What success looks like in the first 90 days.",
      };

    case "fiscal_cycle":
      return {
        pillars: ["P00 STRATEGISE"],
        aoaiExecutes:
          "Strategy Blueprint delivered in 2 weeks — before they lock next year's acquisition budget. Maps ICP, channel priorities, and a 90-day activation roadmap so the budget decision is grounded in a real plan rather than guesswork.",
        janinePrepAOAI:
          "Current digital acquisition budget range and what they got for it last year. Growth targets they need the budget to support. Which channels they're already running and what's performing versus what they're unsure about.",
      };

    default:
      return null;
  }
}
