// app/(os)/prospects/[id]/ProspectActions.tsx
// Client component — Scan, Assess, and Add Person actions for a prospect company.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, buttonSecondaryClass, inputClass, labelClass, Card } from "@/app/_components/ui";

type Props = { companyId: string; companyName: string; showGoDeepOnly?: boolean; alreadyPursuing?: boolean };

export function ProspectActions({ companyId, companyName, showGoDeepOnly = false, alreadyPursuing = false }: Props) {
  const router = useRouter();
  const [scanning, setScanning]     = useState(false);
  const [assessing, setAssessing]   = useState(false);
  const [goingDeep, setGoingDeep]   = useState(false);
  const [enriching, setEnriching]   = useState(false);
  const [scanMsg, setScanMsg]       = useState<string | null>(null);
  const [assessMsg, setAssessMsg]   = useState<string | null>(null);
  const [deepMsg, setDeepMsg]       = useState<string | null>(null);
  const [enrichMsg, setEnrichMsg]   = useState<string | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [savingPerson, setSavingPerson]   = useState(false);
  const [personError, setPersonError]     = useState<string | null>(null);

  async function runScan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await fetch("/api/prospect-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      const json = await res.json();
      if (!res.ok) { setScanMsg(`Scan failed: ${json.error ?? "unknown error"}`); return; }
      const newCount  = json.signals_new       ?? 0;
      const dupCount  = json.signals_duplicate ?? 0;
      const warning   = json.warning ? ` Warning: ${json.warning}` : "";
      setScanMsg(
        newCount > 0
          ? `Scan complete. ${newCount} new signal${newCount !== 1 ? "s" : ""} detected${dupCount > 0 ? `, ${dupCount} duplicate${dupCount !== 1 ? "s" : ""} skipped` : ""}.`
          : `Scan complete. No new signals found${dupCount > 0 ? ` (${dupCount} already tracked)` : ""}.${warning}`
      );
      router.refresh();
    } catch (e) {
      setScanMsg(`Scan error: ${String(e)}`);
    } finally {
      setScanning(false);
    }
  }

  async function runAssess() {
    setAssessing(true);
    setAssessMsg(null);
    try {
      const res = await fetch("/api/prospect-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      const json = await res.json();
      if (!res.ok) { setAssessMsg(`Assessment failed: ${json.error ?? "unknown error"}`); return; }
      const s = json.scores;
      const rec = json.insight?.recommendation ? ` · ${json.insight.recommendation}` : "";
      setAssessMsg(`Assessment complete. Opportunity: ${s?.opportunity_score}, Pursuit: ${s?.pursuit_score}${rec}. Offer: ${json.assessment?.recommended_offer}.`);
      router.refresh();
    } catch (e) {
      setAssessMsg(`Assessment error: ${String(e)}`);
    } finally {
      setAssessing(false);
    }
  }

  async function goDeep() {
    setGoingDeep(true);
    setDeepMsg(null);
    try {
      const res = await fetch("/api/prospect-pursue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      const json = await res.json();
      if (!res.ok) { setDeepMsg(`Deep dive failed: ${json.error ?? "unknown error"}`); return; }
      setDeepMsg("Deep dive complete. Full intelligence report ready.");
      router.refresh();
    } catch (e) {
      setDeepMsg(`Deep dive error: ${String(e)}`);
    } finally {
      setGoingDeep(false);
    }
  }

  async function addPerson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPerson(true);
    setPersonError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/prospect-people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: companyId,
        name:       fd.get("name"),
        role:       fd.get("role") || null,
        linkedin_url: fd.get("linkedin_url") || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setPersonError(json.error ?? "Failed to add person"); setSavingPerson(false); return; }
    setShowAddPerson(false);
    router.refresh();
  }

  async function runEnrich() {
    setEnriching(true);
    setEnrichMsg(null);
    try {
      const res = await fetch("/api/prospect-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      const json = await res.json();
      if (!res.ok) { setEnrichMsg(`Enrichment failed: ${json.error ?? "unknown error"}`); return; }
      if (json.warning) { setEnrichMsg(json.warning); return; }
      const fields = Object.keys(json.enriched_fields ?? {});
      setEnrichMsg(
        fields.length > 0
          ? `Enriched: ${fields.join(", ")} · Confidence: ${json.confidence ?? "?"}`
          : "No new data found to enrich."
      );
      router.refresh();
    } catch (e) {
      setEnrichMsg(`Enrichment error: ${String(e)}`);
    } finally {
      setEnriching(false);
    }
  }

  // "Go Deep" inline button — rendered inside the Intelligence Read card
  if (showGoDeepOnly) {
    return (
      <div className="space-y-2">
        <button
          onClick={goDeep}
          disabled={goingDeep}
          className="w-full text-sm font-medium px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {goingDeep
            ? "Generating deep dive..."
            : alreadyPursuing
              ? "Refresh Deep Dive"
              : "Go Deep — I'm pursuing this"}
        </button>
        {deepMsg && <p className="text-sm text-neutral-600">{deepMsg}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={runScan} disabled={scanning} className={buttonClass}>
          {scanning ? "Scanning..." : "Scan for Signals"}
        </button>
        <button onClick={runAssess} disabled={assessing} className={buttonSecondaryClass}>
          {assessing ? "Assessing..." : "Run Assessment"}
        </button>
        <button onClick={runEnrich} disabled={enriching} className={buttonSecondaryClass}>
          {enriching ? "Enriching..." : "Enrich Profile"}
        </button>
        <button
          onClick={() => setShowAddPerson(v => !v)}
          className={buttonSecondaryClass}
        >
          {showAddPerson ? "Cancel" : "Add Person"}
        </button>
      </div>

      {scanMsg   && <p className="text-sm text-neutral-600">{scanMsg}</p>}
      {assessMsg && <p className="text-sm text-neutral-600">{assessMsg}</p>}
      {deepMsg   && <p className="text-sm text-neutral-600">{deepMsg}</p>}
      {enrichMsg && <p className="text-sm text-neutral-600">{enrichMsg}</p>}

      {showAddPerson && (
        <Card className="max-w-sm">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Add Person at {companyName}</p>
          <form onSubmit={addPerson} className="space-y-3">
            <div>
              <label className={labelClass}>Name *</label>
              <input name="name" required className={inputClass} placeholder="Full name" />
            </div>
            <div>
              <label className={labelClass}>Role / Title</label>
              <input name="role" className={inputClass} placeholder="CMO, Head of Marketing..." />
            </div>
            <div>
              <label className={labelClass}>LinkedIn URL</label>
              <input name="linkedin_url" type="url" className={inputClass} placeholder="https://linkedin.com/in/..." />
            </div>
            {personError && <p className="text-xs text-red-600">{personError}</p>}
            <button type="submit" disabled={savingPerson} className={buttonClass}>
              {savingPerson ? "Adding..." : "Add Person"}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
