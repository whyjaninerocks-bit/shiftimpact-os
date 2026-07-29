// app/(os)/prospects/page.tsx
// Prospect Intelligence Engine — Company list
// Shows all tracked companies with tier, signal count, last scan date, status.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, SectionTitle, buttonClass } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

function tierTone(tier: string | null): "red" | "amber" | "neutral" {
  if (tier === "Tier 1 Hot")   return "red";
  if (tier === "Tier 2 Warm")  return "amber";
  return "neutral";
}

function statusTone(status: string): "green" | "blue" | "amber" | "neutral" {
  if (status === "Client")    return "green";
  if (status === "Qualified") return "blue";
  if (status === "Watching")  return "neutral";
  return "neutral";
}

function daysSince(date: string | null): string {
  if (!date) return "never";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tier?: string; q?: string }>;
}) {
  const supabase = createAdminClient();
  const { status, tier, q } = await searchParams;

  let query = supabase
    .from("companies")
    .select(`
      id, name, industry, market_code, status, prospect_tier,
      last_signal_date, is_suppressed,
      business_signals ( count )
    `)
    .eq("is_suppressed", false)
    .order("last_signal_date", { ascending: false, nullsFirst: false });

  if (status) query = query.eq("status", status);
  if (tier)   query = query.eq("prospect_tier", tier);
  if (q)      query = query.ilike("name", `%${q}%`);

  const { data: companies, error } = await query.limit(100);

  // Count outreach pending approval
  const { count: pendingApproval } = await supabase
    .from("outreach")
    .select("id", { count: "exact", head: true })
    .eq("status", "Drafted");

  const counts = {
    total:     companies?.length ?? 0,
    hot:       companies?.filter(c => c.prospect_tier === "Tier 1 Hot").length ?? 0,
    qualified: companies?.filter(c => c.status === "Qualified").length ?? 0,
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 bg-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Prospect Intelligence</p>
          <p className="text-sm text-neutral-500">Signal-led opportunity tracking. AI scans, you decide.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {(pendingApproval ?? 0) > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              {pendingApproval} draft{pendingApproval === 1 ? "" : "s"} awaiting approval
            </span>
          )}
          <Link href="/prospects/new" className={buttonClass}>
            Add Company
          </Link>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tracked", value: counts.total, tone: "neutral" },
          { label: "Tier 1 Hot", value: counts.hot, tone: "red" },
          { label: "Qualified", value: counts.qualified, tone: "blue" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <form method="GET" className="flex flex-wrap gap-2 items-center">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search company…"
          className="flex-1 min-w-40 border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-300"
        />
        <select name="status" defaultValue={status ?? ""} className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="Watching">Watching</option>
          <option value="Qualified">Qualified</option>
          <option value="Client">Client</option>
          <option value="Archived">Archived</option>
        </select>
        <select name="tier" defaultValue={tier ?? ""} className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">All tiers</option>
          <option value="Tier 1 Hot">Tier 1 Hot</option>
          <option value="Tier 2 Warm">Tier 2 Warm</option>
          <option value="Tier 3 Watch">Tier 3 Watch</option>
        </select>
        <button type="submit" className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors">
          Filter
        </button>
        {(status || tier || q) && (
          <Link href="/prospects" className="text-sm text-neutral-400 hover:text-neutral-700 underline">
            Clear
          </Link>
        )}
      </form>

      {/* ── Company list ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionTitle>Companies</SectionTitle>

        {error && (
          <Card><p className="text-sm text-red-600">Error loading prospects: {error.message}</p></Card>
        )}

        {!error && (companies?.length ?? 0) === 0 && (
          <Card>
            <p className="text-sm text-neutral-500">
              No companies yet.{" "}
              <Link href="/prospects/new" className="underline text-neutral-700">Add the first one.</Link>
            </p>
          </Card>
        )}

        {companies?.map(c => {
          const sigCount = Array.isArray((c as Record<string, unknown>).business_signals)
            ? ((c as Record<string, unknown>).business_signals as { count: number }[]).length
            : 0;

          return (
            <Link key={c.id} href={`/prospects/${c.id}`} className="block group">
              <Card className="group-hover:border-neutral-300 transition-colors">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors">
                        {c.name}
                      </p>
                      {c.prospect_tier && (
                        <Badge tone={tierTone(c.prospect_tier)}>{c.prospect_tier}</Badge>
                      )}
                      <Badge tone={statusTone(c.status ?? "Watching")}>{c.status ?? "Watching"}</Badge>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {[c.industry, c.market_code].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-400 shrink-0">
                    <span>{sigCount} signal{sigCount !== 1 ? "s" : ""}</span>
                    <span>Scanned {daysSince(c.last_signal_date)}</span>
                    <svg className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
