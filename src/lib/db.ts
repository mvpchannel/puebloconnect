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
  // Wall/profile page fields — see /profile/[userId]/page.tsx. Both
  // optional, nullable, editable from Account Settings.
  { name: "bio", ddl: "ALTER TABLE users ADD COLUMN bio TEXT" },
  { name: "cover_photo_path", ddl: "ALTER TABLE users ADD COLUMN cover_photo_path TEXT" },
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
    // Photo posts: additive migration for databases created before photos existed.
    if (!columnExists(db, "posts", "image_path")) {
      db.exec("ALTER TABLE posts ADD COLUMN image_path TEXT");
    }
    if (!columnExists(db, "posts", "video_path")) {
      db.exec("ALTER TABLE posts ADD COLUMN video_path TEXT");
    }

    // Stories: a photo (+ optional caption) that disappears from the
    // stories row 24 hours after it was posted. Rows are kept (soft
    // delete / expiry is a query filter) so nothing is lost silently.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author_id INTEGER NOT NULL REFERENCES users(id),
        image_path TEXT NOT NULL,
        caption TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stories_created ON stories(created_at)`);

    // Classifieds: community listings (items, services, wanted, free,
    // announcements). Free to post for now; listings expire after 30 days.
    db.exec(`
      CREATE TABLE IF NOT EXISTS classifieds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author_id INTEGER NOT NULL REFERENCES users(id),
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        price_text TEXT,
        image_path TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_classifieds_created ON classifieds(created_at)`);

    // Business Spotlight: editorial features written by Pueblo Connect staff
    // (admins) about a local business. Drafts are invisible to the public.
    db.exec(`
      CREATE TABLE IF NOT EXISTS spotlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        business_id INTEGER REFERENCES businesses(id),
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner_name TEXT,
        body TEXT NOT NULL,
        hero_image_path TEXT,
        sponsored INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        published_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);

    // Daily Pueblo Digital Connection: short tracked links (/q/<code>) that a
    // printed QR code points at. Visiting one counts a scan and redirects to
    // an internal page of this site.
    db.exec(`
      CREATE TABLE IF NOT EXISTS qr_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        target_path TEXT NOT NULL,
        scans INTEGER NOT NULL DEFAULT 0,
        last_scanned_at TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);

    // We Asked the Pueblo: staff post a question, members answer, staff
    // approve answers before they are public and can mark some as selected
    // for The Daily Pueblo. One answer per member per question.
    db.exec(`
      CREATE TABLE IF NOT EXISTS pueblo_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        question TEXT NOT NULL,
        context TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS pueblo_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL REFERENCES pueblo_questions(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        selected INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(question_id, user_id)
      )
    `);

    // Pueblo Drops / Treasure Hunts: prizes hidden at spots in the 3D Pueblo.
    // A claim records a short code the member shows to redeem the prize;
    // staff verify the code and mark it redeemed. Points (if any) go through
    // the normal rewards system.
    db.exec(`
      CREATE TABLE IF NOT EXISTS pueblo_drops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        prize_text TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'prize' CHECK (kind IN ('prize', 'golden_ticket')),
        x REAL NOT NULL,
        z REAL NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        max_claims INTEGER,
        expires_at TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS pueblo_drop_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        drop_id INTEGER NOT NULL REFERENCES pueblo_drops(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        code TEXT NOT NULL,
        claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
        redeemed_at TEXT,
        UNIQUE(drop_id, user_id)
      )
    `);

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

    // 3D Business Storefronts: a business with storefront_lot set has a
    // building in the 3D Pueblo (see src/lib/pueblo3d/storefronts.ts).
    if (!columnExists(db, "businesses", "storefront_lot")) {
      db.exec("ALTER TABLE businesses ADD COLUMN storefront_lot INTEGER");
    }
    if (!columnExists(db, "businesses", "storefront_color")) {
      db.exec("ALTER TABLE businesses ADD COLUMN storefront_color TEXT");
    }

    // 360° Virtual Business Tours: an admin-attached tour link (validated
    // against an allowlist; see src/lib/tour-url.ts) and its derived embed address.
    // Pueblo 3D Advertising: optional headline for the storefront's rooftop billboard.
    if (!columnExists(db, "businesses", "billboard_text")) {
      db.exec("ALTER TABLE businesses ADD COLUMN billboard_text TEXT");
    }
    for (const col of ["tour_url", "tour_provider", "tour_embed"]) {
      if (!columnExists(db, "businesses", col)) db.exec(`ALTER TABLE businesses ADD COLUMN ${col} TEXT`);
    }

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

    // Pueblo Events + Check-In. An event's wall reuses the posts table
    // (target_type='event', target_id=<event id> — same pattern as
    // groups/businesses), so no separate "event posts" table is needed.
    // business_id is nullable: an event can exist on its own, or be
    // hosted/sponsored by a business channel.
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER NOT NULL REFERENCES users(id),
        business_id INTEGER REFERENCES businesses(id),
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        location_text TEXT,
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        cover_photo_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_events_business ON events(business_id)`);

    // One RSVP per member per event (UNIQUE) — changing your mind updates
    // the existing row (going <-> interested) rather than stacking rows.
    db.exec(`
      CREATE TABLE IF NOT EXISTS event_rsvps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL REFERENCES events(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL CHECK (status IN ('going', 'interested')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(event_id, user_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id, status)`);

    // One check-in per member per event — a real-world "I was there",
    // separate from an RSVP (you can RSVP without attending, or check in
    // without having RSVP'd first).
    db.exec(`
      CREATE TABLE IF NOT EXISTS event_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL REFERENCES events(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(event_id, user_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON event_checkins(event_id)`);

    // Pueblo Deals + Flash Deals. A deal belongs to a business channel.
    // type='flash' is a time-limited deal (meant to expire quickly, e.g.
    // "2 hours"); type='standard' is a regular, longer-lived deal — both
    // just differ in how expires_at is used, enforced by the API layer,
    // not the schema. `featured` marks a deal eligible to be picked as
    // the homepage's "Deal of the Day" (see getFeaturedDeal below).
    db.exec(`
      CREATE TABLE IF NOT EXISTS deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        title TEXT NOT NULL,
        description TEXT,
        discount_text TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'flash')),
        starts_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT,
        featured INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        deactivated_at TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_business ON deals(business_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_deals_active ON deals(deactivated_at, expires_at)`);

    // One claim per member per deal — claiming twice just confirms the
    // same claim, same idempotency pattern as event check-ins.
    db.exec(`
      CREATE TABLE IF NOT EXISTS deal_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER NOT NULL REFERENCES deals(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(deal_id, user_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_deal_claims_deal ON deal_claims(deal_id)`);

    // Best of the Pueblo — categories (Best Tacos, Best Coffee, ...),
    // voting periods (admin-run, e.g. "October 2026"), one vote per
    // member per category per period (changeable until the period
    // closes), and winners snapshotted when an admin closes a period —
    // so a later period's votes never retroactively change a past
    // period's recorded winner.
    db.exec(`
      CREATE TABLE IF NOT EXISTS bop_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS bop_voting_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        starts_at TEXT NOT NULL DEFAULT (datetime('now')),
        ends_at TEXT,
        closed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS bop_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL REFERENCES bop_voting_periods(id),
        category_id INTEGER NOT NULL REFERENCES bop_categories(id),
        voter_id INTEGER NOT NULL REFERENCES users(id),
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(period_id, category_id, voter_id)
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bop_votes_tally ON bop_votes(period_id, category_id, business_id)`
    );

    db.exec(`
      CREATE TABLE IF NOT EXISTS bop_winners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL REFERENCES bop_voting_periods(id),
        category_id INTEGER NOT NULL REFERENCES bop_categories(id),
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        vote_count INTEGER NOT NULL,
        decided_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(period_id, category_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bop_winners_business ON bop_winners(business_id)`);

    // Pueblo Street Team. A member submits a photo/video (as a link —
    // this app has no file upload pipeline, same honest limitation as
    // every other cover-photo field in this schema) with a caption; an
    // admin approves or rejects it before it's shown publicly. Approved
    // submissions feed a member's contributor badges (computed from
    // counts, not stored — see contributorBadgesForUser below).
    db.exec(`
      CREATE TABLE IF NOT EXISTS street_team_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submitter_id INTEGER NOT NULL REFERENCES users(id),
        media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
        media_url TEXT NOT NULL,
        caption TEXT,
        location_text TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TEXT,
        review_note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_street_team_status ON street_team_submissions(status, created_at)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_street_team_submitter ON street_team_submissions(submitter_id)`
    );

    // The Pueblo Booth. A weekly community question; members answer with
    // text or a video/audio link (same no-upload-pipeline honesty as
    // Street Team). One answer per member per question — editable while
    // the question stays open, via ON CONFLICT upsert.
    db.exec(`
      CREATE TABLE IF NOT EXISTS booth_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_text TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        opens_at TEXT NOT NULL DEFAULT (datetime('now')),
        closes_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_booth_questions_opens ON booth_questions(opens_at)`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS booth_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL REFERENCES booth_questions(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        answer_type TEXT NOT NULL CHECK (answer_type IN ('text', 'video', 'audio')),
        answer_text TEXT,
        media_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (question_id, user_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_booth_answers_question ON booth_answers(question_id)`);

    // Pueblo Passport. A stamp per member per "thing" they've engaged
    // with — a specific business, a specific event, a specific stream,
    // or a one-off milestone category with no specific ref (explore_3d,
    // daily_pueblo). UNIQUE(user_id, category, ref_id) makes granting a
    // stamp idempotent: visiting the same business channel twice earns
    // one stamp, not two. 'daily_pueblo' is reserved for when that
    // feature exists — nothing grants it yet, same honest-gap pattern
    // as every undone feature in this app.
    db.exec(`
      CREATE TABLE IF NOT EXISTS passport_stamps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        category TEXT NOT NULL CHECK (category IN ('business', 'event', 'pueblo_live', 'explore_3d', 'daily_pueblo')),
        ref_id INTEGER,
        label TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (user_id, category, ref_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_passport_stamps_user ON passport_stamps(user_id)`);

    // Pueblo Rewards. The unifying points ledger — every other feature
    // built this round (posts, following a business, reviews, RSVPs,
    // check-ins, deal claims, Best of the Pueblo votes, Booth answers,
    // approved Street Team submissions, Passport stamps) calls
    // awardPoints at the moment the member earns it. ref_key is always
    // a non-null string (never a bare nullable id) specifically so the
    // UNIQUE index below actually dedupes one-off actions — SQLite
    // treats NULL as always-distinct, the same gotcha passport_stamps'
    // ref_id has to work around with an explicit existence check.
    db.exec(`
      CREATE TABLE IF NOT EXISTS rewards_point_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        ref_key TEXT NOT NULL DEFAULT '',
        points INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (user_id, action, ref_key)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_points_user ON rewards_point_events(user_id)`);

    // ---------------------------------------------------------------
    // Pueblo Live engagement + gamification: floating reactions, a
    // pinned announcement/poll slot, stream milestones tied to real
    // Deals, and time-limited "flash drops" that hand out a Passport
    // stamp or a deal claim. All of this layers on the existing
    // streams/stream_viewer_sessions tables — no changes to those.

    // Floating emoji reactions. Never pruned, same as stream_comments —
    // a light, append-only log the client polls incrementally (since
    // id, see listStreamReactionsSince).
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        emoji TEXT NOT NULL CHECK (emoji IN ('heart', 'fire', 'clap', 'laugh', 'wow')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stream_reactions_stream ON stream_reactions(stream_id, id)`);

    // Pinned announcements — only one active per stream at a time;
    // pinning a new one unpins the last (see pinStreamAnnouncement).
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        body TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        unpinned_at TEXT
      )
    `);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_stream_announcements_active ON stream_announcements(stream_id, unpinned_at)`
    );

    // Live polls — one open poll per stream at a time (creating a new
    // one closes the last). One vote per member per poll, changeable.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        question TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        closed_at TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stream_polls_active ON stream_polls(stream_id, closed_at)`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_poll_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL REFERENCES stream_polls(id),
        option_text TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_poll_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL REFERENCES stream_polls(id),
        option_id INTEGER NOT NULL REFERENCES stream_poll_options(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (poll_id, user_id)
      )
    `);

    // Stream milestones ("if we reach 100 viewers..."). reached_at is
    // snapshotted once the live viewer count crosses goal_value and
    // never recomputed afterward, same reasoning as bop_winners — a
    // milestone that was hit shouldn't un-hit itself if viewers dip.
    // deal_id optionally links to a real Deal to reveal when reached.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        goal_value INTEGER NOT NULL,
        reward_description TEXT NOT NULL,
        deal_id INTEGER REFERENCES deals(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        reached_at TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stream_milestones_stream ON stream_milestones(stream_id)`);

    // Flash drops: a time-boxed on-screen offer during a stream. Claiming
    // one grants either a Pueblo Passport stamp or a real Deal claim —
    // see claimStreamFlashDrop, which calls straight into those existing
    // systems rather than reimplementing them.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_flash_drops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        type TEXT NOT NULL CHECK (type IN ('passport_stamp', 'deal')),
        deal_id INTEGER REFERENCES deals(id),
        label TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        starts_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stream_flash_drops_stream ON stream_flash_drops(stream_id, expires_at)`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_flash_drop_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        drop_id INTEGER NOT NULL REFERENCES stream_flash_drops(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (drop_id, user_id)
      )
    `);

    // Live Q&A queue — viewers submit questions, other viewers upvote
    // them (one vote per viewer per question, toggleable), and the
    // host works through them in rough priority order.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_qa_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        author_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'dismissed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        answered_at TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stream_qa_questions_stream ON stream_qa_questions(stream_id, status)`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_qa_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL REFERENCES stream_qa_questions(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (question_id, user_id)
      )
    `);

    // Pueblo Booth Spotlight — a viewer asks to be brought on/featured
    // during the stream; the host works the request queue and marks
    // who's been spotlighted. Deliberately separate from the
    // standalone "Pueblo Booth" Q&A-of-the-week feature (booth_questions
    // /booth_answers) — this is a live, per-stream request, not that.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_spotlight_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'spotlighted', 'dismissed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stream_spotlight_requests_stream ON stream_spotlight_requests(stream_id, status)`);

    // Featured local sponsors — a host (or admin) tags an existing
    // Business as a sponsor/partner of this stream, shown as a real
    // business card (not a fake uploaded sponsor logo).
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_sponsors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (stream_id, business_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stream_sponsors_stream ON stream_sponsors(stream_id)`);

    // Highlight clips — a labeled timestamp into the stream's own VOD,
    // for the replay carousel. No clip is actually cut or re-hosted;
    // it's a deep link into the host's own YouTube/Vimeo replay (see
    // toEmbedSrc's startSeconds) — honest about what this app can and
    // can't do with someone else's video.
    db.exec(`
      CREATE TABLE IF NOT EXISTS stream_clips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL REFERENCES streams(id),
        label TEXT NOT NULL,
        timestamp_seconds INTEGER NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_stream_clips_stream ON stream_clips(stream_id)`);

    // Report & Track — 1-tap neighborhood issue reports (street light
    // outages, dumped items, park maintenance, traffic hazards).
    // latitude/longitude are optional and reuse the same columns/math as
    // findNearbyUsers (see geo.ts) — a report a member submits with
    // their current location becomes a real point other members can
    // search "near me", not a decorative map pin.
    db.exec(`
      CREATE TABLE IF NOT EXISTS neighborhood_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id INTEGER NOT NULL REFERENCES users(id),
        category TEXT NOT NULL CHECK (category IN ('street_light', 'dumped_item', 'park_maintenance', 'traffic_hazard', 'other')),
        description TEXT NOT NULL,
        photo_url TEXT,
        location_text TEXT,
        latitude REAL,
        longitude REAL,
        status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'acknowledged', 'in_progress', 'resolved', 'closed')),
        resolution_note TEXT,
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_neighborhood_reports_status ON neighborhood_reports(status, created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_neighborhood_reports_lat_lng ON neighborhood_reports(latitude, longitude)`);

    // "Track" = follow a report for status-change notifications (real
    // emails via the existing queued_emails worker — there's no mobile
    // push infrastructure in this app, so this is the honest version of
    // "real-time local push notifications").
    db.exec(`
      CREATE TABLE IF NOT EXISTS neighborhood_report_followers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL REFERENCES neighborhood_reports(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (report_id, user_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_neighborhood_report_followers_report ON neighborhood_report_followers(report_id)`);

    // ---------------------------------------------------------------
    // In-app notifications feed (the bell icon in Header.tsx / the
    // /notifications page) — previously 100% hardcoded sample content
    // ("bob frank liked your post"). This is the real, in-app version of
    // what friend_request/friend_accepted/new_message/post_like/
    // post_comment already trigger as emails elsewhere — this table is
    // populated alongside those same real events (see createNotification
    // call sites), not instead of the emails.
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        actor_id INTEGER REFERENCES users(id),
        kind TEXT NOT NULL CHECK (kind IN ('friend_request', 'friend_accepted', 'new_message', 'post_like', 'post_comment')),
        ref_type TEXT,
        ref_id INTEGER,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at)`);

    // Contact Us form submissions (see src/app/(site)/contact/ContactForm.tsx
    // and /api/contact) — previously the form just set local state and told
    // the person it wasn't wired to anything. user_id is nullable because
    // the contact form works for a signed-out visitor too.
    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company TEXT,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at)`);

    global.__pueblo_db__ = db;
  }
  return global.__pueblo_db__;
}

export type AccountStatus = "active" | "suspended" | "deleted";

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
  bio: string | null;
  cover_photo_path: string | null;
};

export type PublicUser = Omit<User, "password_hash">;

const PUBLIC_USER_COLUMNS =
  "id, username, email, role, created_at, first_name, last_name, city, " +
  "profile_photo_path, email_verified_at, account_status, updated_at, " +
  "last_login_at, session_version, marketing_emails_opt_in, " +
  "latitude, longitude, location_city, location_region, location_country, " +
  "location_source, location_updated_at, bio, cover_photo_path";

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

// Backs the real "Edit Profile" form — the first/last name, city, and
// avatar fields a member can change about their own public profile
// (username/email aren't editable here; those have their own
// verification/uniqueness concerns and are out of scope for this
// feature). profilePhotoPath is left alone when the caller passes
// `undefined` (no new photo submitted) and cleared when `null` is passed
// explicitly (member removed their photo).
// bio and coverPhotoPath follow the same omit/null/string convention as
// profilePhotoPath: left alone when `undefined`, cleared when `null`,
// replaced when a string is passed.
export function updateUserProfile(
  userId: number,
  fields: {
    firstName: string | null;
    lastName: string | null;
    city: string | null;
    profilePhotoPath?: string | null;
    bio?: string | null;
    coverPhotoPath?: string | null;
  }
): PublicUser | undefined {
  const db = getDb();
  const setClauses = ["first_name = ?", "last_name = ?", "city = ?"];
  const params: (string | number | null)[] = [fields.firstName, fields.lastName, fields.city];
  if (fields.profilePhotoPath !== undefined) {
    setClauses.push("profile_photo_path = ?");
    params.push(fields.profilePhotoPath);
  }
  if (fields.bio !== undefined) {
    setClauses.push("bio = ?");
    params.push(fields.bio);
  }
  if (fields.coverPhotoPath !== undefined) {
    setClauses.push("cover_photo_path = ?");
    params.push(fields.coverPhotoPath);
  }
  setClauses.push("updated_at = datetime('now')");
  params.push(userId);
  db.prepare(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`).run(...params);
  return getUserById(userId);
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
  image_path: string | null;
  video_path: string | null;
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
    p.id, p.author_id, p.body, p.image_path, p.video_path, p.target_type, p.target_id, p.created_at,
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
  targetId: number | null = null,
  imagePath: string | null = null,
  videoPath: string | null = null
): PostWithAuthor {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO posts (author_id, body, target_type, target_id, image_path, video_path) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(authorId, body, targetType, targetId, imagePath, videoPath);
  const postId = Number(info.lastInsertRowid);
  awardPoints(authorId, "post", `post:${postId}`, POINT_VALUES.post);
  return getPostById(postId, authorId)!;
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
export type PostCursor = { createdAt: string; id: number };

function postCursorSql(before: PostCursor | null): { sql: string; params: (string | number)[] } {
  return before
    ? { sql: "AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))", params: [before.createdAt, before.createdAt, before.id] }
    : { sql: "", params: [] };
}

export function listPosts(
  viewerId: number | null,
  targetType: TargetType = "feed",
  targetId: number | null = null,
  limit = 30,
  before: PostCursor | null = null
): PostWithAuthor[] {
  const db = getDb();
  const targetClause =
    targetId === null ? "p.target_type = ? AND p.target_id IS NULL" : "p.target_type = ? AND p.target_id = ?";
  const params: (string | number)[] =
    targetId === null ? [viewerId ?? 0, targetType] : [viewerId ?? 0, targetType, targetId];
  const cur = postCursorSql(before);
  return db
    .prepare(
      `${POST_SELECT} WHERE p.deleted_at IS NULL AND ${targetClause} ${cur.sql} ORDER BY p.created_at DESC, p.id DESC LIMIT ?`
    )
    .all(...params, ...cur.params, limit) as PostWithAuthor[];
}

// The global newsfeed: every member post, wherever it was made (the main
// feed, a profile wall, a group, a business page or an event page), newest
// first. Posts made outside the plain feed carry a label + link for where
// they were posted, so the feed can show "in <Group name>".
export type FeedPost = PostWithAuthor & {
  posted_in_label: string | null;
  posted_in_href: string | null;
};

export function listFeedPosts(
  viewerId: number | null,
  limit = 30,
  // Keyset cursor: only posts older than this (created_at, id) pair, so
  // "load more" never skips or repeats posts even when new ones arrive.
  before: { createdAt: string; id: number } | null = null
): FeedPost[] {
  const db = getDb();
  const beforeClause = before ? "AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))" : "";
  const beforeParams = before ? [before.createdAt, before.createdAt, before.id] : [];
  return db
    .prepare(
      `SELECT
         p.id, p.author_id, p.body, p.image_path, p.video_path, p.target_type, p.target_id, p.created_at,
         u.username AS author_username,
         u.first_name AS author_first_name,
         u.last_name AS author_last_name,
         u.profile_photo_path AS author_profile_photo_path,
         (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
         (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id AND pc.deleted_at IS NULL) AS comment_count,
         (SELECT COUNT(*) FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) AS liked_by_viewer,
         CASE p.target_type WHEN 'group' THEN g.name WHEN 'business' THEN b.name WHEN 'event' THEN e.title END AS posted_in_label,
         CASE p.target_type WHEN 'group' THEN '/groups/' || g.slug WHEN 'business' THEN '/businesses/' || b.slug WHEN 'event' THEN '/events/' || e.slug END AS posted_in_href
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN groups g ON p.target_type = 'group' AND g.id = p.target_id
       LEFT JOIN businesses b ON p.target_type = 'business' AND b.id = p.target_id
       LEFT JOIN events e ON p.target_type = 'event' AND e.id = p.target_id
       WHERE p.deleted_at IS NULL ${beforeClause}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`
    )
    .all(viewerId ?? 0, ...beforeParams, limit) as FeedPost[];
}

// Used by the profile/timeline page — a member's own posts across every
// target (feed, and later group/business/event posts they made), newest
// first.
export function listPostsByAuthor(
  viewerId: number | null,
  authorId: number,
  limit = 30,
  before: PostCursor | null = null
): PostWithAuthor[] {
  const db = getDb();
  const cur = postCursorSql(before);
  return db
    .prepare(
      `${POST_SELECT} WHERE p.deleted_at IS NULL AND p.author_id = ? ${cur.sql} ORDER BY p.created_at DESC, p.id DESC LIMIT ?`
    )
    .all(viewerId ?? 0, authorId, ...cur.params, limit) as PostWithAuthor[];
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

function friendRequestSelect(viewerIdRaw: number): string {
  const viewerId = Math.trunc(Number(viewerIdRaw)); // always an integer — interpolated below
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

export type QueuedEmailKind = "friend_request" | "friend_accepted" | "new_message" | "report_status_update";

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
  checkStreamMilestones(streamId);
  return sessionId;
}

const STREAM_WATCH_SECONDS_FOR_POINTS = 15 * 60;

export type StreamWatchProgress = {
  elapsedSeconds: number;
  thresholdSeconds: number;
  pointsUnlocked: boolean;
  pointsValue: number;
};

// Also the watch-to-earn + milestone-checking hook: every heartbeat
// (every ~30s while the page is open) re-evaluates both, since there's
// no separate background job in this app — the same "checked when
// something happens" pattern as bumpPeakViewerCount itself.
// A viewer-session id alone isn't enough to act on it: it must belong to
// the stream in the URL, and a session that belongs to a member can only
// be driven by that member. (Anonymous sessions have no owner, but also
// never earn points.)
export function canUseViewerSession(sessionId: number, streamId: number, callerId: number | null): boolean {
  const row = getDb()
    .prepare("SELECT stream_id, user_id FROM stream_viewer_sessions WHERE id = ?")
    .get(sessionId) as { stream_id: number; user_id: number | null } | undefined;
  if (!row || row.stream_id !== streamId) return false;
  if (row.user_id !== null && row.user_id !== callerId) return false;
  return true;
}

export function heartbeatStreamViewer(sessionId: number): StreamWatchProgress | null {
  const db = getDb();
  db.prepare(
    "UPDATE stream_viewer_sessions SET last_heartbeat_at = datetime('now') WHERE id = ? AND left_at IS NULL"
  ).run(sessionId);
  const session = db
    .prepare("SELECT stream_id, user_id, joined_at FROM stream_viewer_sessions WHERE id = ?")
    .get(sessionId) as { stream_id: number; user_id: number | null; joined_at: string } | undefined;
  if (!session) return null;

  bumpPeakViewerCount(session.stream_id);
  checkStreamMilestones(session.stream_id);

  const elapsedRow = db
    .prepare(`SELECT CAST((julianday('now') - julianday(?)) * 86400 AS INTEGER) AS secs`)
    .get(session.joined_at) as { secs: number };
  const elapsedSeconds = Math.max(0, elapsedRow.secs);
  const pointsUnlocked = elapsedSeconds >= STREAM_WATCH_SECONDS_FOR_POINTS;

  // Idempotent (ON CONFLICT DO NOTHING in awardPoints), so it's safe to
  // call this on every heartbeat once the threshold is crossed rather
  // than tracking "did we already award this" separately.
  if (session.user_id && pointsUnlocked) {
    awardPoints(session.user_id, "stream_watch", `stream:${session.stream_id}`, POINT_VALUES.stream_watch);
  }

  return {
    elapsedSeconds,
    thresholdSeconds: STREAM_WATCH_SECONDS_FOR_POINTS,
    pointsUnlocked,
    pointsValue: POINT_VALUES.stream_watch,
  };
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

export function setBusinessImage(businessId: number, kind: "logo" | "cover", path: string | null): void {
  const col = kind === "logo" ? "logo_path" : "cover_photo_path"; // fixed whitelist, never user input
  getDb().prepare(`UPDATE businesses SET ${col} = ? WHERE id = ?`).run(path, businessId);
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
  awardPoints(userId, "follow_business", `business:${businessId}`, POINT_VALUES.follow_business);
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
  awardPoints(userId, "business_review", `business:${businessId}`, POINT_VALUES.business_review);
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

// ---------------------------------------------------------------------
// Pueblo Events + Check-In. RSVP ("going"/"interested"), a real
// attendance check-in separate from RSVP, and an event wall (reusing the
// posts table, target_type='event' — same pattern as groups/businesses).

export type Event = {
  id: number;
  creator_id: number;
  business_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  location_text: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_photo_path: string | null;
  created_at: string;
};

export type EventWithMeta = Event & {
  creator_username: string;
  business_name: string | null;
  business_slug: string | null;
  going_count: number;
  interested_count: number;
  checkin_count: number;
  post_count: number;
};

const EVENT_SELECT = `
  SELECT
    e.id, e.creator_id, e.business_id, e.title, e.slug, e.description,
    e.location_text, e.starts_at, e.ends_at, e.cover_photo_path, e.created_at,
    u.username AS creator_username,
    b.name AS business_name,
    b.slug AS business_slug,
    (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS going_count,
    (SELECT COUNT(*) FROM event_rsvps r2 WHERE r2.event_id = e.id AND r2.status = 'interested') AS interested_count,
    (SELECT COUNT(*) FROM event_checkins c WHERE c.event_id = e.id) AS checkin_count,
    (SELECT COUNT(*) FROM posts p WHERE p.target_type = 'event' AND p.target_id = e.id AND p.deleted_at IS NULL) AS post_count
  FROM events e
  JOIN users u ON u.id = e.creator_id
  LEFT JOIN businesses b ON b.id = e.business_id
`;

function eventSlugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "event";
}

function uniqueEventSlug(db: DatabaseSync, name: string): string {
  const base = eventSlugify(name);
  let candidate = base;
  let n = 2;
  while (db.prepare("SELECT id FROM events WHERE slug = ?").get(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export function createEvent(
  creatorId: number,
  title: string,
  description: string | null,
  locationText: string | null,
  startsAt: string,
  endsAt: string | null,
  businessId: number | null = null
): EventWithMeta {
  const db = getDb();
  const slug = uniqueEventSlug(db, title);
  const info = db
    .prepare(
      `INSERT INTO events (creator_id, business_id, title, slug, description, location_text, starts_at, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(creatorId, businessId, title, slug, description, locationText, startsAt, endsAt);
  return getEventById(Number(info.lastInsertRowid))!;
}

export function getEventById(id: number): EventWithMeta | undefined {
  const db = getDb();
  return db.prepare(`${EVENT_SELECT} WHERE e.id = ?`).get(id) as EventWithMeta | undefined;
}

export function getEventBySlug(slug: string): EventWithMeta | undefined {
  const db = getDb();
  return db.prepare(`${EVENT_SELECT} WHERE e.slug = ?`).get(slug) as EventWithMeta | undefined;
}

// Upcoming by default (starts_at in the future or today), soonest first —
// past events sort newest-first instead, for a "what already happened"
// view.
export function listEvents(when: "upcoming" | "past" = "upcoming", limit = 50): EventWithMeta[] {
  const db = getDb();
  if (when === "past") {
    return db
      .prepare(`${EVENT_SELECT} WHERE e.starts_at < datetime('now') ORDER BY e.starts_at DESC LIMIT ?`)
      .all(limit) as EventWithMeta[];
  }
  return db
    .prepare(`${EVENT_SELECT} WHERE e.starts_at >= datetime('now') ORDER BY e.starts_at ASC LIMIT ?`)
    .all(limit) as EventWithMeta[];
}

// Events that start at or after an ISO timestamp (UTC), soonest first.
// event.starts_at is stored as an ISO string, so ISO-vs-ISO comparison is
// correct here (unlike comparing against datetime('now')).
export function listEventsStartingAfter(isoUtc: string, limit = 100): EventWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${EVENT_SELECT} WHERE e.starts_at >= ? ORDER BY e.starts_at ASC LIMIT ?`)
    .all(isoUtc, limit) as EventWithMeta[];
}

export function listEventsForBusiness(businessId: number): EventWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${EVENT_SELECT} WHERE e.business_id = ? ORDER BY e.starts_at DESC`)
    .all(businessId) as EventWithMeta[];
}

// Events a user created or RSVP'd to, soonest-first — for a "my events"
// list, mirroring listGroupsForUser/listBusinessesFollowedByUser.
export function listEventsForUser(userId: number): EventWithMeta[] {
  const db = getDb();
  return db
    .prepare(
      `${EVENT_SELECT}
       WHERE e.creator_id = ? OR e.id IN (SELECT event_id FROM event_rsvps WHERE user_id = ?)
       ORDER BY e.starts_at ASC`
    )
    .all(userId, userId) as EventWithMeta[];
}

export function isEventCreator(eventId: number, userId: number): boolean {
  const db = getDb();
  const row = db.prepare("SELECT id FROM events WHERE id = ? AND creator_id = ?").get(eventId, userId);
  return Boolean(row);
}

// Upsert: changing your RSVP (going <-> interested) replaces the
// existing row rather than adding a second, same upsert pattern as
// upsertBusinessReview.
export function rsvpToEvent(eventId: number, userId: number, status: "going" | "interested"): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO event_rsvps (event_id, user_id, status) VALUES (?, ?, ?)
     ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status`
  ).run(eventId, userId, status);
  awardPoints(userId, "event_rsvp", `event:${eventId}`, POINT_VALUES.event_rsvp);
}

export function cancelRsvp(eventId: number, userId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?").run(eventId, userId);
}

export function getRsvpStatus(eventId: number, userId: number): "going" | "interested" | null {
  const db = getDb();
  const row = db
    .prepare("SELECT status FROM event_rsvps WHERE event_id = ? AND user_id = ?")
    .get(eventId, userId) as { status: "going" | "interested" } | undefined;
  return row?.status ?? null;
}

export type EventAttendee = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
  status: "going" | "interested";
};

export function listEventAttendees(eventId: number, limit = 100): EventAttendee[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT u.id AS user_id, u.username, u.first_name, u.last_name, u.profile_photo_path, r.status
       FROM event_rsvps r
       JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ?
       ORDER BY (r.status = 'going') DESC, r.created_at ASC
       LIMIT ?`
    )
    .all(eventId, limit) as EventAttendee[];
}

// Idempotent — checking in twice just confirms the first check-in's
// timestamp rather than erroring, same spirit as joinGroup/followBusiness.
export function checkInToEvent(eventId: number, userId: number): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM event_checkins WHERE event_id = ? AND user_id = ?")
    .get(eventId, userId);
  if (existing) return;
  db.prepare("INSERT INTO event_checkins (event_id, user_id) VALUES (?, ?)").run(eventId, userId);
  awardPoints(userId, "event_checkin", `event:${eventId}`, POINT_VALUES.event_checkin);
}

export function isCheckedIn(eventId: number, userId: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM event_checkins WHERE event_id = ? AND user_id = ?")
    .get(eventId, userId);
  return Boolean(row);
}

export type EventCheckin = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
  checked_in_at: string;
};

export function listEventCheckins(eventId: number, limit = 100): EventCheckin[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT u.id AS user_id, u.username, u.first_name, u.last_name, u.profile_photo_path, c.checked_in_at
       FROM event_checkins c
       JOIN users u ON u.id = c.user_id
       WHERE c.event_id = ?
       ORDER BY c.checked_in_at ASC
       LIMIT ?`
    )
    .all(eventId, limit) as EventCheckin[];
}

// ---------------------------------------------------------------------
// Pueblo Deals + Flash Deals. A deal belongs to a business channel;
// "active" means not deactivated, started (starts_at <= now), and not
// expired (expires_at IS NULL OR expires_at > now). Claiming tracks who
// redeemed it — real foot traffic a business can see, not just a static
// coupon anyone could screenshot and reuse indefinitely elsewhere.

export type DealType = "standard" | "flash";

export type Deal = {
  id: number;
  business_id: number;
  title: string;
  description: string | null;
  discount_text: string;
  type: DealType;
  starts_at: string;
  expires_at: string | null;
  featured: number;
  created_at: string;
  deactivated_at: string | null;
};

export type DealWithMeta = Deal & {
  business_name: string;
  business_slug: string;
  claim_count: number;
  is_active: number;
};

const DEAL_SELECT = `
  SELECT
    d.id, d.business_id, d.title, d.description, d.discount_text, d.type,
    d.starts_at, d.expires_at, d.featured, d.created_at, d.deactivated_at,
    b.name AS business_name, b.slug AS business_slug,
    (SELECT COUNT(*) FROM deal_claims dc WHERE dc.deal_id = d.id) AS claim_count,
    (CASE
       WHEN d.deactivated_at IS NOT NULL THEN 0
       WHEN d.starts_at > datetime('now') THEN 0
       WHEN d.expires_at IS NOT NULL AND d.expires_at <= datetime('now') THEN 0
       ELSE 1
     END) AS is_active
  FROM deals d
  JOIN businesses b ON b.id = d.business_id
`;

export function createDeal(
  businessId: number,
  title: string,
  description: string | null,
  discountText: string,
  type: DealType,
  expiresAt: string | null,
  featured = false
): DealWithMeta {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO deals (business_id, title, description, discount_text, type, expires_at, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(businessId, title, description, discountText, type, expiresAt, featured ? 1 : 0);
  return getDealById(Number(info.lastInsertRowid))!;
}

export function getDealById(id: number): DealWithMeta | undefined {
  const db = getDb();
  return db.prepare(`${DEAL_SELECT} WHERE d.id = ?`).get(id) as DealWithMeta | undefined;
}

export function listActiveDealsForBusiness(businessId: number): DealWithMeta[] {
  const db = getDb();
  return (db.prepare(`${DEAL_SELECT} WHERE d.business_id = ? ORDER BY d.created_at DESC`).all(
    businessId
  ) as DealWithMeta[]).filter((d) => d.is_active);
}

export function listAllDealsForBusiness(businessId: number): DealWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${DEAL_SELECT} WHERE d.business_id = ? ORDER BY d.created_at DESC`)
    .all(businessId) as DealWithMeta[];
}

// Site-wide active deals, flash deals first (soonest-expiring first, so
// a member sees the most urgent ones), then standard deals newest first.
export function listActiveDeals(limit = 50): DealWithMeta[] {
  const db = getDb();
  const rows = db
    .prepare(
      `${DEAL_SELECT}
       WHERE d.deactivated_at IS NULL
         AND d.starts_at <= datetime('now')
         AND (d.expires_at IS NULL OR d.expires_at > datetime('now'))
       ORDER BY (d.type = 'flash') DESC,
                CASE WHEN d.type = 'flash' THEN d.expires_at ELSE NULL END ASC,
                d.created_at DESC
       LIMIT ?`
    )
    .all(limit) as DealWithMeta[];
  return rows;
}

// The homepage "Deal of the Day" — the most recently created active
// deal marked `featured`, falling back to the most recently created
// active deal overall so the homepage isn't empty just because no one
// has explicitly featured anything yet.
export function getFeaturedDeal(): DealWithMeta | undefined {
  const db = getDb();
  const featured = db
    .prepare(
      `${DEAL_SELECT}
       WHERE d.featured = 1 AND d.deactivated_at IS NULL
         AND d.starts_at <= datetime('now')
         AND (d.expires_at IS NULL OR d.expires_at > datetime('now'))
       ORDER BY d.created_at DESC
       LIMIT 1`
    )
    .get() as DealWithMeta | undefined;
  if (featured) return featured;
  return db
    .prepare(
      `${DEAL_SELECT}
       WHERE d.deactivated_at IS NULL
         AND d.starts_at <= datetime('now')
         AND (d.expires_at IS NULL OR d.expires_at > datetime('now'))
       ORDER BY d.created_at DESC
       LIMIT 1`
    )
    .get() as DealWithMeta | undefined;
}

// Ends a deal early (e.g. a flash deal's stock ran out before its
// timer did). Owner-checked by the API layer, not here.
export function deactivateDeal(dealId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE deals SET deactivated_at = datetime('now') WHERE id = ? AND deactivated_at IS NULL"
  ).run(dealId);
}

// Idempotent — claiming twice just confirms the same claim, same
// pattern as checkInToEvent/followBusiness.
export function claimDeal(dealId: number, userId: number): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM deal_claims WHERE deal_id = ? AND user_id = ?")
    .get(dealId, userId);
  if (existing) return;
  db.prepare("INSERT INTO deal_claims (deal_id, user_id) VALUES (?, ?)").run(dealId, userId);
  awardPoints(userId, "deal_claim", `deal:${dealId}`, POINT_VALUES.deal_claim);
}

export function hasClaimedDeal(dealId: number, userId: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM deal_claims WHERE deal_id = ? AND user_id = ?")
    .get(dealId, userId);
  return Boolean(row);
}

export type DealClaimWithUser = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  claimed_at: string;
};

// Who claimed a deal — lets a business owner honor it in person (a
// claim is a real record, not a reusable screenshot).
export function listDealClaims(dealId: number, limit = 200): DealClaimWithUser[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT u.id AS user_id, u.username, u.first_name, u.last_name, dc.claimed_at
       FROM deal_claims dc
       JOIN users u ON u.id = dc.user_id
       WHERE dc.deal_id = ?
       ORDER BY dc.claimed_at ASC
       LIMIT ?`
    )
    .all(dealId, limit) as DealClaimWithUser[];
}

// ---------------------------------------------------------------------
// Best of the Pueblo. Admin-managed categories + voting periods; one
// vote per member per category per period (changeable while the period
// is open); winners snapshotted into bop_winners when an admin closes
// the period, so they're frozen in time rather than recomputed live.

export type BopCategory = {
  id: number;
  name: string;
  slug: string;
  created_at: string;
};

function bopCategorySlugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "category";
}

export function createBopCategory(name: string): BopCategory {
  const db = getDb();
  const base = bopCategorySlugify(name);
  let slug = base;
  let n = 2;
  while (db.prepare("SELECT id FROM bop_categories WHERE slug = ?").get(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  const info = db
    .prepare("INSERT INTO bop_categories (name, slug) VALUES (?, ?)")
    .run(name, slug);
  return db.prepare("SELECT * FROM bop_categories WHERE id = ?").get(Number(info.lastInsertRowid)) as BopCategory;
}

export function listBopCategories(): BopCategory[] {
  const db = getDb();
  return db.prepare("SELECT * FROM bop_categories ORDER BY name ASC").all() as BopCategory[];
}

export function getBopCategoryById(id: number): BopCategory | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM bop_categories WHERE id = ?").get(id) as BopCategory | undefined;
}

export type BopVotingPeriod = {
  id: number;
  label: string;
  starts_at: string;
  ends_at: string | null;
  closed_at: string | null;
  created_at: string;
};

export type BopVotingPeriodWithMeta = BopVotingPeriod & { is_open: number };

const BOP_PERIOD_SELECT = `
  SELECT
    p.id, p.label, p.starts_at, p.ends_at, p.closed_at, p.created_at,
    (CASE
       WHEN p.closed_at IS NOT NULL THEN 0
       WHEN p.starts_at > datetime('now') THEN 0
       WHEN p.ends_at IS NOT NULL AND p.ends_at <= datetime('now') THEN 0
       ELSE 1
     END) AS is_open
  FROM bop_voting_periods p
`;

export function createBopVotingPeriod(
  label: string,
  startsAt: string | null,
  endsAt: string | null
): BopVotingPeriodWithMeta {
  const db = getDb();
  const info = startsAt
    ? db
        .prepare("INSERT INTO bop_voting_periods (label, starts_at, ends_at) VALUES (?, ?, ?)")
        .run(label, startsAt, endsAt)
    : db
        .prepare("INSERT INTO bop_voting_periods (label, ends_at) VALUES (?, ?)")
        .run(label, endsAt);
  return getBopVotingPeriodById(Number(info.lastInsertRowid))!;
}

export function getBopVotingPeriodById(id: number): BopVotingPeriodWithMeta | undefined {
  const db = getDb();
  return db.prepare(`${BOP_PERIOD_SELECT} WHERE p.id = ?`).get(id) as BopVotingPeriodWithMeta | undefined;
}

export function listBopVotingPeriods(): BopVotingPeriodWithMeta[] {
  const db = getDb();
  return db.prepare(`${BOP_PERIOD_SELECT} ORDER BY p.starts_at DESC`).all() as BopVotingPeriodWithMeta[];
}

// The most recently-started period that's currently open, if any — the
// one members vote in by default.
export function getCurrentBopVotingPeriod(): BopVotingPeriodWithMeta | undefined {
  const db = getDb();
  return db
    .prepare(
      `${BOP_PERIOD_SELECT}
       WHERE p.closed_at IS NULL
         AND p.starts_at <= datetime('now')
         AND (p.ends_at IS NULL OR p.ends_at > datetime('now'))
       ORDER BY p.starts_at DESC
       LIMIT 1`
    )
    .get() as BopVotingPeriodWithMeta | undefined;
}

// Upsert: changing your vote for a category replaces the previous one
// rather than adding a second — same pattern as rsvpToEvent.
export function castBopVote(
  periodId: number,
  categoryId: number,
  voterId: number,
  businessId: number
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO bop_votes (period_id, category_id, voter_id, business_id) VALUES (?, ?, ?, ?)
     ON CONFLICT(period_id, category_id, voter_id) DO UPDATE SET business_id = excluded.business_id`
  ).run(periodId, categoryId, voterId, businessId);
  awardPoints(voterId, "bop_vote", `bop:${periodId}:${categoryId}`, POINT_VALUES.bop_vote);
}

export function getBopUserVote(
  periodId: number,
  categoryId: number,
  voterId: number
): number | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT business_id FROM bop_votes WHERE period_id = ? AND category_id = ? AND voter_id = ?"
    )
    .get(periodId, categoryId, voterId) as { business_id: number } | undefined;
  return row?.business_id ?? null;
}

export type BopTallyRow = {
  business_id: number;
  business_name: string;
  business_slug: string;
  vote_count: number;
};

// Live vote tally for a category in a period, highest first — used both
// for an in-progress period's running count and to compute the winner
// when a period closes.
export function getBopCategoryTally(periodId: number, categoryId: number): BopTallyRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT b.id AS business_id, b.name AS business_name, b.slug AS business_slug,
              COUNT(*) AS vote_count
       FROM bop_votes v
       JOIN businesses b ON b.id = v.business_id
       WHERE v.period_id = ? AND v.category_id = ?
       GROUP BY b.id
       ORDER BY vote_count DESC, b.name ASC`
    )
    .all(periodId, categoryId) as BopTallyRow[];
}

export type BopWinner = {
  id: number;
  period_id: number;
  category_id: number;
  business_id: number;
  vote_count: number;
  decided_at: string;
};

export type BopWinnerWithMeta = BopWinner & {
  period_label: string;
  category_name: string;
  category_slug: string;
  business_name: string;
  business_slug: string;
};

const BOP_WINNER_SELECT = `
  SELECT
    w.id, w.period_id, w.category_id, w.business_id, w.vote_count, w.decided_at,
    p.label AS period_label,
    c.name AS category_name, c.slug AS category_slug,
    b.name AS business_name, b.slug AS business_slug
  FROM bop_winners w
  JOIN bop_voting_periods p ON p.id = w.period_id
  JOIN bop_categories c ON c.id = w.category_id
  JOIN businesses b ON b.id = w.business_id
`;

// Closes a voting period: for every category that received at least one
// vote in this period, snapshots the top business as that category's
// winner (ties broken by business name, same as getBopCategoryTally's
// own tiebreak), then marks the period closed so it can't be voted in
// or re-finalized again. Returns the winners just decided.
export function closeBopVotingPeriod(periodId: number): BopWinnerWithMeta[] {
  const db = getDb();
  const period = getBopVotingPeriodById(periodId);
  if (!period || period.closed_at) return [];

  const categoriesVotedIn = db
    .prepare("SELECT DISTINCT category_id FROM bop_votes WHERE period_id = ?")
    .all(periodId) as { category_id: number }[];

  for (const { category_id } of categoriesVotedIn) {
    const tally = getBopCategoryTally(periodId, category_id);
    if (tally.length === 0) continue;
    const winner = tally[0];
    db.prepare(
      `INSERT INTO bop_winners (period_id, category_id, business_id, vote_count)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(period_id, category_id) DO UPDATE SET
         business_id = excluded.business_id, vote_count = excluded.vote_count`
    ).run(periodId, category_id, winner.business_id, winner.vote_count);
  }

  db.prepare("UPDATE bop_voting_periods SET closed_at = datetime('now') WHERE id = ?").run(periodId);

  return db
    .prepare(`${BOP_WINNER_SELECT} WHERE w.period_id = ? ORDER BY c.name ASC`)
    .all(periodId) as BopWinnerWithMeta[];
}

export function listBopWinnersForPeriod(periodId: number): BopWinnerWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${BOP_WINNER_SELECT} WHERE w.period_id = ? ORDER BY c.name ASC`)
    .all(periodId) as BopWinnerWithMeta[];
}

// Every category a business has ever won, most recent first — for a
// "Best of the Pueblo" badge list on that business's channel page.
export function listBopWinsForBusiness(businessId: number): BopWinnerWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${BOP_WINNER_SELECT} WHERE w.business_id = ? ORDER BY w.decided_at DESC`)
    .all(businessId) as BopWinnerWithMeta[];
}

export function listAllBopWinners(limit = 100): BopWinnerWithMeta[] {
  const db = getDb();
  return db
    .prepare(`${BOP_WINNER_SELECT} ORDER BY w.decided_at DESC LIMIT ?`)
    .all(limit) as BopWinnerWithMeta[];
}

// ---------------------------------------------------------------------
// Pueblo Street Team. Member-submitted photos/videos go into a pending
// queue; an admin approves or rejects each one before it's shown
// publicly (never auto-published — see createStreetTeamSubmission).
// Contributor badges are computed from a member's approved-submission
// counts, not stored, so the thresholds can change without a migration.

export type StreetTeamMediaType = "photo" | "video";
export type StreetTeamStatus = "pending" | "approved" | "rejected";

export type StreetTeamSubmission = {
  id: number;
  submitter_id: number;
  media_type: StreetTeamMediaType;
  media_url: string;
  caption: string | null;
  location_text: string | null;
  status: StreetTeamStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type StreetTeamSubmissionWithUser = StreetTeamSubmission & {
  submitter_username: string;
  submitter_first_name: string | null;
  submitter_last_name: string | null;
};

const STREET_TEAM_SELECT = `
  SELECT
    s.id, s.submitter_id, s.media_type, s.media_url, s.caption, s.location_text,
    s.status, s.reviewed_by, s.reviewed_at, s.review_note, s.created_at,
    u.username AS submitter_username, u.first_name AS submitter_first_name,
    u.last_name AS submitter_last_name
  FROM street_team_submissions s
  JOIN users u ON u.id = s.submitter_id
`;

// Always lands as 'pending' — never auto-published; see admin review
// functions below.
export function createStreetTeamSubmission(
  submitterId: number,
  mediaType: StreetTeamMediaType,
  mediaUrl: string,
  caption: string | null,
  locationText: string | null
): StreetTeamSubmissionWithUser {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO street_team_submissions (submitter_id, media_type, media_url, caption, location_text)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(submitterId, mediaType, mediaUrl, caption, locationText);
  return getStreetTeamSubmissionById(Number(info.lastInsertRowid))!;
}

export function getStreetTeamSubmissionById(id: number): StreetTeamSubmissionWithUser | undefined {
  const db = getDb();
  return db.prepare(`${STREET_TEAM_SELECT} WHERE s.id = ?`).get(id) as
    | StreetTeamSubmissionWithUser
    | undefined;
}

export function listStreetTeamSubmissionsByStatus(
  status: StreetTeamStatus,
  limit = 100
): StreetTeamSubmissionWithUser[] {
  const db = getDb();
  return db
    .prepare(`${STREET_TEAM_SELECT} WHERE s.status = ? ORDER BY s.created_at ASC LIMIT ?`)
    .all(status, limit) as StreetTeamSubmissionWithUser[];
}

// Approved submissions, newest first — the public gallery.
export function listApprovedStreetTeamSubmissions(limit = 50): StreetTeamSubmissionWithUser[] {
  const db = getDb();
  return db
    .prepare(`${STREET_TEAM_SELECT} WHERE s.status = 'approved' ORDER BY s.reviewed_at DESC LIMIT ?`)
    .all(limit) as StreetTeamSubmissionWithUser[];
}

export function listStreetTeamSubmissionsByUser(userId: number): StreetTeamSubmissionWithUser[] {
  const db = getDb();
  return db
    .prepare(`${STREET_TEAM_SELECT} WHERE s.submitter_id = ? ORDER BY s.created_at DESC`)
    .all(userId) as StreetTeamSubmissionWithUser[];
}

// Approve/reject are only valid from 'pending' — re-reviewing an
// already-decided submission is a no-op rather than silently flipping a
// settled decision.
export function reviewStreetTeamSubmission(
  submissionId: number,
  reviewerId: number,
  decision: "approved" | "rejected",
  note: string | null
): void {
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE street_team_submissions
       SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), review_note = ?
       WHERE id = ? AND status = 'pending'`
    )
    .run(decision, reviewerId, note, submissionId);

  // Only award points when the row actually transitioned (i.e. it was
  // still pending) and the decision was 'approved' — a rejected
  // submission, or re-reviewing an already-decided one, earns nothing.
  if (info.changes > 0 && decision === "approved") {
    const submission = getStreetTeamSubmissionById(submissionId);
    if (submission) {
      awardPoints(
        submission.submitter_id,
        "street_team_approved",
        `streetteam:${submissionId}`,
        POINT_VALUES.street_team_approved
      );
    }
  }
}

export type StreetTeamBadge = "community_correspondent" | "pueblo_photographer" | "pueblo_reporter";

const STREET_TEAM_BADGE_LABELS: Record<StreetTeamBadge, string> = {
  community_correspondent: "Community Correspondent",
  pueblo_photographer: "Pueblo Photographer",
  pueblo_reporter: "Pueblo Reporter",
};

export function streetTeamBadgeLabel(badge: StreetTeamBadge): string {
  return STREET_TEAM_BADGE_LABELS[badge];
}

// Computed from approved-submission counts, not stored: Community
// Correspondent at 1+ approved submission of any type, Pueblo
// Photographer at 5+ approved photos, Pueblo Reporter at 5+ approved
// videos. A member can hold more than one.
export function getStreetTeamBadgesForUser(userId: number): StreetTeamBadge[] {
  const db = getDb();
  const counts = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN media_type = 'photo' THEN 1 ELSE 0 END) AS photos,
         SUM(CASE WHEN media_type = 'video' THEN 1 ELSE 0 END) AS videos
       FROM street_team_submissions
       WHERE submitter_id = ? AND status = 'approved'`
    )
    .get(userId) as { total: number; photos: number; videos: number };

  const badges: StreetTeamBadge[] = [];
  if (counts.total >= 1) badges.push("community_correspondent");
  if (counts.photos >= 5) badges.push("pueblo_photographer");
  if (counts.videos >= 5) badges.push("pueblo_reporter");
  return badges;
}

// ---------------------------------------------------------------------
// The Pueblo Booth: a weekly community question. Members answer with
// text, or a video/audio link (same honest no-upload-pipeline pattern
// as Street Team — a link the member hosts elsewhere). One answer per
// member per question, editable while the question stays open — an
// upsert, same shape as business reviews.

export type BoothAnswerType = "text" | "video" | "audio";

export type BoothQuestion = {
  id: number;
  question_text: string;
  created_by: number;
  opens_at: string;
  closes_at: string | null;
  is_open: 0 | 1;
  answer_count: number;
  created_at: string;
};

export type BoothAnswer = {
  id: number;
  question_id: number;
  user_id: number;
  answer_type: BoothAnswerType;
  answer_text: string | null;
  media_url: string | null;
  created_at: string;
  updated_at: string;
};

export type BoothAnswerWithUser = BoothAnswer & {
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
};

// is_open computed at SELECT time against SQLite's own clock, same
// reasoning as deals.is_active and bop_voting_periods.is_open — never a
// JS Date, so it can't drift from what the database itself considers
// "now".
const BOOTH_QUESTION_SELECT = `
  SELECT
    q.id, q.question_text, q.created_by, q.opens_at, q.closes_at, q.created_at,
    CASE
      WHEN q.opens_at <= datetime('now')
       AND (q.closes_at IS NULL OR q.closes_at > datetime('now'))
      THEN 1 ELSE 0
    END AS is_open,
    (SELECT COUNT(*) FROM booth_answers a WHERE a.question_id = q.id) AS answer_count
  FROM booth_questions q
`;

export function createBoothQuestion(
  createdBy: number,
  questionText: string,
  opensAt: string | null,
  closesAt: string | null
): BoothQuestion {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO booth_questions (question_text, created_by, opens_at, closes_at)
       VALUES (?, ?, COALESCE(?, datetime('now')), ?)`
    )
    .run(questionText, createdBy, opensAt, closesAt);
  return getBoothQuestionById(Number(info.lastInsertRowid))!;
}

export function getBoothQuestionById(id: number): BoothQuestion | undefined {
  const db = getDb();
  return db.prepare(`${BOOTH_QUESTION_SELECT} WHERE q.id = ?`).get(id) as BoothQuestion | undefined;
}

export function listBoothQuestions(limit = 50): BoothQuestion[] {
  const db = getDb();
  return db
    .prepare(`${BOOTH_QUESTION_SELECT} ORDER BY q.opens_at DESC LIMIT ?`)
    .all(limit) as BoothQuestion[];
}

// The question members currently see on /booth — the most recently
// opened question that is still open. Falls back to the most recent
// question overall (closed or not) so the page has something to show
// even between questions, mirroring getFeaturedDeal's fallback.
export function getCurrentBoothQuestion(): BoothQuestion | undefined {
  const db = getDb();
  const open = db
    .prepare(`${BOOTH_QUESTION_SELECT} WHERE is_open = 1 ORDER BY q.opens_at DESC LIMIT 1`)
    .get() as BoothQuestion | undefined;
  if (open) return open;
  return db
    .prepare(`${BOOTH_QUESTION_SELECT} ORDER BY q.opens_at DESC LIMIT 1`)
    .get() as BoothQuestion | undefined;
}

// Admin-only manual close, for a question opened without a closes_at.
export function closeBoothQuestion(questionId: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE booth_questions SET closes_at = datetime('now') WHERE id = ? AND closes_at IS NULL`
  ).run(questionId);
}

const BOOTH_ANSWER_SELECT = `
  SELECT
    a.id, a.question_id, a.user_id, a.answer_type, a.answer_text, a.media_url,
    a.created_at, a.updated_at,
    u.username, u.first_name, u.last_name, u.profile_photo_path
  FROM booth_answers a
  JOIN users u ON u.id = a.user_id
`;

// One answer per member per question — resubmitting while the question
// is still open replaces the previous answer rather than adding a
// second row. Callers are responsible for checking the question is
// still open before calling this (see the API route).
export function submitBoothAnswer(
  questionId: number,
  userId: number,
  answerType: BoothAnswerType,
  answerText: string | null,
  mediaUrl: string | null
): BoothAnswerWithUser {
  const db = getDb();
  db.prepare(
    `INSERT INTO booth_answers (question_id, user_id, answer_type, answer_text, media_url, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(question_id, user_id) DO UPDATE SET
       answer_type = excluded.answer_type,
       answer_text = excluded.answer_text,
       media_url = excluded.media_url,
       updated_at = datetime('now')`
  ).run(questionId, userId, answerType, answerText, mediaUrl);
  awardPoints(userId, "booth_answer", `booth:${questionId}`, POINT_VALUES.booth_answer);
  return getUserBoothAnswer(questionId, userId)!;
}

export function getUserBoothAnswer(questionId: number, userId: number): BoothAnswerWithUser | undefined {
  const db = getDb();
  return db
    .prepare(`${BOOTH_ANSWER_SELECT} WHERE a.question_id = ? AND a.user_id = ?`)
    .get(questionId, userId) as BoothAnswerWithUser | undefined;
}

export function listBoothAnswersForQuestion(questionId: number, limit = 100): BoothAnswerWithUser[] {
  const db = getDb();
  return db
    .prepare(`${BOOTH_ANSWER_SELECT} WHERE a.question_id = ? ORDER BY a.created_at ASC LIMIT ?`)
    .all(questionId, limit) as BoothAnswerWithUser[];
}

// ---------------------------------------------------------------------
// Pueblo Passport. Stamps are granted idempotently via a check-then-
// insert (not relying solely on the UNIQUE index above, since SQLite
// treats NULL ref_id values as always-distinct — the explicit check
// here is what actually keeps a null-ref category like 'explore_3d' to
// one stamp per member).

export type PassportCategory = "business" | "event" | "pueblo_live" | "explore_3d" | "daily_pueblo";

export type PassportStamp = {
  id: number;
  user_id: number;
  category: PassportCategory;
  ref_id: number | null;
  label: string;
  created_at: string;
};

function findPassportStamp(userId: number, category: PassportCategory, refId: number | null): PassportStamp | undefined {
  const db = getDb();
  if (refId === null) {
    return db
      .prepare(
        `SELECT * FROM passport_stamps WHERE user_id = ? AND category = ? AND ref_id IS NULL`
      )
      .get(userId, category) as PassportStamp | undefined;
  }
  return db
    .prepare(`SELECT * FROM passport_stamps WHERE user_id = ? AND category = ? AND ref_id = ?`)
    .get(userId, category, refId) as PassportStamp | undefined;
}

// Idempotent: granting the same (user, category, ref) stamp twice is a
// no-op — the first grant stands, including its original label.
export function grantPassportStamp(
  userId: number,
  category: PassportCategory,
  refId: number | null,
  label: string
): PassportStamp {
  const existing = findPassportStamp(userId, category, refId);
  if (existing) return existing;

  const db = getDb();
  const info = db
    .prepare(`INSERT INTO passport_stamps (user_id, category, ref_id, label) VALUES (?, ?, ?, ?)`)
    .run(userId, category, refId, label);
  awardPoints(userId, "passport_stamp", `passport:${category}:${refId ?? "x"}`, POINT_VALUES.passport_stamp);
  return findPassportStamp(userId, category, refId) ?? {
    id: Number(info.lastInsertRowid),
    user_id: userId,
    category,
    ref_id: refId,
    label,
    created_at: new Date().toISOString(),
  };
}

export function listPassportStampsForUser(userId: number): PassportStamp[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM passport_stamps WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId) as PassportStamp[];
}

export function countPassportStampsForUser(userId: number): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM passport_stamps WHERE user_id = ?`)
    .get(userId) as { n: number };
  return row.n;
}

export type PassportReward = {
  key: string;
  label: string;
  threshold: number;
  unlocked: boolean;
};

// Reward tiers, computed from a member's total stamp count — not
// stored, same reasoning as Street Team's badge thresholds: no
// migration needed to retune them later.
const PASSPORT_REWARD_TIERS: { key: string; label: string; threshold: number }[] = [
  { key: "explorer", label: "Pueblo Explorer", threshold: 3 },
  { key: "insider", label: "Pueblo Insider", threshold: 8 },
  { key: "legend", label: "Pueblo Legend", threshold: 15 },
];

export function getPassportRewardsForUser(userId: number): PassportReward[] {
  const count = countPassportStampsForUser(userId);
  return PASSPORT_REWARD_TIERS.map((tier) => ({
    ...tier,
    unlocked: count >= tier.threshold,
  }));
}

// ---------------------------------------------------------------------
// Pueblo Rewards: the points engine every other feature feeds. Each
// action awards points exactly once per distinct ref_key — see the
// awardPoints call sites throughout this file (createPost,
// followBusiness, upsertBusinessReview, rsvpToEvent, checkInToEvent,
// claimDeal, castBopVote, submitBoothAnswer, reviewStreetTeamSubmission,
// grantPassportStamp). Levels are computed from total points, not
// stored, same reasoning as every other threshold-based reward in this
// app (Street Team badges, Passport rewards).

export const POINT_VALUES = {
  post: 2,
  follow_business: 3,
  business_review: 10,
  event_rsvp: 3,
  event_checkin: 5,
  deal_claim: 3,
  bop_vote: 5,
  booth_answer: 5,
  street_team_approved: 15,
  passport_stamp: 5,
  stream_watch: 10,
  stream_flash_drop: 5,
  treasure_drop: 5, // default; a treasure drop awards its own admin-set points
} as const;

export type RewardsAction = keyof typeof POINT_VALUES;

export type RewardsPointEvent = {
  id: number;
  user_id: number;
  action: RewardsAction;
  ref_key: string;
  points: number;
  created_at: string;
};

// ON CONFLICT DO NOTHING rather than a check-then-insert: ref_key is
// always a non-null string here, so the UNIQUE index alone is enough
// to make this idempotent — the same action on the same thing never
// awards twice.
export function awardPoints(userId: number, action: RewardsAction, refKey: string, points: number): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO rewards_point_events (user_id, action, ref_key, points)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, action, ref_key) DO NOTHING`
  ).run(userId, action, refKey, points);
}

export function getTotalPointsForUser(userId: number): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COALESCE(SUM(points), 0) AS total FROM rewards_point_events WHERE user_id = ?`)
    .get(userId) as { total: number };
  return row.total;
}

export function listPointEventsForUser(userId: number, limit = 100): RewardsPointEvent[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM rewards_point_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit) as RewardsPointEvent[];
}

export type RewardsLeaderboardRow = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  total_points: number;
};

// Site-wide leaderboard — top members by total points. Ties broken by
// who crossed that total first (MIN(created_at) of their most recent
// contributing event isn't tracked; ordering by user_id as a stable
// tiebreaker is good enough for a leaderboard, not a competition prize).
export function listRewardsLeaderboard(limit = 20): RewardsLeaderboardRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT u.id AS user_id, u.username, u.first_name, u.last_name,
              COALESCE(SUM(r.points), 0) AS total_points
       FROM users u
       JOIN rewards_point_events r ON r.user_id = u.id
       GROUP BY u.id
       ORDER BY total_points DESC, u.id ASC
       LIMIT ?`
    )
    .all(limit) as RewardsLeaderboardRow[];
}

export type RewardsLevel = {
  key: string;
  label: string;
  threshold: number;
  unlocked: boolean;
};

const REWARDS_LEVEL_TIERS: { key: string; label: string; threshold: number }[] = [
  { key: "newcomer", label: "Newcomer", threshold: 0 },
  { key: "regular", label: "Pueblo Regular", threshold: 50 },
  { key: "champion", label: "Pueblo Champion", threshold: 150 },
  { key: "legend", label: "Pueblo Legend", threshold: 400 },
];

export function getRewardsLevelsForUser(userId: number): RewardsLevel[] {
  const total = getTotalPointsForUser(userId);
  return REWARDS_LEVEL_TIERS.map((tier) => ({ ...tier, unlocked: total >= tier.threshold }));
}

// The highest unlocked tier — what to show as "your level" on the
// Rewards page and anywhere else a single label is wanted.
export function getCurrentRewardsLevel(userId: number): RewardsLevel {
  const levels = getRewardsLevelsForUser(userId);
  const unlocked = levels.filter((l) => l.unlocked);
  return unlocked[unlocked.length - 1] ?? levels[0];
}

// Human-readable label for each rewards action — shared by the
// /api/rewards route and the /rewards page itself (a Server Component
// that reads point history directly rather than through its own API).
export const REWARDS_ACTION_LABELS: Record<RewardsAction, string> = {
  post: "Posted on a wall",
  follow_business: "Followed a business",
  business_review: "Left a business review",
  event_rsvp: "RSVP'd to an event",
  event_checkin: "Checked into an event",
  deal_claim: "Claimed a deal",
  bop_vote: "Voted in Best of the Pueblo",
  booth_answer: "Answered The Pueblo Booth",
  street_team_approved: "Street Team submission approved",
  passport_stamp: "Earned a Pueblo Passport stamp",
  stream_watch: "Watched a Pueblo Live stream",
  stream_flash_drop: "Claimed a Pueblo Live flash drop",
  treasure_drop: "Found a treasure drop in the 3D Pueblo",
};

// ---------------------------------------------------------------------
// Pueblo Live engagement + gamification functions.

// ---- Floating emoji reactions -----------------------------------------

export type StreamReactionEmoji = "heart" | "fire" | "clap" | "laugh" | "wow";

export type StreamReaction = {
  id: number;
  stream_id: number;
  user_id: number;
  emoji: StreamReactionEmoji;
  created_at: string;
};

// No idempotency here on purpose — a reaction is a quick, repeatable
// tap (tapping 🔥 five times sends five floating hearts), unlike every
// other action in this file that's "once per thing."
export function addStreamReaction(streamId: number, userId: number, emoji: StreamReactionEmoji): StreamReaction {
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO stream_reactions (stream_id, user_id, emoji) VALUES (?, ?, ?)`)
    .run(streamId, userId, emoji);
  return db
    .prepare(`SELECT * FROM stream_reactions WHERE id = ?`)
    .get(Number(info.lastInsertRowid)) as StreamReaction;
}

// Polled by the client (same spirit as chat) — pass the last reaction id
// you've already shown and get only what's new, so reactions can float
// up the player without re-rendering ones already shown.
export function listStreamReactionsSince(streamId: number, sinceId: number, limit = 100): StreamReaction[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM stream_reactions WHERE stream_id = ? AND id > ? ORDER BY id ASC LIMIT ?`
    )
    .all(streamId, sinceId, limit) as StreamReaction[];
}

export function getLatestStreamReactionId(streamId: number): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COALESCE(MAX(id), 0) AS id FROM stream_reactions WHERE stream_id = ?`)
    .get(streamId) as { id: number };
  return row.id;
}

// ---- Pinned announcements ----------------------------------------------

export type StreamAnnouncement = {
  id: number;
  stream_id: number;
  body: string;
  created_by: number;
  created_at: string;
  unpinned_at: string | null;
};

// Pinning a new announcement unpins whatever was pinned before — only
// one at a time, same reasoning as a single "current" BOP winner.
export function pinStreamAnnouncement(streamId: number, userId: number, body: string): StreamAnnouncement {
  const db = getDb();
  db.prepare(
    `UPDATE stream_announcements SET unpinned_at = datetime('now') WHERE stream_id = ? AND unpinned_at IS NULL`
  ).run(streamId);
  const info = db
    .prepare(`INSERT INTO stream_announcements (stream_id, body, created_by) VALUES (?, ?, ?)`)
    .run(streamId, body, userId);
  return db
    .prepare(`SELECT * FROM stream_announcements WHERE id = ?`)
    .get(Number(info.lastInsertRowid)) as StreamAnnouncement;
}

export function unpinStreamAnnouncement(streamId: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE stream_announcements SET unpinned_at = datetime('now') WHERE stream_id = ? AND unpinned_at IS NULL`
  ).run(streamId);
}

export function getPinnedStreamAnnouncement(streamId: number): StreamAnnouncement | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM stream_announcements WHERE stream_id = ? AND unpinned_at IS NULL ORDER BY created_at DESC LIMIT 1`
    )
    .get(streamId) as StreamAnnouncement | undefined;
}

// ---- Live polls ----------------------------------------------------------

export type StreamPoll = {
  id: number;
  stream_id: number;
  question: string;
  created_by: number;
  created_at: string;
  closed_at: string | null;
};

export type StreamPollOption = {
  id: number;
  poll_id: number;
  option_text: string;
  display_order: number;
  vote_count: number;
};

// Opening a new poll closes whatever was open before — same one-at-a-
// time pinned-slot reasoning as announcements.
export function createStreamPoll(streamId: number, userId: number, question: string, options: string[]): StreamPoll {
  const db = getDb();
  db.prepare(`UPDATE stream_polls SET closed_at = datetime('now') WHERE stream_id = ? AND closed_at IS NULL`).run(
    streamId
  );
  const info = db
    .prepare(`INSERT INTO stream_polls (stream_id, question, created_by) VALUES (?, ?, ?)`)
    .run(streamId, question, userId);
  const pollId = Number(info.lastInsertRowid);
  const insertOption = db.prepare(
    `INSERT INTO stream_poll_options (poll_id, option_text, display_order) VALUES (?, ?, ?)`
  );
  options.forEach((text, i) => insertOption.run(pollId, text, i));
  return getStreamPollById(pollId)!;
}

export function getStreamPollById(pollId: number): StreamPoll | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM stream_polls WHERE id = ?`).get(pollId) as StreamPoll | undefined;
}

export function getCurrentStreamPoll(streamId: number): StreamPoll | undefined {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM stream_polls WHERE stream_id = ? AND closed_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .get(streamId) as StreamPoll | undefined;
}

export function listStreamPollOptions(pollId: number): StreamPollOption[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT o.id, o.poll_id, o.option_text, o.display_order,
              (SELECT COUNT(*) FROM stream_poll_votes v WHERE v.option_id = o.id) AS vote_count
       FROM stream_poll_options o
       WHERE o.poll_id = ?
       ORDER BY o.display_order ASC`
    )
    .all(pollId) as StreamPollOption[];
}

// Upsert: changing your vote replaces the previous one, same pattern as
// castBopVote.
export function castStreamPollVote(pollId: number, optionId: number, userId: number): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO stream_poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)
     ON CONFLICT(poll_id, user_id) DO UPDATE SET option_id = excluded.option_id`
  ).run(pollId, optionId, userId);
}

export function getStreamPollUserVote(pollId: number, userId: number): number | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT option_id FROM stream_poll_votes WHERE poll_id = ? AND user_id = ?`)
    .get(pollId, userId) as { option_id: number } | undefined;
  return row?.option_id ?? null;
}

export function closeStreamPoll(pollId: number): void {
  const db = getDb();
  db.prepare(`UPDATE stream_polls SET closed_at = datetime('now') WHERE id = ? AND closed_at IS NULL`).run(pollId);
}

// What to show in the pinned slot at the top of chat: an open poll
// takes priority over a plain announcement, since a poll is also an
// announcement but with something to do.
export type StreamPinnedItem =
  | { type: "poll"; poll: StreamPoll; options: StreamPollOption[] }
  | { type: "announcement"; announcement: StreamAnnouncement }
  | null;

export function getStreamPinnedItem(streamId: number): StreamPinnedItem {
  const poll = getCurrentStreamPoll(streamId);
  if (poll) return { type: "poll", poll, options: listStreamPollOptions(poll.id) };
  const announcement = getPinnedStreamAnnouncement(streamId);
  if (announcement) return { type: "announcement", announcement };
  return null;
}

// ---- Stream milestones ----------------------------------------------------

export type StreamMilestone = {
  id: number;
  stream_id: number;
  goal_value: number;
  reward_description: string;
  deal_id: number | null;
  created_by: number;
  created_at: string;
  reached_at: string | null;
};

export function createStreamMilestone(
  streamId: number,
  userId: number,
  goalValue: number,
  rewardDescription: string,
  dealId: number | null
): StreamMilestone {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO stream_milestones (stream_id, goal_value, reward_description, deal_id, created_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(streamId, goalValue, rewardDescription, dealId, userId);
  return getStreamMilestoneById(Number(info.lastInsertRowid))!;
}

export function getStreamMilestoneById(id: number): StreamMilestone | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM stream_milestones WHERE id = ?`).get(id) as StreamMilestone | undefined;
}

export function listStreamMilestones(streamId: number): StreamMilestone[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM stream_milestones WHERE stream_id = ? ORDER BY goal_value ASC`)
    .all(streamId) as StreamMilestone[];
}

// Snapshots reached_at for any not-yet-reached milestone whose goal the
// live viewer count now meets or exceeds. Called from
// heartbeatStreamViewer/joinStreamViewer, same "checked when something
// happens" pattern as bumpPeakViewerCount — there's no cron in this app.
export function checkStreamMilestones(streamId: number): StreamMilestone[] {
  const db = getDb();
  const current = getLiveViewerCount(streamId);
  const newlyReached = db
    .prepare(
      `SELECT * FROM stream_milestones WHERE stream_id = ? AND reached_at IS NULL AND goal_value <= ?`
    )
    .all(streamId, current) as StreamMilestone[];
  if (newlyReached.length > 0) {
    const ids = newlyReached.map((m) => m.id);
    db.prepare(
      `UPDATE stream_milestones SET reached_at = datetime('now') WHERE id IN (${ids.map(() => "?").join(",")})`
    ).run(...ids);
  }
  return newlyReached.map((m) => ({ ...m, reached_at: new Date().toISOString() }));
}

// ---- Flash drops ----------------------------------------------------------

export type StreamFlashDropType = "passport_stamp" | "deal";

export type StreamFlashDrop = {
  id: number;
  stream_id: number;
  type: StreamFlashDropType;
  deal_id: number | null;
  label: string;
  created_by: number;
  starts_at: string;
  expires_at: string;
};

export function createStreamFlashDrop(
  streamId: number,
  userId: number,
  type: StreamFlashDropType,
  dealId: number | null,
  label: string,
  durationSeconds: number
): StreamFlashDrop {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO stream_flash_drops (stream_id, type, deal_id, label, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '+' || ? || ' seconds'))`
    )
    .run(streamId, type, dealId, label, userId, durationSeconds);
  return getStreamFlashDropById(Number(info.lastInsertRowid))!;
}

export function getStreamFlashDropById(id: number): StreamFlashDrop | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM stream_flash_drops WHERE id = ?`).get(id) as StreamFlashDrop | undefined;
}

// The one flash drop currently visible on screen, if any.
export function getActiveStreamFlashDrop(streamId: number): StreamFlashDrop | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM stream_flash_drops
       WHERE stream_id = ? AND starts_at <= datetime('now') AND expires_at > datetime('now')
       ORDER BY id DESC LIMIT 1`
    )
    .get(streamId) as StreamFlashDrop | undefined;
}

export function hasClaimedStreamFlashDrop(dropId: number, userId: number): boolean {
  const db = getDb();
  const row = db
    .prepare(`SELECT id FROM stream_flash_drop_claims WHERE drop_id = ? AND user_id = ?`)
    .get(dropId, userId);
  return Boolean(row);
}

export function getStreamFlashDropClaimCount(dropId: number): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM stream_flash_drop_claims WHERE drop_id = ?`)
    .get(dropId) as { n: number };
  return row.n;
}

// Claiming routes straight into the real systems a drop promises —
// Passport stamps or a Deal claim — rather than reimplementing either.
// Idempotent (claiming twice is a no-op) and only honored while the
// drop is still within its window.
export function claimStreamFlashDrop(dropId: number, userId: number): { claimed: boolean; reason?: string } {
  const drop = getStreamFlashDropById(dropId);
  if (!drop) return { claimed: false, reason: "not_found" };

  const db = getDb();
  const now = db.prepare(`SELECT datetime('now') AS now`).get() as { now: string };
  if (now.now < drop.starts_at || now.now >= drop.expires_at) {
    return { claimed: false, reason: "expired" };
  }

  if (hasClaimedStreamFlashDrop(dropId, userId)) return { claimed: true };

  db.prepare(`INSERT INTO stream_flash_drop_claims (drop_id, user_id) VALUES (?, ?)`).run(dropId, userId);

  if (drop.type === "passport_stamp") {
    grantPassportStamp(userId, "pueblo_live", dropId, drop.label);
  } else if (drop.type === "deal" && drop.deal_id) {
    claimDeal(drop.deal_id, userId);
  }
  awardPoints(userId, "stream_flash_drop", `flashdrop:${dropId}`, POINT_VALUES.stream_flash_drop);

  return { claimed: true };
}

// ---- Live Q&A queue ---------------------------------------------------------

export type StreamQaQuestion = {
  id: number;
  stream_id: number;
  author_id: number;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_profile_photo_path: string | null;
  body: string;
  status: "open" | "answered" | "dismissed";
  created_at: string;
  answered_at: string | null;
  vote_count: number;
  voted_by_viewer: 0 | 1;
};

const MAX_OPEN_QA_PER_STREAM = 200;

function qaSelect(viewerIdRaw: number | null): string {
  const viewerId = viewerIdRaw === null ? null : Math.trunc(Number(viewerIdRaw)); // integer-only, interpolated below
  return `
    SELECT
      q.id, q.stream_id, q.author_id, q.body, q.status, q.created_at, q.answered_at,
      u.username AS author_username,
      u.first_name AS author_first_name,
      u.last_name AS author_last_name,
      u.profile_photo_path AS author_profile_photo_path,
      (SELECT COUNT(*) FROM stream_qa_votes v WHERE v.question_id = q.id) AS vote_count,
      ${viewerId === null ? "0" : `(SELECT COUNT(*) FROM stream_qa_votes v WHERE v.question_id = q.id AND v.user_id = ${viewerId})`} AS voted_by_viewer
    FROM stream_qa_questions q
    JOIN users u ON u.id = q.author_id
  `;
}

export function submitQaQuestion(streamId: number, authorId: number, body: string): StreamQaQuestion {
  const db = getDb();
  const openCount = db
    .prepare(`SELECT COUNT(*) AS n FROM stream_qa_questions WHERE stream_id = ? AND status = 'open'`)
    .get(streamId) as { n: number };
  if (openCount.n >= MAX_OPEN_QA_PER_STREAM) {
    throw new Error("The question queue is full right now — try again in a bit.");
  }
  const info = db
    .prepare(`INSERT INTO stream_qa_questions (stream_id, author_id, body) VALUES (?, ?, ?)`)
    .run(streamId, authorId, body);
  return db
    .prepare(`${qaSelect(authorId)} WHERE q.id = ?`)
    .get(Number(info.lastInsertRowid)) as StreamQaQuestion;
}

// Open questions first (by votes, then oldest first so ties don't
// reorder on a refresh), answered/dismissed after, most recent first.
export function listQaQuestions(streamId: number, viewerId: number | null): StreamQaQuestion[] {
  const db = getDb();
  return db
    .prepare(
      `${qaSelect(viewerId)}
       WHERE q.stream_id = ?
       ORDER BY
         CASE q.status WHEN 'open' THEN 0 ELSE 1 END,
         CASE WHEN q.status = 'open' THEN vote_count ELSE 0 END DESC,
         q.id ASC`
    )
    .all(streamId) as StreamQaQuestion[];
}

export function getQaQuestionById(questionId: number): StreamQaQuestion | undefined {
  const db = getDb();
  return db.prepare(`${qaSelect(null)} WHERE q.id = ?`).get(questionId) as StreamQaQuestion | undefined;
}

// Toggles: voting again removes the vote. Returns the new vote count.
export function toggleQaVote(questionId: number, userId: number): number {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM stream_qa_votes WHERE question_id = ? AND user_id = ?`)
    .get(questionId, userId);
  if (existing) {
    db.prepare(`DELETE FROM stream_qa_votes WHERE question_id = ? AND user_id = ?`).run(questionId, userId);
  } else {
    db.prepare(`INSERT INTO stream_qa_votes (question_id, user_id) VALUES (?, ?)`).run(questionId, userId);
  }
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM stream_qa_votes WHERE question_id = ?`)
    .get(questionId) as { n: number };
  return row.n;
}

export function resolveQaQuestion(questionId: number, status: "answered" | "dismissed"): boolean {
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE stream_qa_questions SET status = ?, answered_at = datetime('now') WHERE id = ? AND status = 'open'`
    )
    .run(status, questionId);
  return info.changes > 0;
}

// ---- Pueblo Booth Spotlight (live, per-stream guest requests) --------------

export type StreamSpotlightRequest = {
  id: number;
  stream_id: number;
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
  message: string | null;
  status: "pending" | "spotlighted" | "dismissed";
  created_at: string;
  resolved_at: string | null;
};

const SPOTLIGHT_SELECT = `
  SELECT
    r.id, r.stream_id, r.user_id, r.message, r.status, r.created_at, r.resolved_at,
    u.username, u.first_name, u.last_name, u.profile_photo_path
  FROM stream_spotlight_requests r
  JOIN users u ON u.id = r.user_id
`;

export function requestSpotlight(
  streamId: number,
  userId: number,
  message: string | null
): StreamSpotlightRequest {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM stream_spotlight_requests WHERE stream_id = ? AND user_id = ? AND status = 'pending'`
    )
    .get(streamId, userId);
  if (existing) {
    return db.prepare(`${SPOTLIGHT_SELECT} WHERE r.id = ?`).get((existing as { id: number }).id) as StreamSpotlightRequest;
  }
  const info = db
    .prepare(`INSERT INTO stream_spotlight_requests (stream_id, user_id, message) VALUES (?, ?, ?)`)
    .run(streamId, userId, message);
  return db
    .prepare(`${SPOTLIGHT_SELECT} WHERE r.id = ?`)
    .get(Number(info.lastInsertRowid)) as StreamSpotlightRequest;
}

export function listSpotlightRequests(streamId: number, status?: "pending" | "spotlighted" | "dismissed"): StreamSpotlightRequest[] {
  const db = getDb();
  if (status) {
    return db
      .prepare(`${SPOTLIGHT_SELECT} WHERE r.stream_id = ? AND r.status = ? ORDER BY r.id ASC`)
      .all(streamId, status) as StreamSpotlightRequest[];
  }
  return db
    .prepare(`${SPOTLIGHT_SELECT} WHERE r.stream_id = ? ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.id ASC`)
    .all(streamId) as StreamSpotlightRequest[];
}

export function resolveSpotlightRequest(requestId: number, status: "spotlighted" | "dismissed"): boolean {
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE stream_spotlight_requests SET status = ?, resolved_at = datetime('now') WHERE id = ? AND status = 'pending'`
    )
    .run(status, requestId);
  return info.changes > 0;
}

// ---- Featured sponsors -------------------------------------------------

export type StreamSponsor = {
  id: number;
  stream_id: number;
  business_id: number;
  business_name: string;
  business_slug: string;
  business_category: string;
  business_logo_path: string | null;
  created_at: string;
};

const STREAM_SPONSOR_SELECT = `
  SELECT
    sp.id, sp.stream_id, sp.business_id, sp.created_at,
    b.name AS business_name, b.slug AS business_slug,
    b.category AS business_category, b.logo_path AS business_logo_path
  FROM stream_sponsors sp
  JOIN businesses b ON b.id = sp.business_id
`;

export function addStreamSponsor(streamId: number, businessId: number, createdBy: number): StreamSponsor {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM stream_sponsors WHERE stream_id = ? AND business_id = ?`)
    .get(streamId, businessId);
  if (existing) {
    return db.prepare(`${STREAM_SPONSOR_SELECT} WHERE sp.id = ?`).get((existing as { id: number }).id) as StreamSponsor;
  }
  const info = db
    .prepare(`INSERT INTO stream_sponsors (stream_id, business_id, created_by) VALUES (?, ?, ?)`)
    .run(streamId, businessId, createdBy);
  return db
    .prepare(`${STREAM_SPONSOR_SELECT} WHERE sp.id = ?`)
    .get(Number(info.lastInsertRowid)) as StreamSponsor;
}

export function removeStreamSponsor(streamId: number, sponsorId: number): boolean {
  const db = getDb();
  const info = db
    .prepare(`DELETE FROM stream_sponsors WHERE id = ? AND stream_id = ?`)
    .run(sponsorId, streamId);
  return info.changes > 0;
}

export function listStreamSponsors(streamId: number): StreamSponsor[] {
  const db = getDb();
  return db
    .prepare(`${STREAM_SPONSOR_SELECT} WHERE sp.stream_id = ? ORDER BY sp.id ASC`)
    .all(streamId) as StreamSponsor[];
}

// ---- Highlight clips (replay carousel) -------------------------------------

export type StreamClip = {
  id: number;
  stream_id: number;
  label: string;
  timestamp_seconds: number;
  created_at: string;
};

export function createStreamClip(streamId: number, createdBy: number, label: string, timestampSeconds: number): StreamClip {
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO stream_clips (stream_id, label, timestamp_seconds, created_by) VALUES (?, ?, ?, ?)`)
    .run(streamId, label, timestampSeconds, createdBy);
  return db
    .prepare(`SELECT id, stream_id, label, timestamp_seconds, created_at FROM stream_clips WHERE id = ?`)
    .get(Number(info.lastInsertRowid)) as StreamClip;
}

export function listStreamClips(streamId: number): StreamClip[] {
  const db = getDb();
  return db
    .prepare(`SELECT id, stream_id, label, timestamp_seconds, created_at FROM stream_clips WHERE stream_id = ? ORDER BY timestamp_seconds ASC`)
    .all(streamId) as StreamClip[];
}

export function deleteStreamClip(streamId: number, clipId: number): boolean {
  const db = getDb();
  const info = db.prepare(`DELETE FROM stream_clips WHERE id = ? AND stream_id = ?`).run(clipId, streamId);
  return info.changes > 0;
}

// ---- Chat badges -----------------------------------------------------------

export type MemberBadge = { key: string; label: string };

// Surfaced next to a chat author's name — VIP (admin), Street Team
// contributor badges, and a Rewards level once it's above Newcomer.
// Pulls straight from the Street Team and Rewards systems already
// built rather than inventing a separate badge store.
export function getMemberBadgesForUser(userId: number): MemberBadge[] {
  const user = getUserById(userId);
  const badges: MemberBadge[] = [];
  if (user?.role === "admin") badges.push({ key: "admin", label: "Pueblo Connect Staff" });

  for (const b of getStreetTeamBadgesForUser(userId)) {
    badges.push({ key: `street_team_${b}`, label: streetTeamBadgeLabel(b) });
  }

  const level = getCurrentRewardsLevel(userId);
  if (level.key !== "newcomer") {
    badges.push({ key: `rewards_${level.key}`, label: level.label });
  }

  return badges;
}

// ---- Report & Track (neighborhood issue reports) ---------------------------

export type ReportCategory = "street_light" | "dumped_item" | "park_maintenance" | "traffic_hazard" | "other";
export type ReportStatus = "submitted" | "acknowledged" | "in_progress" | "resolved" | "closed";

export type NeighborhoodReport = {
  id: number;
  reporter_id: number;
  reporter_username: string;
  reporter_first_name: string | null;
  reporter_last_name: string | null;
  category: ReportCategory;
  description: string;
  photo_url: string | null;
  has_photo: 0 | 1;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ReportStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  follower_count: number;
};

// Full select, including the real photo_url — a quick-capture photo is
// stored as a data: URL in that TEXT column (no object storage in this
// app — see ReportSubmitForm), which can run tens to hundreds of KB.
// Fine for a single-row fetch (the detail page), but pulling that into
// every row of a browse/nearby list would bloat those payloads for no
// reason, so REPORT_LIST_SELECT below swaps in NULL and a cheap
// has_photo flag instead.
const REPORT_SELECT = `
  SELECT
    r.id, r.reporter_id, r.category, r.description, r.photo_url,
    CASE WHEN r.photo_url IS NOT NULL THEN 1 ELSE 0 END AS has_photo,
    r.location_text,
    r.latitude, r.longitude, r.status, r.resolution_note, r.resolved_at,
    r.created_at, r.updated_at,
    u.username AS reporter_username,
    u.first_name AS reporter_first_name,
    u.last_name AS reporter_last_name,
    (SELECT COUNT(*) FROM neighborhood_report_followers f WHERE f.report_id = r.id) AS follower_count
  FROM neighborhood_reports r
  JOIN users u ON u.id = r.reporter_id
`;

const REPORT_LIST_SELECT = `
  SELECT
    r.id, r.reporter_id, r.category, r.description, NULL AS photo_url,
    CASE WHEN r.photo_url IS NOT NULL THEN 1 ELSE 0 END AS has_photo,
    r.location_text,
    r.latitude, r.longitude, r.status, r.resolution_note, r.resolved_at,
    r.created_at, r.updated_at,
    u.username AS reporter_username,
    u.first_name AS reporter_first_name,
    u.last_name AS reporter_last_name,
    (SELECT COUNT(*) FROM neighborhood_report_followers f WHERE f.report_id = r.id) AS follower_count
  FROM neighborhood_reports r
  JOIN users u ON u.id = r.reporter_id
`;

export function createNeighborhoodReport(
  reporterId: number,
  input: {
    category: ReportCategory;
    description: string;
    photoUrl?: string | null;
    locationText?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }
): NeighborhoodReport {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO neighborhood_reports (reporter_id, category, description, photo_url, location_text, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      reporterId,
      input.category,
      input.description,
      input.photoUrl ?? null,
      input.locationText ?? null,
      input.latitude ?? null,
      input.longitude ?? null
    );
  // The reporter automatically tracks their own report.
  const reportId = Number(info.lastInsertRowid);
  db.prepare(
    `INSERT INTO neighborhood_report_followers (report_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING`
  ).run(reportId, reporterId);
  return db.prepare(`${REPORT_SELECT} WHERE r.id = ?`).get(reportId) as NeighborhoodReport;
}

export function getNeighborhoodReportById(id: number): NeighborhoodReport | undefined {
  const db = getDb();
  return db.prepare(`${REPORT_SELECT} WHERE r.id = ?`).get(id) as NeighborhoodReport | undefined;
}

export function listNeighborhoodReports(filters: {
  status?: ReportStatus;
  category?: ReportCategory;
  reporterId?: number;
  limit?: number;
}): NeighborhoodReport[] {
  const db = getDb();
  const clauses: string[] = [];
  const args: (string | number)[] = [];
  if (filters.status) {
    clauses.push("r.status = ?");
    args.push(filters.status);
  }
  if (filters.category) {
    clauses.push("r.category = ?");
    args.push(filters.category);
  }
  if (filters.reporterId) {
    clauses.push("r.reporter_id = ?");
    args.push(filters.reporterId);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(filters.limit ?? 50, 100);
  args.push(limit);
  return db
    .prepare(`${REPORT_LIST_SELECT} ${where} ORDER BY r.id DESC LIMIT ?`)
    .all(...args) as NeighborhoodReport[];
}

export type NearbyReport = NeighborhoodReport & { distance_miles: number };

// Same two-phase bounding-box-then-haversine pattern as
// findNearbyUsers above — a cheap SQL range filter first, exact
// distance second. Open reports only (not resolved/closed) — "what's
// happening on my block right now" is the point.
export function findNearbyNeighborhoodReports(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
  limit: number,
  box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  distanceFn: (lat1: number, lng1: number, lat2: number, lng2: number) => number
): NearbyReport[] {
  const db = getDb();
  const candidates = db
    .prepare(
      `${REPORT_LIST_SELECT}
       WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
         AND r.status NOT IN ('resolved', 'closed')
         AND r.latitude BETWEEN ? AND ?
         AND r.longitude BETWEEN ? AND ?`
    )
    .all(box.minLat, box.maxLat, box.minLng, box.maxLng) as NeighborhoodReport[];

  return candidates
    .map((r) => ({ ...r, distance_miles: distanceFn(centerLat, centerLng, r.latitude as number, r.longitude as number) }))
    .filter((r) => r.distance_miles <= radiusMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit);
}

// Status moves forward through a fixed lifecycle — never backward, so
// a report can't accidentally bounce from "resolved" back to
// "submitted" via a stale admin tab. Returns the updated report, or
// null if the transition wasn't valid.
const REPORT_STATUS_ORDER: ReportStatus[] = ["submitted", "acknowledged", "in_progress", "resolved", "closed"];

export function updateNeighborhoodReportStatus(
  reportId: number,
  newStatus: ReportStatus,
  resolvedBy: number,
  resolutionNote: string | null
): NeighborhoodReport | null {
  const db = getDb();
  const current = getNeighborhoodReportById(reportId);
  if (!current) return null;
  if (REPORT_STATUS_ORDER.indexOf(newStatus) <= REPORT_STATUS_ORDER.indexOf(current.status)) {
    return null;
  }
  const isResolving = newStatus === "resolved" || newStatus === "closed";
  db.prepare(
    `UPDATE neighborhood_reports
     SET status = ?, resolution_note = ?, updated_at = datetime('now'),
         resolved_by = CASE WHEN ? THEN ? ELSE resolved_by END,
         resolved_at = CASE WHEN ? THEN datetime('now') ELSE resolved_at END
     WHERE id = ?`
  ).run(newStatus, resolutionNote, isResolving ? 1 : 0, resolvedBy, isResolving ? 1 : 0, reportId);
  return getNeighborhoodReportById(reportId) ?? null;
}

export function toggleReportFollow(reportId: number, userId: number): boolean {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM neighborhood_report_followers WHERE report_id = ? AND user_id = ?`)
    .get(reportId, userId);
  if (existing) {
    db.prepare(`DELETE FROM neighborhood_report_followers WHERE report_id = ? AND user_id = ?`).run(reportId, userId);
    return false;
  }
  db.prepare(`INSERT INTO neighborhood_report_followers (report_id, user_id) VALUES (?, ?)`).run(reportId, userId);
  return true;
}

export function isFollowingReport(reportId: number, userId: number): boolean {
  const db = getDb();
  const row = db
    .prepare(`SELECT id FROM neighborhood_report_followers WHERE report_id = ? AND user_id = ?`)
    .get(reportId, userId);
  return Boolean(row);
}

export function listReportFollowerEmails(reportId: number, excludeUserId?: number): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT u.email FROM neighborhood_report_followers f
       JOIN users u ON u.id = f.user_id
       WHERE f.report_id = ? AND u.id != ?`
    )
    .all(reportId, excludeUserId ?? -1) as { email: string }[];
  return rows.map((r) => r.email);
}

// ---------------------------------------------------------------------
// In-app notifications (the Header.tsx bell + /notifications page).
// Created alongside the same real events that already enqueue a
// notification EMAIL (friend_request, friend_accepted, new_message — see
// their route handlers) plus two new in-app-only kinds (post_like,
// post_comment) that don't have an email counterpart. This table is
// additive to the email system, not a replacement for it.

export type NotificationKind = "friend_request" | "friend_accepted" | "new_message" | "post_like" | "post_comment";

export type Notification = {
  id: number;
  user_id: number;
  actor_id: number | null;
  kind: NotificationKind;
  ref_type: string | null;
  ref_id: number | null;
  read_at: string | null;
  created_at: string;
  actor_username: string | null;
  actor_first_name: string | null;
  actor_last_name: string | null;
  actor_profile_photo_path: string | null;
};

// userId is who the notification is FOR. Silently no-ops a self-notify
// (e.g. liking your own post) — never worth surfacing to yourself.
export function createNotification(
  userId: number,
  actorId: number | null,
  kind: NotificationKind,
  refType: string | null,
  refId: number | null
): void {
  if (actorId !== null && actorId === userId) return;
  const db = getDb();
  db.prepare(
    `INSERT INTO notifications (user_id, actor_id, kind, ref_type, ref_id) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, actorId, kind, refType, refId);
}

const NOTIFICATION_SELECT = `
  SELECT
    n.id, n.user_id, n.actor_id, n.kind, n.ref_type, n.ref_id, n.read_at, n.created_at,
    u.username AS actor_username, u.first_name AS actor_first_name,
    u.last_name AS actor_last_name, u.profile_photo_path AS actor_profile_photo_path
  FROM notifications n
  LEFT JOIN users u ON u.id = n.actor_id
`;

export function listNotifications(userId: number, limit = 30): Notification[] {
  const db = getDb();
  return db
    .prepare(`${NOTIFICATION_SELECT} WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`)
    .all(userId, limit) as Notification[];
}

export function countUnreadNotifications(userId: number): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL`)
    .get(userId) as { c: number };
  return row.c;
}

export function markAllNotificationsRead(userId: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL`
  ).run(userId);
}

// Dismissing one (the "X" in the notifications list) deletes it outright
// — there's no "unread but dismissed" state in this UI, same as the
// vendor template's own del-icon behavior this was ported from.
export function deleteNotification(notificationId: number, userId: number): boolean {
  const db = getDb();
  const info = db
    .prepare(`DELETE FROM notifications WHERE id = ? AND user_id = ?`)
    .run(notificationId, userId);
  return info.changes > 0;
}

// ---------------------------------------------------------------------
// Contact Us form (see contact_messages table above, src/app/api/contact,
// and src/app/(site)/contact/ContactForm.tsx)
// ---------------------------------------------------------------------

export type ContactMessage = {
  id: number;
  user_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  status: "new" | "read" | "replied" | "closed";
  created_at: string;
};

export function createContactMessage(fields: {
  userId: number | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
}): ContactMessage {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO contact_messages (user_id, name, email, phone, company, message)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(fields.userId, fields.name, fields.email, fields.phone, fields.company, fields.message);
  return db
    .prepare("SELECT * FROM contact_messages WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as ContactMessage;
}

// For a future admin "contact messages" inbox page — not built yet, but
// the data is real and queryable the moment it is.
export function listContactMessages(limit = 100): ContactMessage[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ?")
    .all(limit) as ContactMessage[];
}


// ---------------------------------------------------------------------------
// Stories (24-hour photo stories shown above the newsfeed)
// ---------------------------------------------------------------------------

export type StoryRow = {
  id: number;
  author_id: number;
  image_path: string;
  caption: string | null;
  created_at: string;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_profile_photo_path: string | null;
};

const STORY_SELECT = `
  SELECT s.id, s.author_id, s.image_path, s.caption, s.created_at,
         u.username AS author_username, u.first_name AS author_first_name,
         u.last_name AS author_last_name, u.profile_photo_path AS author_profile_photo_path
  FROM stories s JOIN users u ON u.id = s.author_id
`;

export function createStory(authorId: number, imagePath: string, caption: string | null): StoryRow {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO stories (author_id, image_path, caption) VALUES (?, ?, ?)")
    .run(authorId, imagePath, caption);
  return db.prepare(`${STORY_SELECT} WHERE s.id = ?`).get(Number(info.lastInsertRowid)) as StoryRow;
}

// Every story from the last 24 hours, oldest first (the order a viewer
// plays them in).
export function listActiveStories(): StoryRow[] {
  const db = getDb();
  return db
    .prepare(
      `${STORY_SELECT} WHERE s.deleted_at IS NULL AND s.created_at > datetime('now', '-24 hours')
       ORDER BY s.created_at ASC, s.id ASC`
    )
    .all() as StoryRow[];
}

export function getStoryById(id: number): StoryRow | undefined {
  const db = getDb();
  return db.prepare(`${STORY_SELECT} WHERE s.id = ? AND s.deleted_at IS NULL`).get(id) as StoryRow | undefined;
}

export function softDeleteStory(id: number): void {
  const db = getDb();
  db.prepare("UPDATE stories SET deleted_at = datetime('now') WHERE id = ?").run(id);
}


// ---------------------------------------------------------------------------
// Classifieds
// ---------------------------------------------------------------------------

export type ClassifiedRow = {
  id: number;
  author_id: number;
  category: string;
  title: string;
  body: string;
  price_text: string | null;
  image_path: string | null;
  status: "active" | "sold";
  created_at: string;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
};

const CLASSIFIED_SELECT = `
  SELECT c.id, c.author_id, c.category, c.title, c.body, c.price_text, c.image_path,
         c.status, c.created_at,
         u.username AS author_username, u.first_name AS author_first_name, u.last_name AS author_last_name
  FROM classifieds c JOIN users u ON u.id = c.author_id
`;

export function createClassified(
  authorId: number,
  category: string,
  title: string,
  body: string,
  priceText: string | null,
  imagePath: string | null
): ClassifiedRow {
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO classifieds (author_id, category, title, body, price_text, image_path) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(authorId, category, title, body, priceText, imagePath);
  return db.prepare(`${CLASSIFIED_SELECT} WHERE c.id = ?`).get(Number(info.lastInsertRowid)) as ClassifiedRow;
}

// Active (not deleted, under 30 days old) listings, newest first. Optional
// category filter and a simple title/body text search.
export function listClassifieds(
  opts: { category?: string | null; q?: string | null; limit?: number } = {}
): ClassifiedRow[] {
  const db = getDb();
  const where = ["c.deleted_at IS NULL", "c.created_at > datetime('now', '-30 days')"];
  const params: (string | number)[] = [];
  if (opts.category) {
    where.push("c.category = ?");
    params.push(opts.category);
  }
  if (opts.q && opts.q.trim()) {
    where.push("(c.title LIKE ? ESCAPE '\\' OR c.body LIKE ? ESCAPE '\\')");
    const like = `%${opts.q.trim().replace(/[\\%_]/g, (m) => "\\" + m)}%`;
    params.push(like, like);
  }
  return db
    .prepare(`${CLASSIFIED_SELECT} WHERE ${where.join(" AND ")} ORDER BY c.created_at DESC, c.id DESC LIMIT ?`)
    .all(...params, opts.limit ?? 60) as ClassifiedRow[];
}

export function getClassifiedById(id: number): (ClassifiedRow & { expired: boolean }) | undefined {
  const db = getDb();
  const row = db.prepare(`${CLASSIFIED_SELECT} WHERE c.id = ? AND c.deleted_at IS NULL`).get(id) as
    | ClassifiedRow
    | undefined;
  if (!row) return undefined;
  const expired = Date.now() - new Date(row.created_at.replace(" ", "T") + "Z").getTime() > 30 * 86400e3;
  return { ...row, expired };
}

export function setClassifiedStatus(id: number, status: "active" | "sold"): void {
  getDb().prepare("UPDATE classifieds SET status = ? WHERE id = ?").run(status, id);
}

export function softDeleteClassified(id: number): void {
  getDb().prepare("UPDATE classifieds SET deleted_at = datetime('now') WHERE id = ?").run(id);
}


// ---------------------------------------------------------------------------
// Business Spotlight
// ---------------------------------------------------------------------------

export type SpotlightRow = {
  id: number;
  slug: string;
  business_id: number | null;
  title: string;
  summary: string;
  owner_name: string | null;
  body: string;
  hero_image_path: string | null;
  sponsored: number;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
  business_name: string | null;
  business_slug: string | null;
};

const BIZ_SPOTLIGHT_SELECT = `
  SELECT sp.id, sp.slug, sp.business_id, sp.title, sp.summary, sp.owner_name, sp.body,
         sp.hero_image_path, sp.sponsored, sp.status, sp.published_at, sp.created_at, sp.updated_at,
         b.name AS business_name, b.slug AS business_slug
  FROM spotlights sp LEFT JOIN businesses b ON b.id = sp.business_id
`;

export type SpotlightInput = {
  businessId: number | null;
  title: string;
  summary: string;
  ownerName: string | null;
  body: string;
  heroImagePath?: string | null; // undefined = leave alone, null = clear, string = set (update only)
  sponsored: boolean;
  publish: boolean;
};

function uniqueSpotlightSlug(db: DatabaseSync, title: string): string {
  const base = slugify(title).slice(0, 60) || "spotlight";
  let candidate = base;
  let n = 2;
  while (db.prepare("SELECT id FROM spotlights WHERE slug = ?").get(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export function createSpotlight(input: SpotlightInput): SpotlightRow {
  const db = getDb();
  const slug = uniqueSpotlightSlug(db, input.title);
  const info = db
    .prepare(
      `INSERT INTO spotlights (slug, business_id, title, summary, owner_name, body, hero_image_path, sponsored, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${input.publish ? "datetime('now')" : "NULL"})`
    )
    .run(
      slug, input.businessId, input.title, input.summary, input.ownerName, input.body,
      input.heroImagePath ?? null, input.sponsored ? 1 : 0, input.publish ? "published" : "draft"
    );
  return getSpotlightById(Number(info.lastInsertRowid))!;
}

export function updateSpotlight(id: number, input: SpotlightInput): SpotlightRow | undefined {
  const db = getDb();
  const existing = getSpotlightById(id);
  if (!existing) return undefined;
  const heroPath = input.heroImagePath === undefined ? existing.hero_image_path : input.heroImagePath;
  // The first publish stamps published_at; later edits keep the original date.
  const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");
  const publishedAt = input.publish ? existing.published_at ?? nowSql : existing.published_at;
  db.prepare(
    `UPDATE spotlights SET business_id = ?, title = ?, summary = ?, owner_name = ?, body = ?,
       hero_image_path = ?, sponsored = ?, status = ?, published_at = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.businessId, input.title, input.summary, input.ownerName, input.body,
    heroPath, input.sponsored ? 1 : 0, input.publish ? "published" : "draft", publishedAt, id
  );
  return getSpotlightById(id);
}

export function getSpotlightById(id: number): SpotlightRow | undefined {
  return getDb().prepare(`${BIZ_SPOTLIGHT_SELECT} WHERE sp.id = ? AND sp.deleted_at IS NULL`).get(id) as
    | SpotlightRow
    | undefined;
}

// Public read: published only.
export function getPublishedSpotlightBySlug(slug: string): SpotlightRow | undefined {
  return getDb()
    .prepare(`${BIZ_SPOTLIGHT_SELECT} WHERE sp.slug = ? AND sp.status = 'published' AND sp.deleted_at IS NULL`)
    .get(slug) as SpotlightRow | undefined;
}

export function listSpotlights(opts: { publishedOnly: boolean }): SpotlightRow[] {
  const where = opts.publishedOnly ? "sp.deleted_at IS NULL AND sp.status = 'published'" : "sp.deleted_at IS NULL";
  return getDb()
    .prepare(`${BIZ_SPOTLIGHT_SELECT} WHERE ${where} ORDER BY COALESCE(sp.published_at, sp.created_at) DESC, sp.id DESC`)
    .all() as SpotlightRow[];
}

export function softDeleteSpotlight(id: number): void {
  getDb().prepare("UPDATE spotlights SET deleted_at = datetime('now') WHERE id = ?").run(id);
}


// ---------------------------------------------------------------------------
// QR links (The Daily Pueblo Digital Connection)
// ---------------------------------------------------------------------------

export type QrLinkRow = {
  id: number;
  code: string;
  label: string;
  target_path: string;
  scans: number;
  last_scanned_at: string | null;
  created_at: string;
};

const QR_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alike characters

function randomQrCode(): string {
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += QR_CODE_ALPHABET[b % QR_CODE_ALPHABET.length];
  return out;
}

export function createQrLink(label: string, targetPath: string, createdBy: number | null): QrLinkRow {
  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomQrCode();
    try {
      const info = db
        .prepare("INSERT INTO qr_links (code, label, target_path, created_by) VALUES (?, ?, ?, ?)")
        .run(code, label, targetPath, createdBy);
      return getQrLinkById(Number(info.lastInsertRowid))!;
    } catch (e) {
      if (!String((e as Error).message).includes("UNIQUE")) throw e;
    }
  }
  throw new Error("Could not generate a unique code");
}

const QR_COLUMNS = "id, code, label, target_path, scans, last_scanned_at, created_at";

export function getQrLinkById(id: number): QrLinkRow | undefined {
  return getDb()
    .prepare(`SELECT ${QR_COLUMNS} FROM qr_links WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as QrLinkRow | undefined;
}

export function listQrLinks(): QrLinkRow[] {
  return getDb()
    .prepare(`SELECT ${QR_COLUMNS} FROM qr_links WHERE deleted_at IS NULL ORDER BY id DESC`)
    .all() as QrLinkRow[];
}

// Looks up a code and records the visit in one step; undefined if unknown or deleted.
export function recordQrScan(code: string): QrLinkRow | undefined {
  const db = getDb();
  const row = db
    .prepare(`SELECT ${QR_COLUMNS} FROM qr_links WHERE code = ? AND deleted_at IS NULL`)
    .get(code) as QrLinkRow | undefined;
  if (!row) return undefined;
  db.prepare("UPDATE qr_links SET scans = scans + 1, last_scanned_at = datetime('now') WHERE id = ?").run(row.id);
  return row;
}

export function softDeleteQrLink(id: number): void {
  getDb().prepare("UPDATE qr_links SET deleted_at = datetime('now') WHERE id = ?").run(id);
}


// ---------------------------------------------------------------------------
// We Asked the Pueblo
// ---------------------------------------------------------------------------

export type PuebloQuestion = {
  id: number;
  slug: string;
  question: string;
  context: string | null;
  status: "draft" | "open" | "closed";
  created_at: string;
  approved_count: number;
  pending_count: number;
};

const PQ_SELECT = `
  SELECT q.id, q.slug, q.question, q.context, q.status, q.created_at,
    (SELECT COUNT(*) FROM pueblo_answers a WHERE a.question_id = q.id AND a.status = 'approved') AS approved_count,
    (SELECT COUNT(*) FROM pueblo_answers a WHERE a.question_id = q.id AND a.status = 'pending') AS pending_count
  FROM pueblo_questions q
`;

export type PuebloQuestionInput = { question: string; context: string | null; status: "draft" | "open" | "closed" };

export function createPuebloQuestion(input: PuebloQuestionInput): PuebloQuestion {
  const db = getDb();
  const base = slugify(input.question).slice(0, 60) || "question";
  let slug = base;
  let n = 2;
  while (db.prepare("SELECT id FROM pueblo_questions WHERE slug = ?").get(slug)) slug = `${base}-${n++}`;
  const info = db
    .prepare("INSERT INTO pueblo_questions (slug, question, context, status) VALUES (?, ?, ?, ?)")
    .run(slug, input.question, input.context, input.status);
  return getPuebloQuestionById(Number(info.lastInsertRowid))!;
}

export function updatePuebloQuestion(id: number, input: PuebloQuestionInput): PuebloQuestion | undefined {
  const db = getDb();
  if (!getPuebloQuestionById(id)) return undefined;
  db.prepare("UPDATE pueblo_questions SET question = ?, context = ?, status = ? WHERE id = ?").run(
    input.question, input.context, input.status, id
  );
  return getPuebloQuestionById(id);
}

export function getPuebloQuestionById(id: number): PuebloQuestion | undefined {
  return getDb().prepare(`${PQ_SELECT} WHERE q.id = ? AND q.deleted_at IS NULL`).get(id) as PuebloQuestion | undefined;
}

// Public lookup: drafts are never visible.
export function getPublicPuebloQuestionBySlug(slug: string): PuebloQuestion | undefined {
  return getDb()
    .prepare(`${PQ_SELECT} WHERE q.slug = ? AND q.status != 'draft' AND q.deleted_at IS NULL`)
    .get(slug) as PuebloQuestion | undefined;
}

export function listPuebloQuestions(opts: { publicOnly: boolean }): PuebloQuestion[] {
  const where = opts.publicOnly ? "q.status != 'draft' AND q.deleted_at IS NULL" : "q.deleted_at IS NULL";
  return getDb().prepare(`${PQ_SELECT} WHERE ${where} ORDER BY q.id DESC`).all() as PuebloQuestion[];
}

export function softDeletePuebloQuestion(id: number): void {
  getDb().prepare("UPDATE pueblo_questions SET deleted_at = datetime('now') WHERE id = ?").run(id);
}

export type PuebloAnswer = {
  id: number;
  question_id: number;
  user_id: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  selected: number;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  username: string;
  city: string | null;
  question_text: string;
  question_slug: string;
};

const PA_SELECT = `
  SELECT a.id, a.question_id, a.user_id, a.body, a.status, a.selected, a.created_at,
         u.first_name, u.last_name, u.username, u.city,
         q.question AS question_text, q.slug AS question_slug
  FROM pueblo_answers a
  JOIN users u ON u.id = a.user_id
  JOIN pueblo_questions q ON q.id = a.question_id
`;

// A member's answer: new, or an edit of their earlier one (which goes back to
// pending review and loses any "selected" mark, since the text changed).
export function submitPuebloAnswer(questionId: number, userId: number, body: string): PuebloAnswer {
  const db = getDb();
  db.prepare(
    `INSERT INTO pueblo_answers (question_id, user_id, body) VALUES (?, ?, ?)
     ON CONFLICT(question_id, user_id) DO UPDATE SET
       body = excluded.body, status = 'pending', selected = 0, updated_at = datetime('now')`
  ).run(questionId, userId, body);
  return getPuebloAnswerForUser(questionId, userId)!;
}

export function getPuebloAnswerForUser(questionId: number, userId: number): PuebloAnswer | undefined {
  return getDb()
    .prepare(`${PA_SELECT} WHERE a.question_id = ? AND a.user_id = ?`)
    .get(questionId, userId) as PuebloAnswer | undefined;
}

export function getPuebloAnswerById(id: number): PuebloAnswer | undefined {
  return getDb().prepare(`${PA_SELECT} WHERE a.id = ?`).get(id) as PuebloAnswer | undefined;
}

export function listApprovedPuebloAnswers(questionId: number): PuebloAnswer[] {
  return getDb()
    .prepare(`${PA_SELECT} WHERE a.question_id = ? AND a.status = 'approved' ORDER BY a.selected DESC, a.id DESC`)
    .all(questionId) as PuebloAnswer[];
}

// Admin: everything for a question, pending first.
export function listPuebloAnswersForAdmin(questionId: number): PuebloAnswer[] {
  return getDb()
    .prepare(
      `${PA_SELECT} WHERE a.question_id = ?
       ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, a.id DESC`
    )
    .all(questionId) as PuebloAnswer[];
}

// Only approved answers can be selected; rejecting or re-pending clears the mark.
export function moderatePuebloAnswer(
  id: number,
  change: { status?: "pending" | "approved" | "rejected"; selected?: boolean }
): PuebloAnswer | undefined {
  const db = getDb();
  const cur = getPuebloAnswerById(id);
  if (!cur) return undefined;
  const status = change.status ?? cur.status;
  const selected = status === "approved" ? (change.selected ?? Boolean(cur.selected)) : false;
  db.prepare("UPDATE pueblo_answers SET status = ?, selected = ?, updated_at = datetime('now') WHERE id = ?").run(
    status, selected ? 1 : 0, id
  );
  return getPuebloAnswerById(id);
}

export function deletePuebloAnswer(id: number): void {
  getDb().prepare("DELETE FROM pueblo_answers WHERE id = ?").run(id);
}


// ---------------------------------------------------------------------------
// 3D Business Storefronts
// ---------------------------------------------------------------------------

export const STOREFRONT_LOTS = 7; // building lots available along the storefront row

export type StorefrontBusiness = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  storefront_lot: number | null;
  storefront_color: string | null;
  billboard_text: string | null;
};

const STOREFRONT_COLUMNS = "id, name, slug, category, description, storefront_lot, storefront_color, billboard_text";

// Every business with its storefront state, for the admin screen.
export function listBusinessesWithStorefrontState(): StorefrontBusiness[] {
  return getDb()
    .prepare(`SELECT ${STOREFRONT_COLUMNS} FROM businesses ORDER BY name COLLATE NOCASE`)
    .all() as StorefrontBusiness[];
}

// Businesses that currently have a building in the 3D Pueblo.
export function listStorefronts(): StorefrontBusiness[] {
  return getDb()
    .prepare(`SELECT ${STOREFRONT_COLUMNS} FROM businesses WHERE storefront_lot IS NOT NULL ORDER BY storefront_lot`)
    .all() as StorefrontBusiness[];
}

// Gives a business a building on the lowest free lot (or just recolors it if it
// already has one). Returns an error string when every lot is taken.
export function enableStorefront(businessId: number, color: string): { ok: true; lot: number } | { error: string } {
  const db = getDb();
  const biz = db
    .prepare("SELECT id, storefront_lot FROM businesses WHERE id = ?")
    .get(businessId) as { id: number; storefront_lot: number | null } | undefined;
  if (!biz) return { error: "Business not found." };
  if (biz.storefront_lot !== null) {
    db.prepare("UPDATE businesses SET storefront_color = ? WHERE id = ?").run(color, businessId);
    return { ok: true, lot: biz.storefront_lot };
  }
  const used = new Set(
    (db.prepare("SELECT storefront_lot FROM businesses WHERE storefront_lot IS NOT NULL").all() as { storefront_lot: number }[])
      .map((r) => r.storefront_lot)
  );
  let lot = -1;
  for (let i = 0; i < STOREFRONT_LOTS; i++) if (!used.has(i)) { lot = i; break; }
  if (lot < 0) return { error: `All ${STOREFRONT_LOTS} storefront lots are in use. Remove one first.` };
  db.prepare("UPDATE businesses SET storefront_lot = ?, storefront_color = ? WHERE id = ?").run(lot, color, businessId);
  return { ok: true, lot };
}

export function disableStorefront(businessId: number): void {
  getDb().prepare("UPDATE businesses SET storefront_lot = NULL, storefront_color = NULL, billboard_text = NULL WHERE id = ?").run(businessId);
}

// Sets (or clears, with null) the headline on a storefront's rooftop billboard.
export function setStorefrontBillboard(businessId: number, text: string | null): boolean {
  const info = getDb()
    .prepare("UPDATE businesses SET billboard_text = ? WHERE id = ? AND storefront_lot IS NOT NULL")
    .run(text, businessId);
  return Number(info.changes) > 0;
}


// ---------------------------------------------------------------------------
// 360° Virtual Business Tours
// ---------------------------------------------------------------------------

export type BusinessTour = {
  business_id: number;
  name: string;
  slug: string;
  category: string;
  tour_url: string;
  tour_provider: "youtube" | "vimeo" | "matterport";
  tour_embed: string;
};

export function getBusinessTour(businessId: number): BusinessTour | undefined {
  return getDb()
    .prepare(
      `SELECT id AS business_id, name, slug, category, tour_url, tour_provider, tour_embed
       FROM businesses WHERE id = ? AND tour_embed IS NOT NULL`
    )
    .get(businessId) as BusinessTour | undefined;
}

export function getBusinessTourBySlug(slug: string): BusinessTour | undefined {
  return getDb()
    .prepare(
      `SELECT id AS business_id, name, slug, category, tour_url, tour_provider, tour_embed
       FROM businesses WHERE slug = ? AND tour_embed IS NOT NULL`
    )
    .get(slug) as BusinessTour | undefined;
}

export function listBusinessTours(): BusinessTour[] {
  return getDb()
    .prepare(
      `SELECT id AS business_id, name, slug, category, tour_url, tour_provider, tour_embed
       FROM businesses WHERE tour_embed IS NOT NULL ORDER BY name COLLATE NOCASE`
    )
    .all() as BusinessTour[];
}

export function setBusinessTour(businessId: number, tourUrl: string, provider: string, embed: string): boolean {
  const info = getDb()
    .prepare("UPDATE businesses SET tour_url = ?, tour_provider = ?, tour_embed = ? WHERE id = ?")
    .run(tourUrl, provider, embed, businessId);
  return Number(info.changes) > 0;
}

export function clearBusinessTour(businessId: number): void {
  getDb().prepare("UPDATE businesses SET tour_url = NULL, tour_provider = NULL, tour_embed = NULL WHERE id = ?").run(businessId);
}

// Every business with its tour link (if any), for the admin screen.
export function listBusinessesWithTourState(): { id: number; name: string; category: string; tour_url: string | null }[] {
  return getDb()
    .prepare("SELECT id, name, category, tour_url FROM businesses ORDER BY name COLLATE NOCASE")
    .all() as { id: number; name: string; category: string; tour_url: string | null }[];
}


// ---------------------------------------------------------------------------
// Pueblo Drops / Treasure Hunts
// ---------------------------------------------------------------------------

export type PuebloDrop = {
  id: number;
  title: string;
  prize_text: string;
  kind: "prize" | "golden_ticket";
  x: number;
  z: number;
  points: number;
  max_claims: number | null;
  expires_at: string | null;
  active: number;
  created_at: string;
  claim_count: number;
};

const DROP_SELECT = `
  SELECT d.id, d.title, d.prize_text, d.kind, d.x, d.z, d.points, d.max_claims, d.expires_at,
         d.active, d.created_at,
         (SELECT COUNT(*) FROM pueblo_drop_claims c WHERE c.drop_id = d.id) AS claim_count
  FROM pueblo_drops d
`;

export type PuebloDropInput = {
  title: string;
  prizeText: string;
  kind: "prize" | "golden_ticket";
  x: number;
  z: number;
  points: number;
  maxClaims: number | null;
  expiresInDays: number | null;
};

export function createPuebloDrop(input: PuebloDropInput): PuebloDrop {
  const db = getDb();
  const expires = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString().slice(0, 19).replace("T", " ")
    : null;
  const info = db
    .prepare(
      `INSERT INTO pueblo_drops (title, prize_text, kind, x, z, points, max_claims, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(input.title, input.prizeText, input.kind, input.x, input.z, input.points, input.maxClaims, expires);
  return getPuebloDropById(Number(info.lastInsertRowid))!;
}

export function getPuebloDropById(id: number): PuebloDrop | undefined {
  return getDb().prepare(`${DROP_SELECT} WHERE d.id = ? AND d.deleted_at IS NULL`).get(id) as PuebloDrop | undefined;
}

export function listPuebloDropsForAdmin(): PuebloDrop[] {
  return getDb().prepare(`${DROP_SELECT} WHERE d.deleted_at IS NULL ORDER BY d.id DESC`).all() as PuebloDrop[];
}

export function setPuebloDropActive(id: number, active: boolean): void {
  getDb().prepare("UPDATE pueblo_drops SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
}

export function softDeletePuebloDrop(id: number): void {
  getDb().prepare("UPDATE pueblo_drops SET deleted_at = datetime('now') WHERE id = ?").run(id);
}

// Drops this member can still find: active, not expired, not full, not already theirs.
export function listFindableDrops(userId: number): PuebloDrop[] {
  return (
    getDb()
      .prepare(
        `${DROP_SELECT}
         WHERE d.deleted_at IS NULL AND d.active = 1
           AND (d.expires_at IS NULL OR d.expires_at > datetime('now'))
           AND NOT EXISTS (SELECT 1 FROM pueblo_drop_claims c WHERE c.drop_id = d.id AND c.user_id = ?)
         ORDER BY d.id`
      )
      .all(userId) as PuebloDrop[]
  ).filter((d) => d.max_claims === null || d.claim_count < d.max_claims);
}

function randomDropCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export type DropClaimResult =
  | { claimed: true; drop: PuebloDrop; code: string }
  | { claimed: false; reason: "not_found" | "inactive" | "expired" | "gone" | "already" };

// Everything runs synchronously on one connection, so the "is it full?" check
// and the insert cannot interleave with another request.
export function claimPuebloDrop(dropId: number, userId: number): DropClaimResult {
  const db = getDb();
  const drop = getPuebloDropById(dropId);
  if (!drop) return { claimed: false, reason: "not_found" };
  if (!drop.active) return { claimed: false, reason: "inactive" };
  const now = (db.prepare("SELECT datetime('now') AS n").get() as { n: string }).n;
  if (drop.expires_at && drop.expires_at <= now) return { claimed: false, reason: "expired" };
  if (db.prepare("SELECT id FROM pueblo_drop_claims WHERE drop_id = ? AND user_id = ?").get(dropId, userId)) {
    return { claimed: false, reason: "already" };
  }
  if (drop.max_claims !== null && drop.claim_count >= drop.max_claims) return { claimed: false, reason: "gone" };
  const code = randomDropCode();
  db.prepare("INSERT INTO pueblo_drop_claims (drop_id, user_id, code) VALUES (?, ?, ?)").run(dropId, userId, code);
  if (drop.points > 0) awardPoints(userId, "treasure_drop", `drop:${dropId}`, drop.points);
  return { claimed: true, drop, code };
}

export type DropClaimRow = {
  id: number;
  drop_id: number;
  code: string;
  claimed_at: string;
  redeemed_at: string | null;
  title: string;
  prize_text: string;
  kind: "prize" | "golden_ticket";
  points: number;
};

export function listDropClaimsForUser(userId: number): DropClaimRow[] {
  return getDb()
    .prepare(
      `SELECT c.id, c.drop_id, c.code, c.claimed_at, c.redeemed_at, d.title, d.prize_text, d.kind, d.points
       FROM pueblo_drop_claims c JOIN pueblo_drops d ON d.id = c.drop_id
       WHERE c.user_id = ? ORDER BY c.id DESC`
    )
    .all(userId) as DropClaimRow[];
}

export type DropClaimAdminRow = {
  id: number;
  drop_id: number;
  code: string;
  claimed_at: string;
  redeemed_at: string | null;
  username: string;
  first_name: string | null;
  last_name: string | null;
};

export function listClaimsForDrop(dropId: number): DropClaimAdminRow[] {
  return getDb()
    .prepare(
      `SELECT c.id, c.drop_id, c.code, c.claimed_at, c.redeemed_at, u.username, u.first_name, u.last_name
       FROM pueblo_drop_claims c JOIN users u ON u.id = c.user_id
       WHERE c.drop_id = ? ORDER BY c.id DESC`
    )
    .all(dropId) as DropClaimAdminRow[];
}

export function setDropClaimRedeemed(claimId: number, redeemed: boolean): boolean {
  const info = getDb()
    .prepare("UPDATE pueblo_drop_claims SET redeemed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END WHERE id = ?")
    .run(redeemed ? 1 : 0, claimId);
  return Number(info.changes) > 0;
}

export function setEventCover(eventId: number, path: string | null): void {
  getDb().prepare("UPDATE events SET cover_photo_path = ? WHERE id = ?").run(path, eventId);
}

export function setGroupCover(groupId: number, path: string | null): void {
  getDb().prepare("UPDATE groups SET cover_photo_path = ? WHERE id = ?").run(path, groupId);
}

// ---------------------------------------------------------------------------
// Account deletion (self-service). The users row is kept but scrubbed
// ("anonymised") rather than removed: ~60 tables point at users(id) and
// foreign keys aren't enforced, so a hard delete would leave dangling ids
// that break joins. Everything personal is erased: profile, contact and
// location data, credentials, posts, comments, messages, friendships,
// likes, RSVPs, stories, classifieds, reviews, reactions, notifications
// and uploaded-image references. Rows that have to stay for accounting
// (payment_transactions) keep only the anonymous id. Events, groups and
// streams the member created remain, credited to "Deleted member".
// ---------------------------------------------------------------------------
export type DeleteAccountResult =
  | { ok: true; files: string[] }
  | { ok: false; reason: "admin" | "owns_business" | "not_found" };

export function deleteUserAccount(userId: number): DeleteAccountResult {
  const db = getDb();
  const user = db.prepare("SELECT id, role, account_status FROM users WHERE id = ?").get(userId) as
    | { id: number; role: string; account_status: string }
    | undefined;
  if (!user || user.account_status === "deleted") return { ok: false, reason: "not_found" };
  if (user.role === "admin") return { ok: false, reason: "admin" };
  if (db.prepare("SELECT 1 AS x FROM businesses WHERE owner_id = ? LIMIT 1").get(userId)) {
    return { ok: false, reason: "owns_business" };
  }

  // Uploaded files to remove from disk after the rows are gone.
  const files: string[] = [];
  const grab = (sql: string) => {
    for (const r of db.prepare(sql).all(userId) as { p: string | null }[]) if (r.p) files.push(r.p);
  };
  grab("SELECT profile_photo_path AS p FROM users WHERE id = ?");
  grab("SELECT cover_photo_path AS p FROM users WHERE id = ?");
  grab("SELECT image_path AS p FROM posts WHERE author_id = ?");
  grab("SELECT image_path AS p FROM stories WHERE author_id = ?");
  grab("SELECT image_path AS p FROM classifieds WHERE author_id = ?");

  const del = (sql: string) => db.prepare(sql).run(userId);

  db.exec("BEGIN");
  try {
    // Children of content the member authored (their own posts/questions/comments).
    del("DELETE FROM post_comments WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)");
    del("DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)");
    del("DELETE FROM stream_qa_votes WHERE question_id IN (SELECT id FROM stream_qa_questions WHERE author_id = ?)");
    del("DELETE FROM stream_comment_reports WHERE comment_id IN (SELECT id FROM stream_comments WHERE author_id = ?)");

    // Their content.
    for (const [table, col] of [
      ["posts", "author_id"],
      ["post_comments", "author_id"],
      ["stories", "author_id"],
      ["classifieds", "author_id"],
      ["stream_comments", "author_id"],
      ["stream_qa_questions", "author_id"],
      ["business_reviews", "user_id"],
      ["street_team_submissions", "submitter_id"],
      ["neighborhood_reports", "reporter_id"],
      ["pueblo_answers", "user_id"],
      ["booth_answers", "user_id"],
    ] as const) {
      del(`DELETE FROM ${table} WHERE ${col} = ?`); // fixed whitelist, never user input
    }

    // Their activity and relationships.
    for (const [table, col] of [
      ["post_likes", "user_id"],
      ["group_members", "user_id"],
      ["friend_requests", "sender_id"],
      ["friend_requests", "recipient_id"],
      ["friendships", "user_a_id"],
      ["friendships", "user_b_id"],
      ["messages", "sender_id"],
      ["messages", "recipient_id"],
      ["business_followers", "user_id"],
      ["business_memberships", "user_id"],
      ["event_rsvps", "user_id"],
      ["event_checkins", "user_id"],
      ["deal_claims", "user_id"],
      ["bop_votes", "voter_id"],
      ["passport_stamps", "user_id"],
      ["rewards_point_events", "user_id"],
      ["pueblo_drop_claims", "user_id"],
      ["stream_likes", "user_id"],
      ["stream_viewer_sessions", "user_id"],
      ["stream_reactions", "user_id"],
      ["stream_poll_votes", "user_id"],
      ["stream_flash_drop_claims", "user_id"],
      ["stream_qa_votes", "user_id"],
      ["stream_spotlight_requests", "user_id"],
      ["stream_bans", "user_id"],
      ["stream_comment_reports", "reporter_id"],
      ["neighborhood_report_followers", "user_id"],
      ["notifications", "user_id"],
      ["notifications", "actor_id"],
      ["email_verification_tokens", "user_id"],
      ["password_reset_tokens", "user_id"],
    ] as const) {
      del(`DELETE FROM ${table} WHERE ${col} = ?`);
    }
    // Contact-form messages keep the text staff needed to answer but lose the link to the account.
    db.prepare("UPDATE contact_messages SET user_id = NULL WHERE user_id = ?").run(userId);
    // Streams they were hosting stop being live/scheduled.
    db.prepare(
      "UPDATE streams SET status = 'ended', ended_at = COALESCE(ended_at, datetime('now')) WHERE host_id = ? AND status IN ('live','scheduled')"
    ).run(userId);

    // Scrub the account row; random unusable password, sessions invalidated.
    const randomHash = `deleted:${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    db.prepare(
      `UPDATE users SET
         username = ?, email = ?, password_hash = ?, first_name = NULL, last_name = NULL,
         city = NULL, bio = NULL, profile_photo_path = NULL, cover_photo_path = NULL,
         latitude = NULL, longitude = NULL, location_city = NULL, location_region = NULL,
         location_country = NULL, location_source = NULL, location_updated_at = NULL,
         marketing_emails_opt_in = 0, email_verified_at = NULL, account_status = 'deleted',
         session_version = session_version + 1, updated_at = datetime('now')
       WHERE id = ?`
    ).run(`deleted-member-${userId}`, `deleted-${userId}@deleted.invalid`, randomHash, userId);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return { ok: true, files };
}
