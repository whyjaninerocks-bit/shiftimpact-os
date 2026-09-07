import type { ComplianceRecordClientSafe } from "@/lib/data";
import { SectionHeading } from "./reportUi";
import { ClientComplianceItem } from "./ClientComplianceItem";

// ─── Brief Compliance Report — client-facing ──────────────────────────────────
// "We said we'd do this last week — here's whether we did." Summary of
// report_recommendation_compliance for the report before the one currently
// visible. The agency logs status via AgencyComplianceChecklist for anything
// in their scope; the client can reassign an item that isn't actually the
// agency's to execute to an internal PIC (see ClientComplianceItem /
// migration 0083), at which point they can mark it done themselves. Renders
// null until the agency has actually logged a checklist — same graceful-
// degradation pattern as every other not-yet-active section in this portal.

export function ComplianceSection({
  campaignId,
  record,
}: {
  campaignId: string;
  record: ComplianceRecordClientSafe | null;
}) {
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
          what actually happened. If something below isn't on us to fix, you can reassign it to the
          right person on your side.
        </p>
        <div className="space-y-2">
          {record.items.map((item) => (
            <ClientComplianceItem key={item.id} campaignId={campaignId} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
