# Deploying Pueblo Connect

Target: one Linux server (any VPS) running Docker. Pueblo Connect keeps its
data in a SQLite file and saves member photos to disk, so it needs a server
with a **persistent disk** (not Vercel-style serverless). The compose stack
runs the app plus Caddy, which gets and renews the HTTPS certificate on its own.

> **Status:** the app has never been through a real `next build` or opened in a
> browser (the development sandbox could not reach the npm registry). Its
> database logic has been tested in isolation, but the first `docker compose
> build` is the first real build — if it fails, send the error output and it
> gets fixed before anything goes live. Section 7 lists what to check first.

## 1. Server and DNS
1. Create a server with Ubuntu 22.04+ , 1 GB RAM minimum (2 GB recommended for the build), and install Docker (`curl -fsSL https://get.docker.com | sh`).
2. Open ports 80 and 443 in its firewall.
3. At your domain registrar add `A` records for `pueblo.connect` **and** `www.pueblo.connect` pointing to the server's IP. Wait until they resolve; Caddy cannot get a certificate before that.

## 2. Get the code and configure
```bash
git clone https://github.com/mvpchannel/puebloconnect.git
cd puebloconnect
cp deploy/env.production.example .env.production
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # paste as SESSION_SECRET
nano .env.production
```
| Variable | Needed | Notes |
|---|---|---|
| `DOMAIN`, `APP_URL` | yes | `pueblo.connect` / `https://pueblo.connect`. `APP_URL` is also used at build time. |
| `SESSION_SECRET` | yes | Long random string; app refuses to start without it. Changing it logs everyone out. |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | for real email | Verify the sending domain in Resend first. Without a key, emails are only written to `data/outbox` — signup verification and password reset will not reach people. |
| `STRIPE_*` | for paid memberships | Start with `sk_test_` keys. Webhook endpoint: `https://pueblo.connect/api/stripe/webhook`. |

## 3. Build and start
```bash
docker compose --env-file .env.production up -d --build
docker compose logs -f app      # wait for "Ready"
```
Visit https://pueblo.connect.

## 4. Create the first admin
```bash
docker compose exec app node scripts/create-admin.mjs <username> <email> <password>
```
(The password appears in shell history; change it from Account Settings afterwards.)

## 5. Updating later
```bash
git pull && docker compose --env-file .env.production up -d --build
```
Data and uploads live in Docker volumes and survive rebuilds.

## 6. Backups (do this before real members sign up)
```bash
docker compose exec app node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('data/pueblo-connect.db').exec(\"VACUUM INTO '/app/data/backup.db'\")"
docker compose cp app:/app/data/backup.db ./backup-$(date +%F).db
docker run --rm -v puebloconnect_pc_uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```
Copy those files off the server. (Volume names are prefixed by the folder name; check with `docker volume ls`.)

## 7. First-launch checks (nothing below has been seen running yet)
The code was written and tested in a sandbox that could not run `next build` or
open a browser, so the first live deploy is also the first time the pages are
rendered. Check these in order and send back anything that looks wrong:

1. **Build succeeds** (`docker compose ... up -d --build`). If not, send the error output.
2. **Sign up → verification email → log in → post → photo upload → video upload** on the live URL. (Without `RESEND_API_KEY` no emails are sent.)
3. **Uploaded files load.** Open a photo you just posted; `/uploads/...` is served by Caddy from the shared volume.
4. **3D Pueblo (`/explore-3d`)**: the city loads, you can walk, buildings open their panels. Then in the admin area add a storefront (`/admin/storefronts`, with a billboard headline) and a treasure drop (`/admin/drops`) and confirm the building, billboard and glowing gem appear and the gem can be claimed from `/explore-3d` (the claim shows under `/treasures`). The plaza screen should show what is live on Pueblo Live.
5. **QR codes (`/admin/qr-links`)**: make one, scan it with a phone, confirm it lands on the right page and the visit count goes up. The address printed in the code uses `APP_URL`, so check it shows your real domain.
6. **Virtual tours (`/admin/tours`)**: paste a real Matterport/YouTube/Vimeo link on a business and confirm the player loads at `/tours/<business>`.
7. **Contact and inquiry forms** (`/contact`, `/own-your-block`, `/360-advertising`) reach the inbox. Messages are emailed to the address set as `SITE_CONTACT_EMAIL` in `src/lib/email.ts` (currently a personal Gmail address, which is also shown publicly on `/about`); change it there if that should be a business address.
8. **Stripe**: a full test-card checkout works before switching to live keys.

## Before announcing the site
- Terms page: add an Effective Date and have it legally reviewed. Its Privacy and Governing Law sections still contain drafting notes (for example, "should be separately reviewed by qualified California counsel") that are visible to the public.
- Privacy Policy (`/privacy`): written from what the code does; have it reviewed too, and decide on a minimum age (the Terms don't set one).
- The site has no self-service account deletion; the Privacy Policy tells members to use the contact form, so someone must handle those requests.
- Decide whether the program names "Pueblo Pass" (membership card) and "Pueblo Passport" (stamp collection) should both stay.
- Run a backup (section 6) and copy it off the server.
