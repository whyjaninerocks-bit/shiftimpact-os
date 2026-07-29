import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

// ─── Fingerprint helper ───────────────────────────────────────────────────────
// MD5 of (company_id + signal_category + signal_type + normalised signal_text)
// Normalise: lowercase, collapse whitespace, trim to 300 chars
function buildFingerprint(
  company_id: string,
  signal_category: string,
  signal_type: string,
  signal_text: string
): string {
  const normalised = signal_text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 300);
  const raw = `${company_id}::${signal_category}::${signal_type}::${normalised}`;
  return createHash("md5").update(raw).digest("hex");
}

// ─── GET /api/prospect-signals ────────────────────────────────────────────────
// Query params:
//   company_id       — required
//   signal_category  — filter (Growth|Recognition|Milestone|Activation|Leadership)
//   include_dupes    — "true" to include duplicate signals (default: exclude)
//   limit            — max rows (default 50, max 200)
//   offset           — pagination offset

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);

  const company_id      = searchParams.get("company_id");
  const signal_category = searchParams.get("signal_category");
  const include_dupes   = searchParams.get("include_dupes") === "true";
  const limit           = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset          = parseInt(searchParams.get("offset") ?? "0");

  if (!company_id) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  let query = supabase
    .from("business_signals")
    .select(`
      id, company_id, signal_category, signal_type, signal_text,
      source_url, detected_at, signal_fingerprint, duplicate_of_id,
      created_at,
      evidence_sources (
        id, source_type, url, headline, published_at,
        source_confidence, verification_status
      )
    `)
    .eq("company_id", company_id)
    .order("detected_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!include_dupes)    query = query.is("duplicate_of_id", null);
  if (signal_category)   query = query.eq("signal_category", signal_category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signals: data });
}

// ─── POST /api/prospect-signals ───────────────────────────────────────────────
// Body: {
//   company_id, signal_category, signal_type, signal_text,
//   source_url?, detected_at?, raw_evidence?,
//   evidence_sources?: [{ source_type, url?, headline?, published_at?,
//                         content_excerpt?, source_confidence?, verification_status? }]
// }
// Returns: { signal, duplicate: boolean }

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_id, signal_category, signal_type, signal_text } = body as Record<string, string>;
  if (!company_id || !signal_category || !signal_type || !signal_text) {
    return NextResponse.json(
      { error: "company_id, signal_category, signal_type and signal_text are required" },
      { status: 400 }
    );
  }

  // Compute fingerprint
  const signal_fingerprint = buildFingerprint(
    company_id, signal_category, signal_type, signal_text
  );

  // Check for existing duplicate
  const { data: existing } = await supabase
    .from("business_signals")
    .select("id, signal_fingerprint")
    .eq("signal_fingerprint", signal_fingerprint)
    .maybeSingle();

  if (existing) {
    // Return the existing signal — do not insert a duplicate
    return NextResponse.json(
      { signal: existing, duplicate: true, message: "Signal already exists (fingerprint match)" },
      { status: 200 }
    );
  }

  // Insert the new signal
  const insert: Record<string, unknown> = {
    company_id,
    signal_category,
    signal_type,
    signal_text,
    signal_fingerprint,
    source_url:   body.source_url   ?? null,
    detected_at:  body.detected_at  ?? new Date().toISOString(),
    raw_evidence: body.raw_evidence ?? {},
  };

  const { data: signal, error: signalError } = await supabase
    .from("business_signals")
    .insert(insert)
    .select()
    .single();

  if (signalError) {
    // Handle race-condition duplicate (fingerprint UNIQUE constraint)
    if (signalError.code === "23505") {
      return NextResponse.json(
        { duplicate: true, message: "Signal already exists (race condition dedup)" },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: signalError.message }, { status: 500 });
  }

  // Insert evidence_sources if provided
  const sources = body.evidence_sources as Array<Record<string, unknown>> | undefined;
  if (sources && sources.length > 0) {
    const evidenceRows = sources.map((s) => ({
      signal_id:           signal.id,
      source_type:         s.source_type ?? "manual",
      url:                 s.url         ?? null,
      headline:            s.headline    ?? null,
      published_at:        s.published_at ?? null,
      content_excerpt:     s.content_excerpt ?? "",
      source_confidence:   s.source_confidence   ?? "Medium",
      verification_status: s.verification_status ?? "Unverified",
    }));

    const { error: evidenceError } = await supabase
      .from("evidence_sources")
      .insert(evidenceRows);

    if (evidenceError) {
      // Signal was created — log the evidence error but don't fail the request
      console.error("[prospect-signals] evidence_sources insert error:", evidenceError.message);
    }
  }

  return NextResponse.json({ signal, duplicate: false }, { status: 201 });
}
