// app/api/portal-notify/route.ts
// Fired server-side (fire-and-forget) when portal-chat detects [ESCALATE: reason].
// Sends a contextual email to the assigned campaign strategist.
// Currently: console.log stub. Activate by uncommenting Resend in lib/email.ts.

import { NextRequest, NextResponse } from "next/server";
import { sendPortalEscalation } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_name,
      client_name,
      client_question,
      widget_response,
      escalation_reason,
      strategist_email,
      strategist_name,
      portal_url,
    } = body as {
      campaign_id: string;
      campaign_name: string;
      client_name: string;
      client_question: string;
      widget_response: string;
      escalation_reason: string;
      strategist_email: string;
      strategist_name: string;
      portal_url: string;
    };

    if (!strategist_email || !client_question) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await sendPortalEscalation({
      campaignName: campaign_name,
      clientName: client_name,
      clientQuestion: client_question,
      widgetResponse: widget_response,
      escalationReason: escalation_reason,
      strategistName: strategist_name,
      strategistEmail: strategist_email,
      portalUrl: portal_url,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[portal-notify] error:", err);
    return NextResponse.json({ error: "Failed to send escalation" }, { status: 500 });
  }
}
