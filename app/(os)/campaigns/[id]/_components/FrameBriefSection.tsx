"use client";

import { useState } from "react";
import { updateFrameBrief, setFrameLockStatus } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import { computeGate1Status } from "@/lib/types";
import type { FrameBrief, IndustryCategory, CampaignPathway } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS: IndustryCategory[] = [
  "QSR",
  "FMCG",
  "Retail",
  "B2B",
  "Financial Services",
  "Telco",
  "Other",
];

const PATHWAY_OPTIONS: { value: CampaignPathway; label: string; hint: string }[] = [
  { value: "Growth", label: "Growth", hint: "Win new audiences. Demand-first. Build category entry." },
  { value: "Challenger", label: "Challenger", hint: "Disrupt the market leader. Enemy is the status quo." },
  { value: "Loyalty", label: "Loyalty", hint: "Deepen the relationship. Retention and advocacy focus." },
  { value: "Premium", label: "Premium", hint: "Elevate perceived value. Justify price premium." },
];

// ── Feature 15 — Cultural Intelligence & Regulatory Layer ──

type CulturalContext =
  | "None"
  | "Malay"
  | "Chinese"
  | "Indian"
  | "Pan-Malaysian"
  | "Pan-SEA"
  | "Multi-ethnic";

type RegulatoryCategory =
  | "None"
  | "MCMC (Broadcast)"
  | "ASA Malaysia (Advertising)"
  | "KKM (Health & Food)"
  | "BNM (Financial)"
  | "MBAM (Outdoor)"
  | "Multiple";

const CULTURAL_CONTEXT_OPTIONS: { value: CulturalContext; hint: string }[] = [
  { value: "None",          hint: "No specific cultural lens applied" },
  { value: "Malay",         hint: "Malay Muslim audience; Bahasa, halal, Adat values" },
  { value: "Chinese",       hint: "Chinese-Malaysian audience; Mandarin/dialect, heritage, prosperity values" },
  { value: "Indian",        hint: "Indian-Malaysian audience; Tamil/Malayalam, festival, family values" },
  { value: "Pan-Malaysian", hint: "All three major ethnic groups; English/BM bridge creative required" },
  { value: "Pan-SEA",       hint: "Multi-market SEA context; ASEAN-wide cultural references" },
  { value: "Multi-ethnic",  hint: "Deliberate inter-ethnic narrative (e.g. Malaysia Hari ini)" },
];

const REGULATORY_CATEGORY_OPTIONS: { value: RegulatoryCategory; hint: string }[] = [
  { value: "None",                       hint: "No specific regulatory framework applies" },
  { value: "MCMC (Broadcast)",           hint: "Communications & Multimedia Commission — broadcast, digital ads, OTT" },
  { value: "ASA Malaysia (Advertising)", hint: "Advertising Standards Authority — all advertising; truth, decency, fairness" },
  { value: "KKM (Health & Food)",        hint: "Ministry of Health — health products, food claims, pharmaceutical marketing" },
  { value: "BNM (Financial)",            hint: "Bank Negara Malaysia — financial products, investment, insurance claims" },
  { value: "MBAM (Outdoor)",             hint: "Malaysian Outdoor Advertising Association — OOH placements, billboards" },
  { value: "Multiple",                   hint: "Campaign crosses multiple regulatory frameworks — see Knowledge Base" },
];

const ICS_DIMENSIONS = [
  { key: "ics_cultural_fit",          label: "Cultural Fit",          weight: 20, hint: "Does the idea tap a real cultural tension?" },
  { key: "ics_business_alignment",    label: "Business Alignment",    weight: 20, hint: "Does it serve the correct funnel stage?" },
  { key: "ics_audience_tension",      label: "Audience Tension",      weight: 20, hint: "Is the human truth specific — not generic?" },
  { key: "ics_executional_coherence", label: "Executional Coherence", weight: 15, hint: "Can every department execute from the same idea?" },
  { key: "ics_measurability",         label: "Measurability",         weight: 15, hint: "Is there a pre-agreed Gate Signal that proves it worked?" },
  { key: "ics_scalability",           label: "Scalability",           weight: 10, hint: "Can it extend across platforms, channels, and time?" },
] as const;

// ─── Gate 1 Status Badge ──────────────────────────────────────────────────────

function Gate1Badge({ frame }: { frame: FrameBrief }) {
  const status = computeGate1Status(frame);
  if (status === "Passed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        ✓ Gate 1 Passed — BIP Unlocked
      </span>
    );
  }
  if (frame.lock_status === "Locked") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        ⚠ FRAME Locked — fill all required fields to pass Gate 1
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
      Gate 1 Incomplete — lock FRAME Brief after filling all fields
    </span>
  );
}

// ─── ICS Score Slider ─────────────────────────────────────────────────────────

function IcsSlider({
  dimKey,
  label,
  weight,
  hint,
  value,
  locked,
}: {
  dimKey: string;
  label: string;
  weight: number;
  hint: string;
  value: number;
  locked: boolean;
}) {
  const [score, setScore] = useState(value);
  const pct = score * 20;
  const color =
    pct >= 85 ? "text-emerald-700" : pct >= 70 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-700">
          {label} <span className="text-neutral-400">({weight}%)</span>
        </label>
        <span className={`text-xs font-mono font-semibold ${color}`}>{pct}</span>
      </div>
      <p className="text-xs text-neutral-400">{hint}</p>
      <input
        type="range"
        name={dimKey}
        min={1}
        max={5}
        step={1}
        value={score}
        disabled={locked}
        onChange={(e) => setScore(Number(e.target.value))}
        className="w-full accent-neutral-800 disabled:opacity-40"
      />
      <div className="flex justify-between text-xs text-neutral-300">
        <span>1 — Weak</span>
        <span>5 — World-class</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FrameBriefSection({
  campaignId,
  frame,
}: {
  campaignId: string;
  frame: FrameBrief;
}) {
  const [enemyOpen, setEnemyOpen] = useState(frame.enemy_active);
  const [elevationOn, setElevationOn] = useState(frame.elevation_mode_enabled);

  const locked = frame.lock_status === "Locked";
  const updateAction = updateFrameBrief.bind(null, campaignId, frame.id);
  const lockAction = setFrameLockStatus.bind(null, campaignId, frame.id, !locked);

  const icsTotal = frame.ics_weighted_total;
  const icsTone =
    frame.ics_threshold === "Advance"
      ? "green"
      : frame.ics_threshold === "Conditional"
      ? "amber"
      : "red";

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-1">
        <SectionTitle id="frame">FRAME Brief</SectionTitle>
        <div className="flex items-center gap-2">
          <Badge tone={icsTone}>
            ICS {icsTotal} — {frame.ics_threshold}
          </Badge>
          <Badge tone={locked ? "green" : "neutral"}>
            {locked ? "Locked" : "Draft"}
          </Badge>
        </div>
      </div>

      <div className="mb-3">
        <Gate1Badge frame={frame} />
      </div>

      {locked && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-4">
          FRAME Brief is locked. Unlock to edit. Unlocking resets Gate 1 and blocks BIP editing.
        </p>
      )}

      <form action={updateAction} className="space-y-6">

        {/* ── Section 1: Industry + Pathway ── */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Campaign Setup
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Industry / Category <span className="text-red-500">*</span>
              </label>
              <select
                name="industry_category"
                className={inputClass}
                defaultValue={frame.industry_category}
                disabled={locked}
                required
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1">
                Cascades to Gate Signal Library, holding periods, ICS weighting, and Benchmark Library.
                Cannot be changed after Gate 1 passes.
              </p>
            </div>
            <div>
              <label className={labelClass}>
                Campaign Pathway <span className="text-red-500">*</span>
              </label>
              <select
                name="campaign_pathway"
                className={inputClass}
                defaultValue={frame.campaign_pathway ?? ""}
                disabled={locked}
                required
              >
                <option value="">— Select pathway —</option>
                {PATHWAY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label} — {p.hint}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1">
                Drives ICS Business Ambition weighting and Channel Strategy defaults.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 1B: Cultural Intelligence & Regulatory Layer (Feature 15) ── */}
        <div className="border border-blue-100 rounded-md p-4 bg-blue-50/40">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
              Cultural Intelligence & Regulatory Layer
            </p>
            <span className="text-xs text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">
              Internal — not shown to client
            </span>
          </div>
          <p className="text-xs text-blue-700 mb-3">
            Sets the cultural and regulatory context that the AI uses when evaluating
            idea fitness, generating extensions, and flagging compliance risks.
            Drives the Knowledge Base filter and the IQ Cultural Permission dimension.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Primary Cultural Context</label>
              <select
                name="primary_cultural_context"
                className={inputClass}
                defaultValue={frame.primary_cultural_context || "None"}
                disabled={locked}
              >
                {CULTURAL_CONTEXT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value} — {opt.hint}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1">
                Primary ethnic-market lens. Affects FRAME cultural tension framing and IQ Cultural Permission scoring.
              </p>
            </div>
            <div>
              <label className={labelClass}>Regulatory Category</label>
              <select
                name="regulatory_category"
                className={inputClass}
                defaultValue={frame.regulatory_category || "None"}
                disabled={locked}
              >
                {REGULATORY_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1">
                Select "Multiple" if cross-framework — add details to the Knowledge Base. Surfaces compliance flags in IQ Evaluate.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 2: FRAME 5 Fields ── */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            FRAME — 5 Questions (one sentence each)
          </p>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                F — Force <span className="text-red-500">*</span>
              </label>
              <textarea
                name="force"
                className={inputClass}
                rows={2}
                defaultValue={frame.force}
                disabled={locked}
                placeholder="What cultural tension is this idea exploiting? (The 'why now')"
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                R — Role <span className="text-red-500">*</span>
              </label>
              <textarea
                name="role"
                className={inputClass}
                rows={2}
                defaultValue={frame.role}
                disabled={locked}
                placeholder="What job is the brand hired to do in this tension? (Brand positioning)"
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                A — Anchor <span className="text-red-500">*</span>
              </label>
              <textarea
                name="anchor"
                className={inputClass}
                rows={2}
                defaultValue={frame.anchor}
                disabled={locked}
                placeholder="What is the one-sentence truth this idea stands on? (The single idea)"
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                M — Mood <span className="text-red-500">*</span>
              </label>
              <input
                name="mood"
                className={inputClass}
                defaultValue={frame.mood}
                disabled={locked}
                placeholder="What emotional tone does this campaign need to hold? (Tone direction)"
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                E — Expression <span className="text-red-500">*</span>
              </label>
              <textarea
                name="expression"
                className={inputClass}
                rows={2}
                defaultValue={frame.expression}
                disabled={locked}
                placeholder="What channel, format, and execution style will carry it? (Production brief)"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Clarity Statement</label>
              <textarea
                name="clarity_statement"
                className={inputClass}
                rows={2}
                defaultValue={frame.clarity_statement}
                disabled={locked}
                placeholder="Plain-language summary of the above for client alignment."
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Measurement Commitment ── */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Measurement Commitment
          </p>
          <p className="text-xs text-neutral-400 mb-3">
            Pre-agreed before any spend moves. Drives Measurability (ICS ×15%) and Gate Signal governance.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Primary KPI <span className="text-red-500">*</span>
              </label>
              <input
                name="primary_kpi"
                className={inputClass}
                defaultValue={frame.primary_kpi}
                disabled={locked}
                placeholder="e.g. TikTok Save Rate ≥8%"
                required
              />
            </div>
            <div>
              <label className={labelClass}>KPI Baseline (current %/value)</label>
              <input
                name="primary_kpi_baseline"
                type="number"
                step="0.01"
                className={inputClass}
                defaultValue={frame.primary_kpi_baseline ?? ""}
                disabled={locked}
                placeholder="e.g. 3.2"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>
              Gate Signal Commitment <span className="text-red-500">*</span>
            </label>
            <textarea
              name="gate_signal_commitment"
              className={inputClass}
              rows={3}
              defaultValue={frame.gate_signal_commitment}
              disabled={locked}
              placeholder="Describe the specific consumer behaviour threshold that must fire and hold before budget moves. e.g. 'Save Rate ≥8% held 3 consecutive days + Branded search lift +40% held 1 week'"
              required
            />
          </div>
        </div>

        {/* ── Section 4: Enemy / Villain (Elevation) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Enemy / Villain Field
            </p>
            <button
              type="button"
              onClick={() => setEnemyOpen((v) => !v)}
              disabled={locked}
              className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-40"
            >
              {enemyOpen ? "Hide" : "Activate ▼"}
            </button>
          </div>
          <input type="hidden" name="enemy_active" value={String(enemyOpen)} />
          {enemyOpen && (
            <div>
              <textarea
                name="enemy_villain"
                className={inputClass}
                rows={3}
                defaultValue={frame.enemy_villain}
                disabled={locked}
                placeholder="Who or what is the structural barrier between the human and what they want? This is not the competitor brand — it is the systemic force the status quo protects. If you swap this enemy for any other brand's brief and it still works, the enemy is not specific enough."
              />
              <p className="text-xs text-neutral-400 mt-1">
                Activating this field auto-populates the Enemy component of your BIP session.
              </p>
            </div>
          )}
          {!enemyOpen && (
            <p className="text-xs text-neutral-400">
              Optional. Naming a structural enemy sharpens Cultural Permission and Human Truth dimensions in IQ Evaluation.
            </p>
          )}
        </div>

        {/* ── Section 5: Elevation Mode Toggle ── */}
        <div className="border border-purple-100 rounded-md p-3 bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-800">Elevation Mode</p>
              <p className="text-xs text-purple-600 mt-0.5">
                Enables IQ Evaluate API after BIP is locked (Sprint 2-3). Adds 8-dimension creative quality read vs Cannes/Effie standard.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="elevation_mode_enabled"
                value="true"
                defaultChecked={elevationOn}
                disabled={locked}
                onChange={(e) => setElevationOn(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-40" />
            </label>
          </div>
          {/* Ensure false value is submitted when unchecked */}
          {!elevationOn && <input type="hidden" name="elevation_mode_enabled" value="false" />}
        </div>

        {/* ── Section 6: ICS Dimension Scoring ── */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            ICS — Idea Certainty Score
          </p>
          <p className="text-xs text-neutral-400 mb-4">
            Rate 1 (Weak) → 5 (World-class). Internal only — never shown to client.
            Scores against the FRAME Brief criteria you defined above.
          </p>
          <div className="space-y-4">
            {ICS_DIMENSIONS.map((d) => (
              <IcsSlider
                key={d.key}
                dimKey={d.key}
                label={d.label}
                weight={d.weight}
                hint={d.hint}
                value={frame[d.key as keyof FrameBrief] as number}
                locked={locked}
              />
            ))}
          </div>
          <div className={`mt-4 p-3 rounded-md border ${
            frame.ics_threshold === "Advance"
              ? "bg-emerald-50 border-emerald-200"
              : frame.ics_threshold === "Conditional"
              ? "bg-amber-50 border-amber-200"
              : "bg-red-50 border-red-200"
          }`}>
            <p className={`text-sm font-semibold ${
              frame.ics_threshold === "Advance"
                ? "text-emerald-800"
                : frame.ics_threshold === "Conditional"
                ? "text-amber-800"
                : "text-red-800"
            }`}>
              ICS {icsTotal} — {frame.ics_threshold}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Collective Readiness Signal (client-facing):{" "}
              <span className="font-medium">
                {frame.ics_threshold === "Conditional" ? "Fix" : frame.ics_threshold}
              </span>
            </p>
          </div>
        </div>

        {/* ── Save button ── */}
        {!locked && (
          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
            <button type="submit" className={buttonClass}>
              Save FRAME Brief
            </button>
          </div>
        )}
      </form>

      {/* ── Lock / Unlock ── */}
      <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-700">
            {locked ? "Locked — unlock to edit" : "Lock to pass Gate 1 and enable BIP"}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {locked
              ? "Unlocking resets Gate 1 and blocks BIP editing until re-locked."
              : "Locking confirms the brief is final. All required fields and Campaign Pathway must be set."}
          </p>
        </div>
        <form action={lockAction}>
          <button
            type="submit"
            className={locked ? buttonSecondaryClass : buttonClass}
          >
            {locked ? "Unlock FRAME" : "Lock FRAME Brief → Pass Gate 1"}
          </button>
        </form>
      </div>
    </Card>
  );
}
