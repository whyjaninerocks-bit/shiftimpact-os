"use client";

// ─── CampaignKnowledgeWidget ──────────────────────────────────────────────────
// Feature F24 — Campaign-scoped Knowledge Base (Sprint 5)
// Inline widget shown on campaign detail pages.
// Lists KB docs scoped to this campaign + allows adding campaign-level docs.
//
// Scope hierarchy used here: kb_scope = 'Campaign', campaign_id = <this campaign>
// Context injection priority: Campaign docs are injected first into IQ Evaluate
// and BIP co-pilot prompts, ahead of Client and Global docs.
//
// INTERNAL ONLY — not shown to clients.

import { useState, useRef, useCallback } from "react";
import { createKnowledgeDoc, deleteKnowledgeDoc } from "@/lib/actions";
import { buttonClass, buttonSecondaryClass, inputClass, labelClass } from "@/app/_components/ui";
import type { KnowledgeDoc, KnowledgeDocType } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPES: KnowledgeDocType[] = [
  "Cultural Intelligence",
  "Regulatory Guide",
  "Market Intelligence",
  "Competitor Intel",
  "Custom",
];

const DOC_TYPE_STYLE: Record<KnowledgeDocType, string> = {
  "Cultural Intelligence": "bg-purple-100 text-purple-700",
  "Regulatory Guide":     "bg-red-100 text-red-700",
  "Market Intelligence":  "bg-blue-100 text-blue-700",
  "Competitor Intel":     "bg-amber-100 text-amber-700",
  "Custom":               "bg-neutral-100 text-neutral-600",
};

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp";
const MAX_MB = 25;

// ─── CampaignDocRow ───────────────────────────────────────────────────────────

function CampaignDocRow({ doc }: { doc: KnowledgeDoc }) {
  const deleteAction = deleteKnowledgeDoc.bind(null, doc.id);
  const filename = doc.file_path
    ? doc.file_path.split("/").pop()?.replace(/^\d+_/, "") ?? doc.file_path
    : null;

  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-neutral-100 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-neutral-800 truncate">{doc.title}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${DOC_TYPE_STYLE[doc.doc_type as KnowledgeDocType] ?? "bg-neutral-100 text-neutral-600"}`}>
            {doc.doc_type}
          </span>
        </div>
        {(filename || doc.source_url) && (
          <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
            {filename && <span className="font-mono">{filename}</span>}
            {doc.source_url && (
              <a href={doc.source_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:underline truncate max-w-xs">
                {doc.source_url}
              </a>
            )}
          </div>
        )}
      </div>
      <form action={deleteAction} className="shrink-0">
        <button type="submit" className="text-xs text-neutral-300 hover:text-red-500 transition-colors">
          ✕
        </button>
      </form>
    </div>
  );
}

// ─── AddCampaignDocForm ───────────────────────────────────────────────────────

function AddCampaignDocForm({
  campaignId,
  clientId,
  onClose,
}: {
  campaignId: string;
  clientId: string;
  onClose: () => void;
}) {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadedPath, setUploadedPath] = useState<string>("");
  const [uploadedFilename, setUploadedFilename] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadState("error");
      setUploadError(`File too large (max ${MAX_MB} MB).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadState("uploading");
    setUploadError("");
    setUploadedPath("");
    setUploadedFilename(file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kb_scope", "Campaign");
    formData.append("campaign_id", campaignId);
    formData.append("client_id", clientId);

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
    } catch {
      setUploadState("error");
      setUploadError("Upload failed — check connection and retry.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [campaignId, clientId]);

  return (
    <form
      action={createKnowledgeDoc}
      className="border border-neutral-200 rounded p-3 mt-2 space-y-2.5 bg-neutral-50"
    >
      {/* Scope fields — campaign-level */}
      <input type="hidden" name="kb_scope" value="Campaign" />
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="file_path" value={uploadedPath} />
      {/* Campaign KB defaults: no market selection (inherited from campaign) */}
      <input type="hidden" name="market" value="Malaysia" />

      <p className="text-xs font-semibold text-neutral-700">Add Campaign Document</p>

      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Type</label>
          <select className={inputClass} name="doc_type" defaultValue="Custom">
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            name="title"
            required
            placeholder="e.g. Campaign creative brief"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tags (optional)</label>
        <input className={inputClass} name="tags" placeholder="e.g. brief, audience, creative" />
      </div>

      <div>
        <label className={labelClass}>Upload File</label>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          className="block w-full text-xs text-neutral-600
            file:mr-2 file:py-1 file:px-2.5
            file:rounded file:border-0
            file:text-xs file:font-medium
            file:bg-neutral-200 file:text-neutral-700
            hover:file:bg-neutral-300 cursor-pointer"
        />
        {uploadState === "uploading" && (
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <span className="animate-pulse">●</span> Uploading {uploadedFilename}…
          </p>
        )}
        {uploadState === "done" && (
          <p className="text-xs text-emerald-600 mt-1">✓ {uploadedFilename} uploaded</p>
        )}
        {uploadState === "error" && (
          <p className="text-xs text-red-600 mt-1">✗ {uploadError}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>Or paste Source URL</label>
        <input className={inputClass} name="source_url" type="url" placeholder="https://…" />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className={buttonClass}
          disabled={uploadState === "uploading"}
        >
          {uploadState === "uploading" ? "Uploading…" : "Add"}
        </button>
        <button type="button" onClick={onClose} className={buttonSecondaryClass}>Cancel</button>
      </div>
    </form>
  );
}

// ─── CampaignKnowledgeWidget ──────────────────────────────────────────────────

export function CampaignKnowledgeWidget({
  campaignId,
  clientId,
  docs,
}: {
  campaignId: string;
  clientId: string;
  docs: KnowledgeDoc[];
}) {
  const [showAdd, setShowAdd] = useState(false);

  // Show only campaign-scoped docs for this campaign
  const campaignDocs = docs.filter(
    (d) => d.kb_scope === "Campaign" && d.campaign_id === campaignId
  );

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-neutral-700">Campaign Knowledge</p>
        <span className="text-xs text-neutral-400">{campaignDocs.length} doc{campaignDocs.length !== 1 ? "s" : ""}</span>
      </div>

      <p className="text-xs text-neutral-400 mb-2">
        Documents attached to this campaign. Used by IQ Evaluate + BIP co-pilot. Internal only.
      </p>

      {campaignDocs.length > 0 ? (
        <div className="mb-2">
          {campaignDocs.map((doc) => (
            <CampaignDocRow key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-400 mb-2">No campaign documents yet.</p>
      )}

      {showAdd ? (
        <AddCampaignDocForm
          campaignId={campaignId}
          clientId={clientId}
          onClose={() => setShowAdd(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-xs text-neutral-500 hover:text-neutral-800 font-medium transition-colors"
        >
          + Add document
        </button>
      )}
    </div>
  );
}
