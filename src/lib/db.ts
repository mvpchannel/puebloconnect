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
