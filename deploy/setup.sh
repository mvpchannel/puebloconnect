#!/usr/bin/env bash
# Pueblo Connect one-shot server setup (steps 3-7 of docs/SERVER_MOVE.md).
# Run as root on the new server:  bash setup.sh
# Safe to re-run: it keeps an existing .env.production and SESSION_SECRET.
set -euo pipefail

REPO="https://github.com/mvpchannel/puebloconnect.git"
DIR="/opt/pueblo"
DOMAIN="${DOMAIN:-puebloconnect.net}"

[ "$(id -u)" -eq 0 ] || { echo "Run as root."; exit 1; }

echo "==> 1/5 Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null

echo "==> 2/5 Getting the code into $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
elif [ -f "$DIR/docker-compose.yml" ]; then
  echo "    Found uploaded code in $DIR, using it."
else
  command -v git >/dev/null 2>&1 || { apt-get update -y && apt-get install -y git; }
  git clone "$REPO" "$DIR"
fi
cd "$DIR"

echo "==> 3/5 Creating .env.production"
if [ ! -f .env.production ]; then
  cp deploy/env.production.example .env.production
  chmod 600 .env.production
fi
if ! grep -Eq '^SESSION_SECRET=.+' .env.production; then
  SECRET="$(openssl rand -hex 32)"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${SECRET}|" .env.production
  echo "    Generated a new SESSION_SECRET."
fi
sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|; s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" .env.production

echo "==> 4/5 Firewall (SSH stays open)"
if command -v ufw >/dev/null 2>&1 || apt-get install -y ufw; then
  ufw allow 22 && ufw allow 80 && ufw allow 443
  ufw --force enable
fi

echo "==> 5/5 Building and starting (first build takes a few minutes)"
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps

cat <<MSG

Done. Remaining steps:
  1. Create the first admin:   cd $DIR && docker compose exec app npm run create-admin
  2. Open https://$DOMAIN (certificate can take a minute; DNS must already point here).
  3. If something fails:       docker compose logs --tail=100
  4. Add RESEND_API_KEY / STRIPE_* to $DIR/.env.production later, then re-run:
       docker compose --env-file .env.production up -d --build
MSG
