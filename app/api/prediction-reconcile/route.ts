// app/api/prediction-reconcile/route.ts
// Sprint 9 — Auto-reconcile Pending predictions against actual signal data
// INTERNAL ONLY — triggered manually via the "Auto-Reconcile" button in the
// internal campaign view. See app/api/cron/prediction-reconcile-weekly for
// the automatic weekly run that does the same thing without a human clicking it.
//
// POST /api/prediction-reconcile
// Body: { campaign_id: string }
//
// The actual matching + verdict logic lives in lib/prediction-reconcile.ts,
// shared with the weekly cron so both paths can never disagree.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { reconcileCampaignPredictions } from "@/lib/prediction-reconcile";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const result = await reconcileCampaignPredictions(supabase, campaign_id);

    if (result.total_pending === 0) {
      return NextResponse.json({ reconciled: 0, message: "No pending predictions" });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/prediction-reconcile error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
