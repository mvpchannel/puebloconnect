# Pueblo Connect production image. Needs Node >= 22.5 (node:sqlite).
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json ./
# No lockfile is committed yet, so this resolves fresh versions.
RUN npm install --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SITE_URL (sitemap, robots, Open Graph tags) is baked in at build time,
# so the real domain must be present here, not only at runtime.
ARG APP_URL
ENV APP_URL=$APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build /app ./
# data/ holds the SQLite file; public/uploads holds member photos.
# Both are mounted as volumes (see docker-compose.yml) so they survive redeploys.
RUN mkdir -p data public/uploads && chown -R node:node data public/uploads .next
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
