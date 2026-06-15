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
import type { ClientChannel, FrameBrief, IdeaExtension } from "@/lib/types";

const STATUS_TONE: Record<string, "neutral" | "amber" | "green"> = {
  Draft: "neutral",
  Ready: "amber",
  Approved: "green",
};

const CATEGORY_OPTIONS = ["Radio", "KOL", "Retail", "Digital", "PR", "CRM", "Custom"] as const;

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
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{ext.channel_name}</span>
          <span className="text-xs text-neutral-400">{ext.channel_category}</span>
          {ext.ai_generated && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">AI</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[ext.status]}>{ext.status}</Badge>
          <span className="text-neutral-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-3 py-3">
          {/* FRAME inheritance display */}
          <div className="mb-3 p-2 bg-neutral-50 rounded text-xs space-y-1">
            <div><span className="text-neutral-400">Anchor:</span> <span className="text-neutral-700">{ext.frame_anchor}</span></div>
            <div><span className="text-neutral-400">Mood:</span> <span className="text-neutral-700">{ext.mood_register}</span></div>
            <div><span className="text-neutral-400">Clarity:</span> <span className="text-neutral-700">{ext.clarity_statement}</span></div>
          </div>

          <form action={updateAction} className="space-y-2">
            <div>
              <label className={labelClass}>Channel Brief</label>
              <textarea
                className={inputClass}
                name="brief_body"
                rows={8}
                defaultValue={ext.brief_body}
                placeholder="Write the channel-specific brief here…"
              />
            </div>
            <div>
              <label className={labelClass}>Propagation Mechanism</label>
              <textarea
                className={inputClass}
                name="propagation_mechanism"
                rows={2}
                defaultValue={ext.propagation_mechanism}
                placeholder="What does this channel execution do to earn the audience's movement to the next stage?"
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} name="status" defaultValue={ext.status}>
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
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
        // Reload page to show the new extension
        window.location.reload();
      }
    } catch {
      setGenError("Network error — generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <Card>
      <SectionTitle id="idea-extensions">Idea Extensions</SectionTitle>
      <p className="text-xs text-neutral-400 mb-1">
        The Big Idea translated into every channel touchpoint. Each brief inherits the FRAME anchor — drift becomes visible immediately.
      </p>
      {!frameLocked && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-3">
          Lock the FRAME Brief before generating channel briefs. This ensures the anchor is final.
        </p>
      )}

      {genError && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-3">{genError}</p>
      )}

      {/* Existing extensions */}
      {extensions.length > 0 && (
        <div className="space-y-2 mb-4">
          {extensions.map((ext) => (
            <ExtensionCard key={ext.id} ext={ext} campaignId={campaignId} />
          ))}
        </div>
      )}

      {extensions.length === 0 && (
        <p className="text-sm text-neutral-500 mb-4">No channel briefs yet. Generate from your channel registry below.</p>
      )}

      {/* Generate from channel registry */}
      {clientChannels.length > 0 && (
        <div className="border border-neutral-100 rounded-md p-3 mb-3">
          <p className="text-xs font-semibold text-neutral-700 mb-2">Generate from Channel Registry</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {clientChannels.map((ch) => {
              const alreadyExists = extensions.some((e) => e.channel_name === ch.channel_name);
              const isGenerating = generating === ch.id;
              return (
                <div key={ch.id} className="flex items-center justify-between border border-neutral-200 rounded px-2 py-1.5 text-xs">
                  <div>
                    <span className="font-medium text-neutral-700">{ch.channel_name}</span>
                    <span className="ml-1 text-neutral-400">({ch.channel_category})</span>
                  </div>
                  <button
                    type="button"
                    disabled={isGenerating || !frameLocked}
                    onClick={() => handleGenerate(ch)}
                    className={`ml-2 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      alreadyExists
                        ? "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                        : "bg-neutral-900 text-white hover:bg-neutral-700"
                    } disabled:opacity-40`}
                  >
                    {isGenerating ? "Generating…" : alreadyExists ? "Re-generate" : "Generate AI Brief"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          {/* Pass FRAME fields as hidden inputs */}
          <input type="hidden" name="frame_anchor" value={frame.anchor} />
          <input type="hidden" name="mood_register" value={frame.mood} />
          <input type="hidden" name="clarity_statement" value={frame.clarity_statement} />
          <div>
            <label className={labelClass}>Channel Brief</label>
            <textarea className={inputClass} name="brief_body" rows={6} placeholder="Write the channel-specific translation of the Big Idea…" />
          </div>
          <div>
            <label className={labelClass}>Propagation Mechanism</label>
            <textarea className={inputClass} name="propagation_mechanism" rows={2} placeholder="What does this channel do to earn movement to the next stage?" />
          </div>
          <button type="submit" className={buttonClass}>Add Brief</button>
        </form>
      )}
    </Card>
  );
}
