// lib/growth-decision/store.ts
// Server-only data access for activation_blueprints (service-role).
import { createAdminClient } from "@/lib/supabase/admin";
import type { BlueprintRow } from "./schema";

export async function listBlueprints(): Promise<BlueprintRow[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("activation_blueprints")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as BlueprintRow[];
}

export async function getBlueprint(id: string): Promise<BlueprintRow | null> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("activation_blueprints").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BlueprintRow | null) ?? null;
}
