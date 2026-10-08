// lib/auth/rate-limit.ts
// Security remediation step 3 (8 Oct 2026): rate limits for the public
// routes (decide-probe, widget-lead, portal-chat).
//
// Backed by the `api_rate_limits` table + `api_rate_limit_hit()` function
// (migration 0107). Fixed-window counter keyed by route + caller key.
//
// Until migration 0107 is applied, the RPC call fails and this helper
// FAILS OPEN (allows the request and logs once per instance). That keeps
// the public pages working if code deploys before the migration; it does
// not weaken anything compared with today, where there is no limit at all.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

let warned = false;

export function callerIp(req: NextRequest | Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Returns a 429 NextResponse when the caller is over the limit, else null.
 *
 *   const limited = await rateLimit("decide-probe", callerIp(req), 10, 3600);
 *   if (limited) return limited;
 */
export async function rateLimit(
  route: string,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<NextResponse | null> {
  try {
    const sb = createAdminClient();
    const { data, error } = await sb.rpc("api_rate_limit_hit", {
      p_route: route,
      p_key: key,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    const count = typeof data === "number" ? data : Number(data);
    if (Number.isFinite(count) && count > max) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(windowSeconds) } },
      );
    }
    return null;
  } catch (err) {
    if (!warned) {
      console.warn("[rate-limit] limiter unavailable, failing open:", err);
      warned = true;
    }
    return null;
  }
}

/** Rejects request bodies larger than maxBytes (by Content-Length). */
export function bodyTooLarge(req: NextRequest | Request, maxBytes: number): NextResponse | null {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) {
    return NextResponse.json({ error: "Request body too large." }, { status: 413 });
  }
  return null;
}
