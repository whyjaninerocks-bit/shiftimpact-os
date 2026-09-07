import type { ComplianceRecordClientSafe } from "@/lib/data";
import { SectionHeading, StatusPill } from "./reportUi";

// ─── Brief Compliance Report — client-facing, read-only ──────────────────────
// "We said we'd do this last week — here's whether we did." Read-only summary
// of report_recommendation_compliance for the report before the one currently
// visible. The agency logs status via AgencyComplianceChecklist; nothing here
// is editable by the client. Renders null until the agency has actually
// logged a checklist — same graceful-degradation pattern as every other
// not-yet-active section in this portal.

const STATUS_TONE: Record<string, string> = {
  "Done in full": "On Track",
  "Done partially": "At Risk",
  "Not done": "Blocked",
};

export function ComplianceSection({ record }: { record: ComplianceRecordClientSafe | null }) {
  if (!record) return null;

  const doneInFull = record.items.filter((it) => it.status === "Done in full").length;

  return (
    <section id="compliance" className="space-y-3 scroll-mt-20">
      <SectionHeading
        title="Brief compliance report"
        subtitle={`Week ${record.sourceReportWeek} recommendations, checked before week ${record.targetReportWeek} published`}
      />
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
        <p className="text-xs text-neutral-500">
          {doneInFull} of {record.items.length} actioned in full — every recommendation we made, and
          what actually happened.
        </p>
        <div className="space-y-2">
          {record.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3.5 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-neutral-700 leading-relaxed flex-1">{item.recommendation_text}</p>
                <span className="shrink-0">
                  <StatusPill status={STATUS_TONE[item.status] ?? "Pending"} label={item.status} />
                </span>
              </div>
              {item.reason && (
                <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">{item.reason}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
