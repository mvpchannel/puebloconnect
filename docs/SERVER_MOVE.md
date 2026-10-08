# Moving Pueblo Connect to the Contabo server (157.173.118.181)

Do these in order. Everything runs on the server as root over SSH.

1. DNS (at your domain registrar): add A records `@` and `www` for puebloconnect.net -> 157.173.118.181. Wait until `ping puebloconnect.net` shows that IP.
2. Install Docker:  `curl -fsSL https://get.docker.com | sh`
3. Get the code:  `git clone https://github.com/mvpchannel/puebloconnect.git /opt/pueblo && cd /opt/pueblo`
   (or upload the final zip with scp and unzip it into /opt/pueblo)
4. `cp deploy/env.production.example .env.production`, then edit it:
   - `SESSION_SECRET=` paste the output of `openssl rand -hex 32`
   - leave RESEND_API_KEY / STRIPE_* blank until the domain is verified in Resend and Stripe is ready
5. Firewall: `ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable`
6. Start:  `docker compose --env-file .env.production up -d --build`
7. Create the first admin:  `docker compose exec app npm run create-admin`
8. Check:  open https://puebloconnect.net (Caddy gets the HTTPS certificate by itself; first load can take a minute).
9. Backups: the database lives in the `pc_data` volume and photos in `pc_uploads`. Snapshot the VPS in the Contabo panel before and after launch.

Moving existing data from another host: copy the old `data/*.db` into the `pc_data` volume and `public/uploads` into `pc_uploads` before step 6.

Known: no package-lock.json is committed, so the first build resolves the newest 14.x Next.js. After the first good build, run `npm install` once on any machine and commit the generated lockfile.
