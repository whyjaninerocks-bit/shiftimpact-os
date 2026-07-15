"use client";

// Feature 13 — Cross-Channel Campaign Intelligence Hub (Sprint 3)
// Internal only. Not shown to clients.
//
// Two panels:
// 1. Channel Setup  — assign channel_profiles to this campaign with roles + signal proxy labels
// 2. Weekly Hub     — log per-channel metrics, trigger AI cross-channel narrative

import { useState, useTransition } from "react";
import {
  addCampaignChannel,
  updateCampaignChannel,
  removeCampaignChannel,
  upsertChannelWeeklyMetric,
  upsertCrossChannelReport,
} from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import type {
  ChannelProfile,
  CampaignChannelWithProfile,
  CrossChannelReport,
  ChannelRole,
} from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const FUNNEL_ROLES: ChannelRole[] = ["Demand", "Nurture", "Conversion", "Retention"];

const ROLE_COLOR: Record<ChannelRole, string> = {
  Demand:     "bg-blue-100 text-blue-800 border-blue-200",
  Nurture:    "bg-purple-100 text-purple-800 border-purple-200",
  Conversion: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Retention:  "bg-amber-100 text-amber-800 border-amber-200",
};

const INTEGRITY_LABEL: Record<number, string> = {
  1: "Fragmented — channels not expressing the same idea",
  2: "Inconsistent — some coherence, significant gaps",
  3: "Mostly coherent — core idea present but diluted",
  4: "Coherent — idea holding across main channels",
  5: "Fully coherent — single idea expressed distinctly everywhere",
};

// ─── Channel Attribute Chips ──────────────────────────────────────────────────

function AttrChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

// ─── Channel Setup Panel ──────────────────────────────────────────────────────

function ChannelSetupPanel({
  campaignId,
  campaignChannels,
  allChannelProfiles,
}: {
  campaignId: string;
  campaignChannels: CampaignChannelWithProfile[];
  allChannelProfiles: ChannelProfile[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter out already-assigned channels
  const assignedProfileIds = new Set(campaignChannels.map(c => c.channel_profile_id));
  const availableProfiles = allChannelProfiles.filter(p => !assignedProfileIds.has(p.id));

  const addAction = addCampaignChannel.bind(null, campaignId);

  function handleAdd(formData: FormData) {
    startTransition(() => addAction(formData));
    setShowAddForm(false);
  }

  function handleRemove(channelId: string) {
    startTransition(() => removeCampaignChannel(channelId, campaignId));
  }

  // Group assigned channels by funnel role
  const grouped = FUNNEL_ROLES.reduce<Record<ChannelRole, CampaignChannelWithProfile[]>>(
    (acc, role) => {
      acc[role] = campaignChannels.filter(c => c.channel_role === role);
      return acc;
    },
    { Demand: [], Nurture: [], Conversion: [], Retention: [] }
  );

  return (
    <div className="space-y-5">
      {/* Channel list grouped by role */}
      {FUNNEL_ROLES.map(role => {
        const channels = grouped[role];
        if (channels.length === 0) return null;
        return (
          <div key={role}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${ROLE_COLOR[role]}`}>
              {role}
            </p>
            <div className="space-y-2">
              {channels.map(ch => (
                <div key={ch.id} className="border border-neutral-200 rounded-md p-3 bg-white">
                  {editingId === ch.id ? (
                    <EditChannelForm
                      channel={ch}
                      campaignId={campaignId}
                      onDone={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-neutral-800">
                              {ch.channel_name}
                            </span>
                            {ch.is_primary && (
                              <span className="text-xs bg-neutral-800 text-white px-1.5 py-0.5 rounded font-medium">
                                Primary
                              </span>
                            )}
                          </div>
                          {ch.signal_proxy_label && (
                            <p className="text-xs text-neutral-500 mt-0.5">
                              Signal proxy: <span className="font-medium">{ch.signal_proxy_label}</span>
                            </p>
                          )}
                          {ch.budget_allocation_pct && (
                            <p className="text-xs text-neutral-400">
                              Budget: {ch.budget_allocation_pct}%
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingId(ch.id)}
                            className="text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded border border-neutral-200 hover:border-neutral-400"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(ch.id)}
                            disabled={isPending}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-100 hover:border-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <AttrChip label="Attention" value={ch.attention_type} />
                        <AttrChip label="Dwell" value={ch.dwell_time_band} />
                        <AttrChip label="Format" value={ch.content_format} />
                        <AttrChip label="Context" value={ch.audience_context} />
                        <AttrChip label="Action" value={ch.action_affordance} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {campaignChannels.length === 0 && !showAddForm && (
        <p className="text-sm text-neutral-400 text-center py-4">
          No channels assigned yet. Add a channel to start tracking cross-channel intelligence.
        </p>
      )}

      {/* Add Channel form */}
      {showAddForm ? (
        <div className="border border-neutral-200 rounded-md p-4 bg-neutral-50 space-y-3">
          <p className="text-xs font-semibold text-neutral-700">Add Channel</p>
          <form action={handleAdd} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Channel</label>
                <select name="channel_profile_id" className={inputClass} required>
                  <option value="">Select a channel…</option>
                  {FUNNEL_ROLES.map(role => {
                    const profiles = availableProfiles.filter(
                      p => p.primary_funnel_stage === role
                    );
                    if (profiles.length === 0) return null;
                    return (
                      <optgroup key={role} label={`— ${role} —`}>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.channel_name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {/* Channels marked 'All' stages — not tied to a single funnel role */}
                  {(() => {
                    const allStage = availableProfiles.filter(p => p.primary_funnel_stage === "All");
                    if (allStage.length === 0) return null;
                    return (
                      <optgroup label="— All Stages —">
                        {allStage.map(p => (
                          <option key={p.id} value={p.id}>{p.channel_name}</option>
                        ))}
                      </optgroup>
                    );
                  })()}
                </select>
              </div>
              <div>
                <label className={labelClass}>Funnel Role in This Campaign</label>
                <select name="channel_role" className={inputClass} required>
                  {FUNNEL_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Signal Proxy Label</label>
                <input
                  type="text"
                  name="signal_proxy_label"
                  className={inputClass}
                  placeholder="e.g. Save Rate %, Search Lift %"
                />
                <p className="text-xs text-neutral-400 mt-0.5">
                  The key metric this channel contributes each week
                </p>
              </div>
              <div>
                <label className={labelClass}>Budget Allocation (%)</label>
                <input
                  type="number"
                  name="budget_allocation_pct"
                  className={inputClass}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 30"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
                <input type="checkbox" name="is_primary" value="true" className="rounded" />
                Primary channel for this funnel role
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={buttonClass} disabled={isPending}>
                {isPending ? "Adding…" : "Add Channel"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className={buttonSecondaryClass}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className={buttonSecondaryClass}
          disabled={availableProfiles.length === 0}
        >
          {availableProfiles.length === 0 ? "All available channels assigned" : "+ Add Channel"}
        </button>
      )}
    </div>
  );
}

// ─── Edit Channel Form (inline) ───────────────────────────────────────────────

function EditChannelForm({
  channel,
  campaignId,
  onDone,
}: {
  channel: CampaignChannelWithProfile;
  campaignId: string;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const updateAction = updateCampaignChannel.bind(null, channel.id, campaignId);

  function handleSubmit(formData: FormData) {
    startTransition(() => updateAction(formData));
    onDone();
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <p className="text-xs font-semibold text-neutral-700">{channel.channel_name}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Funnel Role</label>
          <select name="channel_role" className={inputClass} defaultValue={channel.channel_role}>
            {FUNNEL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Signal Proxy Label</label>
          <input
            type="text"
            name="signal_proxy_label"
            className={inputClass}
            defaultValue={channel.signal_proxy_label}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Budget Allocation (%)</label>
          <input
            type="number"
            name="budget_allocation_pct"
            className={inputClass}
            defaultValue={channel.budget_allocation_pct ?? ""}
            min="0" max="100" step="0.1"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
            <input
              type="checkbox"
              name="is_primary"
              value="true"
              defaultChecked={channel.is_primary}
              className="rounded"
            />
            Primary for this role
          </label>
        </div>
      </div>
      <input type="hidden" name="notes" value={channel.notes} />
      <div className="flex gap-2">
        <button type="submit" className={buttonClass} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className={buttonSecondaryClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Weekly Hub Panel ─────────────────────────────────────────────────────────

function WeeklyHubPanel({
  campaignId,
  campaignChannels,
  reports,
}: {
  campaignId: string;
  campaignChannels: CampaignChannelWithProfile[];
  reports: CrossChannelReport[];
}) {
  const [isPending, startTransition] = useTransition();
  const [activeReport, setActiveReport] = useState<CrossChannelReport | null>(
    reports.length > 0 ? reports[0] : null
  );
  const [runningAI, setRunningAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const latestWeek = reports.length > 0 ? reports[0].week_number : 0;
  const nextWeek = latestWeek + 1;

  async function handleSubmitWeek(formData: FormData) {
    startTransition(async () => {
      // 1. Upsert the report skeleton
      await upsertCrossChannelReport(campaignId, nextWeek, formData);

      // 2. Upsert per-channel metrics from form fields
      // Fields encoded as: signal_proxy_value_{channelId}, channel_health_{channelId}, etc.
      const weekOf = (formData.get("week_of") as string) || new Date().toISOString().slice(0, 10);
      for (const ch of campaignChannels) {
        const channelFormData = new FormData();
        channelFormData.append("week_number", String(nextWeek));
        channelFormData.append("week_of", weekOf);
        channelFormData.append("signal_proxy_value", formData.get(`spv_${ch.id}`) as string ?? "");
        channelFormData.append("signal_proxy_label", ch.signal_proxy_label);
        channelFormData.append("channel_health", formData.get(`health_${ch.id}`) as string || "Green");
        channelFormData.append("engagement_rate_pct", formData.get(`eng_${ch.id}`) as string ?? "");
        channelFormData.append("notes", formData.get(`notes_${ch.id}`) as string ?? "");
        await upsertChannelWeeklyMetric(campaignId, ch.id, channelFormData);
      }

      // 3. Call AI cross-channel report
      setRunningAI(true);
      setAiError(null);
      try {
        const res = await fetch("/api/cross-channel-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign_id: campaignId, week_number: nextWeek }),
        });
        if (!res.ok) {
          const errData = await res.json();
          setAiError(errData.error ?? "AI inference failed");
        }
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "Network error");
      } finally {
        setRunningAI(false);
      }
    });
  }

  const actions: string[] = activeReport
    ? (() => {
        try { return JSON.parse(activeReport.ai_recommended_actions); }
        catch { return activeReport.ai_recommended_actions ? activeReport.ai_recommended_actions.split("\n").filter(Boolean) : []; }
      })()
    : [];

  if (campaignChannels.length === 0) {
    return (
      <p className="text-sm text-neutral-400 text-center py-4">
        Set up channels in the Channel Setup tab first.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Log this week ── */}
      <div>
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          Log Week {nextWeek} — All Channels
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitWeek(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          {/* Week date */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Week of (date)</label>
              <input
                type="date"
                name="week_of"
                className={inputClass}
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Budget Allocated (RM)</label>
              <input type="number" name="budget_allocated" className={inputClass} step="100" placeholder="e.g. 50000" />
            </div>
            <div>
              <label className={labelClass}>Budget Deployed (RM)</label>
              <input type="number" name="budget_deployed" className={inputClass} step="100" placeholder="e.g. 45000" />
            </div>
          </div>

          {/* Per-channel metric entry */}
          <div className="space-y-2">
            {FUNNEL_ROLES.map(role => {
              const channels = campaignChannels.filter(c => c.channel_role === role);
              if (channels.length === 0) return null;
              return (
                <div key={role}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 inline-flex px-2 py-0.5 rounded border ${ROLE_COLOR[role]}`}>
                    {role}
                  </p>
                  {channels.map(ch => (
                    <div key={ch.id} className="border border-neutral-200 rounded-md p-3 bg-white mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-neutral-800">{ch.channel_name}</span>
                        {ch.is_primary && (
                          <span className="text-xs bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded">Primary</span>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelClass}>
                            {ch.signal_proxy_label || "Signal Proxy Value"}
                          </label>
                          <input
                            type="number"
                            name={`spv_${ch.id}`}
                            className={inputClass}
                            step="0.01"
                            placeholder="Value"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Engagement Rate (%)</label>
                          <input
                            type="number"
                            name={`eng_${ch.id}`}
                            className={inputClass}
                            step="0.1"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Health</label>
                          <select name={`health_${ch.id}`} className={inputClass}>
                            <option value="Green">🟢 Green</option>
                            <option value="Amber">🟡 Amber</option>
                            <option value="Red">🔴 Red</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Idea integrity note */}
          <div>
            <label className={labelClass}>Idea Integrity Observation (your read — not AI)</label>
            <textarea
              name="idea_integrity_note"
              className={`${inputClass} min-h-[64px]`}
              placeholder="Is the big idea holding coherently across all active channels this week? Note any drift."
            />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className={buttonClass} disabled={isPending || runningAI}>
              {runningAI ? "Generating cross-channel report…" : isPending ? "Saving…" : "Save & Run Cross-Channel Report"}
            </button>
          </div>

          {aiError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              Couldn't generate report: {aiError}
            </p>
          )}
        </form>
      </div>

      {/* ── Historical reports ── */}
      {reports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
              Weekly Cross-Channel Reports
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {reports.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveReport(r)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    activeReport?.id === r.id
                      ? "bg-neutral-800 text-white border-neutral-800"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  W{r.week_number}
                </button>
              ))}
            </div>
          </div>

          {activeReport && (
            <div className="space-y-4">
              {/* Dominant funnel gap + idea integrity */}
              <div className="grid sm:grid-cols-2 gap-3">
                {activeReport.dominant_funnel_gap && activeReport.dominant_funnel_gap !== "None" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs font-semibold text-red-700 mb-0.5">Dominant Funnel Gap</p>
                    <p className="text-sm font-bold text-red-800">{activeReport.dominant_funnel_gap}</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      This stage has the most critical cross-channel shortfall this week.
                    </p>
                  </div>
                )}
                {activeReport.idea_integrity_score && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                    <p className="text-xs font-semibold text-neutral-600 mb-1">
                      Idea Integrity — Week {activeReport.week_number}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-neutral-800">
                        {activeReport.idea_integrity_score}/5
                      </span>
                      <span className="text-xs text-neutral-500">
                        {INTEGRITY_LABEL[activeReport.idea_integrity_score]}
                      </span>
                    </div>
                    {activeReport.idea_integrity_note && (
                      <p className="text-xs text-neutral-500 mt-1.5 italic">
                        "{activeReport.idea_integrity_note}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Budget utilisation */}
              {(activeReport.budget_allocated || activeReport.budget_deployed) && (
                <div className="flex gap-6 p-3 border border-neutral-200 rounded-md text-xs">
                  <div>
                    <p className="text-neutral-400">Allocated</p>
                    <p className="font-semibold text-neutral-800">
                      RM {activeReport.budget_allocated?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Deployed</p>
                    <p className="font-semibold text-neutral-800">
                      RM {activeReport.budget_deployed?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                  {activeReport.budget_allocated && activeReport.budget_deployed && (
                    <div>
                      <p className="text-neutral-400">Utilisation</p>
                      <p className="font-semibold text-neutral-800">
                        {Math.round((activeReport.budget_deployed / activeReport.budget_allocated) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI narrative */}
              {activeReport.ai_narrative && (
                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                    <p className="text-xs font-semibold text-neutral-600 mb-1.5">
                      Cross-Channel Intelligence Read — Week {activeReport.week_number}
                    </p>
                    <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                      {activeReport.ai_narrative}
                    </p>
                  </div>
                  {actions.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                      <p className="text-xs font-semibold text-blue-800 mb-2">Recommended Actions</p>
                      <ol className="space-y-1.5 text-xs text-blue-900">
                        {actions.map((action: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="shrink-0 font-mono font-semibold text-blue-500">{i + 1}.</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function CrossChannelSection({
  campaignId,
  campaignChannels,
  channelReports,
  allChannelProfiles,
}: {
  campaignId: string;
  campaignChannels: CampaignChannelWithProfile[];
  channelReports: CrossChannelReport[];
  allChannelProfiles: ChannelProfile[];
}) {
  const [tab, setTab] = useState<"setup" | "weekly">("setup");
  const channelCount = campaignChannels.length;
  const reportCount = channelReports.length;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <SectionTitle id="cross-channel">Cross-Channel Intelligence Hub</SectionTitle>
          <p className="text-xs text-neutral-400 mt-0.5">
            Track signal contribution per channel and generate AI cross-channel narrative. Internal only.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {channelCount > 0 && (
            <Badge tone="neutral">{channelCount} channel{channelCount !== 1 ? "s" : ""}</Badge>
          )}
          {reportCount > 0 && (
            <Badge tone="neutral">{reportCount} week{reportCount !== 1 ? "s" : ""}</Badge>
          )}
        </div>
      </div>

      {/* Internal-only notice */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-amber-50 border border-amber-100 mb-4 text-xs text-amber-700">
        <span>⚿</span>
        <span>ShiftImpact team only — not visible to clients.</span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 border-b border-neutral-100 pb-2">
        <button
          type="button"
          onClick={() => setTab("setup")}
          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
            tab === "setup" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Channel Setup {channelCount > 0 ? `(${channelCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("weekly")}
          disabled={channelCount === 0}
          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            tab === "weekly" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Weekly Hub {reportCount > 0 ? `(${reportCount} weeks)` : ""}
        </button>
        {channelCount === 0 && (
          <p className="text-xs text-neutral-400 self-center ml-2">
            Add channels first to start weekly tracking
          </p>
        )}
      </div>

      {tab === "setup" && (
        <ChannelSetupPanel
          campaignId={campaignId}
          campaignChannels={campaignChannels}
          allChannelProfiles={allChannelProfiles}
        />
      )}
      {tab === "weekly" && channelCount > 0 && (
        <WeeklyHubPanel
          campaignId={campaignId}
          campaignChannels={campaignChannels}
          reports={channelReports}
        />
      )}
    </Card>
  );
}
