// app/api/cron/kill-switch-eval/route.ts
// Weekly automated Kill Switch evaluation.
// Runs every Tuesday 5am UTC (1pm MYT) — one hour after signal-s1-scan, so
// this week's S1/S3 (and any manually-entered S2) values are already in.
//
// WHAT IT DOES:
//   Kill switches are manual by default — a human reads `condition` and sets
//   `trigger_status` themselves. A switch only enters this cron's scope once
//   a strategist explicitly sets metric_type/comparator/threshold_value on it
//   (migration 0069). Existing free-text-only switches are never touched.
//
//   For each eligible switch (metric_type set, auto_enabled = true,
//   trigger_status != "Triggered", campaign status = "active"):
//     - Pull the most recent `consecutive_periods` weeks of
//       signal_weekly_reports for that campaign.
//     - If every one of those weeks has the metric past the threshold in the
//       bad direction, and there's a full N weeks of data: Triggered.
//     - If at least one week (but not all) is past threshold: Monitoring.
//     - Otherwise: Inactive.
//   A switch that reaches Triggered here gets the same "Auto Decision
//   Snapshot" write into campaign_dashboards that a manual Trigger gets
//   (see updateKillSwitch in lib/actions.ts) — same downstream visibility
//   either way.
//
//   Once a switch is Triggered (by either path), this cron excludes it from
//   future runs — it never auto-untriggers one. A human resets it manually.
//
// Security: Vercel injects Authorization: Bearer <CRON_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

const METRIC_LABELS: Record<string, string> = {
  signal_1_actual_pct: "Signal 1 (Share of Search)",
  signal_2_actual_pct: "Signal 2 (Save Rate)",
  signal_3_actual_count: "Signal 3 (UGC Volume)",
  signal_2b_actual_pct: "Signal 2B (Share Rate)",
  signal_3b_actual_pct: "Signal 3B",
  signal_4_actual_pct: "Signal 4",
};

type EligibleSwitch = {
  id: string;
  condition: string;
  priority: string;
  trigger_status: string;
  metric_type: string;
  comparator: "below" | "above";
  threshold_value: number;
  consecutive_periods: number;
  frame_briefs: {
    campaign_id: string;
    campaigns: { id: string; name: string; status: string } | null;
  } | null;
};

async function getEligibleSwitches(
  supabase: ReturnType<typeof createAdminClient>
): Promise<EligibleSwitch[]> {
  const { data, error } = await supabase
    .from("kill_switches")
    .select(`
      id, condition, priority, trigger_status,
      metric_type, comparator, threshold_value, consecutive_periods,
      frame_briefs!inner ( campaign_id, campaigns!inner ( id, name, status ) )
    `)
    .not("metric_type", "is", null)
    .eq("auto_enabled", true)
    .neq("trigger_status", "Triggered");

  if (error || !data) return [];

  return (data as unknown as EligibleSwitch[]).filter(
    (ks) => ks.frame_briefs?.campaigns?.status === "active"
  );
}

async function writeAutoDecisionSnapshot(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
  condition: string,
  priority: string
) {
  const weekOf = new Date().toISOString().slice(0, 10);
  const snapshotLine = `[KILL SWITCH AUTO-TRIGGERED — ${priority} priority] ${condition}`;

  const { data: existing } = await supabase
    .from("campaign_dashboards")
    .select("id, decision_snapshot")
    .eq("campaign_id", campaignId)
    .eq("week_of", weekOf)
    .maybeSingle();

  if (existing) {
    const updated = `${snapshotLine}\n\n${existing.decision_snapshot ?? ""}`.trim();
    await supabase.from("campaign_dashboards").update({ decision_snapshot: updated }).eq("id", existing.id);
  } else {
    await supabase.from("campaign_dashboards").insert({
      campaign_id: campaignId,
      week_of: weekOf,
      decision_snapshot: snapshotLine,
      funnel_health_demand: "Red",
      funnel_health_conversion: "Amber",
      funnel_health_retention: "Amber",
      ssic: "Kill switch auto-triggered — review immediately.",
      triggers: condition,
      idea_integrity_observation: "",
    });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const log: string[] = [];
  let evaluated = 0;
  let triggered = 0;
  let monitoring = 0;
  let cleared = 0;

  try {
    const switches = await getEligibleSwitches(supabase);
    log.push(`Found ${switches.length} auto-evaluable kill switch(es) on active campaigns`);

    for (const ks of switches) {
      const campaignId = ks.frame_briefs!.campaign_id;
      const campaignName = ks.frame_briefs!.campaigns!.name;
      const metricLabel = METRIC_LABELS[ks.metric_type] ?? ks.metric_type;

      try {
        const { data: weeks } = await supabase
          .from("signal_weekly_reports")
          .select(`week_number, ${ks.metric_type}`)
          .eq("campaign_id", campaignId)
          .order("week_number", { ascending: false })
          .limit(ks.consecutive_periods);

        const rows = (weeks ?? []) as unknown as Array<Record<string, number | null>>;
        evaluated++;

        if (rows.length < ks.consecutive_periods) {
          log.push(`  ${campaignName} — "${ks.condition}": only ${rows.length}/${ks.consecutive_periods} week(s) of data, skipping`);
          continue;
        }

        const values = rows.map((r) => r[ks.metric_type]).filter((v): v is number => v !== null && v !== undefined);
        if (values.length < rows.length) {
          log.push(`  ${campaignName} — "${ks.condition}": missing values in the window, skipping`);
          continue;
        }

        const passes = values.map((v) =>
          ks.comparator === "below" ? v < ks.threshold_value : v > ks.threshold_value
        );
        const allPass = passes.every(Boolean);
        const anyPass = passes.some(Boolean);

        const newStatus = allPass ? "Triggered" : anyPass ? "Monitoring" : "Inactive";
        const dir = ks.comparator === "below" ? "below" : "above";
        const valuesStr = values.map((v) => v.toFixed(2)).join(", ");
        const note = `Auto-evaluated ${metricLabel}: last ${values.length} week(s) = ${valuesStr}, vs threshold ${dir} ${ks.threshold_value} — ${passes.filter(Boolean).length}/${values.length} week(s) met. Status: ${newStatus}.`;

        if (newStatus !== ks.trigger_status) {
          const { error } = await supabase
            .from("kill_switches")
            .update({
              trigger_status: newStatus,
              last_evaluated_at: new Date().toISOString(),
              last_evaluation_note: note,
            })
            .eq("id", ks.id);

          if (error) {
            log.push(`  ERROR updating "${ks.condition}": ${error.message}`);
            continue;
          }

          log.push(`  ${campaignName} — "${ks.condition}": ${ks.trigger_status} → ${newStatus}. ${note}`);

          if (newStatus === "Triggered") {
            triggered++;
            await writeAutoDecisionSnapshot(supabase, campaignId, ks.condition, ks.priority);
          } else if (newStatus === "Monitoring") {
            monitoring++;
          } else {
            cleared++;
          }
        } else {
          // Status unchanged, but still refresh the evaluation note/timestamp
          await supabase
            .from("kill_switches")
            .update({ last_evaluated_at: new Date().toISOString(), last_evaluation_note: note })
            .eq("id", ks.id);
          log.push(`  ${campaignName} — "${ks.condition}": unchanged (${newStatus}). ${note}`);
        }
      } catch (err) {
        log.push(`  ERROR evaluating switch ${ks.id}: ${String(err)}`);
      }
    }

    log.push(`Done. ${evaluated} evaluated, ${triggered} newly Triggered, ${monitoring} newly Monitoring, ${cleared} cleared to Inactive.`);

    return NextResponse.json({
      ok: true,
      switches_evaluated: evaluated,
      newly_triggered: triggered,
      newly_monitoring: monitoring,
      cleared_to_inactive: cleared,
      log,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), log }, { status: 500 });
  }
}
