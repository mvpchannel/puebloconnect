import { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, SessionPayload } from "@/lib/session";

// Used by admin-only API routes as a second, server-side check — belt and
// suspenders alongside src/middleware.ts, which already blocks
// non-admins from reaching /admin/* pages. API routes are not covered by
// that same page-routing matcher unless explicitly added, so each
// admin-only route calls this directly rather than assuming middleware
// already checked it.
export function requireAdmin(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}
