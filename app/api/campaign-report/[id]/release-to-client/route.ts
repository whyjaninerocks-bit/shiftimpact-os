// POST /api/campaign-report/[id]/release-to-client
// Stage 2 of two-stage portal release.
// Sets client_released_at = NOW() and emails brand_contact + agency_partner recipients.
// Optionally accepts { agency_note } in the request body — saved to campaign_reports.
//
// Requires: migration 0065

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function buildClientReleaseEmail(params: {
  clientName: string;
  campaignName: string;
  reportLabel: string;
  reportWeek: number;
  portalUrl: string;
  agencyNote: string | null;
}): string {
  const { clientName, campaignName, reportLabel, reportWeek, portalUrl, agencyNote } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your weekly report is ready — ${campaignName}</title>
<style>
  body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  .wrapper { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
  .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .header { background: #111827; padding: 28px 32px; }
  .header-label { font-size: 10px; color: #6b7280; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 6px; }
  .header-title { font-size: 20px; font-weight: 600; color: #ffffff; margin: 0; }
  .body { padding: 28px 32px; }
  .week-badge { display: inline-block; background: #f0fdf4; color: #15803d; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid #bbf7d0; margin-bottom: 20px; }
  .intro { font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 20px; }
  .intro strong { color: #111827; }
  .agency-note { background: #f8fafc; border-left: 3px solid #3b82f6; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0; }
  .agency-note-label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px; }
  .agency-note-text { font-size: 13px; color: #374151; margin: 0; line-height: 1.6; }
  .cta-btn { display: block; text-align: center; background: #111827; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 24px; border-radius: 8px; text-decoration: none; margin: 0 0 20px; }
  .divider { border: none; border-top: 1px solid #f3f4f6; margin: 20px 0; }
  .note { font-size: 12px; color: #9ca3af; line-height: 1.6; }
  .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid #f3f4f6; }
  .footer-text { font-size: 11px; color: #9ca3af; margin: 0; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <p class="header-label">ShiftImpact OS</p>
      <p class="header-title">Your weekly report is ready</p>
    </div>
    <div class="body">
      <span class="week-badge">Week ${reportWeek} — ${reportLabel}</span>
      <p class="intro">
        Hi ${clientName},<br /><br />
        Your weekly Growth Intelligence report for <strong>${campaignName}</strong> has been reviewed and is now available in your campaign portal.
      </p>
      ${agencyNote ? `
      <div class="agency-note">
        <p class="agency-note-label">A note from your agency</p>
        <p class="agency-note-text">${agencyNote}</p>
      </div>
      ` : ""}
      <a href="${portalUrl}" class="cta-btn">View your report →</a>
      <hr class="divider" />
      <p class="note">
        This report was reviewed by your strategist before being shared. If you have questions about any finding, reply to this email and we will walk you through it.
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">ShiftImpact OS &nbsp;·&nbsp; Growth Intelligence for ${campaignName}</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const body = await req.json().catch(() => ({}));
    const agencyNote: string | null = body.agency_note?.trim() || null;

    const supabase = createAdminClient();

    // 1. Fetch the report — must have agency_preview_at set, not yet released
    const { data: report, error: reportErr } = await supabase
      .from("campaign_reports")
      .select("id, report_label, report_week, status, campaign_id, agency_preview_at, client_released_at")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    if (!report.agency_preview_at) {
      return NextResponse.json(
        { error: "Agency preview must be sent before releasing to the brand client." },
        { status: 400 }
      );
    }
    if (report.client_released_at) {
      return NextResponse.json(
        { error: "This report has already been released to the brand client." },
        { status: 409 }
      );
    }

    // 2. Fetch campaign + client
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, client_id")
      .eq("id", report.campaign_id)
      .single();

    let clientEmail: string | null = null;
    let clientName = "there";

    if (campaign?.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("name, contact_email")
        .eq("id", campaign.client_id)
        .single();
      if (client) {
        clientName = client.name ?? "there";
        clientEmail = client.contact_email ?? null;
      }
    }

    // 3. Collect brand_contact + agency_partner recipients
    const allRecipients: string[] = [];
    if (clientEmail) allRecipients.push(clientEmail);

    if (campaign?.client_id) {
      const { data: recipients } = await supabase
        .from("client_report_recipients")
        .select("email, recipient_type")
        .eq("client_id", campaign.client_id)
        .in("recipient_type", ["brand_contact", "agency_partner"]);
      if (recipients) {
        for (const r of recipients) {
          if (r.email && !allRecipients.includes(r.email)) {
            allRecipients.push(r.email);
          }
        }
      }
    }

    // 4. Update: set client_released_at and optional agency_note
    const now = new Date().toISOString();
    const updatePayload: Record<string, string | null> = { client_released_at: now };
    if (agencyNote) updatePayload.agency_note = agencyNote;

    const { error: updateErr } = await supabase
      .from("campaign_reports")
      .update(updatePayload)
      .eq("id", reportId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 5. Send email to brand_contact + agency_partner
    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.shift-impact.com";

    if (resendKey && fromEmail && allRecipients.length > 0) {
      const portalUrl = `${appUrl}/portal/${report.campaign_id}`;
      const html = buildClientReleaseEmail({
        clientName,
        campaignName: campaign?.name ?? "your campaign",
        reportLabel: report.report_label ?? `Week ${report.report_week}`,
        reportWeek: report.report_week ?? 0,
        portalUrl,
        agencyNote,
      });

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: allRecipients,
            subject: `Your Week ${report.report_week ?? ""} report is ready — ${campaign?.name ?? ""}`,
            html,
          }),
        });
        if (res.ok) emailSent = true;
        else console.error("[release-to-client] Resend error:", await res.text());
      } catch (err) {
        console.error("[release-to-client] Email send failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      client_released_at: now,
      email_sent: emailSent,
      recipients_count: allRecipients.length,
      recipients: allRecipients.map((e) => `${e.split("@")[0]}@***`),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
