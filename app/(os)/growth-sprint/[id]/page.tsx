// app/(os)/growth-sprint/[id]/page.tsx
// Growth Sprint Experience v1 — operator workspace
// INTERNAL ONLY

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GrowthSprintWorkspace } from "./_components/GrowthSprintWorkspace";
import type { GrowthSprint } from "@/lib/growth-sprint/types";

export const dynamic = "force-dynamic";

async function getSprint(id: string): Promise<GrowthSprint | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("growth_sprints").select("*").eq("id", id).single();
  return data as GrowthSprint | null;
}

export default async function GrowthSprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sprint = await getSprint(id);
  if (!sprint) notFound();

  return <GrowthSprintWorkspace initial={sprint} />;
}
