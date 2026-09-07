"use client";

// ─── Brief Compliance Checklist — agency-side, interactive ───────────────────
// Closes the loop the rest of the app doesn't: every recommendation surface
// (decision_snapshot, finding.recommendation) records what was suggested,
// never whether it happened. This form lets the agency log, for each
// recommendation from the PRIOR week's report, whether it was done in full,
// done partially (with a reason), or not done (with a reason) — before this
// week's report goes out. Submits once via submitComplianceReport, which
// updates every touched row in one pass.

import { useState } from "react";
import { submitComplianceReport } from "@/lib/actions";
import type { ComplianceItem, ComplianceStatus } from "@/lib/data";

const STATUS_OPTIONS: ComplianceStatus[] = ["Done in full", "Done partially", "Not done"];

const STATUS_STYLES: Record<ComplianceStatus, string> = {
  "Done in full": "bg-emerald-600 text-white border-emerald-600",
  "Done partially": "bg-amber-500 text-white border-amber-500",
  "Not done": "bg-red-500 text-white border-red-500",
  Pending: "bg-white text-neutral-500 border-neutral-200",
};

function ChecklistItem({ item }: { item: ComplianceItem }) {
  const [status, setStatus] = useState<ComplianceStatus>(item.status);
  const needsReason = status === "Done partially" || status === "Not done";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <p className="text-sm text-neutral-800 leading-relaxed mb-3">{item.recommendation_text}</p>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <label key={opt} className="cursor-pointer">
            <input
              type="radio"
              name={`status__${item.id}`}
              value={opt}
              checked={status === opt}
              onChange={() => setStatus(opt)}
              className="sr-only peer"
            />
            <span
              className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                status === opt ? STATUS_STYLES[opt] : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {opt}
            </span>
          </label>
        ))}
      </div>

      {needsReason && (
        <textarea
          name={`reason__${item.id}`}
          defaultValue={item.reason ?? ""}
          placeholder={status === "Not done" ? "Why wasn't this actioned?" : "What got done, and what's still open?"}
          rows={2}
          className="mt-3 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none leading-relaxed"
        />
      )}

      {item.status !== "Pending" && item.acknowledged_by && (
        <p className="text-[10px] text-neutral-400 mt-2">
          Last confirmed by {item.acknowledged_by}
          {item.acknowledged_at &&
            ` · ${new Date(item.acknowledged_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`}
        </p>
      )}
    </div>
  );
}

export function AgencyComplianceChecklist({
  campaignId,
  sourceReportWeek,
  targetReportWeek,
  items,
}: {
  campaignId: string;
  sourceReportWeek: number;
  targetReportWeek: number;
  items: ComplianceItem[];
}) {
  if (items.length === 0) return null;

  const resolved = items.filter((it) => it.status !== "Pending").length;

  return (
    <div id="compliance">
      <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="text-sm font-bold text-neutral-900">Brief compliance report</p>
          <span className="text-xs font-semibold text-neutral-500">
            {resolved} of {items.length} logged
          </span>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed mb-5">
          Week {sourceReportWeek} recommendations, executed during week {targetReportWeek} — confirm what
          actually happened before this week&apos;s report goes to the client.
        </p>

        <form action={submitComplianceReport.bind(null, campaignId)} className="space-y-3">
          {items.map((item) => (
            <ChecklistItem key={item.id} item={item} />
          ))}

          <div className="flex items-center gap-3 pt-2">
            <input
              type="text"
              name="submitted_by"
              placeholder="Your name"
              required
              className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
            <button
              type="submit"
              className="shrink-0 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition"
            >
              Submit compliance report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
