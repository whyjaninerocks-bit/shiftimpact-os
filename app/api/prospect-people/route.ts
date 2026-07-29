import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/prospect-people ─────────────────────────────────────────────────
// Query params:
//   company_id        — required: list people for a company
//   relationship_status — filter (Cold|Warm|Connected|Introduced|Met|Active)
//   warm_intro_only   — "true" to show only warm intro possible
//   suppressed        — "true" to include suppressed (default: exclude)

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);

  const company_id          = searchParams.get("company_id");
  const relationship_status = searchParams.get("relationship_status");
  const warm_intro_only     = searchParams.get("warm_intro_only") === "true";
  const suppressed          = searchParams.get("suppressed") === "true";

  if (!company_id) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  let query = supabase
    .from("people")
    .select(`
      id, company_id, name, role, linkedin_url, confidence_level, last_verified_at,
      relationship_status, warm_intro_possible, warm_intro_via,
      previous_interaction, network_connection_status, is_suppressed,
      created_at, updated_at
    `)
    .eq("company_id", company_id)
    .order("created_at", { ascending: false });

  if (!suppressed)       query = query.eq("is_suppressed", false);
  if (relationship_status) query = query.eq("relationship_status", relationship_status);
  if (warm_intro_only)   query = query.eq("warm_intro_possible", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ people: data });
}

// ─── POST /api/prospect-people ────────────────────────────────────────────────
// Body: { company_id, name, role, linkedin_url?, confidence_level?,
//         relationship_status?, warm_intro_possible?, warm_intro_via?,
//         previous_interaction?, network_connection_status? }

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { company_id, name, role } = body;
  if (!company_id || !name || !role) {
    return NextResponse.json(
      { error: "company_id, name and role are required" },
      { status: 400 }
    );
  }

  // Verify company exists and is not suppressed
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, is_suppressed")
    .eq("id", company_id)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  if (company.is_suppressed) {
    return NextResponse.json(
      { error: "Company is suppressed — cannot add people" },
      { status: 403 }
    );
  }

  const insert = {
    company_id,
    name,
    role,
    linkedin_url:             body.linkedin_url             ?? null,
    confidence_level:         body.confidence_level         ?? "Medium",
    relationship_status:      body.relationship_status      ?? "Cold",
    warm_intro_possible:      body.warm_intro_possible      ?? false,
    warm_intro_via:           body.warm_intro_via           ?? null,
    previous_interaction:     body.previous_interaction     ?? "",
    network_connection_status: body.network_connection_status ?? "None",
  };

  const { data, error } = await supabase
    .from("people")
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ person: data }, { status: 201 });
}

// ─── PATCH /api/prospect-people ───────────────────────────────────────────────
// Body: { id, ...fields to update }
// Used primarily to update Relationship Intelligence fields

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const allowed = [
    "name","role","linkedin_url","confidence_level","last_verified_at",
    "relationship_status","warm_intro_possible","warm_intro_via",
    "previous_interaction","network_connection_status","is_suppressed",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("people")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ person: data });
}
