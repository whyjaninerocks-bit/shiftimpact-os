"use client";

// Part 2: Brand fit & authenticity assessment form.
// Human-driven judgment — this cannot be automated.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, inputClass, labelClass, buttonClass } from "@/app/_components/ui";

type Signal = {
  id: string;
  why_it_matters: string | null;
  brand_fit_notes: string | null;
  brand_fit_status: string;
  community_respect_check: boolean;
};

const FIT_OPTIONS = [
  { value: "strong",   label: "Strong fit", desc: "There is a genuine, natural connection to this brand." },
  { value: "weak",     label: "Weak fit",   desc: "Possible but forced — would require explanation to work." },
  { value: "not_ours", label: "Not ours",   desc: "No authentic entry point. Do not pursue." },
];

export function BrandFitForm({ signal }: { signal: Signal }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDone = signal.brand_fit_status !== "pending";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);

    const res = await fetch(`/api/cultural-signals/${signal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        why_it_matters:          fd.get("why_it_matters"),
        brand_fit_notes:         fd.get("brand_fit_notes"),
        brand_fit_status:        fd.get("brand_fit_status"),
        community_respect_check: fd.get("community_respect_check") === "on",
      }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Save failed"); setSaving(false); return; }
    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Why it matters */}
        <div>
          <label className={labelClass}>Why is this happening? What does it mean? *</label>
          <textarea
            name="why_it_matters"
            required
            rows={3}
            defaultValue={signal.why_it_matters ?? ""}
            className={inputClass}
            placeholder="Root cause and cultural meaning. Is this moving or has it always been there? Be honest about uncertainty."
          />
        </div>

        {/* Brand fit notes */}
        <div>
          <label className={labelClass}>Brand fit assessment *</label>
          <textarea
            name="brand_fit_notes"
            required
            rows={3}
            defaultValue={signal.brand_fit_notes ?? ""}
            className={inputClass}
            placeholder="Which brands does this genuinely belong to? Why? What would make it feel forced? Be specific."
          />
        </div>

        {/* Brand fit status */}
        <div>
          <label className={labelClass}>Verdict *</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {FIT_OPTIONS.map(({ value, label, desc }) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="brand_fit_status"
                  value={value}
                  required
                  defaultChecked={signal.brand_fit_status === value}
                  className="peer sr-only"
                />
                <div className="rounded-lg border border-neutral-200 px-3 py-2.5 peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white transition-colors">
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug peer-checked:text-neutral-300">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Community respect check */}
        <div className="flex items-start gap-3">
          <input
            id="community_respect_check"
            name="community_respect_check"
            type="checkbox"
            defaultChecked={signal.community_respect_check}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900"
          />
          <label htmlFor="community_respect_check" className="text-sm text-neutral-700 cursor-pointer leading-snug">
            There is a genuine, respectful way to connect with the real people or community behind this signal.
            <span className="block text-xs text-neutral-400 mt-0.5">
              If this cannot be checked, the signal is not worth pursuing regardless of brand fit.
            </span>
          </label>
        </div>

        {/* Error / saved */}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {saved && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">Assessment saved.</p>}

        <button type="submit" disabled={saving} className={`${buttonClass} disabled:opacity-50`}>
          {saving ? "Saving…" : isDone ? "Update assessment" : "Save assessment"}
        </button>

      </form>
    </Card>
  );
}
