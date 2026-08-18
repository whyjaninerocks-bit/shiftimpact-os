"use client";

// /portal/demo — Cooks · Jadikan Caramu
// v6: floating AI assistant widget, no inline IP-revealing rationale, improved font contrast

import { useState, useRef, useEffect } from "react";

// ─── AI assistant — semantic topic engine ─────────────────────────────────────
//
// Architecture: Topic clusters, not keyword lists.
// Best practices applied:
//   1. Context stripping  — remove filler/frame words before matching, so "what does X mean
//      in the compliance report" matches X, not "compliance report"
//   2. Length-weighted scoring — longer trigger phrase = more specific = higher confidence
//   3. Conversation memory — boost topics that match the previous turn
//   4. Answer-first responses — open with the direct answer, not a system description
//   5. Graceful clarification — below confidence threshold, ask rather than guess

// Phrases that frame HOW a question is asked, not WHAT it is asking about.
// Strip these before topic matching so they don't bias scores.
const CONTEXT_PHRASES = [
  "explain what this means in the compliance report",
  "explain what this means in",
  "explain what this means",
  "explain what is this",
  "what does this mean in",
  "what does this mean",
  "what does it mean",
  "what is the meaning of",
  "what is meant by",
  "can you explain",
  "help me understand",
  "tell me about",
  "tell me what",
  "in the compliance report",
  "in this report",
  "in the report",
  "compliance report",
  "this report",
  "the report",
  "what does",
  "what is",
  "what are",
  "how does",
  "why does",
  "what was",
  "explain",
  "elaborate",
  "describe",
  "clarify",
];

// Topic clusters. Each topic has:
//   triggers: all phrasings users might use to refer to this topic, longest first
//             (longer phrase = more specific = higher confidence score)
//   answer: leads with the direct answer, not a system description
type Topic = { id: string; triggers: string[]; answer: string };

const TOPICS: Topic[] = [
  {
    id: "framing",
    triggers: [
      "your version of the dish", "your version of dish", "brand shortcut positioning",
      "personal ownership frame", "not brand shortcut", "shortcut positioning",
      "shortcut messaging", "your version", "personal ownership", "dish framing",
      "this is my version", "creator story", "creator owns", "framing check",
      "not shortcut", "brand shortcut", "framing", "frame",
    ],
    answer: "It checks whether the KOL content told the story from the creator's perspective, not the brand's. 'Your version of the dish' means the creator cooked it their own way and Cooks paste was part of their process — not a product ad where the brand is the hero.\n\nIn practice: personal ownership sounds like \"this is how I make rendang, I always use Cooks paste for the base.\" Brand shortcut sounds like \"Cooks paste gives you authentic rendang in 20 minutes.\" The first saves. The second doesn't.\n\nPersonal ownership framing produces 2.3× higher save rates than shortcut messaging in recipe content. When you watch the posted content, ask: does the creator own the cooking story, or does the product?",
  },
  {
    id: "dashed-line",
    triggers: [
      "dashed line on the chart", "dotted line on the chart", "what does the line represent",
      "dashed line", "dotted line", "threshold line", "what is the line", "the line mean",
      "line on the chart", "line on the graph", "dashed", "dotted",
    ],
    answer: "The dashed line is the gate threshold — the minimum each signal must reach and hold before Phase 2 budget releases. It is not a target; it is a gate.\n\nOn save rate: ≥8% (you are at 6.1% — 1.9pp away). On brand search share: ≥18% (you are at 14.2%). On UGC authenticity: ≥65% (you are above it at 72%). The save rate gate is the one that matters most right now — it is the primary gate condition for Phase 2.",
  },
  {
    id: "health-score",
    triggers: [
      "health score calculated", "health score derived", "score of 74", "score 74",
      "how is health", "health score", "campaign health score", "composite score",
      "what is 74", "score mean",
    ],
    answer: "74 is a composite of how all live signals are tracking toward their gate thresholds, weighted by how close each is to firing. Save rate carries the heaviest weight because it is the primary gate condition.\n\nAt Week 6, 74 reflects five consecutive weeks of improvement from a launch baseline of 52. A score in the 70s at the midpoint of Phase 1 is on track — it means the campaign is compounding, not plateauing.",
  },
  {
    id: "gate",
    triggers: [
      "phase 2 budget release", "gate not yet fired", "why hasn't gate fired",
      "gate fire", "gate fires", "when will gate", "gate threshold", "gate condition",
      "unlock phase 2", "budget release", "phase 2 unlock", "gate 1",
      "phase 2", "gate",
    ],
    answer: "Gate 1 requires save rate ≥8% held for 3 consecutive days — you are at 6.1%, which is 1.9pp away. The 3-day hold rule prevents a single viral post from releasing Phase 2 budget before the audience shift is real.\n\nAt +0.4pp growth per week without the creative brief, gate fires around Week 10–11. If the recipe-led brief is actioned this week, growth should accelerate to +0.6–0.8pp — gate in Week 7–8 is realistic. The Merdeka window this week creates additional tailwind for recipe content.",
  },
  {
    id: "save-rate",
    triggers: [
      "save rate at 6.1", "save rate is 6", "why is save rate", "content save rate",
      "what is save rate", "save rate mean", "bookmarks", "saves mean", "save rate",
      "6.1%", "saves",
    ],
    answer: "Save rate is the percentage of people who see a piece of content and bookmark it for later. In the cooking category, saves are the strongest forward indicator of purchase intent — people save recipes they plan to cook, not recipes they have already made.\n\nYour save rate is 6.1% and has grown every week since launch. The issue is the creative mix — 60% lifestyle content, which saves at 1 base rate, vs 40% recipe content, which saves at 2.3× that rate. Shifting to 70% recipe content this week is the most direct lever to move save rate toward the 8% gate.",
  },
  {
    id: "ics",
    triggers: [
      "idea certainty score", "what does conditional mean", "ics score", "ics 76",
      "why conditional", "idea quality", "campaign idea quality", "ics",
      "conditional rating", "conditional",
    ],
    answer: "CONDITIONAL means the campaign idea — Jadikan Caramu — is structurally sound and above the category average of 67, but one dimension is flagged: executional consistency. The idea is not being expressed consistently enough across formats and channels.\n\nThis is a tactical problem, not a strategic one. The brief this week addresses it directly — tightening the mix to recipe-led content gives the idea a clearer, more consistent expression across every channel it runs on.",
  },
  {
    id: "competitors",
    triggers: [
      "maggi vs cooks", "how do we compare", "competitor benchmark", "knorr benchmark",
      "adabi score", "maggi score", "maggi ics", "benchmark comparison",
      "maggi", "knorr", "adabi", "competitor", "benchmark",
    ],
    answer: "Your ICS of 76 puts Cooks second in the category: MAGGI (81), Cooks (76), Knorr (74), Adabi (59). The gap to MAGGI is not budget or idea quality — it is executional consistency. MAGGI runs the same idea coherently across every format. Cooks is running two different ideas depending on the format (recipe vs lifestyle).\n\nTightening to a recipe-led mix this week closes that gap — by Week 8, the consistency score should pull the ICS to 79–81 range.",
  },
  {
    id: "brand-posture",
    triggers: [
      "what does gaining mean", "posture gaining", "brand posture gaining",
      "why gaining", "gaining posture", "fragile to gaining", "posture change",
      "brand posture", "posture", "gaining",
    ],
    answer: "Gaining means every tracked signal improved week-on-week and none deteriorated. This campaign went Fragile (Weeks 1–2) → Plateauing (Weeks 3–4) → Gaining (Weeks 5–6).\n\nTwo consecutive Gaining weeks at the midpoint of Phase 1 is the correct trajectory — it confirms the campaign is compounding. The risk that would flip posture back to Plateauing is a save rate stall on Meta lifestyle content, which is why the brief to shift the mix is timed now.",
  },
  {
    id: "kol",
    triggers: [
      "micro kol vs mid tier", "kol performance", "why micro kol", "kol budget",
      "influencer performance", "creator performance", "kol save rate",
      "masakdenganaishah", "eatwithzafran", "kol programme", "influencer",
      "micro kol", "mid tier", "kol",
    ],
    answer: "KOL performance is measured on save rate only — not reach or follower count — because saves are the only KOL metric that directly moves the gate signal.\n\nYour three micro-KOLs average 7.4% save rate with 38% of the KOL budget. Your two mid-tier KOLs average 5.4% — below gate threshold — with 62% of the budget. The Phase 2 recommendation: do not renew mid-tier contracts. Concentrate all KOL budget on micro-tier performers and recruit two new Klang Valley food creators to the same profile.",
  },
  {
    id: "creative-battery",
    triggers: [
      "creative battery at 24", "meta feed battery", "creative runway", "content fatigue",
      "how many weeks remaining", "creative endurance", "battery mean", "battery low",
      "creative battery", "battery", "fatigue", "runway",
    ],
    answer: "Creative Battery measures how many more weeks a specific format can sustain its performance before engagement drops. It is about format fatigue, not idea quality — the Jadikan Caramu idea is intact.\n\nMeta Feed lifestyle content is at 24% — roughly 2 weeks before diminishing returns set in. TikTok recipe formats are at 82% — no fatigue risk. The aggregate is 46% (~3 weeks). Actioning the recipe-led brief this week extends the Meta battery by 4–6 weeks and prevents a mid-campaign dip ahead of Merdeka.",
  },
  {
    id: "ugc",
    triggers: [
      "ugc authenticity ratio", "authenticity ratio", "user generated content",
      "organic posts", "72% authenticity", "ugc signal", "ugc above threshold",
      "community content", "seeded content", "organic content",
      "ugc", "authenticity",
    ],
    answer: "UGC Signal tracks content posted by real consumers who cooked with Cooks — not paid KOLs. The Authenticity Ratio (72%) measures how much of the brand-tagged content is genuine vs paid.\n\nYou crossed the 65% gate threshold at Week 5 and are holding above it. 28 organic posts were tagged this week, up from 19 at Week 4. A rising authenticity ratio is a leading indicator that the brand is building real cultural presence — it also makes your paid KOL content more credible because audiences see the brand in organic contexts too.",
  },
  {
    id: "grabads",
    triggers: [
      "grabads purchase attribution", "grab purchase", "grabmart", "grabfood ads",
      "what is grab", "grab super app", "purchase attribution", "grabads signal",
      "grab ads", "grabads", "grab signal",
    ],
    answer: "Grab is the super-app Malaysians use daily — rides, GrabFood, GrabPay. Because Grab sees actual purchase transactions, GrabAds closes the loop between a TikTok recipe save and a physical Cooks paste purchase from GrabMart or a nearby store.\n\nIt is one of the only platforms in Malaysia that connects social activity to real buying behaviour. For this campaign, it answers the question keyword matching cannot: did someone who saved a Cooks recipe actually buy the product? This signal is in preview — it activates when your GrabAds account is connected.",
  },
  {
    id: "prediction",
    triggers: [
      "prediction accuracy record", "locked predictions", "verified predictions",
      "how accurate are predictions", "prediction track record", "5 of 5",
      "100% accuracy", "prior predictions", "prediction verified",
      "prediction accuracy", "predictions", "forecast",
    ],
    answer: "Every report has two prediction layers. This week's predictions are locked and timestamped at publication — they cannot be edited after delivery. Prior predictions are verified against actuals in the following week's report.\n\nAt Week 6, all five predictions from Weeks 1–5 have been verified within the stated range — 100% accuracy for this campaign so far. The locked predictions for this week are in the Full Intelligence Suite section. This closed loop — predict, lock, verify, publish — is the accountability structure that distinguishes this system from a standard reporting dashboard.",
  },
  {
    id: "read-receipt",
    triggers: [
      "delivery acknowledgement record", "who acknowledged", "did they read",
      "read receipt mean", "read timestamp", "acknowledgement status",
      "priya menon awaiting", "farah nabilah", "azlan razak acknowledged",
      "read receipt", "acknowledgement", "delivery record", "who received",
    ],
    answer: "The delivery record logs every recipient, delivery timestamp, and read timestamp for this report. Required owners — brand marketing lead and agency account director — must formally acknowledge before the brief is considered actioned.\n\nFarah Nabilah and Azlan Razak have acknowledged. Priya Menon (CC, media planner) has not yet read. The record is append-only — no entry can be removed or backdated. In any dispute about whether a brief was received or when, this log is the reference.",
  },
  {
    id: "ai-visibility",
    triggers: [
      "ai brand visibility", "google ai overview", "appear in ai", "ai recommendation",
      "chatgpt mention", "gemini mention", "ai generated results",
      "ai visibility", "brand in ai", "ai search",
    ],
    answer: "AI Brand Visibility tracks whether Cooks appears when someone asks an AI assistant — Google AI Overview, ChatGPT, Gemini — for a recipe or product recommendation. 23% of purchase-intent queries in the cooking category now go to AI assistants first.\n\nIf your brand is not in those answers, you are invisible to a growing high-intent segment. This is a premium signal in the Full Intelligence Suite — it activates when brand monitoring is configured for your campaign.",
  },
  {
    id: "ai-visibility-improve",
    triggers: [
      "how do i improve ai visibility by 10", "how do i improve my ai visibility",
      "how to improve ai brand visibility", "increase ai visibility by 10",
      "improve ai visibility in 3 months", "ai visibility low how do i improve",
      "my ai visibility is low", "ai visibility is low", "improve ai visibility",
      "increase ai visibility", "boost ai visibility", "raise ai visibility",
      "how to get better ai visibility", "what improves ai visibility",
    ],
    answer: "Three levers move AI brand visibility — two are already within your current brief.\n\n**1. UGC volume is the highest-leverage input.** AI assistants surface brands that appear consistently in authentic user-generated content. Your S3 is at 28 organic posts this week. To move AI visibility 10% in 3 months, target 55–60 organic posts per week by Week 10. The recipe-led brief directly drives this — more recipe UGC means more authentic brand mentions in content AI tools crawl and cite.\n\n**2. Brand search share is the second lever.** AI Overviews weight toward brands with growing branded search. Your S1 SoS is at 14.2%, growing. Crossing 18% by Week 8 improves AI eligibility proportionally — and the same creative brief that moves your gate signal also moves this.\n\n**3. Category listing presence is a PR play.** Get Cooks mentioned in recipe roundup articles, cooking comparison posts, and food platform listicles that AI systems treat as authoritative sources. This is content and earned media work, not paid spend.\n\nYour UGC authenticity ratio is already 72% — above the floor AI tools require. The gap is volume, not quality. If UGC doubles and SoS crosses 18% by Week 8, a 10% AI visibility improvement in 3 months is achievable. Both are byproducts of actioning the brief this week.",
  },
  {
    id: "compliance",
    triggers: [
      "compliance score mean", "how compliance works", "why compliance report",
      "brief compliance score", "compliance score", "brief compliance",
      "did they follow the brief", "agency followed",
    ],
    answer: "The compliance score tells you how closely the agency executed what was briefed — and it feeds directly into the prediction accuracy loop.\n\nIf a prediction misses and compliance was Low (under 50%), the miss is flagged as execution deviation — the brief was not followed, so the model did not have the inputs it predicted. If compliance was High (80%+) and a prediction still misses, the model recalibrates. This distinction protects you as a strategist: it separates your analysis from their execution.",
  },
  {
    id: "horizon",
    triggers: [
      "when will gate fire", "week 7 week 8 prediction", "gate timeline",
      "how long until gate", "signal horizon", "next 4 weeks",
      "horizon signal", "gate estimate", "when does phase 2 start",
      "what happens in week 7", "week 7 or week 8",
      "horizon", "timeline",
    ],
    answer: "At current save-rate growth of +0.4pp per week, Gate 1 fires around Week 10–11 without any creative change. If this week's recipe-led brief is actioned, growth should accelerate to +0.6–0.8pp per week — Gate 1 in Week 7–8 is realistic.\n\nThe Merdeka window (31 August) creates additional tailwind specifically for recipe content this week. Acting now vs next week is the difference between a Week 7 gate and a Week 9 gate — roughly 2 weeks of Phase 2 budget locked unnecessarily.",
  },
  {
    id: "week7-forecast",
    triggers: [
      "predict my week 7 to be based on your weekly report history",
      "predict my week 7 based on weekly report", "how do you predict week 7",
      "predict my week 7", "week 7 forecast", "forecast week 7",
      "what will week 7 look like", "what will week 7 be",
      "based on weekly report history", "based on report history",
      "weekly report history", "predict based on history",
      "week 7 based on history", "week 7 prediction",
    ],
    answer: "Based on the 6-week signal trajectory in this report, here is what Week 7 is likely to show:\n\n**Save rate:** With the recipe-led brief actioned this week, growth accelerates from +0.4pp to +0.6–0.8pp. Week 7 save rate: 6.7–6.9%. Without the brief: ~6.5%.\n\n**Health score:** The campaign has moved +3–4 points per week since launch (52 → 74). Week 7 lands at 77–78 on the current trajectory. If the brief accelerates UGC and save rate simultaneously, 79–80 is possible.\n\n**Gate probability:** Week 7 gate fires at 48% probability if the brief is actioned this week. That drops to ~22% if actioned next week — the Merdeka window does not recur.\n\n**Revenue lift:** The save→revenue lag in this campaign is 10–14 days. The Week 3–4 save rate growth should be appearing as revenue lift in Weeks 7–8. Trajectory: 13–15% if save rate continues growing.\n\nThe formal locked prediction for Week 7 is in the Full Intelligence Suite section of this report. These are trajectory extrapolations from Weeks 1–6 — not the locked prediction.",
  },
  {
    id: "market-context",
    triggers: [
      "merdeka window", "tiktok algorithm update", "why merdeka matters",
      "algorithm boost", "seasonal opportunity", "market context mean",
      "merdeka", "tiktok algorithm", "market context",
    ],
    answer: "Two live external factors this week both point in the same direction as the brief. Merdeka on 31 August is creating elevated reach for recipe content anchored to Malaysian heritage dishes — a 2-week window that closes at the end of August. TikTok's algorithm is currently giving recipe-format videos 1.4× distribution and deprioritising lifestyle and product close-ups.\n\nBoth factors amplify the value of the recipe-led brief this week specifically. This is the best-aligned week to shift the content mix.",
  },
  {
    id: "phase-roadmap",
    triggers: [
      "phase 1 phase 2 phase 3", "three phases", "conversion phase",
      "retention phase", "scale phase", "when does phase", "phase roadmap",
      "phase 2 locked", "phase 3", "campaign phases", "roadmap",
    ],
    answer: "The campaign runs in three phases, each gated by a consumer behaviour signal — not a calendar date.\n\nPhase 1 (now — Demand): builds save rate to gate threshold. Phase 2 (Conversion): releases when Gate 1 fires — activates TikTok Shop mechanics and conversion-focused creative. Phase 3 (Retention and Scale): releases when Gate 2 fires in Phase 2. No phase releases early. This protects your budget from being deployed before the audience is ready.",
  },
  {
    id: "revenue-lift",
    triggers: [
      "revenue lift vs pre campaign baseline", "revenue lift pre campaign",
      "how was revenue lift measured", "revenue lift derived", "revenue lift calculated",
      "pre campaign baseline", "business outcome numbers derived", "business outcome derived",
      "how was this measured and derived", "how was the business outcome",
      "revenue lift", "sales lift", "12.4%", "+12.4", "revenue baseline",
      "business outcome", "revenue measured", "baseline measured",
    ],
    answer: "Revenue lift compares current weekly sales against the 4-week pre-campaign baseline — the average performance in the four weeks before the campaign launched. +12.4% means weekly sales are running 12.4% above that baseline.\n\nThe baseline is set once at campaign launch and held fixed — it does not drift as the campaign runs, so every week's lift figure is measured against the same reference point.\n\nAt 12.4% in Week 6, you are tracking above the Phase 1 expectation of 8–10% mid-campaign lift — which means the demand signals are converting to sales faster than modelled. The next check is whether this tracks the save rate with a 10–14 day lag. Save rate has grown every week since Week 1. If the lag holds, Weeks 7–8 revenue lift should reach 13–15% without any additional intervention. If it stalls, that breaks the prediction loop and the model recalibrates.\n\nThis section shows 'Requires: sales data' because it activates when you share your weekly sales or revenue figures with your strategist.",
  },
  {
    id: "media-roi",
    triggers: [
      "media roi by channel", "roi by channel", "tiktok creator roi", "meta feed roi",
      "mid tier kol roas", "kol roas below", "roas below 1", "channel efficiency",
      "media efficiency", "return on ad spend", "how is roi calculated",
      "media roi", "channel roi", "roas",
    ],
    answer: "Media ROI by Channel measures the signal return generated per ringgit spent on each channel — specifically save-rate contribution weighted by spend share. Green bars mean the channel is generating saves above its cost-per-save benchmark. Red means it is spending more than it is producing in gate-relevant signal.\n\nMid-tier KOL is in red because ROAS is below 1.0× — it is consuming 62% of the KOL budget while producing below-gate save rates.\n\nThe reallocation math: moving mid-tier KOL spend from 62% to 30% of total KOL budget and concentrating on micro-tier performers improves the blended KOL save rate from the current 6.1% to an estimated 6.8%. That 0.7pp improvement — without any additional spend — closes Gate 1 roughly 1–2 weeks earlier than the current trajectory. The Phase 2 budget that unlocks is larger than the cost of the reallocation. This is why the brief includes it as a Phase 2 action, not a Phase 3 consideration.",
  },
  {
    id: "social-currency",
    triggers: [
      "social currency index", "what is social currency", "earned amplification rate",
      "content being saved and shared", "tier 3 trigger", "tier 2",
      "social currency", "earned amplification", "amplification rate",
    ],
    answer: "Social Currency Index measures how much your content is being amplified beyond paid reach — through saves, shares, and organic reposts by people who were not paid. A rising index means the brand is generating earned media on top of paid spend.\n\nYou are currently in Tier 2. The Tier 3 trigger fires when content is simultaneously saved AND shared at above-threshold rates. Your save rate is crossing the Tier 2 floor, but the share rate has not yet hit the Tier 3 threshold. Tier 3 is the point at which a campaign generates more earned reach than paid reach — the highest efficiency state in the model.",
  },
  {
    id: "predictive-gate-timing",
    triggers: [
      "predictive gate timing", "gate fires week 7", "gate fires week 8", "gate fires week 9",
      "week 7 probability", "48% probability", "gate probability", "when gate fires",
      "gate timing prediction", "probability of gate", "predictive timing",
    ],
    answer: "Predictive Gate Timing models three scenarios based on your current weekly growth rate. Week 7: brief is actioned this week, growth accelerates to +0.6–0.8pp per week — probability currently 48%. Week 8: partial brief action, slower acceleration. Week 9+: no creative change, +0.4pp per week continues.\n\nThe probabilities update every Monday when new signal data arrives. Submitting the compliance report this week also shifts the Week 7 probability — high compliance raises it, low compliance lowers it, because compliance tells the model whether the inputs it assumed were actually executed.",
  },
  {
    id: "full-suite",
    triggers: [
      "full intelligence suite", "premium section", "requires sales data",
      "how to unlock", "unlock premium", "advanced signals section",
      "business tracking section", "full suite",
    ],
    answer: "The Full Intelligence Suite activates when you connect your business data — weekly sales, media spend by channel, and revenue figures. Once connected, it tracks revenue lift against the pre-campaign baseline, media ROI by channel, the Social Currency Index, and Predictive Gate Timing.\n\n'Requires: sales data' on any section means it is waiting for that data connection. Your strategist sets this up at the start of engagement — it typically involves sharing a weekly data export from your sales system or agency reporting dashboard.",
  },
];

const CLARIFY = "I can see you're asking about something in the report — could you name the specific section or number? For example: revenue lift, media ROI, save rate, gate threshold, KOL performance, compliance score, Social Currency Index, or predictions.";

const FALLBACK = "I don't have a specific answer for that in this report's knowledge base. I can explain: the health score (74), gate threshold, save rate, KOL results, creative battery, brand posture, revenue lift, media ROI by channel, compliance score, Social Currency Index, predictive gate timing, predictions, or the dashed line on any chart. Try naming the specific section or number you're looking at.";

function normalizeQuery(q: string): string {
  let s = q.toLowerCase().trim();
  for (const p of CONTEXT_PHRASES) { s = s.split(p).join(" "); }
  return s.replace(/\s+/g, " ").trim();
}

function matchTopic(q: string, lastTopicId = ""): { answer: string; topicId: string } {
  const raw = q.toLowerCase();
  const norm = normalizeQuery(q);

  let best = { score: 0, answer: "", topicId: "" };

  for (const topic of TOPICS) {
    let score = 0;
    for (const trigger of topic.triggers) {
      // Normalized match (after stripping context) is worth 3× phrase length
      // Raw match (before stripping) is worth 1× phrase length
      // Longer phrase = more specific = higher score
      if (norm.includes(trigger))      score = Math.max(score, trigger.length * 3);
      else if (raw.includes(trigger))  score = Math.max(score, trigger.length);
    }
    // Conversation continuity: boost the last topic so follow-up questions stay on topic
    if (lastTopicId && topic.id === lastTopicId) score += 8;

    if (score > best.score) best = { score, answer: topic.answer, topicId: topic.id };
  }

  // Confidence thresholds:
  //   < 12: no meaningful match → fallback
  //   12–18: weak match → clarify
  //   > 18: confident → answer
  if (best.score < 12) return { answer: FALLBACK, topicId: "" };
  if (best.score < 18) return { answer: CLARIFY, topicId: "" };
  return { answer: best.answer, topicId: best.topicId };
}

// Legacy wrapper kept for any call sites that use the old signature
function matchAnswer(q: string): string { return matchTopic(q).answer; }

const SUGGESTIONS = [
  "What does the dashed line mean?",
  "Why hasn't the gate fired yet?",
  "What does 'your version of the dish' mean?",
  "How is the compliance score used?",
];

// ─── Legacy QA placeholder (not used — replaced by TOPICS above) ──────────────
const QA: Array<{ keywords: string[]; answer: string }> = [
  // ── Dashed line / gate threshold (must be first — most commonly misunderstood) ──
  {
    keywords: ["dashed", "dotted", "line", "what does the line", "what is the line", "red line", "line mean"],
    answer: "The dashed line on each signal chart marks the gate threshold — the minimum level this signal must reach and hold before Phase 2 budget releases. On save rate, the gate is ≥8% (you are at 6.1%, so 1.9pp below). On brand search share, the target is 18% (you are at 14.2%). On the UGC chart, the threshold is 65% authenticity ratio (you are above it at 72%). The dashed line is not a soft target — it is the gate. Crossing it and holding it for 3 consecutive days unlocks the next phase.",
  },
  // ── Health score ──
  {
    keywords: ["health score", "74", "health", "composite", "derived", "calculated"],
    answer: "Your health score is a weekly composite of how all live signals are tracking toward their gate thresholds. A score of 74 at Week 6 of Phase 1 is strong — it reflects 5 consecutive weeks of improvement, from 52 at launch. The score weights save rate most heavily because that is the gate signal. It updates every Monday from your live platform data.",
  },
  // ── Gate ──
  {
    keywords: ["gate", "phase 2", "unlock", "fire", "fired", "budget release", "trigger"],
    answer: "The gate is a consumer behaviour threshold that must be reached and held for 3 consecutive days before Phase 2 budget releases. Save rate must reach ≥8% — you are at 6.1%, which is 1.9pp away. The hold requirement prevents a single viral spike from unlocking budget prematurely. At your current growth rate of +0.4pp per week, you are 4–5 weeks from gate without the brief. With the recipe-led creative brief actioned this week, the growth rate should accelerate — gate in 2–3 weeks is realistic.",
  },
  // ── Save rate ──
  {
    keywords: ["save rate", "6.1", "saves", "bookmark", "8%", "content save"],
    answer: "Save rate is the percentage of people who see your content and choose to bookmark it for later. In your category, saves are the strongest forward indicator of purchase intent — people save recipes they intend to cook, not recipes they have already made. Your save rate has grown every week since launch. Recipe-led content is saving at 2.3× the rate of lifestyle content, which is why the Week 7 brief shifts the mix to 70% recipe.",
  },
  // ── ICS / idea quality ──
  {
    keywords: ["conditional", "ics", "76", "idea certainty", "idea quality", "campaign idea"],
    answer: "CONDITIONAL means your campaign idea — Jadikan Caramu — is structurally sound and benchmarking above the category average of 67. The flag is on executional consistency: the idea is not being expressed consistently enough across formats and channels. That is a tactical fix, not a strategic problem. The brief this week addresses it directly by tightening the mix to recipe-led content that expresses the core idea more coherently.",
  },
  // ── Competitors / benchmark ──
  {
    keywords: ["maggi", "knorr", "adabi", "competitor", "benchmark", "category leader"],
    answer: "The benchmark compares your campaign idea against four active campaigns in the cooking category right now. Your ICS of 76 puts you second — ahead of Knorr (74) and Adabi (59), behind MAGGI (81). The gap to MAGGI is not in idea quality or budget — it is in executional consistency. Tighter creative execution this week closes that gap by Week 8.",
  },
  // ── Brand posture ──
  {
    keywords: ["posture", "gaining", "fragile", "plateauing", "brand posture", "what does gaining mean"],
    answer: "Brand posture is a weekly classification of signal momentum. Gaining means every tracked signal improved week-on-week and none deteriorated. This campaign moved from Fragile (Weeks 1–2) to Plateauing (Weeks 3–4) to Gaining (Weeks 5–6). Two consecutive Gaining weeks at this point in Phase 1 is the correct trajectory — it confirms the campaign is compounding, not just recovering. The risk that would flip posture back to Plateauing is a save rate stall caused by the current creative mix.",
  },
  // ── KOL ──
  {
    keywords: ["kol", "influencer", "creator", "micro kol", "mid tier", "kol programme", "activation"],
    answer: "KOL performance is measured on save rate only — not reach, follower count, or views — because saves are the only KOL metric that directly moves your gate signal. Your three micro-KOLs (@masakdenganaishah at 8.4%, @eatwithzafran at 7.1%, @dapurrumahkuofficial at 6.8%) are averaging 7.4% save rate with 38% of the total KOL budget. Your two mid-tier KOLs are averaging 5.4% — below gate threshold — with 62% of the budget. Phase 2 recommendation: do not renew mid-tier contracts. Concentrate budget on micro-tier performers and recruit two new Klang Valley food creators to the same profile.",
  },
  // ── Creative battery ──
  {
    keywords: ["creative battery", "battery", "fatigue", "endurance", "weeks remaining", "creative runway"],
    answer: "Creative Battery measures how many more weeks the current execution format can sustain its performance trajectory before audiences stop responding at the same rate. This is about format fatigue, not idea quality — the Jadikan Caramu idea is intact. At Week 6, your Meta Feed lifestyle content (60% of the mix) is showing early fatigue: save rate per impression is declining 3% week-on-week even as total impressions grow. TikTok recipe formats are not declining. The battery for Meta lifestyle is approximately 2 weeks. The recipe-led brief this week resets it.",
  },
  // ── UGC ──
  {
    keywords: ["ugc", "user generated", "organic posts", "authenticity ratio", "authenticity", "community content"],
    answer: "UGC Signal measures organic and seeded content posted by real consumers who cooked with Cooks. The Authenticity Ratio (currently 72%) is the proportion of brand-tagged content that is genuine versus paid. You crossed the 65% threshold at Week 5 and are holding above it — this means the brand is building real cultural presence, not just buying reach. Twenty-eight organic posts were tagged this week, up from 19 at Week 4. This is a compounding signal: rising authenticity makes your paid KOL content more credible.",
  },
  // ── GrabAds ──
  {
    keywords: ["grabads", "grab ads", "purchase attribution", "grabart", "grabmart", "grab signal"],
    answer: "GrabAds is Grab's advertising platform — the super-app Malaysians use daily for rides, food, and payments. Because Grab sees actual purchase transactions, GrabAds closes the loop between your content (a TikTok recipe save) and a physical purchase (Cooks paste from GrabMart or a nearby store). It is one of the only platforms in Malaysia that connects social activity to real buying behaviour. This signal is in preview — it activates when your GrabAds account is linked to ShiftImpact OS.",
  },
  // ── Prediction accuracy ──
  {
    keywords: ["prediction", "accuracy", "track record", "verified prediction", "what you predicted", "predictions"],
    answer: "Every report contains two prediction layers. This week's predictions are locked and timestamped at publication — they cannot be edited after delivery. Prior predictions are verified against actuals in the following week's report. At Week 6, all five predictions made in Weeks 1–5 have been verified within the stated range, giving a 100% accuracy rate for this campaign so far. The locked predictions for this week are in the Full Intelligence Suite section at the bottom of the report.",
  },
  // ── Read receipts ──
  {
    keywords: ["read receipt", "acknowledged", "delivery record", "who received", "confirm receipt", "brief delivered"],
    answer: "The delivery and acknowledgement record at the bottom of the brief section logs every recipient, delivery timestamp, and read timestamp for this report. Required owners — the brand marketing lead and agency account director — must formally acknowledge receipt before the brief is considered actioned. This record is append-only and cannot be modified after publication. It is the reference in any future dispute about whether a brief was received or when.",
  },
  // ── AI brand visibility ──
  {
    keywords: ["ai visibility", "ai brand", "chatgpt", "gemini", "google ai overview", "ai recommendation", "appear in ai"],
    answer: "AI Brand Visibility tracks whether Cooks appears when someone asks an AI assistant — Google AI Overview, ChatGPT, Gemini — for a recipe or product recommendation. In FMCG and cooking categories, 23% of purchase-intent queries now go to AI assistants first. If your brand is not in those answers, you are invisible to a growing high-intent segment. This is a premium signal in the Full Intelligence Suite — it activates when your brand monitoring is configured.",
  },
  // ── Gate timeline / horizon ──
  {
    keywords: ["horizon", "week 7", "week 8", "when will gate fire", "gate timeline", "how long"],
    answer: "At the current save rate growth of +0.4pp per week, Gate 1 would fire around Week 10–11 without any creative change. If this week's recipe-led brief is actioned, growth should accelerate to +0.6–0.8pp per week — putting Gate 1 at Week 7–8. The Merdeka window (31 August) creates additional tailwind for recipe content this week specifically. Acting now versus next week is the difference between a Week 7 gate and a Week 9 gate.",
  },
  // ── Market context / Merdeka ──
  {
    keywords: ["merdeka", "tiktok algorithm", "market context", "seasonal", "platform update", "algorithm"],
    answer: "Market context captures external conditions that change what your data means this week. Two active factors: Merdeka on 31 August is creating elevated reach for recipe content anchored to Malaysian heritage dishes — this is a 2-week window that closes at end of August. TikTok's algorithm is currently giving 1.4× distribution to recipe-format videos and deprioritising lifestyle and product close-ups. Both factors point in the same direction as the creative brief: shift to recipe-led content now.",
  },
  // ── Phase roadmap ──
  {
    keywords: ["phase 1", "phase 3", "roadmap", "conversion phase", "retention phase", "scale phase", "three phases"],
    answer: "The campaign runs in three phases, each gated by a consumer behaviour signal. Phase 1 (now) builds demand — the gate is save rate ≥8%, which you are 1.9pp from. Phase 2 (Conversion) releases when Gate 1 fires — it activates TikTok Shop mechanics and conversion-focused creative. Phase 3 (Retention and Scale) releases when Gate 2 fires in Phase 2. No phase releases on a calendar date — each releases when the data confirms audience readiness. This protects your budget from being deployed before the market is primed.",
  },
  // ── Brief framing — 'your version of the dish' (must come before compliance — higher specificity) ──
  {
    keywords: ["your version of the dish", "your version", "brand shortcut", "shortcut positioning", "dish framing", "personal ownership", "this is my version", "not brand shortcut", "framing", "frame"],
    answer: "This compliance item checks whether the KOL content told the story from the creator's perspective, not the brand's. 'Your version of the dish' means the creator cooked it their own way and Cooks paste was part of their process — not a brand ad where the product is the hero. In practice: personal ownership sounds like 'this is how I make rendang — I always use Cooks paste for the base.' Brand shortcut positioning sounds like 'Cooks paste gives you authentic rendang in 20 minutes.' The first saves. The second doesn't. Personal ownership framing produces 2.3× higher save rates than shortcut messaging in recipe content, which is why it's in every KOL brief. The compliance item asks: when you watch the posted content, does the creator own the cooking story, or does the product?",
  },
  // ── Compliance — system explanation (lower priority than specific item questions) ──
  {
    keywords: ["brief compliance report", "compliance score", "did they follow the brief", "agency followed", "what was actioned", "how compliance works", "compliance system"],
    answer: "The Brief Compliance Report is a structured sign-off the agency lead completes before each weekly report publishes. For every brief action, they select Done in full, Done partially, or Not done — and if partial or not done, they pick a preset reason: Budget constraint, Timeline pressure, Client override, Format changed, Creative shifted, or Planned for next activation. No free-text typing required. The compliance score feeds into the prediction accuracy loop: if a prediction misses and compliance was low, the variance analysis leads with execution deviation. If compliance was high, the model recalibrates. This is what separates model error from execution error.",
  },
  // ── Data sources ──
  {
    keywords: ["data source", "where does", "how is it measured", "what data", "where does this come from", "live data"],
    answer: "Every number in this report is drawn from live platform data — TikTok and Instagram analytics for save rate and UGC, Google Trends for brand search share, and platform-level impression data for creative battery calculations. Nothing is modelled or estimated without disclosure. Signal sources are documented in the Deep Dive section. Your strategist can provide the raw data trail for any figure on request.",
  },
];

// ─── Floating assistant widget ────────────────────────────────────────────────

type Message = { role: "user" | "ai"; text: string };

function AskWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Ask me anything about this report — the health score, gate threshold, KOL results, compliance score, predictions, or any number you're not sure about." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [lastTopicId, setLastTopicId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function send(text: string) {
    if (!text.trim() || thinking) return;
    const q = text.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setThinking(true);
    setTimeout(() => {
      const { answer, topicId } = matchTopic(q, lastTopicId);
      if (topicId) setLastTopicId(topicId);
      setMessages(prev => [...prev, { role: "ai", text: answer }]);
      setThinking(false);
    }, 750);
  }

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Panel */}
      {open && (
        <div className={`
          fixed z-50 bg-white shadow-2xl border border-neutral-100 flex flex-col
          bottom-0 left-0 right-0 rounded-t-2xl max-h-[72vh]
          lg:bottom-24 lg:right-6 lg:left-auto lg:rounded-2xl lg:w-[360px] lg:max-h-[520px]
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-neutral-900 rounded-t-2xl lg:rounded-t-2xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-bold text-white">Ask about this report</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 pt-3 pb-0 shrink-0">
              <p className="text-xs font-semibold text-neutral-400 mb-2">Suggested questions</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-full px-3 py-1.5 transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-neutral-900 text-white rounded-br-sm"
                    : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-neutral-100 shrink-0">
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything about this report…"
                className="flex-1 text-sm bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
              />
              <button type="submit" disabled={!input.trim() || thinking}
                className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-neutral-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => { setOpen(v => !v); setTimeout(() => inputRef.current?.focus(), 100); }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-xl font-semibold text-sm transition-all ${
          open ? "bg-neutral-700 text-white" : "bg-neutral-900 text-white hover:bg-neutral-700"
        }`}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span className="hidden sm:inline">{open ? "Close" : "Ask anything"}</span>
        {!open && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </button>
    </>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, gate, color = "#34d399" }: { values: number[]; gate?: number; color?: string }) {
  const allVals = [...values, ...(gate !== undefined ? [gate] : [])];
  const min = Math.min(...allVals) * 0.95;
  const max = Math.max(...allVals) * 1.05;
  const range = max - min || 1;
  const W = 200, H = 56, px = 6, py = 8;
  const x = (i: number) => px + (i / (values.length - 1)) * (W - px * 2);
  const y = (v: number) => H - py - ((v - min) / range) * (H - py * 2);
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L ${x(values.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`;
  const gateY = gate !== undefined ? y(gate) : null;
  const gradId = `grad-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      {gateY !== null && (
        <line x1={px} y1={gateY} x2={W - px} y2={gateY} stroke="#f87171" strokeWidth="1.5" strokeDasharray="5 3" strokeOpacity="0.9" />
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4.5 : 3}
          fill={i === values.length - 1 ? color : "white"} stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

// ─── Battery gauge ────────────────────────────────────────────────────────────

function MiniBar({ pct }: { pct: number }) {
  const color = pct > 60 ? "#34d399" : pct > 30 ? "#f59e0b" : "#f87171";
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <div className="flex-1 h-2 rounded-full bg-neutral-100 border border-neutral-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-1 h-2 rounded-r-sm shrink-0" style={{ background: color, opacity: 0.7 }} />
    </div>
  );
}

const CREATIVE_ASSETS = [
  {
    idea: "Jadikan Caramu",
    ics: 76,
    rating: "CONDITIONAL",
    assets: [
      { label: "TikTok · Micro-KOL recipe activations", format: "Creator video", pct: 82, est: "5–6 wks", status: "Holding", tone: "green" as Tone },
      { label: "Meta Feed · Lifestyle product content", format: "Lifestyle/product", pct: 24, est: "~2 wks", status: "Fatigue risk", tone: "red" as Tone },
      { label: "Instagram Reels · UGC seeded content", format: "UGC / seeded", pct: 68, est: "3–4 wks", status: "Stable", tone: "green" as Tone },
      { label: "Google Search · Branded keywords", format: "Search copy", pct: 91, est: "Stable", status: "No decay", tone: "green" as Tone },
    ],
    aggregate: { pct: 46, label: "~3 wks avg", action: "Meta feed refresh is the priority — brief issued this week." },
  },
];

function CreativeBatteryCard() {
  const ca = CREATIVE_ASSETS[0];
  const aggColor = ca.aggregate.pct > 60 ? "text-emerald-600" : ca.aggregate.pct > 30 ? "text-amber-600" : "text-red-600";
  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm px-5 py-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-semibold text-neutral-700">Creative Battery</p>
        <span className="text-xs text-amber-600 font-semibold shrink-0 ml-2">1 asset at risk</span>
      </div>

      {/* Big idea anchor */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-100">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Big idea</span>
        <span className="text-xs font-bold text-violet-700">{ca.idea}</span>
        <span className="text-xs text-neutral-500">ICS {ca.ics} · {ca.rating}</span>
      </div>

      {/* Per-asset readings */}
      <div className="space-y-2.5 mb-4">
        {ca.assets.map((a) => (
          <div key={a.label}>
            <div className="flex items-center gap-2 mb-1">
              <MiniBar pct={a.pct} />
              <span className={`text-xs font-bold shrink-0 w-14 text-right ${
                a.tone === "green" ? "text-emerald-600" : a.tone === "amber" ? "text-amber-600" : "text-red-600"
              }`}>{a.est}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                a.tone === "green" ? "bg-emerald-400" : a.tone === "amber" ? "bg-amber-400" : "bg-red-400"
              }`} />
              <p className="text-xs text-neutral-600 truncate">{a.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Aggregate */}
      <div className="pt-3 border-t border-neutral-100">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-xl font-black ${aggColor}`}>{ca.aggregate.label}</span>
          <span className="text-xs text-neutral-400">campaign avg</span>
        </div>
        <p className="text-xs text-neutral-500 leading-snug">{ca.aggregate.action}</p>
      </div>
    </div>
  );
}

// ─── Per-week PDF data & generator ───────────────────────────────────────────

type WeekReport = {
  n: number; date: string; health: number; posture: string; dot: string;
  healthDelta: string; save: string; saveDelta: string;
  brandSearch: string; brandSearchDelta: string;
  ugcRatio: string; ugcPosts: number; ugcDelta: string;
  gateDelta: string; gateStatus: string;
  batteryStatus: string;
  verdict: string;
  action: string;
  brief: string[];
};

const WEEK_REPORTS: WeekReport[] = [
  {
    n: 6, date: "17 Aug 2026", health: 74, posture: "Gaining", dot: "green",
    healthDelta: "+5", save: "6.1%", saveDelta: "+0.4pp", brandSearch: "14.2%", brandSearchDelta: "+1.3pp",
    ugcRatio: "72%", ugcPosts: 28, ugcDelta: "+8pp",
    gateDelta: "−1.9pp", gateStatus: "1.9pp from ≥8% threshold — on track",
    batteryStatus: "Meta Feed at 24% — ~2 wks · TikTok KOL at 82% · Aggregate ~3 wks",
    verdict: "The campaign is building correctly at the midpoint. Brand demand is accelerating ahead of Merdeka. The only open item is pushing save rate over the gate threshold in the next 2 weeks — and this week's creative brief is the lever.",
    action: "Shift to recipe-led creative mix before the Merdeka window. Issue Week 7 brief to micro-KOLs this week.",
    brief: [
      "Format: Recipe-led process video — cooking steps, not product close-up",
      "Dishes: Ayam Percik, Rendang Tok, Sup Tulang — high Merdeka search intent",
      "Frame: Cooking confidence (your version, not the shortcut)",
      "Mix target: 70% recipe / 30% lifestyle",
      "Channels: TikTok + Instagram Reels first, Meta feed second",
    ],
  },
  {
    n: 5, date: "4 Aug 2026", health: 69, posture: "Gaining", dot: "green",
    healthDelta: "+2", save: "5.7%", saveDelta: "+0.2pp", brandSearch: "12.9%", brandSearchDelta: "+0.9pp",
    ugcRatio: "68%", ugcPosts: 23, ugcDelta: "+4pp",
    gateDelta: "−2.3pp", gateStatus: "2.3pp from ≥8% threshold — trajectory positive",
    batteryStatus: "All formats holding — aggregate ~5 wks · No immediate risk",
    verdict: "Campaign is gaining momentum. Save rate growth rate is consistent with reaching gate by Week 8. UGC authenticity is above threshold, and brand search is pulling away from the cooking category baseline. Priority this week is KOL roster expansion.",
    action: "Expand micro-KOL roster — brief 2 new Klang Valley food creators matching @masakdenganaishah profile. 38% of KOL budget producing 68% of save outcomes.",
    brief: [
      "Creator profile: Klang Valley home cook, recipe-led, 10K–80K followers",
      "Activation: Rendang Tok or Ayam Percik dish using Cooks paste",
      "Deliverable: 2 × TikTok process videos + 1 × Instagram Reel each",
      "Frame: 'This is my version' — personal ownership of the dish",
      "Performance gate: Save rate ≥7.0% within 5 days of posting",
    ],
  },
  {
    n: 4, date: "28 Jul 2026", health: 67, posture: "Plateauing", dot: "amber",
    healthDelta: "+4", save: "5.5%", saveDelta: "+0.4pp", brandSearch: "12.0%", brandSearchDelta: "+0.7pp",
    ugcRatio: "64%", ugcPosts: 19, ugcDelta: "+2pp",
    gateDelta: "−2.5pp", gateStatus: "2.5pp from ≥8% threshold — plateau risk if mix unchanged",
    batteryStatus: "Meta Feed declining — early fatigue signal · TikTok KOL stable",
    verdict: "Health improved but plateauing signal is a warning. Budget concentration is the issue — two mid-tier KOLs absorbing 62% of KOL spend while producing below-gate save rates. Correcting this is the single highest-impact move available this week.",
    action: "Reallocate mid-tier KOL budget (RM 12,000) to micro-tier performers. Gate save rate threshold within reach if spend is concentrated on what is already working.",
    brief: [
      "Suspend Weekend Cooking Vibes activation (5.6% SR — below gate)",
      "Redirect budget to @masakdenganaishah and @eatwithzafran",
      "Brief: second dish activation — Sup Tulang Merdeka edition",
      "Reporting requirement: daily save rate tracking for 7 days post-activation",
    ],
  },
  {
    n: 3, date: "21 Jul 2026", health: 63, posture: "Plateauing", dot: "amber",
    healthDelta: "+4", save: "5.1%", saveDelta: "+0.3pp", brandSearch: "11.3%", brandSearchDelta: "+0.8pp",
    ugcRatio: "62%", ugcPosts: 18, ugcDelta: "+3pp",
    gateDelta: "−2.9pp", gateStatus: "2.9pp from ≥8% threshold — retargeting can accelerate",
    batteryStatus: "All formats stable — no fatigue signal detected",
    verdict: "Signals are advancing but at a slower pace than Phase 1 mid-point targets. Save rate growth is real but insufficient. The audience segment that is saving recipe content is highly intent-qualified — retargeting this group with GrabAds can compress the time to gate.",
    action: "Launch GrabAds retargeting campaign targeting users who saved Cooks recipe content in the past 14 days. This group has demonstrated intent — GrabAds closes the loop to purchase.",
    brief: [
      "GrabAds audience: custom segment — TikTok + Instagram Reels savers (past 14 days)",
      "Creative: product-close recipe result, not process video",
      "Placement: GrabFood + GrabMart sponsored",
      "Budget: RM 8,000 over 10 days",
      "Measurement: GrabAds conversion lift vs organic save rate baseline",
    ],
  },
  {
    n: 2, date: "14 Jul 2026", health: 59, posture: "Fragile", dot: "red",
    healthDelta: "+7", save: "4.8%", saveDelta: "+0.6pp", brandSearch: "10.5%", brandSearchDelta: "+0.7pp",
    ugcRatio: "58%", ugcPosts: 15, ugcDelta: "+0pp",
    gateDelta: "−3.2pp", gateStatus: "3.2pp from ≥8% threshold — seeding programme needed",
    batteryStatus: "Insufficient data — week 2 baseline only · Creative format evaluation in progress",
    verdict: "Week 2 shows the strongest health improvement of the campaign so far, but from a low base. Posture is Fragile because save rate has not yet demonstrated sustained momentum. The UGC authenticity ratio is stuck — organic content is not generating without a seeding stimulus.",
    action: "Issue UGC seeding brief to micro-KOL tier. Seed 3–5 creators with Cooks product and recipe brief. Focus on Klang Valley food content creators with audience overlap in the target save-rate demographic.",
    brief: [
      "Seeding approach: product gifting + recipe brief (not paid activation)",
      "Creator profile: home cook aesthetic, recipe focus, 5K–30K followers",
      "Content ask: one authentic recipe video using Cooks paste, any dish",
      "No scripted content — authenticity ratio is the metric being moved",
      "Track: organic save rate on seeded posts vs paid activation baseline",
    ],
  },
  {
    n: 1, date: "7 Jul 2026", health: 52, posture: "Fragile", dot: "red",
    healthDelta: "—", save: "4.2%", saveDelta: "baseline", brandSearch: "9.8%", brandSearchDelta: "baseline",
    ugcRatio: "52%", ugcPosts: 12, ugcDelta: "baseline",
    gateDelta: "−3.8pp", gateStatus: "3.8pp from ≥8% threshold — campaign baseline established",
    batteryStatus: "Week 1 — no fatigue data · Execution mix: 60% lifestyle / 40% recipe",
    verdict: "Campaign launched. Week 1 baselines are set. All signals tracking below gate thresholds as expected for launch week. Brand search share at 9.8% is above category average for a new campaign, indicating the pre-launch seeding created awareness. Phase 1 objective is to build save rate to ≥8% by Week 8.",
    action: "No brief issued — Week 1 is a listening and calibration week. Review first-week signal performance before brief direction is set. Expect Week 2 data to show first meaningful trend.",
    brief: [
      "Phase 1 objective: content save rate ≥8% sustained for 2 consecutive weeks",
      "Gate measurement: Thursday weekly read from all active platforms",
      "ICS baseline: 76 (CONDITIONAL) — consistency is the focus, not idea quality",
      "Budget: hold existing allocation · No rebalancing until Week 3 signal read",
    ],
  },
];

function generateWeeklyPDF(w: WeekReport) {
  const healthColor = w.health >= 70 ? "#059669" : w.health >= 60 ? "#d97706" : "#dc2626";
  const postureColor = w.dot === "green" ? "#059669" : w.dot === "amber" ? "#d97706" : "#dc2626";
  const dotColor = w.dot === "green" ? "#34d399" : w.dot === "amber" ? "#f59e0b" : "#f87171";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Growth Intelligence Report — Week ${w.n} · ${w.date}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #171717; font-size: 13px; line-height: 1.5; }
  @page { size: A4 portrait; margin: 18mm 16mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  .page { max-width: 720px; margin: 0 auto; padding: 32px 0; }

  /* Header */
  .hdr { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 18px; border-bottom: 2px solid #171717; margin-bottom: 22px; }
  .hdr-left .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #737373; margin-bottom: 6px; }
  .hdr-left h1 { font-size: 22px; font-weight: 900; }
  .hdr-left .sub { font-size: 13px; color: #525252; margin-top: 3px; }
  .hdr-right { text-align: right; }
  .hdr-right .wk { font-size: 28px; font-weight: 900; color: #171717; }
  .hdr-right .dt { font-size: 12px; color: #737373; margin-top: 2px; }
  .reviewed { display: inline-block; border: 1.5px solid #bbf7d0; background: #f0fdf4; color: #166534; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; margin-top: 6px; }

  /* Health banner */
  .health-banner { background: #171717; border-radius: 14px; padding: 20px 24px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
  .hb-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #737373; margin-bottom: 6px; }
  .hb-big { font-size: 40px; font-weight: 900; line-height: 1; }
  .hb-sub { font-size: 12px; color: #a3a3a3; margin-top: 4px; }
  .hb-delta { font-size: 14px; font-weight: 700; margin-left: 8px; }

  /* Signal grid */
  .signal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .signal-card { border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; }
  .sc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #737373; margin-bottom: 6px; }
  .sc-val { font-size: 26px; font-weight: 900; }
  .sc-delta { font-size: 11px; font-weight: 700; color: #059669; margin-left: 6px; }
  .sc-note { font-size: 11px; color: #737373; margin-top: 4px; }
  .sc-gate { display: inline-block; margin-top: 6px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
  .gate-amber { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
  .gate-green { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

  /* Verdict */
  .section { margin-bottom: 20px; }
  .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #737373; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }
  .verdict-box { background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; }
  .verdict-text { font-size: 13px; line-height: 1.65; color: #262626; }

  /* Action */
  .action-box { border-left: 4px solid #171717; background: #f9fafb; border-radius: 0 12px 12px 0; padding: 14px 18px; margin-bottom: 12px; }
  .action-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #737373; margin-bottom: 5px; }
  .action-text { font-size: 13px; font-weight: 600; color: #171717; }

  /* Brief */
  .brief-box { border: 1.5px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
  .brief-header { background: #f3f4f6; padding: 10px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #525252; }
  .brief-item { padding: 9px 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #404040; display: flex; align-items: flex-start; gap: 10px; }
  .brief-item::before { content: '→'; color: #737373; shrink: 0; }

  /* Battery */
  .battery-row { display: flex; gap: 12px; align-items: flex-start; }
  .battery-info { flex: 1; }
  .battery-status-box { border: 1.5px solid #fef3c7; background: #fffbeb; border-radius: 12px; padding: 14px 16px; flex: 1; }
  .battery-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #d97706; margin-bottom: 6px; }
  .battery-text { font-size: 12px; color: #78350f; line-height: 1.55; }

  /* Gate */
  .gate-box { border: 1.5px solid #ddd6fe; background: #faf5ff; border-radius: 12px; padding: 14px 16px; }
  .gate-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6d28d9; margin-bottom: 6px; }
  .gate-text { font-size: 12px; color: #3b0764; }
  .gate-delta { font-size: 22px; font-weight: 900; color: #6d28d9; margin-right: 6px; }

  /* Footer */
  .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #a3a3a3; }
  .footer-right { font-size: 11px; color: #a3a3a3; }
  .confidential { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #d1d5db; background: #f3f4f6; border-radius: 4px; padding: 2px 6px; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-left">
      <div class="brand">ShiftImpact OS · Growth Intelligence Report</div>
      <h1>Cooks · Jadikan Caramu</h1>
      <div class="sub">Phase 1 — Demand · Week ${w.n} of 12</div>
    </div>
    <div class="hdr-right">
      <div class="wk">W${w.n}</div>
      <div class="dt">${w.date}</div>
      <div class="reviewed">✓ Strategist reviewed</div>
    </div>
  </div>

  <!-- Health banner -->
  <div class="health-banner">
    <div>
      <div class="hb-label">Campaign health</div>
      <div style="display:flex; align-items:baseline; gap:8px;">
        <div class="hb-big" style="color:${healthColor}">${w.health}</div>
        <div class="hb-delta" style="color:${healthColor}">${w.healthDelta !== "—" ? "↑ " + w.healthDelta : "—"}</div>
      </div>
      <div class="hb-sub">Out of 100 · weekly composite</div>
    </div>
    <div>
      <div class="hb-label">Brand posture</div>
      <div class="hb-big" style="color:${postureColor}">${w.posture}</div>
      <div class="hb-sub">Signals trending ${w.dot === "green" ? "positive" : w.dot === "amber" ? "mixed" : "below target"}</div>
    </div>
    <div>
      <div class="hb-label">Gate distance</div>
      <div class="hb-big" style="color:#f59e0b">${w.gateDelta}</div>
      <div class="hb-sub">Save rate vs ≥8% threshold</div>
    </div>
  </div>

  <!-- Signal snapshot -->
  <div class="section">
    <div class="section-label">Signal snapshot</div>
    <div class="signal-grid">
      <div class="signal-card">
        <div class="sc-label">Content save rate</div>
        <div style="display:flex; align-items:baseline;">
          <div class="sc-val" style="color:#d97706">${w.save}</div>
          <div class="sc-delta">${w.saveDelta !== "baseline" ? "↑ " + w.saveDelta : "Baseline"}</div>
        </div>
        <div class="sc-note">Gate threshold: ≥8%</div>
        <div class="sc-gate gate-amber">Platform save rate · TikTok + Reels</div>
      </div>
      <div class="signal-card">
        <div class="sc-label">Brand search share</div>
        <div style="display:flex; align-items:baseline;">
          <div class="sc-val" style="color:#818cf8">${w.brandSearch}</div>
          <div class="sc-delta" style="color:#6d28d9">${w.brandSearchDelta !== "baseline" ? "↑ " + w.brandSearchDelta : "Baseline"}</div>
        </div>
        <div class="sc-note">Target: ≥18% by Phase 2</div>
        <div class="sc-gate" style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;">Google Trends · branded queries</div>
      </div>
      <div class="signal-card">
        <div class="sc-label">UGC signal (Signal 3)</div>
        <div style="display:flex; align-items:baseline;">
          <div class="sc-val" style="color:#3b82f6">${w.ugcRatio}</div>
          <div class="sc-delta" style="color:#3b82f6">${w.ugcDelta !== "baseline" ? "↑ " + w.ugcDelta : "Baseline"}</div>
        </div>
        <div class="sc-note">Authenticity ratio · ${w.ugcPosts} organic posts</div>
        <div class="sc-gate ${w.ugcRatio >= "65" ? "gate-green" : "gate-amber"}">${w.ugcRatio >= "65" ? "Above 65% threshold" : "Building toward threshold"}</div>
      </div>
    </div>
  </div>

  <!-- Gate status -->
  <div class="section">
    <div class="section-label">Gate status — Phase 2 unlock</div>
    <div class="gate-box">
      <div class="gate-label">Save rate gate</div>
      <div style="display:flex; align-items:baseline; gap:4px; margin-bottom:6px;">
        <div class="gate-delta">${w.save}</div>
        <span style="font-size:13px; color:#6d28d9;">of ≥8% required · sustained 2 consecutive weeks</span>
      </div>
      <div class="gate-text">${w.gateStatus}</div>
    </div>
  </div>

  <!-- Strategist verdict -->
  <div class="section">
    <div class="section-label">Strategist verdict</div>
    <div class="verdict-box">
      <div class="verdict-text">${w.verdict}</div>
    </div>
  </div>

  <!-- Key action -->
  <div class="section">
    <div class="section-label">This week's brief</div>
    <div class="action-box">
      <div class="action-label">Key action issued</div>
      <div class="action-text">${w.action}</div>
    </div>
    ${w.brief.length > 0 ? `
    <div class="brief-box">
      <div class="brief-header">Brief direction — Week ${w.n}</div>
      ${w.brief.map(line => `<div class="brief-item">${line}</div>`).join("")}
    </div>` : ""}
  </div>

  <!-- Creative battery -->
  <div class="section">
    <div class="section-label">Creative battery</div>
    <div class="battery-status-box">
      <div class="battery-label">⚡ Creative endurance — Jadikan Caramu</div>
      <div class="battery-text">${w.batteryStatus}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">ShiftImpact OS · Growth Intelligence · Cooks MY</div>
    <div style="display:flex; align-items:center; gap:10px;">
      <span class="confidential">Confidential</span>
      <span class="footer-right">Week ${w.n} · ${w.date} · Reviewed by your strategist</span>
    </div>
  </div>

</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ─── Types & Data ─────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red";

const WEEKS = [
  { n: 6, date: "17 Aug", health: 74, posture: "Gaining",    dot: "green", current: true },
  { n: 5, date: "4 Aug",  health: 69, posture: "Gaining",    dot: "green" },
  { n: 4, date: "28 Jul", health: 67, posture: "Plateauing", dot: "amber" },
  { n: 3, date: "21 Jul", health: 63, posture: "Plateauing", dot: "amber" },
  { n: 2, date: "14 Jul", health: 59, posture: "Fragile",    dot: "red"   },
  { n: 1, date: "7 Jul",  health: 52, posture: "Fragile",    dot: "red"   },
];

const SERIES = {
  health: { values: [52, 59, 63, 67, 69, 74],               label: "Campaign health",      current: "74",   delta: "+5",   color: "#34d399", tone: "green" as Tone },
  save:   { values: [4.2, 4.8, 5.1, 5.5, 5.7, 6.1], gate: 8,  label: "Content save rate",   current: "6.1%", delta: "+0.4%", color: "#f59e0b", tone: "amber" as Tone, gateLabel: "Gate ≥8%" },
  search: { values: [9.8, 10.5, 11.3, 12.0, 12.9, 14.2], gate: 18, label: "Brand search share", current: "14.2%", delta: "+1.8%", color: "#818cf8", tone: "amber" as Tone, gateLabel: "Target 18%" },
};

const KOLS = [
  { handle: "@masakdenganaishah",    activation: "Ayam Percik Challenge",  tier: "Micro", saveRate: 8.4, tone: "green" as Tone, status: "At gate" },
  { handle: "@eatwithzafran",        activation: "Rendang Tok Weeknight",  tier: "Micro", saveRate: 7.1, tone: "amber" as Tone, status: "Building" },
  { handle: "@dapurrumahkuofficial", activation: "Cooks Kitchen Series",   tier: "Micro", saveRate: 6.8, tone: "amber" as Tone, status: "Building" },
  { handle: "@chefhanamariana",      activation: "Lifestyle Recipe Reel",  tier: "Mid",   saveRate: 5.2, tone: "red"   as Tone, status: "Below gate" },
  { handle: "@rawlinsganics",        activation: "Weekend Cooking Vibes",  tier: "Mid",   saveRate: 5.6, tone: "red"   as Tone, status: "Below gate" },
];

const COMPETITORS = [
  { brand: "MAGGI",  campaign: "Masak Sama-Sama",  ics: 81, rating: "CONDITIONAL", gap: "Strong reach, retention signals weak" },
  { brand: "Cooks",  campaign: "Jadikan Caramu",   ics: 76, rating: "CONDITIONAL", gap: "Save rate gate not yet fired",          isSelf: true },
  { brand: "Knorr",  campaign: "Resepi Warisan",   ics: 74, rating: "CONDITIONAL", gap: "Generic audience tension" },
  { brand: "Adabi",  campaign: "Dapur Kita",       ics: 59, rating: "REWORK",      gap: "Scattered channel execution" },
];

const W6 = {
  health: 74, healthDelta: "+5", posture: "Gaining",
  verdict: "The campaign is building correctly at the midpoint. Brand demand is accelerating ahead of Merdeka. The only open item is pushing save rate over the gate threshold in the next 2 weeks — and this week's creative brief is the lever.",
  actions: [
    {
      finding: "Recipe content saves at 2.3× the rate of lifestyle content",
      implication: "Audiences are bookmarking Cooks recipes for later use — a pre-purchase signal that precedes conversion spikes by 10–14 days. The current creative mix is 60% lifestyle, 40% recipe. This is the wrong way around.",
      brief: {
        label: "Creative brief — Week 7",
        lines: [
          "Format: Recipe-led process video — cooking steps, not product close-up",
          "Dishes: Ayam Percik, Rendang Tok, Sup Tulang — high Merdeka search intent",
          "Frame: Cooking confidence (your version, not the shortcut)",
          "Mix target: 70% recipe / 30% lifestyle",
          "Channels: TikTok + Instagram Reels first, Meta feed second",
        ],
      },
    },
    {
      finding: "Brand search interest is growing 2.1× faster than the cooking category",
      implication: "Consumers are actively looking for Cooks — not just browsing. Earned demand converts 40–60% better than paid-for reach. Pulling search spend now would be the single costliest error at this stage.",
      brief: {
        label: "Media brief — Week 7",
        lines: [
          "Protect branded search budget — no reallocation to social this week",
          "Add keyword variants: 'Cooks sos ayam', 'Cooks rendang', 'Cooks resipi'",
          "Negative-match competitor brand terms to protect share gains",
        ],
      },
    },
    {
      finding: "Micro-KOLs are delivering 1.6× better save rates than mid-tier activations",
      implication: "Two mid-tier KOLs are generating reach but not saves — spending budget that is not moving the gate signal. Micro-KOLs are delivering 7–8% save rates with 38% of the total KOL budget.",
      brief: {
        label: "KOL brief — Phase 2 planning",
        lines: [
          "Do not renew @chefhanamariana or @rawlinsganics for Phase 2",
          "Reallocate their budget to @masakdenganaishah + 2 new Klang Valley food creators",
          "Recruitment criteria: save rate history ≥7%, recipe-format, 25–40k followers",
        ],
      },
    },
  ],
  horizon: {
    gateLabel: "Gate 1 — Phase 2 budget release",
    gateCondition: "Save Rate ≥8% held 3 consecutive days + Branded search +40% from campaign start",
    prediction: "At current save-rate growth (+0.4pp per week), Gate 1 is achievable by Week 8. If this week's creative brief is actioned and the mix shifts to recipe-led, growth rate should accelerate — Gate 1 in Week 7–8 is realistic. If not actioned, Gate 1 slips to Week 10 and Phase 2 budget is locked for an additional 2 weeks.",
    horizonItems: [
      { timeframe: "This week",  note: "Action the creative brief. Shift to 70% recipe-led content." },
      { timeframe: "Weeks 7–8", note: "Gate 1 fires if save rate holds ≥8% for 3 consecutive days." },
      { timeframe: "Week 9+",   note: "Phase 2 (Conversion) budget releases. TikTok Shop mechanics activate." },
    ],
    budgetStatus: "Phase 2 budget is locked until Gate 1 fires and holds.",
  },
  ics: { score: 76, rating: "CONDITIONAL", note: "Campaign idea is well-matched to this audience. Execution coherence is the gap — the creative fixes above are addressing it directly. Industry avg: 67." },
  signals: [
    { label: "Brand search share", actual: "14.2%", target: "18%",  pct: 79, delta: "+1.8%",  tone: "amber" as Tone },
    { label: "Content save rate",  actual: "6.1%",  target: "≥8%",  pct: 76, delta: "+0.4%",  tone: "amber" as Tone },
    { label: "UGC volume",         actual: "28",    target: "40",   pct: 70, delta: "+6 pcs",  tone: "amber" as Tone },
  ],
  roadmap: [
    { phase: "Phase 1 — Demand",            dates: "Jul–Aug",  active: true,  note: "Build demand. Gate 1 fires on save rate." },
    { phase: "Phase 2 — Conversion",        dates: "Sep–Oct",  active: false, note: "Locked. Releases when Gate 1 fires." },
    { phase: "Phase 3 — Retention + Scale", dates: "Nov–Dec",  active: false, note: "Locked. Releases when Gate 2 fires." },
  ],
  marketContext: [
    { icon: "🎌", note: "Merdeka 31 Aug — patriotic heritage frame live. Recipe content anchored to 'Masakan Malaysia Asli' is getting elevated reach. 2-week window remaining." },
    { icon: "📱", note: "TikTok algorithm update: recipe-format videos getting 1.4× distribution boost. Lifestyle + product close-up is being deprioritised." },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toneDot(t: string) {
  return t === "green" ? "bg-green-500" : t === "amber" ? "bg-amber-500" : t === "red" ? "bg-red-500" : "bg-neutral-400";
}
function toneBar(t: Tone) {
  return t === "green" ? "bg-green-500" : t === "amber" ? "bg-amber-400" : "bg-red-500";
}
function postureColor(p: string) {
  return p === "Gaining" ? "text-emerald-400" : p === "Plateauing" ? "text-amber-300" : "text-red-400";
}

function SectionQ({ q, label, children }: { q: string; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{q}</span>
        <h2 className="text-xl font-bold text-neutral-900">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-base font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors text-left">
        <span>{label}</span>
        <svg className={`w-5 h-5 text-neutral-500 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-neutral-200 px-5 py-5 bg-white">{children}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Brief compliance data ────────────────────────────────────────────────────

const COMPLIANCE_ITEMS = [
  "Recruit 2 Klang Valley food creators (recipe-led, 10K–80K followers)",
  "Activate Rendang Tok or Ayam Percik dish using Cooks paste",
  "Deliver 2 × TikTok process videos + 1 × Instagram Reel per creator",
  "Content uses 'your version of the dish' framing — not brand shortcut positioning",
];

const COMPLIANCE_REASONS = [
  "Budget constraint",
  "Timeline pressure",
  "Client override",
  "Format changed",
  "Creative shifted",
  "Planned for next activation",
] as const;
type ComplianceReason = typeof COMPLIANCE_REASONS[number];
type ComplianceStatus = "done" | "partial" | "skipped" | null;

export default function PortalDemoPage() {
  const [selectedWeek, setSelectedWeek] = useState(6);
  const week = W6;

  // Compliance form state (Week 5 brief executed in Week 6)
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>(COMPLIANCE_ITEMS.map(() => null));
  const [complianceReasons, setComplianceReasons] = useState<(ComplianceReason | null)[]>(COMPLIANCE_ITEMS.map(() => null));
  const [complianceSubmitted, setComplianceSubmitted] = useState(false);

  const allAnswered = complianceStatus.every(s => s !== null);
  const needsReason = (i: number) => complianceStatus[i] === "partial" || complianceStatus[i] === "skipped";
  const readyToSubmit = allAnswered && complianceStatus.every((s, i) => s === "done" || complianceReasons[i] !== null);

  const complianceScore = complianceSubmitted
    ? Math.round(complianceStatus.reduce((sum, s) => sum + (s === "done" ? 100 : s === "partial" ? 50 : 0), 0) / complianceStatus.length)
    : 0;
  const complianceRating = complianceScore >= 80 ? "High" : complianceScore >= 50 ? "Medium" : "Low";
  const complianceRatingColor = complianceRating === "High" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : complianceRating === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";

  const circumference = 138.23;
  const arcLen = (week.health / 100) * circumference;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 lg:flex">

      {/* ═══════════════════════════════════════ SIDEBAR ════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-[340px] shrink-0 fixed top-0 left-0 h-screen bg-neutral-900 text-white overflow-y-auto z-20">

        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Capabilities showcase</p>
          <p className="text-xs text-neutral-400 mt-0.5">Illustrative data · ShiftImpact OS</p>
        </div>

        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-medium text-neutral-400 mb-1">Cooks · FMCG · Cooking Sauces</p>
          <p className="text-lg font-bold leading-tight text-white">Jadikan Caramu</p>
          <p className="text-sm text-neutral-400 mt-1.5">Phase 1 — Demand · Jul–Aug 2026</p>
        </div>

        {/* Health ring */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="5"
                strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-emerald-400">{week.health}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Campaign health</p>
            <p className={`text-xl font-bold ${postureColor(week.posture)}`}>{week.posture}</p>
            <p className="text-sm text-emerald-400 font-semibold mt-0.5">{week.healthDelta} pts this week</p>
          </div>
        </div>

        {/* Sparkline */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-sm text-neutral-400 mb-2">Health trajectory · Wk 1 → 6</p>
          <Sparkline values={SERIES.health.values} color="#34d399" />
          <div className="flex items-center justify-between text-sm text-neutral-400 mt-1.5">
            <span>Wk 1 · 52</span>
            <span className="text-emerald-400 font-semibold">Wk 6 · 74 ↑</span>
          </div>
        </div>

        {/* Week timeline */}
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold px-1 mb-2">Report history</p>
          <div className="space-y-0.5">
            {WEEKS.map(w => {
              const wr = WEEK_REPORTS.find(r => r.n === w.n)!;
              return (
                <div key={w.n} className={`flex items-center gap-1 rounded-xl transition-colors ${selectedWeek === w.n ? "bg-white/15" : "hover:bg-white/8"}`}>
                  <button onClick={() => setSelectedWeek(w.n)}
                    className="flex items-center gap-3 px-3 py-2.5 text-left flex-1 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${toneDot(w.dot)}`} />
                    <span className={`text-sm flex-1 truncate ${selectedWeek === w.n ? "font-semibold text-white" : "text-neutral-300"}`}>
                      Week {w.n} · {w.date}
                    </span>
                    <span className={`text-sm font-semibold shrink-0 ${postureColor(w.posture)}`}>{w.health}</span>
                    {w.current && <span className="text-[10px] font-bold text-emerald-400 border border-emerald-400/40 rounded px-1.5 py-0.5 shrink-0">NOW</span>}
                  </button>
                  <button
                    onClick={() => generateWeeklyPDF(wr)}
                    title="Download PDF report"
                    className="p-2 mr-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors shrink-0">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2v9M4 8l4 4 4-4"/><rect x="2" y="12" width="12" height="2" rx="1"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nav */}
        <div className="px-4 py-4 flex-1">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold px-1 mb-2">This report</p>
          {[
            { href: "#glance",  label: "At a glance" },
            { href: "#battery", label: "Creative battery" },
            { href: "#q1",      label: "Is it working?" },
            { href: "#q2",      label: "What do I do now?" },
            { href: "#q3",      label: "Are we on track?" },
            { href: "#detail",  label: "Deep dive" },
            { href: "#premium", label: "Full intelligence suite" },
            { href: "#history", label: "Report history" },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-neutral-300 hover:text-white hover:bg-white/8 transition-colors">
              {item.label}
            </a>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-sm font-bold text-white mb-1">The ShiftImpact Rule</p>
          <p className="text-sm text-neutral-300 leading-relaxed">Budget moves because a signal fired and held — not because a date arrived.</p>
        </div>
      </aside>

      {/* ═══════════════════════════════════════ MOBILE HEADER ══════════════════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 bg-neutral-900 text-white shadow-lg">
        <div className="bg-amber-900/60 px-4 py-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <p className="text-xs font-medium text-amber-200">ShiftImpact OS · Capabilities showcase · illustrative data</p>
        </div>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-300">Cooks · Jadikan Caramu</p>
            <p className="text-base font-bold text-white">Week {selectedWeek} · 17 Aug 2026</p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-10 h-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#34d399" strokeWidth="6"
                  strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400">{week.health}</span>
              </div>
            </div>
            <div>
              <p className={`text-base font-bold ${postureColor(week.posture)}`}>{week.posture}</p>
              <p className="text-sm text-emerald-400 font-medium">{week.healthDelta} pts</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {WEEKS.map(w => (
            <button key={w.n} onClick={() => setSelectedWeek(w.n)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-colors ${
                selectedWeek === w.n ? "bg-white text-neutral-900 border-white" : "text-neutral-300 border-white/25"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${toneDot(w.dot)}`} />
              Wk {w.n}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════ MAIN CONTENT ═══════════════════════════════ */}
      <main className="lg:ml-80 xl:ml-[340px] flex-1 min-w-0">

        <div className="hidden lg:flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-8 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-900">
            ShiftImpact OS · Capabilities showcase — illustrative data. This is what your campaign portal looks like when live.
          </p>
        </div>

        <div className="px-5 sm:px-8 lg:px-10 py-7 lg:py-8 pb-24">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-sm font-medium text-neutral-500">17 August 2026 · Week 6 of 12</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mt-1">Growth Intelligence Report</h1>
              <p className="text-base text-neutral-600 mt-1">Jadikan Caramu · Phase 1 — Demand</p>
            </div>
            <span className="inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full border bg-green-50 text-green-800 border-green-300 shrink-0">
              Strategist reviewed
            </span>
          </div>

          {/* ── Campaign Health — hero ────────────────── */}
          <div id="glance" className="mb-6">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-xl font-bold text-neutral-900">Campaign Health</h2>
              <span className="text-sm text-neutral-500">Week 6 of 12 · Phase 1 — Demand</span>
            </div>

            <div className="bg-neutral-900 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                {/* Score + posture */}
                <div className="px-6 py-5">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Health score</p>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-6xl font-black text-emerald-400 leading-none">74</span>
                    <div>
                      <p className="text-lg font-bold text-emerald-400">↑ +5 pts</p>
                      <p className="text-xs text-neutral-500">this week</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-400 border border-emerald-400/40 rounded-full px-3 py-1">Gaining</span>
                    <span className="text-xs text-neutral-500">Signals trending positive</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-neutral-500">Health trajectory</p>
                      <p className="text-xs text-neutral-400">Wk 1 → 6</p>
                    </div>
                    <Sparkline values={SERIES.health.values} color="#34d399" />
                    <div className="flex items-center justify-between text-xs mt-1.5">
                      <span className="text-neutral-600">52 · Fragile</span>
                      <span className="text-emerald-400 font-semibold">74 · Gaining</span>
                    </div>
                  </div>
                </div>

                {/* Verdict */}
                <div className="px-6 py-5">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Strategist verdict</p>
                  <p className="text-sm text-white leading-relaxed">{week.verdict}</p>
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    {week.marketContext.map((m, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-sm shrink-0">{m.icon}</span>
                        <p className="text-xs text-neutral-400 leading-relaxed">{m.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gate status */}
                <div className="px-6 py-5">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Phase 2 gate</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-black text-amber-400 leading-none">1.9pp</span>
                    <span className="text-sm text-neutral-400">remaining</span>
                  </div>
                  <p className="text-xs text-neutral-400 mb-4">Save rate ≥8% · currently 6.1%</p>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: "76%" }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>6.1% current</span>
                    <span>8.0% gate</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-neutral-500 mb-1">Gate timeline prediction</p>
                    <p className="text-sm font-bold text-white">Week 7–8</p>
                    <p className="text-xs text-neutral-400">if brief actioned this week · 78% confidence</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Signal boxes ──────────────────────────── */}
          <div className="mb-10">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-lg font-bold text-neutral-900">Live signals</h2>
              <span className="text-sm text-neutral-500">Dashed = gate threshold · ask the widget to learn more</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Save Rate */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-neutral-500">Save rate</p>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">Gate ≥8%</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-black text-neutral-900">6.1%</span>
                  <span className="text-xs font-bold text-amber-600">↑ +0.4%</span>
                </div>
                <Sparkline values={SERIES.save.values} gate={8} color="#f59e0b" />
              </div>

              {/* Brand Search */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-neutral-500">Brand search share</p>
                  <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5">Target 18%</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-black text-neutral-900">14.2%</span>
                  <span className="text-xs font-bold text-violet-600">↑ +1.8%</span>
                </div>
                <Sparkline values={SERIES.search.values} gate={18} color="#818cf8" />
              </div>

              {/* UGC Signal */}
              <div className="bg-white rounded-xl border border-blue-200 shadow-sm px-4 py-3.5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-neutral-500">UGC Signal</p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">Above threshold</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-black text-neutral-900">72%</span>
                  <span className="text-xs font-bold text-emerald-600">↑ +8%</span>
                </div>
                <Sparkline values={[52, 58, 62, 64, 68, 72]} gate={65} color="#3b82f6" />
                <p className="text-[10px] text-blue-600 mt-1 font-medium">28 organic posts this week</p>
              </div>

              {/* GrabAds */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3.5 relative overflow-hidden">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-neutral-500">Purchase attribution</p>
                  <span className="text-[10px] font-bold text-neutral-400 border border-neutral-200 rounded-full px-1.5 py-0.5">Preview</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-black text-neutral-300">4.2%</span>
                  <span className="text-xs font-bold text-neutral-300">lift</span>
                </div>
                <Sparkline values={[1.1, 1.8, 2.4, 2.9, 3.6, 4.2]} color="#d1d5db" />
                <div className="absolute inset-0 bg-white/65 flex items-center justify-center rounded-xl">
                  <div className="text-center px-3">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">GrabAds · Signal 4</p>
                    <p className="text-[10px] text-neutral-400">Connect to unlock</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Creative Battery ─────────────────────── */}
          <div id="battery" className="mb-10">
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="text-xl font-bold text-neutral-900">Creative Battery</h2>
              <span className="text-sm text-neutral-500">How long can the current creative execution sustain performance?</span>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
              {/* Big idea anchor */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Anchored to</span>
                <span className="text-sm font-bold text-violet-700">Jadikan Caramu</span>
                <span className="text-xs text-neutral-500">·</span>
                <span className="text-xs font-bold text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-2 py-0.5">ICS 76 · CONDITIONAL</span>
                <span className="text-xs text-neutral-400 hidden sm:block">The battery measures endurance of this specific idea's execution — not the idea itself</span>
              </div>

              <div className="grid lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
                {/* Left: What it means */}
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">What this measures</p>
                    <p className="text-sm text-neutral-700 leading-relaxed">Creative Battery is how many more weeks the current execution format can sustain its engagement trajectory before audiences stop responding. It is not about your campaign idea — the idea (Jadikan Caramu) is intact. It is about whether the <em>way</em> you are expressing it is still working.</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Why it matters now</p>
                    <p className="text-sm text-neutral-700 leading-relaxed">At Week 6, the Meta Feed lifestyle content (60% of your mix) is showing early fatigue — save rate per impression is declining 3% week-on-week even as total impressions grow. Recipe-led formats on TikTok and Reels are not declining. The battery makes this visible before it becomes a campaign dip.</p>
                  </div>
                  <div className="pt-3 border-t border-neutral-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-amber-600">~3 wks</span>
                      <span className="text-sm text-neutral-500">campaign average · weighted by spend</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1.5 font-medium">⚠ Meta feed refresh is the priority — brief issued this week</p>
                  </div>
                </div>

                {/* Right: Per-asset bars */}
                <div className="px-6 py-5">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Endurance by asset</p>
                  <div className="space-y-5">
                    {CREATIVE_ASSETS[0].assets.map((a) => {
                      const barColor = a.pct > 60 ? "#34d399" : a.pct > 30 ? "#f59e0b" : "#f87171";
                      const textColor = a.pct > 60 ? "text-emerald-600" : a.pct > 30 ? "text-amber-600" : "text-red-600";
                      const dotColor = a.pct > 60 ? "bg-emerald-400" : a.pct > 30 ? "bg-amber-400" : "bg-red-400";
                      return (
                        <div key={a.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                              <span className="text-xs font-semibold text-neutral-700 truncate">{a.label}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className={`text-xs font-bold ${textColor}`}>{a.est}</span>
                              <span className="text-xs text-neutral-400">{a.status}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 rounded-md bg-neutral-100 border border-neutral-200 overflow-hidden">
                              <div className="h-full rounded-l-md" style={{ width: `${a.pct}%`, background: barColor, opacity: 0.85 }} />
                            </div>
                            <span className="text-xs font-bold text-neutral-500 w-8 text-right">{a.pct}%</span>
                            <div className="w-1.5 h-2.5 rounded-r-sm shrink-0" style={{ background: barColor, opacity: 0.7 }} />
                          </div>
                          <p className="text-xs text-neutral-400 mt-1 pl-4">{a.format}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-neutral-400 mt-5 pt-4 border-t border-neutral-100 leading-snug">Each reading is derived from the save rate trajectory for that channel over the trailing 3 weeks. A declining save rate per impression — even when total numbers rise — signals creative fatigue.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Q1: Is it working? ────────────────────── */}
          <div id="q1">
            <SectionQ q="01" label="Is it working?">
              <div className="space-y-4">

                {/* ── Posture journey timeline ── */}
                <div className="rounded-2xl bg-neutral-900 px-6 py-5">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Brand posture journey · Weeks 1–6</p>
                  <div className="relative">
                    {/* connector line */}
                    <div className="absolute top-4 left-0 right-0 h-px bg-white/10" />
                    <div className="grid grid-cols-3 relative">
                      {[
                        { weeks: "Wk 1–2", posture: "Fragile", color: "text-red-400", dot: "bg-red-400", note: "Signals launching, below baselines", active: false },
                        { weeks: "Wk 3–4", posture: "Plateauing", color: "text-amber-400", dot: "bg-amber-400", note: "Save rate stalled · Brief issued", active: false },
                        { weeks: "Wk 5–6", posture: "Gaining", color: "text-emerald-400", dot: "bg-emerald-400", note: "5 consecutive weeks of improvement", active: true },
                      ].map((stage) => (
                        <div key={stage.weeks} className="flex flex-col items-center text-center px-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage.active ? stage.dot : "bg-white/10"} z-10 relative mb-3`}>
                            {stage.active && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-0.5">{stage.weeks}</p>
                          <p className={`text-sm font-black ${stage.active ? stage.color : "text-neutral-400"}`}>{stage.posture}</p>
                          <p className="text-[11px] text-neutral-500 mt-1 leading-tight">{stage.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-300 mt-5 leading-relaxed border-t border-white/10 pt-4">
                    <span className="text-emerald-400 font-semibold">Yes, it is working.</span> The campaign has compounded week-on-week from Fragile to Gaining in six weeks — the correct trajectory for Phase 1. The risk is not in strategy or idea quality. It is in execution mix. One brief, actioned this week, is the difference between firing the gate in Week 7 or Week 10.
                  </p>
                </div>

                {/* ── Signal vs gate: visual comparison ── */}
                <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-100">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Signal vs gate threshold · Week 6</p>
                  </div>
                  <div className="px-6 py-4 space-y-5">
                    {[
                      { label: "Save rate", current: 6.1, gate: 8.0, unit: "%", color: "bg-amber-400", gateColor: "amber", gap: "−1.9pp to gate", improving: true, note: "5 consecutive weeks positive" },
                      { label: "Brand search share", current: 14.2, gate: 18.0, unit: "%", color: "bg-blue-400", gateColor: "blue", gap: "−3.8pp to gate", improving: true, note: "Growing 2.1× faster than category" },
                      { label: "UGC authenticity ratio", current: 72, gate: 65, unit: "%", color: "bg-emerald-500", gateColor: "emerald", gap: "7pp above gate ✓", improving: true, note: "Above threshold, holding" },
                    ].map((sig) => {
                      const aboveGate = sig.current >= sig.gate;
                      const pct = Math.min((sig.current / sig.gate) * 100, 100);
                      return (
                        <div key={sig.label}>
                          <div className="flex items-baseline justify-between mb-1.5">
                            <span className="text-sm font-semibold text-neutral-800">{sig.label}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${aboveGate ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{sig.gap}</span>
                            </div>
                          </div>
                          <div className="relative h-2 bg-neutral-100 rounded-full overflow-visible">
                            {/* current */}
                            <div className={`h-full rounded-full ${sig.color} transition-all`} style={{ width: `${pct}%` }} />
                            {/* gate line */}
                            {!aboveGate && (
                              <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neutral-400" style={{ left: "100%" }}>
                                <div className="absolute -top-6 left-1 text-[10px] text-neutral-400 whitespace-nowrap font-semibold">Gate {sig.gate}{sig.unit}</div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[11px] text-neutral-500">{sig.note}</span>
                            <span className="text-[11px] font-bold text-neutral-700">{sig.current}{sig.unit} / {sig.gate}{sig.unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── What's working / not working ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3">What&apos;s driving Gaining</p>
                    <ul className="space-y-2.5">
                      {[
                        { label: "Micro-KOL save rate avg", value: "7.4%", sub: "Above gate threshold" },
                        { label: "Brand search growth", value: "2.1×", sub: "Faster than cooking category" },
                        { label: "UGC authenticity ratio", value: "72%", sub: "Above 65% threshold, holding" },
                        { label: "Save rate trend", value: "+5 wks", sub: "Consecutive weeks positive" },
                      ].map((item) => (
                        <li key={item.label} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm text-emerald-900 font-medium">{item.label}</span>
                              <span className="text-sm font-black text-emerald-700">{item.value}</span>
                            </div>
                            <p className="text-[11px] text-emerald-600">{item.sub}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">What&apos;s not yet working</p>
                    <ul className="space-y-2.5">
                      {[
                        { label: "Gate 1", value: "Not fired", sub: "1.9pp from save rate gate" },
                        { label: "Creative mix", value: "60% lifestyle", sub: "Suppressing save rate signal" },
                        { label: "Mid-tier KOL avg", value: "5.4%", sub: "Below gate · 62% of budget" },
                        { label: "Meta save rate/impression", value: "−3% WoW", sub: "Declining as totals grow — watch" },
                      ].map((item) => (
                        <li key={item.label} className="flex items-start gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm text-neutral-700 font-medium">{item.label}</span>
                              <span className="text-sm font-black text-neutral-900">{item.value}</span>
                            </div>
                            <p className="text-[11px] text-neutral-500">{item.sub}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* ── Critical watch signal ── */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-amber-500 mt-0.5 shrink-0"><path d="M9 2L1.5 15h15L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7v4M9 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <div>
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Critical watch signal</p>
                      <p className="text-sm text-amber-900 leading-relaxed">Meta Feed save rate <span className="font-bold">per impression</span> is declining 3% week-on-week even as total impressions grow. This means reach is increasing but content resonance is decreasing — a sign of creative fatigue, not audience growth. If unaddressed, this will pull the overall save rate down before the gate is reached. The brief issued this week directly targets this.</p>
                    </div>
                  </div>
                </div>

              </div>
            </SectionQ>
          </div>

          {/* ── Q2: What do I need to do? ─────────────── */}
          <div id="q2">
            <SectionQ q="02" label="What do I need to do this week?">
              <div className="space-y-5">
                {week.actions.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 pt-6 pb-4">
                      <div className="flex items-start gap-4">
                        <span className="w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-base font-bold text-neutral-900 leading-snug">{a.finding}</p>
                          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{a.implication}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mx-5 mb-5 rounded-xl bg-neutral-900 px-5 py-4">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">→ {a.brief.label}</p>
                      <ul className="space-y-2">
                        {a.brief.lines.map((line, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-sm text-neutral-200 leading-relaxed">
                            <span className="text-emerald-500 shrink-0 mt-0.5 font-bold">·</span>
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}

                {/* ── Delivery & Acknowledgement Record ── */}
                <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-50 border-b border-neutral-200">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-neutral-500"><path d="M2 4l6 5 6-5M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Delivery &amp; acknowledgement record</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-xs font-semibold text-amber-700">2 of 3 acknowledged</span>
                    </div>
                  </div>

                  <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Report locked</span>
                    <span className="text-xs font-semibold text-neutral-700">17 Aug 2026 · 09:00 MYT</span>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className="text-xs text-neutral-500">Strategist: Janine Wai · ShiftImpact OS</span>
                    <span className="text-xs text-neutral-400 ml-auto">Report cannot be edited after lock</span>
                  </div>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-5 py-2.5">Recipient</th>
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-4 py-2.5 hidden sm:table-cell">Role</th>
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-4 py-2.5 hidden md:table-cell">Delivered</th>
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-4 py-2.5">Read</th>
                        <th className="text-left font-bold text-neutral-400 uppercase tracking-widest px-4 py-2.5">Acknowledgement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "Farah Nabilah", role: "Brand Marketing Lead", type: "Required owner", delivered: "17 Aug · 09:01", read: "17 Aug · 09:14", ack: "Acknowledged", ackTime: "17 Aug · 09:31", tone: "green" },
                        { name: "Azlan Razak", role: "Agency Account Director", type: "Required owner", delivered: "17 Aug · 09:01", read: "17 Aug · 11:42", ack: "Acknowledged", ackTime: "17 Aug · 11:55", tone: "green" },
                        { name: "Priya Menon", role: "Media Planner", type: "CC", delivered: "17 Aug · 09:01", read: "—", ack: "Awaiting", ackTime: "", tone: "amber" },
                      ].map((r) => (
                        <tr key={r.name} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-semibold text-neutral-800">{r.name}</p>
                            <p className="text-neutral-400 text-[10px]">{r.type}</p>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{r.role}</td>
                          <td className="px-4 py-3 text-neutral-500 hidden md:table-cell">{r.delivered}</td>
                          <td className="px-4 py-3 text-neutral-600">{r.read}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${
                                r.tone === "green" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {r.tone === "green" ? "✓ " : "⏳ "}{r.ack}
                              </span>
                              {r.ackTime && <span className="text-neutral-400 text-[10px]">{r.ackTime}</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100">
                    <p className="text-[10px] text-neutral-400 leading-snug">Read receipts are recorded when a recipient opens the portal link. Acknowledgement is logged when they click the confirm button. This record is append-only — no entry can be removed. In any dispute about brief receipt or timing, this log is the reference.</p>
                  </div>
                </div>

                {/* ── Brief Compliance Report ── */}
                <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="flex items-start justify-between px-5 py-3.5 bg-neutral-50 border-b border-neutral-200 flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-neutral-500"><path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/></svg>
                        <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Brief compliance report</p>
                      </div>
                      <p className="text-[11px] text-neutral-500 pl-5">Week 5 brief · executed in Week 6 · required before this report publishes</p>
                    </div>
                    {complianceSubmitted ? (
                      <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 ${complianceRatingColor}`}>
                        <span className="text-xs font-black">{complianceRating}</span>
                        <span className="text-xs font-semibold">{complianceScore}% compliance</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-xs font-semibold text-amber-700">Pending submission</span>
                      </div>
                    )}
                  </div>

                  {complianceSubmitted ? (
                    /* ── Submitted summary view ── */
                    <div className="divide-y divide-neutral-100">
                      {COMPLIANCE_ITEMS.map((item, i) => {
                        const s = complianceStatus[i];
                        const r = complianceReasons[i];
                        return (
                          <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                            <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              s === "done" ? "bg-emerald-100" : s === "partial" ? "bg-amber-100" : "bg-red-100"
                            }`}>
                              {s === "done"
                                ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                : s === "partial"
                                ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              }
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-neutral-800">{item}</p>
                              {r && <span className="inline-block mt-1 text-[10px] font-semibold bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5">{r}</span>}
                            </div>
                            <span className={`text-[11px] font-bold whitespace-nowrap ${
                              s === "done" ? "text-emerald-600" : s === "partial" ? "text-amber-600" : "text-red-500"
                            }`}>
                              {s === "done" ? "Done in full" : s === "partial" ? "Done partially" : "Not done"}
                            </span>
                          </div>
                        );
                      })}
                      <div className="px-5 py-3 bg-neutral-50 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#737373" strokeWidth="1.2"/><path d="M6 4v4M6 3v.5" stroke="#737373" strokeWidth="1.2" strokeLinecap="round"/></svg>
                        <p className="text-[10px] text-neutral-400">Submitted by Azlan Razak · Agency Account Director · {new Date().toLocaleDateString("en-MY", { day: "numeric", month: "short" })} · {new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })} MYT · Compliance score informs prediction variance analysis</p>
                      </div>
                    </div>
                  ) : (
                    /* ── Interactive chip form ── */
                    <div>
                      <div className="divide-y divide-neutral-100">
                        {COMPLIANCE_ITEMS.map((item, i) => (
                          <div key={i} className="px-5 py-4">
                            <p className="text-sm font-medium text-neutral-800 mb-3">{item}</p>

                            {/* Status chips */}
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(["done", "partial", "skipped"] as ComplianceStatus[]).map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    const next = [...complianceStatus];
                                    next[i] = opt;
                                    setComplianceStatus(next);
                                    if (opt === "done") {
                                      const nextR = [...complianceReasons];
                                      nextR[i] = null;
                                      setComplianceReasons(nextR);
                                    }
                                  }}
                                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                                    complianceStatus[i] === opt
                                      ? opt === "done" ? "bg-emerald-600 border-emerald-600 text-white"
                                        : opt === "partial" ? "bg-amber-500 border-amber-500 text-white"
                                        : "bg-red-500 border-red-500 text-white"
                                      : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400"
                                  }`}
                                >
                                  {opt === "done" ? "Done in full" : opt === "partial" ? "Done partially" : "Not done"}
                                </button>
                              ))}
                            </div>

                            {/* Reason chips — appear only when partial or skipped */}
                            {needsReason(i) && (
                              <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                                <span className="text-[10px] text-neutral-400 font-semibold self-center mr-1">Why?</span>
                                {COMPLIANCE_REASONS.map(r => (
                                  <button
                                    key={r}
                                    onClick={() => {
                                      const next = [...complianceReasons];
                                      next[i] = r;
                                      setComplianceReasons(next);
                                    }}
                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                                      complianceReasons[i] === r
                                        ? "bg-neutral-800 border-neutral-800 text-white"
                                        : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400"
                                    }`}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Submit */}
                      <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-[11px] text-neutral-400 leading-snug">
                          {readyToSubmit
                            ? "Ready to submit — this report will publish once compliance is confirmed."
                            : "Select a status for each brief action. If partial or not done, select a reason."}
                        </p>
                        <button
                          onClick={() => { if (readyToSubmit) setComplianceSubmitted(true); }}
                          disabled={!readyToSubmit}
                          className={`text-sm font-bold px-5 py-2 rounded-xl transition-all ${
                            readyToSubmit
                              ? "bg-neutral-900 text-white hover:bg-neutral-700"
                              : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                          }`}
                        >
                          Submit compliance report
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </SectionQ>
          </div>

          {/* ── Q3: Are we on track? ──────────────────── */}
          <div id="q3">
            <SectionQ q="03" label="Are we on track for the gate?">
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-6 py-6 space-y-5">
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">{week.horizon.gateLabel}</p>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-2xl font-black text-neutral-900">Gate not yet fired</p>
                  </div>
                  <p className="text-sm font-semibold text-amber-900 border-l-2 border-amber-500 pl-3 bg-amber-100/60 py-2 pr-3 rounded-r-lg">
                    {week.horizon.gateCondition}
                  </p>
                </div>

                <div className="pt-4 border-t border-amber-300">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3">Signal horizon — next 4 weeks</p>
                  <p className="text-sm text-neutral-800 leading-relaxed mb-4">{week.horizon.prediction}</p>
                  <div className="space-y-3">
                    {week.horizon.horizonItems.map((h, i) => (
                      <div key={i} className="flex items-start gap-4 bg-white/60 rounded-xl px-4 py-3">
                        <span className="text-sm font-bold text-amber-800 shrink-0 w-24">{h.timeframe}</span>
                        <p className="text-sm text-neutral-700 font-medium">{h.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-amber-300 flex items-center gap-3 bg-amber-100/50 rounded-xl px-4 py-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                  <p className="text-sm font-bold text-neutral-900">{week.horizon.budgetStatus}</p>
                </div>
              </div>
            </SectionQ>
          </div>

          {/* ── Deep dive ─────────────────────────────── */}
          <div id="detail">
            <div className="mb-5">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">04</span>
                <h2 className="text-xl font-bold text-neutral-900">Deep dive</h2>
              </div>
              <p className="text-sm text-neutral-600">Supporting evidence behind the findings above.</p>
            </div>

            <div className="space-y-3">

              <Collapsible label="Signal performance · Week 6">
                <div className="space-y-5">
                  {week.signals.map(s => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-neutral-800">{s.label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-neutral-900">{s.actual}</span>
                          <span className="text-sm text-neutral-500">/ {s.target}</span>
                          <span className="text-sm font-semibold text-emerald-700">↑ {s.delta}</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${toneBar(s.tone)}`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Collapsible>

              <Collapsible label="KOL programme · 5 active">
                <div className="space-y-3 mb-2">
                  {KOLS.map(k => (
                    <div key={k.handle} className={`rounded-xl border p-4 ${
                      k.tone === "green" ? "border-green-200 bg-green-50" :
                      k.tone === "amber" ? "border-amber-200 bg-amber-50/50" :
                      "border-red-200 bg-red-50/40"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${toneDot(k.tone)}`} />
                            <span className="text-sm font-bold text-neutral-900">{k.handle}</span>
                            <span className="text-xs font-medium text-neutral-500 border border-neutral-300 rounded-full px-2 py-0.5">{k.tier}</span>
                          </div>
                          <p className="text-sm text-neutral-600 ml-4.5">
                            Activation: <span className="font-semibold text-neutral-800">{k.activation}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xl font-black ${k.tone === "green" ? "text-emerald-700" : k.tone === "amber" ? "text-amber-700" : "text-red-700"}`}>
                            {k.saveRate}%
                          </p>
                          <p className="text-xs text-neutral-500">save rate</p>
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                            k.tone === "green" ? "bg-green-100 text-green-900" :
                            k.tone === "amber" ? "bg-amber-100 text-amber-900" :
                            "bg-red-100 text-red-900"
                          }`}>{k.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm border-t border-neutral-200 pt-4">
                  <span className="text-neutral-600">Programme avg save rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-700">6.3%</span>
                    <span className="text-neutral-500">vs gate ≥8%</span>
                  </div>
                </div>
              </Collapsible>

              <Collapsible label="Category benchmark · ICS comparison">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3 pr-4">Brand</th>
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3 pr-4">Campaign</th>
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3 pr-4">ICS</th>
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3 pr-4">Rating</th>
                        <th className="text-left text-sm font-semibold text-neutral-600 pb-3">Key gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {COMPETITORS.map(c => (
                        <tr key={c.brand} className={c.isSelf ? "bg-violet-50" : ""}>
                          <td className={`py-3 pr-4 text-sm font-bold ${c.isSelf ? "text-violet-800" : "text-neutral-800"}`}>{c.brand}</td>
                          <td className="py-3 pr-4 text-sm text-neutral-700">{c.campaign}</td>
                          <td className={`py-3 pr-4 text-2xl font-black leading-none ${c.isSelf ? "text-violet-700" : "text-neutral-800"}`}>{c.ics}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs font-bold ${c.rating === "REWORK" ? "text-amber-700" : "text-violet-700"}`}>{c.rating}</span>
                          </td>
                          <td className="py-3 text-sm text-neutral-600">{c.gap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Collapsible>

              <Collapsible label="Idea quality score · Jadikan Caramu">
                <div className="flex items-start gap-5">
                  <div className="text-center shrink-0">
                    <span className="text-5xl font-black text-violet-700">{week.ics.score}</span>
                    <p className="text-sm font-bold text-violet-600 mt-0.5">{week.ics.rating}</p>
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed pt-1">{week.ics.note}</p>
                </div>
              </Collapsible>

              <Collapsible label="Phase roadmap · Jul–Dec 2026">
                <div className="space-y-3">
                  {week.roadmap.map((r, i) => (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${r.active ? "border-violet-200 bg-violet-50" : "border-neutral-200 bg-neutral-50"}`}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${r.active ? "bg-violet-500" : "bg-neutral-300"}`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className={`text-sm font-bold ${r.active ? "text-violet-900" : "text-neutral-500"}`}>{r.phase}</p>
                          <span className="text-xs text-neutral-500">{r.dates}</span>
                          {!r.active && <span className="text-[10px] font-bold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded">LOCKED</span>}
                        </div>
                        <p className="text-sm text-neutral-600">{r.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-neutral-900 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-white">The ShiftImpact Rule</p>
                  <p className="text-sm text-neutral-300 mt-0.5">Budget moves because a signal fired and held — not because a date arrived.</p>
                </div>
              </Collapsible>

            </div>
          </div>

          {/* ── Full Intelligence Suite ───────────────── */}
          <div id="premium" className="mt-12">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">05</span>
              <h2 className="text-xl font-bold text-neutral-900">Full Intelligence Suite</h2>
            </div>
            <p className="text-sm text-neutral-600 mb-6">What activates when the client connects business performance data. Each layer below is live in ShiftImpact OS — this shows the maximum picture when all data is shared.</p>

            {/* ── Prediction Accuracy Record ── CENTREPIECE ── */}
            <div className="rounded-2xl border-2 border-neutral-900 bg-white shadow-sm overflow-hidden mb-5">
              {/* Header */}
              <div className="bg-neutral-900 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Prediction Intelligence</p>
                  <h3 className="text-lg font-black text-white">Prediction Accuracy Record</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Every prediction made is locked at publication. Every outcome is verified the following week.</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-4xl font-black text-emerald-400">5</span>
                    <span className="text-lg text-neutral-400 font-bold">/ 5</span>
                  </div>
                  <p className="text-xs text-emerald-400 font-bold">Verified ✓</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Weeks 1–5 · 100% accuracy</p>
                </div>
              </div>

              {/* Prior predictions table */}
              <div className="px-6 pt-5 pb-4">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Prior predictions vs what actually happened</p>
                <div className="space-y-2">
                  {[
                    {
                      week: "Wk 1 → 2",
                      prediction: "Save rate will reach 4.6–4.9% as UGC seeding kicks in",
                      actual: "4.8% ✓",
                      delta: "Within range",
                      verified: true,
                    },
                    {
                      week: "Wk 2 → 3",
                      prediction: "UGC authenticity ratio will lift +3–5pp if seeding is actioned",
                      actual: "+3pp ✓",
                      delta: "Bottom of range",
                      verified: true,
                    },
                    {
                      week: "Wk 3 → 4",
                      prediction: "Mid-tier KOLs will underperform micro-tier on save rate (below 6%)",
                      actual: "5.2–5.6% ✓",
                      delta: "Confirmed",
                      verified: true,
                    },
                    {
                      week: "Wk 4 → 5",
                      prediction: "Recipe content will outperform lifestyle at 2×+ save rate ratio",
                      actual: "2.3× ✓",
                      delta: "Confirmed",
                      verified: true,
                    },
                    {
                      week: "Wk 5 → 6",
                      prediction: "Campaign health will reach 72–76 if KOL rebalancing is actioned",
                      actual: "74 ✓",
                      delta: "Centre of range",
                      verified: true,
                    },
                  ].map((p, i) => (
                    <div key={i} className="grid grid-cols-[80px_1fr_140px_90px] gap-3 items-center py-2.5 border-b border-neutral-100 last:border-0">
                      <span className="text-xs font-bold text-neutral-500 shrink-0">{p.week}</span>
                      <p className="text-sm text-neutral-700">{p.prediction}</p>
                      <div className="text-right">
                        <span className="text-sm font-bold text-neutral-900">{p.actual}</span>
                        <p className="text-[10px] text-neutral-500">{p.delta}</p>
                      </div>
                      <div className="flex justify-end">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current week's locked predictions */}
              <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">This week&apos;s predictions — locked at publication</p>
                  <span className="text-[10px] font-bold text-neutral-500 border border-neutral-300 rounded-full px-2.5 py-1 bg-white">
                    🔒 17 Aug 2026 · 09:00 MYT · Cannot be edited
                  </span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "Save rate · Wk 7", prediction: "Will reach 7.0–7.6% if recipe brief is actioned this week", confidence: "81%", timeframe: "Week 7" },
                    { label: "Gate 1 fire", prediction: "56% probability by Wk 7 · rises to 78% by Wk 8 if brief actioned", confidence: "78%", timeframe: "Week 7–8" },
                    { label: "Creative battery", prediction: "Meta Feed format will fall below 20% by Week 8 without refresh", confidence: "73%", timeframe: "Week 8" },
                    { label: "Campaign health", prediction: "Will reach 77–80 by Week 8 if KOL + creative brief both actioned", confidence: "69%", timeframe: "Week 8" },
                  ].map((p, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white border border-neutral-200 rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">{p.label} · {p.timeframe}</p>
                        <p className="text-sm text-neutral-800">{p.prediction}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-neutral-900">{p.confidence}</p>
                        <p className="text-[10px] text-neutral-400">confidence</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-3 leading-snug">These predictions will be verified against actuals in the Week 7 report. Prediction accuracy is your measure of how well ShiftImpact OS understands your campaign.</p>
              </div>

              {/* Prediction Miss Protocol */}
              <div className="border-t border-neutral-200 px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm">🎯</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-700 mb-2">When a prediction misses — how we respond</p>
                    <p className="text-xs text-neutral-500 leading-relaxed mb-3">A variance from a predicted range is always recorded in full and never removed from the log. When it occurs, the following week&apos;s report opens with a variance analysis — not an attribution of blame, but a factual examination of which input signal moved differently from what the model expected, and by how much.</p>
                    <div className="space-y-2">
                      {[
                        { label: "Signal deviation", text: "We identify which specific signal — save rate, UGC ratio, search share, or KOL performance — diverged from its modelled trajectory, and quantify the delta between predicted and actual." },
                        { label: "External factors", text: "We examine whether a market condition changed outside the campaign's control: platform algorithm update, competitor activity, seasonal demand shift, or macro event. These are documented with evidence, not assumed." },
                        { label: "Model recalibration", text: "If the variance reveals a gap in how the model weights a variable, the weighting is adjusted for subsequent predictions. The recalibration rationale is disclosed in the report." },
                        { label: "Revised forward outlook", text: "The following week's predictions are reissued with updated confidence intervals, reflecting what the miss has taught us about this specific campaign's dynamics." },
                      ].map((item) => (
                        <div key={item.label} className="flex gap-2">
                          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide shrink-0 w-28 pt-0.5">{item.label}</span>
                          <p className="text-[11px] text-neutral-500 leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-neutral-100 leading-relaxed">A prediction miss is evidence the system is making falsifiable claims — not directional statements designed to be unfalsifiable. Sustained accuracy below 70% over three consecutive weeks triggers a formal model review, disclosed to the client with findings.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Business Outcome Tracking */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm px-5 py-5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Requires: sales data</span>
                </div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Business Outcome Tracking</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-700">Revenue lift vs pre-campaign baseline</p>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">+12.4%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-700">Sales velocity (units/week)</p>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">+8.1%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-700">Customer acquisition cost</p>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">RM 4.20 → RM 3.61</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-700">Market share (cooking sauces, MY)</p>
                    <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">14.2% → 15.1%</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-400">Signal → sales lag is 10–14 days. Health score at 74 predicts revenue lift 2 weeks forward.</p>
                </div>
              </div>

              {/* Media ROI Waterfall */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm px-5 py-5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Requires: media spend data</span>
                </div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Media ROI by Channel</p>
                <div className="space-y-2.5">
                  {[
                    { channel: "TikTok Creator", roas: "4.8×", bar: 95, tone: "green" },
                    { channel: "Meta Feed", roas: "3.2×", bar: 64, tone: "green" },
                    { channel: "Google Search", roas: "6.1×", bar: 100, tone: "green" },
                    { channel: "Shopee Ads", roas: "1.8×", bar: 36, tone: "amber" },
                    { channel: "KOL (Mid-tier)", roas: "0.9×", bar: 18, tone: "red" },
                  ].map(r => (
                    <div key={r.channel}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-neutral-700">{r.channel}</p>
                        <span className={`text-xs font-bold ${r.tone === "green" ? "text-emerald-600" : r.tone === "amber" ? "text-amber-600" : "text-red-600"}`}>{r.roas} ROAS</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.tone === "green" ? "bg-emerald-400" : r.tone === "amber" ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${r.bar}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-400">Mid-tier KOL ROAS below 1.0× confirms Phase 2 budget reallocation recommendation above.</p>
                </div>
              </div>

              {/* AI Brand Visibility */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm px-5 py-5 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">AI monitoring</span>
                </div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">AI Brand Visibility</p>
                <p className="text-xs text-neutral-500 mb-4">Is Cooks appearing in AI-generated answers when consumers ask about cooking sauces?</p>
                <div className="space-y-3">
                  {[
                    { query: '"best cooking sauce Malaysia"', result: "Cooks mentioned · Position 3", tone: "amber" },
                    { query: '"resipi ayam percik sauce"', result: "Not mentioned · Competitor gap", tone: "red" },
                    { query: '"Cooks sos review"', result: "Brand results · Full control", tone: "green" },
                    { query: '"halal cooking sauce brand"', result: "Cooks mentioned · Position 2", tone: "green" },
                  ].map(v => (
                    <div key={v.query} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${v.tone === "green" ? "bg-emerald-400" : v.tone === "amber" ? "bg-amber-400" : "bg-red-400"}`} />
                      <div>
                        <p className="text-xs font-mono text-neutral-600">{v.query}</p>
                        <p className={`text-xs font-medium mt-0.5 ${v.tone === "green" ? "text-emerald-700" : v.tone === "amber" ? "text-amber-700" : "text-red-700"}`}>{v.result}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">AI Eligibility Score</p>
                    <span className="text-sm font-bold text-amber-600">61 / 100</span>
                  </div>
                </div>
              </div>

              {/* Social Currency + Creative Fatigue */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm px-5 py-5">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Advanced Signals</p>
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-neutral-800">Social Currency Index</p>
                      <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">Tier 2 of 5</span>
                    </div>
                    <p className="text-xs text-neutral-600">Earned amplification rate: content is being saved and shared but not yet voluntarily advocated. UGC seeding this week is the trigger for Tier 3.</p>
                  </div>
                  <div className="pt-4 border-t border-neutral-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-neutral-800">Predictive Gate Timing</p>
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">78% confidence</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Gate fires Week 7</span>
                        <span className="font-bold text-neutral-800">22%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Gate fires Week 8</span>
                        <span className="font-bold text-emerald-700">56%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">Gate fires Week 9+</span>
                        <span className="font-bold text-amber-700">22%</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">Shifts if brief is actioned this week. Week 7 probability rises to 48%.</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-6 rounded-2xl bg-neutral-900 px-6 py-5">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">What this means for the conversation</p>
              <p className="text-sm text-white leading-relaxed">This dashboard is not reporting on what happened. It is telling you what to do next and why — in time to act. Business outcome data closes the loop between signal intelligence and revenue. When both are running together, every budget decision has a number behind it.</p>
            </div>
          </div>

          {/* ── Report History ────────────────────────── */}
          <div id="history" className="mt-12">
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">06</span>
              <h2 className="text-xl font-bold text-neutral-900">Report History</h2>
              <span className="text-sm text-neutral-500">All weekly intelligence records for this campaign</span>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="text-left text-xs font-bold text-neutral-400 uppercase tracking-widest px-5 py-3">Week</th>
                    <th className="text-left text-xs font-bold text-neutral-400 uppercase tracking-widest px-4 py-3 hidden sm:table-cell">Date</th>
                    <th className="text-left text-xs font-bold text-neutral-400 uppercase tracking-widest px-4 py-3">Health</th>
                    <th className="text-left text-xs font-bold text-neutral-400 uppercase tracking-widest px-4 py-3 hidden md:table-cell">Posture</th>
                    <th className="text-left text-xs font-bold text-neutral-400 uppercase tracking-widest px-4 py-3 hidden lg:table-cell">Save rate</th>
                    <th className="text-left text-xs font-bold text-neutral-400 uppercase tracking-widest px-4 py-3">Key action</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {WEEK_REPORTS.slice().reverse().map((w, idx) => {
                    const isCurrent = w.n === 6;
                    return (
                      <tr key={w.n} className={`border-b border-neutral-100 last:border-0 transition-colors ${isCurrent ? "bg-emerald-50" : "hover:bg-neutral-50"}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${w.dot === "green" ? "bg-emerald-400" : w.dot === "amber" ? "bg-amber-400" : "bg-red-400"}`} />
                            <span className="font-bold text-neutral-900">Wk {w.n}</span>
                            {isCurrent && <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold rounded-full px-1.5 py-0.5">Current</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-neutral-500 hidden sm:table-cell">{w.date.replace(" 2026", "")}</td>
                        <td className="px-4 py-3.5">
                          <span className={`font-bold ${w.health >= 70 ? "text-emerald-600" : w.health >= 60 ? "text-amber-600" : "text-red-600"}`}>{w.health}</span>
                          <span className="text-neutral-400">/100</span>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className={`text-xs font-semibold ${w.dot === "green" ? "text-emerald-700" : w.dot === "amber" ? "text-amber-700" : "text-red-700"}`}>{w.posture}</span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="font-medium text-neutral-700">{w.save}</span>
                        </td>
                        <td className="px-4 py-3.5 text-neutral-600 text-xs leading-snug">{w.action}</td>
                        <td className="px-3 py-3.5">
                          <button
                            onClick={() => generateWeeklyPDF(w)}
                            title={`Download Week ${w.n} PDF report`}
                            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-400 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap">
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8 2v9M4 8l4 4 4-4"/><rect x="2" y="12" width="12" height="2" rx="1"/>
                            </svg>
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 pt-5 border-t border-neutral-200 flex items-center justify-between text-sm text-neutral-500">
            <span>ShiftImpact OS</span>
            <span>Week 6 · 17 Aug 2026 · Reviewed by your strategist</span>
          </div>

        </div>
      </main>

      {/* ═══════════════════════════════════════ AI ASSISTANT ════════════════════════════════ */}
      <AskWidget />

    </div>
  );
}
