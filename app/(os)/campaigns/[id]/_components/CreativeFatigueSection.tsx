"use client";
// CreativeFatigueSection.tsx
// Expert Architecture Addition — Creative Fatigue Index
//
// SPEC (PRD Addendum v2.3):
//   Detects creative wear-out from weekly AQS/engagement rate decline.
//   Trigger: 15% WoW engagement rate decline for 2+ consecutive weeks.
//   Differentiates Creative Fatigue from Competitive Suppression (R2 pattern).
//   Output: named refresh recommendation with 10-day production lead time.
//
// ACCESS: INTERNAL ONLY. Client sees nothing from this section.
// Data source: signal_media_delivery records (already loaded via mdhRecords prop).

import { useMemo } from "react";
import { Badge, Card, SectionTitle } from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MdhRecord {
  week_number: number;
  completion_rate_pct: number | null;
  aqs_score: number | null;
  aqs_prev_week_delta: number | null;
}

interface FatigueWeek {
  week: number;
  engagementRate: number | null;
  dowPct: number | null; // WoW decline %
  flagged: boolean;
}

interface FatigueAnalysis {
  status: "None" | "Watch" | "Fatigue Active";
  consecutiveDeclineWeeks: number;
  flaggedWeeks: number[];
  latestEngagementRate: number | null;
  recommendation: string;
}

interface Props {
  mdhRecords: MdhRecord[];
  // competitive context — if SOV is rising in same period, may be Competitive Suppression (R2)
  hasCompetitiveSignal?: boolean;
}

// ─── Analysis engine ──────────────────────────────────────────────────────────

function analyzeCreativeFatigue(records: MdhRecord[]): FatigueAnalysis {
  if (records.length < 2) {
    return {
      status: "None",
      consecutiveDeclineWeeks: 0,
      flaggedWeeks: [],
      latestEngagementRate: records[0]?.completion_rate_pct ?? null,
      recommendation: "Need at least 2 weeks of AQS data to compute Creative Fatigue Index.",
    };
  }

  // Sort by week ascending
  const sorted = [...records].sort((a, b) => a.week_number - b.week_number);

  const weeks: FatigueWeek[] = sorted.map((rec, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    const curr = rec.completion_rate_pct ?? rec.aqs_score;
    const prevVal = prev ? (prev.completion_rate_pct ?? prev.aqs_score) : null;

    let dowPct: number | null = null;
    let flagged = false;

    if (curr !== null && prevVal !== null && prevVal > 0) {
      dowPct = ((prevVal - curr) / prevVal) * 100;
      flagged = dowPct >= 15;
    }

    return {
      week: rec.week_number,
      engagementRate: curr,
      dowPct,
      flagged,
    };
  });

  // Count consecutive flagged weeks at end
  let consecutiveDeclineWeeks = 0;
  const flaggedWeeks: number[] = [];
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].flagged) {
      consecutiveDeclineWeeks++;
      flaggedWeeks.unshift(weeks[i].week);
    } else {
      break;
    }
  }

  const latestEngagementRate = sorted[sorted.length - 1]?.completion_rate_pct ??
    sorted[sorted.length - 1]?.aqs_score ?? null;

  let status: "None" | "Watch" | "Fatigue Active" = "None";
  let recommendation = "No creative fatigue detected. Creative is maintaining engagement.";

  if (consecutiveDeclineWeeks === 1) {
    status = "Watch";
    recommendation =
      "One week of 15%+ engagement decline detected. Monitor next week — if decline continues, " +
      "begin creative refresh briefing now to allow 10-day production lead time.";
  } else if (consecutiveDeclineWeeks >= 2) {
    status = "Fatigue Active";
    recommendation =
      `Creative fatigue confirmed across ${consecutiveDeclineWeeks} consecutive weeks. ` +
      "Immediate action: brief new creative now (10-day minimum lead time). " +
      "Do not increase spend — this accelerates waste on fatigued assets. " +
      "Check competitive SOV before assuming audience saturation.";
  }

  return { status, consecutiveDeclineWeeks, flaggedWeeks, latestEngagementRate, recommendation };
}

// ─── Status display ───────────────────────────────────────────────────────────

function statusTone(s: "None" | "Watch" | "Fatigue Active"): "green" | "amber" | "red" {
  if (s === "None")           return "green";
  if (s === "Watch")          return "amber";
  return "red";
}

function engBar(rate: number | null, prev: number | null) {
  if (rate === null) return null;
  const pct = Math.min(100, Math.max(0, rate));
  const col = rate >= 50 ? "bg-emerald-400" : rate >= 30 ? "bg-amber-400" : "bg-red-400";
  const delta = prev !== null && prev > 0 ? ((prev - rate) / prev) * 100 : null;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-neutral-500">
        <span>Completion rate</span>
        <span className="font-medium">
          {rate.toFixed(1)}%
          {delta !== null && (
            <span className={delta >= 15 ? " text-red-500" : delta > 0 ? " text-amber-500" : " text-emerald-500"}>
              {" "}({delta > 0 ? "−" : "+"}{Math.abs(delta).toFixed(1)}% WoW)
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreativeFatigueSection({ mdhRecords, hasCompetitiveSignal = false }: Props) {
  const analysis = useMemo(() => analyzeCreativeFatigue(mdhRecords), [mdhRecords]);

  const sorted = [...mdhRecords].sort((a, b) => b.week_number - a.week_number).slice(0, 6);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <SectionTitle id="creative-fatigue">Creative Fatigue Index</SectionTitle>
        <Badge tone="neutral">Expert Arch ⚿</Badge>
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        Detects creative wear-out before it drains budget. Trigger: 15% WoW engagement decline for
        2+ consecutive weeks. INTERNAL ONLY.
      </p>

      {/* Status */}
      <div className="flex items-center gap-3 mb-4">
        <Badge tone={statusTone(analysis.status)} className="text-sm">
          {analysis.status === "None" ? "No Fatigue" : analysis.status}
        </Badge>
        {analysis.consecutiveDeclineWeeks > 0 && (
          <span className="text-xs text-neutral-500">
            {analysis.consecutiveDeclineWeeks} consecutive week{analysis.consecutiveDeclineWeeks !== 1 ? "s" : ""} declining
          </span>
        )}
      </div>

      {/* Competitive suppression notice */}
      {analysis.status === "Fatigue Active" && hasCompetitiveSignal && (
        <div className="mb-3 rounded bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700">
            R2 Check — Competitive signal also active.
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Competitive SOV is rising in this period. Diagnose Competitive Suppression (R2) before
            assuming Creative Fatigue — the cause determines the correct response.
          </p>
        </div>
      )}

      {/* Recommendation */}
      <div className={`rounded border px-3 py-2.5 mb-4 ${
        analysis.status === "Fatigue Active" ? "bg-red-50 border-red-200" :
        analysis.status === "Watch"          ? "bg-amber-50 border-amber-200" :
                                               "bg-emerald-50 border-emerald-200"
      }`}>
        <p className={`text-xs ${
          analysis.status === "Fatigue Active" ? "text-red-700" :
          analysis.status === "Watch"          ? "text-amber-700" :
                                                 "text-emerald-700"
        }`}>
          {analysis.recommendation}
        </p>
      </div>

      {/* Weekly table */}
      {sorted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Weekly Engagement Trend</p>
          {sorted.map((rec, i) => {
            const next = sorted[i + 1]; // next = older week
            const curr = rec.completion_rate_pct ?? rec.aqs_score;
            const prev = next ? (next.completion_rate_pct ?? next.aqs_score) : null;
            const isFlagged = analysis.flaggedWeeks.includes(rec.week_number);
            return (
              <div key={rec.week_number} className={`p-2 rounded border text-xs ${
                isFlagged ? "border-red-200 bg-red-50/50" : "border-neutral-100"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-neutral-600">Week {rec.week_number}</span>
                  {isFlagged && <Badge tone="red">Decline ≥15%</Badge>}
                </div>
                {engBar(curr, prev)}
                {rec.aqs_score !== null && rec.completion_rate_pct === null && (
                  <p className="text-[10px] text-neutral-400 mt-1">Using AQS score as proxy (no completion rate entered)</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sorted.length === 0 && (
        <p className="text-xs text-neutral-400">
          Enter completion rate data in Signal Layer 0 (MDH) to activate this index.
        </p>
      )}
    </Card>
  );
}
