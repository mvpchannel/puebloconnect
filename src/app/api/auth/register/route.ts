import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByUsername } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/session";

// POST /api/auth/register — real signup. Always creates a 'member'; there
// is deliberately no way for a client-submitted request to create an
// 'admin' account (see scripts/create-admin.mjs for how admins are made).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { username, email, password } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return NextResponse.json(
      { error: "Username, email, and password are required." },
      { status: 400 }
    );
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

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

  if (getUserByUsername(cleanUsername)) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  let user;
  try {
    const passwordHash = hashPassword(password);
    user = createUser(cleanUsername, cleanEmail, passwordHash, "member");
  } catch (err) {
    // Most likely cause: the email is already registered (UNIQUE constraint).
    return NextResponse.json(
      { error: "That username or email is already registered." },
      { status: 409 }
    );
  }

  const token = signSession({ sub: user.id, username: user.username, role: user.role });

  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
