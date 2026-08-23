// POST /api/portal-access/[campaignId]/revoke
// Security Hardening Phase 1 — revocation capability for portal access tokens.
//
// Revokes every currently-active portal_access_tokens row for a campaign.
// Any previously emailed portal link (publish-to-portal, release-to-client,
// send-agency-preview) stops working immediately — portal-chat and
// portal-notify both re-check the token on every call. To re-grant access,
// re-run publish/release/preview from the campaign panel, which mints a
// fresh token.
//
// Session-gated only (internal OS action) — same pattern as the other
// client-facing report routes hardened in this phase.

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { revokePortalTokens } from "@/lib/portal/access-token";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const authError = await requireSession();
  if (authError) return authError;

  try {
    const { campaignId } = await params;
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    }

    await revokePortalTokens(campaignId);

    return NextResponse.json({ ok: true, revoked: true, campaign_id: campaignId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
