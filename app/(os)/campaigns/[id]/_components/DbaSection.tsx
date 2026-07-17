"use client";
// DbaSection.tsx
// F29 — Distinctive Brand Asset Intelligence
// Sprint 22 · 18 July 2026
//
// Distinctive Brand Asset (DBA) registry for the client.
// Surfaces which assets are deployed in this campaign's FRAME brief.
// Allows Janine (strategy lead) to add, edit, and manage the asset registry.
//
// ACCESS RULES:
//   ALL FIELDS: INTERNAL ONLY — never shown in client portal
//   consistency_score: computed in future sprint (DBAI correlation engine) — null until 2+ campaigns
//   Client sees: asset_name + asset_type ONLY at onboarding orientation (not here)
//
// Byron Sharp / Ehrenberg-Bass framework: assets that consistently appear across
// campaigns build faster mental availability. Consistency = competitive moat.

import { useState } from "react";
import { Card, SectionTitle, Badge } from "@/app/_components/ui";
import type { BrandAsset, BrandAssetType, BrandAssetStrength } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbaSectionProps {
  campaignId: string;
  clientId: string;
  frameBriefId: string;
  initialAssets: BrandAsset[];
  distinctiveAssetsDeployed: string; // from frame_briefs.distinctive_assets_deployed
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_TYPES: BrandAssetType[] = ["Visual", "Sonic", "Verbal", "Experiential"];

const ASSET_STRENGTHS: { value: BrandAssetStrength; label: string; note: string }[] = [
  { value: "Established", label: "Established", note: ">70% audience association" },
  { value: "Building",    label: "Building",    note: "40–70% recognition" },
  { value: "Emerging",    label: "Emerging",    note: "<40% recognition" },
  { value: "At Risk",     label: "At Risk",     note: "Was Established — decaying" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function strengthTone(s: BrandAssetStrength): "green" | "amber" | "red" | "neutral" {
  if (s === "Established") return "green";
  if (s === "Building")    return "amber";
  if (s === "Emerging")    return "neutral";
  if (s === "At Risk")     return "red";
  return "neutral";
}

function typeBadgeColor(t: BrandAssetType): string {
  if (t === "Visual")       return "bg-blue-100 text-blue-700";
  if (t === "Sonic")        return "bg-purple-100 text-purple-700";
  if (t === "Verbal")       return "bg-amber-100 text-amber-700";
  if (t === "Experiential") return "bg-emerald-100 text-emerald-700";
  return "bg-neutral-100 text-neutral-600";
}

function parseDeployedIds(deployed: string): string[] {
  if (!deployed || deployed === "NONE_CONFIRMED") return [];
  return deployed.split(",").map((s) => s.trim()).filter(Boolean);
}

// ─── Add Asset Form ───────────────────────────────────────────────────────────

interface AddAssetFormProps {
  clientId: string;
  onAdded: (asset: BrandAsset) => void;
  onCancel: () => void;
}

function AddAssetForm({ clientId, onAdded, onCancel }: AddAssetFormProps) {
  const [assetName, setAssetName]       = useState("");
  const [assetType, setAssetType]       = useState<BrandAssetType>("Visual");
  const [description, setDescription]   = useState("");
  const [assetStrength, setAssetStrength] = useState<BrandAssetStrength>("Emerging");
  const [notes, setNotes]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/brand-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          client_id: clientId,
          asset_name: assetName,
          asset_type: assetType,
          description,
          asset_strength: assetStrength,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create asset");
        return;
      }

      onAdded(json.asset as BrandAsset);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-neutral-200 rounded-lg p-4 bg-neutral-50">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">New Brand Asset</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Asset Name</label>
          <input
            type="text"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder='e.g. "Red mascot character"'
            className="w-full text-sm border border-neutral-200 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Asset Type</label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as BrandAssetType)}
            className="w-full text-sm border border-neutral-200 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">
          Description <span className="text-neutral-400">(what the asset is and how it appears)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full text-sm border border-neutral-200 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-none"
          placeholder="E.g. A red cartoon kangaroo that appears in all packaging and TVCs..."
        />
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">Asset Strength</label>
        <select
          value={assetStrength}
          onChange={(e) => setAssetStrength(e.target.value as BrandAssetStrength)}
          className="w-full text-sm border border-neutral-200 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
        >
          {ASSET_STRENGTHS.map((s) => (
            <option key={s.value} value={s.value}>{s.label} — {s.note}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">
          Notes <span className="text-neutral-400">(Janine observations — internal)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full text-sm border border-neutral-200 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-none"
          placeholder="e.g. Audience research shows 68% recall from 2024 campaign..."
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded px-2.5 py-1.5">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !assetName}
          className="flex-1 py-1.5 px-3 rounded text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "Adding…" : "Add Asset"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="py-1.5 px-3 rounded text-sm text-neutral-500 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Edit Asset Row ───────────────────────────────────────────────────────────

interface EditAssetRowProps {
  asset: BrandAsset;
  onSaved: (updated: BrandAsset) => void;
  onCancel: () => void;
}

function EditAssetRow({ asset, onSaved, onCancel }: EditAssetRowProps) {
  const [assetName, setAssetName]         = useState(asset.asset_name);
  const [assetStrength, setAssetStrength] = useState<BrandAssetStrength>(asset.asset_strength);
  const [description, setDescription]     = useState(asset.description);
  const [notes, setNotes]                 = useState(asset.notes);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/brand-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: asset.id,
          asset_name: assetName,
          asset_strength: assetStrength,
          description,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update asset");
        return;
      }

      onSaved(json.asset as BrandAsset);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-neutral-400 mb-1">Name</label>
          <input
            type="text"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
          />
        </div>
        <div className="w-48">
          <label className="block text-xs text-neutral-400 mb-1">Strength</label>
          <select
            value={assetStrength}
            onChange={(e) => setAssetStrength(e.target.value as BrandAssetStrength)}
            className="w-full text-sm border border-neutral-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
          >
            {ASSET_STRENGTHS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full text-sm border border-neutral-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-neutral-400 mb-1">Notes [Internal]</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full text-sm border border-neutral-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-xs px-3 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1 rounded border border-neutral-200 text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DbaSection({
  clientId,
  frameBriefId,
  initialAssets,
  distinctiveAssetsDeployed,
}: DbaSectionProps) {
  const [assets, setAssets] = useState<BrandAsset[]>(initialAssets);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [deployedIds, setDeployedIds] = useState<string[]>(
    parseDeployedIds(distinctiveAssetsDeployed)
  );
  const [noneConfirmed, setNoneConfirmed] = useState(
    distinctiveAssetsDeployed === "NONE_CONFIRMED"
  );
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError]     = useState<string | null>(null);

  function handleAdded(asset: BrandAsset) {
    setAssets((prev) => [...prev, asset]);
    setShowAddForm(false);
  }

  function handleSaved(updated: BrandAsset) {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setEditingId(null);
  }

  async function toggleDeployed(assetId: string) {
    const newIds = deployedIds.includes(assetId)
      ? deployedIds.filter((id) => id !== assetId)
      : [...deployedIds, assetId];

    await updateDeployed(newIds.join(","), false);
    setDeployedIds(newIds);
  }

  async function handleNoneConfirmed() {
    const newVal = noneConfirmed ? "" : "NONE_CONFIRMED";
    await updateDeployed(newVal, !noneConfirmed);
    setNoneConfirmed(!noneConfirmed);
    if (!noneConfirmed) setDeployedIds([]);
  }

  async function updateDeployed(value: string, isNone: boolean) {
    setDeployLoading(true);
    setDeployError(null);
    try {
      const res = await fetch("/api/brand-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_deployed",
          frame_brief_id: frameBriefId,
          distinctive_assets_deployed: value,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setDeployError(json.error ?? "Failed to update deployment");
        // Revert
        if (!isNone) {
          setDeployedIds(parseDeployedIds(value));
        }
      }
    } catch {
      setDeployError("Network error");
    } finally {
      setDeployLoading(false);
    }
  }

  // Group by type
  const byType: Partial<Record<BrandAssetType, BrandAsset[]>> = {};
  for (const asset of assets) {
    if (!byType[asset.asset_type]) byType[asset.asset_type] = [];
    byType[asset.asset_type]!.push(asset);
  }

  return (
    <section id="dba-intelligence">
      <SectionTitle>Distinctive Brand Asset Intelligence (F29) ⚿</SectionTitle>

      <div className="space-y-4">
        {/* Internal context note */}
        <div className="text-xs text-neutral-400 bg-neutral-50 rounded px-3 py-2 border border-neutral-100">
          <span className="font-medium text-neutral-500">INTERNAL ONLY</span> — DBA registry is a client-level asset.
          Tick which assets are deployed in this campaign. Consistent deployment = faster mental availability.
          Consistency scores compute automatically after 2+ campaigns.
        </div>

        {/* Deployment status */}
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Deployed in This Campaign
              </p>
              {deployLoading && (
                <span className="text-xs text-neutral-400">Saving…</span>
              )}
            </div>

            {deployError && (
              <p className="text-xs text-red-500 bg-red-50 rounded px-2.5 py-1.5">{deployError}</p>
            )}

            {/* Frame brief status */}
            {assets.length === 0 ? (
              <p className="text-xs text-neutral-400">No assets registered yet — add assets below.</p>
            ) : (
              <div className="space-y-1.5">
                {assets.map((asset) => (
                  <label
                    key={asset.id}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={deployedIds.includes(asset.id)}
                      onChange={() => toggleDeployed(asset.id)}
                      disabled={noneConfirmed || deployLoading}
                      className="rounded border-neutral-300"
                    />
                    <span className={`text-xs ${typeBadgeColor(asset.asset_type)} px-1.5 py-0.5 rounded`}>
                      {asset.asset_type}
                    </span>
                    <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
                      {asset.asset_name}
                    </span>
                    <Badge tone={strengthTone(asset.asset_strength)}>
                      {asset.asset_strength}
                    </Badge>
                  </label>
                ))}

                <div className="pt-1 border-t border-neutral-100">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noneConfirmed}
                      onChange={handleNoneConfirmed}
                      disabled={deployLoading}
                      className="rounded border-neutral-300"
                    />
                    <span className="text-xs text-neutral-400 italic">
                      No DBAs apply to this brief (explicitly confirmed)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Deployed summary */}
            {deployedIds.length > 0 && (
              <div className="text-xs text-emerald-600 bg-emerald-50 rounded px-2.5 py-1.5">
                {deployedIds.length} asset{deployedIds.length > 1 ? "s" : ""} deployed in this brief
              </div>
            )}
            {noneConfirmed && (
              <div className="text-xs text-amber-500 bg-amber-50 rounded px-2.5 py-1.5">
                ⚠ No DBAs confirmed for this brief — BIP co-pilot flag suppressed
              </div>
            )}
            {!noneConfirmed && deployedIds.length === 0 && assets.length > 0 && (
              <div className="text-xs text-red-400 bg-red-50 rounded px-2.5 py-1.5">
                No assets deployed — BIP co-pilot flag active
              </div>
            )}
          </div>
        </Card>

        {/* Asset registry */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Asset Registry
                <span className="ml-2 font-normal text-neutral-400">{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
              </p>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-xs px-3 py-1 rounded border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-400 transition-colors"
                >
                  + Add Asset
                </button>
              )}
            </div>

            {/* Add form */}
            {showAddForm && (
              <AddAssetForm
                clientId={clientId}
                onAdded={handleAdded}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            {/* Asset list by type */}
            {assets.length === 0 && !showAddForm ? (
              <p className="text-sm text-neutral-400 italic">
                No brand assets registered for this client. Add assets to start tracking consistency.
              </p>
            ) : (
              <div className="space-y-4">
                {(ASSET_TYPES as BrandAssetType[])
                  .filter((t) => byType[t]?.length)
                  .map((type) => (
                    <div key={type}>
                      <p className={`text-xs font-medium mb-2 inline-block px-2 py-0.5 rounded ${typeBadgeColor(type)}`}>
                        {type}
                      </p>

                      <div className="space-y-2">
                        {byType[type]!.map((asset) => (
                          <div key={asset.id}>
                            {editingId === asset.id ? (
                              <EditAssetRow
                                asset={asset}
                                onSaved={handleSaved}
                                onCancel={() => setEditingId(null)}
                              />
                            ) : (
                              <div className="border border-neutral-100 rounded-lg p-3 group hover:border-neutral-200 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-neutral-800">
                                        {asset.asset_name}
                                      </span>
                                      <Badge tone={strengthTone(asset.asset_strength)}>
                                        {asset.asset_strength}
                                      </Badge>
                                      {deployedIds.includes(asset.id) && (
                                        <span className="text-xs text-emerald-600 font-medium">✓ Deployed</span>
                                      )}
                                    </div>
                                    {asset.description && (
                                      <p className="text-xs text-neutral-500 mt-1">{asset.description}</p>
                                    )}
                                    {asset.notes && (
                                      <p className="text-xs text-neutral-400 italic mt-1">
                                        Note: {asset.notes}
                                      </p>
                                    )}
                                    {asset.consistency_score !== null && (
                                      <p className="text-xs text-neutral-400 mt-1">
                                        Consistency: <span className="font-medium">{asset.consistency_score}%</span> of campaigns
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setEditingId(asset.id)}
                                    className="text-xs text-neutral-300 hover:text-neutral-600 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
