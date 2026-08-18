/**
 * lib/email.ts — ShiftImpact OS Email Notifications
 *
 * Provider-agnostic abstraction. Currently logs to console.
 * To go live with Resend:
 *   1. npm install resend
 *   2. Add RESEND_API_KEY to Vercel env
 *   3. Uncomment the Resend block below and delete the console.log stub
 *   4. Set FROM_EMAIL to your verified sender (e.g. "notifications@shiftimpact.co")
 */

// ─── Portal Escalation Email ──────────────────────────────────────────────────

export interface PortalEscalationPayload {
  campaignName: string;
  clientName: string;
  clientQuestion: string;
  widgetResponse: string;
  escalationReason: string;
  strategistName: string;
  strategistEmail: string;
  portalUrl: string;
}

function buildEscalationHtml(p: PortalEscalationPayload): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 32px 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden;">

    <div style="background: #111; padding: 24px 32px; display: flex; align-items: center; gap: 12px;">
      <p style="color: #fff; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">ShiftImpact OS</p>
      <span style="background: #f59e0b; color: #000; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">Client Escalation</span>
    </div>

    <div style="padding: 32px;">
      <h1 style="font-size: 18px; font-weight: 700; color: #111; margin: 0 0 4px;">Client question needs your attention</h1>
      <p style="font-size: 13px; color: #888; margin: 0 0 24px;">${p.campaignName} · ${p.clientName}</p>

      <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #92400e; margin: 0 0 6px;">Client asked</p>
        <p style="font-size: 14px; color: #111; margin: 0; font-style: italic;">"${p.clientQuestion}"</p>
      </div>

      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin: 0 0 6px;">Flagged because</p>
        <p style="font-size: 13px; color: #555; margin: 0;">${p.escalationReason}</p>
      </div>

      <div style="background: #f9fafb; border-left: 3px solid #d1d5db; border-radius: 0 6px 6px 0; padding: 14px 18px; margin-bottom: 24px;">
        <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin: 0 0 6px;">What the OS told them</p>
        <p style="font-size: 13px; color: #374151; margin: 0; white-space: pre-wrap;">${p.widgetResponse.substring(0, 800)}${p.widgetResponse.length > 800 ? "..." : ""}</p>
      </div>

      <a href="${p.portalUrl}"
         style="display: inline-block; background: #111; color: #fff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;">
        Open client portal →
      </a>

      <hr style="border: none; border-top: 1px solid #eee; margin: 0 0 16px;" />
      <p style="font-size: 11px; color: #aaa; margin: 0;">ShiftImpact OS · Sent to ${p.strategistName} because they are assigned to this campaign</p>
    </div>
  </div>
</body>
</html>`;
}

function buildEscalationText(p: PortalEscalationPayload): string {
  return `Client escalation — ${p.campaignName} (${p.clientName})

Client asked: "${p.clientQuestion}"

Flagged because: ${p.escalationReason}

What the OS told them:
${p.widgetResponse.substring(0, 600)}

Open portal: ${p.portalUrl}

---
ShiftImpact OS`;
}

export async function sendPortalEscalation(p: PortalEscalationPayload): Promise<void> {
  const html = buildEscalationHtml(p);
  const text = buildEscalationText(p);
  const subject = `Client question flagged — ${p.campaignName}`;

  // ── CONSOLE STUB (active now) ──────────────────────────────────────────
  console.log("[email/sendPortalEscalation] Would send:", {
    subject,
    to: `${p.strategistName} <${p.strategistEmail}>`,
    escalationReason: p.escalationReason,
    question: p.clientQuestion,
  });

  // ── RESEND (uncomment to activate) ────────────────────────────────────
  // const { Resend } = await import("resend");
  // const resend = new Resend(process.env.RESEND_API_KEY!);
  // await resend.emails.send({
  //   from: process.env.FROM_EMAIL ?? "ShiftImpact OS <notifications@shiftimpact.co>",
  //   to: p.strategistEmail,
  //   subject,
  //   html,
  //   text,
  // });
}

export interface BriefNotificationPayload {
  campaignName: string;
  clientName: string;
  frameAnchor: string;
  briefUrl: string;
  recipients: { name: string; email: string; role: "agency" | "client" }[];
}

function buildHtml(p: BriefNotificationPayload): string {
  const recipientRows = p.recipients
    .map((r) => `<li style="margin-bottom:4px;">${r.name} (${r.role})</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 32px 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden;">

    <!-- Header -->
    <div style="background: #111; padding: 24px 32px;">
      <p style="color: #fff; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">ShiftImpact OS</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #111; margin: 0 0 8px;">FRAME Brief locked</h1>
      <p style="font-size: 14px; color: #555; margin: 0 0 24px;">
        The FRAME Brief for <strong>${p.campaignName}</strong> (${p.clientName}) has been locked and is ready for review.
      </p>

      <!-- Anchor callout -->
      <div style="background: #f5f5f5; border-left: 3px solid #111; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
        <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin: 0 0 4px;">The One Idea</p>
        <p style="font-size: 15px; font-weight: 600; color: #111; margin: 0;">${p.frameAnchor}</p>
      </div>

      <!-- CTA -->
      <a href="${p.briefUrl}"
         style="display: inline-block; background: #111; color: #fff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;">
        View Brief →
      </a>

      <p style="font-size: 13px; color: #888; margin: 0 0 8px;">This notification was sent to:</p>
      <ul style="font-size: 13px; color: #555; padding-left: 18px; margin: 0 0 24px;">
        ${recipientRows}
      </ul>

      <hr style="border: none; border-top: 1px solid #eee; margin: 0 0 16px;" />
      <p style="font-size: 11px; color: #aaa; margin: 0;">
        ShiftImpact OS · Campaign Intelligence Platform
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildText(p: BriefNotificationPayload): string {
  return `FRAME Brief locked — ${p.campaignName} (${p.clientName})

The One Idea: ${p.frameAnchor}

View the brief: ${p.briefUrl}

---
ShiftImpact OS`;
}

/**
 * Send FRAME Brief locked notification to all recipients.
 * Currently: logs to console. Swap in Resend/SendGrid below when ready.
 */
export async function sendBriefNotification(p: BriefNotificationPayload): Promise<void> {
  const html = buildHtml(p);
  const text = buildText(p);
  const subject = `FRAME Brief locked — ${p.campaignName}`;

  // ── CONSOLE STUB (active now) ──────────────────────────────────────────
  console.log("[email/sendBriefNotification] Would send:", {
    subject,
    to: p.recipients.map((r) => `${r.name} <${r.email}>`),
    text,
  });

  // ── RESEND (uncomment to activate) ────────────────────────────────────
  // const { Resend } = await import("resend");
  // const resend = new Resend(process.env.RESEND_API_KEY!);
  // await Promise.all(
  //   p.recipients.map((r) =>
  //     resend.emails.send({
  //       from: process.env.FROM_EMAIL ?? "ShiftImpact OS <notifications@shiftimpact.co>",
  //       to: r.email,
  //       subject,
  //       html,
  //       text,
  //     })
  //   )
  // );

  // ── SENDGRID (uncomment to activate) ──────────────────────────────────
  // const sgMail = (await import("@sendgrid/mail")).default;
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  // await Promise.all(
  //   p.recipients.map((r) =>
  //     sgMail.send({ from: process.env.FROM_EMAIL!, to: r.email, subject, html, text })
  //   )
  // );
}
