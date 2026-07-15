"use client";

// app/campaigns/[id]/_components/KillSwitchesSection.tsx
// Kill switch conditions tied to the FRAME Brief.
// INTERNAL ONLY — not shown in Client Interface.

import { useState, useTransition } from "react";
import { createKillSwitch, updateKillSwitch, deleteKillSwitch } from "@/lib/actions";
import type { KillSwitch } from "@/lib/types";
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

const STATUS_TONE: Record<string, "neutral" | "amber" | "red"> = {
  Inactive:   "neutral",
  Monitoring: "amber",
  Triggered:  "red",
};

const PRIORITY_TONE: Record<string, "neutral" | "amber" | "red"> = {
  Low:    "neutral",
  Medium: "amber",
  High:   "red",
};

// ─── Add form ─────────────────────────────────────────────────────────────────

interface AddFormProps {
  campaignId: string;
  frameBriefId: string;
}

function AddForm({ campaignId, frameBriefId }: AddFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={buttonSecondaryClass}>
        + Add Kill Switch
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createKillSwitch(campaignId, frameBriefId, fd);
      setOpen(false);
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>Condition</label>
          <textarea
            name="condition"
            required
            rows={2}
            placeholder="e.g. If branded search drops below 5% for 2 consecutive weeks…"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Priority</label>
            <select name="priority" defaultValue="Medium" className={inputClass}>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Initial Status</label>
            <select name="trigger_status" defaultValue="Inactive" className={inputClass}>
              <option value="Inactive">Inactive</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Triggered">Triggered</option>
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

// ─── Kill switch row ──────────────────────────────────────────────────────────

interface KillSwitchRowProps {
  ks: KillSwitch;
  campaignId: string;
}

function KillSwitchRow({ ks, campaignId }: KillSwitchRowProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateKillSwitch(campaignId, ks.id, fd);
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteKillSwitch(campaignId, ks.id);
    });
  }

  if (editing) {
    return (
      <Card>
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className={labelClass}>Condition</label>
            <textarea name="condition" defaultValue={ks.condition} required rows={2} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Priority</label>
              <select name="priority" defaultValue={ks.priority} className={inputClass}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select name="trigger_status" defaultValue={ks.trigger_status} className={inputClass}>
                <option value="Inactive">Inactive</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Triggered">Triggered</option>
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
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-neutral-800 flex-1">{ks.condition}</p>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={PRIORITY_TONE[ks.priority] ?? "neutral"}>{ks.priority}</Badge>
          <Badge tone={STATUS_TONE[ks.trigger_status] ?? "neutral"}>{ks.trigger_status}</Badge>
          <button onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
            Edit
          </button>
          <button onClick={handleDelete} disabled={isPending} className="text-xs text-red-400 hover:text-red-600">
            {isPending ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface KillSwitchesSectionProps {
  campaignId: string;
  frameBriefId: string;
  killSwitches: KillSwitch[];
}

export function KillSwitchesSection({ campaignId, frameBriefId, killSwitches }: KillSwitchesSectionProps) {
  const triggered = killSwitches.filter((k) => k.trigger_status === "Triggered");
  const monitoring = killSwitches.filter((k) => k.trigger_status === "Monitoring");
  const inactive = killSwitches.filter((k) => k.trigger_status === "Inactive");

  return (
    <section id="kill-switches">
      <SectionTitle>Kill Switches</SectionTitle>

      {triggered.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-semibold text-red-700 mb-1">⚠ {triggered.length} kill switch{triggered.length > 1 ? "es" : ""} triggered</p>
          {triggered.map((ks) => (
            <p key={ks.id} className="text-xs text-red-600">{ks.condition}</p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {[...triggered, ...monitoring, ...inactive].map((ks) => (
          <KillSwitchRow key={ks.id} ks={ks} campaignId={campaignId} />
        ))}

        {killSwitches.length === 0 && (
          <p className="text-sm text-neutral-400 italic">No kill switches defined yet.</p>
        )}

        <AddForm campaignId={campaignId} frameBriefId={frameBriefId} />
      </div>
    </section>
  );
}
