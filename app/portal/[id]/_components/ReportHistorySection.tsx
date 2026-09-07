import type { CampaignReportHistoryItem } from "@/lib/data";
import { Collapse } from "../../_components/Collapse";
import { SectionHeading } from "./reportUi";

// ─── Report History — client-facing ──────────────────────────────────────────
// Matches the demo portal's "Report History" idea (every past week, browsable)
// using the same client-safe fields already shown for the single latest
// report — just across every released week instead of one. Rendered as
// expandable rows rather than a PDF-per-week table: there is no real PDF
// export for these reports anywhere in the codebase (checked before building
// this — see getCampaignReportHistoryClientSafe), so a download link would be
// exactly the kind of unbuilt-feature promise this portal has been
// deliberately avoiding everywhere else.

const POSTURE_STYLES: Record<string, string> = {
  Gaining: "bg-green-50 text-green-700 border-green-200",
  Plateauing: "bg-amber-50 text-amber-700 border-amber-200",
  "Under Threat": "bg-red-50 text-red-700 border-red-200",
  Fragile: "bg-red-50 text-red-700 border-red-200",
  "Eroding Slowly": "bg-red-50 text-red-700 border-red-200",
};

function PostureBadge({ posture }: { posture: string | null }) {
  if (!posture) return null;
  return (
    <span
      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        POSTURE_STYLES[posture] ?? "bg-neutral-100 text-neutral-600 border-neutral-200"
      }`}
    >
      {posture}
    </span>
  );
}

export function ReportHistorySection({ reports }: { reports: CampaignReportHistoryItem[] }) {
  // Fewer than 2 released reports — the single "Weekly intelligence report"
  // section above already covers this campaign's whole history so far.
  if (reports.length < 2) return null;

  const chronological = [...reports].sort((a, b) => a.report_week - b.report_week);

  return (
    <section className="space-y-3">
      <SectionHeading
        title="Report history"
        subtitle="Every weekly report published for this campaign, oldest to newest."
      />
      <div className="space-y-2">
        {chronological.map((r) => (
          <Collapse
            key={r.id}
            label={`Week ${r.report_week} — ${r.report_label}`}
            sublabel={
              r.released_at
                ? new Date(r.released_at).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : undefined
            }
          >
            <div className="space-y-3">
              {r.risk_posture && <PostureBadge posture={r.risk_posture} />}
              <p className="text-xs text-neutral-600 leading-relaxed">{r.executive_summary}</p>
              {r.findings.length > 0 && (
                <div className="space-y-2 pt-1">
                  {r.findings.map((f, i) => (
                    <div key={i} className="border-l-2 border-neutral-200 pl-3">
                      <p className="text-xs font-semibold text-neutral-800">{f.headline}</p>
                      {f.recommendation && (
                        <p className="text-xs text-emerald-700 mt-0.5">→ {f.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Collapse>
        ))}
      </div>
    </section>
  );
}
