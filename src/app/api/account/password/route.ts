import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getUserByUsername, updateUserPassword } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendTransactionalEmail, buildPasswordChangedEmail } from "@/lib/email";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { signSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/session";

// POST /api/account/password — change-password while logged in (not the
// "forgot password" email-token flow in /api/auth/reset-password, which
// stays separate for a signed-out member). Requires the current password,
// same as any real "change password" settings form, and sends the same
// password-changed notice email reset-password already sends — see
// buildPasswordChangedEmail in src/lib/email.ts.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const ip = clientIp(req);
  const limit = checkAndRecordRateLimit(`change-password:user:${session.sub}:ip:${ip}`, RATE_LIMITS.resetPassword);
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

  const { currentPassword, newPassword, confirmNewPassword } = (body ?? {}) as Record<string, unknown>;
  if (typeof currentPassword !== "string" || !currentPassword) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }
  if (typeof newPassword !== "string" || typeof confirmNewPassword !== "string") {
    return NextResponse.json({ error: "New password is required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  if (newPassword !== confirmNewPassword) {
    return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  }

  const user = getUserByUsername(session.username);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  updateUserPassword(user.id, hashPassword(newPassword));
  await sendTransactionalEmail("password_changed", buildPasswordChangedEmail(user.email));

  // Password change bumps session_version (see updateUserPassword), which
  // invalidates the cookie this very request came in on. Re-sign a fresh
  // token now so the member isn't logged out by changing their own
  // password — the client never sees or needs to know this happened.
  const refreshed = getUserByUsername(session.username)!;
  const token = signSession({
    sub: refreshed.id,
    username: refreshed.username,
    role: refreshed.role,
    pwv: refreshed.session_version,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
