// lib/ai-model.ts
// Shared helper for reading AI model configuration from os_settings at runtime.
// Falls back to env var, then to a hardcoded default — so routes never crash
// if the DB is unavailable or the migration hasn't run yet.
//
// Usage in any API route:
//   const model = await getModel("model_signal_report", "claude-haiku-4-5-20251001");

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Read an AI model name from os_settings.
 * Resolution order:
 *   1. os_settings table (DB) — operator-controlled from /settings UI
 *   2. process.env[envKey]    — Vercel env var override (optional)
 *   3. fallback               — hardcoded safety net
 */
export async function getModel(
  settingKey: string,
  fallback: string,
  envKey?: string
): Promise<string> {
  // Check env var override first (allows Vercel-level emergency override)
  if (envKey && process.env[envKey]) return process.env[envKey]!;

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("os_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();
    if (data?.value) return data.value;
  } catch {
    // DB unavailable — fall through to hardcoded default
  }

  return fallback;
}
