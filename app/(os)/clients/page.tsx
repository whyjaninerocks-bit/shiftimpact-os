// app/(os)/clients/page.tsx

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
import { DeleteClientButton } from "@/app/_components/DeleteClientButton";
import { ClaritySignalsReveal } from "./_components/ClaritySignalsReveal";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, claritySignals] = await Promise.all([
    getClients(),
    getRecentClaritySignals(8),
  ]);

  return (
    <div className="space-y-8">

      {/* ── Tagline bar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 bg-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">ShiftImpact OS</p>
          <p className="text-sm text-neutral-500">A concise executive view of what deserves attention now.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/clarity-signal"
            className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-800 text-sm font-semibold hover:bg-neutral-50 transition-colors"
          >
            Clarity Signal™
          </Link>
          <Link
            href="/audit"
            className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition-colors"
          >
            Clarity Snapshot
          </Link>
        </div>
      </div>

      {/* ── Existing Clients ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionTitle>Clients</SectionTitle>

        {clients.length === 0 && (
          <Card>
            <p className="text-sm text-neutral-500">No clients yet — create one below.</p>
          </Card>
        )}

        {clients.map((c) => (
          <Card key={c.id} className="group">
            <div className="flex items-center justify-between gap-4">
              <Link href={`/clients/${c.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">{c.name}</p>
                    {(c.business_outcome_label || c.retention_metric_label) && (
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">
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
              </Link>
              <DeleteClientButton clientId={c.id} clientName={c.name} />
            </div>
          </Card>
        ))}
      </div>

      {/* ── Add New Client ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionTitle>Add New Client</SectionTitle>
        <Card>
          <form action={createClient} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="name">Name *</label>
              <input className={inputClass} id="name" name="name" required placeholder="e.g. Yeo's Malaysia" />
            </div>
            <div>
              <label className={labelClass} htmlFor="industry_profile">Industry Profile</label>
              <select className={inputClass} id="industry_profile" name="industry_profile" defaultValue="FMCG">
                <option value="FMCG">FMCG</option>
                <option value="QSR">QSR</option>
                <option value="Retail">Retail</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Telco">Telco</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Insurance">Insurance</option>
                <option value="Automotive">Automotive</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Media & Entertainment">Media & Entertainment</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Education">Education</option>
                <option value="B2B">B2B</option>
                <option value="B2B SaaS">B2B SaaS</option>
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
            <div>
              <label className={labelClass} htmlFor="contact_name">Client Contact Name</label>
              <input className={inputClass} id="contact_name" name="contact_name" placeholder="e.g. Ahmad Khalil" />
            </div>
            <div>
              <label className={labelClass} htmlFor="contact_email">Client Contact Email</label>
              <input className={inputClass} type="email" id="contact_email" name="contact_email" placeholder="e.g. ahmad@brand.com" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={buttonClass}>Create Client</button>
            </div>
          </form>
        </Card>
      </div>

      {/* ── Recent Clarity Signals — hidden by default ───────────────────── */}
      <ClaritySignalsReveal signals={claritySignals} />

    </div>
  );
}
