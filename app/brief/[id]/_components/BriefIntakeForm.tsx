"use client";

// app/brief/[id]/_components/BriefIntakeForm.tsx
// Client-facing brief intake form.
// BOUNDARY: Input fields only — no ICS scores, state codes, or internal analytics shown.
//
// Sprint 14: KB upload zone — client can upload a PDF or TXT brand document;
// Claude extracts and pre-fills FRAME + BIP fields. Empty fields only are filled.

import { useState, useCallback, useEffect, useRef } from "react";
import type { FrameBrief, BigIdeaPlatform } from "@/lib/types";

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

// ─── Field components ─────────────────────────────────────────────────────────

function FieldRow({
  label,
  hint,
  name,
  value,
  onChange,
  rows = 3,
  placeholder = "",
}: {
  label: string;
  hint: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {hint && <p className={hintCls}>{hint}</p>}
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

function SelectRow({
  label,
  hint,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  hint: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {hint && <p className={hintCls}>{hint}</p>}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Save button + status ─────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveBar({
  state,
  onSave,
  error,
}: {
  state: SaveState;
  onSave: () => void;
  error: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={state === "saving"}
        className="px-5 py-2 rounded-md text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
      >
        {state === "saving" ? "Saving…" : "Save"}
      </button>
      {state === "saved" && (
        <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>
      )}
      {state === "error" && (
        <span className="text-sm text-red-600">{error || "Save failed — try again."}</span>
      )}
    </div>
  );
}

// ─── KB Upload zone ───────────────────────────────────────────────────────────

function KbUploadZone({
  onExtracted,
}: {
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

      // Count how many fields were extracted
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
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors">
                Choose file or drag here
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.md,text/plain,application/pdf"
                onChange={handleChange}
                className="hidden"
              />
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
                <button
                  onClick={() => { setStatus("idle"); setFileName(""); }}
                  className="text-xs text-neutral-500 underline mt-1"
                >
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

// ─── FRAME Brief section ──────────────────────────────────────────────────────

function FrameSection({
  campaignId,
  frame,
  extracted,
}: {
  campaignId: string;
  frame: FrameBrief | null;
  extracted?: FrameExtracted | null;
}) {
  const [fields, setFields] = useState({
    force:                    frame?.force ?? "",
    role:                     frame?.role ?? "",
    anchor:                   frame?.anchor ?? "",
    mood:                     frame?.mood ?? "",
    expression:               frame?.expression ?? "",
    clarity_statement:        frame?.clarity_statement ?? "",
    primary_kpi:              frame?.primary_kpi ?? "",
    primary_cultural_context: frame?.primary_cultural_context ?? "None",
    enemy_villain:            frame?.enemy_villain ?? "",
  });

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  // Merge KB extraction into fields — only fills empty slots
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
      primary_cultural_context: prev.primary_cultural_context, // keep user's selection
    }));
    setSaveState("idle");
  }, [extracted]);

  const set = useCallback((key: string) => (v: string) => {
    setFields((prev) => ({ ...prev, [key]: v }));
    setSaveState("idle");
  }, []);

  const handleSave = useCallback(async () => {
    if (!frame) return;
    setSaveState("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/brief-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "frame",
          campaign_id: campaignId,
          record_id: frame.id,
          fields,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSaveError(json.error ?? "Save failed");
        setSaveState("error");
      } else {
        setSaveState("saved");
      }
    } catch {
      setSaveError("Network error — try again.");
      setSaveState("error");
    }
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
        <FieldRow
          label="Business Imperative (Force)"
          hint="What is the undeniable commercial or category pressure that makes this campaign necessary? What happens if we don't act?"
          name="force"
          value={fields.force}
          onChange={set("force")}
          rows={3}
          placeholder="e.g. Trial rates for our two core SKUs are declining as Gen-Z cooks see canned products as low-effort and uninteresting…"
        />

        <FieldRow
          label="Who We're Talking To (Role)"
          hint="Describe your target audience in human terms — who are they, and what role does this brand play in their lives?"
          name="role"
          value={fields.role}
          onChange={set("role")}
          rows={3}
          placeholder="e.g. Home cooks aged 18–30 who are curious and creative but time-poor…"
        />

        <FieldRow
          label="Their Life Context (Anchor)"
          hint="What is happening in their lives right now — culturally, emotionally, or practically — that creates an opening for this campaign?"
          name="anchor"
          value={fields.anchor}
          onChange={set("anchor")}
          rows={3}
          placeholder="e.g. Cost-of-living pressure is pushing them to cook at home more, but they want it to feel intentional, not like settling…"
        />

        <FieldRow
          label="How They Feel (Mood)"
          hint="What is the emotional tone of your audience right now? What do they want to feel that they're not currently feeling?"
          name="mood"
          value={fields.mood}
          onChange={set("mood")}
          rows={2}
          placeholder="e.g. Curious, slightly overwhelmed, craving meaning and small wins…"
        />

        <FieldRow
          label="Brand Expression"
          hint="How does your brand show up — what is its voice, energy, and way of communicating in this campaign?"
          name="expression"
          value={fields.expression}
          onChange={set("expression")}
          rows={2}
          placeholder="e.g. Warm, confident, practical creativity — not preachy, not try-hard…"
        />

        <FieldRow
          label="What Should People Say About Us (Clarity)"
          hint="After this campaign, what is the one thing you want people to say, think, or feel about your brand?"
          name="clarity_statement"
          value={fields.clarity_statement}
          onChange={set("clarity_statement")}
          rows={2}
          placeholder={`e.g. "Yeo\'s gets how I actually cook — it\'s part of my kitchen, not just a backup plan."`}
        />

        <FieldRow
          label="What We're Fighting Against"
          hint="What is the structural enemy — the behaviour, belief, or alternative — that this campaign must overcome?"
          name="enemy_villain"
          value={fields.enemy_villain}
          onChange={set("enemy_villain")}
          rows={2}
          placeholder="e.g. The perception that canned food is boring, last-resort cooking…"
        />

        <FieldRow
          label="Primary KPI"
          hint="What is the single most important measurable outcome for this campaign?"
          name="primary_kpi"
          value={fields.primary_kpi}
          onChange={set("primary_kpi")}
          rows={1}
          placeholder="e.g. Trial purchase uplift across two SKUs, measured via sales data"
        />

        <SelectRow
          label="Cultural Context"
          hint="Which cultural lens is most relevant to this campaign?"
          name="primary_cultural_context"
          value={fields.primary_cultural_context}
          onChange={set("primary_cultural_context")}
          options={CULTURAL_OPTIONS}
        />
      </div>

      <SaveBar state={saveState} onSave={handleSave} error={saveError} />
    </div>
  );
}

// ─── Big Idea Platform section ────────────────────────────────────────────────

function BipSection({
  campaignId,
  bip,
  extracted,
}: {
  campaignId: string;
  bip: BigIdeaPlatform | null;
  extracted?: BipExtracted | null;
}) {
  const [fields, setFields] = useState({
    topline_idea:           bip?.topline_idea ?? "",
    enemy_villain:          bip?.enemy_villain ?? "",
    brand_role:             bip?.brand_role ?? "",
    propagation_mechanism:  bip?.propagation_mechanism ?? "",
    cultural_tension:       bip?.cultural_tension ?? "",
    media_idea:             bip?.media_idea ?? "",
    expression_summary:     bip?.expression_summary ?? "",
  });

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  // Merge KB extraction into fields — only fills empty slots
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
    setFields((prev) => ({ ...prev, [key]: v }));
    setSaveState("idle");
  }, []);

  const handleSave = useCallback(async () => {
    if (!bip) return;
    setSaveState("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/brief-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "bip",
          campaign_id: campaignId,
          record_id: bip.id,
          fields,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSaveError(json.error ?? "Save failed");
        setSaveState("error");
      } else {
        setSaveState("saved");
      }
    } catch {
      setSaveError("Network error — try again.");
      setSaveState("error");
    }
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
        <FieldRow
          label="The Big Idea"
          hint="One sentence: the hero statement. What is the single idea that this entire campaign is built on?"
          name="topline_idea"
          value={fields.topline_idea}
          onChange={set("topline_idea")}
          rows={2}
          placeholder="e.g. Jadikan Caramu — make it yours. Yeo's is not the ingredient, it's the permission to create."
        />

        <FieldRow
          label="What We're Fighting (Enemy)"
          hint="What specific belief, behaviour, or alternative does the big idea directly confront and disrupt?"
          name="enemy_villain"
          value={fields.enemy_villain}
          onChange={set("enemy_villain")}
          rows={2}
          placeholder="e.g. The idea that cooking from scratch is the only cooking worth sharing…"
        />

        <FieldRow
          label="The Brand's Role"
          hint="What is the non-transferable role of this brand in the idea? If you removed the brand, the idea should collapse."
          name="brand_role"
          value={fields.brand_role}
          onChange={set("brand_role")}
          rows={2}
          placeholder="e.g. Yeo's is the shortcut that doesn't feel like a shortcut — the ingredient that makes you a creative cook, not a lazy one."
        />

        <FieldRow
          label="How the Idea Travels"
          hint="What is the mechanism that makes this idea spread from person to person, stage to stage? What earns its next moment?"
          name="propagation_mechanism"
          value={fields.propagation_mechanism}
          onChange={set("propagation_mechanism")}
          rows={2}
          placeholder="e.g. User-generated 'my version' content — people share their Yeo's creations as creative expression, not brand promotion."
        />

        <FieldRow
          label="The Cultural Tension"
          hint="What specific human tension — between aspiration and reality, identity and behavior, tradition and modernity — does this idea resolve?"
          name="cultural_tension"
          value={fields.cultural_tension}
          onChange={set("cultural_tension")}
          rows={2}
          placeholder="e.g. Young Malaysians want to eat well and cook creatively but feel the gap between their food content consumption and actual cooking skills."
        />

        <FieldRow
          label="The Media Idea"
          hint="What channel, format, or platform is this idea most natively at home in? What does it look, sound, or feel like in its best expression?"
          name="media_idea"
          value={fields.media_idea}
          onChange={set("media_idea")}
          rows={2}
          placeholder="e.g. TikTok/Reels cooking transforms — short, satisfying, shareable process videos where the Yeo's product is a plot twist, not a label."
        />

        <FieldRow
          label="How It Shows Up Everywhere"
          hint="In one paragraph: describe how this idea manifests consistently across all your key touchpoints — social, OOH, retail, influencers, events."
          name="expression_summary"
          value={fields.expression_summary}
          onChange={set("expression_summary")}
          rows={4}
          placeholder="e.g. On social: recipe transforms with Yeo's as the key ingredient. In-store: 'Jadikan Caramu' shelf messaging…"
        />
      </div>

      <SaveBar state={saveState} onSave={handleSave} error={saveError} />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BriefIntakeForm({
  campaignId,
  frame,
  bip,
}: {
  campaignId: string;
  frame: FrameBrief | null;
  bip: BigIdeaPlatform | null;
}) {
  const [tab, setTab] = useState<"frame" | "bip">("frame");
  const [extractedFrame, setExtractedFrame] = useState<FrameExtracted | null>(null);
  const [extractedBip,   setExtractedBip]   = useState<BipExtracted   | null>(null);

  const handleExtracted = useCallback((frame: FrameExtracted, bip: BipExtracted) => {
    setExtractedFrame(frame);
    setExtractedBip(bip);
  }, []);

  return (
    <div className="space-y-6">
      {/* KB upload zone */}
      <KbUploadZone onExtracted={handleExtracted} />

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-neutral-200 pb-0">
        {(["frame", "bip"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 transition-colors ${
              tab === t
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            {t === "frame" ? "FRAME Brief" : "Big Idea Platform"}
          </button>
        ))}
      </div>

      {tab === "frame" && (
        <FrameSection campaignId={campaignId} frame={frame} extracted={extractedFrame} />
      )}
      {tab === "bip" && (
        <BipSection campaignId={campaignId} bip={bip} extracted={extractedBip} />
      )}
    </div>
  );
}
