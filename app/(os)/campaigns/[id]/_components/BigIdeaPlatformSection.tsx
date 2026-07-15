"use client";

import { useState } from "react";
import { saveBipDraft, setBipLockStatus } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import { computeGate1Status, computeBipComplete } from "@/lib/types";
import type { BigIdeaPlatform, FrameBrief } from "@/lib/types";

// ─── BipField ─────────────────────────────────────────────────────────────────

function BipField({
  fieldKey,
  label,
  placeholder,
  hint,
  value,
  locked,
  rows = 3,
}: {
  fieldKey: string;
  label: string;
  placeholder: string;
  hint: string;
  value: string;
  locked: boolean;
  rows?: number;
}) {
  return (
    <div className="border border-neutral-100 rounded-md p-4">
      <label className={`${labelClass} text-sm font-semibold text-neutral-800`}>
        {label}
      </label>
      <p className="text-xs text-neutral-400 mb-2 mt-0.5">{hint}</p>
      <textarea
        name={fieldKey}
        className={inputClass}
        rows={rows}
        defaultValue={value}
        disabled={locked}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── BipAccordionGroup ────────────────────────────────────────────────────────
// Collapsible section wrapper for a group of BIP fields.
// Shows filled-field count in header so users know progress without opening.

function BipAccordionGroup({
  id,
  label,
  subtitle,
  fieldCount,
  filledCount,
  defaultOpen = false,
  children,
}: {
  id: string;
  label: string;
  subtitle: string;
  fieldCount: number;
  filledCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const allFilled = filledCount === fieldCount;

  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-800">{label}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              allFilled
                ? "bg-emerald-100 text-emerald-700"
                : filledCount > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {filledCount}/{fieldCount}
          </span>
          <span className="text-neutral-400 text-xs ml-1">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-4 py-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Gate 1 Guard ─────────────────────────────────────────────────────────────

function Gate1Guard({ frame }: { frame: FrameBrief }) {
  const status = computeGate1Status(frame);
  if (status === "Passed") return null;

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-md p-4 text-sm">
      <p className="font-semibold text-amber-800 mb-1">Gate 1 not yet passed — BIP locked</p>
      <p className="text-amber-700 text-xs">
        Complete and lock the FRAME Brief with all required fields before accessing the Big Idea Platform.
        Required: Force / Role / Anchor / Mood / Expression, Industry/Category, Campaign Pathway,
        Primary KPI, and Gate Signal Commitment.
      </p>
      <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
        {[
          { label: "FRAME Brief locked", done: frame.lock_status === "Locked" },
          { label: "Industry / Category", done: !!frame.industry_category && frame.industry_category !== "" },
          { label: "Campaign Pathway", done: !!frame.campaign_pathway },
          { label: "Force", done: frame.force.trim().length > 0 },
          { label: "Role", done: frame.role.trim().length > 0 },
          { label: "Anchor", done: frame.anchor.trim().length > 0 },
          { label: "Primary KPI", done: frame.primary_kpi.trim().length > 0 },
          { label: "Gate Signal Commitment", done: frame.gate_signal_commitment.trim().length > 0 },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={item.done ? "text-emerald-600" : "text-neutral-400"}>
              {item.done ? "✓" : "○"}
            </span>
            <span className={item.done ? "text-neutral-700" : "text-neutral-400"}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BigIdeaPlatformSection({
  campaignId,
  frame,
  bip,
}: {
  campaignId: string;
  frame: FrameBrief;
  bip: BigIdeaPlatform;
}) {
  const gate1Passed = computeGate1Status(frame) === "Passed";
  const bipComplete = computeBipComplete(bip);
  const locked = bip.lock_status === "Locked";

  const saveAction = saveBipDraft.bind(null, campaignId, bip.id);
  const lockAction = setBipLockStatus.bind(null, campaignId, bip.id, !locked);

  // Enemy: inherit from FRAME if BIP enemy is blank
  const enemyDefault =
    bip.enemy_villain.trim().length > 0
      ? bip.enemy_villain
      : frame.enemy_active
      ? frame.enemy_villain
      : "";

  // Per-group fill counts (for progress indicators)
  const ideaFilled = [bip.topline_idea, enemyDefault].filter((f) => f.trim().length > 0).length;
  const archFilled = [bip.brand_role, bip.propagation_mechanism, bip.cultural_tension].filter(
    (f) => f.trim().length > 0
  ).length;
  const exprFilled = [bip.media_idea, bip.expression_summary].filter((f) => f.trim().length > 0).length;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-1">
        <SectionTitle id="bip">Big Idea Platform</SectionTitle>
        <div className="flex items-center gap-2">
          {gate1Passed && (
            <Badge tone={locked ? "green" : "amber"}>
              {locked ? "Locked" : "Draft"}
            </Badge>
          )}
          {!gate1Passed && <Badge tone="neutral">Gate 1 Required</Badge>}
        </div>
      </div>

      <p className="text-xs text-neutral-400 mb-4">
        7 structural components of your Big Idea — collapse each group to focus. All must be complete before Gate 2 / ICS.
        IQ Evaluate (Sprint 2-3) reads from this to assess creative quality vs Cannes/Effie standard.
      </p>

      {/* FRAME Brief context strip */}
      {gate1Passed && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-md border border-neutral-100 text-xs space-y-1">
          <p className="font-semibold text-neutral-600 mb-1">FRAME Brief context (locked)</p>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
            <div><span className="text-neutral-400">Industry:</span> <span className="text-neutral-700">{frame.industry_category}</span></div>
            <div><span className="text-neutral-400">Pathway:</span> <span className="text-neutral-700">{frame.campaign_pathway ?? "—"}</span></div>
            <div className="sm:col-span-2"><span className="text-neutral-400">Force:</span> <span className="text-neutral-700">{frame.force}</span></div>
            <div className="sm:col-span-2"><span className="text-neutral-400">Anchor:</span> <span className="text-neutral-700">{frame.anchor}</span></div>
            {frame.enemy_active && frame.enemy_villain && (
              <div className="sm:col-span-2"><span className="text-neutral-400">Enemy:</span> <span className="text-neutral-700">{frame.enemy_villain}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Gate 1 guard */}
      {!gate1Passed && <Gate1Guard frame={frame} />}

      {/* BIP Form — shown only when Gate 1 passed */}
      {gate1Passed && (
        <>
          {locked && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-4">
              BIP is locked. Unlock to edit. Unlocking allows IQ re-evaluation in Sprint 2-3.
            </p>
          )}

          <form action={saveAction} className="space-y-3">

            {/* ── Group A: THE IDEA ── */}
            <BipAccordionGroup
              id="group-idea"
              label="THE IDEA"
              subtitle="Topline Idea + Enemy/Villain"
              fieldCount={2}
              filledCount={ideaFilled}
              defaultOpen={true}
            >
              <BipField
                fieldKey="topline_idea"
                label="1. Topline Idea"
                hint="The hero statement. One sentence. If you cannot say it in one sentence, the idea is not ready."
                placeholder="e.g. 'CaraMu is the brand that gives the generation who can't cook permission to reclaim Malaysian food culture — starting with Ayam Percik.'"
                value={bip.topline_idea}
                locked={locked}
                rows={2}
              />
              <BipField
                fieldKey="enemy_villain"
                label="2. Enemy / Villain"
                hint="The structural enemy — not the competitor brand, but the systemic force that makes the human's problem exist. Inherited from FRAME Brief if Enemy was activated."
                placeholder="e.g. 'The cultural shame that tells Gen Z their food culture is only for people who grew up cooking it.'"
                value={enemyDefault}
                locked={locked}
                rows={3}
              />
            </BipAccordionGroup>

            {/* ── Group B: THE ARCHITECTURE ── */}
            <BipAccordionGroup
              id="group-arch"
              label="THE ARCHITECTURE"
              subtitle="Brand Role + Propagation Mechanism + Cultural Tension"
              fieldCount={3}
              filledCount={archFilled}
              defaultOpen={false}
            >
              <BipField
                fieldKey="brand_role"
                label="3. Brand Role"
                hint="Non-transferable. Remove this brand and the idea collapses. If a competitor could run this by changing the logo, the brand role is weak."
                placeholder="e.g. 'CaraMu is the bridge — the product that makes it structurally possible for someone with no cooking experience to make an Ayam Percik that tastes like they learned from their grandmother.'"
                value={bip.brand_role}
                locked={locked}
                rows={3}
              />
              <BipField
                fieldKey="propagation_mechanism"
                label="4. Propagation Mechanism"
                hint="How does this idea earn the audience's movement from stage to stage? What makes them save, share, or advocate without being paid to? This is the philosophical heart."
                placeholder="e.g. 'Pride in first success. The moment someone makes their first Ayam Percik using CaraMu is inherently shareable — a cultural achievement, not just a meal.'"
                value={bip.propagation_mechanism}
                locked={locked}
                rows={4}
              />
              <BipField
                fieldKey="cultural_tension"
                label="5. Cultural Tension"
                hint="The specific human friction this idea resolves. Must be a named tension, not a category observation. 'Young people don't cook' is a category truth. 'I am ashamed I can't cook Ayam Percik' is a tension."
                placeholder="e.g. 'Malaysian Gen Z want to cook traditional food but feel excluded by the implicit gatekeeping of family recipes — a cultural shame that has never been named in food advertising.'"
                value={bip.cultural_tension}
                locked={locked}
                rows={3}
              />
            </BipAccordionGroup>

            {/* ── Group C: THE EXPRESSION ── */}
            <BipAccordionGroup
              id="group-expr"
              label="THE EXPRESSION"
              subtitle="Media Idea + Expression Summary"
              fieldCount={2}
              filledCount={exprFilled}
              defaultOpen={false}
            >
              <BipField
                fieldKey="media_idea"
                label="6. Media Idea"
                hint="The format or channel that carries the idea best. Not the brief — the structural media move that makes this idea specifically work. The best ideas use media as the idea, not just the distribution."
                placeholder="e.g. 'First Attempt UGC: the campaign lives on TikTok as a cooking challenge, but the tension (not the brand) is the hook. Brand enters only when the dish succeeds.'"
                value={bip.media_idea}
                locked={locked}
                rows={3}
              />
              <BipField
                fieldKey="expression_summary"
                label="7. Expression Summary"
                hint="How the Big Idea manifests across all touchpoints. One paragraph that shows the idea is coherent across channels — not just a campaign, but a system. Each channel has a named Expression."
                placeholder="e.g. 'TikTok: first-attempt challenge. KOL: authentic first-time cooking moments. Retail/POS: your first Ayam Percik starts here. CRM: recipe confidence journey. PR: the cultural conversation about who gets to own Malaysian food.'"
                value={bip.expression_summary}
                locked={locked}
                rows={4}
              />
            </BipAccordionGroup>

            {/* Completeness check */}
            {!bipComplete && !locked && (
              <div className="text-xs text-neutral-500 border border-neutral-100 rounded-md p-3 bg-neutral-50">
                <p className="font-medium text-neutral-700 mb-1">
                  Complete all 7 components to lock the BIP and enable Gate 2 / ICS.
                </p>
                <p className="text-neutral-400">
                  Once locked, ICS will run and produce the Collective Readiness Signal. IQ Evaluate (Sprint 2-3)
                  becomes available when Elevation Mode is on.
                </p>
              </div>
            )}

            {!locked && (
              <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
                <button type="submit" className={buttonClass}>
                  Save BIP Draft
                </button>
              </div>
            )}
          </form>

          {/* Lock / Unlock */}
          <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-700">
                {locked
                  ? "BIP locked — all 7 components confirmed"
                  : bipComplete
                  ? "All 7 components complete — ready to lock"
                  : "Fill all 7 components before locking"}
              </p>
              {!locked && bipComplete && (
                <p className="text-xs text-neutral-400 mt-0.5">
                  Locking triggers Gate 2 / ICS scoring and produces the Collective Readiness Signal.
                </p>
              )}
              {frame.elevation_mode_enabled && locked && (
                <p className="text-xs text-purple-600 mt-0.5">
                  Elevation Mode is on — IQ Evaluate will be available in Sprint 2-3.
                </p>
              )}
            </div>
            <form action={lockAction}>
              <button
                type="submit"
                disabled={!locked && !bipComplete}
                className={locked ? buttonSecondaryClass : buttonClass}
              >
                {locked ? "Unlock BIP" : "Lock BIP → Run Gate 2"}
              </button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}
