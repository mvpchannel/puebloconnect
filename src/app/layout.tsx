import type { Metadata, Viewport } from "next";
import PageViewTracker from "@/components/PageViewTracker";
import { SITE_URL } from "@/lib/site-url";

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
const SITE_DESCRIPTION =
  "Connect Local. Shop Local. Grow Together. A community-focused social network connecting Northeast Los Angeles residents and local businesses, powered by The Daily Pueblo.";

export const metadata: Metadata = {
  // Lets every relative URL in this file (and in page-level metadata,
  // like the OG image below) resolve to a real absolute URL — needed for
  // Open Graph/Twitter tags, which crawlers fetch directly rather than
  // resolving relative to whatever page linked them.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pueblo Connect",
    template: "%s – Pueblo Connect",
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/fav.png", type: "image/png", sizes: "256x256" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pueblo Connect",
  },
  // So a link to Pueblo Connect shared on Facebook/iMessage/Slack/etc.
  // unfurls into a real preview card instead of a bare link — previously
  // there were no og:/twitter: tags at all. og-image.png is a real
  // 1200×630 image generated from the actual brand mark and colors
  // (public/images/fav.png, the same blue as the landing page's hero),
  // not a stock photo.
  openGraph: {
    type: "website",
    siteName: "Pueblo Connect",
    title: "Pueblo Connect — Connect Local. Shop Local. Grow Together.",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "Pueblo Connect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pueblo Connect — Connect Local. Shop Local. Grow Together.",
    description: SITE_DESCRIPTION,
    images: ["/images/og-image.png"],
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
      <body>
        {children}
        <PageViewTracker />
      </body>
    </html>
  );
}
