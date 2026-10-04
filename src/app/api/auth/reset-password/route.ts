import { NextRequest, NextResponse } from "next/server";
import {
  getPasswordResetTokenByHash,
  markPasswordResetTokenUsed,
  revokeOtherPasswordResetTokens,
  updateUserPassword,
  getUserById,
} from "@/lib/db";
import { hashToken, isExpired } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";
import { sendTransactionalEmail, buildPasswordChangedEmail } from "@/lib/email";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

// POST /api/auth/reset-password — { token, newPassword, confirmNewPassword }
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = checkAndRecordRateLimit(`reset-password:ip:${ip}`, RATE_LIMITS.resetPassword);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { token, newPassword, confirmNewPassword } = (body ?? {}) as Record<string, unknown>;
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Reset link is missing its token." }, { status: 400 });
  }
  if (typeof newPassword !== "string" || typeof confirmNewPassword !== "string") {
    return NextResponse.json({ error: "New password is required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (newPassword !== confirmNewPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const record = getPasswordResetTokenByHash(hashToken(token));
  if (!record) {
    return NextResponse.json({ error: "This reset link is invalid." }, { status: 400 });
  }
  if (record.used_at) {
    return NextResponse.json({ error: "This reset link has already been used." }, { status: 400 });
  }
  if (record.revoked_at) {
    return NextResponse.json({ error: "This reset link is no longer valid." }, { status: 400 });
  }
  if (isExpired(record.expires_at)) {
    return NextResponse.json({ error: "This reset link has expired." }, { status: 400 });
  }

  const user = getUserById(record.user_id);
  if (!user) {
    return NextResponse.json({ error: "This reset link is invalid." }, { status: 400 });
  }

  // Invalidate the token FIRST (single-use), then apply the change —
  // updateUserPassword also bumps session_version, which invalidates
  // every previously-issued session cookie for this account (see
  // session.ts / require-user.ts).
  markPasswordResetTokenUsed(record.id);
  revokeOtherPasswordResetTokens(user.id, record.id);
  updateUserPassword(user.id, hashPassword(newPassword));

  await sendTransactionalEmail("password_changed", buildPasswordChangedEmail(user.email));

  return NextResponse.json({ ok: true });
}
