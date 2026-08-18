// app/(os)/diagnostic/page.tsx
// Sprint 11 — Diagnostic Sessions list
// INTERNAL ONLY

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

function statusTone(status: string): "green" | "amber" | "neutral" | "red" {
  if (status === "Delivered") return "green";
  if (status === "In Progress") return "amber";
  if (status === "Archived") return "neutral";
  return "neutral";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

async function getSessions() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("diagnostic_sessions")
    .select("id, client_name, contact_name, industry, status, engagement_fee_rm, session_date, created_at, delivered_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export default async function DiagnosticSessionsPage() {
  const sessions = await getSessions();

  const stats = {
    total: sessions.length,
    delivered: sessions.filter(s => s.status === "Delivered").length,
    inProgress: sessions.filter(s => s.status === "In Progress").length,
    booked: sessions.filter(s => s.status === "Booked").length,
    totalFee: sessions.reduce((sum, s) => sum + (s.engagement_fee_rm ?? 0), 0),
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Diagnostic Sessions</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Entry product — RM 5,000 to RM 8,000 per session. Founding cohort builds prediction accuracy.
          </p>
        </div>
        <Link
          href="/diagnostic/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
        >
          + New Session
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Sessions", value: stats.total },
          { label: "Delivered", value: stats.delivered },
          { label: "In Progress", value: stats.inProgress },
          { label: "Total Revenue", value: stats.totalFee > 0 ? `RM ${stats.totalFee.toLocaleString("en-MY")}` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-neutral-100 bg-white p-4">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="text-2xl font-bold text-neutral-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-sm text-neutral-500">No diagnostic sessions yet.</p>
          <p className="text-xs text-neutral-400 mt-1">Create the first one to begin building the founding cohort record.</p>
          <Link href="/diagnostic/new" className="mt-4 inline-block text-xs font-medium text-indigo-600 hover:underline">
            Book first session →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <Link key={s.id} href={`/diagnostic/${s.id}`} className="block">
              <div className="rounded-lg border border-neutral-100 bg-white px-5 py-4 hover:border-neutral-300 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{s.client_name}</p>
                      <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {s.industry}
                      {s.contact_name ? ` · ${s.contact_name}` : ""}
                      {s.session_date ? ` · ${fmtDate(s.session_date)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.engagement_fee_rm ? (
                      <p className="text-sm font-semibold text-neutral-800">
                        RM {Number(s.engagement_fee_rm).toLocaleString("en-MY")}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-400">Fee TBD</p>
                    )}
                    <p className="text-xs text-neutral-400">{fmtDate(s.created_at)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
