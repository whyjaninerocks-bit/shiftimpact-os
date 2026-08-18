// app/api/portal-notify/route.ts
// Called explicitly by the portal widget AFTER the client confirms they want
// the strategist to follow up. Never auto-fires — confirmation is client-side.
//
// Looks up strategist email server-side from campaign_id so the email
// is never exposed to the browser.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPortalEscalation } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_id,
      campaign_name,
      client_name,
      client_question,
      widget_response,
      escalation_reason,
      portal_url,
    } = body as {
      campaign_id: string;
      campaign_name: string;
      client_name: string;
      client_question: string;
      widget_response: string;
      escalation_reason: string;
      portal_url: string;
    };

    if (!campaign_id || !client_question) {
      return NextResponse.json({ error: "campaign_id and client_question required" }, { status: 400 });
    }

    // Look up strategist server-side — never expose email to client
    const supabase = createAdminClient();
    let strategistEmail: string | null = null;
    let strategistName: string = "Your strategist";

    const { data: campaign } = await supabase
      .from("campaigns_with_overview")
      .select("team_member_id, team_member_name")
      .eq("id", campaign_id)
      .maybeSingle();

    if (campaign?.team_member_id) {
      const { data: tm } = await supabase
        .from("team_members")
        .select("name, email")
        .eq("id", campaign.team_member_id)
        .maybeSingle();
      if (tm) {
        strategistEmail = tm.email ?? null;
        strategistName = tm.name ?? strategistName;
      }
    }

    // Fallback to env var (demo / no assigned team member)
    if (!strategistEmail) {
      strategistEmail = process.env.STRATEGIST_FALLBACK_EMAIL ?? null;
    }

    if (!strategistEmail) {
      console.warn("[portal-notify] No strategist email found for campaign", campaign_id);
      return NextResponse.json({ ok: true, sent: false, reason: "no_email" });
    }

    await sendPortalEscalation({
      campaignName: campaign_name,
      clientName: client_name,
      clientQuestion: client_question,
      widgetResponse: widget_response,
      escalationReason: escalation_reason,
      strategistName,
      strategistEmail,
      portalUrl: portal_url,
    });

    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[portal-notify] error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
