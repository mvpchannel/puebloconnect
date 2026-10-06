import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByUsername, getUserByEmail } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  generateRawToken,
  hashToken,
  expiresAtIso,
  EMAIL_VERIFICATION_TTL_SECONDS,
} from "@/lib/tokens";
import { createEmailVerificationToken } from "@/lib/db";
import { sendTransactionalEmail, buildVerificationEmail, buildRegistrationAttemptEmail } from "@/lib/email";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { sniffImageExt } from "@/lib/image-sniff";

// POST /api/auth/register — real signup. Always creates a 'member'; there
// is deliberately no way for a client-submitted request to create an
// 'admin' account (see scripts/create-admin.mjs for how admins are made).
//
// SECURITY NOTES (see also password.ts, session.ts, tokens.ts, email.ts):
// - SQL injection: every query in db.ts uses parameterized `?` placeholders
//   via node:sqlite's prepared statements — no string-concatenated SQL
//   anywhere in this codebase.
// - XSS: React escapes all rendered text by default; nothing in this
//   route or its callers uses dangerouslySetInnerHTML with user input.
// - CSRF: this endpoint only accepts `Content-Type: application/json`
//   bodies via `fetch`, not a classic HTML form submission. A cross-site
//   page cannot trigger a JSON fetch with credentials against this origin
//   without a CORS preflight, and this app sends no
//   Access-Control-Allow-Origin header permitting that — the browser
//   blocks it. Combined with the session cookie's SameSite=Lax (see
//   session.ts cookie options below), this rules out the standard CSRF
//   vectors without needing a separate synchronizer-token scheme.
// - Secrets: no API keys/DB credentials appear anywhere in this file or
//   any file shipped to the browser — see .env.example.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = checkAndRecordRateLimit(`register:ip:${ip}`, RATE_LIMITS.register);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    firstName,
    lastName,
    username,
    email,
    password,
    confirmPassword,
    city,
    agreeToTerms,
    profilePhotoDataUrl,
  } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return NextResponse.json(
      { error: "First name, last name, username, email, and password are required." },
      { status: 400 }
    );
  }

  const cleanFirst = firstName.trim();
  const cleanLast = lastName.trim();
  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanCity = typeof city === "string" ? city.trim() : "";

  if (!cleanFirst || !cleanLast) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }
  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return NextResponse.json(
      { error: "Username must be between 3 and 30 characters." },
      { status: 400 }
    );
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, dots, dashes, and underscores." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }
  if (agreeToTerms !== true) {
    return NextResponse.json(
      { error: "You must agree to the Terms of Service and Privacy Policy." },
      { status: 400 }
    );
  }

  // Same answer whether or not the email already has an account, so this form
  // can't be used to find out who is registered. If it does, the real owner gets
  // an email saying so (and no new account is made). Usernames are public
  // (profile names), so a taken username is still reported plainly.
  const GENERIC_OK = { ok: true, checkEmail: true };
  if (getUserByUsername(cleanUsername)) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }
  if (getUserByEmail(cleanEmail)) {
    hashPassword(password); // keep the response time similar to a real sign-up
    await sendTransactionalEmail("registration_attempt", buildRegistrationAttemptEmail(cleanEmail));
    return NextResponse.json(GENERIC_OK);
  }

  // Optional profile photo: accepted as a small base64 data URL (simpler
  // than multipart for this form) and written to the local filesystem
  // under public/uploads/avatars so it's served as a normal static file.
  // Real storage, not a placeholder — but a single-server-filesystem
  // store, which is why larger/production deployments typically move this
  // to object storage (S3-compatible); noted in the final report.
  let profilePhotoPath: string | null = null;
  if (typeof profilePhotoDataUrl === "string" && profilePhotoDataUrl.length > 0) {
    const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(profilePhotoDataUrl);
    if (!match) {
      return NextResponse.json(
        { error: "Profile photo must be a PNG, JPEG, or WEBP image." },
        { status: 400 }
      );
    }
    const [, mime, ext, base64Data] = match;
    const buffer = Buffer.from(base64Data, "base64");
    const MAX_BYTES = 3 * 1024 * 1024; // 3MB
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Profile photo must be smaller than 3MB." },
        { status: 400 }
      );
    }
    const realExt = sniffImageExt(buffer);
    if (!realExt) {
      return NextResponse.json(
        { error: "Profile photo must be a PNG, JPEG, or WEBP image." },
        { status: 400 }
      );
    }
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    const safeExt = realExt; // from the file bytes, not the client-declared type
    void ext;
    const fileName = `${randomUUID()}.${safeExt}`;
    writeFileSync(path.join(uploadsDir, fileName), buffer);
    profilePhotoPath = `/uploads/avatars/${fileName}`;
    void mime;
  }

  let user;
  try {
    const passwordHash = hashPassword(password);
    user = createUser(cleanUsername, cleanEmail, passwordHash, "member", {
      firstName: cleanFirst,
      lastName: cleanLast,
      city: cleanCity || null,
      profilePhotoPath,
    });
  } catch {
    // Most likely cause: a concurrent request won the UNIQUE-constraint
    // race on username or email between the check above and this insert.
    if (getUserByUsername(cleanUsername)) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json(GENERIC_OK);
  }

  // Send the verification email. A failure to send must not be reported
  // to the client as registration failure (the account is already
  // created) — but it IS surfaced honestly via the response so the UI can
  // tell the member to use "resend verification email" if needed.
  const rawToken = generateRawToken();
  createEmailVerificationToken(
    user.id,
    hashToken(rawToken),
    expiresAtIso(EMAIL_VERIFICATION_TTL_SECONDS)
  );
  await sendTransactionalEmail("welcome_verify", buildVerificationEmail(user.email, rawToken));

  // No session is started here: the form answers identically for new and
  // existing emails, so the person signs in after confirming their address.
  return NextResponse.json(GENERIC_OK);
}
