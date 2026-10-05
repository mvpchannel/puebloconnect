import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/require-user";
import { getUserByUsername, deleteUserAccount } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { sendTransactionalEmail, buildAccountDeletedEmail } from "@/lib/email";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// POST /api/account/delete — { password, confirm: "DELETE" }. Permanently
// erases the member's personal data (see deleteUserAccount in db.ts).
// Requires the current password, like change-password, and is rate-limited
// the same way.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const limit = checkAndRecordRateLimit(
    `delete-account:user:${session.sub}:ip:${clientIp(req)}`,
    RATE_LIMITS.resetPassword
  );
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { password, confirm } = (body ?? {}) as Record<string, unknown>;
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }
  if (typeof password !== "string" || !password || password.length > 1024) {
    return NextResponse.json({ error: "Your password is required." }, { status: 400 });
  }

  const user = getUserByUsername(session.username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "That password isn't correct." }, { status: 403 });
  }
  const originalEmail = user.email;

  const result = deleteUserAccount(user.id);
  if (!result.ok) {
    const messages = {
      admin: "Administrator accounts can't be deleted here. Ask another admin to change your role first.",
      owns_business:
        "You own a business channel. Contact us to close or transfer it first, then you can delete your account.",
      not_found: "That account no longer exists.",
    } as const;
    return NextResponse.json({ error: messages[result.reason] }, { status: result.reason === "not_found" ? 404 : 409 });
  }

  // Remove uploaded images from disk (best effort; only inside public/uploads).
  const root = path.join(process.cwd(), "public");
  for (const f of result.files) {
    if (!f.startsWith("/uploads/") || f.includes("..")) continue;
    await unlink(path.join(root, f)).catch(() => {});
  }
  await sendTransactionalEmail("account_deleted", buildAccountDeletedEmail(originalEmail)).catch(() => {});

  const res = NextResponse.json({ deleted: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
