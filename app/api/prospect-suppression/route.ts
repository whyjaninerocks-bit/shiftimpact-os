import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/prospect-suppression ────────────────────────────────────────────
// Suppression check — call this before generating any outreach draft.
// Query params (exactly one of):
//   company_id  — check if company is suppressed
//   person_id   — check if person is suppressed
//   domain      — check if email domain is suppressed
//
// Returns: { suppressed: boolean, reason?, expires_at?, suppression_type? }

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);

  const company_id = searchParams.get("company_id");
  const person_id  = searchParams.get("person_id");
  const domain     = searchParams.get("domain");

  if (!company_id && !person_id && !domain) {
    return NextResponse.json(
      { error: "Provide company_id, person_id or domain to check" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  let query = supabase
    .from("prospect_suppression_list")
    .select("id, suppression_type, reason, expires_at")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .limit(1);

  if (company_id)      query = query.eq("company_id", company_id);
  else if (person_id)  query = query.eq("person_id", person_id);
  else                 query = query.eq("domain", domain!);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    return NextResponse.json({ suppressed: false });
  }

  const record = data[0];
  return NextResponse.json({
    suppressed:       true,
    reason:           record.reason,
    expires_at:       record.expires_at ?? null,
    suppression_type: record.suppression_type,
  });
}

// ─── POST /api/prospect-suppression ──────────────────────────────────────────
// Add a suppression record.
// Body: {
//   suppression_type: "company" | "person" | "domain",
//   company_id?:   uuid  (required when type = "company")
//   person_id?:    uuid  (required when type = "person")
//   domain?:       text  (required when type = "domain")
//   reason:        text  (required)
//   suppressed_by?: text (default "system")
//   expires_at?:   ISO datetime (omit for permanent)
// }

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { suppression_type, reason } = body;
  if (!suppression_type || !reason) {
    return NextResponse.json(
      { error: "suppression_type and reason are required" },
      { status: 400 }
    );
  }

  if (suppression_type === "company" && !body.company_id) {
    return NextResponse.json({ error: "company_id required for type=company" }, { status: 400 });
  }
  if (suppression_type === "person" && !body.person_id) {
    return NextResponse.json({ error: "person_id required for type=person" }, { status: 400 });
  }
  if (suppression_type === "domain" && !body.domain) {
    return NextResponse.json({ error: "domain required for type=domain" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    suppression_type,
    reason,
    suppressed_by: body.suppressed_by ?? "system",
    expires_at:    body.expires_at    ?? null,
    company_id:    suppression_type === "company" ? body.company_id : null,
    person_id:     suppression_type === "person"  ? body.person_id  : null,
    domain:        suppression_type === "domain"  ? body.domain     : null,
  };

  const { data, error } = await supabase
    .from("prospect_suppression_list")
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync is_suppressed flag on company/person for fast list filtering
  if (suppression_type === "company" && body.company_id) {
    await supabase.from("companies").update({ is_suppressed: true }).eq("id", body.company_id);
  }
  if (suppression_type === "person" && body.person_id) {
    await supabase.from("people").update({ is_suppressed: true }).eq("id", body.person_id);
  }

  return NextResponse.json({ suppression: data }, { status: 201 });
}

// ─── DELETE /api/prospect-suppression ────────────────────────────────────────
// Remove a suppression record by id.
// Body: { id }
// Un-flags is_suppressed on company/person if no other active suppression remains.

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: record } = await supabase
    .from("prospect_suppression_list")
    .select("suppression_type, company_id, person_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("prospect_suppression_list").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Un-flag is_suppressed only if no other suppression records remain
  if (record?.suppression_type === "company" && record.company_id) {
    const { count } = await supabase
      .from("prospect_suppression_list")
      .select("id", { count: "exact", head: true })
      .eq("company_id", record.company_id);
    if ((count ?? 0) === 0) {
      await supabase.from("companies").update({ is_suppressed: false }).eq("id", record.company_id);
    }
  }

  if (record?.suppression_type === "person" && record.person_id) {
    const { count } = await supabase
      .from("prospect_suppression_list")
      .select("id", { count: "exact", head: true })
      .eq("person_id", record.person_id);
    if ((count ?? 0) === 0) {
      await supabase.from("people").update({ is_suppressed: false }).eq("id", record.person_id);
    }
  }

  return NextResponse.json({ deleted: true });
}
