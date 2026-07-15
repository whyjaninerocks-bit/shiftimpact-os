"use client";

// app/campaigns/[id]/_components/StageBriefsSection.tsx
// STAGE Briefs — per-channel execution briefs for each funnel stage.
// Inherits anchor and mood from the locked FRAME Brief.
// INTERNAL ONLY — not shown in Client Interface.

import { useState, useTransition } from "react";
import { createStageBrief, updateStageBrief } from "@/lib/actions";
import type { StageBrief, Stage, IdeaOrSpend } from "@/lib/types";
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

// ─── Stage Brief card ─────────────────────────────────────────────────────────

interface BriefCardProps {
  brief: StageBrief;
  campaignId: string;
}

function BriefCard({ brief, campaignId }: BriefCardProps) {
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
                <option value="Live">Live</option>
                <option value="Paused">Paused</option>
                <option value="Complete">Complete</option>
              </select>
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
}

function AddForm({ campaignId, defaultStage, frameAnchor, moodRegister }: AddFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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
              <option value="Live">Live</option>
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

interface StageBriefsSectionProps {
  campaignId: string;
  frameLocked: boolean;
  frameAnchor: string;
  moodRegister: string;
  stageBriefs: StageBrief[];
}

export function StageBriefsSection({
  campaignId,
  frameLocked,
  frameAnchor,
  moodRegister,
  stageBriefs,
}: StageBriefsSectionProps) {
  const byStage = STAGE_ORDER.reduce<Record<Stage, StageBrief[]>>(
    (acc, stage) => {
      acc[stage] = stageBriefs.filter((b) => b.stage === stage);
      return acc;
    },
    { Demand: [], Conversion: [], Retention: [] }
  );

  return (
    <section id="stage-briefs">
      <SectionTitle>STAGE Briefs</SectionTitle>

      {!frameLocked && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">Lock the FRAME Brief before writing Stage Briefs.</p>
        </div>
      )}

      <div className="space-y-6">
        {STAGE_ORDER.map((stage) => (
          <div key={stage}>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">{stage} Stage</p>
            <div className="space-y-2">
              {byStage[stage].map((brief) => (
                <BriefCard key={brief.id} brief={brief} campaignId={campaignId} />
              ))}
              <AddForm
                campaignId={campaignId}
                defaultStage={stage}
                frameAnchor={frameAnchor}
                moodRegister={moodRegister}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
