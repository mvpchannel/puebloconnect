import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminChrome from "@/components/admin/AdminChrome";
import { getCurrentUser } from "@/lib/require-user";
import { getUserById } from "@/lib/db";

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
  "glow.css",
  "fullcalendar.min.css",
  "jalendar.css",
  "select2.min.css",
  "wickedpicker.css",
  "bootstrap-toggle.min.css",
];

// Second, database-backed gate behind middleware (which can only read
// the cookie): a demoted or suspended admin is turned away here even
// if their old cookie is still valid.
async function AdminGate() {
  const session = await getCurrentUser();
  const user = session ? getUserById(session.sub) : null;
  if (!user || user.role !== "admin") redirect("/login?from=/admin");
  return null;
}

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
      <AdminGate />
      <div className="menu-active admin-body">
        <AdminChrome>{children}</AdminChrome>
      </div>
    </>
  );
}
