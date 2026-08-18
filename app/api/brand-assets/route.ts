// app/api/brand-assets/route.ts
// F29 — Distinctive Brand Asset Intelligence
// Sprint 22 · 18 July 2026
//
// GET  /api/brand-assets?client_id=xxx
//      → List all active brand assets for a client
//
// POST /api/brand-assets
//      Body: { action: "create", client_id, asset_name, asset_type, description, asset_strength, notes }
//      → Create a new brand asset
//
//      Body: { action: "update", id, asset_name?, asset_type?, description?, asset_strength?, notes?, active? }
//      → Update an existing brand asset
//
//      Body: { action: "set_deployed", frame_brief_id, distinctive_assets_deployed }
//      → Update frame_briefs.distinctive_assets_deployed for this campaign
//         Values: comma-separated asset UUIDs | 'NONE_CONFIRMED' | '' (clears flag)
//
// ACCESS RULES:
//   All fields: INTERNAL ONLY — never surfaced to client portal
//   consistency_score: computed by DBAI correlation (future sprint) — null until 2+ campaigns
//   Client sees asset_name + asset_type ONLY at onboarding orientation (not here)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── GET — list assets for a client ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("brand_assets")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("asset_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("/api/brand-assets GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data ?? [] });
}

// ─── POST — create, update, or set deployed list ─────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json(
        { error: "action is required: 'create' | 'update' | 'set_deployed'" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === "create") {
      const {
        client_id,
        asset_name,
        asset_type,
        description = "",
        asset_strength = "Emerging",
        notes = "",
      } = body as {
        client_id: string;
        asset_name: string;
        asset_type: string;
        description?: string;
        asset_strength?: string;
        notes?: string;
      };

      if (!client_id || !asset_name || !asset_type) {
        return NextResponse.json(
          { error: "client_id, asset_name, and asset_type are required for create" },
          { status: 400 }
        );
      }

      const validTypes = ["Visual", "Sonic", "Verbal", "Experiential"];
      if (!validTypes.includes(asset_type)) {
        return NextResponse.json(
          { error: `asset_type must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }

      const validStrengths = ["Established", "Building", "Emerging", "At Risk"];
      if (!validStrengths.includes(asset_strength)) {
        return NextResponse.json(
          { error: `asset_strength must be one of: ${validStrengths.join(", ")}` },
          { status: 400 }
        );
      }

      const { data: created, error: createErr } = await supabase
        .from("brand_assets")
        .insert({
          client_id,
          asset_name,
          asset_type,
          description,
          asset_strength,
          notes,
          active: true,
        })
        .select("*")
        .single();

      if (createErr) {
        console.error("/api/brand-assets create error:", createErr);
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }

      return NextResponse.json({ asset: created }, { status: 201 });
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    if (action === "update") {
      const { id, ...fields } = body as {
        id: string;
        asset_name?: string;
        asset_type?: string;
        description?: string;
        asset_strength?: string;
        notes?: string;
        active?: boolean;
      };

      if (!id) {
        return NextResponse.json({ error: "id is required for update" }, { status: 400 });
      }

      // Only allow safe field updates
      const allowedFields = ["asset_name", "asset_type", "description", "asset_strength", "notes", "active"];
      const updatePayload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (allowedFields.includes(k) && v !== undefined) {
          updatePayload[k] = v;
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
      }

      const { data: updated, error: updateErr } = await supabase
        .from("brand_assets")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();

      if (updateErr) {
        console.error("/api/brand-assets update error:", updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ asset: updated });
    }

    // ── SET DEPLOYED ──────────────────────────────────────────────────────────
    // Updates frame_briefs.distinctive_assets_deployed for a campaign.
    // Values:
    //   ''              → not yet set (clears value, BIP flag may fire)
    //   'uuid,uuid,...' → comma-separated brand_asset UUIDs
    //   'NONE_CONFIRMED'→ explicit override: no DBAs apply to this brief

    if (action === "set_deployed") {
      const { frame_brief_id, distinctive_assets_deployed } = body as {
        frame_brief_id: string;
        distinctive_assets_deployed: string;
      };

      if (!frame_brief_id) {
        return NextResponse.json(
          { error: "frame_brief_id is required for set_deployed" },
          { status: 400 }
        );
      }

      const { error: briefErr } = await supabase
        .from("frame_briefs")
        .update({ distinctive_assets_deployed: distinctive_assets_deployed ?? "" })
        .eq("id", frame_brief_id);

      if (briefErr) {
        console.error("/api/brand-assets set_deployed error:", briefErr);
        return NextResponse.json({ error: briefErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, distinctive_assets_deployed });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Use 'create', 'update', or 'set_deployed'.` },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/brand-assets error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
