// lib/auth/require-session.ts
// Security Hardening Phase 1 — generic route-level session auth.
//
// Every /api/ route is exempted from middleware auth by design (see
// middleware.ts PUBLIC_PREFIXES — "routes use admin client for security").
// That was true when only internal OS users could reach these routes from
// an already-gated page. It stops being safe once a route can send email,
// mutate client-facing report state, or manage recipient lists, because
// those routes are directly callable by anyone who has the URL.
//
// This is the same pattern already proven in lib/growth-sprint/auth.ts,
// generalized so any route can use it without importing from the
// growth-sprint module. Session check only — "is someone logged in,"
// not "is this their row." Does NOT introduce owner_id / auth.uid()
// row-scoping; the database access model (createAdminClient, allow_all
// policy) is unchanged. Full per-tenant isolation is future work
// (see project memory: Auth Sprint Plan — Multi-Tenant Activation).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Call at the top of any internal-facing API route handler. Returns a 401
 * NextResponse if there's no authenticated Supabase session, or null if
 * the request may proceed.
 *
 * Usage:
 *   const authError = await requireSession();
 *   if (authError) return authError;
 */
export async function requireSession(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
