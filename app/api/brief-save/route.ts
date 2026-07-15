// app/api/brief-save/route.ts
// Client-facing brief intake save endpoint.
// Accepts FRAME Brief or BIP field updates from /brief/[id] page.
//
// POST /api/brief-save
// Body: { section: "frame"|"bip", campaign_id, record_id, fields: {...} }
//
// BOUNDARY: input fields only. No AI inference, no internal scores returned.
// Auth: campaign_id + record_id act as the access key (beta, no JWT required).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Allowed FRAME fields from client intake ───────────────────────────────
// Internal-only fields (ics_*, gate_signal, lock_status, etc.) are excluded.

const FRAME_ALLOWED_FIELDS = new Set([
  "force",
  "role",
  "anchor",
  "mood",
  "expression",
  "clarity_statement",
  "primary_kpi",
  "primary_kpi_baseline",
  "gate_signal_commitment",
  "enemy_villain",
  "enemy_active",
  "primary_cultural_context",
  "regulatory_category",
  "industry_category",
  "campaign_pathway",
  "elevation_mode_enabled",
]);

// ─── Allowed BIP fields from client intake ─────────────────────────────────

const BIP_ALLOWED_FIELDS = new Set([
  "topline_idea",
  "enemy_villain",
  "brand_role",
  "propagation_mechanism",
  "cultural_tension",
  "media_idea",
  "expression_summary",
]);

function filterFields(
  raw: Record<string, unknown>,
  allowed: Set<string>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(([k]) => allowed.has(k))
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      section: string;
      campaign_id: string;
      record_id: string;
      fields: Record<string, unknown>;
    };

    const { section, campaign_id, record_id, fields } = body;

    if (!campaign_id || !record_id || !section || !fields) {
      return NextResponse.json(
        { error: "Missing required fields: section, campaign_id, record_id, fields" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (section === "frame") {
      const safe = filterFields(fields, FRAME_ALLOWED_FIELDS);
      if (Object.keys(safe).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
      }
      const { error } = await supabase
        .from("frame_briefs")
        .update(safe)
        .eq("id", record_id)
        .eq("campaign_id", campaign_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    } else if (section === "bip") {
      const safe = filterFields(fields, BIP_ALLOWED_FIELDS);
      if (Object.keys(safe).length === 0) {
        return NextResponse.json({ error: "No valid BIP fields to update" }, { status: 400 });
      }
      const { error } = await supabase
        .from("big_idea_platforms")
        .update(safe)
        .eq("id", record_id)
        .eq("campaign_id", campaign_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    } else {
      return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
