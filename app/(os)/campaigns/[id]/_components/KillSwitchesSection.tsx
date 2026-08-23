"use client";

// app/campaigns/[id]/_components/KillSwitchesSection.tsx
// Kill switch conditions tied to the FRAME Brief.
// INTERNAL ONLY — not shown in Client Interface.
//
// A kill switch is manual by default (a human reads `condition` and sets
// `trigger_status`). Setting metric_type/comparator/threshold_value opts a
// switch into the weekly signal-kill-switch-eval cron, which then owns
// trigger_status transitions Inactive <-> Monitoring -> Triggered for that
// switch. Once Triggered by either path, it stays Triggered until a human
// resets it — the cron never un-triggers one.

import { useState, useTransition } from "react";
import { createKillSwitch, updateKillSwitch, deleteKillSwitch } from "@/lib/actions";
import { KILL_SWITCH_METRIC_LABELS, type KillSwitch, type KillSwitchMetric } from "@/lib/types";
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

const METRIC_OPTIONS = Object.entries(KILL_SWITCH_METRIC_LABELS) as [KillSwitchMetric, string][];

function AutomationFields({
  defaultMetric, defaultComparator, defaultThreshold, defaultPeriods,
}: {
  defaultMetric?: string | null;
  defaultComparator?: string | null;
  defaultThreshold?: number | null;
  defaultPeriods?: number | null;
}) {
  const [metric, setMetric] = useState(defaultMetric ?? "");

  return (
    <div className="border-t border-neutral-100 pt-3 space-y-2">
      <div>
        <label className={labelClass}>Auto-evaluate against a signal? <span className="font-normal text-neutral-400">(optional — leave as Manual to keep this switch human-only)</span></label>
        <select
          name="metric_type"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className={inputClass}
        >
          <option value="">Manual — I'll set status myself</option>
          {METRIC_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      {metric && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Direction</label>
            <select name="comparator" defaultValue={defaultComparator ?? "below"} className={inputClass}>
              <option value="below">Falls below</option>
              <option value="above">Rises above</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Threshold</label>
            <input
              type="number" step="0.01" name="threshold_value"
              defaultValue={defaultThreshold ?? undefined}
              placeholder="e.g. 3"
              required={!!metric}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>For N consecutive weeks</label>
            <input
              type="number" min={1} name="consecutive_periods"
              defaultValue={defaultPeriods ?? 1}
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}

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
        <AutomationFields />
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
  const isAuto = !!ks.metric_type;

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
              <label className={labelClass}>Status {isAuto && <span className="font-normal text-neutral-400">(auto-managed — edits here are overridden by next evaluation unless you turn automation off below)</span>}</label>
              <select name="trigger_status" defaultValue={ks.trigger_status} className={inputClass}>
                <option value="Inactive">Inactive</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Triggered">Triggered</option>
              </select>
            </div>
          </div>
          <AutomationFields
            defaultMetric={ks.metric_type}
            defaultComparator={ks.comparator}
            defaultThreshold={ks.threshold_value}
            defaultPeriods={ks.consecutive_periods}
          />
          {isAuto && (
            <label className="flex items-center gap-2 text-xs text-neutral-600">
              <input type="checkbox" name="auto_enabled" defaultChecked={ks.auto_enabled} />
              Automation active — the weekly evaluation can change this switch&apos;s status
            </label>
          )}
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
        <div className="flex-1">
          <p className="text-sm text-neutral-800">{ks.condition}</p>
          {isAuto && (
            <p className="text-xs text-neutral-400 mt-1">
              {ks.auto_enabled ? "Auto: " : "Auto (paused): "}
              {KILL_SWITCH_METRIC_LABELS[ks.metric_type as KillSwitchMetric]} {ks.comparator} {ks.threshold_value} for {ks.consecutive_periods} consecutive week{ks.consecutive_periods === 1 ? "" : "s"}
            </p>
          )}
          {ks.last_evaluation_note && (
            <p className="text-xs text-neutral-400 italic mt-1">{ks.last_evaluation_note}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAuto && <Badge tone={ks.auto_enabled ? "neutral" : "neutral"}>{ks.auto_enabled ? "Auto" : "Auto (paused)"}</Badge>}
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
