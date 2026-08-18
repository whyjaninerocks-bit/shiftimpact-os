import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only client using the service role key. Bypasses RLS.
 * Used for all data access in v1 (no auth / no login wall yet —
 * see "Lock it down" sprint in CLAUDE.md for the future RLS pass).
 * Never import this from a Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
