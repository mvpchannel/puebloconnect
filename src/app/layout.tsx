import type { Metadata } from "next";

/**
 * Root layout. Loads the legacy template's global stylesheets in the same
 * order every winku-html page used to load them individually
 * (main.min.css -> style.css -> color.css -> responsive.css). These are
 * plain global CSS, not CSS Modules, by design — the whole visual system
 * (grid, components, icon fonts) lives in them, and rewriting it in
 * CSS-in-JS/Tailwind is an explicit non-goal of Phase 1 ("upgrade the
 * technology underneath it, not redesign it").
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
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/css/main.min.css" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/color.css" />
        <link rel="stylesheet" href="/css/responsive.css" />
      </head>
      <body>
        <div className="theme-layout">
          <div className="postoverlay" />
          {children}
        </div>
      </body>
    </html>
  );
}
