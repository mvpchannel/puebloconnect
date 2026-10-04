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
  // Geolocation — see src/lib/geo.ts. A member's location is either
  // 'manual' (they shared their browser's geolocation) or 'ip' (coarse,
  // derived from their IP address via lookupIpLocation) — never set
  // without one of those two explicit actions, and nullable throughout
  // (no location is a normal, privacy-respecting default).
  { name: "latitude", ddl: "ALTER TABLE users ADD COLUMN latitude REAL" },
  { name: "longitude", ddl: "ALTER TABLE users ADD COLUMN longitude REAL" },
  { name: "location_city", ddl: "ALTER TABLE users ADD COLUMN location_city TEXT" },
  { name: "location_region", ddl: "ALTER TABLE users ADD COLUMN location_region TEXT" },
  { name: "location_country", ddl: "ALTER TABLE users ADD COLUMN location_country TEXT" },
  {
    name: "location_source",
    ddl: "ALTER TABLE users ADD COLUMN location_source TEXT CHECK (location_source IN ('manual', 'ip'))",
  },
  { name: "location_updated_at", ddl: "ALTER TABLE users ADD COLUMN location_updated_at TEXT" },
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

    // ---------------------------------------------------------------
    // Posts (the newsfeed / "wall") — a deliberately small polymorphic
    // activity-stream table. target_type + target_id is the one idea
    // worth keeping from auditing Passports to Love's Wall class: one
    // posts table can hold the general newsfeed AND, later, a group's
    // wall, a business's wall, or an event's wall, without a separate
    // table per feature. No code or data was copied from that codebase —
    // this is a fresh table built around that idea, under Pueblo
    // Connect's own schema and auth. target_type defaults to 'feed'
    // (the general newsfeed, target_id NULL); 'group' / 'business' /
    // 'event' are reserved for when those features exist, so this table
    // doesn't need another migration to support them later.
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT 'feed' CHECK (target_type IN ('feed', 'group', 'business', 'event')),
        target_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_posts_target ON posts(target_type, target_id, created_at)`
    );

    db.exec(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL REFERENCES posts(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(post_id, user_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL REFERENCES posts(id),
        author_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at)`
    );

    // ---------------------------------------------------------------
    // Groups — a dating-agnostic groups/pages feature (members, tags,
    // a cover photo, a wall). The wall itself is NOT a separate table:
    // a group's posts are just posts with target_type='group' and
    // target_id = this group's id, reusing the posts table above.
    db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        tags TEXT NOT NULL DEFAULT '',
        cover_photo_path TEXT,
        creator_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL REFERENCES groups(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(group_id, user_id)
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id)`
    );

    // ---------------------------------------------------------------
    // Friends — a request/accept graph (friend_requests) plus a flat,
    // cheap-to-query friendships table written only once a request is
    // accepted. user_a_id is always the smaller id so each pair has
    // exactly one row regardless of who sent the original request.
    db.exec(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        recipient_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        responded_at TEXT,
        UNIQUE(sender_id, recipient_id)
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON friend_requests(recipient_id, status)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id, status)`
    );

    db.exec(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_a_id INTEGER NOT NULL REFERENCES users(id),
        user_b_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_a_id, user_b_id)
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_friendships_a ON friendships(user_a_id)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(user_b_id)`
    );

    // ---------------------------------------------------------------
    // Private messaging — plain direct messages between two users (no
    // separate "conversation" entity; a conversation is just the set of
    // messages between a pair of user ids, same pattern Passports to
    // Love's inbox used, reimplemented from scratch).
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        recipient_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        read_at TEXT
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, read_at)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id, created_at)`
    );

    // ---------------------------------------------------------------
    // Email queue — notification email that a request handler wants sent
    // (a friend request, an accepted request, a new message) is enqueued
    // here instead of being sent inline, so the HTTP response doesn't wait
    // on mail delivery. processEmailQueue() is the "worker" — called
    // fire-and-forget right after enqueueing in this app (no separate
    // process needed at this scale), but written so a real cron/worker
    // could call it instead without any other code changing.
    db.exec(`
      CREATE TABLE IF NOT EXISTS queued_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_address TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        sent_at TEXT,
        last_error TEXT
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_queued_emails_status ON queued_emails(status, created_at)`
    );

    // Supports the bounding-box phase of findNearbyUsers' proximity
    // search (see src/lib/geo.ts) — a plain range scan on these two
    // columns instead of a full table scan computing haversine on every
    // member.
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_users_lat_lng ON users(latitude, longitude)`
    );

    // ---------------------------------------------------------------
    // Live streaming / VOD — the business-logic layer only (viewers,
    // chat, likes, moderation, the scheduled->live->ended state machine
    // that turns a stream into a VOD). The actual video transport is
    // bring-your-own-stream (YouTube Live / Facebook Live / Vimeo Live —
    // see the "Pueblo Connect <-> Passports to Love Integration Boundary"
    // design doc): embed_url just points at whatever the host is
    // broadcasting to on one of those platforms. This app never runs its
    // own media server, and a stream's "VOD" is the same embed left in
    // place after it ends (YouTube/Facebook/Vimeo all keep the recording
    // at the same URL) — no separate VOD file/table needed.
    db.exec(`
      CREATE TABLE IF NOT EXISTS streams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        platform TEXT NOT NULL CHECK (platform IN ('youtube', 'facebook', 'vimeo')),
        embed_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
        scheduled_for TEXT,
        started_at TEXT,
        ended_at TEXT,
        peak_viewer_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status, created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_streams_host ON streams(host_id)`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(stream_id, user_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        author_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        deleted_by INTEGER REFERENCES users(id)
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_stream_comments_stream ON stream_comments(stream_id, created_at)`
    );

    // Moderation: a viewer flags an abusive chat message; the stream's
    // host or an admin resolves it (dismiss, delete the comment, or ban
    // its author from this stream's chat — see stream_bans below).
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_comment_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER NOT NULL REFERENCES stream_comments(id),
        reporter_id INTEGER NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT,
        resolved_by INTEGER REFERENCES users(id),
        resolution TEXT CHECK (resolution IN ('dismissed', 'comment_deleted', 'user_banned'))
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_stream_comment_reports_open ON stream_comment_reports(comment_id, resolved_at)`
    );

    // A host/admin can ban a specific viewer from commenting on a
    // specific stream (not a site-wide ban — see account_status for
    // that). Checked by postStreamComment before any insert.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_bans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        banned_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(stream_id, user_id)
      )
    `);

    // Live viewer presence via heartbeat, not a raw "currently connected"
    // socket count (there's no socket — the video itself plays from
    // YouTube/Facebook/Vimeo's own player, not through this server). A
    // viewer session is "live" while left_at IS NULL AND its last
    // heartbeat is recent — see getLiveViewerCount's staleness window.
    // This also gives an honest total/unique viewer count for a VOD after
    // the stream ends, which a one-off counter can't.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_viewer_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        user_id INTEGER REFERENCES users(id),
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_heartbeat_at TEXT NOT NULL DEFAULT (datetime('now')),
        left_at TEXT
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_stream_viewer_sessions_stream ON stream_viewer_sessions(stream_id, left_at)`
    );

    // Pueblo Business Channel — a real profile for a business, replacing
    // the decorative /admin/locations mockup. A channel's wall reuses the
    // existing posts table (target_type='business', target_id=<business
    // id> — already an allowed value in the posts CHECK constraint), the
    // same pattern groups use for their wall, so no new "business posts"
    // table is needed. Live/past broadcasts for a channel are just that
    // business's owner's rows in `streams` (host_id = businesses.owner_id)
    // — no schema link needed there either.
    db.exec(`
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        description TEXT,
        address TEXT,
        phone TEXT,
        website TEXT,
        hours_text TEXT,
        logo_path TEXT,
        cover_photo_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id)`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS business_followers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(business_id, user_id)
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_business_followers_business ON business_followers(business_id)`
    );

    // One review per user per business (UNIQUE) — posting again updates
    // the existing row rather than piling up duplicates, same spirit as
    // togglePostLike's idempotency elsewhere in this file.
    db.exec(`
      CREATE TABLE IF NOT EXISTS business_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        body TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(business_id, user_id)
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_business_reviews_business ON business_reviews(business_id)`
    );

    db.exec(`
      CREATE TABLE IF NOT EXISTS business_menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        section TEXT NOT NULL DEFAULT 'menu' CHECK (section IN ('menu', 'service')),
        name TEXT NOT NULL,
        description TEXT,
        price_cents INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_business_menu_items_business ON business_menu_items(business_id, section, sort_order)`
    );

    db.exec(`
      CREATE TABLE IF NOT EXISTS business_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        closed_at TEXT
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_business_jobs_business ON business_jobs(business_id, closed_at)`
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
  latitude: number | null;
  longitude: number | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_source: "manual" | "ip" | null;
  location_updated_at: string | null;
};

export type PublicUser = Omit<User, "password_hash">;

const PUBLIC_USER_COLUMNS =
  "id, username, email, role, created_at, first_name, last_name, city, " +
  "profile_photo_path, email_verified_at, account_status, updated_at, " +
  "last_login_at, session_version, marketing_emails_opt_in, " +
  "latitude, longitude, location_city, location_region, location_country, " +
  "location_source, location_updated_at";

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

// Used by "find someone to add as a friend" — a simple substring match on
// username/first/last name, active accounts only, capped at `limit`.
export function searchUsers(query: string, excludeUserId: number, limit = 10): PublicUser[] {
  const db = getDb();
  const like = `%${query.replace(/[%_]/g, "")}%`;
  return db
    .prepare(
      `SELECT ${PUBLIC_USER_COLUMNS} FROM users
       WHERE account_status = 'active' AND id != ?
         AND (username LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
       ORDER BY username ASC
       LIMIT ?`
    )
    .all(excludeUserId, like, like, like, limit) as PublicUser[];
}

// ---------------------------------------------------------------------
// Geolocation — see src/lib/geo.ts for the math (haversineMiles,
// boundingBox) and the IP2Location lookup. This file only stores/queries
// the result; it never computes distance itself except inside
// findNearbyUsers below, which needs both the DB and the math together.

export type LocationSource = "manual" | "ip";

export function updateUserLocation(
  userId: number,
  location: {
    latitude: number;
    longitude: number;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    source: LocationSource;
  }
): void {
  const db = getDb();
  db.prepare(
    `UPDATE users
     SET latitude = ?, longitude = ?, location_city = ?, location_region = ?,
         location_country = ?, location_source = ?, location_updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    location.latitude,
    location.longitude,
    location.city ?? null,
    location.region ?? null,
    location.country ?? null,
    location.source,
    userId
  );
}

// Lets a member turn location sharing back off — privacy-respecting
// default is no location at all, so clearing it is a first-class action,
// not just overwriting with (0, 0) or some other fake sentinel.
export function clearUserLocation(userId: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE users
     SET latitude = NULL, longitude = NULL, location_city = NULL, location_region = NULL,
         location_country = NULL, location_source = NULL, location_updated_at = NULL
     WHERE id = ?`
  ).run(userId);
}

export type NearbyUser = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
  location_city: string | null;
  location_region: string | null;
  distance_miles: number;
};

// Two-phase proximity search (see the boundingBox() comment in geo.ts):
// phase 1 is a plain indexable SQL range filter down to "roughly nearby"
// rows; phase 2 re-checks each with the exact haversineMiles formula and
// drops/sorts by the real distance, since the box's corners can be
// farther than radiusMiles. Needs the caller to pass in haversineMiles and
// boundingBox from geo.ts rather than importing them here, so this file
// stays pure data-access with no geometry of its own.
export function findNearbyUsers(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
  excludeUserId: number,
  limit: number,
  box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  distanceFn: (lat1: number, lng1: number, lat2: number, lng2: number) => number
): NearbyUser[] {
  const db = getDb();
  const candidates = db
    .prepare(
      `SELECT id, username, first_name, last_name, profile_photo_path,
              location_city, location_region, latitude, longitude
       FROM users
       WHERE account_status = 'active' AND id != ?
         AND latitude IS NOT NULL AND longitude IS NOT NULL
         AND latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?`
    )
    .all(excludeUserId, box.minLat, box.maxLat, box.minLng, box.maxLng) as {
    id: number;
    username: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_path: string | null;
    location_city: string | null;
    location_region: string | null;
    latitude: number;
    longitude: number;
  }[];

  return candidates
    .map((c) => ({
      user_id: c.id,
      username: c.username,
      first_name: c.first_name,
      last_name: c.last_name,
      profile_photo_path: c.profile_photo_path,
      location_city: c.location_city,
      location_region: c.location_region,
      distance_miles: distanceFn(centerLat, centerLng, c.latitude, c.longitude),
    }))
    .filter((c) => c.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
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

// ---------------------------------------------------------------------
// Posts (newsfeed / wall) — see the CREATE TABLE comment above for the
// target_type/target_id design. Every read joins back to users for the
// author's display name/photo so API routes never have to do a second
// round trip, and every list is capped (LIMIT) since this is a feed, not
// an export.
// ---------------------------------------------------------------------

export type TargetType = "feed" | "group" | "business" | "event";

export type PostWithAuthor = {
  id: number;
  author_id: number;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_profile_photo_path: string | null;
  body: string;
  target_type: TargetType;
  target_id: number | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  // 1 if the requesting user has liked this post, 0 otherwise (0 when no
  // user is logged in). Computed per-request, not stored.
  liked_by_viewer: number;
};

const POST_SELECT = `
  SELECT
    p.id, p.author_id, p.body, p.target_type, p.target_id, p.created_at,
    u.username AS author_username,
    u.first_name AS author_first_name,
    u.last_name AS author_last_name,
    u.profile_photo_path AS author_profile_photo_path,
    (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id AND pc.deleted_at IS NULL) AS comment_count,
    (SELECT COUNT(*) FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) AS liked_by_viewer
  FROM posts p
  JOIN users u ON u.id = p.author_id
`;

export function createPost(
  authorId: number,
  body: string,
  targetType: TargetType = "feed",
  targetId: number | null = null
): PostWithAuthor {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO posts (author_id, body, target_type, target_id) VALUES (?, ?, ?, ?)`
    )
    .run(authorId, body, targetType, targetId);
  return getPostById(Number(info.lastInsertRowid), authorId)!;
}

export function getPostById(postId: number, viewerId: number | null): PostWithAuthor | undefined {
  const db = getDb();
  return db
    .prepare(`${POST_SELECT} WHERE p.id = ? AND p.deleted_at IS NULL`)
    .get(viewerId ?? 0, postId) as PostWithAuthor | undefined;
}

// Default target: the general newsfeed (target_type='feed', target_id
// NULL). Passing a different target_type/target_id lists a group's,
// business's, or event's wall instead, once those features exist.
export function listPosts(
  viewerId: number | null,
  targetType: TargetType = "feed",
  targetId: number | null = null,
  limit = 30
): PostWithAuthor[] {
  const db = getDb();
  const targetClause =
    targetId === null ? "p.target_type = ? AND p.target_id IS NULL" : "p.target_type = ? AND p.target_id = ?";
  const params: (string | number)[] =
    targetId === null ? [viewerId ?? 0, targetType] : [viewerId ?? 0, targetType, targetId];
  return db
    .prepare(
      `${POST_SELECT} WHERE p.deleted_at IS NULL AND ${targetClause} ORDER BY p.created_at DESC LIMIT ?`
    )
    .all(...params, limit) as PostWithAuthor[];
}

// Used by the profile/timeline page — a member's own posts across every
// target (feed, and later group/business/event posts they made), newest
// first.
export function listPostsByAuthor(
  viewerId: number | null,
  authorId: number,
  limit = 30
): PostWithAuthor[] {
  const db = getDb();
  return db
    .prepare(
      `${POST_SELECT} WHERE p.deleted_at IS NULL AND p.author_id = ? ORDER BY p.created_at DESC LIMIT ?`
    )
    .all(viewerId ?? 0, authorId, limit) as PostWithAuthor[];
}

export function softDeletePost(postId: number): void {
  const db = getDb();
  db.prepare("UPDATE posts SET deleted_at = datetime('now') WHERE id = ?").run(postId);
}

// Returns the post's new liked/like_count state so the route handler can
// hand it straight back to the client — toggling is idempotent per user
// via the UNIQUE(post_id, user_id) constraint, so a double-click can never
// double-count.
export function togglePostLike(
  postId: number,
  userId: number
): { liked: boolean; likeCount: number } {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?")
    .get(postId, userId) as { id: number } | undefined;

  if (existing) {
    db.prepare("DELETE FROM post_likes WHERE id = ?").run(existing.id);
  } else {
    db.prepare("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)").run(postId, userId);
  }

  const row = db
    .prepare("SELECT COUNT(*) as n FROM post_likes WHERE post_id = ?")
    .get(postId) as { n: number };

  return { liked: !existing, likeCount: row.n };
}

export type CommentWithAuthor = {
  id: number;
  post_id: number;
  author_id: number;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_profile_photo_path: string | null;
  body: string;
  created_at: string;
};

const COMMENT_SELECT = `
  SELECT
    c.id, c.post_id, c.author_id, c.body, c.created_at,
    u.username AS author_username,
    u.first_name AS author_first_name,
    u.last_name AS author_last_name,
    u.profile_photo_path AS author_profile_photo_path
  FROM post_comments c
  JOIN users u ON u.id = c.author_id
`;

export function addComment(postId: number, authorId: number, body: string): CommentWithAuthor {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO post_comments (post_id, author_id, body) VALUES (?, ?, ?)")
    .run(postId, authorId, body);
  return db
    .prepare(`${COMMENT_SELECT} WHERE c.id = ?`)
    .get(Number(info.lastInsertRowid)) as CommentWithAuthor;
}

export function listCommentsForPost(postId: number, limit = 100): CommentWithAuthor[] {
  const db = getDb();
  return db
    .prepare(
      `${COMMENT_SELECT} WHERE c.post_id = ? AND c.deleted_at IS NULL ORDER BY c.created_at ASC LIMIT ?`
    )
    .all(postId, limit) as CommentWithAuthor[];
}

// ---------------------------------------------------------------------
// Groups — dating-agnostic groups/pages. A group's wall is NOT a separate
// table: it's just posts with target_type='group', target_id=<group id>,
// reusing everything built above for the newsfeed.

export type Group = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  tags: string; // comma-separated; see parseTags()/formatTags() below
  cover_photo_path: string | null;
  creator_id: number;
  created_at: string;
};

export type GroupWithMeta = Group & {
  creator_username: string;
  member_count: number;
  post_count: number;
};

const GROUP_SELECT = `
  SELECT
    g.id, g.name, g.slug, g.description, g.tags, g.cover_photo_path,
    g.creator_id, g.created_at,
    u.username AS creator_username,
    (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
    (SELECT COUNT(*) FROM posts p WHERE p.target_type = 'group' AND p.target_id = g.id AND p.deleted_at IS NULL) AS post_count
  FROM groups g
  JOIN users u ON u.id = g.creator_id
`;

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatTags(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .join(",");
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "group";
}

// Appends -2, -3, ... until the slug is free. Called at creation time
// only, so a race between two simultaneous creates of the same name is
// extremely unlikely and, worst case, just hits the UNIQUE constraint and
// the creator retries — acceptable for this scale.
function uniqueSlug(db: DatabaseSync, name: string): string {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (db.prepare("SELECT id FROM groups WHERE slug = ?").get(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export function createGroup(
  creatorId: number,
  name: string,
  description: string | null,
  tags: string[]
): GroupWithMeta {
  const db = getDb();
  const slug = uniqueSlug(db, name);
  const info = db
    .prepare(
      `INSERT INTO groups (name, slug, description, tags, creator_id) VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, slug, description, formatTags(tags), creatorId);
  const groupId = Number(info.lastInsertRowid);
  db.prepare(
    "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')"
  ).run(groupId, creatorId);
  return getGroupById(groupId)!;
}

export function getGroupById(id: number): GroupWithMeta | undefined {
  const db = getDb();
  return db.prepare(`${GROUP_SELECT} WHERE g.id = ?`).get(id) as GroupWithMeta | undefined;
}

export function getGroupBySlug(slug: string): GroupWithMeta | undefined {
  const db = getDb();
  return db.prepare(`${GROUP_SELECT} WHERE g.slug = ?`).get(slug) as GroupWithMeta | undefined;
}

export function listGroups(limit = 50): GroupWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${GROUP_SELECT} ORDER BY g.created_at DESC LIMIT ?`)
    .all(limit) as GroupWithMeta[];
}

// Groups a given user belongs to (owner or member), newest-joined first —
// for a "my groups" list in the sidebar/profile.
export function listGroupsForUser(userId: number): GroupWithMeta[] {
  const db = getDb();
  return db
    .prepare(
      `${GROUP_SELECT}
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ?
       ORDER BY gm.joined_at DESC`
    )
    .all(userId) as GroupWithMeta[];
}

export function isGroupMember(groupId: number, userId: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, userId);
  return Boolean(row);
}

export function getGroupMemberRole(groupId: number, userId: number): "owner" | "member" | null {
  const db = getDb();
  const row = db
    .prepare("SELECT role FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, userId) as { role: "owner" | "member" } | undefined;
  return row?.role ?? null;
}

export type GroupMemberWithUser = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
  role: "owner" | "member";
  joined_at: string;
};

export function listGroupMembers(groupId: number, limit = 100): GroupMemberWithUser[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         u.id AS user_id, u.username, u.first_name, u.last_name,
         u.profile_photo_path, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ?
       ORDER BY (gm.role = 'owner') DESC, gm.joined_at ASC
       LIMIT ?`
    )
    .all(groupId, limit) as GroupMemberWithUser[];
}

// Idempotent: joining a group you're already in is a no-op rather than an
// error, same spirit as togglePostLike's UNIQUE-constraint safety.
export function joinGroup(groupId: number, userId: number): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, userId);
  if (existing) return;
  db.prepare(
    "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')"
  ).run(groupId, userId);
}

// The owner can't leave their own group (there'd be no one left to manage
// it) — matches the "every group needs exactly one owner" assumption baked
// into getGroupMemberRole/createGroup above. Returns false in that case so
// the route can report it, rather than throwing.
export function leaveGroup(groupId: number, userId: number): boolean {
  const db = getDb();
  const role = getGroupMemberRole(groupId, userId);
  if (role === "owner") return false;
  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, userId);
  return true;
}

// ---------------------------------------------------------------------
// Friends

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export type FriendRequestWithUser = {
  id: number;
  sender_id: number;
  recipient_id: number;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
  other_user_id: number;
  other_username: string;
  other_first_name: string | null;
  other_last_name: string | null;
  other_profile_photo_path: string | null;
};

function canonicalPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export function areFriends(userAId: number, userBId: number): boolean {
  const db = getDb();
  const [a, b] = canonicalPair(userAId, userBId);
  const row = db
    .prepare("SELECT id FROM friendships WHERE user_a_id = ? AND user_b_id = ?")
    .get(a, b);
  return Boolean(row);
}

// The one existing request between two users, in either direction, if
// any — used to show "request sent" / "respond" / "friends already" state
// instead of letting a UI blindly re-send.
export function getFriendRequestBetween(
  userAId: number,
  userBId: number
): { id: number; sender_id: number; recipient_id: number; status: FriendRequestStatus } | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, sender_id, recipient_id, status FROM friend_requests
       WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)`
    )
    .get(userAId, userBId, userBId, userAId) as
    | { id: number; sender_id: number; recipient_id: number; status: FriendRequestStatus }
    | undefined;
}

// Throws (as a plain Error, for the route to turn into a 400) rather than
// returning a sentinel — a self-request or a request between two users
// who already have a pending/accepted row is a programming/UI error, not
// an expected outcome to branch on silently.
export function sendFriendRequest(senderId: number, recipientId: number): FriendRequestWithUser {
  if (senderId === recipientId) {
    throw new Error("You can't send a friend request to yourself.");
  }
  if (areFriends(senderId, recipientId)) {
    throw new Error("You're already friends.");
  }
  const existing = getFriendRequestBetween(senderId, recipientId);
  if (existing && existing.status === "pending") {
    throw new Error("A friend request is already pending between you two.");
  }

  const db = getDb();
  if (existing) {
    // A previously declined request between this pair — let them try
    // again rather than being stuck behind the old UNIQUE(sender_id,
    // recipient_id) row forever. Re-sending resets it to pending, as a
    // fresh request from whoever just clicked "Add Friend", not
    // necessarily the original sender.
    db.prepare(
      `UPDATE friend_requests
       SET sender_id = ?, recipient_id = ?, status = 'pending', created_at = datetime('now'), responded_at = NULL
       WHERE id = ?`
    ).run(senderId, recipientId, existing.id);
    return getFriendRequestById(existing.id, senderId)!;
  }

  const info = db
    .prepare("INSERT INTO friend_requests (sender_id, recipient_id) VALUES (?, ?)")
    .run(senderId, recipientId);
  return getFriendRequestById(Number(info.lastInsertRowid), senderId)!;
}

function friendRequestSelect(viewerId: number): string {
  return `
    SELECT
      fr.id, fr.sender_id, fr.recipient_id, fr.status, fr.created_at, fr.responded_at,
      u.id AS other_user_id, u.username AS other_username,
      u.first_name AS other_first_name, u.last_name AS other_last_name,
      u.profile_photo_path AS other_profile_photo_path
    FROM friend_requests fr
    JOIN users u ON u.id = (CASE WHEN fr.sender_id = ${viewerId} THEN fr.recipient_id ELSE fr.sender_id END)
  `;
}

export function getFriendRequestById(id: number, viewerId: number): FriendRequestWithUser | undefined {
  const db = getDb();
  return db.prepare(`${friendRequestSelect(viewerId)} WHERE fr.id = ?`).get(id) as
    | FriendRequestWithUser
    | undefined;
}

export function listIncomingFriendRequests(userId: number): FriendRequestWithUser[] {
  const db = getDb();
  return db
    .prepare(
      `${friendRequestSelect(userId)} WHERE fr.recipient_id = ? AND fr.status = 'pending' ORDER BY fr.created_at DESC`
    )
    .all(userId) as FriendRequestWithUser[];
}

export function listOutgoingFriendRequests(userId: number): FriendRequestWithUser[] {
  const db = getDb();
  return db
    .prepare(
      `${friendRequestSelect(userId)} WHERE fr.sender_id = ? AND fr.status = 'pending' ORDER BY fr.created_at DESC`
    )
    .all(userId) as FriendRequestWithUser[];
}

// Returns the updated request, plus (when accepted) creates the flat
// friendships row both sides' "are we friends" checks read from. Only the
// recipient may respond — enforced by the caller passing userId and this
// function checking it, so an API route can't be tricked into letting the
// sender accept their own request.
export function respondToFriendRequest(
  requestId: number,
  userId: number,
  accept: boolean
): FriendRequestWithUser {
  const db = getDb();
  const request = db
    .prepare("SELECT id, sender_id, recipient_id, status FROM friend_requests WHERE id = ?")
    .get(requestId) as { id: number; sender_id: number; recipient_id: number; status: FriendRequestStatus } | undefined;
  if (!request) throw new Error("Friend request not found.");
  if (request.recipient_id !== userId) throw new Error("Only the recipient can respond to this request.");
  if (request.status !== "pending") throw new Error("This friend request has already been responded to.");

  const newStatus: FriendRequestStatus = accept ? "accepted" : "declined";
  db.prepare(
    "UPDATE friend_requests SET status = ?, responded_at = datetime('now') WHERE id = ?"
  ).run(newStatus, requestId);

  if (accept) {
    const [a, b] = canonicalPair(request.sender_id, request.recipient_id);
    db.prepare(
      "INSERT OR IGNORE INTO friendships (user_a_id, user_b_id) VALUES (?, ?)"
    ).run(a, b);
  }

  return getFriendRequestById(requestId, userId)!;
}

export type FriendWithUser = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
  friends_since: string;
};

export function listFriends(userId: number): FriendWithUser[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         u.id AS user_id, u.username, u.first_name, u.last_name, u.profile_photo_path,
         f.created_at AS friends_since
       FROM friendships f
       JOIN users u ON u.id = (CASE WHEN f.user_a_id = ? THEN f.user_b_id ELSE f.user_a_id END)
       WHERE f.user_a_id = ? OR f.user_b_id = ?
       ORDER BY f.created_at DESC`
    )
    .all(userId, userId, userId) as FriendWithUser[];
}

export function removeFriend(userAId: number, userBId: number): void {
  const db = getDb();
  const [a, b] = canonicalPair(userAId, userBId);
  db.prepare("DELETE FROM friendships WHERE user_a_id = ? AND user_b_id = ?").run(a, b);
  // Also clear the old request row so either side can send a fresh one if
  // they later want to reconnect, instead of hitting the UNIQUE constraint
  // on a long-dead "accepted" row.
  db.prepare(
    `DELETE FROM friend_requests
     WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)`
  ).run(userAId, userBId, userBId, userAId);
}

// ---------------------------------------------------------------------
// Private messaging — plain direct messages; a "conversation" is just the
// set of messages between two user ids (see the messages table above).

export type MessageWithSender = {
  id: number;
  sender_id: number;
  recipient_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
  sender_username: string;
  sender_first_name: string | null;
  sender_last_name: string | null;
  sender_profile_photo_path: string | null;
};

const MESSAGE_SELECT = `
  SELECT
    m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.read_at,
    u.username AS sender_username,
    u.first_name AS sender_first_name,
    u.last_name AS sender_last_name,
    u.profile_photo_path AS sender_profile_photo_path
  FROM messages m
  JOIN users u ON u.id = m.sender_id
`;

export function sendMessage(senderId: number, recipientId: number, body: string): MessageWithSender {
  if (senderId === recipientId) {
    throw new Error("You can't message yourself.");
  }
  const db = getDb();
  const info = db
    .prepare("INSERT INTO messages (sender_id, recipient_id, body) VALUES (?, ?, ?)")
    .run(senderId, recipientId, body);
  return db
    .prepare(`${MESSAGE_SELECT} WHERE m.id = ?`)
    .get(Number(info.lastInsertRowid)) as MessageWithSender;
}

export function listMessagesBetween(userId: number, otherUserId: number, limit = 100): MessageWithSender[] {
  const db = getDb();
  return db
    .prepare(
      `${MESSAGE_SELECT}
       WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
       ORDER BY m.created_at ASC, m.id ASC
       LIMIT ?`
    )
    .all(userId, otherUserId, otherUserId, userId, limit) as MessageWithSender[];
}

// Marks every message FROM otherUserId TO userId as read — called when
// userId opens that conversation thread.
export function markMessagesRead(userId: number, otherUserId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE messages SET read_at = datetime('now') WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL"
  ).run(userId, otherUserId);
}

export type ConversationSummary = {
  other_user_id: number;
  other_username: string;
  other_first_name: string | null;
  other_last_name: string | null;
  other_profile_photo_path: string | null;
  last_body: string;
  last_created_at: string;
  unread_count: number;
};

// One row per person userId has exchanged messages with, newest last-
// message first — the inbox list. Computed with a correlated subquery per
// counterpart rather than a window function, since node:sqlite's bundled
// SQLite may predate window-function support and this table will stay
// small for a community site at this scale.
//
// Ordering note: created_at comes from SQLite's datetime('now'), which
// only has 1-second resolution, so two messages sent within the same
// second tie on created_at. Every ORDER BY here breaks that tie with the
// autoincrementing id (strictly insertion-ordered) so "last message"/
// "newest conversation" can't pick the wrong one of two same-second rows.
export function listConversations(userId: number): ConversationSummary[] {
  const db = getDb();
  const partners = db
    .prepare(
      `SELECT DISTINCT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS other_id
       FROM messages WHERE sender_id = ? OR recipient_id = ?`
    )
    .all(userId, userId, userId) as { other_id: number }[];

  const rows = partners.map(({ other_id }) => {
    const user = getUserById(other_id);
    const last = db
      .prepare(
        `SELECT id, body, created_at FROM messages
         WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
         ORDER BY created_at DESC, id DESC LIMIT 1`
      )
      .get(userId, other_id, other_id, userId) as { id: number; body: string; created_at: string };
    const unread = db
      .prepare(
        "SELECT COUNT(*) AS n FROM messages WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL"
      )
      .get(other_id, userId) as { n: number };
    return {
      other_user_id: other_id,
      other_username: user?.username ?? "unknown",
      other_first_name: user?.first_name ?? null,
      other_last_name: user?.last_name ?? null,
      other_profile_photo_path: user?.profile_photo_path ?? null,
      last_body: last.body,
      last_created_at: last.created_at,
      unread_count: unread.n,
      _last_id: last.id,
    };
  });

  return rows
    .sort((a, b) => b._last_id - a._last_id)
    .map(({ _last_id, ...rest }) => rest);
}

export function countUnreadMessages(userId: number): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM messages WHERE recipient_id = ? AND read_at IS NULL")
    .get(userId) as { n: number };
  return row.n;
}

// ---------------------------------------------------------------------
// Email queue — see the queued_emails table above. Pure data access only;
// building EmailMessage content and actually sending lives in
// src/lib/email.ts (processEmailQueue there reads/writes through these
// functions so this file stays the only thing that touches SQLite).

export type QueuedEmailKind = "friend_request" | "friend_accepted" | "new_message";

export type QueuedEmail = {
  id: number;
  to_address: string;
  kind: QueuedEmailKind;
  payload_json: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  created_at: string;
  sent_at: string | null;
  last_error: string | null;
};

export function enqueueEmail(
  toAddress: string,
  kind: QueuedEmailKind,
  payload: Record<string, unknown>
): QueuedEmail {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO queued_emails (to_address, kind, payload_json) VALUES (?, ?, ?)")
    .run(toAddress, kind, JSON.stringify(payload));
  return db
    .prepare("SELECT * FROM queued_emails WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as QueuedEmail;
}

export function listPendingQueuedEmails(limit = 20): QueuedEmail[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM queued_emails WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?")
    .all(limit) as QueuedEmail[];
}

export function markQueuedEmailSent(id: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE queued_emails SET status = 'sent', sent_at = datetime('now'), attempts = attempts + 1 WHERE id = ?"
  ).run(id);
}

export function markQueuedEmailFailed(id: number, error: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE queued_emails SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?"
  ).run(error, id);
}

// ---------------------------------------------------------------------
// Live streaming / VOD — business logic only (viewers, chat, likes,
// moderation, the scheduled->live->ended state machine). Video transport
// is bring-your-own-stream — embed_url is wherever the host is already
// broadcasting on YouTube/Facebook/Vimeo Live; this file never talks to
// any of those platforms, it only stores which URL to embed and tracks
// what members do around it.

export type StreamPlatform = "youtube" | "facebook" | "vimeo";
export type StreamStatus = "scheduled" | "live" | "ended";

export type StreamWithHost = {
  id: number;
  host_id: number;
  host_username: string;
  host_first_name: string | null;
  host_last_name: string | null;
  host_profile_photo_path: string | null;
  title: string;
  description: string | null;
  platform: StreamPlatform;
  embed_url: string;
  status: StreamStatus;
  scheduled_for: string | null;
  started_at: string | null;
  ended_at: string | null;
  peak_viewer_count: number;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked_by_viewer: number;
};

const STREAM_SELECT = `
  SELECT
    s.id, s.host_id, s.title, s.description, s.platform, s.embed_url, s.status,
    s.scheduled_for, s.started_at, s.ended_at, s.peak_viewer_count, s.created_at,
    u.username AS host_username,
    u.first_name AS host_first_name,
    u.last_name AS host_last_name,
    u.profile_photo_path AS host_profile_photo_path,
    (SELECT COUNT(*) FROM stream_likes sl WHERE sl.stream_id = s.id) AS like_count,
    (SELECT COUNT(*) FROM stream_comments sc WHERE sc.stream_id = s.id AND sc.deleted_at IS NULL) AS comment_count,
    (SELECT COUNT(*) FROM stream_likes sl2 WHERE sl2.stream_id = s.id AND sl2.user_id = ?) AS liked_by_viewer
  FROM streams s
  JOIN users u ON u.id = s.host_id
`;

export function createStream(
  hostId: number,
  input: {
    title: string;
    description: string | null;
    platform: StreamPlatform;
    embedUrl: string;
    scheduledFor?: string | null;
    goLive?: boolean;
  }
): StreamWithHost {
  const db = getDb();
  const status: StreamStatus = input.goLive ? "live" : "scheduled";
  const info = db
    .prepare(
      `INSERT INTO streams (host_id, title, description, platform, embed_url, status, scheduled_for)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      hostId,
      input.title,
      input.description,
      input.platform,
      input.embedUrl,
      status,
      input.scheduledFor ?? null
    );
  const streamId = Number(info.lastInsertRowid);
  // Set via SQL's own clock (datetime('now')) rather than a JS Date,
  // same reasoning as startStream/endStream below — one clock for every
  // timestamp in this table, not a mix of Node's and SQLite's.
  if (input.goLive) {
    db.prepare("UPDATE streams SET started_at = datetime('now') WHERE id = ?").run(streamId);
  }
  return getStreamById(streamId, hostId)!;
}

export function getStreamById(streamId: number, viewerId: number | null): StreamWithHost | undefined {
  const db = getDb();
  return db.prepare(`${STREAM_SELECT} WHERE s.id = ?`).get(viewerId ?? 0, streamId) as
    | StreamWithHost
    | undefined;
}

// status='live': most-recently-started first. 'scheduled': soonest
// upcoming first. 'ended' (VOD): most-recently-ended first.
export function listStreams(
  status: StreamStatus,
  viewerId: number | null,
  limit = 30
): StreamWithHost[] {
  const db = getDb();
  const orderBy =
    status === "scheduled"
      ? "s.scheduled_for ASC"
      : status === "live"
        ? "s.started_at DESC"
        : "s.ended_at DESC";
  return db
    .prepare(`${STREAM_SELECT} WHERE s.status = ? ORDER BY ${orderBy} LIMIT ?`)
    .all(viewerId ?? 0, status, limit) as StreamWithHost[];
}

export function listStreamsByHost(hostId: number, viewerId: number | null): StreamWithHost[] {
  const db = getDb();
  return db
    .prepare(`${STREAM_SELECT} WHERE s.host_id = ? ORDER BY s.created_at DESC`)
    .all(viewerId ?? 0, hostId) as StreamWithHost[];
}

// Only the host can start their own scheduled stream, and only from
// 'scheduled' — starting something already live/ended is a no-op error,
// not silently re-triggered.
export function startStream(streamId: number, hostId: number): StreamWithHost {
  const db = getDb();
  const stream = db
    .prepare("SELECT host_id, status FROM streams WHERE id = ?")
    .get(streamId) as { host_id: number; status: StreamStatus } | undefined;
  if (!stream) throw new Error("Stream not found.");
  if (stream.host_id !== hostId) throw new Error("Only the host can start this stream.");
  if (stream.status !== "scheduled") throw new Error("This stream has already started.");

  db.prepare(
    "UPDATE streams SET status = 'live', started_at = datetime('now') WHERE id = ?"
  ).run(streamId);
  return getStreamById(streamId, hostId)!;
}

// Ending a stream doesn't delete or move anything — the same row just
// becomes the VOD (status='ended'), still pointing at the same embed_url,
// because YouTube/Facebook/Vimeo all leave the recording at that URL
// after the broadcast ends.
export function endStream(streamId: number, hostId: number): StreamWithHost {
  const db = getDb();
  const stream = db
    .prepare("SELECT host_id, status FROM streams WHERE id = ?")
    .get(streamId) as { host_id: number; status: StreamStatus } | undefined;
  if (!stream) throw new Error("Stream not found.");
  if (stream.host_id !== hostId) throw new Error("Only the host can end this stream.");
  if (stream.status !== "live") throw new Error("This stream isn't live.");

  db.prepare(
    "UPDATE streams SET status = 'ended', ended_at = datetime('now') WHERE id = ?"
  ).run(streamId);
  return getStreamById(streamId, hostId)!;
}

export function toggleStreamLike(streamId: number, userId: number): { liked: boolean; likeCount: number } {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM stream_likes WHERE stream_id = ? AND user_id = ?")
    .get(streamId, userId) as { id: number } | undefined;

  if (existing) {
    db.prepare("DELETE FROM stream_likes WHERE id = ?").run(existing.id);
  } else {
    db.prepare("INSERT INTO stream_likes (stream_id, user_id) VALUES (?, ?)").run(streamId, userId);
  }

  const row = db
    .prepare("SELECT COUNT(*) as n FROM stream_likes WHERE stream_id = ?")
    .get(streamId) as { n: number };
  return { liked: !existing, likeCount: row.n };
}

// ---------------------------------------------------------------------
// Stream chat + moderation

export type StreamCommentWithAuthor = {
  id: number;
  stream_id: number;
  author_id: number;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_profile_photo_path: string | null;
  body: string;
  created_at: string;
};

const STREAM_COMMENT_SELECT = `
  SELECT
    c.id, c.stream_id, c.author_id, c.body, c.created_at,
    u.username AS author_username,
    u.first_name AS author_first_name,
    u.last_name AS author_last_name,
    u.profile_photo_path AS author_profile_photo_path
  FROM stream_comments c
  JOIN users u ON u.id = c.author_id
`;

export function isStreamBanned(streamId: number, userId: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM stream_bans WHERE stream_id = ? AND user_id = ?")
    .get(streamId, userId);
  return Boolean(row);
}

// Throws rather than returning a sentinel — a banned user trying to
// comment is a 403 at the route, not a state the caller is expected to
// branch on quietly.
export function postStreamComment(
  streamId: number,
  authorId: number,
  body: string
): StreamCommentWithAuthor {
  if (isStreamBanned(streamId, authorId)) {
    throw new Error("You've been banned from commenting on this stream.");
  }
  const db = getDb();
  const info = db
    .prepare("INSERT INTO stream_comments (stream_id, author_id, body) VALUES (?, ?, ?)")
    .run(streamId, authorId, body);
  return db
    .prepare(`${STREAM_COMMENT_SELECT} WHERE c.id = ?`)
    .get(Number(info.lastInsertRowid)) as StreamCommentWithAuthor;
}

export function listStreamComments(streamId: number, limit = 200): StreamCommentWithAuthor[] {
  const db = getDb();
  return db
    .prepare(
      `${STREAM_COMMENT_SELECT} WHERE c.stream_id = ? AND c.deleted_at IS NULL ORDER BY c.created_at ASC, c.id ASC LIMIT ?`
    )
    .all(streamId, limit) as StreamCommentWithAuthor[];
}

export function getStreamCommentById(commentId: number): (StreamCommentWithAuthor & { stream_id: number }) | undefined {
  const db = getDb();
  return db.prepare(`${STREAM_COMMENT_SELECT} WHERE c.id = ?`).get(commentId) as
    | (StreamCommentWithAuthor & { stream_id: number })
    | undefined;
}

export function softDeleteStreamComment(commentId: number, deletedBy: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE stream_comments SET deleted_at = datetime('now'), deleted_by = ? WHERE id = ?"
  ).run(deletedBy, commentId);
}

export type StreamCommentReport = {
  id: number;
  comment_id: number;
  reporter_id: number;
  reason: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: number | null;
  resolution: "dismissed" | "comment_deleted" | "user_banned" | null;
};

export function reportStreamComment(
  commentId: number,
  reporterId: number,
  reason: string
): StreamCommentReport {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO stream_comment_reports (comment_id, reporter_id, reason) VALUES (?, ?, ?)")
    .run(commentId, reporterId, reason);
  return db
    .prepare("SELECT * FROM stream_comment_reports WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as StreamCommentReport;
}

// Open (unresolved) reports for every comment on one stream — what a
// host sees in their own moderation queue. Joins back to the comment and
// its author so the host doesn't need a second round trip per report.
export function listOpenReportsForStream(streamId: number): (StreamCommentReport & {
  comment_body: string;
  comment_author_id: number;
  comment_author_username: string;
  reporter_username: string;
})[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         r.id, r.comment_id, r.reporter_id, r.reason, r.created_at,
         r.resolved_at, r.resolved_by, r.resolution,
         c.body AS comment_body, c.author_id AS comment_author_id,
         cu.username AS comment_author_username,
         ru.username AS reporter_username
       FROM stream_comment_reports r
       JOIN stream_comments c ON c.id = r.comment_id
       JOIN users cu ON cu.id = c.author_id
       JOIN users ru ON ru.id = r.reporter_id
       WHERE c.stream_id = ? AND r.resolved_at IS NULL
       ORDER BY r.created_at ASC`
    )
    .all(streamId) as (StreamCommentReport & {
    comment_body: string;
    comment_author_id: number;
    comment_author_username: string;
    reporter_username: string;
  })[];
}

// Same shape as listOpenReportsForStream, but across every stream — the
// site-wide admin moderation queue (one screen instead of having to check
// each stream's own page). Also carries stream_id/stream_title so the
// dashboard knows which per-stream resolve endpoint to call for each row.
export function listAllOpenStreamCommentReports(): (StreamCommentReport & {
  comment_body: string;
  comment_author_id: number;
  comment_author_username: string;
  reporter_username: string;
  stream_id: number;
  stream_title: string;
})[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         r.id, r.comment_id, r.reporter_id, r.reason, r.created_at,
         r.resolved_at, r.resolved_by, r.resolution,
         c.body AS comment_body, c.author_id AS comment_author_id,
         cu.username AS comment_author_username,
         ru.username AS reporter_username,
         s.id AS stream_id, s.title AS stream_title
       FROM stream_comment_reports r
       JOIN stream_comments c ON c.id = r.comment_id
       JOIN streams s ON s.id = c.stream_id
       JOIN users cu ON cu.id = c.author_id
       JOIN users ru ON ru.id = r.reporter_id
       WHERE r.resolved_at IS NULL
       ORDER BY r.created_at ASC`
    )
    .all() as (StreamCommentReport & {
    comment_body: string;
    comment_author_id: number;
    comment_author_username: string;
    reporter_username: string;
    stream_id: number;
    stream_title: string;
  })[];
}

// The one moderation action a host/admin takes on a report: dismiss it,
// delete the offending comment, or ban its author from this stream (which
// also deletes the comment — a ban without removing what got them banned
// would leave the abusive message sitting in the chat).
export function resolveCommentReport(
  reportId: number,
  resolvedBy: number,
  resolution: "dismissed" | "comment_deleted" | "user_banned"
): void {
  const db = getDb();
  const report = db
    .prepare("SELECT comment_id FROM stream_comment_reports WHERE id = ?")
    .get(reportId) as { comment_id: number } | undefined;
  if (!report) throw new Error("Report not found.");

  const comment = getStreamCommentById(report.comment_id);
  if (!comment) throw new Error("Reported comment not found.");

  if (resolution === "comment_deleted" || resolution === "user_banned") {
    softDeleteStreamComment(report.comment_id, resolvedBy);
  }
  if (resolution === "user_banned") {
    banStreamViewer(comment.stream_id, comment.author_id, resolvedBy);
  }

  db.prepare(
    "UPDATE stream_comment_reports SET resolved_at = datetime('now'), resolved_by = ?, resolution = ? WHERE id = ?"
  ).run(resolvedBy, resolution, reportId);
}

export function banStreamViewer(streamId: number, userId: number, bannedBy: number): void {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO stream_bans (stream_id, user_id, banned_by) VALUES (?, ?, ?)"
  ).run(streamId, userId, bannedBy);
}

export function unbanStreamViewer(streamId: number, userId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM stream_bans WHERE stream_id = ? AND user_id = ?").run(streamId, userId);
}

// ---------------------------------------------------------------------
// Viewer presence — heartbeat-based, since there's no socket connection
// to this server to count (the video plays from the embed platform's own
// player). See the stream_viewer_sessions table comment above.

const VIEWER_STALE_AFTER_SECONDS = 60;

export function joinStreamViewer(streamId: number, userId: number | null): number {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO stream_viewer_sessions (stream_id, user_id) VALUES (?, ?)")
    .run(streamId, userId);
  const sessionId = Number(info.lastInsertRowid);
  bumpPeakViewerCount(streamId);
  return sessionId;
}

export function heartbeatStreamViewer(sessionId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE stream_viewer_sessions SET last_heartbeat_at = datetime('now') WHERE id = ? AND left_at IS NULL"
  ).run(sessionId);
  const session = db
    .prepare("SELECT stream_id FROM stream_viewer_sessions WHERE id = ?")
    .get(sessionId) as { stream_id: number } | undefined;
  if (session) bumpPeakViewerCount(session.stream_id);
}

export function leaveStreamViewer(sessionId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE stream_viewer_sessions SET left_at = datetime('now') WHERE id = ? AND left_at IS NULL"
  ).run(sessionId);
}

export function getLiveViewerCount(
  streamId: number,
  staleAfterSeconds = VIEWER_STALE_AFTER_SECONDS
): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM stream_viewer_sessions
       WHERE stream_id = ? AND left_at IS NULL
         AND last_heartbeat_at >= datetime('now', '-' || ? || ' seconds')`
    )
    .get(streamId, staleAfterSeconds) as { n: number };
  return row.n;
}

function bumpPeakViewerCount(streamId: number): void {
  const db = getDb();
  const current = getLiveViewerCount(streamId);
  db.prepare(
    "UPDATE streams SET peak_viewer_count = MAX(peak_viewer_count, ?) WHERE id = ?"
  ).run(current, streamId);
}

// Total viewer sessions ever recorded for a stream — the "N views" stat
// shown on a VOD after it ends. Deliberately counts every session
// (including an anonymous viewer or the same person refreshing twice),
// the same way a view counter on YouTube/Facebook counts plays, not
// unique humans.
export function getTotalViewerSessionCount(streamId: number): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM stream_viewer_sessions WHERE stream_id = ?")
    .get(streamId) as { n: number };
  return row.n;
}

// ---------------------------------------------------------------------
// Pueblo Business Channel — a real profile for a business: posts (its
// "wall", reusing the existing posts table), followers, reviews,
// menu/services, and job postings. Replaces the decorative
// /admin/locations and /admin/reviews mockups with real data.

export type Business = {
  id: number;
  owner_id: number;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours_text: string | null;
  logo_path: string | null;
  cover_photo_path: string | null;
  created_at: string;
};

export type BusinessWithMeta = Business & {
  owner_username: string;
  follower_count: number;
  post_count: number;
  review_count: number;
  average_rating: number | null;
};

const BUSINESS_SELECT = `
  SELECT
    b.id, b.owner_id, b.name, b.slug, b.category, b.description, b.address,
    b.phone, b.website, b.hours_text, b.logo_path, b.cover_photo_path, b.created_at,
    u.username AS owner_username,
    (SELECT COUNT(*) FROM business_followers bf WHERE bf.business_id = b.id) AS follower_count,
    (SELECT COUNT(*) FROM posts p WHERE p.target_type = 'business' AND p.target_id = b.id AND p.deleted_at IS NULL) AS post_count,
    (SELECT COUNT(*) FROM business_reviews br WHERE br.business_id = b.id) AS review_count,
    (SELECT AVG(br.rating) FROM business_reviews br WHERE br.business_id = b.id) AS average_rating
  FROM businesses b
  JOIN users u ON u.id = b.owner_id
`;

function businessSlugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "business";
}

// Appends -2, -3, ... until free, same race-tolerance tradeoff as
// groups' uniqueSlug — acceptable at this scale.
function uniqueBusinessSlug(db: DatabaseSync, name: string): string {
  const base = businessSlugify(name);
  let candidate = base;
  let n = 2;
  while (db.prepare("SELECT id FROM businesses WHERE slug = ?").get(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export function createBusiness(
  ownerId: number,
  name: string,
  category: string,
  description: string | null,
  address: string | null,
  phone: string | null,
  website: string | null,
  hoursText: string | null
): BusinessWithMeta {
  const db = getDb();
  const slug = uniqueBusinessSlug(db, name);
  const info = db
    .prepare(
      `INSERT INTO businesses (owner_id, name, slug, category, description, address, phone, website, hours_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(ownerId, name, slug, category, description, address, phone, website, hoursText);
  return getBusinessById(Number(info.lastInsertRowid))!;
}

export function getBusinessById(id: number): BusinessWithMeta | undefined {
  const db = getDb();
  return db.prepare(`${BUSINESS_SELECT} WHERE b.id = ?`).get(id) as BusinessWithMeta | undefined;
}

export function getBusinessBySlug(slug: string): BusinessWithMeta | undefined {
  const db = getDb();
  return db.prepare(`${BUSINESS_SELECT} WHERE b.slug = ?`).get(slug) as BusinessWithMeta | undefined;
}

export function listBusinesses(limit = 50): BusinessWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${BUSINESS_SELECT} ORDER BY b.created_at DESC LIMIT ?`)
    .all(limit) as BusinessWithMeta[];
}

export function listBusinessesForOwner(ownerId: number): BusinessWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${BUSINESS_SELECT} WHERE b.owner_id = ? ORDER BY b.created_at DESC`)
    .all(ownerId) as BusinessWithMeta[];
}

export function isBusinessOwner(businessId: number, userId: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM businesses WHERE id = ? AND owner_id = ?")
    .get(businessId, userId);
  return Boolean(row);
}

export function updateBusinessProfile(
  businessId: number,
  fields: Partial<
    Pick<
      Business,
      "category" | "description" | "address" | "phone" | "website" | "hours_text"
    >
  >
): void {
  const db = getDb();
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => fields[k] ?? null);
  db.prepare(`UPDATE businesses SET ${setClause} WHERE id = ?`).run(...values, businessId);
}

// Idempotent, same pattern as joinGroup — following a business you
// already follow is a no-op rather than an error.
export function followBusiness(businessId: number, userId: number): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM business_followers WHERE business_id = ? AND user_id = ?")
    .get(businessId, userId);
  if (existing) return;
  db.prepare(
    "INSERT INTO business_followers (business_id, user_id) VALUES (?, ?)"
  ).run(businessId, userId);
}

export function unfollowBusiness(businessId: number, userId: number): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM business_followers WHERE business_id = ? AND user_id = ?"
  ).run(businessId, userId);
}

export function isFollowingBusiness(businessId: number, userId: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM business_followers WHERE business_id = ? AND user_id = ?")
    .get(businessId, userId);
  return Boolean(row);
}

// Businesses a given user follows, newest-followed first — for a "my
// businesses" list, mirroring listGroupsForUser.
export function listBusinessesFollowedByUser(userId: number): BusinessWithMeta[] {
  const db = getDb();
  return db
    .prepare(
      `${BUSINESS_SELECT}
       JOIN business_followers bf ON bf.business_id = b.id
       WHERE bf.user_id = ?
       ORDER BY bf.created_at DESC`
    )
    .all(userId) as BusinessWithMeta[];
}

export type BusinessReviewWithUser = {
  id: number;
  business_id: number;
  user_id: number;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
};

const BUSINESS_REVIEW_SELECT = `
  SELECT
    br.id, br.business_id, br.user_id, br.rating, br.body, br.created_at, br.updated_at,
    u.username, u.first_name, u.last_name, u.profile_photo_path
  FROM business_reviews br
  JOIN users u ON u.id = br.user_id
`;

// Upsert: posting a second review from the same user replaces the first
// (ON CONFLICT on the UNIQUE(business_id, user_id) constraint) rather than
// creating a duplicate — a member's rating of a business is a single
// opinion they can update, not a log of every time they rated it.
export function upsertBusinessReview(
  businessId: number,
  userId: number,
  rating: number,
  body: string | null
): BusinessReviewWithUser {
  const db = getDb();
  db.prepare(
    `INSERT INTO business_reviews (business_id, user_id, rating, body, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(business_id, user_id)
     DO UPDATE SET rating = excluded.rating, body = excluded.body, updated_at = datetime('now')`
  ).run(businessId, userId, rating, body);
  return db
    .prepare(`${BUSINESS_REVIEW_SELECT} WHERE br.business_id = ? AND br.user_id = ?`)
    .get(businessId, userId) as BusinessReviewWithUser;
}

export function listBusinessReviews(businessId: number, limit = 100): BusinessReviewWithUser[] {
  const db = getDb();
  return db
    .prepare(`${BUSINESS_REVIEW_SELECT} WHERE br.business_id = ? ORDER BY br.created_at DESC LIMIT ?`)
    .all(businessId, limit) as BusinessReviewWithUser[];
}

export function deleteBusinessReview(businessId: number, userId: number): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM business_reviews WHERE business_id = ? AND user_id = ?"
  ).run(businessId, userId);
}

export type BusinessMenuItem = {
  id: number;
  business_id: number;
  section: "menu" | "service";
  name: string;
  description: string | null;
  price_cents: number | null;
  sort_order: number;
  created_at: string;
};

export function addBusinessMenuItem(
  businessId: number,
  section: "menu" | "service",
  name: string,
  description: string | null,
  priceCents: number | null
): BusinessMenuItem {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM business_menu_items WHERE business_id = ?")
    .get(businessId) as { n: number };
  const info = db
    .prepare(
      `INSERT INTO business_menu_items (business_id, section, name, description, price_cents, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(businessId, section, name, description, priceCents, row.n);
  return db
    .prepare("SELECT * FROM business_menu_items WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as BusinessMenuItem;
}

export function listBusinessMenuItems(businessId: number): BusinessMenuItem[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM business_menu_items WHERE business_id = ? ORDER BY section ASC, sort_order ASC"
    )
    .all(businessId) as BusinessMenuItem[];
}

export function deleteBusinessMenuItem(businessId: number, itemId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM business_menu_items WHERE id = ? AND business_id = ?").run(
    itemId,
    businessId
  );
}

export type BusinessJob = {
  id: number;
  business_id: number;
  title: string;
  description: string | null;
  created_at: string;
  closed_at: string | null;
};

export function createBusinessJob(
  businessId: number,
  title: string,
  description: string | null
): BusinessJob {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO business_jobs (business_id, title, description) VALUES (?, ?, ?)")
    .run(businessId, title, description);
  return db
    .prepare("SELECT * FROM business_jobs WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as BusinessJob;
}

// Open jobs only by default (closed_at IS NULL) — a business's channel
// page shows what's currently hiring, not its whole job history.
export function listBusinessJobs(businessId: number, includeClosed = false): BusinessJob[] {
  const db = getDb();
  const sql = includeClosed
    ? "SELECT * FROM business_jobs WHERE business_id = ? ORDER BY created_at DESC"
    : "SELECT * FROM business_jobs WHERE business_id = ? AND closed_at IS NULL ORDER BY created_at DESC";
  return db.prepare(sql).all(businessId) as BusinessJob[];
}

export function closeBusinessJob(businessId: number, jobId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE business_jobs SET closed_at = datetime('now') WHERE id = ? AND business_id = ? AND closed_at IS NULL"
  ).run(jobId, businessId);
}

// A business's live + past broadcasts — just that business owner's rows
// in `streams`, no schema link needed (see note above createBusiness).
export function listStreamsForBusiness(
  businessId: number,
  viewerId: number | null,
  limit = 20
): StreamWithHost[] {
  const db = getDb();
  const business = db.prepare("SELECT owner_id FROM businesses WHERE id = ?").get(businessId) as
    | { owner_id: number }
    | undefined;
  if (!business) return [];
  return db
    .prepare(`${STREAM_SELECT} WHERE s.host_id = ? ORDER BY s.created_at DESC LIMIT ?`)
    .all(viewerId ?? 0, business.owner_id, limit) as StreamWithHost[];
}
