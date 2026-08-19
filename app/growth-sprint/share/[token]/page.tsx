// app/growth-sprint/share/[token]/page.tsx
// Growth Sprint Experience v1 — public client-facing report
// PUBLIC, TOKEN-GATED. No login. Server component only, no client state.
//
// Deliberately self-contained — does not import from the operator
// workspace tree or /portal. Renders diagnosis_reviewed and
// recommendation_reviewed ONLY. Never renders diagnosis_raw,
// recommendation_raw, override_reason, or any database id.

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashShareToken, isShareValid } from "@/lib/growth-sprint/share-token";
import type { DecisionOutcome, DiagnosisOutput, RecommendationOutput } from "@/lib/growth-sprint/types";

export const dynamic = "force-dynamic";

const DECISION_TONE: Record<DecisionOutcome, string> = {
  Scale: "bg-emerald-100 text-emerald-800",
  Shift: "bg-blue-100 text-blue-800",
  Hold: "bg-amber-100 text-amber-800",
  Retest: "bg-purple-100 text-purple-800",
  Stop: "bg-red-100 text-red-800",
};

async function getReport(token: string) {
  const supabase = createAdminClient();
  const token_hash = hashShareToken(token);

  const { data: share } = await supabase
    .from("growth_sprint_shares")
    .select("id, growth_sprint_id, revoked_at, expires_at, access_count")
    .eq("token_hash", token_hash)
    .maybeSingle();

  if (!share || !isShareValid(share)) return null;

  const { data: sprint } = await supabase
    .from("growth_sprints")
    .select("business_name, business_context, diagnosis_reviewed, recommendation_reviewed, decision_outcome, status")
    .eq("id", share.growth_sprint_id)
    .single();

  if (!sprint || sprint.status !== "published") return null;

  // Access tracking — best-effort, not on the render-blocking path
  await supabase
    .from("growth_sprint_shares")
    .update({ accessed_at: new Date().toISOString(), access_count: (share.access_count ?? 0) + 1 })
    .eq("id", share.id);

  return sprint as {
    business_name: string;
    business_context: string | null;
    diagnosis_reviewed: DiagnosisOutput;
    recommendation_reviewed: RecommendationOutput;
    decision_outcome: DecisionOutcome;
    status: string;
  };
}

export default async function GrowthSprintSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await getReport(token);
  if (!report) notFound();

  const priorityMoment = report.diagnosis_reviewed.opportunities.find(
    (o) => o.moment_id === report.diagnosis_reviewed.recommended_priority_moment_id
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Growth Sprint · ShiftImpact OS</p>
          <h1 className="text-2xl font-bold mt-1">{report.business_name}</h1>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">The opportunity</p>
          <p className="text-sm text-neutral-700 leading-relaxed">{report.diagnosis_reviewed.business_situation}</p>
          {priorityMoment && (
            <p className="text-sm text-neutral-700 leading-relaxed pt-1">{priorityMoment.rationale}</p>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Recommended decision</p>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${DECISION_TONE[report.decision_outcome]}`}>
              {report.decision_outcome}
            </span>
          </div>
          <div className="space-y-2 text-sm text-neutral-700 leading-relaxed">
            <p><span className="font-semibold text-neutral-900">30-day test:</span> {report.recommendation_reviewed.thirty_day_test}</p>
            <p><span className="font-semibold text-neutral-900">Audience:</span> {report.recommendation_reviewed.target_audience}</p>
            <p><span className="font-semibold text-neutral-900">Offer:</span> {report.recommendation_reviewed.offer_intervention}</p>
            <p><span className="font-semibold text-neutral-900">Path:</span> {report.recommendation_reviewed.conversion_path}</p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">What to watch</p>
          <ul className="text-sm text-neutral-700 list-disc pl-4 space-y-1">
            {report.recommendation_reviewed.evidence_signals.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>

        <p className="text-xs text-neutral-400 text-center pt-4">
          ShiftImpact OS · Growth Sprint Experience · This link is private to you
        </p>
      </div>
    </div>
  );
}
