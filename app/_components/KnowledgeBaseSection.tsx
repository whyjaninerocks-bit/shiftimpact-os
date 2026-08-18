"use client";

// ─── Knowledge Base Section ───────────────────────────────────────────────────
// Feature 15 — Cultural Intelligence & Regulatory Layer
// Internal knowledge store for cultural briefs, regulatory guides, and
// market intelligence. Cross-market expandable.
//
// INTERNAL ONLY — Not shown to clients. Janine access only.
//
// Directive 4: "Add in an upload doc section for all my knowledge base such
// as for cultural. I would like to expand this cross markets."

import { useState, useRef, useCallback } from "react";
import { createKnowledgeDoc, deleteKnowledgeDoc } from "@/lib/actions";
import {
  Badge,
  Card,
  SectionTitle,
  buttonClass,
  buttonSecondaryClass,
  inputClass,
  labelClass,
} from "@/app/_components/ui";
import type { KnowledgeDoc, KnowledgeDocMarket, KnowledgeDocType } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPES: KnowledgeDocType[] = [
  "Cultural Intelligence",
  "Regulatory Guide",
  "Market Intelligence",
  "Competitor Intel",
  "Custom",
];

const MARKETS: KnowledgeDocMarket[] = [
  "Malaysia",
  "Singapore",
  "Thailand",
  "India",
  "Indonesia",
  "Pan-SEA",
  "Global",
];

const DOC_TYPE_STYLE: Record<KnowledgeDocType, string> = {
  "Cultural Intelligence": "bg-purple-100 text-purple-700",
  "Regulatory Guide":     "bg-red-100 text-red-700",
  "Market Intelligence":  "bg-blue-100 text-blue-700",
  "Competitor Intel":     "bg-amber-100 text-amber-700",
  "Custom":               "bg-neutral-100 text-neutral-600",
};

const MARKET_STYLE: Record<KnowledgeDocMarket, string> = {
  Malaysia:    "bg-emerald-100 text-emerald-700",
  Singapore:   "bg-sky-100 text-sky-700",
  Thailand:    "bg-orange-100 text-orange-700",
  India:       "bg-indigo-100 text-indigo-700",
  Indonesia:   "bg-rose-100 text-rose-700",
  "Pan-SEA":  "bg-teal-100 text-teal-700",
  Global:      "bg-neutral-100 text-neutral-600",
};

// ─── DocCard ──────────────────────────────────────────────────────────────────

function DocCard({ doc }: { doc: KnowledgeDoc }) {
  const [open, setOpen] = useState(false);
  const deleteAction = deleteKnowledgeDoc.bind(null, doc.id);

  const tags = doc.tags ? doc.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-neutral-800 truncate">{doc.title}</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${DOC_TYPE_STYLE[doc.doc_type as KnowledgeDocType] ?? "bg-neutral-100 text-neutral-600"}`}>
            {doc.doc_type}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${MARKET_STYLE[doc.market as KnowledgeDocMarket] ?? "bg-neutral-100 text-neutral-600"}`}>
            {doc.market}
          </span>
          <span className="text-neutral-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-3 py-3 space-y-3">
          {doc.description && (
            <p className="text-xs text-neutral-600">{doc.description}</p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1 text-xs text-neutral-500">
            {doc.file_path && (
              <div>
                <span className="text-neutral-400">File:</span>{" "}
                <span className="font-mono text-xs text-neutral-600">
                  {/* Show filename only (storage path: scope/id/timestamp_filename.ext) */}
                  {doc.file_path.split("/").pop()?.replace(/^\d+_/, "") ?? doc.file_path}
                </span>
              </div>
            )}
            {doc.source_url && (
              <div>
                <span className="text-neutral-400">Source:</span>{" "}
                <a
                  href={doc.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate"
                >
                  {doc.source_url}
                </a>
              </div>
            )}
            <div>
              <span className="text-neutral-400">Added:</span>{" "}
              {new Date(doc.created_at).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })}
            </div>
          </div>

          <form action={deleteAction}>
            <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
              Archive document
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Accepted file types (must match /api/upload ALLOWED_TYPES) ───────────────

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp";
const MAX_MB = 25;

// ─── AddDocForm ───────────────────────────────────────────────────────────────

function AddDocForm({ onClose }: { onClose: () => void }) {
  // File upload state
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadedPath, setUploadedPath] = useState<string>("");
  const [uploadedFilename, setUploadedFilename] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection → immediate upload to /api/upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check (25 MB)
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadState("error");
      setUploadError(`File is too large (max ${MAX_MB} MB).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadState("uploading");
    setUploadError("");
    setUploadedPath("");
    setUploadedFilename(file.name);

    const formData = new FormData();
    formData.append("file", file);
    // Global scope for KnowledgeBase section — no campaign/client FK
    formData.append("kb_scope", "Global");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setUploadState("error");
        setUploadError(json.error ?? `Upload failed (${res.status}).`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setUploadedPath(json.path as string);
      setUploadState("done");
    } catch (err) {
      setUploadState("error");
      setUploadError("Upload failed — check your connection and try again.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  return (
    <form action={createKnowledgeDoc} className="border border-neutral-200 rounded-md p-4 space-y-3 bg-neutral-50">
      <p className="text-xs font-semibold text-neutral-700">Add Knowledge Document</p>

      {/* Scope hidden fields (Global KB section — no campaign/client) */}
      <input type="hidden" name="kb_scope" value="Global" />
      <input type="hidden" name="campaign_id" value="" />
      <input type="hidden" name="client_id" value="" />

      {/* file_path is set to the Supabase Storage path after upload */}
      <input type="hidden" name="file_path" value={uploadedPath} />

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Document Type</label>
          <select className={inputClass} name="doc_type" defaultValue="Cultural Intelligence">
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Market</label>
          <select className={inputClass} name="market" defaultValue="Malaysia">
            {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Title</label>
        <input
          className={inputClass}
          name="title"
          required
          placeholder="e.g. Ramadan 2025 — Malay Cultural Tension Map"
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={inputClass}
          name="description"
          rows={3}
          placeholder="What does this document contain? What should it be used for?"
        />
      </div>

      <div>
        <label className={labelClass}>Tags</label>
        <input
          className={inputClass}
          name="tags"
          placeholder="comma-separated, e.g. Ramadan, Malay, FMCG, Food"
        />
        <p className="text-xs text-neutral-400 mt-0.5">
          Tags make documents findable across campaigns and markets.
        </p>
      </div>

      <div>
        <label className={labelClass}>Source URL (optional)</label>
        <input
          className={inputClass}
          name="source_url"
          type="url"
          placeholder="https://…"
        />
      </div>

      {/* ── File Upload ─────────────────────────────────────────────────────── */}
      <div className="border-t border-neutral-200 pt-3 space-y-1.5">
        <label className={labelClass}>Upload File (optional)</label>
        <p className="text-xs text-neutral-400">
          PDF, Word, Excel, CSV, plain text, or image. Max {MAX_MB} MB.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          className="block w-full text-xs text-neutral-600
            file:mr-3 file:py-1.5 file:px-3
            file:rounded file:border-0
            file:text-xs file:font-medium
            file:bg-neutral-200 file:text-neutral-700
            hover:file:bg-neutral-300 cursor-pointer"
        />

        {/* Upload status feedback */}
        {uploadState === "uploading" && (
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <span className="animate-pulse">●</span> Uploading {uploadedFilename}…
          </p>
        )}
        {uploadState === "done" && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            ✓ {uploadedFilename} uploaded
          </p>
        )}
        {uploadState === "error" && (
          <p className="text-xs text-red-600">✗ {uploadError}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className={buttonClass}
          disabled={uploadState === "uploading"}
        >
          {uploadState === "uploading" ? "Uploading…" : "Add Document"}
        </button>
        <button type="button" onClick={onClose} className={buttonSecondaryClass}>Cancel</button>
      </div>
    </form>
  );
}

// ─── KnowledgeBaseSection ─────────────────────────────────────────────────────

export function KnowledgeBaseSection({
  docs,
  filterMarket,
  filterType,
}: {
  docs: KnowledgeDoc[];
  filterMarket?: KnowledgeDocMarket;
  filterType?: KnowledgeDocType;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [activeMarket, setActiveMarket] = useState<string>(filterMarket ?? "All");
  const [activeType, setActiveType] = useState<string>(filterType ?? "All");

  // Filter
  const filtered = docs.filter((d) => {
    if (activeMarket !== "All" && d.market !== activeMarket) return false;
    if (activeType !== "All" && d.doc_type !== activeType) return false;
    return true;
  });

  // Market counts for tabs
  const marketCounts = MARKETS.reduce<Record<string, number>>((acc, m) => {
    acc[m] = docs.filter((d) => d.market === m).length;
    return acc;
  }, {});

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-1">
        <SectionTitle id="knowledge-base">Knowledge Base</SectionTitle>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">Internal</Badge>
          <span className="text-xs text-neutral-400">{docs.length} docs</span>
        </div>
      </div>

      <p className="text-xs text-neutral-400 mb-3">
        Cultural intelligence, regulatory guides, and market reference documents.
        Used by IQ Evaluate (Sprint 2-3) to assess cultural alignment and regulatory risk.
        <strong className="text-neutral-600"> Janine access only — not shown to clients.</strong>
      </p>

      {/* Market filter tabs */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveMarket("All")}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
            activeMarket === "All"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All ({docs.length})
        </button>
        {MARKETS.filter((m) => marketCounts[m] > 0).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setActiveMarket(m)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              activeMarket === m
                ? "bg-neutral-900 text-white"
                : `${MARKET_STYLE[m]} hover:opacity-80`
            }`}
          >
            {m} ({marketCounts[m]})
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveType("All")}
          className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
            activeType === "All"
              ? "bg-neutral-800 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All types
        </button>
        {DOC_TYPES.filter((t) => docs.some((d) => d.doc_type === t)).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveType(t)}
            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
              activeType === t
                ? "bg-neutral-800 text-white"
                : `${DOC_TYPE_STYLE[t]} hover:opacity-80`
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Doc list */}
      {filtered.length > 0 ? (
        <div className="space-y-2 mb-4">
          {filtered.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 mb-4">
          {docs.length === 0
            ? "No knowledge documents yet. Add your first cultural or regulatory brief below."
            : "No documents match the selected filters."}
        </p>
      )}

      {/* Add form or trigger */}
      {showAdd ? (
        <AddDocForm onClose={() => setShowAdd(false)} />
      ) : (
        <button
          type="button"
          className={buttonClass}
          onClick={() => setShowAdd(true)}
        >
          + Add Knowledge Document
        </button>
      )}
    </Card>
  );
}
