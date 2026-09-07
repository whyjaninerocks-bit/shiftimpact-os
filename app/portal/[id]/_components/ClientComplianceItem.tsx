"use client";

// ─── Client-facing compliance item — reassignable to an internal PIC ────────
// Default state (owner_scope "agency"): same read-only summary as before,
// plus a low-key "Not our scope?" toggle so the client can hand this specific
// recommendation to the right person on their side (assigned_pic) rather than
// letting it sit as an unfair "Not done" against the agency.
//
// Once reassigned (owner_scope "client"): the client can mark the item's
// status themselves — same Done in full / Done partially / Not done flow the
// agency uses — via submitClientComplianceStatus, guarded server-side to
// only ever touch items actually reassigned to the client.

import { useState } from "react";
import { reassignComplianceItem, submitClientComplianceStatus } from "@/lib/actions";
import { StatusPill } from "./reportUi";
import { Collapse } from "@/app/portal/_components/Collapse";
import type { ComplianceRecordClientSafe } from "@/lib/data";

const STATUS_TONE: Record<string, string> = {
  "Done in full": "On Track",
  "Done partially": "At Risk",
  "Not done": "Blocked",
};

type Item = ComplianceRecordClientSafe["items"][number];

function ReassignForm({ campaignId, itemId }: { campaignId: string; itemId: string }) {
  return (
    <form action={reassignComplianceItem.bind(null, campaignId)} className="mt-2 space-y-2">
      <input type="hidden" name="item_id" value={itemId} />
      <input
        type="text"
        name="assigned_pic"
        placeholder="Who should own this? (name)"
        required
        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
      />
      <input
        type="text"
        name="reassigned_by"
        placeholder="Your name"
        required
        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
      />
      <button
        type="submit"
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 transition"
      >
        Reassign
      </button>
    </form>
  );
}

const CLIENT_STATUS_OPTIONS = ["Done in full", "Done partially", "Not done"] as const;

function ClientStatusForm({ campaignId, item }: { campaignId: string; item: Item }) {
  const [status, setStatus] = useState<string>("Pending");
  const needsReason = status === "Done partially" || status === "Not done";

  return (
    <form action={submitClientComplianceStatus.bind(null, campaignId)} className="mt-2 space-y-2">
      <input type="hidden" name={`status__${item.id}`} value={status === "Pending" ? "" : status} />
      <div className="flex flex-wrap gap-1.5">
        {CLIENT_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setStatus(opt)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              status === opt
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {needsReason && (
        <textarea
          name={`reason__${item.id}`}
          placeholder={status === "Not done" ? "Why wasn't this actioned?" : "What got done, and what's still open?"}
          rows={2}
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
        />
      )}
      <input
        type="text"
        name="submitted_by"
        placeholder="Your name"
        defaultValue={item.assigned_pic ?? ""}
        required
        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
      />
      <button
        type="submit"
        disabled={status === "Pending"}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 transition"
      >
        Submit
      </button>
    </form>
  );
}

export function ClientComplianceItem({ campaignId, item }: { campaignId: string; item: Item }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-neutral-700 leading-relaxed flex-1">{item.recommendation_text}</p>
        <span className="shrink-0">
          <StatusPill status={STATUS_TONE[item.status] ?? "Pending"} label={item.status} />
        </span>
      </div>
      {item.reason && (
        <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">{item.reason}</p>
      )}

      {item.owner_scope === "client" ? (
        <>
          <p className="text-[10px] font-semibold text-blue-700 mt-2">
            Assigned to {item.assigned_pic}
          </p>
          {item.status === "Pending" && <ClientStatusForm campaignId={campaignId} item={item} />}
        </>
      ) : (
        <Collapse label="Not our scope? Reassign" variant="inline">
          <ReassignForm campaignId={campaignId} itemId={item.id} />
        </Collapse>
      )}
    </div>
  );
}
