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

/**
 * Throwing variant of requireSession(), for use inside Server Actions
 * (lib/actions.ts style) rather than route handlers. Server Actions can't
 * return a NextResponse — they should throw, and the caller/UI handles the
 * rejected promise. Call at the top of any server action that reads or
 * writes data meant to stay internal-only (e.g. campaign_signal_maps).
 *
 * This does NOT rely on route-group placement or sidebar visibility to
 * keep a page or action internal — those are UX conveniences, not access
 * control. This is the actual check.
 *
 * Usage:
 *   export async function saveCampaignSignalMap(...) {
 *     await assertInternalSession();
 *     ...
 *   }
 */
export async function assertInternalSession(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized — internal session required.");
  }
}

/**
 * Non-throwing, boolean-returning check for "is someone logged into the OS
 * right now" — for routes that accept more than one form of authorization
 * (e.g. portal-chat / portal-notify, which allow either a valid portal
 * access token OR an internal OS session) and need to OR the checks rather
 * than hard-gate on session alone.
 *
 * Usage:
 *   const tokenValid = await verifyPortalToken(campaign_id, token);
 *   if (!tokenValid && !(await hasInternalSession())) {
 *     return NextResponse.json({ error: "Invalid or expired access token" }, { status: 401 });
 *   }
 */
export async function hasInternalSession(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Throwing variant that requires not just a session, but a ShiftImpact
 * session — user_profiles.org_type === "ShiftImpact". assertInternalSession()
 * alone only proves "someone is logged in"; a Partner/Client user (e.g. an
 * external culture-review reviewer) can satisfy that just as easily as a
 * ShiftImpact strategist, since firewall_spike-style fixtures and real
 * external reviewers are still real Supabase Auth users with real sessions.
 *
 * Use this for any Server Action that manages who else gets access (e.g.
 * upsertExternalReviewerGrant), where the access-control decision must not
 * be delegated to middleware's org_type check alone. middleware.ts's
 * EXTERNAL_ALLOWED_PREFIXES guard protects page loads and same-path Server
 * Action POSTs today, but a Server Action is still directly callable
 * exported code — this makes the action correct on its own, independent of
 * how the request reached it or whether the matcher/prefix list ever changes.
 *
 * Same RLS-scoped read pattern middleware.ts already uses for its own
 * org_type check (a session-bound client, not the admin client), so this
 * relies on nothing that isn't already proven to work.
 *
 * Usage:
 *   export async function upsertExternalReviewerGrant(...) {
 *     await assertShiftImpactSession();
 *     ...
 *   }
 */
export async function assertShiftImpactSession(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized — internal session required.");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("org_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.org_type !== "ShiftImpact") {
    throw new Error("Unauthorized — ShiftImpact session required.");
  }
}
