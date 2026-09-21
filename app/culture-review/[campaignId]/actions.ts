// app/culture-review/[campaignId]/actions.ts
// Firewall prototype / security spike — the one write path for the external
// gated culture assessment page.
//
// This is the ONLY server action in the route. It never touches
// cultural_signals — it writes exclusively to
// campaign_cultural_signal_assessments, the campaign-scoped table that
// exists precisely so an external user's judgement never overwrites the
// shared master signal record.
//
// Uses the request-scoped Supabase client (lib/supabase/server.ts) only —
// never createAdminClient(). assessor_user_id and assessor_org_id are both
// derived server-side from the authenticated session and user_profiles,
// never taken from client input, and the RLS policies on
// campaign_cultural_signal_assessments (ccsa_insert / ccsa_update) are the
// real enforcement of the view_plus_assessment gate — this action does not
// duplicate that check in application code, so a tampered request is still
// rejected by the database, not just hidden UI.

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidDurabilityStatus, suggestReassessDate } from "@/lib/cultural-signal-picker";

export type SaveAssessmentResult = { ok: true } | { ok: false; error: string };

export async function saveAssessment(formData: FormData): Promise<SaveAssessmentResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const culturalSignalId = String(formData.get("cultural_signal_id") ?? "").trim();
  const durabilityStatusRaw = String(formData.get("durability_status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!campaignId || !culturalSignalId) {
    return { ok: false, error: "Missing campaign or signal reference." };
  }

  if (!durabilityStatusRaw || !isValidDurabilityStatus(durabilityStatusRaw)) {
    return { ok: false, error: "Choose a valid durability assessment." };
  }

  // assessor_org_id comes from the user's own profile row, looked up
  // server-side via the request-scoped client (own_profile RLS policy) —
  // never accepted from the form.
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id) {
    return { ok: false, error: "Could not resolve your organisation. Contact ShiftImpact." };
  }

  const durabilityReassessAt = suggestReassessDate(durabilityStatusRaw);

  const { error: upsertError } = await supabase
    .from("campaign_cultural_signal_assessments")
    .upsert(
      {
        campaign_id: campaignId,
        cultural_signal_id: culturalSignalId,
        assessor_user_id: user.id,
        assessor_org_id: profile.org_id,
        durability_status: durabilityStatusRaw,
        durability_reassess_at: durabilityReassessAt,
        note: note || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,cultural_signal_id,assessor_user_id" },
    );

  if (upsertError) {
    // RLS rejection (view-only user, or any other policy failure) lands
    // here as a Postgres error — surfaced plainly, not swallowed.
    return { ok: false, error: upsertError.message };
  }

  revalidatePath(`/culture-review/${campaignId}`);
  return { ok: true };
}
