import type { Metadata } from "next";
import AdminChrome from "@/components/admin/AdminChrome";

/**
 * Admin-section layout — its own CSS stack (the vendor admin theme's
 * Bootstrap build, icons, and page styles), separate from the member
 * site's winku-html CSS loaded in src/app/(site)/layout.tsx. Keeping them
 * apart avoids two different Bootstrap builds fighting over the same
 * class names.
 *
 * Every route under /admin is already gated by src/middleware.ts
 * (requires a session with role: admin) before it reaches this layout.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s – Pueblo Connect Admin" },
  robots: { index: false, follow: false },
};

const ADMIN_CSS = [
  "bootstrap.min.css",
  "icons.css",
  "owl.carousel.css",
  "main-style.css",
  "color.css",
  "responsive.css",
  "fullcalendar.min.css",
  "jalendar.css",
  "select2.min.css",
  "wickedpicker.css",
  "bootstrap-toggle.min.css",
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // NOTE: can't render a <body> tag here — only the root layout
  // (src/app/layout.tsx) may define <html>/<body>. The original static
  // pages put `class="menu-active"` on <body>; applying it to this
  // wrapper div instead gets the same CSS in practice, with one caveat:
  // any selector that specifically requires `body.menu-active` (rather
  // than a descendant) won't match. Worth a visual check once this runs
  // for real.
  return (
    <>
      {ADMIN_CSS.map((f) => (
        <link rel="stylesheet" href={`/admin-assets/css/${f}`} key={f} />
      ))}
      <div className="menu-active admin-body">
        <AdminChrome>{children}</AdminChrome>
      </div>
    </>
  );
}
