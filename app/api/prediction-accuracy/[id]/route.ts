import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Compute accuracy_pct from predicted vs actual
function computeAccuracy(predicted: number | null, actual: number | null): number | null {
  if (predicted == null || actual == null || predicted === 0) return null;
  return Math.round(Math.abs((actual - predicted) / predicted) * 10000) / 100; // 2dp
}

// Derive verdict from accuracy_pct
function deriveVerdict(pct: number | null): "Accurate" | "Close" | "Off" {
  if (pct == null) return "Off";
  if (pct <= 10) return "Accurate";
  if (pct <= 25) return "Close";
  return "Off";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();

  // Auto-compute accuracy when actual_value is provided
  let updates = { ...body, updated_at: new Date().toISOString() };
  if (body.actual_value != null) {
    // Fetch current predicted_value if not in patch
    if (body.predicted_value == null) {
      const { data } = await supabase
        .from("prediction_accuracy_log")
        .select("predicted_value")
        .eq("id", id)
        .single();
      body.predicted_value = data?.predicted_value ?? null;
    }
    const pct = computeAccuracy(body.predicted_value, body.actual_value);
    updates = {
      ...updates,
      accuracy_pct: pct,
      verdict: body.verdict ?? deriveVerdict(pct),
    };
  }

  const { data, error } = await supabase
    .from("prediction_accuracy_log")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("prediction_accuracy_log").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
