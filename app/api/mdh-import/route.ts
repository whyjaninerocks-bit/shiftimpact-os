// app/api/mdh-import/route.ts
// CSV batch import for Media Delivery Health (MDH) records.
//
// POST /api/mdh-import
// Body: {
//   campaign_id: string,
//   filename: string,
//   rows: Array<{
//     week_number: number,
//     reach_unique?: number,
//     impressions?: number,
//     avg_frequency?: number,
//     view_rate_3s_pct?: number,
//     view_rate_10s_pct?: number,
//     completion_rate_pct?: number,
//     strategy_notes?: string,
//   }>
// }
//
// Calls /api/mdh-report for each row sequentially.
// Logs results in mdh_imports table.
// Returns { import_id, imported_count, error_count, errors }

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CsvRow {
  week_number: number;
  reach_unique?: number | null;
  impressions?: number | null;
  avg_frequency?: number | null;
  view_rate_3s_pct?: number | null;
  view_rate_10s_pct?: number | null;
  completion_rate_pct?: number | null;
  strategy_notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id, filename = "import.csv", rows } = body as {
      campaign_id: string;
      filename: string;
      rows: CsvRow[];
    };

    if (!campaign_id || !rows?.length) {
      return NextResponse.json(
        { error: "campaign_id and rows are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create import log record
    const { data: importLog, error: logError } = await supabase
      .from("mdh_imports")
      .insert({
        campaign_id,
        filename,
        row_count: rows.length,
        status: "Processing",
      })
      .select("id")
      .single();

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    const importId = importLog.id as string;
    const errors: Array<{ week: number; error: string }> = [];
    let imported = 0;

    // Process rows via mdh-report logic inline (avoid HTTP self-calls in serverless)
    for (const row of rows) {
      if (!row.week_number || isNaN(row.week_number)) {
        errors.push({ week: row.week_number, error: "Invalid week_number" });
        continue;
      }

      try {
        const freq = row.avg_frequency ?? (
          row.reach_unique && row.impressions && row.reach_unique > 0
            ? row.impressions / row.reach_unique
            : null
        );

        const getMdhStatus = (f: number | null) => {
          if (f === null) return null;
          if (f < 1.5)  return "Red";
          if (f < 3.0)  return "Amber";
          if (f <= 7.0) return "Green";
          if (f <= 10.0) return "Amber";
          return "Red";
        };

        const computeAqs = (r3: number | null | undefined, r10: number | null | undefined, rc: number | null | undefined) => {
          if (r3 == null && r10 == null && rc == null) return null;
          return Math.round(((r3 ?? 0) * 0.20 + (r10 ?? 0) * 0.30 + (rc ?? 0) * 0.50) * 10) / 10;
        };

        const aqsScore = computeAqs(row.view_rate_3s_pct, row.view_rate_10s_pct, row.completion_rate_pct);
        const mdh_status = getMdhStatus(freq ?? null);

        const { error: upsertErr } = await supabase
          .from("signal_media_delivery")
          .upsert(
            {
              campaign_id,
              week_number:         row.week_number,
              reach_unique:        row.reach_unique  ?? null,
              impressions:         row.impressions   ?? null,
              avg_frequency:       freq !== null ? parseFloat((freq).toFixed(2)) : null,
              mdh_status,
              frequency_label:     freq !== null ? `${freq.toFixed(1)}x (imported)` : "Imported — frequency unavailable",
              quarantine_active:   mdh_status === "Red",
              strategy_notes:      row.strategy_notes ?? "",
              view_rate_3s_pct:    row.view_rate_3s_pct    ?? null,
              view_rate_10s_pct:   row.view_rate_10s_pct   ?? null,
              completion_rate_pct: row.completion_rate_pct ?? null,
              aqs_score:           aqsScore,
              updated_at:          new Date().toISOString(),
            },
            { onConflict: "campaign_id,week_number" }
          );

        if (upsertErr) {
          errors.push({ week: row.week_number, error: upsertErr.message });
        } else {
          imported++;
        }
      } catch (rowErr) {
        errors.push({
          week: row.week_number,
          error: rowErr instanceof Error ? rowErr.message : "Unknown row error",
        });
      }
    }

    // Update import log with result
    await supabase
      .from("mdh_imports")
      .update({
        imported_count: imported,
        error_count:    errors.length,
        status:         errors.length === rows.length ? "Failed" : "Complete",
        error_log:      JSON.stringify(errors),
      })
      .eq("id", importId);

    return NextResponse.json({
      import_id:      importId,
      row_count:      rows.length,
      imported_count: imported,
      error_count:    errors.length,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
