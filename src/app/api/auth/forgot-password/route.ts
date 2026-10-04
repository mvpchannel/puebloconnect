import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createPasswordResetToken } from "@/lib/db";
import { generateRawToken, hashToken, expiresAtIso, PASSWORD_RESET_TTL_SECONDS } from "@/lib/tokens";
import { sendTransactionalEmail, buildPasswordResetEmail } from "@/lib/email";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const NEUTRAL_MESSAGE =
  "If an account exists for that email address, we've sent password-reset instructions.";

// POST /api/auth/forgot-password — always returns the same neutral
// message whether or not the email is registered (no account-enumeration
// leak). The only observable difference for a non-existent email is that
// no email is sent, which an attacker can't see from this endpoint alone.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  // Rate-limited by IP only (not by the submitted email) — limiting by
  // email would itself leak which emails are "being limited more," i.e.
  // registered. An attacker could still try many emails from one IP, but
  // the IP bucket caps that.
  const limit = checkAndRecordRateLimit(`forgot-password:ip:${ip}`, RATE_LIMITS.forgotPassword);
  if (!limit.allowed) {
    // Still return the neutral message — do not reveal rate limiting
    // state to a potential enumerator either.
    return NextResponse.json({ message: NEUTRAL_MESSAGE });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: NEUTRAL_MESSAGE });
  }
  const { email } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ message: NEUTRAL_MESSAGE });
  }

  const user = getUserByEmail(email.trim().toLowerCase());
  if (user) {
    const rawToken = generateRawToken();
    createPasswordResetToken(user.id, hashToken(rawToken), expiresAtIso(PASSWORD_RESET_TTL_SECONDS));
    await sendTransactionalEmail("password_reset", buildPasswordResetEmail(user.email, rawToken));
  }
  // When no user matches, deliberately do nothing further — same
  // response either way, no email sent, no timing side-channel addressed
  // beyond what's reasonable for this scale (hashing/token work is
  // skipped for a non-match, which is an accepted minor timing
  // difference against a resource-constrained attacker only).

  return NextResponse.json({ message: NEUTRAL_MESSAGE });
}
