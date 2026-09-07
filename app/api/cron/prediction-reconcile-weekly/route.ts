// app/api/cron/prediction-reconcile-weekly/route.ts
// Weekly automated prediction reconciliation.
// Runs every Tuesday 6am UTC (2pm MYT) — one hour after kill-switch-eval, so
// this week's signal data and kill-switch statuses are already settled before
// predictions get checked against them.
//
// WHAT IT DOES:
//   For every active campaign with at least one Pending prediction in
//   prediction_accuracy_log, runs the same reconciliation logic as the
//   internal "Auto-Reconcile" button (lib/prediction-reconcile.ts) — so
//   predictions get checked against real results automatically instead of
//   depending on a strategist remembering to click a button each week.
//
//   This does not change any already-resolved prediction — it only queries
//   verdict = 'Pending' rows, so nothing here can silently overwrite a
//   prediction a client has already seen. See migration 0081 (locked_at,
//   correction_log) for how that's enforced at the row level.
//
// Security: Vercel injects Authorization: Bearer <CRON_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileCampaignPredictions } from "@/lib/prediction-reconcile";

export const maxDuration = 60;

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const log: string[] = [];
  let campaignsChecked = 0;
  let campaignsReconciled = 0;
  let totalReconciled = 0;
  const verdictTotals: Record<string, number> = {};

  try {
    // Only campaigns with at least one Pending prediction are worth touching.
    const { data: pendingCampaignIds } = await supabase
      .from("prediction_accuracy_log")
      .select("campaign_id")
      .eq("verdict", "Pending");

    const uniqueCampaignIds = Array.from(new Set((pendingCampaignIds ?? []).map(r => r.campaign_id as string)));

    if (uniqueCampaignIds.length === 0) {
      return NextResponse.json({ ok: true, campaigns_checked: 0, message: "No campaigns with pending predictions", log: ["No pending predictions anywhere — nothing to reconcile."] });
    }

    const { data: activeCampaigns } = await supabase
      .from("campaigns")
      .select("id, name, status")
      .in("id", uniqueCampaignIds)
      .eq("status", "active");

    log.push(`${uniqueCampaignIds.length} campaign(s) have pending predictions; ${activeCampaigns?.length ?? 0} are active`);

    for (const c of activeCampaigns ?? []) {
      campaignsChecked++;
      try {
        const result = await reconcileCampaignPredictions(supabase, c.id);
        if (result.reconciled > 0) {
          campaignsReconciled++;
          totalReconciled += result.reconciled;
          for (const [verdict, count] of Object.entries(result.verdicts)) {
            verdictTotals[verdict] = (verdictTotals[verdict] ?? 0) + count;
          }
          log.push(`  ${c.name} — reconciled ${result.reconciled}/${result.total_pending} pending prediction(s): ${JSON.stringify(result.verdicts)}`);
        } else if (result.total_pending > 0) {
          log.push(`  ${c.name} — ${result.total_pending} pending prediction(s), none had matching actual data yet`);
        }
      } catch (err) {
        log.push(`  ERROR reconciling ${c.name}: ${String(err)}`);
      }
    }

    log.push(`Done. ${campaignsChecked} campaign(s) checked, ${campaignsReconciled} had predictions reconciled, ${totalReconciled} prediction(s) resolved total.`);

    return NextResponse.json({
      ok: true,
      campaigns_checked: campaignsChecked,
      campaigns_reconciled: campaignsReconciled,
      predictions_reconciled: totalReconciled,
      verdicts: verdictTotals,
      log,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), log }, { status: 500 });
  }
}
