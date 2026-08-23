"use client";

// app/(os)/growth-sprint/new/page.tsx
// Growth Sprint Experience v1 — create a draft, redirect into the workspace
// INTERNAL ONLY

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/app/_components/ui";

export default function NewGrowthSprintPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!businessName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/growth-sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: businessName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      router.push(`/growth-sprint/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card className="space-y-3">
        <h1 className="text-lg font-bold text-neutral-900">New Growth Sprint</h1>
        <p className="text-xs text-neutral-500">Start with the business name — everything else is captured in the guided session.</p>
        <input
          autoFocus
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Business name"
          className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          disabled={saving || !businessName.trim()}
          onClick={create}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          {saving ? "Creating…" : "Start sprint"}
        </button>
      </Card>
    </div>
  );
}
