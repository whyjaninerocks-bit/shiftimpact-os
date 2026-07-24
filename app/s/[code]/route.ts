// app/s/[code]/route.ts
// ShiftImpact OS — branded short link resolver
// /s/[first-8-chars-of-uuid] → 301 server-side redirect to full Signal or Snapshot URL
// One hop, branded domain, no external service, no interstitial.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const base = new URL(req.url).origin;

  if (!code || code.length < 6) {
    return NextResponse.redirect(`${base}/clients`, { status: 302 });
  }

  const supabase = createAdminClient();

  // UUID columns can't use ILIKE directly in PostgREST.
  // Use a range query: any UUID whose first segment matches `code`
  // spans from `{code}-0000-0000-0000-000000000000`
  //          to `{code}-ffff-ffff-ffff-ffffffffffff`
  const lo = `${code.slice(0, 8)}-0000-0000-0000-000000000000`;
  const hi = `${code.slice(0, 8)}-ffff-ffff-ffff-ffffffffffff`;

  const { data, error } = await supabase
    .from("quick_audits")
    .select("id, result")
    .gte("id", lo)
    .lte("id", hi)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(`${base}/clients`, { status: 302 });
  }

  const result = data.result as Record<string, unknown>;
  const isSignal = !!result?._clarity_signal;
  const destination = isSignal
    ? `${base}/clarity-signal/${data.id}`
    : `${base}/audit/${data.id}`;

  return NextResponse.redirect(destination, { status: 301 });
}
