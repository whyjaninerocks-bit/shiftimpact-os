"use client";

// app/brief/[id]/_components/BriefIntakeForm.tsx
// Client-facing brief intake form.
// BOUNDARY: Input fields only — no ICS scores, state codes, or internal analytics shown.
//
// Tabs:
//   1. Channels       — which channels are active for this campaign
//   2. Campaign KPIs  — targets, budget, secondary KPIs
//   3. Brand Assets   — guidelines URL, CI notes, RFP scope
//   4. FRAME Brief    — strategic foundation (client-fillable fields)
//   5. Big Idea       — topline idea, brand role, propagation
//   6. Discipline Briefs — AI-generated per-channel briefs (read-only when available)

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { FrameBrief, BigIdeaPlatform, StageBrief } from "@/lib/types";

// ─── Extracted data types ─────────────────────────────────────────────────────

type FrameExtracted = Partial<{
  force: string; role: string; anchor: string; mood: string;
  expression: string; clarity_statement: string; enemy_villain: string;
  primary_kpi: string;
}>;

type BipExtracted = Partial<{
  topline_idea: string; enemy_villain: string; brand_role: string;
  propagation_mechanism: string; cultural_tension: string;
  media_idea: string; expression_summary: string;
}>;

// ─── Shared field styles ──────────────────────────────────────────────────────

const labelCls = "block text-sm font-semibold text-neutral-800 mb-1";
const hintCls  = "text-xs text-neutral-400 mb-2";
const inputCls = "w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white";

// ─── Default channels (must match DEFAULT_CHANNELS in lib/actions.ts) ─────────

const DEFAULT_CHANNELS = [
  {
    name: "Digital / Social",
    hint: "TikTok, Instagram, Facebook, X — platform-native content that earns saves, shares, and follows.",
  },
  {
    name: "KOL / Influencer",
    hint: "Creator partnerships where audience trust is the currency. Authentic, not scripted.",
  },
  {
    name: "PR / Earned Media",
    hint: "Press, editorial, and earned coverage. The story angle matters more than brand language.",
  },
  {
    name: "Radio",
    hint: "ERA FM and audio broadcast. Audio-only — hook in 3 seconds, no visuals to rely on.",
  },
  {
    name: "Retail / In-Store",
    hint: "Physical shelf and proximity-to-purchase. Last-mile conversion trigger.",
  },
];

// ─── Field components ─────────────────────────────────────────────────────────

function FieldRow({
  label, hint, name, value, onChange, rows = 3, placeholder = "",
}: {
  label: string; hint: string; name: string; value: string;
  onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {hint && <p className={hintCls}>{hint}</p>}
      <textarea
        name={name} value={value} onChange={(e) => onChange(e.target.value)}
        rows={rows} placeholder={placeholder} className={inputCls}
      />
    </div>
  );
}

function SelectRow({
  label, hint, name, value, onChange, options,
}: {
  label: string; hint: string; name: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {hint && <p className={hintCls}>{hint}</p>}
      <select name={name} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Save button + status ─────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveBar({ state, onSave, error }: { state: SaveState; onSave: () => void; error: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button" onClick={onSave} disabled={state === "saving"}
        className="px-5 py-2 rounded-md text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
      >
        {state === "saving" ? "Saving…" : "Save"}
      </button>
      {state === "saved" && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
      {state === "error" && <span className="text-sm text-red-600">{error || "Save failed — try again."}</span>}
    </div>
  );
}

// ─── Notify button (mailto) ───────────────────────────────────────────────────

function NotifyButton({
  campaignId,
  campaignName,
  clientName,
}: {
  campaignId: string;
  campaignName: string;
  clientName: string;
}) {
  const handleNotify = useCallback(() => {
    const briefUrl = `${window.location.origin}/brief/${campaignId}`;
    const subject = encodeURIComponent(`Brief update: ${campaignName}`);
    const body = encodeURIComponent(
      `Hi,\n\nThe campaign brief for "${campaignName}"` +
      (clientName ? ` (${clientName})` : "") +
      ` has been updated and is ready for your review.\n\nView and complete the brief here:\n${briefUrl}\n\nPlease review all sections — Channels, Campaign KPIs, Brand Assets, FRAME Brief, and Big Idea — and let us know if any information needs clarification.\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [campaignId, campaignName, clientName]);

  return (
    <button
      type="button"
      onClick={handleNotify}
      className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      Email brief link to your team
    </button>
  );
}

// ─── KB Upload zone ───────────────────────────────────────────────────────────

function KbUploadZone({ onExtracted }: {
  onExtracted: (frame: FrameExtracted, bip: BipExtracted) => void;
}) {
  const [status, setStatus] = useState<"idle" | "extracting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus("extracting");
    setMessage("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/brief-extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) {
        setStatus("error");
        setMessage(json.error || "Extraction failed — fill in manually.");
        return;
      }
      onExtracted(json.frame ?? {}, json.bip ?? {});
      setStatus("done");
      const frameCount = Object.values(json.frame ?? {}).filter(Boolean).length;
      const bipCount   = Object.values(json.bip ?? {}).filter(Boolean).length;
      setMessage(`${frameCount + bipCount} fields pre-filled from your document. Review each one and complete any gaps.`);
    } catch {
      setStatus("error");
      setMessage("Network error — fill in manually.");
    }
  }, [onExtracted]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="text-2xl shrink-0 mt-0.5">📄</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-800 mb-0.5">
            Upload your brand document to pre-fill this brief
          </p>
          <p className="text-xs text-neutral-400 mb-3">
            PDF or TXT — strategy decks, brand guidelines, previous briefs. Claude will extract and fill in every field it can find.
          </p>
          {status === "idle" && (
            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="cursor-pointer" onClick={() => inputRef.current?.click()}>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors">
                Choose file or drag here
              </span>
              <input ref={inputRef} type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" onChange={handleChange} className="hidden" />
            </div>
          )}
          {status === "extracting" && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <svg className="animate-spin h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Reading {fileName}…
            </div>
          )}
          {status === "done" && (
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
              <p className="text-sm text-emerald-700">{message}</p>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-bold mt-0.5">✕</span>
              <div>
                <p className="text-sm text-red-600">{message}</p>
                <button onClick={() => { setStatus("idle"); setFileName(""); }} className="text-xs text-neutral-500 underline mt-1">
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Channels section ─────────────────────────────────────────────────────────

function ChannelsSection({
  campaignId,
  frame,
  onChannelsSaved,
}: {
  campaignId: string;
  frame: FrameBrief | null;
  onChannelsSaved?: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(frame?.active_channels ?? []);
  const [saveState, setSaveState]   = useState<SaveState>("idle");
  const [saveError, setSaveError]   = useState("");
  const [genState, setGenState]     = useState<"idle" | "generating" | "done">("idle");

  const toggle = (channel: string) => {
    setSelected((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
    setSaveState("idle");
  };

  const handleSave = useCallback(async () => {
    if (!frame) return;
    setSaveState("saving"); setSaveError("");
    try {
      const res = await fetch("/api/brief-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "frame",
          campaign_id: campaignId,
          record_id: frame.id,
          fields: { active_channels: selected },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setSaveError(json.error ?? "Save failed"); setSaveState("error"); }
      else {
        setSaveState("saved");
        // Auto-generate discipline briefs after channels are saved
        setGenState("generating");
        try {
          await fetch("/api/channel-briefs/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaign_id: campaignId }),
          });
        } catch { /* silent — briefs will generate next time */ }
        setGenState("done");
        await onChannelsSaved?.();
      }
    } catch { setSaveError("Network error — try again."); setSaveState("error"); }
  }, [campaignId, frame, selected, onChannelsSaved]);

  if (!frame) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Campaign brief not yet set up. Contact your ShiftImpact lead.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900">Campaign Channels</h2>
        <p className="text-sm text-neutral-500">
          Select every channel this campaign will activate on. Your ShiftImpact team will generate
          a tailored discipline brief for each selected channel once your brief is approved.
        </p>
      </div>

      <div className="space-y-3">
        {DEFAULT_CHANNELS.map((ch) => {
          const isChecked = selected.includes(ch.name);
          return (
            <label
              key={ch.name}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                isChecked
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(ch.name)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <div>
                <p className="text-sm font-semibold text-neutral-800">{ch.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{ch.hint}</p>
              </div>
            </label>
          );
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Select at least one channel before saving.
        </p>
      )}

      <SaveBar state={saveState} onSave={handleSave} error={saveError} />
      {genState === "generating" && (
        <p className="text-xs text-neutral-400 animate-pulse">Generating discipline briefs for your selected channels…</p>
      )}
      {genState === "done" && (
        <p className="text-xs text-emerald-600">Discipline briefs ready — check the Agency tab below.</p>
      )}
    </div>
  );
}

// ─── Campaign KPI + Budget section ───────────────────────────────────────────

function CampaignKpiSection({
  campaignId,
  businessOutcomeLabel,
  businessOutcomeTarget,
  retentionLabel,
  retentionTarget,
  frame,
}: {
  campaignId: string;
  businessOutcomeLabel: string;
  businessOutcomeTarget: number | null;
  retentionLabel: string;
  retentionTarget: number | null;
  frame: FrameBrief | null;
}) {
  const [boTarget,      setBoTarget]      = useState<string>(businessOutcomeTarget != null ? String(businessOutcomeTarget) : "");
  const [rmTarget,      setRmTarget]      = useState<string>(retentionTarget != null ? String(retentionTarget) : "");
  const [budgetTotal,   setBudgetTotal]   = useState<string>(frame?.budget_total != null ? String(frame.budget_total) : "");
  const [budgetNotes,   setBudgetNotes]   = useState<string>(frame?.budget_notes ?? "");
  const [secondaryKpis, setSecondaryKpis] = useState<string>(frame?.secondary_kpis ?? "");
  const [saveState,     setSaveState]     = useState<SaveState>("idle");
  const [saveError,     setSaveError]     = useState("");

  const handleSave = useCallback(async () => {
    setSaveState("saving"); setSaveError("");
    try {
      const campRes = await fetch("/api/brief-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "campaign_kpi",
          campaign_id: campaignId,
          record_id: campaignId,
          fields: {
            business_outcome_target: boTarget ? Number(boTarget) : null,
            retention_metric_target: rmTarget ? Number(rmTarget) : null,
          },
        }),
      });
      if (!campRes.ok) {
        const e = await campRes.json().catch(() => ({}));
        setSaveError(e.error ?? "Save failed"); setSaveState("error"); return;
      }
      if (frame) {
        const frameRes = await fetch("/api/brief-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "frame",
            campaign_id: campaignId,
            record_id: frame.id,
            fields: {
              budget_total:   budgetTotal ? Number(budgetTotal) : null,
              budget_notes:   budgetNotes,
              secondary_kpis: secondaryKpis,
            },
          }),
        });
        if (!frameRes.ok) {
          const e = await frameRes.json().catch(() => ({}));
          setSaveError(e.error ?? "Save failed"); setSaveState("error"); return;
        }
      }
      setSaveState("saved");
    } catch { setSaveError("Network error — try again."); setSaveState("error"); }
  }, [campaignId, frame, boTarget, rmTarget, budgetTotal, budgetNotes, secondaryKpis]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900">Campaign KPIs</h2>
        <p className="text-sm text-neutral-500">
          Set your success targets. These anchor every strategic decision ShiftImpact makes.
        </p>
      </div>
      <div className="grid gap-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelCls}>{businessOutcomeLabel} — Target</label>
            <p className={hintCls}>The primary business outcome number you&apos;re aiming for this campaign.</p>
            <input type="number" value={boTarget}
              onChange={e => { setBoTarget(e.target.value); setSaveState("idle"); }}
              placeholder="e.g. 12 (for 12% lift)" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>{retentionLabel} — Target</label>
            <p className={hintCls}>Your retention or repeat-purchase target for this period.</p>
            <input type="number" value={rmTarget}
              onChange={e => { setRmTarget(e.target.value); setSaveState("idle"); }}
              placeholder="e.g. 25 (for 25% repeat rate)" className={inputCls} />
          </div>
        </div>
        <FieldRow label="Secondary KPIs"
          hint="Any additional metrics you're tracking — share of voice targets, reach, downloads, app installs, NPS improvement, etc."
          name="secondary_kpis" value={secondaryKpis}
          onChange={v => { setSecondaryKpis(v); setSaveState("idle"); }} rows={3}
          placeholder="e.g. TikTok Save Rate above 3.5% / Branded search lift of 8% / 50K Loyalty app activations"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelCls}>Total Campaign Budget (RM)</label>
            <p className={hintCls}>Optional — helps ShiftImpact right-size the idea.</p>
            <input type="number" value={budgetTotal}
              onChange={e => { setBudgetTotal(e.target.value); setSaveState("idle"); }}
              placeholder="e.g. 500000" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Budget Notes / Media Split</label>
            <p className={hintCls}>Paid vs organic split, channel budget guidance, or any budget constraints.</p>
            <textarea rows={2} value={budgetNotes}
              onChange={e => { setBudgetNotes(e.target.value); setSaveState("idle"); }}
              placeholder="e.g. 60% digital, 40% OOH + radio. Hard cap on influencer fees at RM80K."
              className={inputCls} />
          </div>
        </div>
      </div>
      <SaveBar state={saveState} onSave={handleSave} error={saveError} />
    </div>
  );
}

// ─── Brand Assets / CI / RFP section ─────────────────────────────────────────

function BrandAssetsSection({
  campaignId, clientName, frame,
}: {
  campaignId: string; clientName: string; frame: FrameBrief | null;
}) {
  const [guidelinesUrl,   setGuidelinesUrl]   = useState<string>(frame?.brand_guidelines_url ?? "");
  const [guidelinesNotes, setGuidelinesNotes] = useState<string>(frame?.brand_guidelines_notes ?? "");
  const [rfpNotes,        setRfpNotes]        = useState<string>(frame?.rfp_notes ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  const handleSave = useCallback(async () => {
    if (!frame) return;
    setSaveState("saving"); setSaveError("");
    try {
      const res = await fetch("/api/brief-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "frame", campaign_id: campaignId, record_id: frame.id,
          fields: { brand_guidelines_url: guidelinesUrl, brand_guidelines_notes: guidelinesNotes, rfp_notes: rfpNotes },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setSaveError(json.error ?? "Save failed"); setSaveState("error"); }
      else { setSaveState("saved"); }
    } catch { setSaveError("Network error — try again."); setSaveState("error"); }
  }, [campaignId, frame, guidelinesUrl, guidelinesNotes, rfpNotes]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900">Brand Assets, CI & RFP</h2>
        <p className="text-sm text-neutral-500">
          Share your brand guidelines, corporate identity documents, and any RFP or scope requirements
          for {clientName || "this campaign"}.
        </p>
      </div>
      <div className="grid gap-5">
        <div className="space-y-1">
          <label className={labelCls}>Brand Guidelines / CI — Link</label>
          <p className={hintCls}>Link to your brand guidelines, CI manual, or identity deck (Dropbox, Google Drive, SharePoint, etc.).</p>
          <input type="url" value={guidelinesUrl}
            onChange={e => { setGuidelinesUrl(e.target.value); setSaveState("idle"); }}
            placeholder="https://drive.google.com/..." className={inputCls} />
        </div>
        <FieldRow label="Brand Identity Notes"
          hint="Key brand rules, tone restrictions, visual identity notes, or anything ShiftImpact must know before developing creative."
          name="brand_guidelines_notes" value={guidelinesNotes}
          onChange={v => { setGuidelinesNotes(v); setSaveState("idle"); }} rows={5}
          placeholder={`e.g.\n• Brand colours: Primary — Yeo's Red (#C8102E). Never use pink.\n• Logo: No tagline lockup in digital formats.\n• Tone: Warm, confident, practical. Not preachy.\n• Must-include: Always show product in context of a real meal.\n• Prohibited: Competitor product mentions.`}
        />
        <FieldRow label="RFP / Scope Notes"
          hint="Paste your RFP scope, deliverables list, or any brief requirements. Include timelines, mandatories, and client-specific constraints."
          name="rfp_notes" value={rfpNotes}
          onChange={v => { setRfpNotes(v); setSaveState("idle"); }} rows={5}
          placeholder={`e.g.\n• Campaign window: 1 Sep – 30 Nov 2026\n• Must activate during Hari Raya Aidiladha season\n• Deliverables: 1 hero TVC (30s), 3 social cutdowns, KOL brief for 5 creators\n• Legal review required before any campaign goes live`}
        />
      </div>
      <SaveBar state={saveState} onSave={handleSave} error={saveError} />
    </div>
  );
}

// ─── FRAME Brief section ──────────────────────────────────────────────────────

function FrameSection({
  campaignId, frame, extracted,
}: {
  campaignId: string; frame: FrameBrief | null; extracted?: FrameExtracted | null;
}) {
  const [fields, setFields] = useState({
    force: frame?.force ?? "", role: frame?.role ?? "", anchor: frame?.anchor ?? "",
    mood: frame?.mood ?? "", expression: frame?.expression ?? "",
    clarity_statement: frame?.clarity_statement ?? "",
    primary_kpi: frame?.primary_kpi ?? "",
    primary_cultural_context: frame?.primary_cultural_context ?? "None",
    enemy_villain: frame?.enemy_villain ?? "",
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!extracted) return;
    setFields((prev) => ({
      force:             extracted.force             && !prev.force             ? extracted.force             : prev.force,
      role:              extracted.role              && !prev.role              ? extracted.role              : prev.role,
      anchor:            extracted.anchor            && !prev.anchor            ? extracted.anchor            : prev.anchor,
      mood:              extracted.mood              && !prev.mood              ? extracted.mood              : prev.mood,
      expression:        extracted.expression        && !prev.expression        ? extracted.expression        : prev.expression,
      clarity_statement: extracted.clarity_statement && !prev.clarity_statement ? extracted.clarity_statement : prev.clarity_statement,
      primary_kpi:       extracted.primary_kpi       && !prev.primary_kpi       ? extracted.primary_kpi       : prev.primary_kpi,
      enemy_villain:     extracted.enemy_villain     && !prev.enemy_villain     ? extracted.enemy_villain     : prev.enemy_villain,
      primary_cultural_context: prev.primary_cultural_context,
    }));
    setSaveState("idle");
  }, [extracted]);

  const set = useCallback((key: string) => (v: string) => {
    setFields((prev) => ({ ...prev, [key]: v })); setSaveState("idle");
  }, []);

  const handleSave = useCallback(async () => {
    if (!frame) return;
    setSaveState("saving"); setSaveError("");
    try {
      const res = await fetch("/api/brief-save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "frame", campaign_id: campaignId, record_id: frame.id, fields }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setSaveError(json.error ?? "Save failed"); setSaveState("error"); }
      else { setSaveState("saved"); }
    } catch { setSaveError("Network error — try again."); setSaveState("error"); }
  }, [campaignId, frame, fields]);

  if (!frame) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        FRAME Brief not yet set up for this campaign. Contact your ShiftImpact lead.
      </div>
    );
  }

  const CULTURAL_OPTIONS = [
    { value: "None", label: "No specific cultural lens" },
    { value: "Malay", label: "Malay" },
    { value: "Chinese", label: "Chinese-Malaysian" },
    { value: "Indian", label: "Indian-Malaysian" },
    { value: "Pan-Malaysian", label: "Pan-Malaysian" },
    { value: "Pan-SEA", label: "Pan-SEA" },
    { value: "Multi-ethnic", label: "Multi-ethnic" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900">FRAME Brief</h2>
        <p className="text-sm text-neutral-500">
          The strategic foundation for this campaign. Fill in each dimension as completely as you can — your inputs go directly to the strategy team.
        </p>
      </div>
      <div className="grid gap-5">
        <FieldRow label="Business Imperative (Force)"
          hint="What is the undeniable commercial or category pressure that makes this campaign necessary? What happens if we don't act?"
          name="force" value={fields.force} onChange={set("force")} rows={3}
          placeholder="e.g. Trial rates for our two core SKUs are declining as Gen-Z cooks see canned products as low-effort and uninteresting…"
        />
        <FieldRow label="Who We're Talking To (Role)"
          hint="Describe your target audience in human terms — who are they, and what role does this brand play in their lives?"
          name="role" value={fields.role} onChange={set("role")} rows={3}
          placeholder="e.g. Home cooks aged 18–30 who are curious and creative but time-poor…"
        />
        <FieldRow label="Their Life Context (Anchor)"
          hint="What is happening in their lives right now — culturally, emotionally, or practically — that creates an opening for this campaign?"
          name="anchor" value={fields.anchor} onChange={set("anchor")} rows={3}
          placeholder="e.g. Cost-of-living pressure is pushing them to cook at home more, but they want it to feel intentional, not like settling…"
        />
        <FieldRow label="How They Feel (Mood)"
          hint="What is the emotional tone of your audience right now? What do they want to feel that they&apos;re not currently feeling?"
          name="mood" value={fields.mood} onChange={set("mood")} rows={2}
          placeholder="e.g. Curious, slightly overwhelmed, craving meaning and small wins…"
        />
        <FieldRow label="Brand Expression"
          hint="How does your brand show up — what is its voice, energy, and way of communicating in this campaign?"
          name="expression" value={fields.expression} onChange={set("expression")} rows={2}
          placeholder="e.g. Warm, confident, practical creativity — not preachy, not try-hard…"
        />
        <FieldRow label="What Should People Say About Us (Clarity)"
          hint="After this campaign, what is the one thing you want people to say, think, or feel about your brand?"
          name="clarity_statement" value={fields.clarity_statement} onChange={set("clarity_statement")} rows={2}
          placeholder={`e.g. "Yeo's gets how I actually cook — it's part of my kitchen, not just a backup plan."`}
        />
        <FieldRow label="What We're Fighting Against"
          hint="What is the structural enemy — the behaviour, belief, or alternative — that this campaign must overcome?"
          name="enemy_villain" value={fields.enemy_villain} onChange={set("enemy_villain")} rows={2}
          placeholder="e.g. The perception that canned food is boring, last-resort cooking…"
        />
        <FieldRow label="Primary KPI"
          hint="What is the single most important measurable outcome for this campaign?"
          name="primary_kpi" value={fields.primary_kpi} onChange={set("primary_kpi")} rows={1}
          placeholder="e.g. Trial purchase uplift across two SKUs, measured via sales data"
        />
        <SelectRow label="Cultural Context"
          hint="Which cultural lens is most relevant to this campaign?"
          name="primary_cultural_context" value={fields.primary_cultural_context}
          onChange={set("primary_cultural_context")} options={CULTURAL_OPTIONS}
        />
      </div>
      <SaveBar state={saveState} onSave={handleSave} error={saveError} />
    </div>
  );
}

// ─── Big Idea Platform section ────────────────────────────────────────────────

function BipSection({
  campaignId, bip, extracted,
}: {
  campaignId: string; bip: BigIdeaPlatform | null; extracted?: BipExtracted | null;
}) {
  const [fields, setFields] = useState({
    topline_idea: bip?.topline_idea ?? "",
    enemy_villain: bip?.enemy_villain ?? "",
    brand_role: bip?.brand_role ?? "",
    propagation_mechanism: bip?.propagation_mechanism ?? "",
    cultural_tension: bip?.cultural_tension ?? "",
    media_idea: bip?.media_idea ?? "",
    expression_summary: bip?.expression_summary ?? "",
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!extracted) return;
    setFields((prev) => ({
      topline_idea:          extracted.topline_idea          && !prev.topline_idea          ? extracted.topline_idea          : prev.topline_idea,
      enemy_villain:         extracted.enemy_villain         && !prev.enemy_villain         ? extracted.enemy_villain         : prev.enemy_villain,
      brand_role:            extracted.brand_role            && !prev.brand_role            ? extracted.brand_role            : prev.brand_role,
      propagation_mechanism: extracted.propagation_mechanism && !prev.propagation_mechanism ? extracted.propagation_mechanism : prev.propagation_mechanism,
      cultural_tension:      extracted.cultural_tension      && !prev.cultural_tension      ? extracted.cultural_tension      : prev.cultural_tension,
      media_idea:            extracted.media_idea            && !prev.media_idea            ? extracted.media_idea            : prev.media_idea,
      expression_summary:    extracted.expression_summary    && !prev.expression_summary    ? extracted.expression_summary    : prev.expression_summary,
    }));
    setSaveState("idle");
  }, [extracted]);

  const set = useCallback((key: string) => (v: string) => {
    setFields((prev) => ({ ...prev, [key]: v })); setSaveState("idle");
  }, []);

  const handleSave = useCallback(async () => {
    if (!bip) return;
    setSaveState("saving"); setSaveError("");
    try {
      const res = await fetch("/api/brief-save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "bip", campaign_id: campaignId, record_id: bip.id, fields }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setSaveError(json.error ?? "Save failed"); setSaveState("error"); }
      else { setSaveState("saved"); }
    } catch { setSaveError("Network error — try again."); setSaveState("error"); }
  }, [campaignId, bip, fields]);

  if (!bip) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Big Idea Platform not yet set up for this campaign. Contact your ShiftImpact lead.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900">Big Idea Platform</h2>
        <p className="text-sm text-neutral-500">
          The campaign idea itself — how the strategy becomes a creative idea that can travel across every channel.
        </p>
      </div>
      <div className="grid gap-5">
        <FieldRow label="The Big Idea"
          hint="One sentence: the hero statement. What is the single idea this entire campaign is built on?"
          name="topline_idea" value={fields.topline_idea} onChange={set("topline_idea")} rows={2}
          placeholder="e.g. Jadikan Caramu — make it yours. Yeo's is not the ingredient, it's the permission to create."
        />
        <FieldRow label="What We're Fighting (Enemy)"
          hint="What specific belief, behaviour, or alternative does the big idea directly confront and disrupt?"
          name="enemy_villain" value={fields.enemy_villain} onChange={set("enemy_villain")} rows={2}
          placeholder="e.g. The idea that cooking from scratch is the only cooking worth sharing…"
        />
        <FieldRow label="The Brand's Role"
          hint="What is the non-transferable role of this brand in the idea? If you removed the brand, the idea should collapse."
          name="brand_role" value={fields.brand_role} onChange={set("brand_role")} rows={2}
          placeholder="e.g. Yeo's is the shortcut that doesn't feel like a shortcut — the ingredient that makes you a creative cook, not a lazy one."
        />
        <FieldRow label="How the Idea Travels"
          hint="What is the mechanism that makes this idea spread from person to person, stage to stage?"
          name="propagation_mechanism" value={fields.propagation_mechanism} onChange={set("propagation_mechanism")} rows={2}
          placeholder="e.g. User-generated 'my version' content — people share their Yeo's creations as creative expression, not brand promotion."
        />
        <FieldRow label="The Cultural Tension"
          hint="What specific human tension — between aspiration and reality, identity and behavior, tradition and modernity — does this idea resolve?"
          name="cultural_tension" value={fields.cultural_tension} onChange={set("cultural_tension")} rows={2}
          placeholder="e.g. Young Malaysians want to eat well and cook creatively but feel the gap between their food content consumption and actual cooking skills."
        />
        <FieldRow label="The Media Idea"
          hint="What channel, format, or platform is this idea most natively at home in?"
          name="media_idea" value={fields.media_idea} onChange={set("media_idea")} rows={2}
          placeholder="e.g. TikTok/Reels cooking transforms — short, satisfying, shareable process videos where the Yeo's product is a plot twist, not a label."
        />
        <FieldRow label="How It Shows Up Everywhere"
          hint="In one paragraph: how does this idea manifest consistently across all your key touchpoints — social, OOH, retail, influencers, events."
          name="expression_summary" value={fields.expression_summary} onChange={set("expression_summary")} rows={4}
          placeholder="e.g. On social: recipe transforms with Yeo's as the key ingredient. In-store: 'Jadikan Caramu' shelf messaging…"
        />
      </div>
      <SaveBar state={saveState} onSave={handleSave} error={saveError} />
    </div>
  );
}

// ─── Discipline Briefs section (read-only, client-facing) ────────────────────

function DisciplineBriefsSection({
  stageBriefs, activeChannels,
}: {
  stageBriefs: StageBrief[]; activeChannels: string[];
}) {
  if (stageBriefs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-neutral-900">Discipline Briefs</h2>
          <p className="text-sm text-neutral-500">Channel-specific execution briefs for your team and agency partners.</p>
        </div>
        {activeChannels.length > 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm font-semibold text-neutral-700 mb-1">Select your channels to generate briefs</p>
            <p className="text-xs text-neutral-500">
              Go to the <strong>Channels</strong> tab, select your channels, and hit Save. Discipline briefs will generate automatically.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
            <p className="text-sm text-amber-700">
              No channels selected. Go to the <strong>Channels</strong> tab and select which channels this campaign will activate on.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-neutral-900">Discipline Briefs</h2>
        <p className="text-sm text-neutral-500">
          AI-generated execution briefs for each active channel, derived from your FRAME Brief and Big Idea.
          Share with your agency and channel teams.
        </p>
      </div>
      <div className="space-y-4">
        {stageBriefs.map((brief) => (
          <div key={brief.id} className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <p className="text-sm font-bold text-neutral-800">{brief.channel}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600 capitalize">{brief.status}</span>
            </div>
            <div className="px-4 py-4">
              {brief.brief_body ? (
                <div className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed">
                  {brief.brief_body}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic">Brief body not yet written.</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-md bg-neutral-50 border border-neutral-200 px-4 py-3 text-xs text-neutral-500">
        These briefs are the strategic starting point. Work with your ShiftImpact lead to refine them before sharing with your creative and media agency teams.
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BriefIntakeForm({
  campaignId,
  campaignName,
  frame,
  bip,
  businessOutcomeLabel,
  businessOutcomeTarget,
  retentionLabel,
  retentionTarget,
  clientName,
  stageBriefs,
}: {
  campaignId: string;
  campaignName: string;
  frame: FrameBrief | null;
  bip: BigIdeaPlatform | null;
  businessOutcomeLabel: string;
  businessOutcomeTarget: number | null;
  retentionLabel: string;
  retentionTarget: number | null;
  clientName: string;
  stageBriefs: StageBrief[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"channels" | "kpis" | "assets" | "frame" | "bip" | "discipline">("frame");
  const [extractedFrame, setExtractedFrame] = useState<FrameExtracted | null>(null);
  const [extractedBip,   setExtractedBip]   = useState<BipExtracted   | null>(null);

  const handleExtracted = useCallback((frame: FrameExtracted, bip: BipExtracted) => {
    setExtractedFrame(frame); setExtractedBip(bip);
  }, []);

  const handleChannelsSaved = useCallback(async () => {
    router.refresh();
    setTab("discipline");
  }, [router]);

  const frameLocked    = frame?.lock_status === "Locked";
  const activeChannels = frame?.active_channels ?? [];

  const BRAND_TABS = [
    { id: "frame",    label: "FRAME Brief" },
    { id: "kpis",     label: "Campaign KPIs" },
    { id: "channels", label: "Channels" },
    { id: "assets",   label: "Brand Assets & CI" },
  ] as const;

  const AGENCY_TABS = [
    { id: "bip",        label: "Big Idea" },
    { id: "discipline", label: "Discipline Briefs" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* KB upload zone */}
      <KbUploadZone onExtracted={handleExtracted} />

      {/* Tab bar — two rows: Brand / Agency */}
      <div className="space-y-0">
        {/* Row 1: Brand */}
        <div className="flex items-end border-b border-neutral-200 flex-wrap">
          <span className="pr-3 pb-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 shrink-0 self-end">
            Brand
          </span>
          {BRAND_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-neutral-900 text-neutral-900 -mb-px"
                  : "border-transparent text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {t.label}
              {t.id === "channels" && activeChannels.length > 0 && (
                <span className="ml-1.5 text-xs bg-neutral-900 text-white rounded-full px-1.5 py-0.5">
                  {activeChannels.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Row 2: Agency */}
        <div className="flex items-end border-b border-neutral-200 flex-wrap">
          <span className="pr-3 pb-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 shrink-0 self-end">
            Agency
          </span>
          {AGENCY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-neutral-900 text-neutral-900 -mb-px"
                  : "border-transparent text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {t.label}
              {t.id === "discipline" && stageBriefs.length > 0 && (
                <span className="ml-1.5 text-xs bg-emerald-600 text-white rounded-full px-1.5 py-0.5">
                  {stageBriefs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels */}
      {tab === "channels" && (
        <ChannelsSection campaignId={campaignId} frame={frame} onChannelsSaved={handleChannelsSaved} />
      )}
      {tab === "kpis" && (
        <CampaignKpiSection
          campaignId={campaignId}
          businessOutcomeLabel={businessOutcomeLabel}
          businessOutcomeTarget={businessOutcomeTarget}
          retentionLabel={retentionLabel}
          retentionTarget={retentionTarget}
          frame={frame}
        />
      )}
      {tab === "assets" && (
        <BrandAssetsSection campaignId={campaignId} clientName={clientName} frame={frame} />
      )}
      {tab === "frame" && (
        <FrameSection campaignId={campaignId} frame={frame} extracted={extractedFrame} />
      )}
      {tab === "bip" && (
        <BipSection campaignId={campaignId} bip={bip} extracted={extractedBip} />
      )}
      {tab === "discipline" && (
        <DisciplineBriefsSection
          stageBriefs={stageBriefs}
          activeChannels={activeChannels}
        />
      )}

      {/* Footer */}
      <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
        <NotifyButton campaignId={campaignId} campaignName={campaignName} clientName={clientName} />
        <p className="text-xs text-neutral-400">
          All changes save to your ShiftImpact workspace in real time.
        </p>
      </div>
    </div>
  );
}
