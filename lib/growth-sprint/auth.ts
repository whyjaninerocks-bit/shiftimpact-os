// lib/growth-sprint/auth.ts
// Growth Sprint Experience v1 — route-level auth for internal API routes.
//
// Growth Sprint is a new commercial product surface (business intel, AI
// analysis, recommendations, client deliverables) and its API routes are
// not covered by page-level auth the way the rest of the OS is — every
// /api/ route is exempted from middleware auth by design (see
// middleware.ts PUBLIC_PREFIXES). That's fine for routes that are only
// ever called from an already-gated page, but Growth Sprint's data is
// sensitive enough to check at the route too.
//
// This checks for an authenticated Supabase session using the same
// cookie-based server client as everything else in this codebase (see
// app/api/stripe/portal/route.ts for the existing precedent). It does
// NOT introduce owner_id / auth.uid() row-scoping — the database access
// model (createAdminClient, allow_all policy) is unchanged. This is a
// session check only: "is someone logged in," not "is this their row."

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Call at the top of every /api/growth-sprints/* handler. Returns a 401
 * NextResponse if there's no authenticated session, or null if the
 * request may proceed.
 *
 * Usage:
 *   const authError = await requireGrowthSprintAuth();
 *   if (authError) return authError;
 */
export async function requireGrowthSprintAuth(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
