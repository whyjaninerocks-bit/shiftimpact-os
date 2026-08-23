// lib/portal/access-token.ts
// Security Hardening Phase 1 — signed access tokens for the client portal.
//
// The portal (/portal/[campaignId]) and its two API routes (portal-chat,
// portal-notify) currently have no access control beyond knowledge of the
// campaign UUID in the URL. This gives each published/released report a
// single-use, revocable, expiring token that is appended to the portal
// URL the client is emailed. Anyone with the token can view/ask questions
// about that one campaign's report; anyone without it cannot.
//
// Mirrors the primitives in lib/growth-sprint/share-token.ts (high-entropy
// random token, only the SHA-256 hash is ever stored, plaintext returned
// once at mint time) but is kept as its own module rather than a shared
// import — portal access and growth-sprint sharing are different products
// with different lifecycle rules, and this scope explicitly excludes
// refactoring shared auth architecture.
//
// The demo portal path (portal-chat body.demo === true) never touches
// campaign_id and must stay untouched — do not require a token there.

import { randomBytes, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_TTL_DAYS = 90;

/** Generates a new high-entropy plaintext token. Never store this value directly. */
export function generatePortalToken(): string {
  return randomBytes(32).toString("base64url"); // 256 bits, URL-safe
}

/** One-way hash of a plaintext token for storage/lookup. */
export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mints a fresh portal access token for a campaign and stores its hash.
 * Any prior active token for the same campaign is revoked first, so a
 * campaign has at most one live token at a time (new release = new link).
 * Returns the plaintext token to append to the emailed portal URL.
 */
export async function mintPortalToken(
  campaignId: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<string> {
  const supabase = createAdminClient();
  const token = generatePortalToken();
  const tokenHash = hashPortalToken(token);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  // Revoke any existing active tokens for this campaign first.
  await supabase
    .from("portal_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .is("revoked_at", null);

  await supabase.from("portal_access_tokens").insert({
    campaign_id: campaignId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  return token;
}

/**
 * Verifies a plaintext token grants access to the given campaign.
 * Returns true only if a matching, non-revoked, non-expired row exists.
 */
export async function verifyPortalToken(
  campaignId: string,
  token: string | null | undefined
): Promise<boolean> {
  if (!token) return false;

  const supabase = createAdminClient();
  const tokenHash = hashPortalToken(token);

  const { data: row } = await supabase
    .from("portal_access_tokens")
    .select("revoked_at, expires_at")
    .eq("campaign_id", campaignId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!row) return false;
  if (row.revoked_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false;

  return true;
}

/** Revokes all active tokens for a campaign (revocation capability). */
export async function revokePortalTokens(campaignId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("portal_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .is("revoked_at", null);
}
