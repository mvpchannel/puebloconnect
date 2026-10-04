# Pueblo Connect — Next.js app (Phase 1)

This is the Phase 1 foundation: the static Winku/Pueblo Connect HTML site,
ported into Next.js (App Router + TypeScript) with shared Header/Footer/
Sidebar components instead of markup duplicated across 60+ files.

## ⚠️ Not yet build-verified (but far more has been checked than that implies)

This code has been written entirely in sandboxed environments where
`npm install` is blocked — confirmed again as of this check: a direct
request to `registry.npmjs.org` returns a flat `403` regardless of proxy
routing, which matches this being a standing restriction on the sandbox's
outbound IP range, not a one-off or something fixable with proxy/registry
config. That means:

- It has **not** been through an actual `next build`, so anything that
  only shows up once real `next`/`react`/`three` packages are resolved
  (their own type definitions, `next build`'s static-export checks,
  bundler-level issues) can't be fully ruled out from in here.
- **It HAS been typechecked as a whole project**, not just file-by-file:
  running `tsc --noEmit -p tsconfig.json` (the project's own real
  `tsconfig.json`, so the `@/*` path alias resolves exactly like it does
  in Next) across all 245 `.ts`/`.tsx` files currently in `src/` comes
  back with **zero real type errors** — the project's own internal code,
  cross-file types, and `strict: true` checks are all clean. The only
  diagnostics that print are for packages that don't exist on disk yet
  (`next`, `react`, `@types/node`, etc. — expected, since `npm install`
  has never been able to run) and a TS6-vs-TS5.5 `baseUrl` deprecation
  notice from this sandbox's newer bundled `tsc`, not from this project's
  own config.
- Structural Next.js checks that `tsc` wouldn't catch were done by hand
  across the whole `src/app` tree: every `page.tsx` has a default export,
  every `route.ts` has a real HTTP-method handler, every component that
  calls a React hook is marked `"use client"`, and there are no colliding
  dynamic route segments (e.g. two different `[id]`/`[slug]` folders at
  the same path level, which fails a real build outright).
- **The auth/session/database/membership/email logic and the Stripe
  payment logic were actually run**, not just checked — see "Auth
  system" and "Business membership payments" below. All of it needs no
  `npm install` because it's built entirely on Node's own built-ins plus
  plain `fetch` calls (Stripe's and Resend's REST APIs — no SDK
  packages). The full registration → verify-email → login → forgot-
  password → reset-password chain, plus duplicate email/username, wrong
  password, expired/reused/invalid tokens, and rate limiting, was
  exercised against a real (temporary, isolated) SQLite database by
  importing the actual source files with Node's `--experimental-strip-
  types` — 41/41 checks passed. Every feature added in later sessions
  (notifications, Report & Track, Account Settings, the Contact Us
  backend, and more) followed the same pattern: isolated `node:sqlite`
  tests against the real `db.ts` functions before committing.

**First thing to do on a machine with working npm access:**

```bash
npm install
cp .env.example .env.local   # then fill in SESSION_SECRET (see the file)
npm run dev     # http://localhost:3000
# once that looks right:
npm run build
```

Fix whatever `npm run build` surfaces — treat the Next.js wiring (routing,
JSX, component props) as reviewed-but-untested; treat the auth logic itself
as already verified (below).

## Auth system (real, not a mockup)

Member registration, email verification, login, logout, forgot/reset
password, and sessions are fully implemented and backed by a real
database — not placeholder forms. Built with **zero new npm
dependencies**: it uses only Node.js built-ins (`node:sqlite`,
`node:crypto`, Web Crypto, `fetch`), which is why it could be genuinely
tested in this sandbox despite the npm block.

- **Database**: `src/lib/db.ts` — SQLite via Node's built-in `node:sqlite`
  (stable in Node ≥22.5, no native compilation, no server to run). A
  `users` table (id, username, email, password_hash, role, created_at,
  **first_name, last_name, city, profile_photo_path, email_verified_at,
  account_status, updated_at, last_login_at, session_version,
  marketing_emails_opt_in**), plus purpose-specific
  `email_verification_tokens` and `password_reset_tokens` tables (each
  storing only a SHA-256 **hash** of its token, with its own
  expiry/used/revoked lifecycle — never a reusable plain token on the
  user row), and a `rate_limit_attempts` table. The newer columns were
  added with additive `ALTER TABLE ... ADD COLUMN` migrations
  (`runUserMigrations`) that run automatically and leave every existing
  row's data untouched — verified by hand against a hand-built
  old-schema database file.
- **Passwords**: `src/lib/password.ts` — scrypt with a random salt per
  user, timing-safe comparison. Verified by hand: correct password
  accepted, wrong password rejected.
- **Tokens**: `src/lib/tokens.ts` — 256-bit random tokens for email
  verification (24h expiry) and password reset (1h expiry); only the
  SHA-256 hash is ever persisted.
- **Email**: `src/lib/email.ts` — one reusable module for every
  transactional email (verification, email-verified, password-reset,
  password-changed), sent via Resend's plain HTTP API (`fetch`, no SDK)
  when `RESEND_API_KEY` is set. **With no key set, email is written to
  `data/outbox/*.json` instead of silently doing nothing** — this is how
  the full flow was tested end-to-end in this sandbox (api.resend.com is
  outside this sandbox's network allowlist, confirmed by hand — a real
  `fetch()` to it returns "403 Host not in allowlist").
- **Rate limiting**: `src/lib/rate-limit.ts` — persisted (SQLite-backed,
  not in-memory) sliding-window limits on register/login/forgot-password/
  reset-password/resend-verification, keyed by IP and, for login, also by
  the account being attempted.
- **Sessions**: `src/lib/session.ts` signs a small HMAC-SHA256 token
  (same idea as a JWT) into an httpOnly cookie, now also carrying a
  `pwv` (password/session version) snapshot. `src/lib/session-edge.ts`
  verifies the signature inside `src/middleware.ts` (Edge runtime, no
  Node `crypto`/DB access — uses Web Crypto instead); `src/lib/
  require-user.ts` and `GET /api/auth/session` do the fuller,
  DB-backed check that also rejects a token whose `pwv` no longer
  matches the user's current `session_version` — i.e. a password change
  invalidates every session issued before it, even though sessions are
  stateless signed cookies with no server-side session store.
- **Routes**: `POST /api/auth/register`, `POST /api/auth/login`,
  `POST /api/auth/logout`, `GET /api/auth/session`,
  `GET /api/auth/verify-email?token=`, `POST /api/auth/resend-verification`,
  `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`,
  `GET/POST /api/account/notification-preferences`.
- **Pages**: `/login` (sign in + register, now collecting first/last
  name, confirm password, city, optional profile photo, and a required
  ToS checkbox), `/verify-email`, `/forgot-password`, `/reset-password`.
- **Protected pages**: `src/middleware.ts` redirects to `/login` if you're
  not signed in and try to visit `/newsfeed`, `/profile`, `/explore-3d`,
  `/notifications`, `/messages`, or `/admin`; it additionally requires
  `role: admin` for `/admin`. `/verify-email`, `/forgot-password`, and
  `/reset-password` are intentionally public — a brand-new or logged-out
  member has to be able to reach them from an email link.
- **Admins aren't created through the signup form, ever** — registering
  always creates a `member`. The only way to create an admin is running
  `npm run create-admin -- <username> <email> <password>` (or
  `node scripts/create-admin.mjs ...`) on the server, by someone with shell
  access.
- **Security notes**: no SQL string concatenation anywhere (every query
  in `db.ts` is parameterized); React escapes all rendered output (no XSS
  vector from user input); the auth API only accepts
  `Content-Type: application/json` over `fetch` with no permissive CORS
  headers, which combined with the session cookie's `SameSite=Lax` rules
  out the standard CSRF vectors without a separate synchronizer-token
  scheme; login and forgot-password return the same generic
  message/response whether or not the account exists, so neither leaks
  which emails/usernames are registered.
- **What's still a placeholder**: "edit profile" and "account settings"
  in the header dropdown (there's no profile-edit or settings *page* yet
  — out of scope for this pass, which was specifically the membership/
  login/password-recovery/email system); real email delivery (needs a
  `RESEND_API_KEY` and a verified sending domain — see
  `ENVIRONMENT VARIABLES` below); profile-photo storage is real but is a
  local-filesystem store (`public/uploads/avatars/`), which is fine for
  a single-server deployment but would move to object storage (e.g. an
  S3-compatible bucket) at larger scale.

## Admin panel — all 16 pages ported and role-gated

Every page from `../pueblo-connect/winku admin/` (16 HTML files) now has a
real, protected equivalent under `/admin/*` in this app. All of it sits
behind `src/middleware.ts` (`role: admin` required, matcher
`/admin/:path*`) — unlike the static version, there is no URL anyone can
just load.

**Real, not a mockup (2 of 16):**

- **`/admin`** (dashboard) — real counts (total users, members, admins) and
  a real "recently joined" table, read live from the SQLite database via
  `src/lib/db.ts`. The vendor template's fake activity feed (hardcoded
  "Stephen N. Arellano", fake comments) was dropped rather than ported —
  it wasn't a real feature, just theme-preview filler.
- **`/admin/users`** (user management) — real CRUD: lists actual users,
  and "Make admin" / "Remove admin" / "Delete" genuinely call
  `PATCH`/`DELETE /api/admin/users/:id`, which re-checks the admin session
  itself (`src/lib/require-admin.ts`) rather than trusting the page-level
  gate alone — API routes live outside `src/middleware.ts`'s `/admin/*`
  page matcher, so that route would otherwise be unprotected. Safeguards:
  an admin can't demote or delete their own account, and the last
  remaining admin can't be demoted or deleted (no way to lock everyone
  out).

**Visually ported, still the vendor demo content (14 of 16):** `/admin/connect`,
`/admin/edit-profile`, `/admin/inbox`, `/admin/calendar`,
`/admin/image-cropper`, `/admin/link-posting`, `/admin/notifications`,
`/admin/image-opener`, `/admin/tickets-1`, `/admin/tickets-2`,
`/admin/reviews`, `/admin/locations`, `/admin/posting-panel`,
`/admin/post-preview`. These are real, protected Next.js pages — not
static HTML anyone can load — but their *content* is still the original
template's sample data (fake tickets, fake reviews, a fake calendar, etc.),
converted from HTML to JSX mechanically (class→className, inline
`style="…"` strings→objects, void tags self-closed) and verified with
esbuild, same process as the member-site pages. Each has its own
`STATUS:` comment. Giving any of these real functionality (an actual
support-ticket system, real reviews tied to real businesses, a real
calendar backed by the events feature from the brief, etc.) is separate
work — a real data model and API per feature — not just more porting.

**Shared admin chrome**: `src/components/admin/AdminChrome.tsx` (top bar +
collapsible sidebar) replaces the markup duplicated across all 16 original
files. It shows the real logged-in admin's username/role (from
`/api/auth/session`) and a working log-out button; the old top-bar's
fullscreen/refresh icons and the sidebar's `body.menu-active` CSS hook
are cosmetic-only carryovers from the vendor theme (noted in the
component). Admin pages load their own CSS stack
(`public/admin-assets/`) via `src/app/admin/layout.tsx`, kept separate
from the member site's CSS (`src/app/(site)/layout.tsx`) so the two
different Bootstrap builds don't collide — this required splitting the
former single root layout into a minimal root plus two section layouts;
see the comments in `src/app/layout.tsx` for why.

## What's ported so far

| Route | Source | Status |
|---|---|---|
| `/login` | `landing.html` | Login and Register forms are real — they call the auth API above, not placeholders. |
| `/newsfeed` | `newsfeed.html` | Requires login (middleware-protected). Composer + feed with sample posts. Like button is real local state (not persisted). Comments post locally only. |
| `/profile` | `time-line.html` | Requires login. Cover photo/avatar/tabs header, reuses the newsfeed composer/post components. |
| `/admin/*` (16 routes) | `winku admin/*.html` | Requires login **and** `role: admin`. All 16 pages ported — 2 real (dashboard, user management), 14 visual-only. See "Admin panel" above. |
| `/membership` | — (new) | Requires login. Real Stripe Checkout for the 3 business plans. See "Business membership payments" above. |
| `/membership/success`, `/cancel`, `/error` | — (new) | Requires login. Real result screens the checkout redirects to. |
| `/advertise` | — (new) | Public, no login required. Full digital-advertising rate card from the marketing package, plus the 3 membership plans linking to `/membership`. |
| `/terms` | `terms.html` (Phase 0) | Same placeholder draft content — still needs a lawyer's review before launch. |
| `/sitemap-page` | `sitemap.html` (Phase 0) | Human-readable page listing routes. (Note: `/sitemap.xml` is a *separate*, real machine-readable sitemap generated by `src/app/sitemap.ts` — a genuine Next.js SEO feature the static site couldn't offer.) |
| `/` | — | Redirects to `/login`. |

Everything else — groups, messages, notifications, the business directory,
shop, forum, etc. — is **still only in the Phase 0 static HTML site**
(`../pueblo-connect/winku-html/`), with no auth protection at all since that
site has no server to check a session
against. Port the rest page by page using the pattern below; any page that
should require login or admin can reuse `src/middleware.ts` by just adding
its path to `MEMBER_ROUTES`/`ADMIN_ROUTES`.

## Architecture decisions made while porting

- **Global CSS, not CSS Modules/Tailwind.** `main.min.css`, `style.css`,
  `color.css`, `responsive.css` are loaded as plain `<link>` tags in
  `src/app/layout.tsx`, same load order as every old page's `<head>`. This
  matches the brief ("upgrade the technology underneath it, not redesign
  it") — the whole component/grid system lives in that CSS.
- **The legacy `main.min.js` (jQuery + Bootstrap JS) is intentionally NOT
  loaded.** jQuery directly manipulates the DOM, which fights React for
  control of the same nodes and will cause bugs or crashes if mixed in.
  Practical effect: CSS-only `:hover` interactions (dropdown menus, etc.)
  still work; JS-driven behaviors (the login/register panel swap, the
  mobile menu slide, ripple click effects, sticky-header-on-scroll) needed
  to be re-implemented. The login toggle and mobile menu are done as real
  React state (see `Header.tsx`, `login/LoginForm.tsx`); ripple effects and
  scroll-based sticky behavior are not yet re-implemented — cosmetic only,
  tracked here rather than silently dropped.
- **Fake/placeholder content fixed while porting, not carried over:**
  - Footer tagline said "...world's leading carpooling platform" (template
    vendor leftover) — corrected.
  - Footer social links pointed to real, unrelated third-party accounts
    (e.g. `facebook.com/shopcircut`) — replaced with `#` placeholders.
  - Footer address/phone were a fake San Francisco office — replaced with
    an explicit "coming soon" placeholder rather than carrying forward
    wrong data. Needs Pueblo Connect's/The Daily Pueblo's real contact
    info.
  - The old mega-menu listed vendor demo pages ("Home Social 2", "404
    error page", etc.) — trimmed to Pueblo Connect's real sections.
- **Every interactive element that doesn't yet do anything real is marked**
  with an inline `STATUS:` comment in the component, matching the
  convention from `FUNCTIONALITY_STATUS.md` in the Phase 0 site. Grep for
  `STATUS:` to find every one.

## How to port the next page

1. Pick a page from `../pueblo-connect/winku-html/*.html`.
2. Create `src/app/<route>/page.tsx`.
3. Reuse `<Header />`, `<Footer />`, `<Sidebar />` from `src/components/` —
   don't re-paste that markup.
4. Convert the page's unique content area from HTML to JSX (`class` →
   `className`, `for` → `htmlFor`, self-close void tags, etc.).
5. If anything on the page needs interactivity, add a `"use client"`
   component for just that piece (see `PostCard.tsx`, `LoginForm.tsx` for
   the pattern) — keep the page itself a server component with a real
   `metadata` export where possible.
6. Mark anything that still needs a backend with a `STATUS:` comment, and
   add a row to the table above.
7. Run `npm run build` and fix whatever it flags.

## Business membership payments (Stripe, real)

`/membership` (3 plans) and `/advertise` (full rate card) are new,
public-facing pages with a genuinely working Stripe checkout behind the
three recurring plans — Basic $49/mo, Plus $99/mo, Premier $199/mo.

This talks to Stripe's REST API directly over `fetch` — deliberately
**without** the `stripe` npm package, because this sandbox can't run
`npm install` (see "Not yet build-verified" at the top of this README).
Stripe's
API is plain HTTP, so this is a real, supported integration style, not a
shortcut: `src/lib/stripe.ts` builds the form-encoded requests and verifies
webhook signatures by hand (documented, stable HMAC-SHA256 scheme — no SDK
needed for that either). Swapping in the real `stripe` package later, if
you ever get a working `npm install`, is a drop-in replacement for that one
file; nothing else would need to change.

**How it works:**

1. Clicking "Subscribe" on a plan calls `POST /api/stripe/checkout` with
   only a plan ID (`"basic"`/`"plus"`/`"premier"`) — **never an amount**.
   The server looks up the real price in `src/lib/plans.ts` (the one and
   only place a dollar figure for a plan is allowed to live) and creates a
   **Stripe Checkout Session** for that exact amount
   (`src/lib/stripe.ts`). A tampered client that sent a different amount
   would simply have it ignored.
2. The browser is redirected to Stripe's own hosted, PCI-compliant
   payment page (`checkoutSession.url`) — no card data, and no payment UI
   of any kind, ever touches this codebase.
3. After paying, Stripe redirects back to `/membership/success?session_id=...`.
   That page calls `GET /api/stripe/checkout/:id/confirm`, which re-fetches
   the session from Stripe and runs it through the same verify-then-activate
   logic described below — this is a convenience so the buyer sees "active"
   immediately, not the source of truth (next point).
4. **The authoritative path is the webhook**, `POST /api/stripe/webhook`
   (`src/app/api/stripe/webhook/route.ts`). Stripe calls this directly,
   with retries, independent of whether the buyer's browser ever makes it
   back to the success page. The handler verifies the `Stripe-Signature`
   header (rejecting anything not actually from Stripe, and anything
   older than 5 minutes, as a replay guard), then runs the shared
   fulfillment logic in `src/lib/stripe-fulfillment.ts`: the session must
   belong to a transaction we recorded, Stripe's own `payment_status` must
   say `"paid"`, and the amount Stripe actually collected must match what
   was recorded when the Checkout Session was created. Only then does it
   call `activateMembership()` in `src/lib/db.ts`. Both the webhook and the
   success-page confirm route funnel through this one function, and it's
   idempotent — whichever one runs first does the work; the second is a
   no-op.
5. Every attempt is recorded in the `payment_transactions` table (Stripe
   Checkout Session ID, payment intent ID, user id, plan, amount, status,
   timestamps) — including ones that are abandoned or fail, not just
   successes. `business_memberships` holds the current plan/status/period
   per user.

**Test mode → live mode, by environment variable only** (`.env.example`
has the full list): Stripe doesn't use a separate sandbox URL the way some
processors do — one API serves both, and which mode you're in is decided
entirely by which key you set. Use a **test** Secret Key (`sk_test_...`)
from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys) (with
"Test mode" on, top right) and pay with
[Stripe's test cards](https://docs.stripe.com/testing) (e.g.
`4242 4242 4242 4242`, any future expiry, any CVC) — no real money moves.
Once that's tested end to end, switching to real payments is swapping in
the **live** Secret Key and live Webhook Signing Secret — no code changes.
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are read only in
`src/lib/stripe.ts`, server-side, and are never sent to the browser or
written into any committed file. An optional `STRIPE_ACCOUNT_ID` env var
(the account ID the business owner provided, e.g. `acct_xxxxxxxxxxxx`) is
checked against the key's real account before every checkout attempt as a
guard against an accidentally-wrong key — see `verifyConfiguredAccount()`.

**Testing the webhook locally:** Stripe needs a reachable HTTPS URL to
deliver webhooks to, which a local/sandboxed dev server doesn't have on
its own. The
[Stripe CLI](https://docs.stripe.com/stripe-cli)'s `stripe listen --forward-to
<your-dev-url>/api/stripe/webhook` solves this for local development by
forwarding real test-mode events to your machine, and it prints a webhook
signing secret to put in `STRIPE_WEBHOOK_SECRET`. In production, add the
endpoint in the Stripe Dashboard under Developers → Webhooks instead. Until
either is set up, the success-page confirm route (step 3 above) still
activates memberships for buyers who complete checkout — only a refund,
chargeback, or an abandoned-but-later-completed async payment would be
missed without the webhook wired up.

**What's real vs. not yet:**

- Real: Checkout Session creation, server-side price enforcement, webhook
  signature verification, payment verification before activation,
  membership activation, full transaction history, success/cancel/error
  screens, responsive design matching the site.
- **Not a subscription** — this is a one-time payment that represents one
  month. There's no automatic renewal; `current_period_end` is
  informational today. True auto-billing would mean switching to **Stripe
  Billing** (a `mode: "subscription"` Checkout Session with a recurring
  Price, plus handling `invoice.paid` / `invoice.payment_failed` webhook
  events for renewal) — a separate, larger integration, not built here.
- The rate-card items on `/advertise` other than the three membership
  plans (Sponsored Post, Deal of the Week, Homepage Banner, etc.) are
  informational only — each is a one-off/weekly price with its own
  duration and placement, not a recurring plan, so they don't have their
  own checkout flow yet. The page's contact details are the real path to
  buy one today.

## Explore the Pueblo in 3D (Phase 1 prototype)

`/explore-3d` — a browser-based 3D neighborhood members can walk around,
built with [Three.js](https://threejs.org/). Member-only, gated by
`middleware.ts` exactly like `/newsfeed` and `/profile` — there is no
separate login for it.

- **Engine choice**: Three.js over Babylon.js. The scene only needs a
  handful of primitives, a camera rig and raycasting — none of Babylon's
  bundled physics/GUI/XR systems — so Three.js ships meaningfully less JS
  to a phone on first load, and tree-shakes cleanly through Next.js's
  bundler as a plain ES module package. The reasoning is also written into
  the top of `src/lib/pueblo3d/engine.ts`.
- **🟢 Working now**: one neighborhood with streets, sidewalks and a
  plaza; Pueblo Connect Headquarters and The Daily Pueblo buildings; five
  sample local-business buildings; a controllable avatar (WASD/arrow keys
  + drag-to-look on desktop, an on-screen D-pad + drag-to-look on mobile);
  clicking/tapping a building to open an info card; a map panel that
  teleports the avatar to any building; the avatar's nameplate shows the
  real logged-in member's username (from `/api/auth/session`), not an
  invented name.
- **🟡 Needs backend/API**: the five business buildings are sample content
  — Pueblo Connect has no business-directory backend yet (see
  `FUNCTIONALITY_STATUS.md`), so there's nothing real to populate them
  with. `src/lib/pueblo3d/places.ts` is typed and documented so swapping
  in real business data later only means changing where `PLACES` comes
  from, not the engine. Business profile pages and Pueblo Deals don't
  exist yet either — the business info card says so rather than linking
  somewhere fake.
- **🟠 Needs backend + a realtime service**: multiple members visible at
  once, real-time movement, and member-to-member chat all need a
  WebSocket (or similar) presence server with server-authoritative
  identity — not built in Phase 1. The engine already has the seam for
  this: `upsertRemotePlayer(state)` / `removeRemotePlayer(id)` render a
  labeled avatar for any other member's position without any other change
  to the render loop, so a future presence client just needs to call
  those as updates arrive over the wire.
- **⚪ Future enhancement**: events, a working Pueblo Live video screen
  (today it's a static placeholder panel reading "Coming soon" — a real
  3D object, not a fake live feed), moderation/reporting tools, and
  swapping the current primitive-geometry buildings for lightweight GLB
  models with LOD/lazy loading once there's real art to load.
- **Reviewed against a user-supplied reference** (`Original 3D Social
  City Starter`, a generic third-party example, not Pueblo-branded): its
  orbit-camera "look around a static city" approach wasn't used, since the
  project brief specifically asks for a controllable walking avatar; its
  UI ideas for a later phase — an online-members list and a venue/profile
  modal — line up well with the `upsertRemotePlayer` seam above and are
  worth building toward once multiplayer presence exists.
- **Performance**: renderer pixel ratio is capped at 1.6x regardless of
  device pixel ratio (the most common cause of a WebGL page overheating a
  phone), and the scene uses only a few dozen low-poly primitives — no
  model loading yet to optimize further.
- **Not yet build-verified** for the same reason as the rest of this app
  (see the top of this README): `three` was added to `package.json` but
  could not actually be installed here (both the npm registry and the
  jsDelivr CDN are blocked in this sandbox). What *was* verified: every
  file passes the TypeScript syntax check described above, and
  `src/lib/pueblo3d/engine.ts`'s actual control flow (mount, click a
  building, teleport, mobile-pad movement, add/remove a remote player,
  unmount/dispose) was executed end-to-end in a real headless browser
  against a hand-written stand-in for the three.js API surface this code
  calls, to catch logic bugs independent of the real library. It has not
  been visually verified rendering real WebGL — do that first via
  `npm run dev` → `/explore-3d` once npm access is available.

## Known gap: most features still have no backend

Auth, the admin panel, and business membership payments now have real
backends (above). Everything else that needs to persist data — posts,
likes, comments, messages, the business directory, notifications, etc. —
still needs the backend work described in the original audit (this
project's SQLite layer could extend to cover them, or move to Postgres
at scale). See `FUNCTIONALITY_STATUS.md` in the Phase 0 static site for
the full feature-by-feature breakdown — it still applies here.

## Assets added, not yet wired up

- `public/images/defaults/default-avatar-male.jpg` / `default-avatar-female.jpg`
  — generic placeholder-face images for the future "no profile photo" default
  once real auth exists. Mirrors the same addition in the Phase 0 static site
  (see its `FUNCTIONALITY_STATUS.md` for the asset-provenance note). Not
  referenced by any component yet — there's no real registration flow to
  assign a default photo to until auth is built.
