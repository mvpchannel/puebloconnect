# Deploying Pueblo Connect

Target: one Linux server (any VPS) running Docker. Pueblo Connect keeps its
data in a SQLite file and saves member photos to disk, so it needs a server
with a **persistent disk** (not Vercel-style serverless). The compose stack
runs the app plus Caddy, which gets and renews the HTTPS certificate on its own.

> **Status:** the app has been type-checked but has never been through a real
> `next build` (the development sandbox could not reach the npm registry). The
> first `docker compose build` is that first real build — if it fails, send
> the error output and it gets fixed before anything goes live.

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

## Before announcing the site
- Terms page still needs an Effective Date and legal review; there is no Privacy Policy page yet.
- Test signup → verification email → login → post → photo upload on the live URL.
- Switch Stripe to live keys only after a full test-card checkout works.
