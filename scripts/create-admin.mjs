#!/usr/bin/env node
// Creates an admin user directly in the database. This is deliberately a
// standalone CLI script, not a public API route or a signup checkbox —
// there is no way to become an admin by submitting a web form. Run it on
// the server, by someone who already has shell access:
//
//   node scripts/create-admin.mjs <username> <email> <password>
//
// Plain JS (not TypeScript) so it runs directly with `node`, no build step
// needed. It duplicates the hashing/db logic from src/lib/password.ts and
// src/lib/db.ts rather than importing them, because those are TypeScript
// and this script needs to run standalone — the two are kept in sync by
// hand; if you change the hashing scheme in src/lib/password.ts, update
// this file to match.

import { scryptSync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const [, , username, email, password] = process.argv;

if (!username || !email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <username> <email> <password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "pueblo-connect.db");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const db = new DatabaseSync(DB_PATH);
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

try {
  const passwordHash = hashPassword(password);
  const stmt = db.prepare(
    "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
  );
  const info = stmt.run(username, email, passwordHash);
  console.log(`Admin user created: ${username} (id ${info.lastInsertRowid})`);
} catch (err) {
  console.error("Could not create admin user:", err.message);
  process.exit(1);
} finally {
  db.close();
}
