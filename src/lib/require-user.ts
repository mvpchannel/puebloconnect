import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE_NAME, SessionPayload } from "@/lib/session";
import { getUserById } from "@/lib/db";

// Shared by requireUser (route handlers, which get a NextRequest) and
// getCurrentUser (Server Components, which read cookies() instead) — same
// checks either way, so a Server Component can't accidentally skip the
// session_version/account_status checks that routes already do.
function resolveSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;

  const user = getUserById(payload.sub);
  if (!user) return null;
  if (user.session_version !== payload.pwv) return null;
  if (user.account_status !== "active") return null;

  return payload;
}

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
  return resolveSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}

// Same checks as requireUser, for Server Components / Server Actions,
// which don't have a NextRequest to read cookies from — next/headers'
// cookies() is the Server Component equivalent. Used by pages that need
// to know "who's logged in" while rendering (e.g. the newsfeed, to show
// whether the viewer has already liked each post) without doing a client-
// side fetch("/api/auth/session") round trip first.
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return resolveSession(token);
}
