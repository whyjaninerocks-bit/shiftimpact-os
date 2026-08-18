// app/(os)/prospects/BatchScanButton.tsx
// Client component — scans all tracked prospects one by one with live progress.
// Runs sequentially client-side to avoid Vercel 60s function timeout.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BatchScanButton() {
  const router = useRouter();
  const [running, setRunning]     = useState(false);
  const [progress, setProgress]   = useState<{ done: number; total: number; current: string } | null>(null);
  const [summary, setSummary]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  async function runBatchScan() {
    setRunning(true);
    setProgress(null);
    setSummary(null);
    setError(null);

    // 1. Fetch all scannable companies
    let companies: { id: string; name: string }[] = [];
    try {
      const res = await fetch("/api/prospect-companies?limit=50");
      const json = await res.json();
      companies = (json.companies ?? []).filter(
        (c: { status?: string }) => c.status !== "Archived"
      );
    } catch {
      setError("Could not load company list.");
      setRunning(false);
      return;
    }

    if (companies.length === 0) {
      setSummary("No companies to scan.");
      setRunning(false);
      return;
    }

    // 2. Scan each company sequentially
    let totalNew = 0;
    let totalDup = 0;
    let failures = 0;

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      setProgress({ done: i, total: companies.length, current: company.name });

      try {
        const res = await fetch("/api/prospect-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: company.id }),
        });
        const json = await res.json();
        totalNew += json.signals_new ?? 0;
        totalDup += json.signals_duplicate ?? 0;
        if (!res.ok) failures++;
      } catch {
        failures++;
      }
    }

    setProgress({ done: companies.length, total: companies.length, current: "" });
    setSummary(
      `Scan complete. ${companies.length} companies scanned — ` +
      `${totalNew} new signal${totalNew !== 1 ? "s" : ""} found` +
      (totalDup > 0 ? `, ${totalDup} already tracked` : "") +
      (failures > 0 ? `, ${failures} failed` : "") +
      "."
    );
    setRunning(false);
    router.refresh();
  }

  if (running && progress) {
    const pct = Math.round((progress.done / progress.total) * 100);
    return (
      <div className="flex flex-col gap-1.5 min-w-56">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>
            {progress.current
              ? `Scanning ${progress.current}…`
              : "Finalising…"}
          </span>
          <span>{progress.done}/{progress.total}</span>
        </div>
        <div className="w-full bg-neutral-100 rounded-full h-1.5">
          <div
            className="bg-neutral-900 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={runBatchScan}
        disabled={running}
        className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-40 transition-colors"
      >
        Scan All
      </button>
      {summary && (
        <p className="text-xs text-neutral-500 text-right max-w-64">{summary}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
