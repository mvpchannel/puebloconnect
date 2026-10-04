import { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, SessionPayload } from "@/lib/session";

// Used by any API route that must know which real, logged-in user is
// making the request (e.g. "whose membership is this payment for") —
// membership purchases are tied to a real account, never anonymous.
export function requireUser(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
