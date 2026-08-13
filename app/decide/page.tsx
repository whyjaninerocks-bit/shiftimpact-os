"use client";
// app/decide/page.tsx
// Public-facing Decision Intelligence experience — no auth, no sidebar.
// Powered by /api/decide-probe — live AI responses, no hardcoded content.

import { useState, useRef, useEffect } from "react";

type Phase = "entry" | "fetching" | "reading" | "probing" | "synthesis" | "benchmark" | "done";

interface ProbeResult { readingLines: string[]; question: string; readyForSynthesis?: boolean; }
interface SynthesisResult { stageRead: string; signalGap: string; riskPosture: string; gateCondition: string; action: string; bridge: string; _stage?: string; _signal?: string; _gap?: string; }

async function callProbe(
  decision: string,
  conversation: Array<{ role: string; content: string }>,
  probeNumber: number,
  mode: "probe" | "synthesis"
): Promise<ProbeResult | SynthesisResult> {
  const res = await fetch("/api/decide-probe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, conversation, probeNumber, mode }),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

export default function DecidePage() {
  const [phase, setPhase] = useState<Phase>("entry");
  const [probeStep, setProbeStep] = useState(0); // 0-based
  const [isLastProbe, setIsLastProbe] = useState(false);

  // Benchmark collection (post-email)
  const [industry, setIndustry] = useState("");
  const [brandCategory, setBrandCategory] = useState("");
  const [benchmarkSubmitting, setBenchmarkSubmitting] = useState(false);
  const [decision, setDecision] = useState("");
  const [displayDecision, setDisplayDecision] = useState("");

  // Conversation history passed to each API call
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([]);

  // Current probe state (AI-generated)
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");

  // Reading animation
  const [readingLines, setReadingLines] = useState<string[]>([]);

  // Synthesis
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);

  // Email
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Error state
  const [apiError, setApiError] = useState(false);

  // Fade-in for probing/synthesis content
  const [contentVisible, setContentVisible] = useState(true);

  const sessionId = useRef(crypto.randomUUID());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
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
      if (i < lines.length) {
        const t = setTimeout(addNext, 1050);
        timers.current.push(t);
      } else {
        const t = setTimeout(onDone, 1200);
        timers.current.push(t);
      }
    }
    const t = setTimeout(addNext, 500);
    timers.current.push(t);
  }

  // ── Submit initial decision ────────────────────────────────────────────────
  async function submitDecision() {
    if (!decision.trim()) return;
    const d = decision.length > 240 ? decision.slice(0, 237) + "…" : decision;
    setDisplayDecision(d);
    setApiError(false);
    setPhase("fetching");

    // Log to DB
    void fetch("/api/widget-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId.current, decision_text: decision.trim() }),
    }).catch(() => {});

    try {
      const result = await callProbe(decision.trim(), [], 1, "probe") as ProbeResult;
      setCurrentQuestion(result.question);
      setIsLastProbe(false); // probe 1 is never last
      setPhase("reading");
      animateReading(result.readingLines, () => {
        setConversation([{ role: "probe", content: result.question }]);
        setProbeStep(0);
        setContentVisible(true);
        setPhase("probing");
      });
    } catch {
      setApiError(true);
      setPhase("entry");
    }
  }

  // ── Submit answer to current probe ─────────────────────────────────────────
  async function submitAnswer() {
    if (!currentAnswer.trim()) return;
    const answer = currentAnswer.trim();
    setCurrentAnswer("");
    setApiError(false);

    const updatedConv = [
      ...conversation,
      { role: "answer", content: answer },
    ];
    setConversation(updatedConv);
    setPhase("fetching");

    try {
      if (isLastProbe) {
        // Prompt chain step 2: classify → synthesize (handled inside API route)
        const result = await callProbe(decision.trim(), updatedConv, probeStep + 1, "synthesis") as SynthesisResult;
        setSynthesis(result);
        setPhase("reading");
        animateReading(
          [
            "Reading the pattern across everything you described.",
            "Reading what was said and what was left unsaid.",
            "Reading where the decision actually sits.",
          ],
          () => { setContentVisible(true); setPhase("synthesis"); }
        );
      } else {
        // Get next probe
        const nextProbeNum = probeStep + 2; // 0-based + 2 = 1-based next probe number
        const result = await callProbe(decision.trim(), updatedConv, nextProbeNum, "probe") as ProbeResult;
        const nextConv = [...updatedConv, { role: "probe", content: result.question }];
        setConversation(nextConv);
        setCurrentQuestion(result.question);
        // AI decides if this next probe is the last (min 2 probes, max 3)
        const nextIsLast = result.readyForSynthesis === true || nextProbeNum >= 3;
        setPhase("reading");
        animateReading(result.readingLines, () => {
          setProbeStep(prev => prev + 1);
          setIsLastProbe(nextIsLast);
          setContentVisible(true);
          setPhase("probing");
        });
      }
    } catch {
      setApiError(true);
      setPhase("probing");
    }
  }

  // ── Submit email ───────────────────────────────────────────────────────────
  async function submitEmail() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setSubmitting(true);
    try {
      await fetch("/api/widget-lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId.current, email: trimmed }),
      });
      setPhase("benchmark"); // Ask for context before sending report
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBenchmark() {
    if (!industry || !brandCategory) return;
    setBenchmarkSubmitting(true);
    const posture = synthesis?.riskPosture?.trim().toLowerCase().split(/[\s.]/)[0] ?? "investigate";
    const categoryKey = ["press","hold","pivot","stop","investigate"].includes(posture) ? posture : "investigate";
    try {
      await fetch("/api/widget-lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId.current,
          send_report: true,
          category: categoryKey,
          industry,
          brand_category: brandCategory,
          stage_read: synthesis?.stageRead,
          signal_gap: synthesis?.signalGap,
          risk_posture: synthesis?.riskPosture,
          gate_condition: synthesis?.gateCondition,
          action: synthesis?.action,
          bridge: synthesis?.bridge,
          // Classifier metadata — for decision pattern analytics
          campaign_stage: synthesis?._stage,
          signal_gap_type: synthesis?._signal,
          decision_gap_type: synthesis?._gap,
          probe_count: probeStep + 1,
        }),
      });
      setPhase("done");
    } catch {
      setPhase("done"); // Non-fatal — still complete
    } finally {
      setBenchmarkSubmitting(false);
    }
  }

  function restart() {
    clearTimers();
    setPhase("entry"); setProbeStep(0); setIsLastProbe(false);
    setDecision(""); setDisplayDecision(""); setCurrentAnswer("");
    setConversation([]); setCurrentQuestion("");
    setReadingLines([]); setSynthesis(null);
    setEmail(""); setEmailError(""); setApiError(false);
    setIndustry(""); setBrandCategory("");
    setContentVisible(true);
    sessionId.current = crypto.randomUUID();
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const C = {
    page: { minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "4rem 1.5rem 7rem" } as React.CSSProperties,
    inner: { width: "100%", maxWidth: "560px" } as React.CSSProperties,
    brand: { fontSize: "12px", color: "#374151", margin: "0 0 2.5rem", letterSpacing: "0.07em" } as React.CSSProperties,
    h1: { fontSize: "22px", fontWeight: 500, color: "#f9fafb", margin: "0 0 0.6rem", lineHeight: 1.4 } as React.CSSProperties,
    sub: { fontSize: "15px", color: "#9ca3af", margin: "0 0 1.5rem", lineHeight: 1.65 } as React.CSSProperties,
    quote: { fontSize: 14, color: "#6b7280", lineHeight: 1.75, margin: "0 0 2rem", borderLeft: "2px solid #1f2937", padding: "0.6rem 1rem", fontStyle: "italic" } as React.CSSProperties,
    readingWrap: { fontSize: 15, color: "#9ca3af", lineHeight: 2.3 } as React.CSSProperties,
    step: { fontSize: "11px", color: "#374151", letterSpacing: "0.12em", margin: "0 0 2rem" } as React.CSSProperties,
    pLabel: { fontSize: "12px", color: "#4b5563", margin: "0 0 0.5rem", letterSpacing: "0.06em" } as React.CSSProperties,
    pQ: { fontSize: "20px", fontWeight: 400, color: "#f3f4f6", margin: "0 0 1.75rem", lineHeight: 1.55 } as React.CSSProperties,
    ta: { width: "100%", boxSizing: "border-box" as const, height: 90, resize: "none" as const, background: "#1a1d27", border: "0.5px solid #2d3148", borderRadius: 8, color: "#f3f4f6", fontSize: 14, lineHeight: 1.65, padding: "12px 14px", outline: "none", fontFamily: "inherit" },
    btn: (on: boolean) => ({ marginTop: "0.75rem", padding: "10px 20px", background: "transparent", border: "0.5px solid #4b5563", borderRadius: 8, color: "#e5e7eb", fontSize: 14, cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.35, fontFamily: "inherit" } as React.CSSProperties),
    sLabel: { fontSize: "12px", color: "#4b5563", margin: "0 0 0.4rem", letterSpacing: "0.06em" } as React.CSSProperties,
    body: { fontSize: 15, color: "#e5e7eb", lineHeight: 1.85, margin: "0 0 1.75rem" } as React.CSSProperties,
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

        {/* ── ENTRY ── */}
        {phase === "entry" && (
          <div>
            <h1 style={C.h1}>What decision are you facing with a campaign right now?</h1>
            <p style={C.sub}>Describe the call you are stuck on. This is not a general AI. It reads the intelligence pattern in your specific situation. It asks two questions. You make the decision.</p>
            {apiError && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 1rem" }}>
                Something went wrong. Please try again.
              </p>
            )}
            <textarea
              value={decision}
              onChange={e => setDecision(e.target.value)}
              placeholder="e.g. We're in week 6 and I'm not sure whether to hold or increase spend — the numbers look okay but something feels off…"
              style={C.ta}
              onFocus={e => (e.target.style.borderColor = "#4b5563")}
              onBlur={e => (e.target.style.borderColor = "#2d3148")}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && decision.trim()) { e.preventDefault(); submitDecision(); } }}
            />
            <button onClick={submitDecision} disabled={!decision.trim()} style={C.btn(!!decision.trim())}>
              Read the decision →
            </button>
          </div>
        )}

        {/* ── FETCHING ── */}
        {phase === "fetching" && (
          <div>
            {displayDecision && <p style={C.quote}>&ldquo;{displayDecision}&rdquo;</p>}
            <div style={C.readingWrap}>
              <p style={{ margin: 0, color: "#4b5563" }}>Reading...</p>
            </div>
          </div>
        )}

        {/* ── READING (animation) ── */}
        {phase === "reading" && (
          <div>
            <p style={C.quote}>&ldquo;{displayDecision}&rdquo;</p>
            <div style={C.readingWrap}>
              {readingLines.map((l, i) => (
                <p key={i} style={{ margin: 0, animation: "fadeIn 0.5s ease forwards" }}>{l}</p>
              ))}
            </div>
          </div>
        )}

        {/* ── PROBING ── */}
        {phase === "probing" && (
          <div style={fade}>
            <p style={C.quote}>&ldquo;{displayDecision}&rdquo;</p>
            <p style={C.step}>0{probeStep + 1}</p>
            <p style={C.pLabel}>One question</p>
            <p style={C.pQ}>{currentQuestion}</p>
            {apiError && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 0.75rem" }}>
                Something went wrong. Please try again.
              </p>
            )}
            <textarea
              key={probeStep}
              value={currentAnswer}
              onChange={e => setCurrentAnswer(e.target.value)}
              placeholder="Take your time with this."
              style={C.ta}
              autoFocus
              onFocus={e => (e.target.style.borderColor = "#4b5563")}
              onBlur={e => (e.target.style.borderColor = "#2d3148")}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && currentAnswer.trim()) { e.preventDefault(); submitAnswer(); } }}
            />
            <button onClick={submitAnswer} disabled={!currentAnswer.trim()} style={C.btn(!!currentAnswer.trim())}>
              {isLastProbe ? "Show me what you see →" : "Continue →"}
            </button>
          </div>
        )}

        {/* ── SYNTHESIS / BENCHMARK / DONE ── */}
        {(phase === "synthesis" || phase === "benchmark" || phase === "done") && synthesis && (
          <div style={fade}>
            <p style={C.quote}>&ldquo;{displayDecision}&rdquo;</p>

            <p style={C.sLabel}>Stage</p>
            <p style={C.body}>{synthesis.stageRead}</p>

            <p style={C.sLabel}>Signal gap</p>
            <p style={C.body}>{synthesis.signalGap}</p>

            <div style={C.box}>
              <p style={{ ...C.sLabel, marginBottom: "0.4rem" }}>Risk posture</p>
              <p style={{ margin: "0 0 1rem", fontSize: 15, color: "#e5e7eb", lineHeight: 1.75, fontWeight: 500 }}>
                {synthesis.riskPosture}
              </p>
              <p style={{ ...C.sLabel, marginBottom: "0.4rem" }}>Gate condition</p>
              <p style={{ margin: 0, fontSize: 14, color: "#9ca3af", lineHeight: 1.75 }}>
                {synthesis.gateCondition}
              </p>
            </div>

            <p style={C.sLabel}>Your next move</p>
            <p style={C.body}>{synthesis.action}</p>

            <div style={{ ...C.box, borderColor: "#1f2937" }}>
              <p style={{ ...C.sLabel, marginBottom: "0.5rem" }}>The question</p>
              <p style={{ margin: 0, fontSize: 15, color: "#e5e7eb", lineHeight: 1.75, fontStyle: "italic" }}>
                {synthesis.bridge}
              </p>
            </div>

            {phase === "synthesis" && (
              <>
                <div style={C.divider} />
                <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 1rem", lineHeight: 1.65 }}>
                  A Growth Intelligence diagnostic session answers that question precisely and surfaces the two or three signals you have not reached yet.
                </p>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 0.75rem" }}>
                  Where should we send your diagnostic summary?
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                    placeholder="you@company.com"
                    style={C.emailInput}
                    onFocus={e => (e.target.style.borderColor = "#4b5563")}
                    onBlur={e => (e.target.style.borderColor = "#2d3148")}
                    onKeyDown={e => e.key === "Enter" && submitEmail()}
                  />
                  <button onClick={submitEmail} disabled={submitting || !email.trim()} style={C.btn(!submitting && !!email.trim())}>
                    {submitting ? "Sending…" : "Send it →"}
                  </button>
                </div>
                {emailError && <p style={{ fontSize: 13, color: "#ef4444", margin: "0.5rem 0 0" }}>{emailError}</p>}
                <div style={{ marginTop: "1.5rem" }}>
                  <button onClick={restart} style={C.ghost}>← Try a different decision</button>
                </div>
              </>
            )}

            {phase === "benchmark" && (
              <>
                <div style={C.divider} />
                <p style={{ fontSize: 14, color: "#e5e7eb", margin: "0 0 0.5rem", lineHeight: 1.65 }}>
                  One last thing before we send your report.
                </p>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 1.5rem", lineHeight: 1.65 }}>
                  Tell us your industry and brand category. We include benchmark data specific to your sector so the numbers in the report are relevant to your situation, not averages.
                </p>
                <div style={{ marginBottom: "1rem" }}>
                  <p style={C.sLabel}>Industry</p>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    style={{ ...C.emailInput, width: "100%", cursor: "pointer" }}
                  >
                    <option value="">Select your industry</option>
                    <option value="FMCG">FMCG</option>
                    <option value="QSR / F&B">QSR / F&B</option>
                    <option value="Retail">Retail</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Beauty / Personal Care">Beauty / Personal Care</option>
                    <option value="Health / Wellness">Health / Wellness</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Technology / SaaS">Technology / SaaS</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <p style={C.sLabel}>Brand category</p>
                  <input
                    type="text"
                    value={brandCategory}
                    onChange={e => setBrandCategory(e.target.value)}
                    placeholder="e.g. instant coffee, ready-to-drink tea, skincare"
                    style={{ ...C.emailInput, width: "100%" }}
                    onFocus={e => (e.target.style.borderColor = "#4b5563")}
                    onBlur={e => (e.target.style.borderColor = "#2d3148")}
                    onKeyDown={e => e.key === "Enter" && !benchmarkSubmitting && industry && brandCategory && submitBenchmark()}
                  />
                </div>
                <button
                  onClick={submitBenchmark}
                  disabled={benchmarkSubmitting || !industry || !brandCategory.trim()}
                  style={C.btn(!benchmarkSubmitting && !!industry && !!brandCategory.trim())}
                >
                  {benchmarkSubmitting ? "Sending your report…" : "Send my report →"}
                </button>
                <div style={{ marginTop: "1.5rem" }}>
                  <button onClick={restart} style={C.ghost}>← Try a different decision</button>
                </div>
              </>
            )}

            {phase === "done" && (
              <>
                <div style={C.divider} />
                <p style={{ fontSize: 15, color: "#e5e7eb", margin: "0 0 0.4rem", lineHeight: 1.7 }}>
                  Your diagnostic summary is on its way.
                </p>
                <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 1.5rem", lineHeight: 1.65 }}>
                  Sit with the question. The answer you give it is the brief for the session.
                </p>
                <button onClick={restart} style={C.ghost}>← Try a different decision</button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        * { box-sizing: border-box; }
        textarea::placeholder, input::placeholder { color: #4b5563; }
      `}</style>
    </div>
  );
}
