// Session tokens — a minimal, self-contained signed-cookie scheme (same
// idea as a JWT, hand-rolled with Node's built-in crypto so no dependency
// is needed). This file is for the Node.js runtime (Route Handlers, Server
// Components) where signing happens. Verifying a token during routing
// happens in `middleware.ts`, which runs on the Edge runtime and can't
// import this file — see the comment there for why, and
// `src/lib/session-edge.ts` for the Edge-safe verifier that must stay in
// sync with the format below.
//
// Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
// The payload is never encrypted, only signed — it must not contain
// secrets, only the user id/username/role needed to route requests.

import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionPayload = {
  sub: number; // user id
  username: string;
  role: "member" | "admin";
  exp: number; // unix seconds
  // Snapshot of the user's session_version (db.ts) at the moment this
  // token was issued. Changing a password bumps that column; any route
  // handler with DB access (requireUser, /api/auth/session) compares this
  // value against the current one and rejects a stale token even though
  // it's still cryptographically valid and unexpired — this is how
  // "invalidate existing sessions after password change" works without a
  // server-side session store. The Edge middleware (session-edge.ts) has
  // no DB access and so cannot perform this check; it only verifies the
  // signature and expiry. That's an accepted, documented limitation: a
  // stolen-but-password-since-changed cookie could still pass the Edge
  // gate into a page shell, but any real data request through a Node
  // route handler (which is how this app fetches data) is rejected.
  pwv: number;
};

const SESSION_COOKIE_NAME = "pueblo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random value in " +
        ".env.local before starting the server — see .env.example. " +
        "Refusing to sign sessions with a weak/default secret."
    );
  }
  return secret;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlToBuffer(str: string): Buffer {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function signSession(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(full), "utf8"));
  const sig = createHmac("sha256", getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifySession(token: string): SessionPayload | null {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;
  const expectedSig = createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest();
  const providedSig = b64urlToBuffer(sigB64);
  if (
    expectedSig.length !== providedSig.length ||
    !timingSafeEqual(expectedSig, providedSig)
  ) {
    return null;
  }
  const payload = JSON.parse(
    b64urlToBuffer(payloadB64).toString("utf8")
  ) as SessionPayload;
  if (!payload.exp || Date.now() / 1000 > payload.exp) return null;
  return payload;
}

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS };
