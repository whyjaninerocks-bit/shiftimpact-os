// app/api/widget-lead/route.ts
// Public endpoint — no auth required. CORS open for embeds + external demos.
//
// POST /api/widget-lead   — create a lead record (decision + assumption, no email yet)
// PATCH /api/widget-lead  — add email to an existing lead; send personalised report via Resend
//
// Email send requires RESEND_API_KEY + RESEND_FROM_EMAIL in Vercel env.
// If either is missing, email is skipped gracefully — DB save always completes.
//
// Table: widget_leads
// session_id is a client-generated UUID that ties the two calls together.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDecideReportHtml } from "@/lib/email/decide-report";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { session_id, decision_text, assumption_category } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400, headers: CORS });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("widget_leads")
    .upsert(
      {
        session_id,
        decision_text: decision_text ?? null,
        assumption_category: assumption_category ?? null,
      },
      { onConflict: "session_id" }
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json(data, { status: 201, headers: CORS });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    session_id,
    email,
    send_report,
    category,
    industry,
    brand_category,
    stage_read,
    signal_gap,
    risk_posture,
    gate_condition,
    action,
    bridge,
  } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400, headers: CORS });
  }

  const supabase = createAdminClient();

  // ── Phase 1: save email (no send_report flag) ─────────────────────────────
  if (email && !send_report) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400, headers: CORS });
    }
    const { error: updateError } = await supabase
      .from("widget_leads")
      .update({ email: email.toLowerCase().trim() })
      .eq("session_id", session_id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500, headers: CORS });
    }
    return NextResponse.json({ ok: true }, { headers: CORS });
  }

  // ── Phase 2: send report (send_report: true, has synthesis fields) ─────────
  if (send_report) {
    // Fetch saved email + decision_text from DB
    const { data: row, error: fetchError } = await supabase
      .from("widget_leads")
      .select("decision_text, email")
      .eq("session_id", session_id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500, headers: CORS });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (resendKey && fromEmail && row?.email && row?.decision_text) {
      try {
        const html = generateDecideReportHtml(row.decision_text, category ?? "investigate", {
          industry: industry ?? "",
          brandCategory: brand_category ?? "",
          stageRead: stage_read ?? "",
          signalGap: signal_gap ?? "",
          riskPosture: risk_posture ?? "",
          gateCondition: gate_condition ?? "",
          action: action ?? "",
          bridge: bridge ?? "",
        });

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [row.email],
            subject: "Your decision analysis from ShiftImpact Growth Intelligence",
            html,
          }),
        });

        if (resendRes.ok) {
          await supabase
            .from("widget_leads")
            .update({ emailed_at: new Date().toISOString() })
            .eq("session_id", session_id);
        } else {
          console.error("Resend error:", await resendRes.text());
        }
      } catch (err) {
        console.error("Email send failed:", err);
      }
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  }

  return NextResponse.json({ error: "Invalid PATCH payload" }, { status: 400, headers: CORS });
}

export async function GET(req: NextRequest) {
  // Internal only — list recent leads for Janine
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("widget_leads")
    .select("id, session_id, assumption_category, email, created_at, emailed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json(data ?? [], { headers: CORS });
}
