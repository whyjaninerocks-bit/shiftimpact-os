"use client";
// BrandHealthBatterySection.tsx
// Expert Architecture Addition — Brand Health Battery
//
// SPEC (PRD Addendum v2.3):
//   Tracks the 60:40 brand-building (Demand) vs activation ratio across campaigns.
//   Battery levels:
//     Full    (70–100%): Demand investment healthy.
//     Healthy (50–69%):  Balanced. Maintain current ratio.
//     Watch   (30–49%):  Demand under-invested. Reduce Conversion next campaign.
//     Critical (<30%):   Override enforced — minimum 50% Demand mandated next campaign.
//
// ACCESS: INTERNAL ONLY (strategy lead). Never shown to client.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDemandInvestmentPct } from "@/lib/actions";
import { Badge, Card, SectionTitle, buttonClass, inputClass, labelClass } from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type BatteryLevel = "Full" | "Healthy" | "Watch" | "Critical";

interface CampaignBrief {
  campaign_id: string;
  campaign_name: string;
  demand_investment_pct: number | null;
  budget_total: number | null;
  created_at: string;
}

interface Props {
  campaignId: string;
  clientId: string;
  currentDemandPct: number | null; // demand_investment_pct for this campaign's frame brief
  clientCampaigns: CampaignBrief[]; // all briefs for the client including this one
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeBattery(campaigns: CampaignBrief[]): { level: BatteryLevel; avg: number; count: number } | null {
  const scored = campaigns.filter((c) => c.demand_investment_pct !== null);
  if (scored.length === 0) return null;
  const recent = scored.slice(-3); // last 3 campaigns
  const avg = recent.reduce((s, c) => s + (c.demand_investment_pct ?? 0), 0) / recent.length;
  let level: BatteryLevel;
  if (avg >= 70) level = "Full";
  else if (avg >= 50) level = "Healthy";
  else if (avg >= 30) level = "Watch";
  else level = "Critical";
  return { level, avg: Math.round(avg), count: recent.length };
}

function batteryTone(level: BatteryLevel): string {
  if (level === "Full")     return "bg-emerald-500";
  if (level === "Healthy")  return "bg-blue-500";
  if (level === "Watch")    return "bg-amber-400";
  return "bg-red-500";
}

function batteryBadgeTone(level: BatteryLevel): "green" | "blue" | "amber" | "red" {
  if (level === "Full")    return "green";
  if (level === "Healthy") return "blue";
  if (level === "Watch")   return "amber";
  return "red";
}

function batteryMessage(level: BatteryLevel): string {
  if (level === "Full")     return "Demand investment is healthy. Conversion campaigns can run at full intensity.";
  if (level === "Healthy")  return "Investment is balanced. Maintain current Demand allocation.";
  if (level === "Watch")    return "Demand under-investment detected. Reduce Conversion allocation in next campaign.";
  return "Battery Warning. Minimum 50% Demand investment is mandated in next campaign regardless of stated objective.";
}

// ─── Battery gauge ────────────────────────────────────────────────────────────

function BatteryGauge({ avg, level }: { avg: number; level: BatteryLevel }) {
  const fill = Math.min(100, Math.max(0, avg));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-neutral-500">
        <span>0% Demand</span>
        <span className="font-semibold">{fill}% avg</span>
        <span>100% Demand</span>
      </div>
      <div className="h-3 w-full rounded-full bg-neutral-100 overflow-hidden relative">
        {/* Ideal zone 60–70% */}
        <div className="absolute top-0 h-full bg-emerald-50 border-l border-r border-emerald-200"
             style={{ left: "60%", width: "10%" }} />
        <div className={`h-full rounded-full transition-all ${batteryTone(level)}`}
             style={{ width: `${fill}%` }} />
      </div>
      <p className="text-[10px] text-neutral-400 text-center">
        Ideal: 60–70% Demand · Green zone shown above
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BrandHealthBatterySection({ campaignId, clientId, currentDemandPct, clientCampaigns }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pct, setPct] = useState<string>(currentDemandPct?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merge current campaign with client campaigns list (sorted by created_at)
  const allCampaigns = clientCampaigns.map((c) =>
    c.campaign_id === campaignId
      ? { ...c, demand_investment_pct: pct ? parseInt(pct, 10) : c.demand_investment_pct }
      : c
  );
  const battery = computeBattery(allCampaigns);

  function handleSave() {
    const val = parseInt(pct, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      setError("Enter a number between 0 and 100.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("demand_investment_pct", pct);
      await saveDemandInvestmentPct(campaignId, fd);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <SectionTitle id="brand-health-battery">Brand Health Battery</SectionTitle>
        <Badge tone="neutral">Expert Arch ⚿</Badge>
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        Tracks 60:40 Demand-to-Activation ratio across campaigns. Battery drains when campaigns skew
        Conversion-heavy. INTERNAL ONLY — not visible to client.
      </p>

      {/* Battery display */}
      {battery ? (
        <div className="mb-4 p-4 rounded-lg border border-neutral-200 bg-neutral-50 space-y-3">
          <div className="flex items-center gap-2">
            <Badge tone={batteryBadgeTone(battery.level)}>{battery.level}</Badge>
            <span className="text-xs text-neutral-500">based on last {battery.count} campaign{battery.count !== 1 ? "s" : ""}</span>
          </div>
          <BatteryGauge avg={battery.avg} level={battery.level} />
          <p className="text-xs text-neutral-600 border-t border-neutral-100 pt-2">
            {batteryMessage(battery.level)}
          </p>
          {battery.level === "Critical" && (
            <div className="rounded bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-xs font-semibold text-red-700">
                Override active — minimum 50% Demand investment mandated in next campaign brief.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 p-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50">
          <p className="text-xs text-neutral-400">
            No investment data yet. Enter this campaign's Demand split below to start tracking.
          </p>
        </div>
      )}

      {/* This campaign's investment split input */}
      <div className="border-t border-neutral-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-neutral-600">This Campaign — Investment Split</p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className={labelClass} htmlFor="demand_pct">
              Demand (brand-building) %
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="demand_pct"
                type="number"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => { setPct(e.target.value); setSaved(false); }}
                placeholder="e.g. 60"
                className={inputClass + " w-24"}
              />
              <span className="text-xs text-neutral-500">
                {pct ? `Activation: ${100 - parseInt(pct || "0", 10)}%` : ""}
              </span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isPending}
            className={buttonClass}
          >
            {isPending ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-[11px] text-neutral-400">
          Binet & Field research: optimal long-run ratio is 60% brand-building to 40% activation for most FMCG brands.
        </p>
      </div>

      {/* Campaign history */}
      {clientCampaigns.filter((c) => c.demand_investment_pct !== null).length > 1 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Campaign History</p>
          <div className="space-y-1.5">
            {clientCampaigns
              .filter((c) => c.demand_investment_pct !== null)
              .map((c) => {
                const d = c.demand_investment_pct!;
                const isCurrent = c.campaign_id === campaignId;
                return (
                  <div key={c.campaign_id} className="flex items-center gap-2 text-xs">
                    <div className="w-24 truncate text-neutral-600 font-medium" title={c.campaign_name}>
                      {isCurrent ? <strong>{c.campaign_name}</strong> : c.campaign_name}
                    </div>
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d >= 60 ? "bg-emerald-400" : d >= 50 ? "bg-blue-400" : d >= 30 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${d}%` }}
                      />
                    </div>
                    <span className="text-neutral-500 w-10 text-right">{d}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </Card>
  );
}
