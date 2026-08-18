"use client";

// PortalChatWidget — LLM-backed Q&A for the live client portal.
// Calls /api/portal-chat which pulls real campaign signal data from the OS
// and asks Claude to reason from it. Every answer is data-defensible.
//
// Three-tier responses:
//   Tier 1 — Fact/data defense: answered fully from OS data
//   Tier 2 — Interpretation with caveats: answered + missing-data flagged
//   Tier 3 — Escalation: [ESCALATE: reason] token triggers auto email to strategist

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "ai"; text: string; escalated?: boolean };

// Strip the [ESCALATE: ...] token from displayed text — it's internal plumbing
function stripEscalateToken(text: string): string {
  return text.replace(/\[ESCALATE:[^\]]*\]/g, "").trim();
}

function hasEscalateToken(text: string): boolean {
  return /\[ESCALATE:/i.test(text);
}

const SUGGESTIONS = [
  "Where does the health score come from?",
  "Is the campaign on track to open the next gate?",
  "What's the save rate trend telling us?",
  "Why hasn't the gate fired yet?",
];

export function PortalChatWidget({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Ask me anything about this report — the signals, gate status, KOL performance, health score, predictions, or any number you want explained.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function handleSubmit(question: string) {
    if (!question.trim() || streaming) return;

    const userMsg: Message = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    // Add empty AI message that will be filled by stream
    setMessages((prev) => [...prev, { role: "ai", text: "" }]);

    try {
      const res = await fetch("/api/portal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, question }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = {
            role: "ai",
            text: "Something went wrong loading the campaign data. Please try again or contact your strategist directly.",
          };
          return msgs;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = {
            role: "ai",
            text: fullText,
            escalated: hasEscalateToken(fullText),
          };
          return msgs;
        });
      }

      // Final update — clean the displayed text
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: "ai",
          text: stripEscalateToken(fullText),
          escalated: hasEscalateToken(fullText),
        };
        return msgs;
      });
    } catch {
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: "ai",
          text: "Unable to reach the intelligence layer right now. Contact your strategist directly.",
        };
        return msgs;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-full shadow-xl text-sm font-medium hover:bg-neutral-700 transition-colors"
          aria-label="Open Q&A assistant"
        >
          <span className="text-base">💬</span>
          <span>Ask about this report</span>
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:w-[420px] sm:bottom-6 sm:right-6 flex flex-col bg-white border border-neutral-200 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: "80vh" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-900">
            <div>
              <p className="text-sm font-semibold text-white">Report Intelligence</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Answers grounded in your campaign data</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-white text-lg leading-none px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] text-sm leading-relaxed rounded-xl px-3.5 py-2.5 whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-50 border border-neutral-100 text-neutral-800"
                  }`}
                >
                  {msg.role === "ai" && msg.text === "" && streaming
                    ? <span className="inline-flex gap-1 items-center text-neutral-400 text-xs"><span className="animate-pulse">●</span><span className="animate-pulse" style={{ animationDelay: "0.15s" }}>●</span><span className="animate-pulse" style={{ animationDelay: "0.3s" }}>●</span></span>
                    : msg.text
                  }
                  {/* Escalation notice */}
                  {msg.role === "ai" && msg.escalated && msg.text !== "" && (
                    <div className="mt-3 pt-3 border-t border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-800">
                      <span className="font-semibold">Your strategist has been notified</span> — they&apos;ll follow up on this question directly.
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Suggestion chips — show only on first message */}
            {messages.length === 1 && !streaming && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s)}
                    className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-full transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-neutral-100">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any number in this report…"
                disabled={streaming}
                className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-400"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {streaming ? "…" : "Ask"}
              </button>
            </form>
            <p className="text-[10px] text-neutral-400 mt-2 text-center">
              Answers are grounded in your live OS data · Strategic decisions involve your strategist
            </p>
          </div>
        </div>
      )}
    </>
  );
}
