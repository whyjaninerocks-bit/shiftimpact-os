"use client";
// app/(os)/diagnostic/[id]/page.tsx
// Sprint 11 — Diagnostic Session detail + deliverable generation

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type SessionStatus = "Booked" | "In Progress" | "Delivered" | "Archived";

interface DiagnosticSession {
  id: string;
  client_name: string;
  contact_name: string | null;
  contact_email: string | null;
  industry: string;
  budget_range: string | null;
  current_channels: string[];
  pain_points: string | null;
  current_tools: string | null;
  engagement_fee_rm: number | null;
  status: SessionStatus;
  deliverable_text: string | null;
  brief_json: Record<string, unknown>;
  model_used: string | null;
  session_date: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

function statusColor(status: SessionStatus): string {
  if (status === "Delivered") return "bg-emerald-100 text-emerald-800";
  if (status === "In Progress") return "bg-amber-100 text-amber-800";
  if (status === "Archived") return "bg-neutral-100 text-neutral-600";
  return "bg-blue-100 text-blue-800"; // Booked
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_OPTIONS: SessionStatus[] = ["Booked", "In Progress", "Delivered", "Archived"];

export default function DiagnosticSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/diagnostic-session?id=${id}`)
      .then(r => r.json())
      .then(d => { setSession(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function generateDeliverable() {
    if (!session) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/diagnostic-session/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setSession(s => s ? { ...s, deliverable_text: data.deliverable, status: "In Progress" } : s);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(status: SessionStatus) {
    if (!session) return;
    setUpdatingStatus(true);
    const updates: Record<string, unknown> = { id, status };
    if (status === "Delivered") updates.delivered_at = new Date().toISOString();
    await fetch("/api/diagnostic-session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSession(s => s ? { ...s, status } : s);
    setUpdatingStatus(false);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-neutral-500">Session not found.</p>
        <Link href="/diagnostic" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
          ← Back to sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <Link href="/diagnostic" className="text-xs text-neutral-400 hover:text-neutral-600 inline-block">
        ← Diagnostic Sessions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-neutral-900">{session.client_name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor(session.status)}`}>
              {session.status}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            {session.industry}
            {session.contact_name ? ` · ${session.contact_name}` : ""}
            {session.session_date ? ` · ${fmtDate(session.session_date)}` : ""}
          </p>
        </div>

        {/* Status update */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={session.status}
            onChange={e => updateStatus(e.target.value as SessionStatus)}
            disabled={updatingStatus}
            className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Intake summary */}
      <div className="rounded-lg border border-neutral-100 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700 mb-3">Session Details</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
          {[
            ["Contact", session.contact_name ?? "—"],
            ["Email", session.contact_email ?? "—"],
            ["Budget Range", session.budget_range ?? "—"],
            ["Engagement Fee", session.engagement_fee_rm ? `RM ${Number(session.engagement_fee_rm).toLocaleString("en-MY")}` : "—"],
            ["Session Date", fmtDate(session.session_date)],
            ["Delivered", fmtDate(session.delivered_at)],
            ["Model", session.model_used ?? "—"],
            ["Created", fmtDate(session.created_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-neutral-400 uppercase tracking-wide text-[10px]">{label}</p>
              <p className="text-neutral-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {session.current_channels.length > 0 && (
          <div className="mt-4">
            <p className="text-neutral-400 uppercase tracking-wide text-[10px] mb-1.5">Active Channels</p>
            <div className="flex flex-wrap gap-1.5">
              {session.current_channels.map(ch => (
                <span key={ch} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">{ch}</span>
              ))}
            </div>
          </div>
        )}

        {session.current_tools && (
          <div className="mt-4">
            <p className="text-neutral-400 uppercase tracking-wide text-[10px] mb-1">Current Tools</p>
            <p className="text-xs text-neutral-700">{session.current_tools}</p>
          </div>
        )}

        {session.pain_points && (
          <div className="mt-4">
            <p className="text-neutral-400 uppercase tracking-wide text-[10px] mb-1">Pain Points</p>
            <p className="text-xs text-neutral-700 whitespace-pre-line">{session.pain_points}</p>
          </div>
        )}
      </div>

      {/* Deliverable section */}
      <div className="rounded-lg border border-neutral-100 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-700">Diagnostic Brief</h2>
          <button
            onClick={generateDeliverable}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" />
                Generating…
              </>
            ) : (
              <>✦ {session.deliverable_text ? "Regenerate" : "Generate Deliverable"}</>
            )}
          </button>
        </div>

        {genError && (
          <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{genError}</p>
        )}

        {session.deliverable_text ? (
          <div className="space-y-4">
            {/* Raw brief — monospaced for easy copy */}
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-800 bg-neutral-50 rounded-md p-4 border border-neutral-100 font-mono">
              {session.deliverable_text}
            </pre>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (session.deliverable_text) {
                    navigator.clipboard.writeText(session.deliverable_text);
                  }
                }}
                className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-2"
              >
                Copy to clipboard
              </button>
              {session.brief_json && (session.brief_json as Record<string, unknown>).word_count && (
                <span className="text-xs text-neutral-400">
                  {String((session.brief_json as Record<string, unknown>).word_count)} words
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-neutral-200 py-10 text-center">
            <p className="text-sm text-neutral-400">No brief generated yet.</p>
            <p className="text-xs text-neutral-300 mt-1">
              Click Generate Deliverable to produce the 5-section Diagnostic Brief.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
