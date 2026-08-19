// app/(os)/growth-sprint/page.tsx
// Growth Sprint Experience v1 — list
// INTERNAL ONLY — validation product, not yet in main OS navigation.
// See lib/growth-sprint/ for the product rationale.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

function statusTone(status: string): "green" | "amber" | "neutral" | "red" | "blue" {
  switch (status) {
    case "published": return "green";
    case "approved": return "blue";
    case "recommended":
    case "diagnosed": return "amber";
    case "revoked": return "red";
    default: return "neutral";
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

async function getSprints() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("growth_sprints")
    .select("id, business_name, business_context, status, decision_outcome, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export default async function GrowthSprintListPage() {
  const sprints = await getSprints();

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Growth Sprint Experience</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Validation product — pilot phase. Identify the growth opportunity worth prioritising next, define a focused 30-day test.
          </p>
        </div>
        <Link
          href="/growth-sprint/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
        >
          + New Sprint
        </Link>
      </div>

      {sprints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-sm text-neutral-500">No Growth Sprints yet.</p>
          <Link href="/growth-sprint/new" className="mt-4 inline-block text-xs font-medium text-indigo-600 hover:underline">
            Start the first one →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sprints.map((s) => (
            <Link key={s.id} href={`/growth-sprint/${s.id}`} className="block">
              <div className="rounded-lg border border-neutral-100 bg-white px-5 py-4 hover:border-neutral-300 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{s.business_name}</p>
                      <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                      {s.decision_outcome && <Badge tone="neutral">{s.decision_outcome}</Badge>}
                    </div>
                    <p className="text-xs text-neutral-500 capitalize">
                      {s.business_context ?? "Context not set"}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-400 shrink-0">{fmtDate(s.created_at)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
