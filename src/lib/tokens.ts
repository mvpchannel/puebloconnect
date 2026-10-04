// Secure, single-use, expiring tokens for email verification and password
// reset — Node's built-in crypto only, no dependency.
//
// The raw token is what goes in the emailed URL and is shown to the member
// exactly once. Only a SHA-256 hash of it is ever stored in the database
// (see db.ts's email_verification_tokens / password_reset_tokens tables).
// This means a stolen copy of the database does not hand over usable
// tokens — same principle as never storing plain-text passwords.

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32; // 256 bits of entropy

export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function tokensEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour — shorter than
// verification on purpose: a reset token grants control of the account.

export function expiresAtIso(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString().replace("T", " ").replace("Z", "");
}

export function isExpired(expiresAtRow: string): boolean {
  // SQLite datetime('now') strings are UTC "YYYY-MM-DD HH:MM:SS" — compare
  // as Date objects (both treated as UTC) rather than string compare.
  const expires = new Date(expiresAtRow.replace(" ", "T") + "Z").getTime();
  return Date.now() > expires;
}
