// app/s/[code]/route.ts
// ShiftImpact OS — branded short link resolver
// /s/[first-8-chars-of-uuid] → server-side redirect to the full Signal or Snapshot URL
// One hop, no external service, no interstitial.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || code.length < 6) {
    return NextResponse.redirect(new URL("/", _req.url));
  }

  const supabase = createAdminClient();

  // Match on the first segment of the UUID (before the first dash, or first 8 chars)
  const { data, error } = await supabase
    .from("quick_audits")
    .select("id, result")
    .ilike("id", `${code}%`)
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.redirect(new URL("/clients", _req.url));
  }

  const result = data.result as Record<string, unknown>;
  const isSignal = !!result?._clarity_signal;
  const destination = isSignal
    ? `/clarity-signal/${data.id}`
    : `/audit/${data.id}`;

  return NextResponse.redirect(new URL(destination, _req.url), { status: 301 });
}
