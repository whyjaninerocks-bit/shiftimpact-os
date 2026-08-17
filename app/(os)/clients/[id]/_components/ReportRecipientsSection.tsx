"use client";

import { useState } from "react";
import { Card, SectionTitle, inputClass, labelClass } from "@/app/_components/ui";

type RecipientType = "brand_contact" | "agency_partner" | "agency_client";

const RECIPIENT_TYPE_LABELS: Record<RecipientType, string> = {
  brand_contact: "Brand Contact",
  agency_partner: "Agency Partner",
  agency_client: "Agency Client",
};

const RECIPIENT_TYPE_COLORS: Record<RecipientType, string> = {
  brand_contact: "bg-neutral-100 text-neutral-600",
  agency_partner: "bg-blue-50 text-blue-700",
  agency_client: "bg-violet-50 text-violet-700",
};

interface Recipient {
  id: string;
  name: string | null;
  email: string;
  recipient_type: RecipientType;
  created_at: string;
}

interface Props {
  clientId: string;
  initial: Recipient[];
}

export function ReportRecipientsSection({ clientId, initial }: Props) {
  const [recipients, setRecipients] = useState<Recipient[]>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("brand_contact");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/client-report-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          name: name.trim() || null,
          email: email.trim(),
          recipient_type: recipientType,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add recipient.");
        return;
      }
      const added: Recipient = await res.json();
      setRecipients((prev) => [...prev, added]);
      setName("");
      setEmail("");
      setRecipientType("brand_contact");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      const res = await fetch(`/api/client-report-recipients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecipients((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-3">
      <SectionTitle>Additional report recipients</SectionTitle>
      <p className="text-xs text-neutral-500">
        Recipients control who gets notified and when. <span className="font-medium text-violet-700">Agency Clients</span> receive a preview first; <span className="font-medium text-neutral-600">Brand Contacts</span> and <span className="font-medium text-blue-700">Agency Partners</span> receive the final release.
      </p>

      <Card className="space-y-3">
        {recipients.length === 0 ? (
          <p className="text-sm text-neutral-400">No additional recipients yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recipients.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.name && (
                      <p className="text-sm font-medium text-neutral-800 truncate">{r.name}</p>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RECIPIENT_TYPE_COLORS[r.recipient_type ?? "brand_contact"]}`}>
                      {RECIPIENT_TYPE_LABELS[r.recipient_type ?? "brand_contact"]}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 truncate">{r.email}</p>
                </div>
                <button
                  onClick={() => handleRemove(r.id)}
                  disabled={removing === r.id}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                >
                  {removing === r.id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="pt-3 border-t border-neutral-100 grid gap-2 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="recipient_name">Name (optional)</label>
            <input
              className={inputClass}
              id="recipient_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Lim"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="recipient_email">Email *</label>
            <input
              className={inputClass}
              id="recipient_email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@brand.com"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="recipient_type">Recipient type *</label>
            <select
              className={inputClass}
              id="recipient_type"
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as RecipientType)}
            >
              <option value="brand_contact">Brand Contact — receives report after client release</option>
              <option value="agency_partner">Agency Partner — receives report at client release (operational view)</option>
              <option value="agency_client">Agency Client — receives agency preview first, before brand client</option>
            </select>
          </div>
          {error && (
            <p className="sm:col-span-2 text-xs text-red-600">{error}</p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={adding || !email.trim()}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 disabled:opacity-40 transition-colors"
            >
              {adding ? "Adding…" : "Add recipient"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
