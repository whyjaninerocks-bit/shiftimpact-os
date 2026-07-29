import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/prospect-companies ─────────────────────────────────────────────
// Query params:
//   status        — filter by status (Watching|Qualified|Active|Converted|Dismissed)
//   market_code   — filter by market (MY|SG|PH|TH|ID|VN)
//   search        — partial name match
//   suppressed    — "true" to include suppressed companies (default: exclude)
//   limit         — max rows (default 50, max 200)
//   offset        — pagination offset (default 0)

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);

  const status      = searchParams.get("status");
  const market_code = searchParams.get("market_code");
  const search      = searchParams.get("search");
  const suppressed  = searchParams.get("suppressed") === "true";
  const limit       = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset      = parseInt(searchParams.get("offset") ?? "0");

  let query = supabase
    .from("companies")
    .select(`
      id, name, industry, size_band, market_code, website, linkedin_url,
      status, is_suppressed, business_model, growth_stage, employee_band,
      company_profile_summary, last_signal_date, created_at, updated_at
    `)
    .order("last_signal_date", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (!suppressed) query = query.eq("is_suppressed", false);
  if (status)      query = query.eq("status", status);
  if (market_code) query = query.eq("market_code", market_code);
  if (search)      query = query.ilike("name", `%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ companies: data, count });
}

// ─── POST /api/prospect-companies ────────────────────────────────────────────
// Body: { name, industry, market_code?, size_band?, website?, linkedin_url?,
//         business_model?, growth_stage?, employee_band?, source_notes? }

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, industry } = body;
  if (!name || !industry) {
    return NextResponse.json({ error: "name and industry are required" }, { status: 400 });
  }

  const insert = {
    name:                    body.name,
    industry:                body.industry,
    market_code:             body.market_code ?? "MY",
    size_band:               body.size_band   ?? null,
    website:                 body.website     ?? null,
    linkedin_url:            body.linkedin_url ?? null,
    business_model:          body.business_model ?? null,
    growth_stage:            body.growth_stage   ?? null,
    employee_band:           body.employee_band  ?? null,
    source_notes:            body.source_notes   ?? "",
    company_profile_summary: body.company_profile_summary ?? "",
    status:                  body.status ?? "Watching",
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data }, { status: 201 });
}

// ─── PATCH /api/prospect-companies ───────────────────────────────────────────
// Body: { id, ...fields to update }

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

  // Whitelist updatable fields
  const allowed = [
    "name","industry","size_band","market_code","website","linkedin_url",
    "status","source_notes","is_suppressed","business_model","growth_stage",
    "employee_band","company_profile_summary",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("companies")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data });
}
