// Single source of truth for Pueblo Connect's real public URL, used by
// metadata that search engines/social crawlers actually fetch (sitemap.ts,
// robots.ts, the Open Graph/Twitter tags in src/app/layout.tsx) — so there
// aren't three different hardcoded domains to keep in sync.
//
// TODO: set the APP_URL env var to the real production domain once it's
// known (same env var src/lib/email.ts already reads for links inside
// transactional emails, just without that file's localhost fallback —
// a public sitemap/OG tag should never default to localhost).
export const SITE_URL = process.env.APP_URL || "https://pueblo.connect";
