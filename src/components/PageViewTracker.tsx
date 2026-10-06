"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Tells the site a page was opened, so the admin Traffic page can chart it. Skips the admin
// area and browsers that send "Do Not Track". Sends only the page path and where the visitor
// came from; see /api/track for what is kept.
export default function PageViewTracker() {
  const pathname = usePathname();
  const previous = useRef<string>("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || (window as unknown as { doNotTrack?: string }).doNotTrack === "1")) return;
    // The first page of a visit uses the real referrer; later pages are in-site moves.
    const referrer = previous.current ? `${window.location.origin}${previous.current}` : document.referrer;
    previous.current = pathname;
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, referrer }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return null;
}
