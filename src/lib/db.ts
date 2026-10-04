// Real SQLite database — not a mock. Uses Node's built-in `node:sqlite`
// (stable since Node 22.5+, no native module compilation, no npm install
// needed at all). This file is the ONLY place that talks to the database.
//
// SQLite is a deliberate, honest choice for where this project is today:
// it's a single file, needs zero infrastructure to run, and is a real,
// production-grade engine for a site this size. The original audit
// recommended Postgres for a larger-scale deployment — swapping the engine
// later means rewriting this one file, not the API routes or components
// that import it, because everything downstream only calls the functions
// below.
//
// IMPORTANT: this module uses `node:sqlite`, which is only available in
// the Node.js runtime, not the Edge runtime. Only import this from Server
// Components or Route Handlers (the default), never from `middleware.ts`.

import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "pueblo-connect.db");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Reuse a single connection across requests in the same server process
// (Next.js dev-mode hot-reload can otherwise open many file handles).
declare global {
  // eslint-disable-next-line no-var
  var __pueblo_db__: DatabaseSync | undefined;
}

// Columns that may not exist yet on a database file created by an older
// version of this app. Added with ALTER TABLE ... ADD COLUMN, which is
// non-destructive — existing rows keep their data, new columns come back
// NULL/default for them. This is the "migration strategy" for members
// created under the earlier, simpler schema (username/email/password_hash/
// role/created_at only): nobody's account is dropped or rewritten.
const USER_COLUMN_MIGRATIONS: { name: string; ddl: string }[] = [
  { name: "first_name", ddl: "ALTER TABLE users ADD COLUMN first_name TEXT" },
  { name: "last_name", ddl: "ALTER TABLE users ADD COLUMN last_name TEXT" },
  { name: "city", ddl: "ALTER TABLE users ADD COLUMN city TEXT" },
  {
    name: "profile_photo_path",
    ddl: "ALTER TABLE users ADD COLUMN profile_photo_path TEXT",
  },
  {
    // NULL = not verified yet; otherwise the datetime it was verified.
    name: "email_verified_at",
    ddl: "ALTER TABLE users ADD COLUMN email_verified_at TEXT",
  },
  {
    name: "account_status",
    ddl:
      "ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'",
  },
  {
    name: "updated_at",
    ddl: "ALTER TABLE users ADD COLUMN updated_at TEXT",
  },
  {
    name: "last_login_at",
    ddl: "ALTER TABLE users ADD COLUMN last_login_at TEXT",
  },
  {
    // Bumped every time the password changes. Embedded in the signed
    // session cookie (see session.ts) so that changing the password
    // invalidates every session issued before the change, even though
    // sessions are stateless signed tokens with no server-side store.
    name: "session_version",
    ddl:
      "ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1",
  },
  {
    // Marketing/promotional email opt-in. Defaults to 0 (off) — never
    // auto-subscribe anyone. Security/account emails are not optional and
    // are not gated by this column at all (see email.ts).
    name: "marketing_emails_opt_in",
    ddl:
      "ALTER TABLE users ADD COLUMN marketing_emails_opt_in INTEGER NOT NULL DEFAULT 0",
  },
];

function columnExists(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

function runUserMigrations(db: DatabaseSync): void {
  for (const { name, ddl } of USER_COLUMN_MIGRATIONS) {
    if (!columnExists(db, "users", name)) {
      db.exec(ddl);
    }
  }
}

function getDb(): DatabaseSync {
  if (!global.__pueblo_db__) {
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    // Additive, non-destructive migration for members created before the
    // membership/email system existed — see USER_COLUMN_MIGRATIONS above.
    runUserMigrations(db);
    db.exec(`
      CREATE TABLE IF NOT EXISTS business_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
        plan TEXT NOT NULL CHECK (plan IN ('basic', 'plus', 'premier')),
        status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'expired')),
        current_period_start TEXT,
        current_period_end TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stripe_session_id TEXT NOT NULL UNIQUE,
        stripe_payment_intent_id TEXT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        plan TEXT NOT NULL CHECK (plan IN ('basic', 'plus', 'premier')),
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'completed', 'failed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      )
    `);

    // Purpose-specific token tables — NOT reusable plain tokens on the
    // users row. Each row stores only a SHA-256 hash of the token (see
    // tokens.ts); the raw token exists only in memory and in the one email
    // it's sent in. expires_at + used_at (+ revoked_at for reset tokens)
    // give each token a real, enforceable single-use/expiring lifecycle.
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        used_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        used_at TEXT,
        revoked_at TEXT
      )
    `);

    // Persisted (not in-memory) rate limiting so limits survive a server
    // restart and work the same in a single-process deployment. Keyed by
    // an arbitrary "bucket" (e.g. "login:ip:1.2.3.4" or
    // "login:user:someone") + a time window; see rate-limit.ts.
    db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limit_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bucket TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_created ON rate_limit_attempts(bucket, created_at)`
    );

    global.__pueblo_db__ = db;
  }
  return global.__pueblo_db__;
}

export type AccountStatus = "active" | "suspended";

export type User = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: "member" | "admin";
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  profile_photo_path: string | null;
  email_verified_at: string | null;
  account_status: AccountStatus;
  updated_at: string | null;
  last_login_at: string | null;
  session_version: number;
  marketing_emails_opt_in: number;
};

export type PublicUser = Omit<User, "password_hash">;

const PUBLIC_USER_COLUMNS =
  "id, username, email, role, created_at, first_name, last_name, city, " +
  "profile_photo_path, email_verified_at, account_status, updated_at, " +
  "last_login_at, session_version, marketing_emails_opt_in";

export function createUser(
  username: string,
  email: string,
  passwordHash: string,
  role: "member" | "admin" = "member",
  extra: { firstName?: string | null; lastName?: string | null; city?: string | null; profilePhotoPath?: string | null } = {}
): PublicUser {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO users (username, email, password_hash, role, first_name, last_name, city, profile_photo_path, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  );
  const info = stmt.run(
    username,
    email,
    passwordHash,
    role,
    extra.firstName ?? null,
    extra.lastName ?? null,
    extra.city ?? null,
    extra.profilePhotoPath ?? null
  );
  return getUserById(Number(info.lastInsertRowid))!;
}

// Internal — includes password_hash. Only for code that needs to verify a
// password (login, change-password). Never return this object as-is from
// an API route.
export function getUserByUsername(username: string): User | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as User | undefined;
  return row;
}

export function getUserByEmail(email: string): User | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as User | undefined;
  return row;
}

// Login identifier can be either a username or an email address, per the
// existing architecture (single username/password form) extended to also
// accept email, as the spec allows ("depending on what the existing
// architecture supports").
export function getUserByUsernameOrEmail(identifier: string): User | undefined {
  const db = getDb();
  const clean = identifier.trim();
  const row = db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .get(clean, clean.toLowerCase()) as User | undefined;
  return row;
}

export function getUserById(id: number): PublicUser | undefined {
  const db = getDb();
  const row = db
    .prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`)
    .get(id) as PublicUser | undefined;
  return row;
}

export function listUsers(): PublicUser[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT ${PUBLIC_USER_COLUMNS} FROM users ORDER BY created_at DESC`
    )
    .all() as PublicUser[];
}

export function markEmailVerified(userId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE users SET email_verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(userId);
}

export function recordLogin(userId: number): void {
  const db = getDb();
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);
}

// Changing the password bumps session_version, which is embedded in every
// newly-issued session token. Any previously-issued token (including ones
// a thief may hold) carries the old version and is rejected the next time
// it's checked — see session.ts / session-edge.ts. This is how "invalidate
// existing login sessions" is implemented without a server-side session
// store.
export function updateUserPassword(userId: number, passwordHash: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = datetime('now') WHERE id = ?`
  ).run(passwordHash, userId);
}

export function updateUserNotificationPreferences(
  userId: number,
  marketingEmailsOptIn: boolean
): void {
  const db = getDb();
  db.prepare(
    "UPDATE users SET marketing_emails_opt_in = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(marketingEmailsOptIn ? 1 : 0, userId);
}

export function countUsers(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number };
  return row.n;
}

export function countAdmins(): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as n FROM users WHERE role = 'admin'")
    .get() as { n: number };
  return row.n;
}

export function updateUserRole(id: number, role: "member" | "admin"): void {
  const db = getDb();
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function deleteUser(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------
// Business memberships + Stripe payment transactions
// ---------------------------------------------------------------------

export type PlanId = "basic" | "plus" | "premier";

export type PaymentTransaction = {
  id: number;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  user_id: number;
  plan: PlanId;
  amount_cents: number;
  currency: string;
  status: "created" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
};

export type BusinessMembership = {
  id: number;
  user_id: number;
  plan: PlanId;
  status: "inactive" | "active" | "expired";
  current_period_start: string | null;
  current_period_end: string | null;
  updated_at: string;
};

// Called right after a Stripe Checkout Session is created (status
// CREATED), before the buyer has paid anything — so we have a record even
// if they abandon checkout. Updated to 'completed' only after the payment
// is verified, either by the webhook or the success-page reconciliation
// check (see markTransactionCompleted).
export function recordCheckoutSessionCreated(
  stripeSessionId: string,
  userId: number,
  plan: PlanId,
  amountCents: number,
  currency = "usd"
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO payment_transactions
       (stripe_session_id, user_id, plan, amount_cents, currency, status)
     VALUES (?, ?, ?, ?, ?, 'created')`
  ).run(stripeSessionId, userId, plan, amountCents, currency);
}

export function getTransactionBySessionId(
  stripeSessionId: string
): PaymentTransaction | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM payment_transactions WHERE stripe_session_id = ?")
    .get(stripeSessionId) as PaymentTransaction | undefined;
}

export function markTransactionCompleted(
  stripeSessionId: string,
  stripePaymentIntentId: string | null
): void {
  const db = getDb();
  db.prepare(
    `UPDATE payment_transactions
     SET status = 'completed', completed_at = datetime('now'), stripe_payment_intent_id = ?
     WHERE stripe_session_id = ?`
  ).run(stripePaymentIntentId, stripeSessionId);
}

export function markTransactionFailed(stripeSessionId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE payment_transactions SET status = 'failed' WHERE stripe_session_id = ?"
  ).run(stripeSessionId);
}

export function listTransactionsForUser(userId: number): PaymentTransaction[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId) as PaymentTransaction[];
}

export function listAllTransactions(): PaymentTransaction[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM payment_transactions ORDER BY created_at DESC")
    .all() as PaymentTransaction[];
}

// Activates (or renews) a membership for one billing period (30 days from
// now) after a verified, completed Stripe Checkout payment. This is a
// one-time payment representing "one month," not an auto-renewing
// subscription — see README for why, and what real auto-renewal would
// need (Stripe Billing/Subscriptions, i.e. mode: "subscription" Checkout
// Sessions + a recurring Price) instead.
export function activateMembership(userId: number, plan: PlanId): BusinessMembership {
  const db = getDb();
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  db.prepare(
    `INSERT INTO business_memberships (user_id, plan, status, current_period_start, current_period_end, updated_at)
     VALUES (?, ?, 'active', ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       plan = excluded.plan,
       status = 'active',
       current_period_start = excluded.current_period_start,
       current_period_end = excluded.current_period_end,
       updated_at = datetime('now')`
  ).run(userId, plan, now.toISOString(), periodEnd.toISOString());
  return getMembershipForUser(userId)!;
}

export function getMembershipForUser(userId: number): BusinessMembership | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM business_memberships WHERE user_id = ?")
    .get(userId) as BusinessMembership | undefined;
}

export function listActiveMemberships(): (BusinessMembership & {
  username: string;
  email: string;
})[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT bm.*, u.username, u.email
       FROM business_memberships bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.status = 'active'
       ORDER BY bm.updated_at DESC`
    )
    .all() as (BusinessMembership & { username: string; email: string })[];
}

// ---------------------------------------------------------------------
// Email verification tokens
// ---------------------------------------------------------------------

export type EmailVerificationToken = {
  id: number;
  user_id: number;
  token_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

export function createEmailVerificationToken(
  userId: number,
  tokenHash: string,
  expiresAtIso: string
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
  ).run(userId, tokenHash, expiresAtIso);
}

export function getEmailVerificationTokenByHash(
  tokenHash: string
): EmailVerificationToken | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM email_verification_tokens WHERE token_hash = ?")
    .get(tokenHash) as EmailVerificationToken | undefined;
}

export function markEmailVerificationTokenUsed(id: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE email_verification_tokens SET used_at = datetime('now') WHERE id = ?"
  ).run(id);
}

// Invalidate any earlier, unused verification tokens for this user before
// issuing a new one (e.g. on "resend verification email"), so only the
// most recent link works.
export function invalidateEmailVerificationTokensForUser(userId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE email_verification_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL"
  ).run(userId);
}

// ---------------------------------------------------------------------
// Password reset tokens
// ---------------------------------------------------------------------

export type PasswordResetToken = {
  id: number;
  user_id: number;
  token_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

export function createPasswordResetToken(
  userId: number,
  tokenHash: string,
  expiresAtIso: string
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
  ).run(userId, tokenHash, expiresAtIso);
}

export function getPasswordResetTokenByHash(
  tokenHash: string
): PasswordResetToken | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM password_reset_tokens WHERE token_hash = ?")
    .get(tokenHash) as PasswordResetToken | undefined;
}

export function markPasswordResetTokenUsed(id: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?"
  ).run(id);
}

// Called after a successful password change: any other outstanding reset
// tokens for this user (e.g. from an earlier forgot-password request they
// never used) are revoked so they can't be used afterward either.
export function revokeOtherPasswordResetTokens(userId: number, exceptId: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE password_reset_tokens SET revoked_at = datetime('now')
     WHERE user_id = ? AND id != ? AND used_at IS NULL AND revoked_at IS NULL`
  ).run(userId, exceptId);
}

// ---------------------------------------------------------------------
// Rate limiting (persisted — see rate-limit.ts for the policy layer)
// ---------------------------------------------------------------------

export function recordRateLimitAttempt(bucket: string): void {
  const db = getDb();
  db.prepare("INSERT INTO rate_limit_attempts (bucket) VALUES (?)").run(bucket);
}

// Count attempts recorded for this bucket within the last `windowSeconds`.
export function countRecentRateLimitAttempts(bucket: string, windowSeconds: number): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as n FROM rate_limit_attempts
       WHERE bucket = ? AND created_at >= datetime('now', ?)`
    )
    .get(bucket, `-${windowSeconds} seconds`) as { n: number };
  return row.n;
}

// Housekeeping so the table doesn't grow forever — called opportunistically
// from the rate limiter, not on a schedule.
export function pruneOldRateLimitAttempts(olderThanSeconds: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM rate_limit_attempts WHERE created_at < datetime('now', ?)`).run(
    `-${olderThanSeconds} seconds`
  );
}
