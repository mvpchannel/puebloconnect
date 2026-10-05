import { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, SessionPayload } from "@/lib/session";
import { getUserById } from "@/lib/db";

// Used by admin-only API routes as a second, server-side check — belt and
// suspenders alongside src/middleware.ts, which already blocks
// non-admins from reaching /admin/* pages. API routes are not covered by
// that same page-routing matcher unless explicitly added, so each
// admin-only route calls this directly rather than assuming middleware
// already checked it.
//
// The role is re-read from the database, not trusted from the cookie: a
// demoted, suspended or deleted admin (or one who changed their
// password) loses API access immediately instead of when the cookie
// expires. The returned payload carries the CURRENT role.
export function requireAdmin(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;

  const user = getUserById(payload.sub);
  if (!user) return null;
  if (user.role !== "admin") return null;
  if (user.session_version !== payload.pwv) return null;
  if (user.account_status !== "active") return null;

  return { ...payload, role: user.role };
}
