// app/api/signal-context/[id]/route.ts
// Internal endpoint — returns the stored context from a Clarity Signal row.
// Used by the audit form to auto-populate fields when promoting a Signal to a Snapshot.
// Not exposed publicly; returns only the data needed to pre-fill the audit form.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quick_audits")
    .select("brand_name, campaign_name, industry, business_objective, context_summary, result")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Signal not found." }, { status: 404 });
  }

  const result = data.result as Record<string, unknown>;

  if (!result._clarity_signal) {
    return NextResponse.json({ error: "Record is not a Clarity Signal." }, { status: 400 });
  }

  // _context_raw is stored on new Signals; fall back to context_summary for older rows
  const contextText =
    (result._context_raw as string) ||
    (data.context_summary as string) ||
    "";

  // business_objective is stored as "Country | Competitors" for Clarity Signal rows
  const country = (data.business_objective as string | null)?.split("|")[0]?.trim() || "Malaysia";

  // Extract the Signal's AI intelligence to pass forward — avoids re-deriving in Snapshot
  const signalIntelligence = {
    decision_status: result.decision_status,
    decision_status_reason: result.decision_status_reason,
    executive_observation: result.executive_observation,
    top_signals: result.top_signals,
    biggest_opportunity: result.biggest_opportunity,
    biggest_risk: result.biggest_risk,
    questions_worth_asking: result.questions_worth_asking,
  };

  return NextResponse.json({
    brand_name: data.brand_name,
    campaign_name: data.campaign_name,
    industry: data.industry,
    country,
    context_text: contextText,
    signal_intelligence: signalIntelligence,
  });
}
