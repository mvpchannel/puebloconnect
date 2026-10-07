// Single source of truth for Pueblo Connect's real public URL, used by
// metadata that search engines/social crawlers actually fetch (sitemap.ts,
// robots.ts, the Open Graph/Twitter tags in src/app/layout.tsx) — so there
// aren't three different hardcoded domains to keep in sync.
//
// Set APP_URL to the real production domain (see docs/DEPLOY.md). It must be
// present at BUILD time too, because sitemap/robots/OG metadata are baked in.
// Same env var src/lib/email.ts reads for links inside transactional emails;
// a public sitemap/OG tag should never default to localhost.
export const SITE_URL = process.env.APP_URL || "https://puebloconnect.net";
