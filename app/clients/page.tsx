import Link from "next/link";
import { getClients } from "@/lib/data";
import { createClient } from "@/lib/actions";
import { Badge, Card, ErrorBanner, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Master records. Industry Profile flows into OS Rules to configure campaign chain language per client.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="hover:border-neutral-400 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {c.business_outcome_label} · {c.retention_metric_label}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="neutral">{c.industry_profile}</Badge>
                  <Badge tone="blue">{c.active_campaigns} active</Badge>
                </div>
              </Card>
            </Link>
          ))}
          {clients.length === 0 && (
            <Card>
              <p className="text-sm text-neutral-500">No clients yet — create one to get started.</p>
            </Card>
          )}
        </div>

        <Card>
          <SectionTitle>New Client</SectionTitle>
          <form action={createClient} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="name">Name</label>
              <input className={inputClass} id="name" name="name" required />
            </div>
            <div>
              <label className={labelClass} htmlFor="industry_profile">Industry Profile</label>
              <select className={inputClass} id="industry_profile" name="industry_profile" required defaultValue="QSR">
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
    </div>
  );
}
