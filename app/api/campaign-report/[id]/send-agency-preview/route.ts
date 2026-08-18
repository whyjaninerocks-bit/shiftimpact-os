// POST /api/campaign-report/[id]/send-agency-preview
// Stage 1 of two-stage portal release.
// Sets agency_preview_at = NOW() and emails all agency_client recipients.
// Agency clients see the intelligence first so they can prep their narrative
// before the brand client receives access.
//
// Requires: migration 0065 (agency_preview_at on campaign_reports,
//           recipient_type on client_report_recipients)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function buildAgencyPreviewEmail(params: {
  campaignName: string;
  reportLabel: string;
  reportWeek: number;
  portalUrl: string;
}): string {
  const { campaignName, reportLabel, reportWeek, portalUrl } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Agency preview ready — ${campaignName}</title>
<style>
  body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  .wrapper { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
  .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .header { background: #1e3a5f; padding: 28px 32px; }
  .header-label { font-size: 10px; color: #93c5fd; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 6px; }
  .header-title { font-size: 20px; font-weight: 600; color: #ffffff; margin: 0; }
  .body { padding: 28px 32px; }
  .preview-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid #bfdbfe; margin-bottom: 20px; }
  .intro { font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 20px; }
  .intro strong { color: #111827; }
  .notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
  .notice p { font-size: 13px; color: #92400e; margin: 0; line-height: 1.6; }
  .cta-btn { display: block; text-align: center; background: #1e3a5f; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 24px; border-radius: 8px; text-decoration: none; margin: 0 0 20px; }
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
      <p class="header-label">ShiftImpact OS — Agency Preview</p>
      <p class="header-title">Week ${reportWeek} intelligence is ready for your review</p>
    </div>
    <div class="body">
      <span class="preview-badge">Agency preview — not yet released to client</span>
      <p class="intro">
        The Week ${reportWeek} Growth Intelligence report for <strong>${campaignName}</strong> (${reportLabel}) has been prepared and is now available for your agency review.
      </p>
      <div class="notice">
        <p>This is your preview window. The brand client has not yet received access. Review the findings, add any agency narrative notes, and release to the brand client when ready.</p>
      </div>
      <a href="${portalUrl}" class="cta-btn">Review the intelligence →</a>
      <hr class="divider" />
      <p class="note">
        To release this report to the brand client, use the ShiftImpact OS campaign panel. You can add an agency note before releasing.
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
    const supabase = createAdminClient();

    // 1. Fetch the report (must be "ready", not already previewed)
    const { data: report, error: reportErr } = await supabase
      .from("campaign_reports")
      .select("id, report_label, report_week, status, campaign_id, agency_preview_at, client_released_at")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    if (report.status !== "ready") {
      return NextResponse.json(
        { error: "Only reports with status 'ready' can be sent for agency preview." },
        { status: 400 }
      );
    }
    if (report.agency_preview_at) {
      return NextResponse.json(
        { error: "Agency preview has already been sent for this report." },
        { status: 409 }
      );
    }

    // 2. Fetch campaign + client
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, client_id")
      .eq("id", report.campaign_id)
      .single();

    // 3. Collect agency_client recipients
    const agencyRecipients: Array<{ name: string | null; email: string }> = [];
    if (campaign?.client_id) {
      const { data: recipients } = await supabase
        .from("client_report_recipients")
        .select("name, email, recipient_type")
        .eq("client_id", campaign.client_id)
        .eq("recipient_type", "agency_client");
      if (recipients) {
        for (const r of recipients) {
          if (r.email) agencyRecipients.push({ name: r.name ?? null, email: r.email });
        }
      }
    }

    // 4. Set agency_preview_at
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("campaign_reports")
      .update({ agency_preview_at: now })
      .eq("id", reportId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 5. Send preview email to agency_client recipients
    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.shift-impact.com";

    if (resendKey && fromEmail && agencyRecipients.length > 0) {
      const portalUrl = `${appUrl}/portal/${report.campaign_id}?view=agency`;
      const html = buildAgencyPreviewEmail({
        campaignName: campaign?.name ?? "your campaign",
        reportLabel: report.report_label ?? `Week ${report.report_week}`,
        reportWeek: report.report_week ?? 0,
        portalUrl,
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
            to: agencyRecipients.map((r) => r.email),
            subject: `[Agency preview] Week ${report.report_week ?? ""} — ${campaign?.name ?? ""}`,
            html,
          }),
        });
        if (res.ok) emailSent = true;
        else console.error("[agency-preview] Resend error:", await res.text());
      } catch (err) {
        console.error("[agency-preview] Email send failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      agency_preview_at: now,
      email_sent: emailSent,
      agency_recipients_count: agencyRecipients.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
