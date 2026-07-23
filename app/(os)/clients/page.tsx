// app/(os)/clients/page.tsx
// ShiftImpact OS — Home / Clients
// Branded dashboard home: client list + New Client form + Quick Audit CTA.

import Link from "next/link";
import { getClients, getRecentClaritySignals } from "@/lib/data";
import { createClient } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, claritySignals] = await Promise.all([
    getClients(),
    getRecentClaritySignals(8),
  ]);

  return (
    <div className="space-y-8">

      {/* ── Tagline bar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">ShiftImpact OS</p>
          <p className="text-sm text-neutral-500">A concise executive view of what deserves attention now.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-6">
          <Link
            href="/clarity-signal"
            className="px-5 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 text-sm font-semibold hover:bg-neutral-50 transition-colors"
          >
            Clarity Signal™
          </Link>
          <Link
            href="/audit"
            className="px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition-colors"
          >
            Clarity Snapshot
          </Link>
        </div>
      </div>

      {/* ── Clients + New Client ────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Client list */}
        <div className="lg:col-span-2 space-y-3">
          <SectionTitle>Clients</SectionTitle>

          {clients.length === 0 && (
            <Card>
              <p className="text-sm text-neutral-500">No clients yet — create one to get started.</p>
            </Card>
          )}

          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="hover:border-neutral-400 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">{c.name}</p>
                    {(c.business_outcome_label || c.retention_metric_label) && (
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {[c.business_outcome_label, c.retention_metric_label]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone="neutral">{c.industry_profile}</Badge>
                    <Badge tone="blue">{c.active_campaigns} active</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* New client form */}
        <Card>
          <SectionTitle>New Client</SectionTitle>
          <form action={createClient} className="space-y-3 mt-2">
            <div>
              <label className={labelClass} htmlFor="name">Name</label>
              <input className={inputClass} id="name" name="name" required placeholder="e.g. Yeo's Malaysia" />
            </div>
            <div>
              <label className={labelClass} htmlFor="industry_profile">Industry Profile</label>
              <select className={inputClass} id="industry_profile" name="industry_profile" defaultValue="QSR">
                <option value="QSR">QSR</option>
                <option value="B2B">B2B</option>
                <option value="Retail">Retail</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="business_outcome_label">Business Outcome Label</label>
              <input className={inputClass} id="business_outcome_label" name="business_outcome_label" placeholder="e.g. Same-Store Sales Lift" />
            </div>
            <div>
              <label className={labelClass} htmlFor="retention_metric_label">Retention Metric Label</label>
              <input className={inputClass} id="retention_metric_label" name="retention_metric_label" placeholder="e.g. Repeat Purchase Rate (60-day)" />
            </div>
            <button type="submit" className={buttonClass}>Create Client</button>
          </form>
        </Card>

      </div>
      {/* ── Recent Clarity Signals — internal only ──────────────────────── */}
      {claritySignals.length > 0 && (
        <div>
          <SectionTitle>Recent Clarity Signals</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
            {claritySignals.map((s) => (
              <div key={s.id} className="bg-white border border-neutral-100 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{s.brand_name}</p>
                  <p className="text-xs text-neutral-400 truncate">{s.campaign_name}</p>
                  <p className="text-[10px] text-neutral-300 mt-1">
                    {new Date(s.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Link
                    href={`/clarity-signal/${s.id}`}
                    className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-800 border border-neutral-200 rounded px-2 py-1 transition-colors"
                  >
                    View Signal
                  </Link>
                  <Link
                    href={`/audit?signal_id=${s.id}`}
                    className="text-[10px] font-semibold text-white bg-neutral-900 hover:bg-neutral-700 rounded px-2 py-1 transition-colors text-center"
                  >
                    Generate Snapshot →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
