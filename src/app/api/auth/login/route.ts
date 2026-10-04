import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/session";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const user = getUserByUsername(username.trim());

  // Deliberately identical error for "no such user" and "wrong password" —
  // distinguishing them lets an attacker enumerate valid usernames.
  const invalid = () =>
    NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });

  if (!user) return invalid();
  if (!verifyPassword(password, user.password_hash)) return invalid();

  const token = signSession({ sub: user.id, username: user.username, role: user.role });

  const res = NextResponse.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
