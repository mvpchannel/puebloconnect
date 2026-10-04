import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * Real XML sitemap (served at /sitemap.xml), one of the concrete SEO
 * benefits of moving to Next.js that the static HTML site couldn't offer.
 *
 * Only genuinely public pages belong here — src/middleware.ts's
 * MEMBER_ROUTES require a signed-in session, so listing one just points a
 * crawler at something that 302s to /login instead of the real content
 * (this previously included /newsfeed, /profile, and /membership, all of
 * which are gated — removed for that reason).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/login",
    "/terms",
    "/sitemap-page",
    "/about",
    "/contact",
    "/advertise",
    "/deals",
    "/best-of",
    "/booth",
    "/businesses",
    "/events",
    "/groups",
    "/reports",
    "/live",
    "/street-team",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
