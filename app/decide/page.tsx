"use client";
// app/decide/page.tsx
// Public-facing prospect experience — no auth, no sidebar.
// The 100x decision-first architecture:
//   Entry → Reading → Assumption reveal → Email capture → Confirmation
//
// URL: /decide
// Shareable with any prospect. Zero friction entry.

import { useState, useEffect, useRef } from "react";

const REVEALS: Record<string, { assumption: string; reframe: string }> = {
  press: {
    assumption:
      "You're assuming that visibility creates momentum automatically. The word 'increase' or 'more' reveals that you believe the problem is volume — if more people see the campaign, the outcome improves. That's sometimes right. But it's not always the gap.",
    reframe:
      "The real question isn't whether the campaign deserves more spend. It's whether the audience has moved from attention into consideration yet. Spend amplifies what's already working. If the underlying signal isn't moving, increasing reach makes a flat signal louder.",
  },
  hold: {
    assumption:
      "You're assuming time resolves signal ambiguity on its own. 'Hold' or 'wait and see' reveals that something is mixed enough that you're not willing to commit either way. That's a reasonable instinct — but only when you know exactly what you're waiting for.",
    reframe:
      "The real question isn't whether to hold. It's: what signal, if it changed, would make you stop holding? If you can't name it precisely, you're not holding — you're deferring a decision you already need to make.",
  },
  pivot: {
    assumption:
      "You're assuming the problem is where the campaign is running, not what it's saying when it arrives. 'Change' or 'switch' reveals a belief that delivery is the gap. But a pivot that changes the surface without touching the proposition solves the visible symptom, not the cause.",
    reframe:
      "The real question isn't whether to pivot. It's whether the disconnect is in the channel, the creative, the proposition, or the timing. Those have different fixes — and changing the wrong one makes the gap harder to diagnose next time.",
  },
  stop: {
    assumption:
      "You're assuming you've seen enough signal to make a definitive call. 'Stop' or 'cut' reveals confidence in your read — that what you're seeing is clear enough to act on. But the evidence required to stop confidently is different from what most campaigns produce mid-flight.",
    reframe:
      "The real question is whether what you're seeing is the campaign failing, or a data gap that looks like failure. The two have different fixes. Stopping is the right answer for one of them — and the wrong call for the other is expensive.",
  },
  investigate: {
    assumption:
      "The language you used doesn't name a decision — it describes a state of uncertainty. You're treating this as a timing question when it may actually be a clarity question. That distinction matters because waiting for more data doesn't always produce a clearer picture.",
    reframe:
      "The real question isn't whether to act. It's what you'd need to see to act confidently. Right now, your signals and your decision criteria aren't aligned — and no additional data resolves that unless you know which signal, if it moved, would actually change your call.",
  },
};

function classify(text: string): string {
  const t = text.toLowerCase();
  if (/\b(increase|double|scale|more spend|push harder|accelerate|raise|add budget|bump|boost|invest more|amplify)\b/.test(t)) return "press";
  if (/\b(hold|wait|monitor|watching|steady|maintain|keep running|sit tight|stay the course|give it time|let it run|see what happens)\b/.test(t)) return "hold";
  if (/\b(change|switch|pivot|different|redirect|try something|new direction|adjust|move away|shift|swap|rotate)\b/.test(t)) return "pivot";
  if (/\b(stop|kill|cut|pull|end|cancel|shut|terminate|pause it|drop it|walk away)\b/.test(t)) return "stop";
  return "investigate";
}

type State = "entry" | "reading" | "reveal" | "captured" | "done";

export default function DecidePage() {
  const [state, setState] = useState<State>("entry");
  const [input, setInput] = useState("");
  const [display, setDisplay] = useState("");
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [readingLines, setReadingLines] = useState<string[]>([]);
  const [showClosing, setShowClosing] = useState(false);
  const sessionId = useRef(crypto.randomUUID());

  const LINES = [
    "Reading the decision you are describing.",
    "Reading the assumption behind the words.",
    "Reading what would need to be true for this call to work.",
  ];

  function startReading() {
    if (!input.trim()) return;
    const d = input.length > 220 ? input.slice(0, 217) + "…" : input;
    setDisplay(d);
    setState("reading");
    setReadingLines([]);

    // Fire-and-forget: log the decision before we show the reveal
    void fetch("/api/widget-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId.current,
        decision_text: input.trim(),
        assumption_category: classify(input),
      }),
    }).catch(() => {});
  }

  // Animate reading lines once we enter reading state
  useEffect(() => {
    if (state !== "reading") return;
    let i = 0;
    function addLine() {
      if (i < LINES.length) {
        const idx = i;
        setReadingLines((prev) => [...prev, LINES[idx]]);
        i++;
        if (i < LINES.length) setTimeout(addLine, 950);
        else setTimeout(() => {
          setCategory(classify(input));
          setState("reveal");
          setTimeout(() => setShowClosing(true), 1800);
        }, 1100);
      }
    }
    const t = setTimeout(addLine, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
      setState("done");
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setInput("");
    setDisplay("");
    setCategory("");
    setEmail("");
    setEmailError("");
    setReadingLines([]);
    setShowClosing(false);
    sessionId.current = crypto.randomUUID();
    setState("entry");
  }

  const reveal = REVEALS[category] ?? REVEALS.investigate;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "4rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>

        <p style={{ fontSize: "12px", color: "#4b5563", margin: "0 0 2.5rem", letterSpacing: "0.06em" }}>
          ShiftImpact Growth Intelligence
        </p>

        {/* ── STATE: ENTRY ── */}
        {state === "entry" && (
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#f9fafb", margin: "0 0 0.6rem", lineHeight: 1.4 }}>
              What decision are you facing with a campaign right now?
            </h1>
            <p style={{ fontSize: "15px", color: "#9ca3af", margin: "0 0 1.5rem", lineHeight: 1.65 }}>
              Don't describe the campaign. Describe the call you're stuck on.
            </p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. We're in week 6 and I'm not sure whether to hold or increase spend — the numbers look okay but something feels off…"
              style={{
                width: "100%", boxSizing: "border-box", height: 120, resize: "none",
                background: "#1a1d27", border: "0.5px solid #2d3148", borderRadius: 8,
                color: "#f3f4f6", fontSize: 15, lineHeight: 1.65, padding: "12px 14px",
                outline: "none", fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4b5563")}
              onBlur={(e) => (e.target.style.borderColor = "#2d3148")}
            />
            <button
              onClick={startReading}
              disabled={!input.trim()}
              style={{
                marginTop: "0.75rem", padding: "10px 20px", background: "transparent",
                border: "0.5px solid #4b5563", borderRadius: 8, color: "#e5e7eb",
                fontSize: 14, cursor: input.trim() ? "pointer" : "default",
                opacity: input.trim() ? 1 : 0.4, fontFamily: "inherit",
              }}
            >
              Read the decision →
            </button>
          </div>
        )}

        {/* ── STATE: READING ── */}
        {state === "reading" && (
          <div>
            <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.7, margin: "0 0 2rem", borderLeft: "2px solid #2d3148", padding: "0.75rem 1rem", fontStyle: "italic" }}>
              &ldquo;{display}&rdquo;
            </p>
            <div style={{ fontSize: 15, color: "#9ca3af", lineHeight: 2.2 }}>
              {readingLines.map((line, i) => (
                <p key={i} style={{ margin: 0, animation: "fadeIn 0.5s ease forwards" }}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* ── STATE: REVEAL ── */}
        {(state === "reveal" || state === "captured" || state === "done") && (
          <div>
            <p style={{ fontSize: 12, color: "#4b5563", margin: "0 0 0.4rem", letterSpacing: "0.06em" }}>What you said</p>
            <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.7, margin: "0 0 2rem", borderLeft: "2px solid #2d3148", padding: "0.75rem 1rem", fontStyle: "italic" }}>
              &ldquo;{display}&rdquo;
            </p>
            <p style={{ fontSize: 12, color: "#4b5563", margin: "0 0 0.4rem", letterSpacing: "0.06em" }}>What the language reveals</p>
            <p style={{ fontSize: 17, color: "#f3f4f6", lineHeight: 1.8, margin: "0 0 1.5rem" }}>{reveal.assumption}</p>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.75, margin: "0 0 2.5rem", padding: "1rem 1.25rem", border: "0.5px solid #2d3148", borderRadius: 8, background: "#1a1d27" }}>
              {reveal.reframe}
            </p>

            {showClosing && state === "reveal" && (
              <div style={{ animation: "fadeIn 0.6s ease forwards" }}>
                <p style={{ fontSize: 17, color: "#e5e7eb", lineHeight: 1.8, margin: "0 0 0.75rem", fontStyle: "italic" }}>
                  &ldquo;What would this campaign have needed to show you to make you feel confident about this call?&rdquo;
                </p>
                <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 1.5rem", lineHeight: 1.65 }}>
                  If you want help answering that — that's what a Growth Intelligence diagnostic session is for.
                </p>
                <div style={{ borderTop: "0.5px solid #1f2937", paddingTop: "1.5rem", marginTop: "0.5rem" }}>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 0.75rem" }}>Where should we send your full analysis?</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                      placeholder="you@company.com"
                      style={{
                        flex: 1, minWidth: 200, background: "#1a1d27", border: "0.5px solid #2d3148",
                        borderRadius: 8, color: "#f3f4f6", fontSize: 14, padding: "9px 12px",
                        outline: "none", fontFamily: "inherit",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#4b5563")}
                      onBlur={(e) => (e.target.style.borderColor = "#2d3148")}
                      onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                    />
                    <button
                      onClick={submitEmail}
                      disabled={submitting || !email.trim()}
                      style={{
                        padding: "9px 18px", background: "transparent", border: "0.5px solid #4b5563",
                        borderRadius: 8, color: "#e5e7eb", fontSize: 14, cursor: "pointer",
                        opacity: (submitting || !email.trim()) ? 0.4 : 1, fontFamily: "inherit",
                      }}
                    >
                      {submitting ? "Sending…" : "Send my analysis →"}
                    </button>
                  </div>
                  {emailError && <p style={{ fontSize: 13, color: "#ef4444", margin: "0.5rem 0 0" }}>{emailError}</p>}
                </div>
                <div style={{ marginTop: "2rem" }}>
                  <button onClick={restart} style={{ background: "none", border: "none", color: "#4b5563", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                    ← Try a different decision
                  </button>
                </div>
              </div>
            )}

            {/* ── STATE: DONE ── */}
            {state === "done" && (
              <div style={{ borderTop: "0.5px solid #1f2937", paddingTop: "1.5rem", animation: "fadeIn 0.6s ease forwards" }}>
                <p style={{ fontSize: 15, color: "#e5e7eb", margin: "0 0 0.5rem", lineHeight: 1.7 }}>
                  Your analysis is on its way.
                </p>
                <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 1.5rem", lineHeight: 1.65 }}>
                  In the meantime — sit with the question. The answer you give it is the brief for the diagnostic.
                </p>
                <button onClick={restart} style={{ background: "none", border: "none", color: "#4b5563", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  ← Try a different decision
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        * { box-sizing: border-box; }
        textarea::placeholder, input::placeholder { color: #4b5563; }
      `}</style>
    </div>
  );
}
