"use client";

import { useState } from "react";
import { Badge, Card, ErrorBanner, SectionTitle, buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";
import { createPartner, updatePartner, togglePartner, deletePartner } from "@/lib/actions";
import type { PartnerWorkspace } from "../page";

const DIRECTIONS = [
  { value: "referral_out_only", label: "Referral out", desc: "ShiftImpact refers to partner. Partner is NOT a client." },
  { value: "referral_in_only",  label: "Referral in",  desc: "Partner refers leads to ShiftImpact." },
  { value: "both_ways",         label: "Both ways",    desc: "Mutual referral relationship." },
] as const;

function directionTone(d: string): "blue" | "green" | "purple" | "neutral" {
  if (d === "referral_out_only") return "blue";
  if (d === "referral_in_only")  return "green";
  if (d === "both_ways")         return "purple";
  return "neutral";
}

function directionLabel(d: string): string {
  return DIRECTIONS.find(x => x.value === d)?.label ?? d;
}

function directionDescription(d: string): string {
  return DIRECTIONS.find(x => x.value === d)?.desc ?? "";
}

// ─── Shared form fields ────────────────────────────────────────────────────────

function PartnerFields({ partner }: { partner?: PartnerWorkspace }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Partner Name</label>
          <input name="partner_name" required className={inputClass}
            defaultValue={partner?.partner_name} placeholder="e.g. AOAI" />
        </div>
        <div>
          <label className={labelClass}>Slug</label>
          <input name="partner_slug" required className={inputClass}
            defaultValue={partner?.partner_slug} placeholder="e.g. aoai" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Direction</label>
        <select name="direction" required className={inputClass}
          defaultValue={partner?.direction ?? "referral_out_only"}>
          {DIRECTIONS.map(d => (
            <option key={d.value} value={d.value}>{d.label} — {d.desc}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea name="description" rows={3} className={inputClass}
          defaultValue={partner?.description ?? ""}
          placeholder="What does this partner do? What's the strategic fit?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Contact Name</label>
          <input name="contact_name" className={inputClass}
            defaultValue={partner?.contact_name ?? ""} />
        </div>
        <div>
          <label className={labelClass}>Contact Email</label>
          <input name="contact_email" type="email" className={inputClass}
            defaultValue={partner?.contact_email ?? ""} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea name="notes" rows={2} className={inputClass}
          defaultValue={partner?.notes ?? ""}
          placeholder="Relationship context, caveats, history" />
      </div>
    </>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreatePartnerForm({ onClose }: { onClose: () => void }) {
  return (
    <Card>
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">New Partner</p>
      <form action={createPartner} className="space-y-3">
        <PartnerFields />
        <div className="flex gap-2">
          <button type="submit" className={buttonClass}>Add Partner</button>
          <button type="button" onClick={onClose} className={buttonSecondaryClass}>Cancel</button>
        </div>
      </form>
    </Card>
  );
}

// ─── Partner card ─────────────────────────────────────────────────────────────

function PartnerCard({ partner: p }: { partner: PartnerWorkspace }) {
  const [editing, setEditing] = useState(false);
  const updateAction = updatePartner.bind(null, p.id);
  const toggleAction = togglePartner.bind(null, p.id, !p.is_active);
  const deleteAction = deletePartner.bind(null, p.id);

  return (
    <Card className={p.is_active ? "" : "opacity-50"}>
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-neutral-900">{p.partner_name}</h2>
                <Badge tone={directionTone(p.direction)}>{directionLabel(p.direction)}</Badge>
                {!p.is_active && <Badge tone="neutral">Inactive</Badge>}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">{directionDescription(p.direction)}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <button onClick={() => setEditing(true)}
                className="text-xs text-neutral-400 hover:text-neutral-700 px-2 py-1">
                Edit
              </button>
              <form action={toggleAction}>
                <button type="submit" className={buttonSecondaryClass}>
                  {p.is_active ? "Deactivate" : "Activate"}
                </button>
              </form>
              <form action={deleteAction}
                onSubmit={e => { if (!confirm(`Delete "${p.partner_name}"?`)) e.preventDefault(); }}>
                <button type="submit" className="text-xs text-red-500 hover:text-red-700 px-2 py-1">
                  Delete
                </button>
              </form>
            </div>
          </div>

          {p.description && (
            <p className="text-sm text-neutral-600 leading-relaxed mb-2">{p.description}</p>
          )}
          {p.notes && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 mb-2">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-xs text-amber-800 leading-relaxed">{p.notes}</p>
            </div>
          )}
          {(p.contact_name || p.contact_email) && (
            <div className="border-t border-neutral-100 pt-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Contact</p>
              <p className="text-sm text-neutral-600">
                {p.contact_name}
                {p.contact_email && (
                  <> · <a href={`mailto:${p.contact_email}`} className="text-blue-600 hover:underline">{p.contact_email}</a></>
                )}
              </p>
            </div>
          )}
        </>
      ) : (
        <form action={updateAction} className="space-y-3">
          <PartnerFields partner={p} />
          <div className="flex gap-2">
            <button type="submit" className={buttonClass}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={buttonSecondaryClass}>Cancel</button>
          </div>
        </form>
      )}
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PartnersClient({
  partners,
  dbError,
  serverError,
}: {
  partners: PartnerWorkspace[];
  dbError?: string;
  serverError?: string;
}) {
  const [showCreate, setShowCreate] = useState(false);

  const active   = partners.filter(p => p.is_active);
  const inactive = partners.filter(p => !p.is_active);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Partner Workspaces</p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Partners</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Strategic referral relationships. Direction determines who refers whom.
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className={buttonClass}>
          + New Partner
        </button>
      </div>

      <ErrorBanner message={serverError ?? dbError} />

      {showCreate && <CreatePartnerForm onClose={() => setShowCreate(false)} />}

      {/* Direction key */}
      <Card>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Direction Key</p>
        <div className="space-y-2">
          {DIRECTIONS.map(r => (
            <div key={r.value} className="flex items-start gap-2">
              <Badge tone={directionTone(r.value)}>{r.label}</Badge>
              <p className="text-xs text-neutral-500 leading-relaxed pt-0.5">{r.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {active.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Active Partners ({active.length})</SectionTitle>
          {active.map(p => <PartnerCard key={p.id} partner={p} />)}
        </div>
      )}

      {active.length === 0 && !dbError && (
        <Card>
          <p className="text-sm text-neutral-500">No active partners yet. Add one above.</p>
        </Card>
      )}

      {inactive.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Inactive ({inactive.length})</SectionTitle>
          {inactive.map(p => <PartnerCard key={p.id} partner={p} />)}
        </div>
      )}
    </div>
  );
}
