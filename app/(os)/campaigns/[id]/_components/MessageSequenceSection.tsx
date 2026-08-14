"use client";
// MessageSequenceSection.tsx
// Expert Architecture Addition — Message Architecture Sequencing Validator
//
// SPEC (PRD Addendum v2.3):
//   Validates that Stage Briefs follow the optimal message sequence:
//     Stage 1 (Demand):   Category problem/desire. Why this matters.
//     Stage 2 (Nurture):  Brand as answer. Why us.
//     Stage 3 (Conversion): Product proof. What we do and how.
//     Stage 4 (Conversion): Purchase moment. Why now.
//
//   A gap, out-of-order stage, or missing stage generates a flag.
//   This is a pre-flight checklist item alongside IQ Evaluate.
//
// ACCESS: INTERNAL ONLY. Pre-production check before budget is committed.
// Data source: stage_briefs prop (already loaded by campaign page).

import { useMemo } from "react";
import { Badge, Card, SectionTitle } from "@/app/_components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type StageType = "Demand" | "Conversion" | "Retention";

interface StageBrief {
  id: string;
  stage: StageType;
  channel: string;
  brief_body: string;
  status?: string;
}

interface SequenceCheck {
  hasDemand: boolean;
  hasNurture: boolean;  // Retention stage used as Nurture/Consideration
  hasConversion: boolean;
  stageOrder: StageType[];
  flags: string[];
  status: "Valid" | "Warning" | "Invalid";
  summary: string;
}

interface Props {
  stageBriefs: StageBrief[];
  frameLocked: boolean;
}

// ─── Sequence validator ───────────────────────────────────────────────────────

function validateSequence(briefs: StageBrief[]): SequenceCheck {
  const liveBriefs = briefs.filter((b) => b.brief_body && b.brief_body.trim().length > 0);

  const stages = liveBriefs.map((b) => b.stage);
  const uniqueStages = Array.from(new Set(stages));

  const hasDemand     = uniqueStages.includes("Demand");
  const hasNurture    = uniqueStages.includes("Retention"); // Retention = Nurture/Consideration
  const hasConversion = uniqueStages.includes("Conversion");

  const flags: string[] = [];
  let status: "Valid" | "Warning" | "Invalid" = "Valid";
  let summary = "";

  // Check for missing stages
  if (!hasDemand && hasConversion) {
    flags.push("No Demand stage brief found. Conversion messaging without Demand investment is the #1 cause of pipeline depletion.");
    status = "Warning";
  }

  if (!hasDemand && !hasNurture && !hasConversion) {
    summary = "No Stage Briefs created yet. Sequencing will validate when briefs are added.";
    return { hasDemand, hasNurture, hasConversion, stageOrder: [], flags: [], status: "Valid", summary };
  }

  // Conversion-only campaign
  if (!hasDemand && hasConversion && !hasNurture) {
    flags.push(
      "Conversion-only campaign detected. Check Brand Health Battery — this drains Demand without recharging it."
    );
    status = "Warning";
  }

  // Demand-only: fine for brand campaigns
  if (hasDemand && !hasConversion) {
    // pure brand campaign — valid
  }

  // Check for correct progression (Demand → Nurture → Conversion)
  if (hasDemand && hasConversion && !hasNurture) {
    flags.push(
      "No Nurture/Consideration stage found between Demand and Conversion. " +
      "Audience moves from awareness directly to purchase — consider adding a proof/differentiation message."
    );
    status = status === "Invalid" ? "Invalid" : "Warning";
  }

  // Build summary
  const stageOrder: StageType[] = [];
  if (hasDemand)     stageOrder.push("Demand");
  if (hasNurture)    stageOrder.push("Retention");
  if (hasConversion) stageOrder.push("Conversion");

  if (flags.length === 0) {
    summary = hasDemand && hasNurture && hasConversion
      ? "Sequence valid — Demand → Consideration → Conversion structure confirmed."
      : hasDemand && hasConversion
      ? "Demand → Conversion detected. Valid for direct-response campaigns."
      : hasDemand
      ? "Demand-only campaign. Valid for pure brand awareness objective."
      : "Conversion-only detected. Review Brand Health Battery before proceeding.";
  } else {
    summary = flags[0];
  }

  if (flags.length > 0 && !hasDemand && hasConversion) status = "Warning";

  return { hasDemand, hasNurture, hasConversion, stageOrder, flags, status, summary };
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ stage, count, label, description, present }: {
  stage: string;
  count: number;
  label: string;
  description: string;
  present: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      present ? "border-emerald-200 bg-emerald-50/40" : "border-dashed border-neutral-200 bg-neutral-50/50 opacity-60"
    }`}>
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        present ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-400"
      }`}>
        {stage}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-neutral-700">{label}</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">{description}</p>
        {present && (
          <p className="text-[10px] text-emerald-600 mt-1 font-medium">
            {count} brief{count !== 1 ? "s" : ""} created
          </p>
        )}
        {!present && (
          <p className="text-[10px] text-neutral-400 mt-1">No brief created</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MessageSequenceSection({ stageBriefs, frameLocked }: Props) {
  const check = useMemo(() => validateSequence(stageBriefs), [stageBriefs]);

  const demandCount     = stageBriefs.filter((b) => b.stage === "Demand").length;
  const nurturingCount  = stageBriefs.filter((b) => b.stage === "Retention").length;
  const conversionCount = stageBriefs.filter((b) => b.stage === "Conversion").length;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <SectionTitle id="message-sequence">Message Sequence Validator</SectionTitle>
        <Badge tone="neutral">Expert Arch ⚿</Badge>
      </div>
      <p className="text-xs text-neutral-400 mb-4">
        Validates Stage Brief sequence before production budget is committed. Leading with product
        proof before establishing the problem is a pre-flight checklist item.
      </p>

      {/* Status + summary */}
      <div className={`rounded border px-3 py-2.5 mb-4 flex items-start gap-2 ${
        check.status === "Valid"   ? "bg-emerald-50 border-emerald-200" :
        check.status === "Warning" ? "bg-amber-50 border-amber-200" :
                                     "bg-red-50 border-red-200"
      }`}>
        <Badge tone={check.status === "Valid" ? "green" : check.status === "Warning" ? "amber" : "red"}>
          {check.status}
        </Badge>
        <p className={`text-xs ${
          check.status === "Valid"   ? "text-emerald-700" :
          check.status === "Warning" ? "text-amber-700" :
                                       "text-red-700"
        }`}>
          {check.summary}
        </p>
      </div>

      {/* Additional flags */}
      {check.flags.length > 1 && (
        <div className="mb-4 space-y-1.5">
          {check.flags.slice(1).map((flag, i) => (
            <div key={i} className="rounded bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-xs text-amber-700">{flag}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sequence map */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Optimal Sequence</p>

        <StageCard
          stage="1"
          count={demandCount}
          label="Demand — Category Problem / Desire"
          description="Why this matters to the audience's life. Brand presence, not product pitch."
          present={check.hasDemand}
        />

        {/* Arrow */}
        <div className="flex justify-center text-neutral-300 text-lg leading-none">↓</div>

        <StageCard
          stage="2"
          count={nurturingCount}
          label="Consideration — Brand as Answer"
          description="Why us specifically. Evidence, credibility, differentiation."
          present={check.hasNurture}
        />

        <div className="flex justify-center text-neutral-300 text-lg leading-none">↓</div>

        <StageCard
          stage="3"
          count={conversionCount}
          label="Conversion — Purchase Moment"
          description="Why now. Product proof + offer + frictionless CTA."
          present={check.hasConversion}
        />
      </div>

      {/* Pre-flight note */}
      {frameLocked && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-[11px] text-neutral-400">
            FRAME is locked. Sequencing is validated against current Stage Brief set. Add or update
            Stage Briefs to re-run validation.
          </p>
        </div>
      )}

      {!frameLocked && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-[11px] text-amber-600">
            FRAME is not yet locked. Lock FRAME Brief before treating this validation as final.
          </p>
        </div>
      )}
    </Card>
  );
}
