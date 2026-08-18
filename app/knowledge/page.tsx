// app/knowledge/page.tsx
// Feature 15 — Cultural Intelligence & Regulatory Layer
// Internal-only knowledge base. Janine access only — never shown to clients.
// Route: /knowledge

import { createAdminClient } from "@/lib/supabase/admin";
import { KnowledgeBaseSection } from "@/app/_components/KnowledgeBaseSection";
import type { KnowledgeDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const supabase = createAdminClient();

  const { data: docs, error } = await supabase
    .from("knowledge_docs")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-red-600">
          Failed to load Knowledge Base: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      {/* ── Internal-only header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Knowledge Base</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Cultural intelligence, regulatory guides, market intelligence, and competitor
            reference documents. Used by AI during IQ Evaluation and Idea Extension generation.
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
          ⚿ Janine access only
        </span>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            ["Cultural Intelligence", "blue"],
            ["Regulatory Guide", "purple"],
            ["Market Intelligence", "emerald"],
            ["Competitor Intel", "amber"],
          ] as const
        ).map(([type, color]) => {
          const count = (docs as KnowledgeDoc[]).filter(
            (d) => d.doc_type === type
          ).length;
          return (
            <div
              key={type}
              className={`rounded-md border px-3 py-2 bg-${color}-50 border-${color}-200`}
            >
              <p className={`text-xs font-medium text-${color}-700`}>{type}</p>
              <p className={`text-xl font-bold text-${color}-800 mt-0.5`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* ── Main component ── */}
      <KnowledgeBaseSection docs={(docs as KnowledgeDoc[]) ?? []} />
    </main>
  );
}
