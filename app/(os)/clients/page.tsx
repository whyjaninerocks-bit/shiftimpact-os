// app/(os)/clients/page.tsx
// ShiftImpact OS -- Home / Clients
// Branded dashboard home: client list + New Client form + Clarity Snapshot CTA.

import Link from "next/link";
import { getClients } from "@/lib/data";
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
const clients = await getClients();

return (
<div className="space-y-8">

{/* Tagline bar */}
<div className="rounded-xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
  <div className="flex items-start justify-between gap-6">
    <div>
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">ShiftImpact OS</p>
      <p className="text-sm text-neutral-600">A concise executive view of what deserves attention now.</p>
    </div>
    <Link
      href="/audit"
      className="shrink-0 px-5 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 transition-colors"
    >
      Clarity Snapshot
    </Link>
  </div>
</div>

{/* Clients + New Client */}
<div className="grid gap-6 lg:grid-cols-3">
<div className="lg:col-span-2 space-y-3">
<SectionTitle>Clients</SectionTitle>
{clients.length === 0 && (
<Card><p className="text-sm text-neutral-500">No clients yet -- create one to get started.</p></Card>
)}
{clients.map((c) => (
<Link key={c.id} href={`/clients/${c.id}`}>
<Card className="hover:border-neutral-400 transition-colors cursor-pointer">
<div className="flex items-center justify-between">
<div>
<p className="font-semibold text-neutral-900">{c.name}</p>
{(c.business_outcome_label || c.retention_metric_label) && (
<p className="text-xs text-neutral-400 mt-0.5">
{[c.business_outcome_label, c.retention_metric_label].filter(Boolean).join(" · ")}
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
<Card>
<SectionTitle>New Client</SectionTitle>
<form action={createClient} className="space-y-3 mt-2">
<div><label className={labelClass} htmlFor="name">Name</label>
<input className={inputClass} id="name" name="name" required placeholder="e.g. Yeo's Malaysia" /></div>
<div><label className={labelClass} htmlFor="industry_profile">Industry Profile</label>
<select className={inputClass} id="industry_profile" name="industry_profile" defaultValue="QSR">
<option value="QSR">QSR</option><option value="B2B">B2B</option>
<option value="Retail">Retail</option><option value="Other">Other</option>
</select></div>
<div><label className={labelClass} htmlFor="business_outcome_label">Business Outcome Label</label>
<input className={inputClass} id="business_outcome_label" name="business_outcome_label" placeholder="e.g. Same-Store Sales Lift" /></div>
<div><label className={labelClass} htmlFor="retention_metric_label">Retention Metric Label</label>
<input className={inputClass} id="retention_metric_label" name="retention_metric_label" placeholder="e.g. Repeat Purchase Rate (60-day)" /></div>
<button type="submit" className={buttonClass}>Create Client</button>
</form>
</Card>
</div>
</div>
);
}
