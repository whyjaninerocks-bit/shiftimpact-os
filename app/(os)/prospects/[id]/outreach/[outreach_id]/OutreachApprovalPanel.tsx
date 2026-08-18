// OutreachApprovalPanel.tsx — client component for the human approval gate
// Three-step flow: edit draft → approve → mark sent
// message_sent is NEVER populated by AI — only by this panel's "Mark Sent" action.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, buttonSecondaryClass, inputClass, labelClass, Card } from "@/app/_components/ui";

type Props = {
  outreachId:    string;
  companyId:     string;
  currentStatus: string;
  messageDraft:  string;
};

export function OutreachApprovalPanel({ outreachId, companyId, currentStatus, messageDraft }: Props) {
  const router = useRouter();
  const [status, setStatus]       = useState(currentStatus);
  const [editedDraft, setEditedDraft] = useState(messageDraft);
  const [sentCopy, setSentCopy]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [showReply, setShowReply] = useState(false);

  async function callAction(action: string, extra?: Record<string, string>) {
    setLoading(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/prospect-outreach/${outreachId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Action failed"); return; }
      setStatus(json.outreach?.status ?? status);
      if (json.next_action) setMsg(json.next_action);
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    await callAction("approve", editedDraft !== messageDraft ? { edited_draft: editedDraft } : {});
  }

  async function handleSend() {
    if (!sentCopy.trim()) { setError("Paste the exact message you sent."); return; }
    await callAction("send", { message_sent: sentCopy });
  }

  async function handleReply() {
    await callAction("reply");
    setShowReply(false);
  }

  async function handleArchive() {
    if (!confirm("Archive this outreach? It will be marked as closed.")) return;
    await callAction("archive");
  }

  // Already in terminal state
  if (status === "Replied" || status === "Archived") {
    return (
      <Card className="border-neutral-100 bg-neutral-50">
        <p className="text-sm text-neutral-500">
          {status === "Replied" ? "This outreach received a reply." : "This outreach has been archived."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Step 1: Edit ─────────────────────────────────────────────────── */}
      {(status === "Drafted") && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Step 1 — Edit if needed</p>
          <textarea
            value={editedDraft}
            onChange={e => setEditedDraft(e.target.value)}
            rows={8}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
        </div>
      )}

      {/* ── Step 2: Approve ──────────────────────────────────────────────── */}
      {(status === "Drafted") && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Step 2 — Approve to lock the draft</p>
          <p className="text-xs text-neutral-400">Approval saves your edited version. You can still choose when to send.</p>
          <button onClick={handleApprove} disabled={loading} className={buttonClass}>
            {loading ? "Approving..." : "Approve Draft"}
          </button>
        </div>
      )}

      {/* ── Step 3: Mark Sent ────────────────────────────────────────────── */}
      {(status === "Approved") && (
        <div className="space-y-3">
          <Card className="border-amber-200 bg-amber-50">
            <p className="text-xs font-semibold text-amber-700 mb-1">Approved — ready to send</p>
            <p className="text-xs text-amber-600">
              Copy the message and send it yourself via {"{channel}"}. Once sent, paste exactly what you sent below.
            </p>
          </Card>
          <div>
            <label className={labelClass}>Exact message you sent *</label>
            <textarea
              value={sentCopy}
              onChange={e => setSentCopy(e.target.value)}
              rows={8}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
              placeholder="Paste the exact copy you sent (may differ from the approved draft if you made last-minute edits)..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSend} disabled={loading || !sentCopy.trim()} className={buttonClass}>
              {loading ? "Saving..." : "Mark as Sent"}
            </button>
            <button onClick={handleArchive} disabled={loading} className={buttonSecondaryClass}>
              Archive
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Mark Reply Received ──────────────────────────────────── */}
      {status === "Sent" && (
        <div className="space-y-3">
          <Card className="border-blue-200 bg-blue-50">
            <p className="text-xs text-blue-700 font-semibold mb-1">Sent</p>
            <p className="text-xs text-blue-600">When they reply, mark it here to advance their relationship status to Warm.</p>
          </Card>
          {!showReply ? (
            <div className="flex gap-3">
              <button onClick={() => setShowReply(true)} className={buttonClass}>
                They Replied
              </button>
              <button onClick={handleArchive} disabled={loading} className={buttonSecondaryClass}>
                Archive
              </button>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <p className="text-sm text-neutral-700">Mark reply received?</p>
              <button onClick={handleReply} disabled={loading} className={buttonClass}>
                {loading ? "Saving..." : "Confirm Reply"}
              </button>
              <button onClick={() => setShowReply(false)} className={buttonSecondaryClass}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {msg   && <p className="text-xs text-neutral-500 mt-2">{msg}</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
