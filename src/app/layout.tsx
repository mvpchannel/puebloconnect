import type { Metadata, Viewport } from "next";

/**
 * Root layout — deliberately minimal. This app has two visually separate
 * sections that each ship their own full CSS stack (the member site's
 * winku-html assets vs. the admin panel's own Bootstrap/icon/theme CSS),
 * so the actual <head> stylesheets and body wrapper markup live in each
 * section's own nested layout instead of here:
 *   - src/app/(site)/layout.tsx   — member-facing pages
 *   - src/app/admin/layout.tsx    — admin panel pages
 * Loading both CSS stacks globally here would mean two different Bootstrap
 * builds fighting over the same class names site-wide.
 */
export const metadata: Metadata = {
  title: {
    default: "Pueblo Connect",
    template: "%s – Pueblo Connect",
  },
  description:
    "Connect Local. Shop Local. Grow Together. A community-focused social network connecting Pueblo residents and local businesses, powered by The Daily Pueblo.",
  icons: {
    icon: "/images/fav.png",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pueblo Connect",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f6feb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
