"use client";

import { useState } from "react";
import { Card, SectionTitle, inputClass, labelClass } from "@/app/_components/ui";

interface Recipient {
  id: string;
  name: string | null;
  email: string;
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
        body: JSON.stringify({ client_id: clientId, name: name.trim() || null, email: email.trim() }),
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
        When you approve a weekly report for the portal, all addresses below receive the email notification alongside the primary contact.
      </p>

      <Card className="space-y-3">
        {recipients.length === 0 ? (
          <p className="text-sm text-neutral-400">No additional recipients yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recipients.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  {r.name && (
                    <p className="text-sm font-medium text-neutral-800 truncate">{r.name}</p>
                  )}
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
