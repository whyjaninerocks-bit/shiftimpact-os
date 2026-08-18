"use client";

// app/settings/_components/AIModelSettings.tsx
// AI model selector for each inference route in ShiftImpact OS.
// Reads current values from /api/os-settings on mount.
// Saves updates instantly — no page reload.

import { useEffect, useState } from "react";
import { Card, SectionTitle, labelClass, buttonClass } from "@/app/_components/ui";

// ─── Available models ────────────────────────────────────────────────────────
// Update this list when Anthropic releases new model versions.

const AVAILABLE_MODELS = [
  {
    value: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    note: "Fast · Cheap · Good for routing and synthesis",
  },
  {
    value: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    note: "Balanced · Recommended for analysis and reports",
  },
  {
    value: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    note: "Most capable · Premium cost · Use for complex tasks",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface OsSetting {
  key: string;
  value: string;
  label: string;
  description: string | null;
  updated_at: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

// ─── Single model row ─────────────────────────────────────────────────────────

function ModelRow({ setting, onSaved }: { setting: OsSetting; onSaved: (key: string, value: string) => void }) {
  const [selected, setSelected] = useState(setting.value);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Reset if parent refreshes value
  useEffect(() => { setSelected(setting.value); }, [setting.value]);

  const isDirty = selected !== setting.value;

  async function handleSave() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/os-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, value: selected }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      onSaved(setting.key, selected);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  const selectedModel = AVAILABLE_MODELS.find(m => m.value === selected);

  return (
    <div className="py-4 border-b border-neutral-100 last:border-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-800">{setting.label}</p>
          {setting.description && (
            <p className="text-xs text-neutral-500 mt-0.5">{setting.description}</p>
          )}
          {selectedModel && (
            <p className="text-xs text-neutral-400 mt-1">{selectedModel.note}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selected}
            onChange={e => { setSelected(e.target.value); setSaveState("idle"); }}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            {AVAILABLE_MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saveState === "saving"}
              className={buttonClass + (saveState === "saving" ? " opacity-60 cursor-not-allowed" : "")}
            >
              {saveState === "saving" ? "Saving…" : "Save"}
            </button>
          )}

          {saveState === "saved" && !isDirty && (
            <span className="text-xs text-green-600 font-medium">Saved ✓</span>
          )}
          {saveState === "error" && (
            <span className="text-xs text-red-500">Error — try again</span>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-400 mt-2">
        Key: <code className="font-mono bg-neutral-100 px-1 rounded">{setting.key}</code>
        {" · "}Last updated: {new Date(setting.updated_at).toLocaleDateString("en-MY", {
          day: "numeric", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIModelSettings() {
  const [settings, setSettings] = useState<OsSetting[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/os-settings")
      .then(r => r.json())
      .then(d => {
        // Only show model_* keys on this page
        const modelSettings = (d.settings as OsSetting[]).filter(s => s.key.startsWith("model_"));
        setSettings(modelSettings);
      })
      .catch(() => setLoadErr("Could not load settings."))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(key: string, value: string) {
    setSettings(prev =>
      prev.map(s => s.key === key ? { ...s, value, updated_at: new Date().toISOString() } : s)
    );
  }

  return (
    <section className="space-y-4">
      <SectionTitle>AI Model Configuration</SectionTitle>

      <Card>
        <p className="text-xs text-neutral-500 mb-1">
          Select the AI model for each inference route. Changes apply to the next request — no redeploy needed.
        </p>
        <p className="text-xs text-neutral-400">
          <strong>Haiku</strong> — fast and cost-efficient, best for routing, classification, and synthesis tasks.{" "}
          <strong>Sonnet</strong> — best for analytical writing, reports, and intelligence queries.{" "}
          <strong>Opus</strong> — maximum capability, highest cost; reserve for the most complex tasks.
        </p>
      </Card>

      <Card>
        {loading && (
          <p className="text-sm text-neutral-500 py-4">Loading settings…</p>
        )}
        {loadErr && (
          <p className="text-sm text-red-500 py-4">{loadErr}</p>
        )}
        {!loading && !loadErr && settings.length === 0 && (
          <p className="text-sm text-neutral-400 py-4">
            No model settings found. Run migration 0016 in Supabase to seed defaults.
          </p>
        )}
        {!loading && settings.map(s => (
          <ModelRow key={s.key} setting={s} onSaved={handleSaved} />
        ))}
      </Card>
    </section>
  );
}
