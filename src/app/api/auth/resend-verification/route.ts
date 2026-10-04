import { NextRequest, NextResponse } from "next/server";
import {
  getUserByEmail,
  createEmailVerificationToken,
  invalidateEmailVerificationTokensForUser,
} from "@/lib/db";
import { generateRawToken, hashToken, expiresAtIso, EMAIL_VERIFICATION_TTL_SECONDS } from "@/lib/tokens";
import { sendTransactionalEmail, buildVerificationEmail } from "@/lib/email";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const NEUTRAL_MESSAGE =
  "If an account exists for that email address and it isn't verified yet, we've sent a new verification link.";

// POST /api/auth/resend-verification — same account-enumeration-safe
// shape as forgot-password: always returns the same neutral message
// regardless of whether the email exists, is already verified, etc.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = checkAndRecordRateLimit(`resend-verification:ip:${ip}`, RATE_LIMITS.resendVerification);
  if (!limit.allowed) {
    return NextResponse.json({ message: NEUTRAL_MESSAGE });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { email } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ message: NEUTRAL_MESSAGE });
  }

  const user = getUserByEmail(email.trim().toLowerCase());
  if (user && !user.email_verified_at) {
    invalidateEmailVerificationTokensForUser(user.id);
    const rawToken = generateRawToken();
    createEmailVerificationToken(user.id, hashToken(rawToken), expiresAtIso(EMAIL_VERIFICATION_TTL_SECONDS));
    await sendTransactionalEmail("welcome_verify", buildVerificationEmail(user.email, rawToken));
  }

  return NextResponse.json({ message: NEUTRAL_MESSAGE });
}
