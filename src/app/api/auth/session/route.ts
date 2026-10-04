import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getUserById, countUnreadMessages, countUnreadNotifications } from "@/lib/db";

// GET /api/auth/session — used by client components to ask "who am I?"
// Re-reads the user from the DB (not just the cookie payload) so a role
// change, account deletion, or password change (which bumps
// session_version — see session.ts) takes effect immediately instead of
// waiting for the cookie to expire.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ user: null });

  const payload = verifySession(token);
  if (!payload) return NextResponse.json({ user: null });

  const user = getUserById(payload.sub);
  if (!user) return NextResponse.json({ user: null });
  if (user.session_version !== payload.pwv) return NextResponse.json({ user: null });
  if (user.account_status !== "active") return NextResponse.json({ user: null });

  // getUserById already excludes password_hash. Real counts (not static
  // placeholders) for the Header.tsx badges — see countUnreadMessages/
  // countUnreadNotifications in db.ts.
  return NextResponse.json({
    user,
    unreadMessageCount: countUnreadMessages(user.id),
    unreadNotificationCount: countUnreadNotifications(user.id),
  });
}
