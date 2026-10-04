import { NextRequest, NextResponse } from "next/server";
import { getUserByUsernameOrEmail, recordLogin } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const REMEMBER_ME_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SESSION_ONLY_TTL_SECONDS = 60 * 60 * 24; // 1 day — still a real
// expiry on the signed token (it has to have one), but short, and the
// cookie itself is set without maxAge so the browser drops it on close.

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { username, password, rememberMe } = (body ?? {}) as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const identifier = username.trim();

  // Rate-limit by IP AND by the identifier being attempted, so one bad
  // actor can't spray guesses for a single account from many IPs without
  // also being slowed by the per-account bucket, nor exhaust a shared-IP
  // bucket (e.g. a whole household) to lock out everyone else's single
  // account bucket.
  const ipLimit = checkAndRecordRateLimit(`login:ip:${ip}`, RATE_LIMITS.login);
  const idLimit = checkAndRecordRateLimit(
    `login:id:${identifier.toLowerCase()}`,
    RATE_LIMITS.login
  );
  if (!ipLimit.allowed || !idLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const user = getUserByUsernameOrEmail(identifier);

  // Deliberately identical error for "no such user" and "wrong password"
  // — distinguishing them lets an attacker enumerate valid usernames/emails.
  const invalid = () =>
    NextResponse.json(
      { error: "The email/username or password you entered is incorrect." },
      { status: 401 }
    );

  if (!user) return invalid();
  if (user.account_status !== "active") return invalid();
  if (!verifyPassword(password, user.password_hash)) return invalid();

  recordLogin(user.id);

  // Session regeneration after successful login: a brand-new signed token
  // is issued here on every login (this route never reuses or extends an
  // existing cookie) — a fresh session_version snapshot and a fresh
  // expiry, so an old pre-login cookie (if any) is fully replaced rather
  // than adopted.
  const ttl = rememberMe === true ? REMEMBER_ME_TTL_SECONDS : SESSION_ONLY_TTL_SECONDS;
  const token = signSession(
    { sub: user.id, username: user.username, role: user.role, pwv: user.session_version },
    ttl
  );

  const res = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      email_verified_at: user.email_verified_at,
    },
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe === true ? { maxAge: ttl } : {}), // omit maxAge => session cookie
  });
  return res;
}
