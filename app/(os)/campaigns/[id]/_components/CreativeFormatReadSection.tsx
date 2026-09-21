"use client";

// CreativeFormatReadSection.tsx — Creative Format Read v0.1 schema/UI
//
// ACCESS: INTERNAL ONLY. Client sees nothing from this section — same
// convention as CreativeFatigueSection.tsx. Wired only into
// app/(os)/campaigns/[id]/page.tsx; never import this into app/portal/.
//
// One click generates one row in creative_format_reads (via
// POST /api/creative-format-read) — nothing regenerates automatically, and
// nothing here is ever a draft applied to a field. This is a read, not a
// suggestion: there is no Apply/Reject step, unlike StrategicSynthesisPanel.
//
// Diagnoses a pasted asset description, never a file. No upload, no asset
// library — paste-only by design (see build scope). No Learning Memory
// write, no platform tracker, no creative generation.
//
// The "Unvalidated — pending live-output QA" badge below stays visible
// until Janine explicitly confirms live model-output QA has passed and asks
// for it to be removed — do not remove it as part of any other change.

import { useState } from "react";
import type { CreativeAssetMaturity, CreativeFormatDimensionResult, CreativeFormatReadRun } from "@/lib/types";
import { Badge, Card, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";

const MATURITY_OPTIONS: { value: CreativeAssetMaturity; label: string; desc: string }[] = [
  { value: "script", label: "Script", desc: "Written words only — no visuals, no pacing, no performance yet." },
  { value: "storyboard", label: "Storyboard", desc: "Sequenced frames/beats — shows structure, not execution." },
  { value: "rough_cut", label: "Rough cut", desc: "An actual edit exists — hook, pacing, and delivery can be observed." },
  { value: "final_asset", label: "Final asset", desc: "Finished, ready to run — full execution observable." },
];

const MATURITY_LABEL: Record<CreativeAssetMaturity, string> = {
  script: "Script",
  storyboard: "Storyboard",
  rough_cut: "Rough cut",
  final_asset: "Final asset",
};

// Script/storyboard stages cap observation-dependent dimensions to
// inference server-side (see capEvidenceQualityForMaturity in
// lib/creative-format-read.ts) — this banner surfaces that constraint in
// the strategist-facing UI rather than leaving it buried in rationale text.
const MATURITY_CONFIDENCE_NOTE: Record<CreativeAssetMaturity, string> = {
  script:
    "Script-stage — every read below is inferred from what's written, not observed. Hook, opening frame, proof timing, and creator role can't reach direct-evidence confidence until a rough cut or final asset exists.",
  storyboard:
    "Storyboard-stage — structure is visible but execution isn't. Hook, opening frame, proof timing, and creator role are still capped to inferred confidence.",
  rough_cut:
    "Rough-cut stage — an actual edit exists, so hook, opening frame, proof timing, and creator role can reach direct-evidence confidence where the cut actually shows them.",
  final_asset:
    "Final-asset stage — full execution is observable. Only brand_power_risk stays capped to inferred confidence — it's a forward-looking risk read, never something directly observed.",
};

const EVIDENCE_TONE: Record<string, "green" | "amber" | "neutral"> = {
  direct_evidence: "green",
  inference: "amber",
  insufficient_evidence: "neutral",
};

const EVIDENCE_LABEL: Record<string, string> = {
  direct_evidence: "Direct evidence",
  inference: "Inference",
  insufficient_evidence: "Insufficient evidence",
};

function DimensionCard({ dim }: { dim: CreativeFormatDimensionResult }) {
  if (dim.status === "not_applicable") {
    return (
      <div className="py-1.5 text-xs text-neutral-400">
        <span className="font-medium text-neutral-500">{dim.label}:</span> not applicable to this asset.
      </div>
    );
  }
  if (dim.status === "insufficient_input") {
    return (
      <div className="py-1.5 text-xs text-neutral-400">
        <span className="font-medium text-neutral-500">{dim.label}:</span> not enough was given to diagnose this
        {dim.rationale ? ` — ${dim.rationale}` : "."}
      </div>
    );
  }
  return (
    <div className="border border-neutral-100 rounded-md p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-neutral-800">{dim.label}</span>
        <Badge tone={EVIDENCE_TONE[dim.evidence_quality] ?? "neutral"} className="text-[10px]">
          {EVIDENCE_LABEL[dim.evidence_quality] ?? dim.evidence_quality}
        </Badge>
      </div>
      <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
        {dim.observed_read || "(No read returned for this dimension.)"}
      </p>
      {dim.rationale && <p className="text-[11px] text-neutral-400 leading-relaxed">{dim.rationale}</p>}
      {dim.strengthening_move && (
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          <span className="font-medium text-neutral-400">Could strengthen by:</span> {dim.strengthening_move}
        </p>
      )}
    </div>
  );
}

function RunCard({ run }: { run: CreativeFormatReadRun }) {
  const [expanded, setExpanded] = useState(false);

  if (run.status === "error") {
    return (
      <div className="border border-red-200 bg-red-50 rounded-md p-3">
        <p className="text-xs text-red-800">This run failed: {run.error_message || "Unknown error."}</p>
        <p className="text-[10px] text-neutral-400 mt-1">{new Date(run.created_at).toLocaleString()}</p>
      </div>
    );
  }

  const snippet =
    run.asset_description.length > 90 ? `${run.asset_description.slice(0, 90)}…` : run.asset_description;

  return (
    <div className="border border-neutral-200 rounded-md p-3 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div>
          <p className="text-xs font-medium text-neutral-700">{snippet}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge tone="neutral" className="text-[10px]">
              {MATURITY_LABEL[run.asset_maturity]}
            </Badge>
            <span className="text-[10px] text-neutral-400">{new Date(run.created_at).toLocaleString()}</span>
          </div>
        </div>
        <span className="text-xs text-neutral-400 shrink-0">{expanded ? "Collapse" : "Expand"}</span>
      </button>

      {expanded && (
        <div className="space-y-3 pt-1 border-t border-neutral-100">
          {/* Maturity confidence banner — surfaced visually, not buried in rationale. */}
          <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-xs text-amber-700">{MATURITY_CONFIDENCE_NOTE[run.asset_maturity]}</p>
          </div>

          <div className="space-y-2">
            {run.output_dimensions.map((dim) => (
              <DimensionCard key={dim.key} dim={dim} />
            ))}
          </div>

          {/* Platform note — separated as its own footer, never a 12th dimension. */}
          <div className="rounded bg-neutral-50 border border-neutral-200 px-3 py-2">
            <p className="text-[10px] font-medium text-neutral-400 mb-0.5">Platform note</p>
            <p className="text-xs text-neutral-600">
              {run.platform_seam.platform_dependent
                ? run.platform_seam.platform_note || "This format's effectiveness plausibly depends on current platform conditions."
                : "This format doesn't especially depend on current platform conditions to be judged on the above."}
            </p>
            <p className="text-[10px] text-neutral-400 mt-1 italic">
              Not assessed here — reserved for a future Platform Change / Format Efficacy Intelligence layer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function CreativeFormatReadSection({
  campaignId,
  initialRuns,
}: {
  campaignId: string;
  initialRuns: CreativeFormatReadRun[];
}) {
  const [runs, setRuns] = useState<CreativeFormatReadRun[]>(initialRuns);
  const [assetDescription, setAssetDescription] = useState("");
  const [assetMaturity, setAssetMaturity] = useState<CreativeAssetMaturity>("script");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!assetDescription.trim()) {
      setError("Paste an asset description first.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/creative-format-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          asset_description: assetDescription,
          asset_maturity: assetMaturity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate a read.");
      setRuns((prev) => [data as CreativeFormatReadRun, ...prev]);
      setAssetDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a read.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <SectionTitle id="creative-format-read">Creative Format Read</SectionTitle>
        <Badge tone="amber">Unvalidated — pending live-output QA</Badge>
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        Diagnoses a pasted creative asset or proposed format against this campaign&apos;s FRAME/BIP — before
        production or media spend. Diagnoses, never predicts performance. INTERNAL ONLY.
      </p>

      <div className="space-y-2 mb-4">
        <div>
          <label className={labelClass}>Asset description</label>
          <textarea
            className={`${inputClass} min-h-[100px]`}
            placeholder="Paste the script, storyboard description, or shot-by-shot breakdown here…"
            value={assetDescription}
            onChange={(e) => setAssetDescription(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Asset maturity</label>
          <select
            className={inputClass}
            value={assetMaturity}
            onChange={(e) => setAssetMaturity(e.target.value as CreativeAssetMaturity)}
          >
            {MATURITY_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.desc}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={handleGenerate} disabled={generating} className={buttonClass}>
          {generating ? "Diagnosing…" : "Run Creative Format Read"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {runs.length === 0 ? (
        <p className="text-xs text-neutral-400">No reads yet for this campaign.</p>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </Card>
  );
}
