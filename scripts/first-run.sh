#!/usr/bin/env bash
# First-launch helper: installs, builds, starts the site, checks every page,
# and writes first-run-report.txt — send that file back and it can be fixed
# from there. Run from the project folder:  bash scripts/first-run.sh
# It never prints or saves your secrets.
set -u
cd "$(dirname "$0")/.."
REPORT="first-run-report.txt"
PORT="${PORT:-3000}"
: > "$REPORT"
say() { echo "$@" | tee -a "$REPORT"; }

say "== Pueblo Connect first run — $(date -u +%Y-%m-%dT%H:%M:%SZ) =="
say "node: $(node -v 2>&1)   npm: $(npm -v 2>&1)   os: $(uname -sr)"

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
NODE_MINOR=$(node -p "process.versions.node.split('.')[1]" 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 22 ] || { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 5 ]; }; then
  say "STOP: Node 22.5 or newer is required (the database uses node:sqlite). Install it from nodejs.org, then run this again."
  exit 1
fi

if [ ! -f .env.local ]; then
  say "creating .env.local with a fresh SESSION_SECRET (other keys left blank: no real email or payments yet)"
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  { echo "SESSION_SECRET=$SECRET"; echo "APP_URL=http://localhost:$PORT"; } > .env.local
fi

say; say "== npm install =="
if npm install --no-audit --no-fund > .first-run-install.log 2>&1; then say "install: OK"; else say "install: FAILED (last lines below)"; tail -25 .first-run-install.log | tee -a "$REPORT"; exit 1; fi

say; say "== npm run build =="
if npm run build > .first-run-build.log 2>&1; then
  say "build: OK"
  grep -iE "warn|✓ Compiled|Route \(app\)" .first-run-build.log | head -8 | tee -a "$REPORT"
else
  say "build: FAILED — last 60 lines:"; tail -60 .first-run-build.log | tee -a "$REPORT"; exit 1
fi

say; say "== start + page checks =="
PORT=$PORT npm run start > .first-run-server.log 2>&1 &
SERVER_PID=$!
for i in $(seq 1 40); do
  if curl -fs "http://localhost:$PORT/login" > /dev/null 2>&1; then break; fi
  sleep 1
done
node scripts/smoke-test.mjs "http://localhost:$PORT" 2>&1 | tee -a "$REPORT"
STATUS=${PIPESTATUS[0]}
say; say "== server log (errors only) =="
grep -iE "error|unhandled|failed|⨯" .first-run-server.log | head -25 | tee -a "$REPORT"
kill "$SERVER_PID" 2>/dev/null

say
if [ "$STATUS" -eq 0 ]; then
  say "ALL CHECKS PASSED. Next: run it (npm run start), then follow docs/DEPLOY.md section 7 in a browser."
else
  say "Some checks failed. Send first-run-report.txt back."
fi
say "Report saved to $REPORT"
