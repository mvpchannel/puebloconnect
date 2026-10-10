// Edge-safe session verification — used ONLY by middleware.ts.
//
// Next.js Middleware runs on the Edge runtime, which does not have Node's
// `crypto` module (no `createHmac`) or `node:sqlite`. It does have the
// standard Web Crypto API (`crypto.subtle`), which is what this file uses
// instead. This was verified by hand in this environment: a token signed
// with Node's `createHmac` in session.ts round-trips correctly through
// `crypto.subtle.verify` here, including correctly rejecting a wrong
// secret and a tampered payload — HMAC-SHA256 is the same algorithm on
// both sides, just a different API.
//
// This file must stay format-compatible with session.ts (same payload
// shape, same base64url encoding) — it only ever reads tokens, never
// issues them.

export type SessionPayload = {
  sub: number;
  username: string;
  role: "member" | "admin";
  exp: number;
  pwv: number;
};

function b64urlToUint8Array(str: string): Uint8Array {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8ToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export async function verifySessionEdge(
  token: string,
  secret: string
): Promise<SessionPayload | null> {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    utf8ToUint8Array(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToUint8Array(sigB64) as BufferSource,
    utf8ToUint8Array(payloadB64) as BufferSource
  );
  if (!valid) return null;

  const payloadJson = new TextDecoder().decode(b64urlToUint8Array(payloadB64));
  const payload = JSON.parse(payloadJson) as SessionPayload;
  if (!payload.exp || Date.now() / 1000 > payload.exp) return null;
  return payload;
}
