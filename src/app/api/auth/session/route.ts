import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getUserById } from "@/lib/db";

// GET /api/auth/session — used by client components to ask "who am I?"
// Re-reads the user from the DB (not just the cookie payload) so a role
// change or account deletion takes effect without waiting for the cookie
// to expire.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ user: null });

  const payload = verifySession(token);
  if (!payload) return NextResponse.json({ user: null });

  const user = getUserById(payload.sub);
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({ user });
}
