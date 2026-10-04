/**
 * Member-site section layout. Loads the legacy template's global
 * stylesheets in the same order every winku-html page used to load them
 * individually (main.min.css -> style.css -> color.css -> responsive.css).
 * These are plain global CSS, not CSS Modules, by design — the whole
 * visual system (grid, components, icon fonts) lives in them, and
 * rewriting it in CSS-in-JS/Tailwind is an explicit non-goal of Phase 1
 * ("upgrade the technology underneath it, not redesign it").
 *
 * This lives in a route group, (site), so it applies to every
 * member-facing route (/login, /newsfeed, /profile, /terms,
 * /sitemap-page, …) without affecting /admin, which has its own layout
 * and CSS stack — see src/app/admin/layout.tsx.
 */
import InstallAppButton from "@/components/InstallAppButton";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/css/main.min.css" />
      <link rel="stylesheet" href="/css/style.css" />
      <link rel="stylesheet" href="/css/color.css" />
      <link rel="stylesheet" href="/css/responsive.css" />
      <div className="theme-layout">
        <div className="postoverlay" />
        {children}
        <InstallAppButton />
      </div>
    </>
  );
}
