// app/(os)/cultural-radar/new/page.tsx
// Log a new cultural signal — Part 1: Read the culture.
// Accepts ?client_id=... from client pages to pre-associate the signal.

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card, SectionTitle,
  inputClass, labelClass, buttonClass, buttonSecondaryClass,
} from "@/app/_components/ui";

const SIGNAL_TYPES = [
  { value: "behavioural", label: "Behavioural", desc: "What people are doing — searches, saves, purchases, rituals" },
  { value: "linguistic",  label: "Linguistic",  desc: "Words, phrases, expressions — old or new, trending or permanent" },
  { value: "ritual",      label: "Ritual",      desc: "Repeated practices, habits, ceremonies around consumption" },
  { value: "community",   label: "Community",   desc: "What specific communities are saying, doing, or moving toward" },
];

const MARKETS = ["MY", "SG", "ID", "TH", "PH", "VN"];

const INDUSTRIES = [
  "FMCG", "Financial Services", "Technology", "Retail", "QSR",
  "Healthcare", "Property", "Education", "Insurance", "Automotive",
  "Hospitality", "Media & Entertainment", "Telco", "E-Commerce", "B2B SaaS",
];

export default function NewCulturalSignalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillClientId = searchParams.get("client_id") ?? "";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  function toggleIndustry(ind: string) {
    setSelectedIndustries(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const body: Record<string, unknown> = {
      signal_name:          fd.get("signal_name"),
      signal_type:          fd.get("signal_type"),
      source_description:   fd.get("source_description"),
      evidence:             fd.get("evidence"),
      is_trending:          fd.get("is_trending") === "true",
      geographic_scope:     fd.get("geographic_scope") || "MY",
      relevant_industries:  selectedIndustries,
    };
    if (prefillClientId) body.client_id = prefillClientId;

    const res = await fetch("/api/cultural-signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to log signal"); setSaving(false); return; }
    // Return to client page if we came from there
    if (prefillClientId) {
      router.push(`/clients/${prefillClientId}`);
    } else {
      router.push(`/cultural-radar/${json.signal.id}`);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href={prefillClientId ? `/clients/${prefillClientId}` : "/cultural-radar"}
        className="text-sm text-neutral-400 hover:text-neutral-700 underline"
      >
        {prefillClientId ? "← Back to client" : "← Back to Cultural Radar"}
      </Link>

      <div>
        <SectionTitle>Log a cultural signal</SectionTitle>
        <p className="text-sm text-neutral-500 mt-1">
          Part 1 of 3. Log what you noticed — source and evidence.
          The system auto-tags relevant clients and industries, and surfaces this in the weekly digest.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Signal name */}
          <div>
            <label className={labelClass}>Signal name *</label>
            <input
              name="signal_name"
              required
              className={inputClass}
              placeholder='e.g. "cincai lah" meal indecision'
            />
            <p className="text-xs text-neutral-400 mt-1">
              Short label. Enough for someone to understand what you observed.
            </p>
          </div>

          {/* Signal type */}
          <div>
            <label className={labelClass}>Signal type *</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {SIGNAL_TYPES.map(({ value, label, desc }) => (
                <label key={value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="signal_type"
                    value={value}
                    required
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border border-neutral-200 px-3 py-2.5 peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white transition-colors">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] mt-0.5 text-neutral-400 peer-checked:text-neutral-300 leading-snug">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Relevant industries — optional override; auto-classified by Claude on save */}
          <div>
            <label className={labelClass}>Industry override <span className="text-neutral-400 font-normal">(optional)</span></label>
            <p className="text-xs text-neutral-400 mb-2">
              Industries are auto-detected from the signal content. Select here only to force-include additional ones.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => toggleIndustry(ind)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedIndustries.includes(ind)
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
            {selectedIndustries.length > 0 && (
              <p className="text-xs text-neutral-500 mt-1.5">
                Forced: {selectedIndustries.join(", ")} · auto-classify will still run and may add more
              </p>
            )}
          </div>

          {/* Is it trending? */}
          <div>
            <label className={labelClass}>Movement</label>
            <div className="flex gap-3 mt-1">
              {[
                { value: "false", label: "Permanent ordinary", desc: "Not new — just never used" },
                { value: "true",  label: "Currently moving",   desc: "Gaining momentum right now" },
              ].map(({ value, label, desc }) => (
                <label key={value} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="is_trending"
                    value={value}
                    defaultChecked={value === "false"}
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border border-neutral-200 px-3 py-2.5 peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white transition-colors text-sm">
                    <p className="font-medium">{label}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Market */}
          <div>
            <label className={labelClass}>Market</label>
            <select name="geographic_scope" defaultValue="MY" className={inputClass}>
              {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className={labelClass}>Where did you find or observe this? *</label>
            <input
              name="source_description"
              required
              className={inputClass}
              placeholder="e.g. TikTok comment threads, a conversation with a client, The Star article, mamak observations"
            />
          </div>

          {/* Evidence */}
          <div>
            <label className={labelClass}>Evidence — what exactly did you see or hear? *</label>
            <textarea
              name="evidence"
              required
              rows={4}
              className={inputClass}
              placeholder={'e.g. "Every time someone asks where to eat on TikTok, the most liked reply is \'cincai lah\'. The phrase appears in 60%+ of comments on food decision videos."\n\nInclude verbatim quotes, data, or specific observations.'}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className={`${buttonClass} disabled:opacity-50`}>
              {saving ? "Logging + classifying…" : "Log signal"}
            </button>
            <Link
              href={prefillClientId ? `/clients/${prefillClientId}` : "/cultural-radar"}
              className={buttonSecondaryClass}
            >
              Cancel
            </Link>
          </div>

        </form>
      </Card>

    </div>
  );
}
