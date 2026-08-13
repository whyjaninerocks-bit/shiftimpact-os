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

/**
 * Strip word-to-word hyphens from AI-generated synthesis fields.
 * Converts e.g. "store-level" → "store level", "ad-driven" → "ad driven".
 * Preserves brand names like "7-Eleven" (digit before hyphen is not matched).
 */
function sanitize(s: string | undefined | null): string {
  if (!s) return "";
  return s.replace(/([a-zA-Z])-([a-zA-Z])/g, "$1 $2");
}

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

// ── Prospect match helper ─────────────────────────────────────────────────────
// Extracts the domain from an email, checks if any tracked company's website
// matches, and if so creates a window_alert of type decide_session.
// Always resolves — errors are swallowed so the caller can fire-and-forget.

async function matchProspectDomain(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  sessionId: string,
  email: string
): Promise<void> {
  // Skip personal / generic domains
  const SKIP_DOMAINS = new Set([
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "icloud.com", "me.com", "live.com", "msn.com",
    "protonmail.com", "aol.com", "ymail.com",
  ]);

  const parts = email.split("@");
  if (parts.length !== 2) return;
  const domain = parts[1].toLowerCase();
  if (SKIP_DOMAINS.has(domain)) return;

  // Strip common sub-domains for matching (e.g. mail.suntory.com → suntory.com)
  const baseDomain = domain.replace(/^(mail|info|contact|hello|us|uk|sg|my)\./i, "");

  // Find companies where website contains this domain
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, business_model")
    .or(`website.ilike.%${baseDomain}%`)
    .eq("is_suppressed", false)
    .limit(3);

  if (!companies || companies.length === 0) return;

  // Get the widget_lead row to include decision context in trigger_reason
  const { data: lead } = await supabase
    .from("widget_leads")
    .select("decision_text, assumption_category")
    .eq("session_id", sessionId)
    .single();

  const decisionSnippet = lead?.decision_text
    ? lead.decision_text.slice(0, 120) + (lead.decision_text.length > 120 ? "…" : "")
    : "No decision text captured";

  const posture = lead?.assumption_category ?? "Unknown";

  // Find the decide_session window (prefer B2B if match is B2B model)
  for (const company of companies) {
    const model = company.business_model === "B2B" ? "B2B" : "B2C";

    const { data: window } = await supabase
      .from("opportunity_windows")
      .select("id")
      .eq("window_type", "decide_session")
      .eq("engagement_model", model)
      .single();

    if (!window) continue;

    const triggerReason = `${company.name} email matched on /decide. Posture: ${posture}. Decision: "${decisionSnippet}"`;

    // Upsert — UNIQUE(company_id, window_id) means repeated sessions update the alert
    await supabase
      .from("window_alerts")
      .upsert(
        {
          company_id:     company.id,
          window_id:      window.id,
          trigger_reason: triggerReason,
          detected_at:    new Date().toISOString(),
          is_open:        true,
        },
        { onConflict: "company_id,window_id", ignoreDuplicates: false }
      );
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    session_id,
    email,
    send_report,
    send_with_email,
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
    const cleanEmail = email.toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400, headers: CORS });
    }
    const { error: updateError } = await supabase
      .from("widget_leads")
      .update({ email: cleanEmail })
      .eq("session_id", session_id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500, headers: CORS });
    }

    // ── Prospect match: check if email domain belongs to a tracked company ──
    // Fire-and-forget — never blocks the response.
    matchProspectDomain(supabase, session_id, cleanEmail).catch((err) =>
      console.error("[decide] prospect-match error:", err)
    );

    // ── Send report immediately if synthesis fields provided ──────────────
    // This fires as soon as the email is captured so the report is never gated
    // behind the benchmark step. Phase 2 still saves benchmark analytics.
    if (send_with_email && category && stage_read) {
      const { data: leadRow } = await supabase
        .from("widget_leads")
        .select("decision_text")
        .eq("session_id", session_id)
        .single();

      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL;

      if (resendKey && fromEmail && leadRow?.decision_text) {
        try {
          const html = generateDecideReportHtml(leadRow.decision_text, category ?? "investigate", {
            industry: sanitize(industry),
            brandCategory: sanitize(brand_category),
            stageRead: sanitize(stage_read),
            signalGap: sanitize(signal_gap),
            riskPosture: sanitize(risk_posture),
            gateCondition: sanitize(gate_condition),
            action: sanitize(action),
            bridge: sanitize(bridge),
          });

          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [cleanEmail],
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
            console.error("[decide] Resend error (Phase 1):", await resendRes.text());
          }
        } catch (err) {
          console.error("[decide] Email send failed (Phase 1):", err);
        }
      }
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  }

  // ── Phase 2: send report (send_report: true, has synthesis fields) ─────────
  if (send_report) {
    const {
      campaign_stage,
      signal_gap_type,
      decision_gap_type,
      probe_count,
    } = body;

    // Persist synthesis + classification to DB for decision pattern analytics
    await supabase
      .from("widget_leads")
      .update({
        industry:          industry ?? null,
        brand_category:    brand_category ?? null,
        assumption_category: category ?? null,
        campaign_stage:    campaign_stage ?? null,
        signal_gap_type:   signal_gap_type ?? null,
        decision_gap_type: decision_gap_type ?? null,
        stage_read:        stage_read ?? null,
        signal_gap_text:   signal_gap ?? null,
        gate_condition:    gate_condition ?? null,
        next_action:       action ?? null,
        bridge_question:   bridge ?? null,
        probe_count:       probe_count ?? null,
      })
      .eq("session_id", session_id);

    // Fetch saved email + decision_text + emailed_at from DB
    const { data: row, error: fetchError } = await supabase
      .from("widget_leads")
      .select("decision_text, email, emailed_at")
      .eq("session_id", session_id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500, headers: CORS });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    // Skip email send if already sent in Phase 1 (send_with_email path)
    if (!row?.emailed_at && resendKey && fromEmail && row?.email && row?.decision_text) {
      try {
        const html = generateDecideReportHtml(row.decision_text, category ?? "investigate", {
          industry: sanitize(industry),
          brandCategory: sanitize(brand_category),
          stageRead: sanitize(stage_read),
          signalGap: sanitize(signal_gap),
          riskPosture: sanitize(risk_posture),
          gateCondition: sanitize(gate_condition),
          action: sanitize(action),
          bridge: sanitize(bridge),
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
