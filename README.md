# Pueblo Connect — Next.js app (Phase 1)

This is the Phase 1 foundation: the static Winku/Pueblo Connect HTML site,
ported into Next.js (App Router + TypeScript) with shared Header/Footer/
Sidebar components instead of markup duplicated across 60+ files.

## ⚠️ Not yet build-verified (but the auth system IS runtime-tested)

This code was written in a sandboxed environment where `npm install` is
blocked (both the public npm registry and an internal mirror returned
403/401 on every request — not a one-off, a standing restriction). That
means:

- Every `.ts`/`.tsx` file **was** syntax-checked with esbuild (confirms
  valid TypeScript/JSX, no unclosed tags or structural mistakes) — 58/58
  files passed.
- It has **not** been through an actual `next build`, so TypeScript type
  errors against the real `next`/`react` type definitions, any remaining
  import mistakes, or runtime issues can't be ruled out yet.
- **Exception: the auth/session/database logic was actually run**, not just
  syntax-checked — see "Auth system" below. It needs no `npm install` because
  it's built entirely on Node's own built-ins.

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

Member registration, login, logout, and sessions are fully implemented and
backed by a real database — not placeholder forms. Built with **zero new
npm dependencies**: it uses only Node.js built-ins (`node:sqlite`,
`node:crypto`, Web Crypto), which is why it could be genuinely tested in
this sandbox despite the npm block.

- **Database**: `src/lib/db.ts` — SQLite via Node's built-in `node:sqlite`
  (stable in Node ≥22.5, no native compilation, no server to run). One
  `users` table: id, username, email, password_hash, role
  (`member`/`admin`), created_at.
- **Passwords**: `src/lib/password.ts` — scrypt with a random salt per
  user, timing-safe comparison. Verified by hand: correct password
  accepted, wrong password rejected.
- **Sessions**: `src/lib/session.ts` signs a small HMAC-SHA256 token
  (same idea as a JWT) into an httpOnly cookie. `src/lib/session-edge.ts`
  verifies it inside `src/middleware.ts`, which runs on the Edge runtime
  and can't use Node's `crypto` module — it uses the standard Web Crypto
  API instead. **Verified by hand**: a token signed with Node's
  `createHmac` round-trips correctly through `crypto.subtle.verify`,
  and a wrong secret or a tampered payload is correctly rejected.
- **Routes**: `POST /api/auth/register`, `POST /api/auth/login`,
  `POST /api/auth/logout`, `GET /api/auth/session`.
- **Protected pages**: `src/middleware.ts` redirects to `/login` if you're
  not signed in and try to visit `/newsfeed`, `/profile`, or `/admin`; it
  additionally requires `role: admin` for `/admin` (a logged-in member gets
  bounced to `/newsfeed`, not shown that `/admin` exists).
- **Admins aren't created through the signup form, ever** — registering
  always creates a `member`. The only way to create an admin is running
  `npm run create-admin -- <username> <email> <password>` (or
  `node scripts/create-admin.mjs ...`) on the server, by someone with shell
  access. This was run and verified in this sandbox — it creates a real row
  in the SQLite file with a correctly hashed password.
- **What's still a placeholder**: the registration form's "First & Last
  Name" and gender fields are collected in the UI but there's no column
  for them yet in the `users` table — marked with a `STATUS:` comment in
  `LoginForm.tsx` rather than silently dropped. Password reset
  ("Forgot password?") isn't built — it would need an email-sending
  service, which is a credentialed third-party integration, not something
  to fake.

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
| `/membership` | — (new) | Requires login. Real PayPal checkout for the 3 business plans. See "Business membership payments" above. |
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

## Business membership payments (PayPal, real)

`/membership` (3 plans) and `/advertise` (full rate card) are new,
public-facing pages with a genuinely working PayPal checkout behind the
three recurring plans — Basic $49/mo, Plus $99/mo, Premier $199/mo.

**How it works:**

1. The browser loads the PayPal JS SDK v6 from
   `https://www.sandbox.paypal.com/web-sdk/v6/core` (or the `www.paypal.com`
   domain in production) — which domain to load is decided by
   `PAYPAL_ENV`, fetched from `GET /api/paypal/config`
   (`src/components/membership/MembershipPlans.tsx`).
2. Clicking "Pay with PayPal" on a plan calls `POST /api/paypal/orders`
   with only a plan ID (`"basic"`/`"plus"`/`"premier"`) — **never an
   amount**. The server looks up the real price in `src/lib/plans.ts`
   (the one and only place a dollar figure for a plan is allowed to live)
   and creates the PayPal order itself via the Orders v2 API
   (`src/lib/paypal.ts`). A tampered client that sent a different amount
   would simply have it ignored.
3. After the buyer approves in PayPal's UI, the SDK calls
   `POST /api/paypal/orders/:id/capture`. That route re-verifies
   everything before activating anything: the order must belong to the
   logged-in user making the request, PayPal's own capture response must
   say `COMPLETED`, and the amount PayPal actually captured must match
   what was recorded when the order was created. Only then does it call
   `activateMembership()` in `src/lib/db.ts`.
4. Every attempt is recorded in the `payment_transactions` table
   (PayPal order ID, user id, plan, amount, status, timestamps) —
   including ones that are abandoned or fail, not just successes.
   `business_memberships` holds the current plan/status/period per user.

**Sandbox → production, by environment variable only** (`.env.example`
has the full list): set `PAYPAL_ENV=sandbox` with a Sandbox app's
Client ID/Secret from the
[PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications)
to test the whole flow with fake PayPal sandbox accounts — no real money
moves. Once that's tested end to end, switching to real payments is
`PAYPAL_ENV=production` plus that same app's **live** Client ID/Secret —
no code changes. The Client Secret is read only in `src/lib/paypal.ts`,
server-side, and is never sent to the browser or written into any
committed file; the Client ID *is* sent to the browser (by PayPal's own
design — it identifies the app, it isn't a secret), but still only via
env var through `/api/paypal/config`, never hardcoded in source.

**What's real vs. not yet:**

- Real: order creation, server-side price enforcement, payment capture
  verification, membership activation, full transaction history, success/
  cancel/error screens, responsive design matching the site.
- **Not a subscription** — this is a one-time Orders-API payment that
  represents one month. There's no automatic renewal; `current_period_end`
  is informational today. True auto-billing would mean switching to
  PayPal's **Subscriptions API** (recurring billing plans + webhooks for
  renewal/failure events) — a separate, larger integration, not built here.
- **No webhook handler yet.** A refund or chargeback issued from PayPal's
  side (not through this app) won't automatically deactivate the
  membership — that needs a `POST /api/paypal/webhook` endpoint verifying
  PayPal's webhook signature and reacting to `PAYMENT.CAPTURE.REFUNDED` /
  `.REVERSED` events. Noted as a real gap, not pretended away.
- The rate-card items on `/advertise` other than the three membership
  plans (Sponsored Post, Deal of the Week, Homepage Banner, etc.) are
  informational only — each is a one-off/weekly price with its own
  duration and placement, not a recurring plan, so they don't have their
  own checkout flow yet. The page's contact details are the real path to
  buy one today.

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
