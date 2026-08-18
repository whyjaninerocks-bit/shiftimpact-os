"use client";

// PortalChatWidget — LLM-backed Q&A for the live client portal.
// Calls /api/portal-chat which pulls real campaign signal data and reasons from it.
//
// Escalation flow:
//   1. Claude detects question needs strategist → returns [ESCALATE:...] token + __ESCALATE_META__ sentinel
//   2. Widget strips tokens from display, shows confirm card:
//      "Would you like your strategist to follow up on this?"
//   3. Client clicks Yes → POST /api/portal-notify → strategist receives contextual email
//   4. Client clicks No → card dismissed, no email sent

import { useState, useRef, useEffect } from "react";

type EscalateMeta = {
  reason: string;
  campaign_id: string;
  campaign_name: string;
  client_name: string;
};

type Message = {
  role: "user" | "ai";
  text: string;
  escalateMeta?: EscalateMeta | null;
  notifyState?: "pending" | "sent" | "dismissed";
};

// Strip [ESCALATE:...] and __ESCALATE_META__ sentinel from displayed text
function stripTokens(text: string): string {
  return text
    .replace(/\[ESCALATE:[^\]]*\]/gi, "")
    .replace(/\[__ESCALATE_META__[^\]]*\]/g, "")
    .trim();
}

// Extract escalate meta from sentinel line appended by the API
function extractEscalateMeta(text: string): EscalateMeta | null {
  const match = text.match(/\[__ESCALATE_META__(.*?)\]/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as EscalateMeta;
  } catch {
    return null;
  }
}

const SUGGESTIONS = [
  "Where does the health score come from?",
  "Is the campaign on track to open the next gate?",
  "What does the save rate trend tell us?",
  "Why hasn't the gate fired yet?",
];

export function PortalChatWidget({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Ask me anything about this report — signals, gate status, KOL performance, health score, predictions, or any number you want explained.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function handleSubmit(question: string) {
    if (!question.trim() || streaming) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setStreaming(true);
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
            text: "Something went wrong. Please try again or contact your strategist directly.",
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
          msgs[msgs.length - 1] = { role: "ai", text: fullText };
          return msgs;
        });
      }

      // Final — extract escalation meta and clean display text
      const escalateMeta = extractEscalateMeta(fullText);
      const cleanText = stripTokens(fullText);

      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: "ai",
          text: cleanText,
          escalateMeta: escalateMeta ?? undefined,
          notifyState: escalateMeta ? "pending" : undefined,
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

  async function handleNotifyConfirm(msgIndex: number, confirm: boolean) {
    const msg = messages[msgIndex];
    if (!msg?.escalateMeta) return;

    if (!confirm) {
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgIndex] = { ...msgs[msgIndex], notifyState: "dismissed" };
        return msgs;
      });
      return;
    }

    setMessages((prev) => {
      const msgs = [...prev];
      msgs[msgIndex] = { ...msgs[msgIndex], notifyState: "sent" };
      return msgs;
    });

    // Find the user question that prompted this response
    const userQuestion = messages[msgIndex - 1]?.text ?? "";

    try {
      await fetch("/api/portal-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: msg.escalateMeta.campaign_id,
          campaign_name: msg.escalateMeta.campaign_name,
          client_name: msg.escalateMeta.client_name,
          client_question: userQuestion,
          widget_response: msg.text,
          escalation_reason: msg.escalateMeta.reason,
          portal_url: window.location.href,
        }),
      });
    } catch {
      console.error("[PortalChatWidget] notify failed");
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-full shadow-xl text-sm font-medium hover:bg-neutral-700 transition-colors"
        >
          <span>💬</span>
          <span>Ask about this report</span>
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-0 right-0 z-50 w-full sm:w-[420px] sm:bottom-6 sm:right-6 flex flex-col bg-white border border-neutral-200 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: "80vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900">
            <div>
              <p className="text-sm font-semibold text-white">Report Intelligence</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Answers grounded in your campaign data</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-white text-lg px-1">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[90%] space-y-2">
                  <div
                    className={`text-sm leading-relaxed rounded-xl px-3.5 py-2.5 whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-50 border border-neutral-100 text-neutral-800"
                    }`}
                  >
                    {msg.role === "ai" && msg.text === "" && streaming
                      ? <span className="inline-flex gap-1 items-center text-neutral-400 text-xs">
                          <span className="animate-pulse">●</span>
                          <span className="animate-pulse" style={{ animationDelay: "0.15s" }}>●</span>
                          <span className="animate-pulse" style={{ animationDelay: "0.3s" }}>●</span>
                        </span>
                      : msg.text
                    }
                  </div>

                  {/* Escalation confirm card */}
                  {msg.role === "ai" && msg.notifyState === "pending" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-900">This question may need your strategist&apos;s input.</p>
                      <p className="text-xs text-amber-800">Would you like them to follow up and investigate further?</p>
                      <div className="flex gap-2 pt-0.5">
                        <button
                          onClick={() => handleNotifyConfirm(i, true)}
                          className="text-xs bg-amber-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-amber-800 transition-colors"
                        >
                          Yes, notify my strategist
                        </button>
                        <button
                          onClick={() => handleNotifyConfirm(i, false)}
                          className="text-xs text-amber-700 hover:text-amber-900 px-2 py-1.5 transition-colors"
                        >
                          No, I&apos;m good
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sent confirmation */}
                  {msg.role === "ai" && msg.notifyState === "sent" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                      <p className="text-xs text-emerald-800">
                        <span className="font-semibold">✓ Your strategist has been notified</span> — they&apos;ll follow up directly.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

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
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }} className="flex gap-2">
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
                className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-700 disabled:opacity-40 transition-colors"
              >
                {streaming ? "…" : "Ask"}
              </button>
            </form>
            <p className="text-[10px] text-neutral-400 mt-2 text-center">
              Answers grounded in live OS data · Strategic decisions involve your strategist
            </p>
          </div>
        </div>
      )}
    </>
  );
}
