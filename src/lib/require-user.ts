import { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, SessionPayload } from "@/lib/session";
import { getUserById } from "@/lib/db";

// Used by any API route that must know which real, logged-in user is
// making the request (e.g. "whose membership is this payment for") —
// membership purchases are tied to a real account, never anonymous.
//
// Also performs the DB-backed check that an Edge-only verify (middleware)
// cannot: if the token's embedded session_version (`pwv`) no longer
// matches the user's current session_version in the database — meaning
// the password was changed after this token was issued — the token is
// rejected even though its signature and expiry are still valid. See the
// comment on SessionPayload.pwv in session.ts.
export function requireUser(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;

  const user = getUserById(payload.sub);
  if (!user) return null;
  if (user.session_version !== payload.pwv) return null;
  if (user.account_status !== "active") return null;

  return payload;
}
