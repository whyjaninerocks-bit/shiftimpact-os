"use client";
// app/(os)/diagnostic/new/page.tsx
// Sprint 11 — New Diagnostic Session intake form

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INDUSTRIES = [
  "FMCG", "QSR", "Retail", "F&B", "Beauty & Personal Care",
  "Healthcare & Wellness", "Consumer Electronics", "Fashion & Apparel",
  "Financial Services", "Travel & Hospitality", "Other",
];

const CHANNELS = [
  "Meta (Facebook/Instagram)", "TikTok", "Google / YouTube", "Programmatic Display",
  "OOH (Outdoor)", "TV / CTV", "Radio", "Influencer / KOL", "Email / CRM",
  "Retail Media", "Paid Search", "Organic Social",
];

export default function NewDiagnosticSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_name: "",
    contact_name: "",
    contact_email: "",
    industry: "",
    budget_range: "",
    current_channels: [] as string[],
    pain_points: "",
    current_tools: "",
    engagement_fee_rm: "",
    session_date: "",
  });

  function toggle(channel: string) {
    setForm(f => ({
      ...f,
      current_channels: f.current_channels.includes(channel)
        ? f.current_channels.filter(c => c !== channel)
        : [...f.current_channels, channel],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_name.trim() || !form.industry) {
      setError("Company name and industry are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostic-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          engagement_fee_rm: form.engagement_fee_rm ? Number(form.engagement_fee_rm) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      router.push(`/diagnostic/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/diagnostic" className="text-xs text-neutral-400 hover:text-neutral-600 mb-2 inline-block">
          ← Diagnostic Sessions
        </Link>
        <h1 className="text-xl font-bold text-neutral-900">New Diagnostic Session</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Intake captures everything the OS needs to generate the brief.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client section */}
        <div className="rounded-lg border border-neutral-100 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-700">Client Details</h2>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              placeholder="e.g. Nestlé Malaysia"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                placeholder="Marketing lead"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                placeholder="name@company.com"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Industry <span className="text-red-500">*</span>
            </label>
            <select
              value={form.industry}
              onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 bg-white"
              required
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        {/* Intelligence context */}
        <div className="rounded-lg border border-neutral-100 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-700">Intelligence Context</h2>
          <p className="text-xs text-neutral-400">
            This feeds directly into the generated brief. More detail = sharper output.
          </p>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-2">Active Channels</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggle(ch)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    form.current_channels.includes(ch)
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Annual Marketing Budget</label>
            <select
              value={form.budget_range}
              onChange={e => setForm(f => ({ ...f, budget_range: e.target.value }))}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 bg-white"
            >
              <option value="">Select range (optional)</option>
              <option value="Under RM 1M">Under RM 1M</option>
              <option value="RM 1M to RM 5M">RM 1M to RM 5M</option>
              <option value="RM 5M to RM 20M">RM 5M to RM 20M</option>
              <option value="RM 20M to RM 50M">RM 20M to RM 50M</option>
              <option value="Over RM 50M">Over RM 50M</option>
              <option value="Not disclosed">Not disclosed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Current Attribution Tools</label>
            <input
              type="text"
              value={form.current_tools}
              onChange={e => setForm(f => ({ ...f, current_tools: e.target.value }))}
              placeholder="e.g. Meta Ads Manager, Google Analytics, no attribution tool"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Pain Points / What They Cannot Answer Today</label>
            <textarea
              value={form.pain_points}
              onChange={e => setForm(f => ({ ...f, pain_points: e.target.value }))}
              rows={4}
              placeholder="e.g. Cannot link TikTok spend to in-store sales. No visibility into which channel is building brand equity vs. just driving clicks."
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
            />
          </div>
        </div>

        {/* Commercial */}
        <div className="rounded-lg border border-neutral-100 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-700">Engagement Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Session Date</label>
              <input
                type="date"
                value={form.session_date}
                onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Engagement Fee (RM)</label>
              <input
                type="number"
                value={form.engagement_fee_rm}
                onChange={e => setForm(f => ({ ...f, engagement_fee_rm: e.target.value }))}
                placeholder="5000"
                min="0"
                step="500"
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Create Session"}
          </button>
          <Link href="/diagnostic" className="text-sm text-neutral-500 hover:text-neutral-700">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
