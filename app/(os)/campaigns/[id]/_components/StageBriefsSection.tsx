"use client";

// app/campaigns/[id]/_components/StageBriefsSection.tsx
// STAGE Briefs — per-channel execution briefs for each funnel stage.
// Inherits anchor and mood from the locked FRAME Brief.
// INTERNAL ONLY — not shown in Client Interface.

import { useState, useTransition, useCallback } from "react";
import { createStageBrief, updateStageBrief } from "@/lib/actions";
import type { StageBrief, Stage, IdeaOrSpend, PhaseGate } from "@/lib/types";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAGE_ORDER: Stage[] = ["Demand", "Conversion", "Retention"];

const STATUS_TONE: Record<string, "neutral" | "blue" | "green" | "amber" | "red"> = {
  Draft:    "neutral",
  Ready:    "blue",
  Live:     "green",
  Paused:   "amber",
  Complete: "neutral",
};

// ─── Stage gate guard helper ──────────────────────────────────────────────────

// Returns true if the "Live" status is allowed for this stage given current gate states
function canGoLive(stage: Stage, openGateTypes: Set<string>): boolean {
  if (stage === "Demand") return true; // first stage — no prior gate required
  if (stage === "Conversion") return openGateTypes.has("Gate 1: Demand");
  if (stage === "Retention") return openGateTypes.has("Gate 2: Conversion");
  return true;
}

// ─── Stage Brief card ─────────────────────────────────────────────────────────

interface BriefCardProps {
  brief: StageBrief;
  campaignId: string;
  liveAllowed: boolean;
  clarityStatement: string;
}

function BriefCard({ brief, campaignId, liveAllowed, clarityStatement }: BriefCardProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateStageBrief(campaignId, brief.id, fd);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <Card>
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className={labelClass}>Channel</label>
            <input type="text" name="channel" defaultValue={brief.channel} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Brief Body</label>
            <textarea name="brief_body" defaultValue={brief.brief_body} rows={4} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Propagation Mechanism</label>
            <textarea name="propagation_mechanism" defaultValue={brief.propagation_mechanism} rows={2} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Idea Led / Spend Led</label>
              <select name="idea_led_vs_spend_led" defaultValue={brief.idea_led_vs_spend_led ?? ""} className={inputClass}>
                <option value="">— Unset —</option>
                <option value="Idea-Led">Idea-Led</option>
                <option value="Spend-Led">Spend-Led</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" defaultValue={brief.status} className={inputClass}>
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Live" disabled={!liveAllowed}>
                  {liveAllowed ? "Live" : "Live (gate not Open)"}
                </option>
                <option value="Paused">Paused</option>
                <option value="Complete">Complete</option>
              </select>
              {!liveAllowed && (
                <p className="text-[10px] text-amber-600 mt-1">Open the prerequisite gate first.</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className={buttonClass}>
              {isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={buttonSecondaryClass}>
              Cancel
            </button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      {/* FRAME Anchor strip — drift check at a glance */}
      {(brief.frame_anchor || clarityStatement) && (
        <div className="mb-3 pb-2 border-b border-neutral-100 flex flex-wrap gap-3">
          {clarityStatement && (
            <span className="text-[10px] text-neutral-400 italic truncate max-w-full">
              <span className="font-semibold not-italic text-neutral-500">Idea: </span>{clarityStatement}
            </span>
          )}
          {brief.frame_anchor && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-medium text-neutral-500">
              Anchor: {brief.frame_anchor}
            </span>
          )}
          {brief.mood_register && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-medium text-neutral-500">
              Mood: {brief.mood_register}
            </span>
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-neutral-800">{brief.channel}</p>
        <div className="flex items-center gap-2 shrink-0">
          {brief.idea_led_vs_spend_led && (
            <Badge tone="neutral">{brief.idea_led_vs_spend_led}</Badge>
          )}
          <Badge tone={STATUS_TONE[brief.status] ?? "neutral"}>{brief.status}</Badge>
          <button onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
            Edit
          </button>
        </div>
      </div>
      {brief.brief_body && (
        <p className="text-xs text-neutral-600 whitespace-pre-wrap mb-2">{brief.brief_body}</p>
      )}
      {brief.propagation_mechanism && (
        <div className="mt-2 pt-2 border-t border-neutral-100">
          <p className="text-xs text-neutral-400 mb-1">Propagation</p>
          <p className="text-xs text-neutral-600">{brief.propagation_mechanism}</p>
        </div>
      )}
    </Card>
  );
}

// ─── Add form ─────────────────────────────────────────────────────────────────

interface AddFormProps {
  campaignId: string;
  defaultStage: Stage;
  frameAnchor: string;
  moodRegister: string;
  frameLocked: boolean;
  liveAllowed: boolean;
}

function AddForm({ campaignId, defaultStage, frameAnchor, moodRegister, frameLocked, liveAllowed }: AddFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!frameLocked) {
    return (
      <button disabled className={`${buttonSecondaryClass} opacity-40 cursor-not-allowed`} title="Lock FRAME Brief first">
        + Add {defaultStage} Brief
      </button>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={buttonSecondaryClass}>
        + Add {defaultStage} Brief
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createStageBrief(campaignId, fd);
      setOpen(false);
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="stage" value={defaultStage} />
        <input type="hidden" name="frame_anchor" value={frameAnchor} />
        <input type="hidden" name="mood_register" value={moodRegister} />

        <div>
          <label className={labelClass}>Channel</label>
          <input type="text" name="channel" required placeholder="e.g. TikTok, Radio, Retail" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Brief Body</label>
          <textarea name="brief_body" rows={4} placeholder="What does this channel need to do? How does the idea live here?" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Propagation Mechanism</label>
          <textarea name="propagation_mechanism" rows={2} placeholder="How does this brief earn movement to the next stage?" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Idea Led / Spend Led</label>
            <select name="idea_led_vs_spend_led" defaultValue="" className={inputClass}>
              <option value="">— Unset —</option>
              <option value="Idea-Led">Idea-Led</option>
              <option value="Spend-Led">Spend-Led</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue="Draft" className={inputClass}>
              <option value="Draft">Draft</option>
              <option value="Ready">Ready</option>
              <option value="Live" disabled={!liveAllowed}>
                {liveAllowed ? "Live" : "Live (gate not Open)"}
              </option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className={buttonClass}>
            {isPending ? "Saving…" : "Add"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={buttonSecondaryClass}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

// ─── AI Generate button ────────────────────────────────────────────────────────

function GenerateChannelBriefsButton({
  campaignId,
  activeChannels,
  existingCount,
}: {
  campaignId: string;
  activeChannels: string[];
  existingCount: number;
}) {
  const [genState, setGenState] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [genMessage, setGenMessage] = useState("");

  const handleGenerate = useCallback(async () => {
    setGenState("generating");
    setGenMessage("");
    try {
      const res = await fetch("/api/channel-briefs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setGenState("error");
        setGenMessage(json.error ?? "Generation failed");
      } else {
        setGenState("done");
        setGenMessage(
          json.generated?.length > 0
            ? `Generated ${json.generated.length} channel brief${json.generated.length > 1 ? "s" : ""}: ${json.generated.join(", ")}. Refresh to see them below.`
            : "All channel briefs already exist."
        );
      }
    } catch {
      setGenState("error");
      setGenMessage("Network error — try again.");
    }
  }, [campaignId]);

  if (activeChannels.length === 0) return null;

  const unbriefedChannels = activeChannels.length - existingCount;

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-xs font-semibold text-blue-800">
          {activeChannels.length} channel{activeChannels.length > 1 ? "s" : ""} active from client brief
          {unbriefedChannels > 0 && ` · ${unbriefedChannels} not yet briefed`}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          {activeChannels.join(", ")}
        </p>
        {genMessage && (
          <p className={`text-xs mt-1 ${genState === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {genMessage}
          </p>
        )}
      </div>
      {unbriefedChannels > 0 && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={genState === "generating"}
          className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {genState === "generating" ? "Generating…" : "AI Generate Discipline Briefs"}
        </button>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface StageBriefsSectionProps {
  campaignId: string;
  frameLocked: boolean;
  frameAnchor: string;
  moodRegister: string;
  clarityStatement: string;
  stageBriefs: StageBrief[];
  phaseGates: PhaseGate[];
  activeChannels?: string[];
}

export function StageBriefsSection({
  campaignId,
  frameLocked,
  frameAnchor,
  moodRegister,
  clarityStatement,
  stageBriefs,
  phaseGates,
  activeChannels = [],
}: StageBriefsSectionProps) {
  const byStage = STAGE_ORDER.reduce<Record<Stage, StageBrief[]>>(
    (acc, stage) => {
      acc[stage] = stageBriefs.filter((b) => b.stage === stage);
      return acc;
    },
    { Demand: [], Conversion: [], Retention: [] }
  );

  // Build set of open gate types for gate guard
  const openGateTypes = new Set(
    phaseGates.filter((g) => g.gate_decision === "Open").map((g) => g.gate_type)
  );

  // Channels from brief that don't yet have a stage brief
  const existingChannels = new Set(stageBriefs.map((b) => b.channel));
  const existingCount = activeChannels.filter((c) => existingChannels.has(c)).length;

  return (
    <section id="stage-briefs">
      <SectionTitle>STAGE Briefs</SectionTitle>

      {!frameLocked && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-amber-700">Lock the FRAME Brief before writing Stage Briefs.</p>
          <p className="text-xs text-amber-600 mt-0.5">Add buttons are disabled until the FRAME is locked.</p>
        </div>
      )}

      {/* AI generate button — only when FRAME locked and client has set channels */}
      {frameLocked && (
        <GenerateChannelBriefsButton
          campaignId={campaignId}
          activeChannels={activeChannels}
          existingCount={existingCount}
        />
      )}

      <div className="space-y-6">
        {STAGE_ORDER.map((stage) => {
          const liveAllowed = canGoLive(stage, openGateTypes);
          return (
            <div key={stage}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{stage} Stage</p>
                {!liveAllowed && (
                  <span className="text-[10px] text-amber-500 font-medium">
                    {stage === "Conversion" ? "Gate 1: Demand" : "Gate 2: Conversion"} not Open
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {byStage[stage].map((brief) => (
                  <BriefCard
                    key={brief.id}
                    brief={brief}
                    campaignId={campaignId}
                    liveAllowed={liveAllowed}
                    clarityStatement={clarityStatement}
                  />
                ))}
                <AddForm
                  campaignId={campaignId}
                  defaultStage={stage}
                  frameAnchor={frameAnchor}
                  moodRegister={moodRegister}
                  frameLocked={frameLocked}
                  liveAllowed={liveAllowed}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
