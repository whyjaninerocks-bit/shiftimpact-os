// GET /api/brand-momentum/suggest?client_id=<uuid>
// Returns pre-fill suggestions for BMS dimensions based on data already in the system:
//   D1 (SOV): from gate_signal_status across campaigns
//   D2 (Save Rate): from signal_media_delivery save_rate data for most recent campaign
//   D3 (UGC): from clarity signals UGC count
//   D4-D6: "Not assessed" (no automated data source)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch active campaigns for this client
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, gate_signal_status, confidence_score, current_phase")
    .eq("client_id", clientId)
    .eq("status", "Active")
    .order("updated_at", { ascending: false })
    .limit(5);

  // D1: SOV suggestion from gate signal statuses
  let sosTraj = "";
  let sosNote = "";
  if (campaigns && campaigns.length > 0) {
    const onTrack = campaigns.filter(c => c.gate_signal_status === "On Track").length;
    const atRisk  = campaigns.filter(c => c.gate_signal_status === "At Risk").length;
    const avgConf = campaigns.reduce((s, c) => s + (c.confidence_score ?? 50), 0) / campaigns.length;

    if (onTrack > atRisk && avgConf >= 65) {
      sosTraj = "Up";
      sosNote = `${onTrack} of ${campaigns.length} active campaign(s) On Track — avg confidence ${Math.round(avgConf)}`;
    } else if (atRisk > onTrack || avgConf < 45) {
      sosTraj = "Down";
      sosNote = `${atRisk} campaign(s) At Risk — avg confidence ${Math.round(avgConf)}`;
    } else {
      sosTraj = "Flat";
      sosNote = `Mixed signals — avg confidence ${Math.round(avgConf)} across ${campaigns.length} campaign(s)`;
    }
  }

  // D2: Save rate trend from most recent campaign's signal_media_delivery
  let saveRateTrend = "";
  let saveRateNote = "";
  if (campaigns && campaigns.length > 0) {
    const { data: delivery } = await supabase
      .from("signal_media_delivery")
      .select("save_rate, week_number")
      .eq("campaign_id", campaigns[0].id)
      .not("save_rate", "is", null)
      .order("week_number", { ascending: false })
      .limit(4);

    if (delivery && delivery.length >= 2) {
      const rates = delivery.map(d => d.save_rate as number);
      const recent = rates[0];
      const older  = rates[rates.length - 1];
      const delta  = recent - older;

      if (delta > 0.5) {
        saveRateTrend = "Up";
        saveRateNote  = `Save rate ${older.toFixed(1)}% → ${recent.toFixed(1)}% over last ${delivery.length} weeks (${campaigns[0].name})`;
      } else if (delta < -0.5) {
        saveRateTrend = "Down";
        saveRateNote  = `Save rate ${older.toFixed(1)}% → ${recent.toFixed(1)}% over last ${delivery.length} weeks (${campaigns[0].name})`;
      } else {
        saveRateTrend = "Flat";
        saveRateNote  = `Save rate stable around ${recent.toFixed(1)}% (${campaigns[0].name})`;
      }
    } else if (delivery && delivery.length === 1) {
      saveRateNote = `Save rate ${(delivery[0].save_rate as number).toFixed(1)}% — only 1 week of data (${campaigns[0].name})`;
    }
  }

  // D3: UGC volume — from clarity signals / quick audits
  const { data: ugcSignals } = await supabase
    .from("quick_audits")
    .select("brand_name, created_at")
    .eq("result->>_clarity_signal", "true")
    .order("created_at", { ascending: false })
    .limit(20);

  // Try to match by brand name lookup (quick heuristic)
  const { data: clientRow } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .maybeSingle();

  let ugcTrend = "";
  let ugcNote  = "";
  if (ugcSignals && clientRow) {
    const clientSignals = ugcSignals.filter(s =>
      s.brand_name?.toLowerCase().includes(clientRow.name.toLowerCase().split(" ")[0])
    );
    if (clientSignals.length >= 3) {
      ugcTrend = "Up";
      ugcNote  = `${clientSignals.length} Clarity Signals found for ${clientRow.name} in recent audits`;
    } else if (clientSignals.length > 0) {
      ugcTrend = "Flat";
      ugcNote  = `${clientSignals.length} Clarity Signal(s) found for ${clientRow.name}`;
    }
  }

  return NextResponse.json({
    suggestions: {
      sos_trajectory:   sosTraj,
      sos_note:         sosNote,
      save_rate_trend:  saveRateTrend,
      save_rate_note:   saveRateNote,
      ugc_trend:        ugcTrend,
      ugc_note:         ugcNote,
      // D4–D6 have no automated data source
      sov_som_ratio:    "",
      cep_coverage:     "",
      competitive_context: "",
    },
    source_campaigns: campaigns?.map(c => c.name) ?? [],
    note: "D4–D6 require manual input — no automated data available.",
  });
}
