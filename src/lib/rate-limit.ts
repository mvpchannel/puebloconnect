// Persisted (SQLite-backed) rate limiting / anti-abuse for the auth
// endpoints. Persisted rather than in-memory so limits survive a dev
// server restart and behave predictably for a single-process deployment
// (the realistic deployment shape for this app today — see db.ts's
// header comment on SQLite). A multi-instance deployment would swap this
// for a shared store (e.g. Redis) behind the same two functions.

import {
  recordRateLimitAttempt,
  countRecentRateLimitAttempts,
  pruneOldRateLimitAttempts,
} from "@/lib/db";

export type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

export type RateLimitPolicy = {
  max: number;
  windowSeconds: number;
};

// Deliberately generous enough not to lock out a real member who fat-
// fingers a password twice, tight enough to blunt an automated guesser.
export const RATE_LIMITS = {
  login: { max: 8, windowSeconds: 10 * 60 } as RateLimitPolicy,
  register: { max: 6, windowSeconds: 60 * 60 } as RateLimitPolicy,
  forgotPassword: { max: 4, windowSeconds: 60 * 60 } as RateLimitPolicy,
  resetPassword: { max: 10, windowSeconds: 60 * 60 } as RateLimitPolicy,
  resendVerification: { max: 4, windowSeconds: 60 * 60 } as RateLimitPolicy,
  contact: { max: 5, windowSeconds: 60 * 60 } as RateLimitPolicy,
  // Per signed-in member. Generous for real use, tight enough that one
  // account can't flood another member's inbox/notifications or the feed.
  message: { max: 30, windowSeconds: 10 * 60 } as RateLimitPolicy,
  friendRequest: { max: 20, windowSeconds: 60 * 60 } as RateLimitPolicy,
  friendResponse: { max: 60, windowSeconds: 60 * 60 } as RateLimitPolicy,
  comment: { max: 30, windowSeconds: 10 * 60 } as RateLimitPolicy,
  like: { max: 120, windowSeconds: 10 * 60 } as RateLimitPolicy,
  post: { max: 20, windowSeconds: 60 * 60 } as RateLimitPolicy,
  report: { max: 30, windowSeconds: 60 * 60 } as RateLimitPolicy,
} as const;

// Call BEFORE doing the sensitive work. Checks the limit, and — only if
// still allowed — records this attempt immediately (so concurrent
// requests can't all slip through between "check" and "record").
export function checkAndRecordRateLimit(
  bucket: string,
  policy: RateLimitPolicy
): RateLimitResult {
  // Opportunistic housekeeping — cheap, and keeps the table from growing
  // unbounded over a long-running server's lifetime.
  if (Math.random() < 0.02) {
    pruneOldRateLimitAttempts(24 * 60 * 60);
  }

  const count = countRecentRateLimitAttempts(bucket, policy.windowSeconds);
  if (count >= policy.max) {
    return { allowed: false, retryAfterSeconds: policy.windowSeconds };
  }
  recordRateLimitAttempt(bucket);
  return { allowed: true };
}

// Best-effort client IP extraction behind a typical reverse proxy. Falls
// back to "unknown" (which still rate-limits — just coarsely, as one
// shared bucket) if nothing is present, e.g. in this sandbox's dev server.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

// Per-member limiter for write endpoints. Returns a ready 429 response
// when the member is over the limit, otherwise null (and records the hit).
export function limitMember(
  userId: number,
  name: keyof typeof RATE_LIMITS,
  message = "You're doing that too fast. Please wait a bit and try again."
): Response | null {
  const r = checkAndRecordRateLimit(`${name}:user:${userId}`, RATE_LIMITS[name]);
  if (r.allowed) return null;
  return Response.json({ error: message }, { status: 429 });
}
