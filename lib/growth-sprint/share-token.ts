// lib/growth-sprint/share-token.ts
// Secure public share token generation + verification for Growth Sprint.
// Deliberately NOT the Quick Audit UUID-prefix shortlink pattern (that
// pattern is security-by-obscurity, not revocable, not hashed). This
// follows the same convention as the campaign portal's two-stage release
// token access: high-entropy random token, only the SHA-256 hash is ever
// stored, plaintext is returned to the operator exactly once at publish
// time and never persisted anywhere.

import { randomBytes, createHash } from "crypto";

/** Generates a new high-entropy plaintext token. Never store this value directly. */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url"); // 256 bits, URL-safe
}

/** One-way hash of a plaintext token for storage/lookup. */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verifies a share row is currently valid — not revoked, not expired.
 * Pure function, no I/O, so it's trivially unit-testable.
 */
export function isShareValid(row: {
  revoked_at: string | null;
  expires_at: string | null;
}): boolean {
  if (row.revoked_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return false;
  }
  return true;
}
