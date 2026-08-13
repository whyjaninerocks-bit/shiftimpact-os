// lib/email/decide-report.ts
// Generates a personalised HTML email report for each /decide assumption category.
// Called by /api/widget-lead PATCH after email is captured.
//
// Categories: press | hold | pivot | stop | investigate
// Decision text is inserted verbatim into the quote band.

interface CategoryContent {
  verdict: string;
  verdictSub: string;
  scoreSegs: number; // 1–5 filled segments
  decisionStyle: string;
  recommendation: string;
  urgency: string;
  realProblem: string;
  approach: string;
  dataRead: string;
  missing: string;
  thisWeek: string;
  bridgeQuestion: string;
  watches: { metric: string; detail: string; tag: string; tagClass: "signal-green" | "signal-amber" | "signal-red" }[];
  benchmarks: { title: string; figure: string; context: string; position: string; posClass: "signal-green" | "signal-amber" | "signal-red" }[];
  timeAlert: string;
  ctaHeadline: string;
}

const CONTENT: Record<string, CategoryContent> = {
  press: {
    verdict: "More spend is not the problem — what that spend will hit is.",
    verdictSub: "You are ready to accelerate. That is a strong instinct when it is right. Before you press, confirm whether the signal you are about to amplify is actually moving in the direction you think.",
    scoreSegs: 3,
    decisionStyle: "You move fast when you see opportunity. The risk is amplifying the wrong signal at scale.",
    recommendation: "Investigate before you press",
    urgency: "Medium — confirm the signal first, then accelerate",
    realProblem: "You are about to spend money making a flat signal louder",
    approach: "Your instinct to press is usually your best asset. The risk in this situation is that you are reading the wrong indicator as momentum. Increasing spend when the underlying signal is mixed does not create momentum. It creates noise at higher volume. And at higher volume, the gap between what you expected and what you got is more expensive to explain.",
    dataRead: "The number you are pointing at as justification for more spend is a delivery metric, not a behaviour metric. Delivery tells you the campaign ran. Behaviour tells you the campaign worked. Before you increase the budget, confirm that the people who received this campaign are doing something different as a result of it — not just that more people have now seen it.",
    missing: "There is a specific cohort of people from this campaign who engaged — not just saw it, but clicked, saved, searched, or came back. That cohort has a conversion rate. If that rate is not above your category baseline, increasing spend will not improve the outcome. It will scale the problem.",
    thisWeek: "Pull the engaged cohort from this campaign — everyone who went beyond a passive impression. Check their conversion rate against your last three campaigns in the same category. If it is equal to or above that baseline, press. If it is below, increasing spend will produce a worse return than the previous campaign. You have that data already. The decision takes one comparison.",
    bridgeQuestion: "If you doubled spend today and got exactly the same conversion rate you are seeing now — would that be enough, or would you be back in this same conversation in three weeks?",
    watches: [
      { metric: "Engaged cohort conversion rate", detail: "The people who went beyond passive exposure. This is the number that justifies more spend — not total reach.", tag: "Must be above category baseline", tagClass: "signal-amber" },
      { metric: "Cost per qualified action at scale", detail: "As you increase budget, this should stay flat or fall. If it rises with scale, the audience you are reaching at higher spend is weaker.", tag: "Watch: should not rise with scale", tagClass: "signal-amber" },
      { metric: "Signal velocity — week on week trend", detail: "Is the metric trending up consistently, or has it plateaued? Press works when something is already moving.", tag: "Green only if trending up 2 or more weeks", tagClass: "signal-green" },
    ],
    benchmarks: [
      { title: "Minimum engaged cohort rate before scaling", figure: "4 to 7%", context: "The typical baseline across SEA markets before a budget increase produces proportional returns.", position: "Check your number first", posClass: "signal-amber" },
      { title: "Return on incremental spend in weeks 4 to 8", figure: "1.8x to 2.4x", context: "What brands in this category typically see when they scale a campaign that is already performing.", position: "Only achievable if signal is moving", posClass: "signal-amber" },
    ],
    timeAlert: "The window to scale this campaign effectively is not unlimited. If you press and the signal is not there, you will have spent the remaining budget and still face the same decision. Confirm the signal today, then move.",
    ctaHeadline: "Before you press — a 90-minute session confirms whether the signal is there to amplify or whether you are about to buy reach that does not convert.",
  },

  hold: {
    verdict: "You are not holding. You are deferring a decision you do not yet have a name for.",
    verdictSub: "Holding is a legitimate call when you know exactly what signal would change your mind. If you cannot name that signal precisely, you are not holding — you are waiting without a plan.",
    scoreSegs: 2,
    decisionStyle: "You are cautious by instinct. That saves you from bad calls — and sometimes from good ones.",
    recommendation: "Define your exit condition before you hold",
    urgency: "Medium — the clock is running whether you act or not",
    realProblem: "You are holding without knowing what you are waiting for",
    approach: "Holding is a decision. It just does not feel like one because it does not require you to act on anything immediately. The discipline of holding well is knowing exactly what you are watching for — which specific number, trend, or event, if it appeared, would move you out of hold. Without that, you are not managing risk. You are postponing the decision until external pressure forces it.",
    dataRead: "Right now, you have mixed signals. That is normal in the middle of most campaigns. The mistake is treating signal ambiguity as a reason to wait, when it is actually a reason to define your decision criteria more precisely. Every week you wait, you are losing time that you could spend measuring the thing that would actually tell you what to do.",
    missing: "You have not yet defined your exit conditions. What signal, if it improved, would make you press? What signal, if it worsened, would make you stop? Right now, your hold position has no boundary conditions — which means external pressure (a stakeholder deadline, a quarterly review, a competitor move) will eventually make the decision for you, under worse conditions than you have today.",
    thisWeek: "Write down two sentences: the condition that would make you press, and the condition that would make you stop. Specific metrics, specific thresholds. Once you have written them, check your current data against those thresholds. You will either discover you already know what to do — or you will discover the data you need is not the data you have been looking at.",
    bridgeQuestion: "If you hold for another three weeks and nothing changes, what will you decide then — and why is that different from the decision you could make right now?",
    watches: [
      { metric: "Your defined exit condition", detail: "The specific metric and threshold that ends the hold. If you do not have this written down, your hold has no structure.", tag: "Required: define before you wait", tagClass: "signal-red" },
      { metric: "Rate of signal change week on week", detail: "If the signal is trending — even slowly — in one direction, that is information. Flat signals are the ones that genuinely require more time.", tag: "Flat or trending? The answer is different", tagClass: "signal-amber" },
      { metric: "External window pressure", detail: "Campaign end date, competitor activity, seasonal moment. Any of these can make your hold position irrelevant before you have resolved it.", tag: "Know your deadline", tagClass: "signal-amber" },
    ],
    benchmarks: [
      { title: "Time for signal clarity to emerge after launch", figure: "10 to 14 days", context: "In most SEA brand campaigns, the signal direction becomes clear within two weeks of launch — if you know which signal to read.", position: "You should have clarity by now", posClass: "signal-amber" },
      { title: "Cost of holding without exit conditions", figure: "Weeks 6 to 8", context: "The window where a hold without a plan becomes a de facto continuation decision — budget is spent, time is gone.", position: "You are in this window now", posClass: "signal-red" },
    ],
    timeAlert: "A hold without defined exit conditions is a continuation decision in disguise. The budget keeps running. The time keeps passing. At the end of a hold, you still have to make the same decision — just with less time and less budget to act on it.",
    ctaHeadline: "A 90-minute diagnostic session defines your exit conditions and tells you which signal, if it moved, would give you the answer you are waiting for.",
  },

  pivot: {
    verdict: "The problem is probably not where the campaign is running.",
    verdictSub: "Switching channels is the most visible change you can make — and often the most expensive misdirection. Before you pivot, confirm whether the gap is in delivery, creative, proposition, or timing.",
    scoreSegs: 3,
    decisionStyle: "When something is not working, you want to act. Pivoting feels like action. Make sure it is the right action.",
    recommendation: "Diagnose the layer before you change the surface",
    urgency: "High — a wrong pivot is harder to diagnose than the original problem",
    realProblem: "You are about to change the wrong variable",
    approach: "Pivoting is the right move when the evidence points clearly to a delivery problem — when the channel is mismatched to the audience, or when reach is not happening at the right time or place. But a pivot that changes the surface without touching the proposition does not fix a proposition problem. It just makes the same proposition less efficient because you are now optimising for a new channel from scratch.",
    dataRead: "The data you would need to confirm a channel problem is different from what most teams look at. Channel effectiveness is not just reach or impressions — it is whether the specific audience your category requires is actually present in that channel when your campaign runs. If the audience is there and not responding, the channel is not the problem. The problem is upstream — in the message, the offer, or the timing.",
    missing: "Before you pivot, you need to answer one question: is the campaign failing to reach the right people, or is it reaching the right people and failing to move them? Those are different problems with different fixes. A pivot solves the first. Changing the creative, proposition, or timing solves the second. Right now, you do not have a clear answer to which problem you have.",
    thisWeek: "Pull the demographic and behavioural profile of everyone who engaged with this campaign — not everyone who saw it, but everyone who did something as a result. Compare that profile to your defined target audience. If the profiles are mismatched, the channel is delivering the wrong audience — and a pivot is the right call. If the profiles match and engagement is still low, the channel is working and something else is wrong. That comparison takes one analysis.",
    bridgeQuestion: "If you ran the exact same campaign in a different channel tomorrow and got the same result, what would you change next — and does that tell you something about what the actual problem is?",
    watches: [
      { metric: "Audience match rate on current channel", detail: "The overlap between who you are reaching and your defined target audience. Below 40% suggests a channel problem. Above 60% suggests the channel is fine and the message is the issue.", tag: "Defines whether pivot is the right call", tagClass: "signal-amber" },
      { metric: "Engagement rate by audience segment", detail: "If your target audience is engaging at a higher rate than non-target audiences, the channel is doing its job — the broader message needs tightening.", tag: "Segment data before you decide", tagClass: "signal-amber" },
      { metric: "Creative performance across formats", detail: "If one format in the current channel is significantly outperforming others, the pivot is within the channel, not away from it.", tag: "Check format data first", tagClass: "signal-green" },
    ],
    benchmarks: [
      { title: "Audience match rate threshold for channel viability", figure: "40 to 55%", context: "The typical minimum overlap between reached audience and target audience before a channel is considered effective for conversion-stage campaigns in SEA markets.", position: "Pull your match rate before deciding", posClass: "signal-amber" },
      { title: "Cost of a mid-campaign channel pivot", figure: "2 to 3 weeks", context: "The typical time and budget cost of rebuilding targeting, creative, and bidding strategy in a new channel from zero.", position: "High cost if it is the wrong diagnosis", posClass: "signal-red" },
    ],
    timeAlert: "A pivot mid-campaign restarts your learning curve in a new channel. If the original diagnosis was wrong, you will spend the remaining budget establishing baseline performance in the new channel rather than improving the original.",
    ctaHeadline: "A 90-minute session tells you which layer the problem sits in before you change the channel — and saves you the cost of a pivot that does not fix the actual issue.",
  },

  stop: {
    verdict: "You might be right. But the evidence required to stop confidently is higher than most teams realise.",
    verdictSub: "Stopping is the correct call when the signal is clear. Make sure what you are reading is genuine signal failure — not a data gap that looks like failure.",
    scoreSegs: 4,
    decisionStyle: "You are decisive when you have seen enough. Make sure the bar for what counts as enough is calibrated correctly.",
    recommendation: "Confirm the diagnosis before you cut",
    urgency: "High — if you are right, waiting costs you; if you are wrong, stopping costs more",
    realProblem: "The evidence threshold for stopping is higher than you think",
    approach: "Stopping is the boldest call you can make mid-campaign, and sometimes it is exactly right. The cost of stopping when you should have continued is not just the remaining budget — it is the time to rebuild momentum, the opportunity cost of a window you did not take, and the signal ambiguity you carry into the next campaign. The discipline of a clean stop is being certain you are reading failure, not noise.",
    dataRead: "A campaign looks like failure for two different reasons. The first is that the campaign is genuinely not working — the signal is flat, the audience is not moving, and more time will not change that. The second is that the measurement model is incomplete — you are looking at a metric that cannot capture what the campaign is actually doing. Before you stop, confirm which of those is true.",
    missing: "Most stop decisions are made on one metric — usually the most visible one — rather than on the convergence of multiple signals. A flat engagement rate alongside growing save rate, rising search volume for your category, or positive organic content is a different signal than a flat engagement rate across all dimensions. You may be reading one number as the story when the full picture is more complex.",
    thisWeek: "Before you stop, pull every signal you have — not just the primary metric. Look for any signal that is moving in the right direction, even slowly. If every signal is flat or falling, stop. If one or two signals are moving while the primary metric is flat, you may have a measurement problem rather than a campaign problem. That distinction is worth one analysis before you make an irreversible call.",
    bridgeQuestion: "If this campaign had produced exactly the same numbers but the primary metric you are watching had been 15% higher — would you still be stopping it?",
    watches: [
      { metric: "Signal convergence across all tracked dimensions", detail: "A stop decision should be confirmed by multiple signals failing together — not one metric below target.", tag: "Required: multi-signal confirmation", tagClass: "signal-red" },
      { metric: "Category benchmark versus current performance", detail: "Is your campaign below category baseline on every metric, or only on the primary metric you have been tracking?", tag: "Context changes the read", tagClass: "signal-amber" },
      { metric: "Downstream signal check", detail: "Search volume, organic content mentions, retail signals — sometimes a campaign produces real behaviour change that upstream metrics do not yet show.", tag: "Check before stopping", tagClass: "signal-amber" },
    ],
    benchmarks: [
      { title: "Signals required for a confident stop decision", figure: "3 or more", context: "The typical standard for a stop decision in campaigns above RM50,000 in SEA markets — at least three independent signals all pointing to underperformance.", position: "How many signals are you reading?", posClass: "signal-amber" },
      { title: "Rebuild time after a premature stop", figure: "6 to 10 weeks", context: "The typical time to rebuild campaigns stopped before a signal naturally resolved — including budget, audience re-engagement, and category momentum loss.", position: "High cost if diagnosis is wrong", posClass: "signal-red" },
    ],
    timeAlert: "If you stop now and the diagnosis was wrong, you do not just lose the remaining campaign budget. You lose the momentum the campaign was building — and rebuilding that momentum in the same window costs significantly more than continuing.",
    ctaHeadline: "A 90-minute session confirms whether what you are reading is genuine campaign failure or a measurement gap — before you make an irreversible call.",
  },

  investigate: {
    verdict: "You do not have a decision problem. You have a clarity problem.",
    verdictSub: "You are not stuck because you lack information. You are stuck because the information you have is not connected to a clear decision framework. That is a fixable problem — and it does not require more data.",
    scoreSegs: 1,
    decisionStyle: "You process carefully before acting. Right now, the processing loop has no exit condition.",
    recommendation: "Define what a decision looks like before you investigate further",
    urgency: "Medium — more investigation without criteria will not produce clarity",
    realProblem: "More data will not resolve a criteria gap",
    approach: "You are treating this as an information problem when it is actually a criteria problem. The instinct to investigate further before deciding is usually right — but investigation has to be structured around a specific question, not an open search for confidence. What you are describing is not a lack of data. It is a lack of a decision framework that tells you what the data means.",
    dataRead: "More data does not produce clarity unless you know what you are looking for. Right now, you do not have a clear answer to the question: what would I need to see in this data to feel confident making this call? Without that answer, additional investigation produces more information but no more certainty. The loop continues.",
    missing: "You are missing a decision criteria document — not more data. What is the specific threshold on your primary metric that defines success for this campaign? What defines failure? Until you can name both of those numbers, any additional data you gather will be processed through an incomplete framework and will produce more ambiguity, not less.",
    thisWeek: "Write down your definition of success and failure for this campaign in specific, measurable terms. Then check where you currently sit relative to those thresholds. If you cannot write those definitions, that is the actual work — not more investigation. Once you have the thresholds, the current data will either give you a clear answer or tell you precisely which one additional data point you actually need.",
    bridgeQuestion: "If someone handed you a perfect dataset right now — every metric, every signal, fully accurate — what specific number would you look at first, and what would it need to say for you to act?",
    watches: [
      { metric: "Your primary decision metric", detail: "The one number that, if it changed, would move you. If you cannot name this, that is the first thing to define.", tag: "Required: name it before investigating", tagClass: "signal-red" },
      { metric: "Your success and failure thresholds", detail: "The specific values that define a good campaign and a bad one. Without these, every number you gather is ambiguous.", tag: "Define before you read any more data", tagClass: "signal-red" },
      { metric: "Decision deadline", detail: "When does this campaign end? How much time do you have to reach a conclusion? A decision with a deadline is different from an open investigation.", tag: "Know your window", tagClass: "signal-amber" },
    ],
    benchmarks: [
      { title: "Time to clarity with structured decision criteria", figure: "1 to 2 sessions", context: "How quickly brands in SEA markets typically move from ambiguity to a clear call when decision criteria are well defined before the investigation starts.", position: "Criteria first, data second", posClass: "signal-green" },
      { title: "Cost of unstructured investigation", figure: "3 to 4 extra weeks", context: "The typical time cost when teams investigate without clear success criteria — including the time to agree on what the data means after it is collected.", position: "You may already be here", posClass: "signal-amber" },
    ],
    timeAlert: "Every week spent investigating without defined decision criteria is a week of campaign time that will not come back. The goal is not certainty — it is a clear enough read to act in the remaining window.",
    ctaHeadline: "A 90-minute session builds your decision framework before you investigate further — so the next piece of data you pull actually gives you an answer.",
  },
};

function scoreBar(filled: number): string {
  const segs = [];
  for (let i = 1; i <= 5; i++) {
    const color = i <= filled ? (i <= 2 ? "#2563eb" : i <= 4 ? "#60a5fa" : "#93c5fd") : "#1e2235";
    segs.push(`<div style="height:6px;width:50px;border-radius:3px;background:${color};display:inline-block;margin-right:5px;"></div>`);
  }
  return segs.join("") + `<span style="font-size:11px;color:#6b7280;margin-left:10px;letter-spacing:0.06em;">DECISION CLARITY ${filled} OUT OF 5</span>`;
}

function tagStyle(cls: string): string {
  if (cls === "signal-green") return "background:#d1fae5;color:#065f46;";
  if (cls === "signal-red")   return "background:#fee2e2;color:#b91c1c;";
  return "background:#fef3c7;color:#b45309;"; // amber
}

export function generateDecideReportHtml(decisionText: string, category: string): string {
  const c = CONTENT[category] ?? CONTENT.investigate;
  const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const watchItems = c.watches.map((w, i) => `
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f3f4f6;">
      <div style="width:22px;height:22px;border-radius:50%;background:#2563eb;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">${i + 1}</div>
      <div>
        <div style="font-size:12px;font-weight:600;color:#111827;margin-bottom:3px;">${w.metric}</div>
        <div style="font-size:12px;color:#6b7280;line-height:1.55;">${w.detail}</div>
        <div style="display:inline-block;margin-top:6px;font-size:10px;font-weight:600;border-radius:4px;padding:2px 8px;letter-spacing:0.04em;${tagStyle(w.tagClass)}">${w.tag}</div>
      </div>
    </div>`).join("");

  const benchmarkCards = c.benchmarks.map(b => `
    <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:10px;">
      <div style="font-size:11px;font-weight:600;color:#374151;margin-bottom:4px;">${b.title}</div>
      <div style="font-size:22px;font-weight:700;color:#2563eb;line-height:1.1;margin-bottom:5px;">${b.figure}</div>
      <div style="font-size:11px;color:#6b7280;line-height:1.55;margin-bottom:7px;">${b.context}</div>
      <div style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;display:inline-block;${tagStyle(b.posClass)}">${b.position}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:6px;font-style:italic;">Based on publicly available category patterns. Your own data is the ground truth.</div>
    </div>`).join("");

  const truncated = decisionText.length > 400 ? decisionText.slice(0, 397) + "…" : decisionText;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Decision Analysis — ShiftImpact OS</title>
</head>
<body style="margin:0;padding:0;background:#f1f3f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;">
<div style="max-width:680px;margin:0 auto;background:#ffffff;overflow:hidden;">

  <!-- HERO -->
  <div style="background:#0d0f1a;padding:32px 40px 40px;position:relative;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;flex-wrap:wrap;gap:16px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:34px;height:34px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:14px;height:14px;background:white;border-radius:3px;opacity:0.95;"></div>
        </div>
        <div>
          <div style="font-size:12px;color:#ffffff;letter-spacing:0.12em;font-weight:700;">SHIFTIMPACT OS</div>
          <div style="font-size:10px;color:#2563eb;letter-spacing:0.10em;margin-top:2px;">GROWTH INTELLIGENCE</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:6px;padding:6px 14px;font-size:11px;color:#9ca3af;letter-spacing:0.06em;">DATE <span style="color:#ffffff;margin-left:4px;font-weight:500;">${now}</span></div>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:6px;padding:6px 14px;font-size:11px;color:#9ca3af;letter-spacing:0.06em;">REPORT <span style="color:#ffffff;margin-left:4px;font-weight:500;">Decision Read</span></div>
      </div>
    </div>

    <div style="margin-bottom:28px;">
      <div style="font-size:10px;color:#4b5563;letter-spacing:0.16em;margin-bottom:12px;">WHAT WE THINK YOU SHOULD DO</div>
      <div style="font-size:26px;color:#ffffff;font-weight:300;line-height:1.3;margin-bottom:14px;letter-spacing:-0.01em;">${c.verdict}</div>
      <div style="font-size:14px;color:#9ca3af;line-height:1.75;margin-bottom:24px;">${c.verdictSub}</div>
      <div>${scoreBar(c.scoreSegs)}</div>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:22px;">
      <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:10px;color:#4b5563;letter-spacing:0.10em;margin-bottom:5px;">HOW YOU MAKE DECISIONS</div>
        <div style="font-size:13px;color:#60a5fa;font-weight:500;line-height:1.4;">${c.decisionStyle}</div>
      </div>
      <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:10px;color:#4b5563;letter-spacing:0.10em;margin-bottom:5px;">OUR RECOMMENDATION</div>
        <div style="font-size:13px;color:#f59e0b;font-weight:500;line-height:1.4;">${c.recommendation}</div>
      </div>
      <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:10px;color:#4b5563;letter-spacing:0.10em;margin-bottom:5px;">HOW URGENT IS THIS</div>
        <div style="font-size:13px;color:#f59e0b;font-weight:500;line-height:1.4;">${c.urgency}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#4b5563;letter-spacing:0.10em;margin-bottom:5px;">THE REAL PROBLEM</div>
        <div style="font-size:13px;color:#f3f4f6;font-weight:500;line-height:1.4;">${c.realProblem}</div>
      </div>
    </div>
  </div>

  <!-- QUOTE BAND -->
  <div style="background:#13162a;padding:20px 40px;border-bottom:3px solid #1e2235;">
    <div style="font-size:10px;color:#4b5563;letter-spacing:0.12em;margin-bottom:10px;">WHAT YOU TOLD US</div>
    <div style="font-size:14px;color:#6b7280;line-height:1.8;font-style:italic;padding-left:16px;border-left:3px solid #2563eb;">&ldquo;${truncated}&rdquo;</div>
  </div>

  <!-- BODY -->
  <div style="padding:40px;">

    <div style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:26px;height:26px;border-radius:6px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">🧠</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;color:#2563eb;">HOW YOU APPROACH THIS KIND OF DECISION</div>
      </div>
      <div style="font-size:15px;color:#374151;line-height:1.9;">${c.approach}</div>
    </div>

    <div style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:26px;height:26px;border-radius:6px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">📊</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;color:#2563eb;">WHAT THE DATA IS ACTUALLY TELLING YOU</div>
      </div>
      <div style="font-size:15px;color:#374151;line-height:1.9;">${c.dataRead}</div>
    </div>

    <!-- Amber card -->
    <div style="background:#fffbeb;border-radius:10px;padding:20px 22px;margin-bottom:24px;border:1px solid #fde68a;">
      <div style="font-size:10px;letter-spacing:0.14em;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px;color:#b45309;">
        <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block;flex-shrink:0;"></div>WHAT YOU MIGHT BE MISSING
      </div>
      <div style="font-size:15px;color:#78350f;line-height:1.9;">${c.missing}</div>
    </div>

    <!-- Green card -->
    <div style="background:#f0fdf4;border-radius:10px;padding:20px 22px;margin-bottom:24px;border:1px solid #bbf7d0;">
      <div style="font-size:10px;letter-spacing:0.14em;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px;color:#065f46;">
        <div style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;flex-shrink:0;"></div>WHAT TO DO THIS WEEK
      </div>
      <div style="font-size:15px;color:#064e3b;line-height:1.9;">${c.thisWeek}</div>
    </div>

    <!-- Bridge question -->
    <div style="border:2px solid #bfdbfe;border-radius:10px;padding:22px 24px;background:#eff6ff;margin-bottom:40px;">
      <div style="font-size:10px;color:#1d4ed8;letter-spacing:0.14em;font-weight:700;margin-bottom:12px;">THE QUESTION YOU SHOULD BE ASKING YOURSELF</div>
      <div style="font-size:16px;color:#1e3a8a;line-height:1.75;font-style:italic;">${c.bridgeQuestion}</div>
    </div>

    <!-- Three things to watch -->
    <div style="margin-bottom:32px;">
      <div style="font-size:10px;color:#9ca3af;letter-spacing:0.14em;font-weight:700;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">THREE THINGS TO WATCH</div>
      ${watchItems}
    </div>

    <!-- Benchmarks -->
    <div style="margin-bottom:32px;">
      <div style="font-size:10px;color:#9ca3af;letter-spacing:0.14em;font-weight:700;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">HOW YOUR SITUATION COMPARES</div>
      ${benchmarkCards}
    </div>

    <!-- Time alert -->
    <div style="display:flex;align-items:flex-start;gap:10px;background:#fef3c7;border-radius:8px;padding:14px;margin-bottom:0;">
      <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;flex-shrink:0;margin-top:3px;"></div>
      <div style="font-size:12px;color:#92400e;line-height:1.6;font-weight:500;">${c.timeAlert}</div>
    </div>

  </div>

  <!-- CTA -->
  <div style="background:#0d0f1a;padding:40px;">
    <div style="font-size:10px;color:#f59e0b;letter-spacing:0.14em;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
      <div style="width:6px;height:6px;border-radius:50%;background:#f59e0b;display:inline-block;"></div>THE WINDOW TO ACT IS STILL OPEN
    </div>
    <div style="font-size:20px;color:#ffffff;font-weight:300;line-height:1.45;margin-bottom:14px;">${c.ctaHeadline}</div>
    <div style="font-size:14px;color:#6b7280;line-height:1.7;margin-bottom:28px;">A ShiftImpact OS diagnostic session takes the data you already have and tells you exactly which problem you are dealing with — and what to change first. 90 minutes. We come to you with a read and a recommendation, not a deck and a retainer pitch.</div>
    <a href="https://shiftimpact-os.vercel.app/decide" style="display:inline-block;background:#2563eb;color:white;font-size:14px;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;">Back to the diagnostic →</a>
    <div style="margin-top:12px;font-size:11px;color:#374151;">90 minutes &nbsp;·&nbsp; No commitment &nbsp;·&nbsp; Clear answer guaranteed</div>
  </div>

  <!-- FOOTER -->
  <div style="padding:18px 40px;border-top:1px solid #1e2235;background:#0d0f1a;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
    <div style="font-size:10px;color:#374151;letter-spacing:0.06em;">ShiftImpact OS &nbsp;·&nbsp; Growth Intelligence &nbsp;·&nbsp; Kuala Lumpur</div>
    <div style="font-size:10px;color:#2d3748;">This report was generated after your decision diagnostic at shiftimpact-os.vercel.app/decide</div>
  </div>

</div>
</body>
</html>`;
}
