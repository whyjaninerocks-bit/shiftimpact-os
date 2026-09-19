"use client";
// Stage 4B — durability_status editor. Strategist-set only, never
// auto-computed (same human-driven principle as BrandFitForm.tsx's brand
// fit assessment, but a separate concern: this is about the signal's own
// nature — rooted vs. emerging vs. trending vs. uncertain — not about fit
// with the brand). Lives in Part 1 ("Read the culture") rather than inside
// BrandFitForm's Part 2, and can be set, changed, or cleared at any time.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DURABILITY_STATUS_OPTIONS } from "@/lib/cultural-signal-picker";
import { labelClass, inputClass } from "@/app/_components/ui";

export function DurabilityStatusForm({
  signalId,
  currentValue,
}: {
  signalId: string;
  currentValue: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentValue ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== (currentValue ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cultural-signals/${signalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durability_status: value || null }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Could not save durability status.");
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not save durability status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className={labelClass}>Durability</label>
      <p className="text-xs text-neutral-400 mb-1.5">
        Is this a rooted cultural pattern, an emerging signal, currently trending, or still uncertain? Strategist judgment only — never auto-computed.
      </p>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          className={inputClass}
        >
          <option value="">Not set</option>
          {DURABILITY_STATUS_OPTIONS.map(({ value: v, label }) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-700 rounded-lg px-3 py-2 disabled:opacity-50 flex-shrink-0"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
