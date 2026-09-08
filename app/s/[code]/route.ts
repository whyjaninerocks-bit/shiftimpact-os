// app/s/[code]/route.ts
// ShiftImpact OS — branded short link resolver
// /s/[code] → server-side redirect, resolved in this order:
//   1. short_links table — exact code match, arbitrary destination_url
//      (added for links that must carry a secret, like a client portal's
//      plaintext access token — see migration 0085 for why this can't
//      reuse the scheme below, since only the token's hash is ever stored)
//   2. legacy quick_audits ID-prefix scheme — [first-8-chars-of-uuid] →
//      derived Signal or Snapshot URL, no extra table needed
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

  // 1. short_links — exact code match, arbitrary full-URL destination
  const { data: shortLink } = await supabase
    .from("short_links")
    .select("destination_url, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (shortLink && (!shortLink.expires_at || new Date(shortLink.expires_at).getTime() > Date.now())) {
    return NextResponse.redirect(shortLink.destination_url, { status: 302 });
  }

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
