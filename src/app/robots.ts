import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Served at /robots.txt. Disallows the admin panel and every member-gated
// section (same list as src/middleware.ts's MEMBER_ROUTES, plus the auth
// action routes) — a crawler hitting one of those just gets redirected to
// /login anyway, so there's nothing to index there, only an admin area
// worth explicitly keeping out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/newsfeed",
        "/profile",
        "/membership",
        "/explore-3d",
        "/notifications",
        "/messages",
        "/friends",
        "/nearby",
        "/passport",
        "/rewards",
        "/account-settings",
        "/api",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
