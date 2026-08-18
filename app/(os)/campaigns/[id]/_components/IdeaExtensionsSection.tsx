"use client";

// IdeaExtensionsSection.tsx
// Sprint 30+ · Upgraded channel brief system
//
// v2 brief structure (stored as JSON in brief_body):
//   idea_spine, concept_rationale, win_conditions, propagation_mechanism,
//   cog_lens, cfo_lens, cco_lens, anchor_integrity_check, do_not, client_notes
//
// v1 briefs (plain text brief_body) continue to render in legacy mode.
// Auto-loads all client channels — no popup required.

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
import type { BigIdeaPlatform, ChannelRole, ClientChannel, FrameBrief, IdeaExtension } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface V2Brief {
  __v: 2;
  idea_spine: string;
  concept_rationale: string;
  win_conditions: string;
  propagation_mechanism: string;
  strategic_recommendation?: string;
  // legacy lens fields — kept for backwards compat, not rendered
  cog_lens?: string;
  cfo_lens?: string;
  cco_lens?: string;
  anchor_integrity_check: string;
  do_not: string;
  client_notes: string;
}

function parseV2(brief_body: string): V2Brief | null {
  try {
    const parsed = JSON.parse(brief_body);
    if (parsed.__v === 2) return parsed as V2Brief;
    return null;
  } catch {
    return null;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, "neutral" | "amber" | "green"> = {
  Draft: "neutral",
  Ready: "amber",
  Approved: "green",
};

const CHANNEL_ROLE_OPTIONS: ChannelRole[] = ["Demand", "Nurture", "Conversion", "Retention"];

const ROLE_STYLE: Record<ChannelRole, string> = {
  Demand:     "bg-blue-100 text-blue-700",
  Nurture:    "bg-purple-100 text-purple-700",
  Conversion: "bg-emerald-100 text-emerald-700",
  Retention:  "bg-amber-100 text-amber-700",
};

const CATEGORY_OPTIONS = ["Radio", "KOL", "Retail", "Digital", "PR", "CRM", "Custom"] as const;

// ─── Section label ────────────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1">
      <label className={labelClass}>{children}</label>
      {hint && <p className="text-xs text-neutral-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── V2 ExtensionCard ─────────────────────────────────────────────────────────

function V2ExtensionCard({
  ext,
  v2,
  campaignId,
  bip,
  onRegenerate,
  isRegenerating,
}: {
  ext: IdeaExtension;
  v2: V2Brief;
  campaignId: string;
  bip: BigIdeaPlatform | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const updateAction = updateIdeaExtension.bind(null, ext.id, campaignId);

  const taClass = `${inputClass} resize-none`;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      {/* ── Collapsed header ───────────────────────────────────────────── */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-neutral-800 truncate">
            {ext.expression_name || ext.channel_name}
          </span>
          {ext.expression_name && (
            <span className="text-xs text-neutral-400 hidden sm:inline truncate">{ext.channel_name}</span>
          )}
          {ext.channel_role && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${ROLE_STYLE[ext.channel_role]}`}>
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

      {/* ── Expanded body ──────────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-neutral-100">
          {/* Context reference bar — FRAME + BIP */}
          <div className="px-3 py-2.5 bg-neutral-50 border-b border-neutral-100 space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">FRAME + BIP context (inherited)</p>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              <div><span className="text-neutral-400">Anchor:</span> <span className="text-neutral-700">{ext.frame_anchor}</span></div>
              <div><span className="text-neutral-400">Mood:</span> <span className="text-neutral-700">{ext.mood_register}</span></div>
              <div className="sm:col-span-2"><span className="text-neutral-400">Clarity:</span> <span className="text-neutral-700">{ext.clarity_statement}</span></div>
              {bip?.topline_idea && (
                <div className="sm:col-span-2"><span className="text-neutral-400">BIP:</span> <span className="text-neutral-700">{bip.topline_idea}</span></div>
              )}
              {bip?.brand_role && (
                <div className="sm:col-span-2"><span className="text-neutral-400">Brand Role:</span> <span className="text-neutral-700">{bip.brand_role}</span></div>
              )}
            </div>
          </div>

          {/* Main form */}
          <form action={updateAction} className="px-3 py-3 space-y-4">
            {/* Version flag */}
            <input type="hidden" name="__brief_version" value="2" />

            {/* ── Basic fields ──────────────────────────────────────────── */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <FieldLabel hint="Short creative label for how the idea lives in this channel.">
                  Expression Name
                </FieldLabel>
                <input className={inputClass} name="expression_name" defaultValue={ext.expression_name} placeholder="e.g. First Attempt Challenge" />
              </div>
              <div>
                <FieldLabel hint="Which funnel stage does this channel execute at?">
                  Channel Role
                </FieldLabel>
                <select className={inputClass} name="channel_role" defaultValue={ext.channel_role ?? ""}>
                  <option value="">— Select role —</option>
                  {CHANNEL_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── The Idea Spine ────────────────────────────────────────── */}
            <div className="border border-neutral-100 rounded-xl p-3 bg-white space-y-2">
              <FieldLabel hint="The connective tissue between the Big Idea and this channel. One strong sentence.">
                The Idea Spine
              </FieldLabel>
              <textarea className={taClass} name="idea_spine" rows={2} defaultValue={v2.idea_spine} placeholder="How the Big Idea lives in this channel specifically — must trace to the FRAME anchor." />
            </div>

            {/* ── Concept Rationale ─────────────────────────────────────── */}
            <div className="border border-neutral-100 rounded-xl p-3 bg-white space-y-2">
              <FieldLabel hint="Why this channel for this idea at this funnel stage.">
                Concept Rationale
              </FieldLabel>
              <textarea className={taClass} name="concept_rationale" rows={3} defaultValue={v2.concept_rationale} placeholder="What does this channel uniquely do that others cannot?" />
            </div>

            {/* ── Win Conditions ────────────────────────────────────────── */}
            <div className="border border-amber-100 rounded-xl p-3 bg-amber-50 space-y-2">
              <FieldLabel hint="What it takes to win in this channel environment — pre-baked benchmarks + campaign-specific reads.">
                Win Conditions
              </FieldLabel>
              <textarea className={`${taClass} bg-white`} name="win_conditions" rows={4} defaultValue={v2.win_conditions} placeholder="Conditions, KPIs, and watchouts for winning in this channel." />
            </div>

            {/* ── Propagation Mechanism ─────────────────────────────────── */}
            <div className="border border-neutral-100 rounded-xl p-3 bg-white space-y-2">
              <FieldLabel hint="What does this channel execution do to earn audience movement to the next stage?">
                Propagation Mechanism
              </FieldLabel>
              <textarea className={taClass} name="propagation_mechanism" rows={2} defaultValue={v2.propagation_mechanism} placeholder="Specific mechanism — not a general description." />
            </div>

            {/* ── Strategic Recommendation ──────────────────────────────── */}
            <div className="border border-neutral-200 rounded-xl p-3 bg-white space-y-2">
              <FieldLabel hint="The integrated brief recommendation — what to do, why it works, and what proof of success looks like. CoG, CFO, and CCO lenses are baked in.">
                Strategic Recommendation
              </FieldLabel>
              <textarea className={taClass} name="strategic_recommendation" rows={4} defaultValue={v2.strategic_recommendation ?? ""} placeholder="The output the team acts on — growth signal, spend defensibility, and creative standard in one read." />
            </div>

            {/* ── Anchor Integrity Check ────────────────────────────────── */}
            <div className="border border-red-100 rounded-xl p-3 bg-red-50 space-y-2">
              <FieldLabel hint="The single biggest risk of idea drift in this channel. What would lose the FRAME anchor?">
                Anchor Integrity Check
              </FieldLabel>
              <textarea className={`${taClass} bg-white`} name="anchor_integrity_check" rows={2} defaultValue={v2.anchor_integrity_check} placeholder="Drift risk assessment." />
              <div>
                <FieldLabel>Do Not</FieldLabel>
                <input
                  className={inputClass}
                  name="do_not"
                  defaultValue={v2.do_not}
                  placeholder="One line: what must NEVER appear in this execution."
                />
              </div>
            </div>

            {/* ── Client and Strategy Notes ─────────────────────────────── */}
            <div className="border border-blue-100 rounded-xl p-3 bg-blue-50 space-y-2">
              <FieldLabel hint="Add context from client briefings, market intel, or strategy calls to strengthen this brief.">
                Client and Strategy Notes
              </FieldLabel>
              <textarea className={`${taClass} bg-white`} name="client_notes" rows={3} defaultValue={v2.client_notes} placeholder="Add additional context — client constraints, budget bands, local market nuance, agency notes." />
            </div>

            {/* ── Status + Actions ──────────────────────────────────────── */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <select className={`${inputClass} w-auto`} name="status" defaultValue={ext.status}>
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Approved">Approved</option>
              </select>
              <button type="submit" className={buttonClass}>Save Brief</button>
              <button
                type="button"
                disabled={isRegenerating}
                onClick={onRegenerate}
                className={`${buttonSecondaryClass} text-xs disabled:opacity-40`}
              >
                {isRegenerating ? "Regenerating…" : "Re-generate with AI"}
              </button>
              <form action={deleteIdeaExtension.bind(null, ext.id, campaignId)}>
                <button type="submit" className="text-xs text-neutral-400 hover:text-red-600 transition-colors">
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

// ─── V1 (Legacy) ExtensionCard ────────────────────────────────────────────────

function V1ExtensionCard({
  ext,
  campaignId,
  onUpgrade,
  isUpgrading,
}: {
  ext: IdeaExtension;
  campaignId: string;
  onUpgrade: () => void;
  isUpgrading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const updateAction = updateIdeaExtension.bind(null, ext.id, campaignId);

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-neutral-800 truncate">
            {ext.expression_name || ext.channel_name}
          </span>
          {ext.channel_role && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${ROLE_STYLE[ext.channel_role]}`}>
              {ext.channel_role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">Legacy brief</span>
          <Badge tone={STATUS_TONE[ext.status]}>{ext.status}</Badge>
          <span className="text-neutral-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-3 py-3">
          <div className="mb-3 p-2 bg-neutral-50 rounded text-xs space-y-1">
            <p className="font-semibold text-neutral-500 mb-1">FRAME anchor (inherited)</p>
            <div><span className="text-neutral-400">Anchor:</span> <span className="text-neutral-700">{ext.frame_anchor}</span></div>
            <div><span className="text-neutral-400">Mood:</span> <span className="text-neutral-700">{ext.mood_register}</span></div>
          </div>
          <form action={updateAction} className="space-y-3">
            <input type="hidden" name="__brief_version" value="1" />
            <div>
              <label className={labelClass}>Expression Name</label>
              <input className={inputClass} name="expression_name" defaultValue={ext.expression_name} />
            </div>
            <div>
              <label className={labelClass}>Channel Role</label>
              <select className={inputClass} name="channel_role" defaultValue={ext.channel_role ?? ""}>
                <option value="">— Select role —</option>
                {CHANNEL_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Channel Brief</label>
              <textarea className={inputClass} name="brief_body" rows={7} defaultValue={ext.brief_body} />
            </div>
            <div>
              <label className={labelClass}>Propagation Mechanism</label>
              <textarea className={inputClass} name="propagation_mechanism" rows={2} defaultValue={ext.propagation_mechanism} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} name="status" defaultValue={ext.status}>
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button type="submit" className={buttonClass}>Save</button>
              <button
                type="button"
                disabled={isUpgrading}
                onClick={onUpgrade}
                className={`${buttonSecondaryClass} text-xs disabled:opacity-40`}
              >
                {isUpgrading ? "Upgrading…" : "Upgrade to Full Brief ✦"}
              </button>
              <form action={deleteIdeaExtension.bind(null, ext.id, campaignId)}>
                <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">Remove</button>
              </form>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Unbriefed channel row ────────────────────────────────────────────────────

function UnbriefedChannelRow({
  channel,
  frameLocked,
  onGenerate,
  isGenerating,
}: {
  channel: ClientChannel;
  frameLocked: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border border-dashed border-neutral-200 rounded-xl bg-neutral-50">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-700">{channel.channel_name}</p>
        <p className="text-xs text-neutral-400">{channel.channel_category}{channel.translation_hint ? ` · ${channel.translation_hint}` : ""}</p>
      </div>
      <button
        type="button"
        disabled={isGenerating || !frameLocked}
        onClick={onGenerate}
        title={!frameLocked ? "Lock FRAME Brief first" : "Generate full structured brief"}
        className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-700 disabled:opacity-40 transition-colors"
      >
        {isGenerating ? "Generating…" : "Generate Brief"}
      </button>
    </div>
  );
}

// ─── IdeaExtensionsSection ────────────────────────────────────────────────────

export function IdeaExtensionsSection({
  campaignId,
  frame,
  bip,
  extensions,
  clientChannels,
}: {
  campaignId: string;
  frame: FrameBrief;
  bip: BigIdeaPlatform | null;
  extensions: IdeaExtension[];
  clientChannels: ClientChannel[];
}) {
  const [generating, setGenerating] = useState<string | null>(null); // channel id being generated
  const [genError, setGenError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const createAction = createIdeaExtension.bind(null, campaignId);

  const frameLocked = frame.lock_status === "Locked";

  // Determine which client channels are already briefed
  const briefedChannelNames = new Set(extensions.map((e) => e.channel_name));
  const unbriefedChannels = clientChannels.filter((ch) => !briefedChannelNames.has(ch.channel_name));

  async function handleGenerate(channel: ClientChannel) {
    if (!frameLocked) {
      setGenError("Lock the FRAME Brief first to ensure channel briefs inherit the correct anchor.");
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

  // Role coverage summary
  const roleCounts = extensions.reduce<Record<string, number>>((acc, e) => {
    if (e.channel_role) acc[e.channel_role] = (acc[e.channel_role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      <SectionTitle id="idea-extensions">Idea Extensions</SectionTitle>
      <p className="text-xs text-neutral-400 mb-1">
        One Big Idea — many channels. Each brief inherits the FRAME anchor. Channel Role shows which funnel stage each channel serves. Drift from anchor becomes visible immediately.
      </p>

      {/* Role coverage summary */}
      {extensions.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {(["Demand", "Nurture", "Conversion", "Retention"] as ChannelRole[]).map((role) =>
            roleCounts[role] ? (
              <span key={role} className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLE[role]}`}>
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

      {/* Briefed channels */}
      {extensions.length > 0 ? (
        <div className="space-y-2 mb-4">
          {extensions.map((ext) => {
            const v2 = parseV2(ext.brief_body);
            if (v2) {
              return (
                <V2ExtensionCard
                  key={ext.id}
                  ext={ext}
                  v2={v2}
                  campaignId={campaignId}
                  bip={bip}
                  onRegenerate={() => handleGenerate(
                    clientChannels.find((c) => c.channel_name === ext.channel_name) ?? {
                      id: ext.id,
                      client_id: "",
                      channel_name: ext.channel_name,
                      channel_category: ext.channel_category,
                      translation_hint: "",
                      active: true,
                      created_at: "",
                    }
                  )}
                  isRegenerating={generating === ext.id || generating === clientChannels.find((c) => c.channel_name === ext.channel_name)?.id}
                />
              );
            }
            return (
              <V1ExtensionCard
                key={ext.id}
                ext={ext}
                campaignId={campaignId}
                onUpgrade={() => handleGenerate(
                  clientChannels.find((c) => c.channel_name === ext.channel_name) ?? {
                    id: ext.id,
                    client_id: "",
                    channel_name: ext.channel_name,
                    channel_category: ext.channel_category,
                    translation_hint: "",
                    active: true,
                    created_at: "",
                  }
                )}
                isUpgrading={generating === ext.id || generating === clientChannels.find((c) => c.channel_name === ext.channel_name)?.id}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 mb-4">
          No channel briefs yet. Generate from your channel registry below, or add manually.
        </p>
      )}

      {/* Unbriefed channels — auto-shown, no popup */}
      {unbriefedChannels.length > 0 && (
        <div className="space-y-2 mb-4">
          {unbriefedChannels.map((ch) => (
            <UnbriefedChannelRow
              key={ch.id}
              channel={ch}
              frameLocked={frameLocked}
              onGenerate={() => handleGenerate(ch)}
              isGenerating={generating === ch.id}
            />
          ))}
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
          <div>
            <label className={labelClass}>Expression Name</label>
            <input className={inputClass} name="expression_name" placeholder="e.g. The Smash Moment" />
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
          <input type="hidden" name="frame_anchor" value={frame.anchor} />
          <input type="hidden" name="mood_register" value={frame.mood} />
          <input type="hidden" name="clarity_statement" value={frame.clarity_statement} />
          <div>
            <label className={labelClass}>Channel Brief</label>
            <textarea className={inputClass} name="brief_body" rows={5} placeholder="Write the channel-specific translation of the Big Idea…" />
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
