import type { MetadataRoute } from "next";

/**
 * Real XML sitemap (served at /sitemap.xml), one of the concrete SEO
 * benefits of moving to Next.js that the static HTML site couldn't offer.
 * Add a route here as each page gets ported — see MIGRATION_STATUS.md.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://pueblo.connect"; // TODO: replace with the real production domain

  const routes = [
    "",
    "/newsfeed",
    "/login",
    "/profile",
    "/terms",
    "/sitemap-page",
    "/membership",
    "/advertise",
  ];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
  }));
}
