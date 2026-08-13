"use client";

import { useState } from "react";
import { createIdeaExtension, updateIdeaExtension, deleteIdeaExtension } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import type { ChannelRole, ClientChannel, FrameBrief, IdeaExtension } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, "neutral" | "amber" | "green"> = {
  Draft: "neutral",
  Ready: "amber",
  Approved: "green",
};

const CHANNEL_ROLE_OPTIONS: ChannelRole[] = ["Demand", "Nurture", "Conversion", "Retention"];

// Funnel stage colour coding — maps role to a consistent visual tag
const ROLE_STYLE: Record<ChannelRole, string> = {
  Demand:     "bg-blue-100 text-blue-700",
  Nurture:    "bg-purple-100 text-purple-700",
  Conversion: "bg-emerald-100 text-emerald-700",
  Retention:  "bg-amber-100 text-amber-700",
};

const CATEGORY_OPTIONS = ["Radio", "KOL", "Retail", "Digital", "PR", "CRM", "Custom"] as const;

// ─── ExtensionCard ────────────────────────────────────────────────────────────

function ExtensionCard({
  ext,
  campaignId,
}: {
  ext: IdeaExtension;
  campaignId: string;
}) {
  const [open, setOpen] = useState(false);
  const updateAction = updateIdeaExtension.bind(null, ext.id, campaignId);
  const deleteAction = deleteIdeaExtension.bind(null, ext.id, campaignId);

  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden">
      {/* Collapsed header — shows expression name, channel, role tag, status */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Expression name (creative hook) — the Big Idea in this channel */}
          <span className="text-sm font-semibold text-neutral-800 truncate">
            {ext.expression_name || ext.channel_name}
          </span>
          {ext.expression_name && (
            <span className="text-xs text-neutral-400 hidden sm:inline truncate">
              {ext.channel_name}
            </span>
          )}
          {/* Channel role pill */}
          {ext.channel_role && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ROLE_STYLE[ext.channel_role]} shrink-0`}>
              {ext.channel_role}
            </span>
          )}
          {ext.ai_generated && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded shrink-0">AI</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={STATUS_TONE[ext.status]}>{ext.status}</Badge>
          <span className="text-neutral-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-3 py-3">
          {/* FRAME inheritance — always visible, reminds writer what anchor to hold */}
          <div className="mb-3 p-2 bg-neutral-50 rounded text-xs space-y-1">
            <p className="font-semibold text-neutral-500 mb-1">FRAME anchor (inherited — must hold)</p>
            <div><span className="text-neutral-400">Anchor:</span> <span className="text-neutral-700">{ext.frame_anchor}</span></div>
            <div><span className="text-neutral-400">Mood:</span> <span className="text-neutral-700">{ext.mood_register}</span></div>
            <div><span className="text-neutral-400">Clarity:</span> <span className="text-neutral-700">{ext.clarity_statement}</span></div>
          </div>

          <form action={updateAction} className="space-y-3">
            {/* Expression Name — how the Big Idea is named/expressed in this channel */}
            <div>
              <label className={labelClass}>Expression Name</label>
              <p className="text-xs text-neutral-400 mb-1">
                Short creative label for how the idea lives in this channel. This is NOT the brief — it's the creative name.
                (e.g. "First Attempt Challenge", "The Smash Moment", "Silence is Loud")
              </p>
              <input
                className={inputClass}
                name="expression_name"
                defaultValue={ext.expression_name}
                placeholder="e.g. First Attempt Challenge"
              />
            </div>

            {/* Channel Role — which funnel stage this channel serves */}
            <div>
              <label className={labelClass}>Channel Role</label>
              <p className="text-xs text-neutral-400 mb-1">
                Which stage of the funnel does this channel primarily execute at? Multiple channels can serve the same stage.
              </p>
              <select className={inputClass} name="channel_role" defaultValue={ext.channel_role ?? ""}>
                <option value="">— Select role —</option>
                {CHANNEL_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Channel Brief */}
            <div>
              <label className={labelClass}>Channel Brief</label>
              <textarea
                className={inputClass}
                name="brief_body"
                rows={7}
                defaultValue={ext.brief_body}
                placeholder="Write the channel-specific translation of the Big Idea here. The idea must be the same — only the format and mechanic change."
              />
            </div>

            {/* Propagation Mechanism */}
            <div>
              <label className={labelClass}>Propagation Mechanism</label>
              <p className="text-xs text-neutral-400 mb-1">
                What does this channel execution do to earn the audience's movement to the next stage?
              </p>
              <textarea
                className={inputClass}
                name="propagation_mechanism"
                rows={2}
                defaultValue={ext.propagation_mechanism}
                placeholder="e.g. 'UGC propagates through the tension it resolves — first-cook pride is inherently shareable.'"
              />
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} name="status" defaultValue={ext.status}>
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className={buttonClass}>Save</button>
              <form action={deleteAction}>
                <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                  Remove
                </button>
              </form>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── ChannelRegistryPopup ─────────────────────────────────────────────────────
// Hidden behind a button — prevents the registry list from adding visual length
// to the page when the user already has briefs or doesn't need to generate more.

function ChannelRegistryPopup({
  clientChannels,
  extensions,
  frameLocked,
  onGenerate,
  generating,
}: {
  clientChannels: ClientChannel[];
  extensions: IdeaExtension[];
  frameLocked: boolean;
  onGenerate: (ch: ClientChannel) => void;
  generating: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (clientChannels.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        type="button"
        className={`${buttonSecondaryClass} text-xs`}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide Channel Registry" : `+ Generate from Channel Registry (${clientChannels.length})`}
      </button>

      {open && (
        <div className="mt-2 border border-neutral-200 rounded-md p-3 bg-neutral-50">
          <p className="text-xs font-semibold text-neutral-700 mb-2">
            Client Channel Registry — click to generate an AI brief
          </p>
          {!frameLocked && (
            <p className="text-xs text-amber-700 mb-2">
              Lock the FRAME Brief first. This ensures the AI brief inherits the correct anchor.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {clientChannels.map((ch) => {
              const alreadyExists = extensions.some((e) => e.channel_name === ch.channel_name);
              const isGenerating = generating === ch.id;
              return (
                <div
                  key={ch.id}
                  className="flex items-center justify-between border border-neutral-200 bg-white rounded px-2 py-1.5 text-xs"
                >
                  <div>
                    <span className="font-medium text-neutral-700">{ch.channel_name}</span>
                    <span className="ml-1 text-neutral-400">({ch.channel_category})</span>
                  </div>
                  <button
                    type="button"
                    disabled={isGenerating || !frameLocked}
                    onClick={() => onGenerate(ch)}
                    className={`ml-2 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      alreadyExists
                        ? "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                        : "bg-neutral-900 text-white hover:bg-neutral-700"
                    } disabled:opacity-40`}
                  >
                    {isGenerating ? "Generating…" : alreadyExists ? "Re-generate" : "Generate"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IdeaExtensionsSection ────────────────────────────────────────────────────

export function IdeaExtensionsSection({
  campaignId,
  frame,
  extensions,
  clientChannels,
}: {
  campaignId: string;
  frame: FrameBrief;
  extensions: IdeaExtension[];
  clientChannels: ClientChannel[];
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const createAction = createIdeaExtension.bind(null, campaignId);

  const frameLocked = frame.lock_status === "Locked";

  async function handleGenerate(channel: ClientChannel) {
    if (!frameLocked) {
      setGenError("FRAME Brief must be locked before generating channel briefs.");
      return;
    }
    setGenerating(channel.id);
    setGenError(null);
    try {
      const res = await fetch("/api/generate-extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          channel_name: channel.channel_name,
          channel_category: channel.channel_category,
          translation_hint: channel.translation_hint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Generation failed.");
      } else {
        window.location.reload();
      }
    } catch {
      setGenError("Network error — generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  // Build a quick idea-integrity summary for the section header
  // Shows count of briefs per channel role
  const roleCounts = extensions.reduce<Record<string, number>>((acc, e) => {
    if (e.channel_role) acc[e.channel_role] = (acc[e.channel_role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      <SectionTitle id="idea-extensions">Idea Extensions</SectionTitle>
      <p className="text-xs text-neutral-400 mb-1">
        One Big Idea — many channels. Each brief inherits the FRAME anchor. Channel Role shows which funnel stage
        each channel serves. Drift from anchor becomes visible immediately.
      </p>

      {/* Role summary — shows funnel coverage at a glance */}
      {extensions.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {(["Demand", "Nurture", "Conversion", "Retention"] as ChannelRole[]).map((role) =>
            roleCounts[role] ? (
              <span
                key={role}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLE[role]}`}
              >
                {role} × {roleCounts[role]}
              </span>
            ) : null
          )}
          {Object.keys(roleCounts).length < extensions.length && (
            <span className="text-xs text-neutral-400">
              {extensions.length - Object.values(roleCounts).reduce((a, b) => a + b, 0)} without role
            </span>
          )}
        </div>
      )}

      {!frameLocked && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-3">
          Lock the FRAME Brief before generating channel briefs. This ensures every brief inherits the correct anchor.
        </p>
      )}

      {genError && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-3">{genError}</p>
      )}

      {/* Existing extension cards */}
      {extensions.length > 0 ? (
        <div className="space-y-2 mb-4">
          {extensions.map((ext) => (
            <ExtensionCard key={ext.id} ext={ext} campaignId={campaignId} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 mb-4">
          No channel briefs yet. Generate from your channel registry below, or add manually.
        </p>
      )}

      {/* Channel registry — behind popup to reduce visual length */}
      <ChannelRegistryPopup
        clientChannels={clientChannels}
        extensions={extensions}
        frameLocked={frameLocked}
        onGenerate={handleGenerate}
        generating={generating}
      />

      {/* Manual add */}
      <button
        type="button"
        className={`${buttonSecondaryClass} text-xs`}
        onClick={() => setShowManual((v) => !v)}
      >
        {showManual ? "Hide" : "+ Add custom channel brief manually"}
      </button>

      {showManual && (
        <form action={createAction} className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
          <p className="text-xs font-medium text-neutral-500">New Channel Brief</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Channel Name</label>
              <input className={inputClass} name="channel_name" placeholder="e.g. Drive-thru Menu Board" required />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select className={inputClass} name="channel_category" defaultValue="Custom">
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Expression Name</label>
            <input
              className={inputClass}
              name="expression_name"
              placeholder="e.g. The Smash Moment"
            />
          </div>
          <div>
            <label className={labelClass}>Channel Role</label>
            <select className={inputClass} name="channel_role" defaultValue="">
              <option value="">— Select role —</option>
              {CHANNEL_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {/* Pass FRAME fields as hidden inputs */}
          <input type="hidden" name="frame_anchor" value={frame.anchor} />
          <input type="hidden" name="mood_register" value={frame.mood} />
          <input type="hidden" name="clarity_statement" value={frame.clarity_statement} />
          <div>
            <label className={labelClass}>Channel Brief</label>
            <textarea
              className={inputClass}
              name="brief_body"
              rows={6}
              placeholder="Write the channel-specific translation of the Big Idea…"
            />
          </div>
          <div>
            <label className={labelClass}>Propagation Mechanism</label>
            <textarea
              className={inputClass}
              name="propagation_mechanism"
              rows={2}
              placeholder="What does this channel do to earn movement to the next stage?"
            />
          </div>
          <button type="submit" className={buttonClass}>Add Brief</button>
        </form>
      )}
    </Card>
  );
}
