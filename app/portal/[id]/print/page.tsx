import { notFound } from "next/navigation";
import { getCampaign, getLatestCampaignReport } from "@/lib/data";
import { PrintButton } from "./PrintButton";

// ─── Weekly report — print / save-as-PDF view ────────────────────────────────
// A clean, chrome-free rendering of the same released weekly report shown in
// the portal's "Weekly intelligence report" section — no sidebar, no nav, no
// interactive widgets — so a client can print it or use the browser's
// "Save as PDF" from the print dialog and forward it internally without
// giving someone portal access. There is no PDF-generation library wired
// into this app (checked before building — see ReportHistorySection's
// comment on the same gap), so this uses the browser's native print
// pipeline rather than adding a new dependency for one button.
//
// Same release gating as the main portal: only shows once the report has
// actually gone out to the client (client_released_at or
// portal_published_at) — a report still sitting in agency preview should
// not be printable from a guessable URL.

export const dynamic = "force-dynamic";

export default async function PrintReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, report] = await Promise.all([getCampaign(id), getLatestCampaignReport(id)]);

  if (!campaign) notFound();

  const isReleased = !!report && (!!report.client_released_at || !!report.portal_published_at);
  if (!report || !isReleased) notFound();

  const releasedAt = report.client_released_at ?? report.portal_published_at;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 print:px-0 print:py-0">
      <div className="print:hidden mb-6">
        <PrintButton />
      </div>

      <header className="mb-8 pb-6 border-b-2 border-neutral-900">
        <p className="text-xs text-neutral-500">{campaign.client_name}</p>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">{campaign.name}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {report.report_label} · Week {report.report_week}
        </p>
      </header>

      {report.agency_note && (
        <div className="mb-6 border-l-4 border-blue-400 pl-4 py-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">
            A note from your agency
          </p>
          <p className="text-sm text-neutral-800 leading-relaxed">{report.agency_note}</p>
        </div>
      )}

      {report.risk_posture && (
        <p className="text-xs font-semibold text-neutral-500 mb-4">
          Brand posture: <span className="text-neutral-900">{report.risk_posture}</span>
        </p>
      )}

      {report.executive_summary && (
        <blockquote className="border-l-4 border-neutral-900 pl-4 text-sm text-neutral-700 leading-relaxed mb-8">
          {report.executive_summary}
        </blockquote>
      )}

      {report.findings.length > 0 && (
        <div className="space-y-5 mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            What the data is telling us
          </p>
          {report.findings.map((f, i) => (
            <div key={f.query_id || i} className="border-l-2 border-neutral-200 pl-3">
              <p className="text-sm font-semibold text-neutral-800 mb-1">{f.headline}</p>
              <p className="text-xs text-neutral-500 leading-relaxed">{f.implication}</p>
              {f.recommendation && (
                <p className="text-xs text-emerald-700 mt-1.5 font-medium">→ {f.recommendation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-neutral-400 pt-4 border-t border-neutral-100">
        {releasedAt &&
          `Published ${new Date(releasedAt).toLocaleDateString("en-MY", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}`}{" "}
        · Prepared by your ShiftImpact strategist.
      </p>
    </div>
  );
}
