// app/api/upload/route.ts
// Feature F24 — Knowledge Base File Upload (Sprint 5)
// INTERNAL ONLY — service role client, Janine access only.
//
// POST /api/upload
// Accepts multipart/form-data with a 'file' field plus optional scope fields.
// Validates file type and size, uploads to Supabase Storage bucket 'knowledge-docs',
// returns { path } on success.
//
// Storage path convention:
//   Global docs:   global/{timestamp}_{sanitised_filename}
//   Client docs:   client/{client_id}/{timestamp}_{sanitised_filename}
//   Campaign docs: campaign/{campaign_id}/{timestamp}_{sanitised_filename}
//
// The 'knowledge-docs' bucket must be created manually in the Supabase dashboard
// before this route will work:
//   Storage > New bucket > Name: knowledge-docs > Private (no public access)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase admin client ────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = "knowledge-docs";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// Allowed MIME types mapped to canonical extensions (for sanitised path)
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sanitise a filename: strip path components, replace non-alphanumeric chars
 * (except dots and hyphens) with underscores, lowercase everything.
 */
function sanitiseFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

/**
 * Build the Supabase Storage path.
 * kb_scope determines the prefix; campaign_id / client_id scope the folder.
 */
function buildStoragePath(
  kbScope: string,
  campaignId: string | null,
  clientId: string | null,
  filename: string
): string {
  const ts = Date.now();
  const safe = sanitiseFilename(filename);
  const leaf = `${ts}_${safe}`;

  if (kbScope === "Campaign" && campaignId) {
    return `campaign/${campaignId}/${leaf}`;
  }
  if (kbScope === "Client" && clientId) {
    return `client/${clientId}/${leaf}`;
  }
  return `global/${leaf}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Parse multipart form data ──────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // ── 2. Validate type ──────────────────────────────────────────────────────
  const mimeType = file.type;
  if (!ALLOWED_TYPES[mimeType]) {
    const allowed = Object.keys(ALLOWED_TYPES).join(", ");
    return NextResponse.json(
      { error: `File type '${mimeType}' is not allowed. Accepted types: ${allowed}` },
      { status: 422 }
    );
  }

  // ── 3. Validate size ──────────────────────────────────────────────────────
  if (file.size > MAX_BYTES) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      { error: `File is ${sizeMb} MB. Maximum allowed size is 25 MB.` },
      { status: 422 }
    );
  }

  // ── 4. Read scope fields from form ────────────────────────────────────────
  const kbScope = (formData.get("kb_scope") as string | null) ?? "Global";
  const campaignId = (formData.get("campaign_id") as string | null) || null;
  const clientId = (formData.get("client_id") as string | null) || null;

  // Validate scope value
  const validScopes = ["Global", "Client", "Campaign"];
  if (!validScopes.includes(kbScope)) {
    return NextResponse.json(
      { error: `Invalid kb_scope '${kbScope}'. Must be one of: Global, Client, Campaign` },
      { status: 422 }
    );
  }

  // ── 5. Build storage path ─────────────────────────────────────────────────
  const storagePath = buildStoragePath(kbScope, campaignId, clientId, file.name);

  // ── 6. Upload to Supabase Storage ─────────────────────────────────────────
  const supabase = getSupabase();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false, // Never overwrite — timestamp in path ensures uniqueness
    });

  if (error) {
    console.error("[/api/upload] Supabase Storage error:", error);

    // Surface bucket-not-found specifically so the developer knows to create it
    if (error.message?.includes("Bucket not found") || error.message?.includes("bucket")) {
      return NextResponse.json(
        {
          error:
            "Storage bucket 'knowledge-docs' not found. " +
            "Create it in Supabase Dashboard → Storage → New bucket → Name: knowledge-docs → Private.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }

  // ── 7. Return path ────────────────────────────────────────────────────────
  // The returned path is stored in knowledge_docs.file_path.
  // To generate a signed URL for retrieval:
  //   supabase.storage.from('knowledge-docs').createSignedUrl(path, 3600)
  return NextResponse.json({ path: data.path }, { status: 201 });
}

// ─── DELETE handler ───────────────────────────────────────────────────────────
// Called when a knowledge_docs record is deleted (from deleteKnowledgeDoc action).
// Body: { path: string }

export async function DELETE(req: NextRequest) {
  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { path } = body;
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "path is required." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("[/api/upload] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
