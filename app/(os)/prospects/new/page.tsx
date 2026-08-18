// app/(os)/prospects/new/page.tsx — Add a new prospect company

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, SectionTitle, inputClass, labelClass, buttonClass, buttonSecondaryClass } from "@/app/_components/ui";

const INDUSTRIES = [
  "FMCG", "F&B", "Retail", "Finance", "Telco", "Healthcare",
  "Property", "Automotive", "Travel", "Education", "Technology", "Other",
];

const MARKETS = ["MY", "SG", "ID", "TH", "PH", "VN"];

export default function NewProspectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/prospect-companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:                    fd.get("name"),
        industry:                fd.get("industry") || null,
        market_code:             fd.get("market_code") || "MY",
        website:                 fd.get("website") || null,
        linkedin_url:            fd.get("linkedin_url") || null,
        company_profile_summary: fd.get("company_profile_summary") || null,
        status:                  "Watching",
      }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to create company"); setSaving(false); return; }
    router.push(`/prospects/${json.company.id}`);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Link href="/prospects" className="text-sm text-neutral-400 hover:text-neutral-700 underline">
        Back to Prospects
      </Link>

      <SectionTitle>Add Company</SectionTitle>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Company name *</label>
            <input name="name" required className={inputClass} placeholder="e.g. Mamee Double Decker" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Industry</label>
              <select name="industry" className={inputClass}>
                <option value="">Select...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Market</label>
              <select name="market_code" className={inputClass} defaultValue="MY">
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Website</label>
            <input name="website" type="url" className={inputClass} placeholder="https://..." />
          </div>

          <div>
            <label className={labelClass}>LinkedIn URL</label>
            <input name="linkedin_url" type="url" className={inputClass} placeholder="https://linkedin.com/company/..." />
          </div>

          <div>
            <label className={labelClass}>Company profile summary</label>
            <textarea
              name="company_profile_summary"
              rows={3}
              className={inputClass}
              placeholder="Brief description used to give the AI context when scanning for signals."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className={buttonClass}>
              {saving ? "Creating..." : "Create Company"}
            </button>
            <Link href="/prospects" className={buttonSecondaryClass}>Cancel</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
