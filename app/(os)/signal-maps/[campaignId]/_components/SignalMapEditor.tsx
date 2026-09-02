"use client";

// Outcome-Led Signal Mapping — internal editor (client component).
// Smallest viable admin version: pick a category, curate what signals are
// actually available for this campaign, and get a deterministic, honest
// confidence label. missing_data is a manual, independent field — it is
// never auto-derived as "everything not selected in available_data."

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCampaignSignalMap, updateSignalMapStatus, type SaveCampaignSignalMapInput } from "@/lib/actions";
import { computeConfidenceLabel } from "@/lib/signal-maps";
import { Card, SectionTitle, Badge, buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";
import type {
  CategoryAttribute,
  SignalVocabulary,
  CampaignSignalMapWithContext,
  MapStatus,
} from "@/lib/types";

function confidenceTone(label: string | null): "green" | "amber" | "red" | "neutral" {
  if (label === "Conversion Measured") return "green";
  if (label === "Conversion Partially Supported") return "amber";
  if (label === "Conversion Likelihood Only") return "red";
  return "neutral";
}

function statusTone(status: string): "green" | "amber" | "blue" | "neutral" {
  if (status === "used_in_report") return "green";
  if (status === "reviewed") return "blue";
  return "neutral";
}

// ─── Chip picker: candidates = suggested ∪ currently selected, plus a
//     dropdown to add any other vocabulary key. Used for leading /
//     conversion / lagging / available_data / missing_data. ────────────────
function SignalChipPicker({
  label,
  hint,
  vocabulary,
  suggested,
  selected,
  onChange,
}: {
  label: string;
  hint?: string;
  vocabulary: SignalVocabulary[];
  suggested: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const vocabByKey = useMemo(() => new Map(vocabulary.map((v) => [v.key, v.label])), [vocabulary]);
  const candidateKeys = useMemo(() => {
    const set = new Set<string>([...suggested, ...selected]);
    return Array.from(set).sort((a, b) => (vocabByKey.get(a) ?? a).localeCompare(vocabByKey.get(b) ?? b));
  }, [suggested, selected, vocabByKey]);
  const remaining = vocabulary.filter((v) => !candidateKeys.includes(v.key));

  function toggle(key: string) {
    if (selected.includes(key)) onChange(selected.filter((k) => k !== key));
    else onChange([...selected, key]);
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>
      {hint && <p className="text-xs text-neutral-400 mb-1.5">{hint}</p>}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {candidateKeys.length === 0 && <span className="text-xs text-neutral-400">Nothing yet.</span>}
        {candidateKeys.map((key) => {
          const isSelected = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                isSelected
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
              }`}
            >
              {vocabByKey.get(key) ?? key}
            </button>
          );
        })}
      </div>
      {remaining.length > 0 && (
        <select
          className={inputClass}
          value=""
          onChange={(e) => {
            if (e.target.value) toggle(e.target.value);
          }}
        >
          <option value="">+ Add another signal…</option>
          {remaining.map((v) => (
            <option key={v.key} value={v.key}>
              {v.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function SignalMapEditor({
  campaignId,
  businessOutcomeLabel,
  categories,
  vocabulary,
  activeMap,
  history,
}: {
  campaignId: string;
  businessOutcomeLabel: string;
  categories: CategoryAttribute[];
  vocabulary: SignalVocabulary[];
  activeMap: CampaignSignalMapWithContext | null;
  history: CampaignSignalMapWithContext[];
}) {
  const router = useRouter();

  const [categoryId, setCategoryId] = useState(activeMap?.category_attribute_id ?? "");
  const [profileName, setProfileName] = useState(activeMap?.signal_map_profile_name ?? "");
  const [behaviourChainUsed, setBehaviourChainUsed] = useState<string[]>(activeMap?.behaviour_chain_used ?? []);
  const [leadingSignals, setLeadingSignals] = useState<string[]>(activeMap?.leading_signals ?? []);
  const [conversionSignals, setConversionSignals] = useState<string[]>(activeMap?.conversion_signals ?? []);
  const [laggingSignals, setLaggingSignals] = useState<string[]>(activeMap?.lagging_signals ?? []);
  const [availableData, setAvailableData] = useState<string[]>(activeMap?.available_data ?? []);
  const [availableDataNotes, setAvailableDataNotes] = useState(activeMap?.available_data_notes ?? "");
  const [missingData, setMissingData] = useState<string[]>(activeMap?.missing_data ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMap, setSavedMap] = useState<CampaignSignalMapWithContext | null>(activeMap);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const hasTemplate = !!(selectedCategory?.behaviour_chain && selectedCategory.behaviour_chain.length > 0);

  function loadCategoryDefaults(cat: CategoryAttribute) {
    setBehaviourChainUsed(cat.behaviour_chain ?? []);
    setLeadingSignals(cat.default_leading_signals ?? []);
    setConversionSignals(cat.default_conversion_signals ?? []);
    setLaggingSignals(cat.default_lagging_signals ?? []);
  }

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat && cat.behaviour_chain && cat.behaviour_chain.length > 0) {
      // Only auto-load when the strategist hasn't started curating yet —
      // avoids silently overwriting edits when switching categories mid-edit.
      if (leadingSignals.length === 0 && conversionSignals.length === 0 && laggingSignals.length === 0) {
        loadCategoryDefaults(cat);
      }
    }
  }

  // Live preview — same deterministic function the server uses, so what the
  // strategist sees while editing matches exactly what gets persisted.
  const preview = useMemo(() => {
    if (!selectedCategory) return null;
    return computeConfidenceLabel(availableData, selectedCategory);
  }, [availableData, selectedCategory]);

  const signalCandidateUniverse = useMemo(() => {
    if (!selectedCategory) return [];
    return Array.from(
      new Set([
        ...(selectedCategory.default_leading_signals ?? []),
        ...(selectedCategory.default_conversion_signals ?? []),
        ...(selectedCategory.default_lagging_signals ?? []),
      ])
    );
  }, [selectedCategory]);

  async function handleSave() {
    if (!categoryId) {
      setError("Choose a category profile first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input: SaveCampaignSignalMapInput = {
        campaign_id: campaignId,
        category_attribute_id: categoryId,
        signal_map_profile_name: profileName.trim() || null,
        behaviour_chain_used: behaviourChainUsed,
        leading_signals: leadingSignals,
        conversion_signals: conversionSignals,
        lagging_signals: laggingSignals,
        signal_weights: selectedCategory?.default_signal_weights ?? {},
        available_data: availableData,
        available_data_notes: availableDataNotes.trim() || null,
        missing_data: missingData,
      };
      const result = await saveCampaignSignalMap(input);
      setSavedMap(result as unknown as CampaignSignalMapWithContext);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: MapStatus) {
    if (!savedMap) return;
    setSaving(true);
    try {
      await updateSignalMapStatus(savedMap.id, campaignId, status);
      setSavedMap({ ...savedMap, map_status: status });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Current active map summary */}
      {savedMap && (
        <Card className="bg-neutral-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-neutral-400 mb-1">Active signal map</p>
              <div className="flex items-center gap-2">
                <Badge tone={confidenceTone(savedMap.confidence_label)}>{savedMap.confidence_label}</Badge>
                <Badge tone={statusTone(savedMap.map_status)}>{savedMap.map_status.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm text-neutral-600 mt-2 max-w-xl">{savedMap.confidence_reason}</p>
            </div>
            <div className="flex gap-2">
              {savedMap.map_status !== "reviewed" && savedMap.map_status !== "used_in_report" && (
                <button className={buttonSecondaryClass} disabled={saving} onClick={() => handleStatusChange("reviewed")}>
                  Mark reviewed
                </button>
              )}
              {savedMap.map_status !== "used_in_report" && (
                <button className={buttonSecondaryClass} disabled={saving} onClick={() => handleStatusChange("used_in_report")}>
                  Mark used in report
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>Signal map profile</SectionTitle>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Category profile</label>
            <select className={inputClass} value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                  {!c.behaviour_chain || c.behaviour_chain.length === 0 ? " (no template yet)" : ""}
                </option>
              ))}
            </select>
            {selectedCategory && !hasTemplate && (
              <p className="text-xs text-amber-700 mt-1">
                This category has no signal template yet — behaviour chain and default signals will be empty.
                Everything below can still be filled in manually.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Business outcome (read-only)</label>
            <div className={`${inputClass} bg-neutral-50 text-neutral-500`}>{businessOutcomeLabel}</div>
          </div>
        </div>

        <div className="mb-4">
          <label className={labelClass}>Signal map profile name (optional)</label>
          <input
            className={inputClass}
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder='e.g. "Skincare Trust & Routine"'
          />
        </div>

        {selectedCategory && (
          <>
            {selectedCategory.behaviour_chain && selectedCategory.behaviour_chain.length > 0 && (
              <div className="mb-4">
                <label className={labelClass}>Behaviour chain used</label>
                <p className="text-xs text-neutral-400 mb-1.5">
                  Stages from this category&apos;s behaviour chain that apply to this campaign.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategory.behaviour_chain.map((stage) => {
                    const isSelected = behaviourChainUsed.includes(stage);
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() =>
                          setBehaviourChainUsed(
                            isSelected ? behaviourChainUsed.filter((s) => s !== stage) : [...behaviourChainUsed, stage]
                          )
                        }
                        className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                          isSelected
                            ? "bg-neutral-900 text-white border-neutral-900"
                            : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                        }`}
                      >
                        {stage}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <SignalChipPicker
                label="Leading signals"
                vocabulary={vocabulary}
                suggested={selectedCategory.default_leading_signals ?? []}
                selected={leadingSignals}
                onChange={setLeadingSignals}
              />
              <SignalChipPicker
                label="Conversion signals"
                vocabulary={vocabulary}
                suggested={selectedCategory.default_conversion_signals ?? []}
                selected={conversionSignals}
                onChange={setConversionSignals}
              />
              <SignalChipPicker
                label="Lagging signals"
                vocabulary={vocabulary}
                suggested={selectedCategory.default_lagging_signals ?? []}
                selected={laggingSignals}
                onChange={setLaggingSignals}
              />
            </div>

            {selectedCategory.required_data_types && selectedCategory.required_data_types.length > 0 && (
              <p className="text-xs text-neutral-400 mb-4">
                Typical data sources for this category: {selectedCategory.required_data_types.join(", ")}.
              </p>
            )}

            <div className="border-t border-neutral-100 pt-4 mb-4">
              <SignalChipPicker
                label="Available data"
                hint="What is actually confirmed available for this campaign right now — this drives the confidence label."
                vocabulary={vocabulary}
                suggested={signalCandidateUniverse}
                selected={availableData}
                onChange={setAvailableData}
              />
            </div>

            <div className="mb-4">
              <label className={labelClass}>Available data notes (optional)</label>
              <textarea
                className={inputClass}
                rows={2}
                value={availableDataNotes}
                onChange={(e) => setAvailableDataNotes(e.target.value)}
                placeholder='e.g. "Ticket sales available weekly, but no checkout-stage data yet."'
              />
            </div>

            <div className="mb-4">
              <SignalChipPicker
                label="Missing data"
                hint="Manually chosen — data that would improve confidence for this campaign, not every signal that wasn't selected above."
                vocabulary={vocabulary}
                suggested={signalCandidateUniverse}
                selected={missingData}
                onChange={setMissingData}
              />
            </div>

            {preview && (
              <div className="border-t border-neutral-100 pt-4">
                <label className={labelClass}>Confidence label preview</label>
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={confidenceTone(preview.label)}>{preview.label}</Badge>
                </div>
                <p className="text-sm text-neutral-500">{preview.reason}</p>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="mt-5">
          <button className={buttonClass} disabled={saving || !categoryId} onClick={handleSave}>
            {saving ? "Saving…" : savedMap ? "Save new version" : "Save signal map"}
          </button>
          <p className="text-xs text-neutral-400 mt-1.5">
            Saving creates a new active map and supersedes any previous one for this campaign.
          </p>
        </div>
      </Card>

      {history.length > 0 && (
        <Card>
          <SectionTitle>History</SectionTitle>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-neutral-100 last:border-0">
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone={confidenceTone(h.confidence_label)}>{h.confidence_label}</Badge>
                  <span className="text-neutral-500">{h.category_name}</span>
                  {h.signal_map_profile_name && <span className="text-neutral-400">— {h.signal_map_profile_name}</span>}
                  {h.is_active && <Badge tone="blue">active</Badge>}
                </div>
                <span className="text-xs text-neutral-400">{new Date(h.generated_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
