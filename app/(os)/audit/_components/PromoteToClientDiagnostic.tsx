"use client";

// PromoteToClientDiagnostic.tsx — Phase 2 client-stage bridge (migration 0104).
//
// INTERNAL ONLY. This is the entry point for A → C in the Brand-Commerce
// three-layer architecture: takes a prospect /audit read and promotes it
// into a brand_commerce_diagnostic row on a chosen campaign, via
// promoteProspectAuditToDiagnostic in lib/actions.ts. It does not classify
// anything, does not touch campaign_signal_maps, and does not mark the new
// diagnostic reviewed — it only creates the starting record a strategist
// then works from inside BrandCommerceDiagnosticSection on the campaign
// page. Deliberately placed in the internal toolbar strip at the top of
// /audit/[id] (outside #audit-report-content, the PDF-captured/shareable
// region) rather than inside the report body itself.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteProspectAuditToDiagnostic } from "@/lib/actions";

export type CampaignPickerOption = { id: string; label: string };

export function PromoteToClientDiagnostic({
  auditId,
  campaignOptions,
}: {
  auditId: string;
  campaignOptions: CampaignPickerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handlePromote() {
    setError(null);
    if (!campaignId) {
      setError("Select a campaign first.");
      return;
    }
    startTransition(async () => {
      try {
        await promoteProspectAuditToDiagnostic({ audit_id: auditId, campaign_id: campaignId });
        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not promote this audit.");
      }
    });
  }

  if (success) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
        Promoted — open the campaign page to review
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white text-xs font-medium hover:bg-white/20 transition-colors"
      >
        Promote to Client Diagnostic
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="text-xs px-2 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white"
        value={campaignId}
        onChange={(e) => setCampaignId(e.target.value)}
      >
        <option value="" className="text-black">Select a campaign…</option>
        {campaignOptions.map((c) => (
          <option key={c.id} value={c.id} className="text-black">{c.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handlePromote}
        disabled={pending || !campaignId}
        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
      >
        {pending ? "Promoting…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setError(null); }}
        className="text-xs text-slate-400 hover:text-white"
      >
        Cancel
      </button>
      {error && <span className="text-[10px] text-red-400 max-w-[220px]">{error}</span>}
    </div>
  );
}
