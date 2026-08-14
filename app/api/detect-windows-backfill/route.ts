// One-time backfill: match all existing business_signals against opportunity windows.
// Safe to run multiple times — detectWindowAlerts upserts, never duplicates.
// Delete this route once you've run it and confirmed windows appear in the digest.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectWindowAlerts } from "@/lib/window-alerts";

export const maxDuration = 60;

export async function GET() {
  const supabase = createAdminClient();
  const started  = Date.now();

  // Check that window_alerts table exists
  const { error: tableCheck } = await supabase.from("window_alerts").select("id").limit(1);
  if (tableCheck) {
    return NextResponse.json(
      { error: "window_alerts table not found. Apply migration 0041 first via /api/apply-migration-0041" },
      { status: 422 }
    );
  }

  // Load all active companies with their business_model
  const { data: companies, error: coErr } = await supabase
    .from("companies")
    .select("id, name, business_model")
    .eq("is_suppressed", false)
    .not("status", "eq", "Archived");

  if (coErr || !companies) {
    return NextResponse.json({ error: coErr?.message ?? "Failed to load companies" }, { status: 500 });
  }

  const results: { name: string; signals: number; windows: number; error?: string }[] = [];
  let totalWindows = 0;

  for (const co of companies) {
    try {
      // Load all non-duplicate signals for this company
      const { data: signals } = await supabase
        .from("business_signals")
        .select("id, signal_category, signal_type, signal_text")
        .eq("company_id", co.id)
        .is("duplicate_of_id", null)
        .order("detected_at", { ascending: false })
        .limit(20);

      if (!signals || signals.length === 0) {
        results.push({ name: co.name, signals: 0, windows: 0 });
        continue;
      }

      const engagementModel =
        co.business_model === "B2B"   ? "B2B"   :
        co.business_model === "B2B2C" ? "B2B2C" : "B2C";

      const windows = await detectWindowAlerts(supabase, co.id, signals, engagementModel);
      totalWindows += windows;
      results.push({ name: co.name, signals: signals.length, windows });
    } catch (err) {
      results.push({ name: co.name, signals: 0, windows: 0, error: String(err) });
    }
  }

  return NextResponse.json({
    companies_processed: companies.length,
    total_windows_triggered: totalWindows,
    elapsed_ms: Date.now() - started,
    results,
  });
}
