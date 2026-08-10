"use client";
// app/decide/page.tsx — multi-step diagnostic conversation, public, no auth.

import { useState, useRef, useEffect } from "react";

type Category = "press" | "hold" | "pivot" | "stop" | "investigate";
type Phase = "entry" | "reading" | "probing" | "between" | "synthesis" | "done";

function classify(text: string): Category {
  const t = text.toLowerCase();
  if (/\b(increase|double|scale|more spend|push harder|accelerate|raise|add budget|bump|boost|invest more|amplify|more visibility|bigger)\b/.test(t)) return "press";
  if (/\b(hold|wait|monitor|watching|steady|maintain|keep running|sit tight|stay the course|give it time|let it run|see what happens|not sure yet)\b/.test(t)) return "hold";
  if (/\b(change|switch|pivot|different|redirect|try something|new direction|adjust|move away|shift|swap|rotate|different channel|different creative|different approach)\b/.test(t)) return "pivot";
  if (/\b(stop|kill|cut|pull|end|cancel|shut|terminate|pause it|drop it|walk away|pull the plug)\b/.test(t)) return "stop";
  return "investigate";
}

const PROBES: Record<Category, [string, string, string]> = {
  press: [
    "What specific metric is telling you it's working well enough to scale?",
    "When did that metric last move in a meaningful way — and what do you think caused it?",
    "If you doubled spend today and that number didn't shift in two weeks, what would you do?"
  ],
  hold: [
    "What specific signal, if it moved, would make you stop holding and commit to a direction?",
    "How long have you been watching for that signal — and has it shown any movement at all?",
    "What's the real cost — in concrete, measurable terms — of staying in hold for one more month?"
  ],
  pivot: [
    "What evidence tells you the problem is where the campaign runs — rather than what it says when it gets there?",
    "If you switched channels tomorrow and saw the same results, what would that tell you?",
    "What did you test or rule out before concluding the channel was the gap?"
  ],
  stop: [
    "What are you seeing that makes you certain this is the campaign failing — rather than a data gap that looks like failure?",
    "How confident are you in that read — and what would actually change your mind?",
    "What's the cost of being wrong in each direction: stopping a week too early versus a week too late?"
  ],
  investigate: [
    "If you had to lean one way right now — stay the course or change something — which way would you go, and what's pulling you there?",
    "What single piece of information, if you had it today, would make this feel clearer?",
    "What's actually stopping you from trusting the instinct you just named?"
  ]
};

const PROBE_READINGS: Record<Category, [string[], string[], string[]]> = {
  press: [
    ["Reading the metric you're anchoring to.", "Reading what it measures — and what it can't see from where you are.", "Reading whether it's a signal or a reflection."],
    ["Reading the timing of the movement.", "Reading whether the cause of it is still active right now.", "Reading the distance between when it moved and where you are today."],
    ["Reading whether you have an exit condition.", "Reading the decision that lives inside this one.", "Reading what would have to change for the answer to be no."]
  ],
  hold: [
    ["Reading what you're actually waiting for.", "Reading whether it's a criterion or a preference.", "Reading the difference between watching and deciding."],
    ["Reading the signal's pattern across the time you've been watching it.", "Reading whether waiting is a strategy or a deferral.", "Reading what the silence in that signal means."],
    ["Reading the cost of staying still.", "Reading what hold is protecting you from.", "Reading the decision already being made by not deciding."]
  ],
  pivot: [
    ["Reading the evidence behind the hypothesis.", "Reading whether it points to the channel or the message.", "Reading which one would survive being tested."],
    ["Reading the scenario you're using to reason from.", "Reading what it would actually prove.", "Reading the assumption it depends on."],
    ["Reading how the conclusion was reached.", "Reading whether there's evidence or inference behind it.", "Reading what a real test would have needed to look like."]
  ],
  stop: [
    ["Reading the confidence behind the call.", "Reading whether you're seeing failure or early data.", "Reading what the signal would look like if you were wrong."],
    ["Reading what would shift the read.", "Reading whether that threshold is reachable in the time you have.", "Reading the bar you're actually working from."],
    ["Reading the stakes on both sides of this.", "Reading which error is more expensive to make.", "Reading the asymmetry you may not have weighed yet."]
  ],
  investigate: [
    ["Reading the instinct beneath the uncertainty.", "Reading the direction it's already leaning.", "Reading why it hasn't committed yet."],
    ["Reading the gap in your current picture.", "Reading whether it's a data gap or a clarity gap.", "Reading what having that information would actually change."],
    ["Reading what the hesitation is protecting.", "Reading the difference between caution and avoidance.", "Reading the call that's already forming."]
  ]
};

interface Conclusion { synthesis: string; reveal: string; bridge: string; }

function buildConclusion(category: Category): Conclusion {
  const map: Record<Category, Conclusion> = {
    press: {
      synthesis: "You've identified a metric that's moving, traced when it last moved, and acknowledged you don't have a clear exit condition if scaling doesn't work. That combination describes a campaign with real evidence — but without a decision framework around it. The instinct to scale while momentum is present is sound. But momentum is not the same as readiness, and the metric you're watching may only be telling you half the story.",
      reveal: "The blind spot: the metric you're anchoring to may be measuring reach — how many people saw the campaign — not intent — how many are close to acting on it. Those are different states with different levers. Scaling reach amplifies visibility. Scaling conversion requires closing the gap between awareness and action. Right now, you may be about to invest in the first while hoping it produces the second.",
      bridge: "The question you should actually be asking: is the metric moving because the campaign is building intent — or because it's building awareness that hasn't converted into intent yet? That distinction determines whether more spend accelerates an outcome or amplifies a plateau."
    },
    hold: {
      synthesis: "You've named what you're watching, acknowledged it hasn't moved, and identified that staying in hold has a real cost attached to it. What you've described isn't a timing problem — it's a criteria problem. Hold is a rational position when you know exactly what you're waiting for and when you'll stop waiting. Without a deadline, it's indistinguishable from avoidance.",
      reveal: "The blind spot: hold is not a neutral position. It's a decision to keep current conditions in place while the market keeps moving. Your audience's attention keeps shifting. Your competitors are still acting. The window where your campaign is most contextually relevant keeps narrowing. What feels like patience is a directional choice — with a cost — happening in real time.",
      bridge: "The question you should actually be asking: if the signal you're watching doesn't move by a specific date you can name right now, what happens next — and can you name that date? If you can't, you're not holding. You're waiting without a condition."
    },
    pivot: {
      synthesis: "You've pointed at results that aren't working, formed a hypothesis about the channel being the problem, and acknowledged that the evidence behind that hypothesis has gaps. That's a reasonable starting position — but a hypothesis about channel performance that hasn't been tested against the alternative is still an inference. Acting on an inference at speed is how you move a symptom without treating a cause.",
      reveal: "The blind spot: changing channel is visible, fast, and feels decisive. Changing message is harder to see and slower to defend. When results are poor, it's natural to reach for the more tangible lever first. But if the proposition isn't connecting with the audience, moving it to a different platform means the same disconnection happens with a different set of people — and that's harder to diagnose the second time.",
      bridge: "The question you should actually be asking: if you held the channel constant and changed only the message or the target audience, would you expect the result to change — and what does your answer tell you about where the real gap is?"
    },
    stop: {
      synthesis: "You've described signals that look like failure, flagged uncertainty about whether that read is airtight, and started weighing the cost of error in each direction. The fact that you're asking rather than acting is itself meaningful — it means the case for stopping hasn't closed in your own mind yet. That gap matters more than it might appear.",
      reveal: "The blind spot: the two errors here are not symmetrical. Stopping a campaign that was about to work produces a regret you'll never be able to measure. Staying on a campaign that was genuinely failing produces a measurable, bounded additional cost. The second error is more visible and easier to defend against. The first gets underweighted — not because the evidence was clear, but because the uncertainty was uncomfortable to sustain. Most premature stops happen for exactly this reason.",
      bridge: "The question you should actually be asking: what would the campaign's performance need to look like right now for you to feel confident this is failure rather than timing — and does it actually look like that, or are you one signal away from knowing?"
    },
    investigate: {
      synthesis: "You've named an instinct, identified what's missing from your picture, and surfaced what's keeping you from trusting your own read. Those three things together don't describe a situation without clarity. They describe a situation where the clarity is closer than it appears — but something is slowing the last step of committing to it.",
      reveal: "The blind spot: you may be treating this as a data problem when it's actually a criteria problem. More information doesn't resolve a decision when you haven't defined what 'enough information' looks like yet. The hesitation isn't about what you know or don't know. It's that you haven't yet agreed with yourself on what you'd do with the answer — which means no additional data will feel sufficient until that changes.",
      bridge: "The question you should actually be asking: what's the minimum you'd need to see — not the ideal picture, just the minimum threshold — for acting now to feel defensible? Starting there is faster than waiting for certainty that isn't coming."
    }
  };
  return map[category];
}

export default function DecidePage() {
  const [phase, setPhase] = useState<Phase>("entry");
  const [probeStep, setProbeStep] = useState<0 | 1 | 2>(0);
  const [decision, setDecision] = useState("");
  const [displayDecision, setDisplayDecision] = useState("");
  const [category, setCategory] = useState<Category>("investigate");
  const [probeAnswers, setProbeAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [readingLines, setReadingLines] = useState<string[]>([]);
  const [conclusion, setConclusion] = useState<Conclusion | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  const sessionId = useRef(crypto.randomUUID());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => { return () => timers.current.forEach(clearTimeout); }, []);
  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [phase, probeStep]);

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }

  function animateReading(lines: string[], onDone: () => void) {
    clearTimers();
    setReadingLines([]);
    setContentVisible(false);
    let i = 0;
    function addNext() {
      setReadingLines(prev => [...prev, lines[i]]);
      i++;
      if (i < lines.length) { const t = setTimeout(addNext, 1000); timers.current.push(t); }
      else { const t = setTimeout(onDone, 1200); timers.current.push(t); }
    }
    const t = setTimeout(addNext, 600);
    timers.current.push(t);
  }

  function submitDecision() {
    if (!decision.trim()) return;
    const d = decision.length > 240 ? decision.slice(0, 237) + "…" : decision;
    setDisplayDecision(d);
    const cat = classify(decision);
    setCategory(cat);
    setProbeStep(0);
    setPhase("reading");
    void fetch("/api/widget-lead", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId.current, decision_text: decision.trim(), assumption_category: cat }),
    }).catch(() => {});
    animateReading(
      ["Reading the decision you are describing.", "Reading the assumption the words are carrying.", "Reading what would need to be true for this call to work."],
      () => { setPhase("probing"); setContentVisible(true); }
    );
  }

  function submitAnswer() {
    if (!currentAnswer.trim()) return;
    const updated: [string, string, string] = [...probeAnswers] as [string, string, string];
    updated[probeStep] = currentAnswer;
    setProbeAnswers(updated);
    setCurrentAnswer("");
    setPhase("between");
    const lines = PROBE_READINGS[category][probeStep];
    if (probeStep === 2) {
      setConclusion(buildConclusion(category));
      animateReading(lines, () => { setPhase("synthesis"); setContentVisible(true); });
    } else {
      animateReading(lines, () => { setProbeStep((probeStep + 1) as 0 | 1 | 2); setPhase("probing"); setContentVisible(true); });
    }
  }

  async function submitEmail() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailError("Please enter a valid email address."); return; }
    setEmailError(""); setSubmitting(true);
    try {
      await fetch("/api/widget-lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId.current, email: trimmed }) });
      setPhase("done");
    } catch { setEmailError("Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  }

  function restart() {
    clearTimers(); setPhase("entry"); setProbeStep(0); setDecision(""); setDisplayDecision("");
    setProbeAnswers(["", "", ""]); setCurrentAnswer(""); setReadingLines([]); setConclusion(null);
    setEmail(""); setEmailError(""); setContentVisible(true); sessionId.current = crypto.randomUUID();
  }

  const C = {
    page: { minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "4rem 1.5rem 7rem" } as React.CSSProperties,
    inner: { width: "100%", maxWidth: "560px" } as React.CSSProperties,
    brand: { fontSize: "12px", color: "#374151", margin: "0 0 2.5rem", letterSpacing: "0.07em" } as React.CSSProperties,
    h1: { fontSize: "22px", fontWeight: 500, color: "#f9fafb", margin: "0 0 0.6rem", lineHeight: 1.4 } as React.CSSProperties,
    sub: { fontSize: "15px", color: "#9ca3af", margin: "0 0 1.5rem", lineHeight: 1.65 } as React.CSSProperties,
    quote: { fontSize: 14, color: "#6b7280", lineHeight: 1.75, margin: "0 0 2rem", borderLeft: "2px solid #1f2937", padding: "0.6rem 1rem", fontStyle: "italic" } as React.CSSProperties,
    reading: { fontSize: 15, color: "#9ca3af", lineHeight: 2.3 } as React.CSSProperties,
    step: { fontSize: "11px", color: "#374151", letterSpacing: "0.12em", margin: "0 0 2rem" } as React.CSSProperties,
    pLabel: { fontSize: "12px", color: "#4b5563", margin: "0 0 0.5rem", letterSpacing: "0.06em" } as React.CSSProperties,
    pQ: { fontSize: "19px", fontWeight: 400, color: "#f3f4f6", margin: "0 0 1.75rem", lineHeight: 1.55 } as React.CSSProperties,
    ta: { width: "100%", boxSizing: "border-box" as const, height: 90, resize: "none" as const, background: "#1a1d27", border: "0.5px solid #2d3148", borderRadius: 8, color: "#f3f4f6", fontSize: 14, lineHeight: 1.65, padding: "12px 14px", outline: "none", fontFamily: "inherit" },
    btn: (on: boolean) => ({ marginTop: "0.75rem", padding: "10px 20px", background: "transparent", border: "0.5px solid #4b5563", borderRadius: 8, color: "#e5e7eb", fontSize: 14, cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.35, fontFamily: "inherit" } as React.CSSProperties),
    sLabel: { fontSize: "12px", color: "#4b5563", margin: "0 0 0.4rem", letterSpacing: "0.06em" } as React.CSSProperties,
    body: { fontSize: 15, color: "#e5e7eb", lineHeight: 1.85, margin: "0 0 2rem" } as React.CSSProperties,
    box: { margin: "0 0 2rem", padding: "1rem 1.25rem", border: "0.5px solid #2d3148", borderRadius: 8, background: "#13151e" } as React.CSSProperties,
    divider: { borderTop: "0.5px solid #1f2937", margin: "2rem 0 1.5rem" } as React.CSSProperties,
    ghost: { background: "none", border: "none", color: "#374151", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" } as React.CSSProperties,
    emailInput: { flex: 1, minWidth: 200, background: "#1a1d27", border: "0.5px solid #2d3148", borderRadius: 8, color: "#f3f4f6", fontSize: 14, padding: "9px 12px", outline: "none", fontFamily: "inherit" } as React.CSSProperties,
  };

  const fade: React.CSSProperties = contentVisible ? { animation: "fadeUp 0.45s ease forwards" } : { opacity: 0 };

  return (
    <div style={C.page}>
      <div style={C.inner} ref={topRef}>
        <p style={C.brand}>ShiftImpact Growth Intelligence</p>

        {phase === "entry" && (
          <div>
            <h1 style={C.h1}>What decision are you facing with a campaign right now?</h1>
            <p style={C.sub}>Don't describe the campaign. Describe the call you're stuck on.</p>
            <textarea value={decision} onChange={e => setDecision(e.target.value)}
              placeholder="e.g. We're in week 6 and I'm not sure whether to hold or increase spend — the numbers look okay but something feels off…"
              style={C.ta}
              onFocus={e => (e.target.style.borderColor = "#4b5563")}
              onBlur={e => (e.target.style.borderColor = "#2d3148")}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && decision.trim()) { e.preventDefault(); submitDecision(); } }}
            />
            <button onClick={submitDecision} disabled={!decision.trim()} style={C.btn(!!decision.trim())}>Read the decision →</button>
          </div>
        )}

        {(phase === "reading" || phase === "between") && (
          <div>
            <p style={C.quote}>&ldquo;{displayDecision}&rdquo;</p>
            <div style={C.reading}>{readingLines.map((l, i) => <p key={i} style={{ margin: 0 }}>{l}</p>)}</div>
          </div>
        )}

        {phase === "probing" && (
          <div style={fade}>
            <p style={C.quote}>&ldquo;{displayDecision}&rdquo;</p>
            <p style={C.step}>0{probeStep + 1} / 03</p>
            <p style={C.pLabel}>One question</p>
            <p style={C.pQ}>{PROBES[category][probeStep]}</p>
            <textarea key={probeStep} value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)}
              placeholder="Take your time with this."
              style={C.ta} autoFocus
              onFocus={e => (e.target.style.borderColor = "#4b5563")}
              onBlur={e => (e.target.style.borderColor = "#2d3148")}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && currentAnswer.trim()) { e.preventDefault(); submitAnswer(); } }}
            />
            <button onClick={submitAnswer} disabled={!currentAnswer.trim()} style={C.btn(!!currentAnswer.trim())}>
              {probeStep < 2 ? "Continue →" : "Show me what you see →"}
            </button>
          </div>
        )}

        {(phase === "synthesis" || phase === "done") && conclusion && (
          <div style={fade}>
            <p style={C.quote}>&ldquo;{displayDecision}&rdquo;</p>
            <p style={C.sLabel}>What the conversation reveals</p>
            <p style={C.body}>{conclusion.synthesis}</p>
            <p style={C.sLabel}>The blind spot</p>
            <p style={C.body}>{conclusion.reveal}</p>
            <div style={C.box}>
              <p style={{ ...C.sLabel, marginBottom: "0.5rem" }}>The question you should actually be asking</p>
              <p style={{ margin: 0, fontSize: 15, color: "#e5e7eb", lineHeight: 1.75, fontStyle: "italic" }}>{conclusion.bridge}</p>
            </div>

            {phase === "synthesis" && (
              <>
                <div style={C.divider} />
                <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 1rem", lineHeight: 1.65 }}>
                  A Growth Intelligence diagnostic session answers that question precisely — and surfaces two or three others you haven't reached yet.
                </p>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 0.75rem" }}>Where should we send your diagnostic summary?</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                    placeholder="you@company.com" style={C.emailInput}
                    onFocus={e => (e.target.style.borderColor = "#4b5563")}
                    onBlur={e => (e.target.style.borderColor = "#2d3148")}
                    onKeyDown={e => e.key === "Enter" && submitEmail()}
                  />
                  <button onClick={submitEmail} disabled={submitting || !email.trim()} style={C.btn(!submitting && !!email.trim())}>
                    {submitting ? "Sending…" : "Send it →"}
                  </button>
                </div>
                {emailError && <p style={{ fontSize: 13, color: "#ef4444", margin: "0.5rem 0 0" }}>{emailError}</p>}
                <div style={{ marginTop: "1.5rem" }}><button onClick={restart} style={C.ghost}>← Try a different decision</button></div>
              </>
            )}

            {phase === "done" && (
              <>
                <div style={C.divider} />
                <p style={{ fontSize: 15, color: "#e5e7eb", margin: "0 0 0.4rem", lineHeight: 1.7 }}>Your diagnostic summary is on its way.</p>
                <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 1.5rem", lineHeight: 1.65 }}>Sit with the question. The answer you give it is the brief for the session.</p>
                <button onClick={restart} style={C.ghost}>← Try a different decision</button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        textarea::placeholder, input::placeholder { color: #4b5563; }
      `}</style>
    </div>
  );
}
