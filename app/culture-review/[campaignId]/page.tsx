// app/culture-review/[campaignId]/page.tsx
// Firewall prototype / security spike — the one narrow gated route.
//
// A logged-in external user (agency or client, granted via org_access_grants)
// opens one campaign they've been granted and assesses durability for the
// OS Cultural Radar signals cited into it. Every read on this page goes
// through the request-scoped Supabase client (lib/supabase/server.ts) —
// never createAdminClient() — so every row shown here is only visible
// because a real RLS policy allowed it, not because application code
// filtered it after the fact. cultural_signals is read here but never
// written to; the one write path (actions.ts) only ever touches
// campaign_cultural_signal_assessments.
//
// This route is intentionally NOT added to middleware.ts PUBLIC_PREFIXES —
// an unauthenticated visitor is redirected to /login by the existing
// middleware before this component ever runs. The auth.getUser() check
// below is defense in depth, same pattern as app/(os)/account/page.tsx,
// not the only gate.
//
// Scope is deliberately narrow: one route, one campaign at a time, no
// dashboard, no ASEAN cross-campaign view, no changes to /portal or any
// existing internal page.

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  displayDurabilityStatus,
  displayMarket,
} from "@/lib/cultural-signal-picker";
import { AssessmentForm } from "./_components/AssessmentForm";

export const dynamic = "force-dynamic";

type CitedSignal = {
  sourceId: string;
  sourceTitle: string;
  signal: {
    id: string;
    signal_name: string;
    signal_type: string | null;
    geographic_scope: string | null;
    durability_status: string | null;
    source_description: string | null;
    evidence: string | null;
  } | null;
};

export default async function CultureReviewPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const supabase = await createClient();

  // 1. Require a real Supabase auth session — request-scoped client only.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/culture-review/${campaignId}`);
  }

  // 2. Load the campaign ONLY if RLS (campaigns_external_grant_select)
  // allows it for this user. If the campaign doesn't exist, or this user
  // has no grant for it (including a URL swap to a campaign granted to
  // someone else), this comes back empty — and we render a generic
  // not-found, never a "you don't have access" message that would
  // confirm the campaign exists.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  // 3. This user's own grant row for this campaign — determines whether
  // the save form renders at all. The real enforcement of "view can't
  // save" is the RLS policy on the write path (actions.ts), this is
  // only what decides the UI shown.
  const { data: grants } = await supabase
    .from("org_access_grants")
    .select("access_level")
    .eq("resource_type", "campaign")
    .eq("resource_id", campaignId)
    .eq("grantee_user_id", user.id)
    .limit(1);

  const accessLevel = grants?.[0]?.access_level ?? "view";
  const canAssess = accessLevel === "view_plus_assessment";

  // 4. Cited OS Cultural Radar signals for this campaign, master signal
  // info alongside (read-only) — both scoped by RLS to this granted
  // campaign only.
  const { data: sources } = await supabase
    .from("strategic_basis_sources")
    .select(
      "id, source_title, cultural_signal_id, cultural_signals(id, signal_name, signal_type, geographic_scope, durability_status, source_description, evidence)",
    )
    .eq("campaign_id", campaignId)
    .eq("source_type", "os_cultural_radar_signal")
    .not("cultural_signal_id", "is", null);

  const citedSignals: CitedSignal[] = (sources ?? []).map((s) => ({
    sourceId: s.id,
    sourceTitle: s.source_title,
    signal: (Array.isArray(s.cultural_signals) ? s.cultural_signals[0] : s.cultural_signals) ?? null,
  }));

  // 5. This user's own existing assessments for this campaign only —
  // deliberately scoped to assessor_user_id = the current user, even
  // though RLS would allow seeing every assessor's rows for a granted
  // campaign.
  const { data: myAssessments } = await supabase
    .from("campaign_cultural_signal_assessments")
    .select("cultural_signal_id, durability_status, note, updated_at")
    .eq("campaign_id", campaignId)
    .eq("assessor_user_id", user.id);

  const myAssessmentBySignal = new Map(
    (myAssessments ?? []).map((a) => [a.cultural_signal_id, a]),
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-1">
            Culture review
          </p>
          <h1 className="text-xl font-semibold text-neutral-900">{campaign.name}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {canAssess
              ? "Review the cultural signals cited for this campaign and add your own durability assessment."
              : "Review the cultural signals cited for this campaign. Your access is view only."}
          </p>
        </div>

        {citedSignals.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-5 text-sm text-neutral-500">
            No Cultural Radar signals have been cited for this campaign yet.
          </div>
        ) : (
          <div className="space-y-4">
            {citedSignals.map(({ sourceId, sourceTitle, signal }) => {
              if (!signal) return null;
              const mine = myAssessmentBySignal.get(signal.id);
              const masterLabel = displayDurabilityStatus(signal.durability_status);

              return (
                <div key={sourceId} className="bg-white border border-neutral-200 rounded-lg p-5">
                  <p className="font-semibold text-sm text-neutral-900">{signal.signal_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-neutral-400">{signal.signal_type}</span>
                    <span className="text-xs text-neutral-200">·</span>
                    <span className="text-xs text-neutral-400">{displayMarket(signal.geographic_scope)}</span>
                  </div>

                  {signal.source_description && (
                    <p className="text-sm text-neutral-600 mt-3">{signal.source_description}</p>
                  )}

                  <div className="mt-3 rounded-md bg-neutral-50 border border-neutral-100 px-3 py-2">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">
                      ShiftImpact master classification — read only
                    </p>
                    <p className="text-sm text-neutral-700">
                      {masterLabel ?? "Not yet classified by ShiftImpact"}
                    </p>
                  </div>

                  {mine && (
                    <div className="mt-3 rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                        Your existing assessment
                      </p>
                      <p className="text-sm text-indigo-900">
                        {displayDurabilityStatus(mine.durability_status) ?? mine.durability_status}
                      </p>
                      {mine.note && <p className="text-xs text-indigo-700 mt-1">{mine.note}</p>}
                    </div>
                  )}

                  {canAssess ? (
                    <AssessmentForm
                      campaignId={campaignId}
                      culturalSignalId={signal.id}
                      currentStatus={mine?.durability_status ?? null}
                      currentNote={mine?.note ?? null}
                    />
                  ) : (
                    <p className="mt-3 text-xs text-neutral-400 border-t border-neutral-100 pt-3">
                      Saving an assessment requires elevated access. Contact ShiftImpact if you need this.
                    </p>
                  )}

                  <p className="text-[11px] text-neutral-300 mt-3">Cited as: {sourceTitle}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
