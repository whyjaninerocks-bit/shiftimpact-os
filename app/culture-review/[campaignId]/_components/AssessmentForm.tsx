"use client";

// Firewall prototype / security spike — the one interactive control on the
// external gated culture assessment page. Renders per cited signal. Only
// shown at all when the caller's access_level is view_plus_assessment;
// the real enforcement is the RLS policy on the server action, this UI
// gate is a convenience, not the security boundary.

import { useState, useTransition } from "react";
import { DURABILITY_STATUS_OPTIONS } from "@/lib/cultural-signal-picker";
import { saveAssessment } from "../actions";

export function AssessmentForm({
  campaignId,
  culturalSignalId,
  currentStatus,
  currentNote,
}: {
  campaignId: string;
  culturalSignalId: string;
  currentStatus: string | null;
  currentNote: string | null;
}) {
  const [status, setStatus] = useState(currentStatus ?? "");
  const [note, setNote] = useState(currentNote ?? "");
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const formData = new FormData();
    formData.set("campaign_id", campaignId);
    formData.set("cultural_signal_id", culturalSignalId);
    formData.set("durability_status", status);
    formData.set("note", note);

    startTransition(async () => {
      const res = await saveAssessment(formData);
      setResult(res.ok ? { ok: true } : { ok: false, error: res.error });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
      <label className="block text-xs font-medium text-neutral-500">
        Your durability assessment
      </label>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        required
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
      >
        <option value="" disabled>
          Choose an assessment…
        </option>
        {DURABILITY_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !status}
          className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save assessment"}
        </button>
        {result?.ok && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
        {result && !result.ok && (
          <span className="text-xs text-red-600 font-medium break-all">{result.error}</span>
        )}
      </div>
    </form>
  );
}
