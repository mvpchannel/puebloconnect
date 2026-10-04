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
        paypal_order_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        plan TEXT NOT NULL CHECK (plan IN ('basic', 'plus', 'premier')),
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'completed', 'failed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      )
    `);
    global.__pueblo_db__ = db;
  }
  return global.__pueblo_db__;
}

export type User = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: "member" | "admin";
  created_at: string;
};

export type PublicUser = Omit<User, "password_hash">;

export function createUser(
  username: string,
  email: string,
  passwordHash: string,
  role: "member" | "admin" = "member"
): PublicUser {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)"
  );
  const info = stmt.run(username, email, passwordHash, role);
  return getUserById(Number(info.lastInsertRowid))!;
}

export function getUserByUsername(username: string): User | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as User | undefined;
  return row;
}

export function getUserById(id: number): PublicUser | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, email, role, created_at FROM users WHERE id = ?")
    .get(id) as PublicUser | undefined;
  return row;
}

export function listUsers(): PublicUser[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC"
    )
    .all() as PublicUser[];
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
// Business memberships + PayPal payment transactions
// ---------------------------------------------------------------------

export type PlanId = "basic" | "plus" | "premier";

export type PaymentTransaction = {
  id: number;
  paypal_order_id: string;
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

// Called right after a PayPal order is created (status CREATED), before
// the buyer has approved or paid anything — so we have a record even if
// they abandon checkout. Updated to 'completed' only after a real,
// verified capture (see markTransactionCompleted).
export function recordOrderCreated(
  paypalOrderId: string,
  userId: number,
  plan: PlanId,
  amountCents: number,
  currency = "USD"
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO payment_transactions
       (paypal_order_id, user_id, plan, amount_cents, currency, status)
     VALUES (?, ?, ?, ?, ?, 'created')`
  ).run(paypalOrderId, userId, plan, amountCents, currency);
}

export function getTransactionByOrderId(
  paypalOrderId: string
): PaymentTransaction | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM payment_transactions WHERE paypal_order_id = ?")
    .get(paypalOrderId) as PaymentTransaction | undefined;
}

export function markTransactionCompleted(paypalOrderId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE payment_transactions
     SET status = 'completed', completed_at = datetime('now')
     WHERE paypal_order_id = ?`
  ).run(paypalOrderId);
}

export function markTransactionFailed(paypalOrderId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE payment_transactions SET status = 'failed' WHERE paypal_order_id = ?"
  ).run(paypalOrderId);
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
// now) after a verified, completed PayPal capture. This is a one-time
// Orders-API payment representing "one month," not an auto-renewing
// subscription — see README for why, and what real auto-renewal would
// need (PayPal Subscriptions API) instead.
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
