import { NextRequest, NextResponse } from "next/server";
import {
  getEmailVerificationTokenByHash,
  markEmailVerificationTokenUsed,
  markEmailVerified,
  getUserById,
} from "@/lib/db";
import { hashToken, isExpired } from "@/lib/tokens";
import { sendTransactionalEmail, buildEmailVerifiedEmail } from "@/lib/email";

// GET /api/auth/verify-email?token=... — called by the link in the
// verification email. The token itself never carries any sensitive data
// (just enough entropy to be unguessable); only its SHA-256 hash is ever
// looked up against the database (see tokens.ts).
export async function GET(req: NextRequest) {
  const rawToken = req.nextUrl.searchParams.get("token");
  if (!rawToken) {
    return NextResponse.json({ ok: false, reason: "missing_token" }, { status: 400 });
  }

  const record = getEmailVerificationTokenByHash(hashToken(rawToken));
  if (!record) {
    return NextResponse.json({ ok: false, reason: "invalid_token" }, { status: 400 });
  }
  if (record.used_at) {
    return NextResponse.json({ ok: false, reason: "already_used" }, { status: 400 });
  }
  if (isExpired(record.expires_at)) {
    return NextResponse.json({ ok: false, reason: "expired" }, { status: 400 });
  }

  markEmailVerificationTokenUsed(record.id);
  markEmailVerified(record.user_id);

  const user = getUserById(record.user_id);
  if (user) {
    // Best-effort confirmation email — doesn't block the verification
    // result if sending fails.
    await sendTransactionalEmail("email_verified", buildEmailVerifiedEmail(user.email));
  }

  return NextResponse.json({ ok: true });
}
